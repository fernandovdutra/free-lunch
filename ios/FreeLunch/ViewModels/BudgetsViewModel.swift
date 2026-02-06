import Foundation
import Observation
import FirebaseFirestore

/// Manages budget data and progress calculations
@Observable
final class BudgetsViewModel {
    // MARK: - Published State

    var budgets: [Budget] = []
    var cloudBudgetProgress: [BankingService.BudgetProgressItem]?
    var isLoading = false
    var errorMessage: String?

    // MARK: - Dependencies

    /// Categories for resolving budget category info
    var categories: [Category] = []

    /// Transactions for calculating spending (fallback when CF not loaded)
    var transactions: [Transaction] = []

    // MARK: - Computed Properties

    /// Budget progress — uses Cloud Function data when available, falls back to local calculation
    var budgetProgress: [BudgetProgress] {
        if let cloudProgress = cloudBudgetProgress {
            return cloudProgress.map { item in
                let budget = budgets.first(where: { $0.id == item.budgetId }) ?? Budget(
                    id: item.budgetId,
                    name: item.budgetName,
                    categoryId: item.categoryId,
                    monthlyLimit: item.monthlyLimit,
                    alertThreshold: item.alertThreshold,
                    isActive: true,
                    createdAt: Date(),
                    updatedAt: Date()
                )

                let status: BudgetStatus
                switch item.status {
                case "exceeded": status = .exceeded
                case "warning": status = .warning
                default: status = .safe
                }

                return BudgetProgress(
                    budget: budget,
                    categoryName: item.categoryName,
                    categoryIcon: item.categoryIcon,
                    categoryColor: item.categoryColor,
                    spent: item.spent,
                    remaining: item.remaining,
                    percentage: item.percentage,
                    status: status
                )
            }
        }

        // Fallback: local calculation
        return budgets.map { budget in
            let category = categories.first { $0.id == budget.categoryId }
            let spent = calculateSpending(for: budget.categoryId)
            return budget.calculateProgress(spent: spent, category: category)
        }
        .sorted { $0.percentage > $1.percentage }
    }

    /// Budgets that are in warning state (above threshold)
    var warningBudgets: [BudgetProgress] {
        budgetProgress.filter { $0.status == .warning }
    }

    /// Budgets that are exceeded
    var exceededBudgets: [BudgetProgress] {
        budgetProgress.filter { $0.status == .exceeded }
    }

    /// Total budget limit across all budgets
    var totalBudgetLimit: Double {
        budgets.reduce(0) { $0 + $1.monthlyLimit }
    }

    /// Total spent across all budgeted categories
    var totalBudgetSpent: Double {
        budgetProgress.reduce(0) { $0 + $1.spent }
    }

    /// Overall budget utilization percentage
    var overallBudgetPercentage: Double {
        guard totalBudgetLimit > 0 else { return 0 }
        return (totalBudgetSpent / totalBudgetLimit) * 100
    }

    // MARK: - Private Properties

    private var listener: ListenerRegistration?

    // MARK: - Lifecycle

    deinit {
        stopListening()
    }

    // MARK: - Spending Calculation (fallback)

    /// Calculate spending for a category (including children)
    func calculateSpending(for categoryId: String) -> Double {
        let categoryIds = getAllCategoryIds(for: categoryId)

        return transactions
            .filter { transaction in
                transaction.amount < 0 &&
                transaction.reimbursement?.status != .pending &&
                categoryIds.contains(transaction.categoryId ?? "")
            }
            .reduce(0) { $0 + abs($1.amount) }
    }

    /// Get all category IDs including children (recursive)
    private func getAllCategoryIds(for categoryId: String) -> Set<String> {
        var ids: Set<String> = [categoryId]

        let children = categories.filter { $0.parentId == categoryId }
        for child in children {
            if let childId = child.id {
                ids.formUnion(getAllCategoryIds(for: childId))
            }
        }

        return ids
    }

    // MARK: - Data Fetching

    /// Start listening to budgets and fetch spending progress
    func startListening(dateRange: ClosedRange<Date>? = nil) {
        isLoading = true
        errorMessage = nil

        Task {
            listener = await FirestoreService.shared.budgetsListener { [weak self] budgets in
                Task { @MainActor in
                    self?.budgets = budgets
                    self?.isLoading = false
                }
            }

            // Fetch budget progress from Cloud Function
            if let dateRange {
                await fetchBudgetProgress(startDate: dateRange.lowerBound, endDate: dateRange.upperBound)
            } else {
                await fetchBudgetProgress()
            }
        }
    }

    /// Fetch budget progress from Cloud Function
    func fetchBudgetProgress(startDate: Date? = nil, endDate: Date? = nil) async {
        do {
            let response = try await BankingService.shared.getBudgetProgress(
                startDate: startDate,
                endDate: endDate
            )
            await MainActor.run {
                self.cloudBudgetProgress = response.budgetProgress
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
            }
        }
    }

    /// Stop listening to budgets
    func stopListening() {
        listener?.remove()
        listener = nil
    }

    /// Fetch budgets once
    func fetch() async {
        isLoading = true
        errorMessage = nil

        do {
            budgets = try await FirestoreService.shared.fetchBudgets()
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Budget Operations

    /// Create a new budget
    func createBudget(name: String, categoryId: String, monthlyLimit: Double, alertThreshold: Double = 80) async -> String? {
        let budget = Budget(
            id: nil,
            name: name,
            categoryId: categoryId,
            monthlyLimit: monthlyLimit,
            alertThreshold: alertThreshold,
            isActive: true,
            createdAt: Date(),
            updatedAt: Date()
        )

        do {
            let id = try await FirestoreService.shared.createBudget(budget)
            return id
        } catch {
            errorMessage = error.localizedDescription
            return nil
        }
    }

    /// Update an existing budget
    func updateBudget(_ budget: Budget) async {
        do {
            try await FirestoreService.shared.updateBudget(budget)

            // Optimistic update
            if let index = budgets.firstIndex(where: { $0.id == budget.id }) {
                budgets[index] = budget
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Delete a budget
    func deleteBudget(_ budgetId: String) async {
        do {
            try await FirestoreService.shared.deleteBudget(budgetId)

            // Optimistic update
            budgets.removeAll { $0.id == budgetId }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Check if a category already has a budget
    func hasBudget(for categoryId: String) -> Bool {
        budgets.contains { $0.categoryId == categoryId }
    }

    /// Get budget for a specific category
    func budget(for categoryId: String) -> Budget? {
        budgets.first { $0.categoryId == categoryId }
    }
}

// MARK: - Preview Helpers

#if DEBUG
extension BudgetsViewModel {
    static let preview: BudgetsViewModel = {
        let vm = BudgetsViewModel()
        vm.budgets = Budget.samples
        vm.categories = Category.samples
        vm.transactions = Transaction.samples
        return vm
    }()
}
#endif
