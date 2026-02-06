import Foundation
import Observation
import FirebaseFirestore

/// Manages dashboard data and summary calculations
@Observable
final class DashboardViewModel {
    // MARK: - Published State

    var dashboardData: BankingService.DashboardDataResponse?
    var transactions: [Transaction] = []
    var categories: [Category] = []
    var budgets: [Budget] = []
    var bankConnections: [BankConnection] = []
    var isLoading = false
    var errorMessage: String?

    // MARK: - Cloud Function Results

    /// Summary from Cloud Function
    var totalIncome: Double { dashboardData?.summary.totalIncome ?? 0 }
    var totalExpenses: Double { dashboardData?.summary.totalExpenses ?? 0 }
    var netBalance: Double { dashboardData?.summary.netBalance ?? 0 }
    var pendingReimbursements: Double { dashboardData?.summary.pendingReimbursements ?? 0 }
    var transactionCount: Int { dashboardData?.summary.transactionCount ?? 0 }

    var pendingReimbursementsCount: Int {
        transactions.filter { $0.reimbursement?.status == .pending }.count
    }

    // MARK: - Recent Transactions

    var recentTransactions: [Transaction] {
        Array(transactions.prefix(5))
    }

    // MARK: - Category Spending from Cloud Function

    var spendingByCategory: [(category: Category, amount: Double, percentage: Double)] {
        guard let data = dashboardData else { return [] }

        return data.categorySpending.map { spending in
            let category = categories.first(where: { $0.id == spending.categoryId }) ?? Category(
                id: spending.categoryId,
                name: spending.categoryName,
                icon: "questionmark.circle",
                color: spending.categoryColor,
                parentId: nil,
                order: 999,
                isSystem: true
            )
            return (category, spending.amount, spending.percentage)
        }
    }

    var topSpendingCategories: [(category: Category, amount: Double, percentage: Double)] {
        Array(spendingByCategory.prefix(6))
    }

    // MARK: - Timeline from Cloud Function

    var dailySpending: [(date: Date, income: Double, expenses: Double)] {
        guard let data = dashboardData else { return [] }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        return data.timeline.compactMap { entry in
            guard let date = formatter.date(from: entry.dateKey) else { return nil }
            return (date, entry.income, entry.expenses)
        }
    }

    // MARK: - Budget Status

    var budgetProgress: [BudgetProgress] {
        budgets.map { budget in
            let category = categories.first { $0.id == budget.categoryId }
            let spent = calculateCategorySpending(budget.categoryId)
            return budget.calculateProgress(spent: spent, category: category)
        }
    }

    var alertBudgets: [BudgetProgress] {
        budgetProgress.filter { $0.status != .safe }
    }

    private func calculateCategorySpending(_ categoryId: String) -> Double {
        var categoryIds: Set<String> = [categoryId]
        for category in categories where category.parentId == categoryId {
            if let id = category.id {
                categoryIds.insert(id)
            }
        }

        return transactions
            .filter { transaction in
                transaction.amount < 0 &&
                transaction.reimbursement?.status != .pending &&
                categoryIds.contains(transaction.categoryId ?? "")
            }
            .reduce(0) { $0 + abs($1.amount) }
    }

    // MARK: - Bank Connection Status

    var activeBankConnections: [BankConnection] {
        bankConnections.filter { $0.status == .active }
    }

    var hasExpiredConnections: Bool {
        bankConnections.contains { $0.status == .expired || $0.isExpired }
    }

    var lastSyncTime: Date? {
        bankConnections.compactMap(\.lastSync).max()
    }

    // MARK: - Private Properties

    private var transactionsListener: ListenerRegistration?
    private var categoriesListener: ListenerRegistration?
    private var budgetsListener: ListenerRegistration?
    private var bankConnectionsListener: ListenerRegistration?

    // MARK: - Lifecycle

    deinit {
        stopListening()
    }

    // MARK: - Data Fetching

    /// Start listening to all dashboard data
    func startListening(dateRange: ClosedRange<Date>) {
        isLoading = true
        errorMessage = nil

        Task {
            // Fetch aggregations from Cloud Function
            async let dashboardTask: () = fetchDashboardData(dateRange: dateRange)
            // Keep real-time listeners for data needed locally
            async let transactionsTask: () = startTransactionsListener(dateRange: dateRange)
            async let categoriesTask: () = startCategoriesListener()
            async let budgetsTask: () = startBudgetsListener()
            async let bankConnectionsTask: () = startBankConnectionsListener()

            _ = await (dashboardTask, transactionsTask, categoriesTask, budgetsTask, bankConnectionsTask)
        }
    }

    private func fetchDashboardData(dateRange: ClosedRange<Date>) async {
        do {
            let data = try await BankingService.shared.getDashboardData(
                startDate: dateRange.lowerBound,
                endDate: dateRange.upperBound
            )
            await MainActor.run {
                self.dashboardData = data
                self.isLoading = false
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                self.isLoading = false
            }
        }
    }

    private func startTransactionsListener(dateRange: ClosedRange<Date>) async {
        transactionsListener = await FirestoreService.shared.transactionsListener(dateRange: dateRange) { [weak self] transactions in
            Task { @MainActor in
                self?.transactions = transactions
            }
        }
    }

    private func startCategoriesListener() async {
        categoriesListener = await FirestoreService.shared.categoriesListener { [weak self] categories in
            Task { @MainActor in
                self?.categories = categories
            }
        }
    }

    private func startBudgetsListener() async {
        budgetsListener = await FirestoreService.shared.budgetsListener { [weak self] budgets in
            Task { @MainActor in
                self?.budgets = budgets
            }
        }
    }

    private func startBankConnectionsListener() async {
        bankConnectionsListener = await FirestoreService.shared.bankConnectionsListener { [weak self] connections in
            Task { @MainActor in
                self?.bankConnections = connections
            }
        }
    }

    /// Stop all listeners
    func stopListening() {
        transactionsListener?.remove()
        categoriesListener?.remove()
        budgetsListener?.remove()
        bankConnectionsListener?.remove()

        transactionsListener = nil
        categoriesListener = nil
        budgetsListener = nil
        bankConnectionsListener = nil
    }
}

// MARK: - Preview Helpers

#if DEBUG
extension DashboardViewModel {
    static let preview: DashboardViewModel = {
        let vm = DashboardViewModel()
        vm.transactions = Transaction.samples
        vm.categories = Category.samples
        vm.budgets = Budget.samples
        vm.bankConnections = BankConnection.samples
        return vm
    }()
}
#endif
