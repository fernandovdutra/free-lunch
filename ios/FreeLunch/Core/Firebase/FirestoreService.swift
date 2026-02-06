import Foundation
import FirebaseFirestore
import FirebaseAuth

/// Service for Firestore database operations
/// Uses user-scoped collections: users/{userId}/[collection]
actor FirestoreService {
    static let shared = FirestoreService()
    private let db = Firestore.firestore()

    private init() {
        // Offline persistence is enabled by default in Firestore
        // Configure settings if needed
        let settings = FirestoreSettings()
        settings.isPersistenceEnabled = true
        db.settings = settings
    }

    // MARK: - Helper Properties

    private var userId: String? {
        Auth.auth().currentUser?.uid
    }

    private func userCollection(_ collection: String) -> CollectionReference? {
        guard let userId else { return nil }
        return db.collection("users").document(userId).collection(collection)
    }

    // MARK: - Transactions

    /// Start listening to transactions within a date range
    func transactionsListener(
        dateRange: ClosedRange<Date>,
        onChange: @escaping @Sendable ([Transaction]) -> Void
    ) -> ListenerRegistration? {
        guard let collection = userCollection("transactions") else { return nil }

        return collection
            .whereField("date", isGreaterThanOrEqualTo: Timestamp(date: dateRange.lowerBound))
            .whereField("date", isLessThanOrEqualTo: Timestamp(date: dateRange.upperBound))
            .order(by: "date", descending: true)
            .addSnapshotListener { snapshot, error in
                if let error {
                    print("Error listening to transactions: \(error.localizedDescription)")
                    return
                }

                guard let documents = snapshot?.documents else {
                    onChange([])
                    return
                }

                let transactions = documents.compactMap { doc -> Transaction? in
                    try? doc.data(as: Transaction.self)
                }
                onChange(transactions)
            }
    }

    /// Fetch all transactions (for initial load or full sync)
    func fetchAllTransactions(dateRange: ClosedRange<Date>) async throws -> [Transaction] {
        guard let collection = userCollection("transactions") else {
            throw FirestoreError.notAuthenticated
        }

        let snapshot = try await collection
            .whereField("date", isGreaterThanOrEqualTo: Timestamp(date: dateRange.lowerBound))
            .whereField("date", isLessThanOrEqualTo: Timestamp(date: dateRange.upperBound))
            .order(by: "date", descending: true)
            .getDocuments()

        return snapshot.documents.compactMap { doc in
            try? doc.data(as: Transaction.self)
        }
    }

    /// Update a transaction
    func updateTransaction(_ transaction: Transaction) async throws {
        guard let collection = userCollection("transactions"),
              let id = transaction.id else {
            throw FirestoreError.notAuthenticated
        }

        var updated = transaction
        updated.updatedAt = Date()
        try collection.document(id).setData(from: updated, merge: true)
    }

    /// Update transaction category (common operation)
    func updateTransactionCategory(transactionId: String, categoryId: String?) async throws {
        guard let collection = userCollection("transactions") else {
            throw FirestoreError.notAuthenticated
        }

        try await collection.document(transactionId).updateData([
            "categoryId": categoryId as Any,
            "categorySource": CategorySource.manual.rawValue,
            "categoryConfidence": 1.0,
            "updatedAt": FieldValue.serverTimestamp()
        ])
    }

    /// Mark transaction as reimbursable
    func markAsReimbursable(
        transactionId: String,
        type: ReimbursementType,
        note: String?
    ) async throws {
        guard let collection = userCollection("transactions") else {
            throw FirestoreError.notAuthenticated
        }

        let reimbursement = ReimbursementInfo(
            type: type,
            note: note,
            status: .pending,
            linkedTransactionId: nil,
            clearedAt: nil
        )

        let encoder = Firestore.Encoder()
        let data = try encoder.encode(reimbursement)

        try await collection.document(transactionId).updateData([
            "reimbursement": data,
            "updatedAt": FieldValue.serverTimestamp()
        ])
    }

    /// Clear reimbursement status
    func clearReimbursement(transactionId: String) async throws {
        guard let collection = userCollection("transactions") else {
            throw FirestoreError.notAuthenticated
        }

        try await collection.document(transactionId).updateData([
            "reimbursement.status": ReimbursementStatus.cleared.rawValue,
            "reimbursement.clearedAt": FieldValue.serverTimestamp(),
            "updatedAt": FieldValue.serverTimestamp()
        ])
    }

    // MARK: - Categories

    /// Start listening to categories
    func categoriesListener(
        onChange: @escaping @Sendable ([Category]) -> Void
    ) -> ListenerRegistration? {
        guard let collection = userCollection("categories") else { return nil }

        return collection
            .order(by: "order")
            .addSnapshotListener { snapshot, error in
                if let error {
                    print("Error listening to categories: \(error.localizedDescription)")
                    return
                }

                guard let documents = snapshot?.documents else {
                    onChange([])
                    return
                }

                let categories = documents.compactMap { doc -> Category? in
                    try? doc.data(as: Category.self)
                }
                onChange(categories)
            }
    }

    /// Fetch all categories
    func fetchCategories() async throws -> [Category] {
        guard let collection = userCollection("categories") else {
            throw FirestoreError.notAuthenticated
        }

        let snapshot = try await collection.order(by: "order").getDocuments()
        return snapshot.documents.compactMap { doc in
            try? doc.data(as: Category.self)
        }
    }

    /// Create a new category
    func createCategory(_ category: Category) async throws -> String {
        guard let collection = userCollection("categories") else {
            throw FirestoreError.notAuthenticated
        }

        var newCategory = category
        newCategory.createdAt = Date()
        newCategory.updatedAt = Date()

        let docRef = try collection.addDocument(from: newCategory)
        return docRef.documentID
    }

    /// Update a category
    func updateCategory(_ category: Category) async throws {
        guard let collection = userCollection("categories"),
              let id = category.id else {
            throw FirestoreError.notAuthenticated
        }

        var updated = category
        updated.updatedAt = Date()
        try collection.document(id).setData(from: updated, merge: true)
    }

    /// Delete a category and its children
    func deleteCategory(_ categoryId: String, categories: [Category]) async throws {
        guard let collection = userCollection("categories") else {
            throw FirestoreError.notAuthenticated
        }

        // Find all children recursively
        var idsToDelete = [categoryId]
        func findChildren(_ parentId: String) {
            for category in categories where category.parentId == parentId {
                if let id = category.id {
                    idsToDelete.append(id)
                    findChildren(id)
                }
            }
        }
        findChildren(categoryId)

        // Delete in batch
        let batch = db.batch()
        for id in idsToDelete {
            batch.deleteDocument(collection.document(id))
        }
        try await batch.commit()
    }

    // MARK: - Budgets

    /// Start listening to active budgets
    func budgetsListener(
        onChange: @escaping @Sendable ([Budget]) -> Void
    ) -> ListenerRegistration? {
        guard let collection = userCollection("budgets") else { return nil }

        return collection
            .whereField("isActive", isEqualTo: true)
            .addSnapshotListener { snapshot, error in
                if let error {
                    print("Error listening to budgets: \(error.localizedDescription)")
                    return
                }

                guard let documents = snapshot?.documents else {
                    onChange([])
                    return
                }

                let budgets = documents.compactMap { doc -> Budget? in
                    try? doc.data(as: Budget.self)
                }
                onChange(budgets)
            }
    }

    /// Fetch all budgets
    func fetchBudgets(activeOnly: Bool = true) async throws -> [Budget] {
        guard let collection = userCollection("budgets") else {
            throw FirestoreError.notAuthenticated
        }

        var query: Query = collection
        if activeOnly {
            query = query.whereField("isActive", isEqualTo: true)
        }

        let snapshot = try await query.getDocuments()
        return snapshot.documents.compactMap { doc in
            try? doc.data(as: Budget.self)
        }
    }

    /// Create a new budget
    func createBudget(_ budget: Budget) async throws -> String {
        guard let collection = userCollection("budgets") else {
            throw FirestoreError.notAuthenticated
        }

        var newBudget = budget
        newBudget.createdAt = Date()
        newBudget.updatedAt = Date()

        let docRef = try collection.addDocument(from: newBudget)
        return docRef.documentID
    }

    /// Update a budget
    func updateBudget(_ budget: Budget) async throws {
        guard let collection = userCollection("budgets"),
              let id = budget.id else {
            throw FirestoreError.notAuthenticated
        }

        var updated = budget
        updated.updatedAt = Date()
        try collection.document(id).setData(from: updated, merge: true)
    }

    /// Delete a budget (soft delete by setting isActive to false)
    func deleteBudget(_ budgetId: String) async throws {
        guard let collection = userCollection("budgets") else {
            throw FirestoreError.notAuthenticated
        }

        try await collection.document(budgetId).updateData([
            "isActive": false,
            "updatedAt": FieldValue.serverTimestamp()
        ])
    }

    // MARK: - Bank Connections

    /// Start listening to bank connections
    func bankConnectionsListener(
        onChange: @escaping @Sendable ([BankConnection]) -> Void
    ) -> ListenerRegistration? {
        guard let collection = userCollection("bankConnections") else { return nil }

        return collection
            .addSnapshotListener { snapshot, error in
                if let error {
                    print("Error listening to bank connections: \(error.localizedDescription)")
                    return
                }

                guard let documents = snapshot?.documents else {
                    onChange([])
                    return
                }

                let connections = documents.compactMap { doc -> BankConnection? in
                    try? doc.data(as: BankConnection.self)
                }
                onChange(connections)
            }
    }

    /// Fetch bank connections
    func fetchBankConnections() async throws -> [BankConnection] {
        guard let collection = userCollection("bankConnections") else {
            throw FirestoreError.notAuthenticated
        }

        let snapshot = try await collection.getDocuments()
        return snapshot.documents.compactMap { doc in
            try? doc.data(as: BankConnection.self)
        }
    }

    // MARK: - User Document

    /// Fetch or create user document
    func fetchOrCreateUser(userId: String, email: String, displayName: String?) async throws -> User {
        let userRef = db.collection("users").document(userId)
        let snapshot = try await userRef.getDocument()

        if snapshot.exists, let user = try? snapshot.data(as: User.self) {
            return user
        }

        // Create new user document
        let newUser = User(
            id: userId,
            email: email,
            displayName: displayName,
            createdAt: Date(),
            settings: UserSettings()
        )

        try userRef.setData(from: newUser)

        // Create default categories via Cloud Function (idempotent)
        do {
            _ = try await BankingService.shared.createDefaultCategories()
        } catch {
            print("Error creating default categories: \(error)")
        }

        return newUser
    }

    /// Update user settings
    func updateUserSettings(_ settings: UserSettings) async throws {
        guard let userId else {
            throw FirestoreError.notAuthenticated
        }

        let encoder = Firestore.Encoder()
        let data = try encoder.encode(settings)

        try await db.collection("users").document(userId).updateData([
            "settings": data
        ])
    }
}

// MARK: - Errors

enum FirestoreError: LocalizedError {
    case notAuthenticated
    case documentNotFound
    case encodingError
    case unknown(Error)

    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "You must be signed in to perform this action."
        case .documentNotFound:
            return "The requested document was not found."
        case .encodingError:
            return "Failed to encode data for storage."
        case .unknown(let error):
            return error.localizedDescription
        }
    }
}
