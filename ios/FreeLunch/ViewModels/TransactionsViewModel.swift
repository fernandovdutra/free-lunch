import Foundation
import Observation
import FirebaseFirestore

/// Manages transaction data and operations
@Observable
final class TransactionsViewModel {
    // MARK: - Published State

    var transactions: [Transaction] = []
    var isLoading = false
    var errorMessage: String?

    // MARK: - Filters

    var searchText = ""
    var selectedCategoryId: String?
    var selectedDirection: TransactionDirection = .all
    var selectedReimbursementStatus: ReimbursementFilter = .all
    var selectedCategorizationStatus: CategorizationFilter = .all

    // MARK: - Filter Enums

    enum TransactionDirection: String, CaseIterable {
        case all = "All"
        case income = "Income"
        case expense = "Expense"
    }

    enum ReimbursementFilter: String, CaseIterable {
        case all = "All"
        case none = "No Reimbursement"
        case pending = "Pending"
        case cleared = "Cleared"
    }

    enum CategorizationFilter: String, CaseIterable {
        case all = "All"
        case manual = "Manual"
        case auto = "Auto"
        case uncategorized = "Uncategorized"
    }

    // MARK: - Computed Properties

    /// Filtered transactions based on current filter settings
    var filteredTransactions: [Transaction] {
        transactions.filter { transaction in
            // Search filter
            if !searchText.isEmpty {
                let searchLower = searchText.lowercased()
                let matchesDescription = transaction.description.lowercased().contains(searchLower)
                let matchesCounterparty = transaction.counterparty?.lowercased().contains(searchLower) ?? false
                if !matchesDescription && !matchesCounterparty {
                    return false
                }
            }

            // Category filter
            if let categoryId = selectedCategoryId {
                if categoryId == "uncategorized" {
                    if transaction.categoryId != nil { return false }
                } else if transaction.categoryId != categoryId {
                    return false
                }
            }

            // Direction filter
            switch selectedDirection {
            case .income:
                if transaction.amount < 0 { return false }
            case .expense:
                if transaction.amount >= 0 { return false }
            case .all:
                break
            }

            // Reimbursement filter
            switch selectedReimbursementStatus {
            case .none:
                if transaction.reimbursement != nil { return false }
            case .pending:
                if transaction.reimbursement?.status != .pending { return false }
            case .cleared:
                if transaction.reimbursement?.status != .cleared { return false }
            case .all:
                break
            }

            // Categorization status filter
            switch selectedCategorizationStatus {
            case .manual:
                if transaction.categorySource != .manual { return false }
            case .auto:
                if transaction.categorySource == .manual || transaction.categorySource == CategorySource.none || transaction.categoryId == nil {
                    return false
                }
            case .uncategorized:
                if transaction.categoryId != nil && transaction.categorySource != CategorySource.none {
                    return false
                }
            case .all:
                break
            }

            return true
        }
    }

    /// Transactions grouped by date
    var transactionsByDate: [(date: Date, transactions: [Transaction])] {
        let calendar = Calendar.current
        let grouped = Dictionary(grouping: filteredTransactions) { transaction in
            calendar.startOfDay(for: transaction.date)
        }

        return grouped.map { (date: $0.key, transactions: $0.value) }
            .sorted { $0.date > $1.date }
    }

    /// Total income for filtered transactions
    var totalIncome: Double {
        filteredTransactions
            .filter { $0.amount > 0 && $0.reimbursement?.status != .pending }
            .reduce(0) { $0 + $1.amount }
    }

    /// Total expenses for filtered transactions
    var totalExpenses: Double {
        filteredTransactions
            .filter { $0.amount < 0 && $0.reimbursement?.status != .pending }
            .reduce(0) { $0 + abs($1.amount) }
    }

    /// Net balance for filtered transactions
    var netBalance: Double {
        totalIncome - totalExpenses
    }

    /// Count of uncategorized transactions
    var uncategorizedCount: Int {
        transactions.filter { $0.categoryId == nil || $0.categorySource == CategorySource.none }.count
    }

    /// Count of pending reimbursements
    var pendingReimbursementsCount: Int {
        transactions.filter { $0.reimbursement?.status == .pending }.count
    }

    // MARK: - Private Properties

    private var listener: ListenerRegistration?

    // MARK: - Lifecycle

    deinit {
        stopListening()
    }

    // MARK: - Data Fetching

    /// Start listening to transactions for a date range
    func startListening(dateRange: ClosedRange<Date>) {
        isLoading = true
        errorMessage = nil

        Task {
            listener = await FirestoreService.shared.transactionsListener(dateRange: dateRange) { [weak self] transactions in
                Task { @MainActor in
                    self?.transactions = transactions
                    self?.isLoading = false
                }
            }
        }
    }

    /// Stop listening to transactions
    func stopListening() {
        listener?.remove()
        listener = nil
    }

    /// Refresh transactions for a date range
    func refresh(dateRange: ClosedRange<Date>) async {
        isLoading = true
        errorMessage = nil

        do {
            transactions = try await FirestoreService.shared.fetchAllTransactions(dateRange: dateRange)
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Transaction Updates

    /// Update category for a transaction
    func updateCategory(transactionId: String, categoryId: String?) async {
        do {
            try await FirestoreService.shared.updateTransactionCategory(
                transactionId: transactionId,
                categoryId: categoryId
            )

            // Optimistic update
            if let index = transactions.firstIndex(where: { $0.id == transactionId }) {
                transactions[index].categoryId = categoryId
                transactions[index].categorySource = .manual
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Mark transaction as reimbursable
    func markAsReimbursable(transactionId: String, type: ReimbursementType, note: String?) async {
        do {
            try await FirestoreService.shared.markAsReimbursable(
                transactionId: transactionId,
                type: type,
                note: note
            )

            // Optimistic update
            if let index = transactions.firstIndex(where: { $0.id == transactionId }) {
                transactions[index].reimbursement = ReimbursementInfo(
                    type: type,
                    note: note,
                    status: .pending,
                    linkedTransactionId: nil,
                    clearedAt: nil
                )
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Clear reimbursement status
    func clearReimbursement(transactionId: String) async {
        do {
            try await FirestoreService.shared.clearReimbursement(transactionId: transactionId)

            // Optimistic update
            if let index = transactions.firstIndex(where: { $0.id == transactionId }) {
                transactions[index].reimbursement?.status = .cleared
                transactions[index].reimbursement?.clearedAt = Date()
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Filter Management

    /// Clear all filters
    func clearFilters() {
        searchText = ""
        selectedCategoryId = nil
        selectedDirection = .all
        selectedReimbursementStatus = .all
        selectedCategorizationStatus = .all
    }

    /// Check if any filters are active
    var hasActiveFilters: Bool {
        !searchText.isEmpty ||
        selectedCategoryId != nil ||
        selectedDirection != .all ||
        selectedReimbursementStatus != .all ||
        selectedCategorizationStatus != .all
    }
}

// MARK: - Preview Helpers

#if DEBUG
extension TransactionsViewModel {
    static let preview: TransactionsViewModel = {
        let vm = TransactionsViewModel()
        vm.transactions = Transaction.samples
        return vm
    }()
}
#endif
