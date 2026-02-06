import Foundation
import FirebaseFirestore
import FirebaseFirestoreSwift

/// Represents a financial transaction from a bank account
struct Transaction: Identifiable, Codable, Equatable {
    @DocumentID var id: String?
    var externalId: String?
    var date: Date
    var bookingDate: Date?
    var transactionDate: Date?
    var description: String
    var amount: Double
    var currency: String = "EUR"
    var counterparty: String?

    // Categorization
    var categoryId: String?
    var categoryConfidence: Double?
    var categorySource: CategorySource?

    // Splitting (MVP: excluded, but keeping model for future)
    var isSplit: Bool = false
    var splits: [TransactionSplit]?

    // Reimbursement
    var reimbursement: ReimbursementInfo?

    // Metadata
    var bankAccountId: String?
    var bankConnectionId: String?
    var status: String?
    var importedAt: Date?
    var updatedAt: Date?

    // MARK: - Computed Properties

    /// Whether this is an income transaction (positive amount)
    var isIncome: Bool {
        amount > 0
    }

    /// Whether this is an expense transaction (negative amount)
    var isExpense: Bool {
        amount < 0
    }

    /// Absolute value of the amount
    var absoluteAmount: Double {
        abs(amount)
    }

    /// Whether this transaction has a pending reimbursement
    var hasPendingReimbursement: Bool {
        reimbursement?.status == .pending
    }

    /// Whether this transaction is categorized
    var isCategorized: Bool {
        categoryId != nil && categorySource != .none
    }

    // MARK: - Coding Keys

    enum CodingKeys: String, CodingKey {
        case id
        case externalId
        case date
        case bookingDate
        case transactionDate
        case description
        case amount
        case currency
        case counterparty
        case categoryId
        case categoryConfidence
        case categorySource
        case isSplit
        case splits
        case reimbursement
        case bankAccountId
        case bankConnectionId
        case status
        case importedAt
        case updatedAt
    }
}

// MARK: - Supporting Types

/// Source of category assignment
enum CategorySource: String, Codable, Equatable {
    case auto
    case manual
    case rule
    case merchant
    case learned
    case none
}

/// Split portion of a transaction
struct TransactionSplit: Codable, Equatable {
    var amount: Double
    var categoryId: String
    var note: String?
}

/// Reimbursement information for an expense
struct ReimbursementInfo: Codable, Equatable {
    var type: ReimbursementType
    var note: String?
    var status: ReimbursementStatus
    var linkedTransactionId: String?
    var clearedAt: Date?
}

/// Type of reimbursement
enum ReimbursementType: String, Codable, Equatable {
    case work
    case personal
}

/// Status of reimbursement
enum ReimbursementStatus: String, Codable, Equatable {
    case pending
    case cleared
}

// MARK: - Sample Data for Previews

#if DEBUG
extension Transaction {
    static let sample = Transaction(
        id: "sample-1",
        externalId: "ext-123",
        date: Date(),
        description: "Albert Heijn",
        amount: -45.67,
        currency: "EUR",
        counterparty: "Albert Heijn BV",
        categoryId: "food-groceries",
        categoryConfidence: 0.95,
        categorySource: .auto
    )

    static let sampleIncome = Transaction(
        id: "sample-2",
        externalId: "ext-456",
        date: Date(),
        description: "Monthly Salary",
        amount: 3500.00,
        currency: "EUR",
        counterparty: "Employer BV",
        categoryId: "income-salary",
        categoryConfidence: 1.0,
        categorySource: .manual
    )

    static let sampleUncategorized = Transaction(
        id: "sample-3",
        externalId: "ext-789",
        date: Date(),
        description: "Unknown Merchant",
        amount: -25.00,
        currency: "EUR"
    )

    static let sampleWithReimbursement = Transaction(
        id: "sample-4",
        externalId: "ext-101",
        date: Date(),
        description: "Business Dinner",
        amount: -85.00,
        currency: "EUR",
        counterparty: "Restaurant XYZ",
        categoryId: "food-restaurants",
        categorySource: .manual,
        reimbursement: ReimbursementInfo(
            type: .work,
            note: "Client dinner",
            status: .pending
        )
    )

    static let samples: [Transaction] = [
        .sample,
        .sampleIncome,
        .sampleUncategorized,
        .sampleWithReimbursement
    ]
}
#endif
