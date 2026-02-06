import Foundation
import Observation
import FirebaseFirestore

/// Direction of spending explorer
enum SpendingDirection: String, Hashable {
    case expenses
    case income
}

/// Monthly total for bar chart
struct MonthlyTotal: Identifiable {
    let id: String // monthKey
    let month: String        // "Jan 2024" display
    let monthKey: String     // "2024-01" sortable
    let amount: Double
    let transactionCount: Int
}

/// Category breakdown item
struct CategoryBreakdown: Identifiable, Hashable {
    let id: String // categoryId
    let categoryId: String
    let categoryName: String
    let categoryIcon: String
    let categoryColor: String
    let amount: Double
    let percentage: Double
    let transactionCount: Int
}

/// Manages spending explorer data with local Firestore aggregation
@Observable
final class SpendingExplorerViewModel {
    // MARK: - State

    var currentTotal: Double = 0
    var monthlyTotals: [MonthlyTotal] = []
    var categories: [CategoryBreakdown] = []
    var transactions: [Transaction] = []
    var allCategories: [Category] = []
    var isLoading = false
    var errorMessage: String?

    // MARK: - Private

    private var allTransactions: [Transaction] = []

    // MARK: - Data Fetching

    /// Fetch spending data for the given parameters
    func fetchData(
        direction: SpendingDirection,
        dateRange: ClosedRange<Date>,
        categoryId: String? = nil,
        subcategoryId: String? = nil,
        counterparty: String? = nil
    ) async {
        await MainActor.run { isLoading = true }

        do {
            // Calculate 6-month window
            let calendar = Calendar.current
            let selectedStart = dateRange.lowerBound
            let sixMonthStart = calendar.date(byAdding: .month, value: -5, to: selectedStart)!
            let sixMonthStartNormalized = calendar.date(from: calendar.dateComponents([.year, .month], from: sixMonthStart))!
            let sixMonthEnd = dateRange.upperBound

            // Fetch transactions and categories in parallel
            async let transactionsTask = FirestoreService.shared.fetchAllTransactions(
                dateRange: sixMonthStartNormalized...sixMonthEnd
            )
            async let categoriesTask = FirestoreService.shared.fetchCategories()

            let (fetchedTransactions, fetchedCategories) = try await (transactionsTask, categoriesTask)

            await MainActor.run {
                self.allTransactions = fetchedTransactions
                self.allCategories = fetchedCategories
            }

            // Filter by direction, excluding pending reimbursements
            let directed = fetchedTransactions.filter { tx in
                if tx.reimbursement?.status == .pending { return false }
                return direction == .expenses ? tx.amount < 0 : tx.amount > 0
            }

            // Calculate monthly totals
            let monthlyData = calculateMonthlyTotals(
                transactions: directed,
                from: sixMonthStartNormalized,
                months: 6,
                categories: fetchedCategories,
                categoryId: categoryId,
                subcategoryId: subcategoryId,
                counterparty: counterparty
            )

            // Calculate current month breakdown
            let selectedMonthTransactions = directed.filter { tx in
                tx.date >= dateRange.lowerBound && tx.date <= dateRange.upperBound
            }

            let currentMonthKey = monthKeyString(dateRange.lowerBound)
            let total = monthlyData.first(where: { $0.monthKey == currentMonthKey })?.amount ?? 0

            // Calculate breakdown based on level
            let breakdown: [CategoryBreakdown]
            let levelTransactions: [Transaction]

            if let counterparty, let subcategoryId {
                // Level 4: counterparty transactions
                breakdown = []
                levelTransactions = selectedMonthTransactions.filter { tx in
                    tx.counterparty == counterparty &&
                    matchesSubcategory(tx, subcategoryId: subcategoryId)
                }
            } else if let subcategoryId {
                // Level 3: subcategory transactions
                breakdown = []
                levelTransactions = selectedMonthTransactions.filter { tx in
                    matchesSubcategory(tx, subcategoryId: subcategoryId)
                }
            } else if let categoryId {
                // Level 2: subcategory breakdown or transactions if leaf
                let subcats = fetchedCategories.filter { $0.parentId == categoryId }
                if subcats.isEmpty {
                    // Leaf category: show transactions
                    breakdown = []
                    levelTransactions = selectedMonthTransactions.filter { tx in
                        topLevelCategoryId(for: tx.categoryId, categories: fetchedCategories) == categoryId
                    }
                } else {
                    // Has subcategories
                    breakdown = calculateCategoryBreakdown(
                        transactions: selectedMonthTransactions,
                        categories: fetchedCategories,
                        parentCategoryId: categoryId
                    )
                    levelTransactions = []
                }
            } else {
                // Level 1: top-level category breakdown
                breakdown = calculateTopLevelBreakdown(
                    transactions: selectedMonthTransactions,
                    categories: fetchedCategories
                )
                levelTransactions = []
            }

            await MainActor.run {
                self.currentTotal = total
                self.monthlyTotals = monthlyData
                self.categories = breakdown
                self.transactions = levelTransactions
                self.isLoading = false
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                self.isLoading = false
            }
        }
    }

    // MARK: - Calculation Helpers

    private func monthKeyString(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM"
        return formatter.string(from: date)
    }

    private func monthDisplayString(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM yyyy"
        return formatter.string(from: date)
    }

    private func topLevelCategoryId(for categoryId: String?, categories: [Category]) -> String {
        guard let catId = categoryId else { return "uncategorized" }
        guard let cat = categories.first(where: { $0.id == catId }) else { return catId }
        if let parentId = cat.parentId { return parentId }
        return catId
    }

    private func matchesSubcategory(_ tx: Transaction, subcategoryId: String) -> Bool {
        if tx.isSplit, let splits = tx.splits {
            return splits.contains { $0.categoryId == subcategoryId }
        }
        return tx.categoryId == subcategoryId
    }

    private func calculateMonthlyTotals(
        transactions: [Transaction],
        from start: Date,
        months: Int,
        categories: [Category],
        categoryId: String?,
        subcategoryId: String?,
        counterparty: String?
    ) -> [MonthlyTotal] {
        let calendar = Calendar.current
        var result: [MonthlyTotal] = []

        for i in 0..<months {
            guard let monthDate = calendar.date(byAdding: .month, value: i, to: start) else { continue }
            let key = monthKeyString(monthDate)
            let display = monthDisplayString(monthDate)

            guard let monthStart = calendar.date(from: calendar.dateComponents([.year, .month], from: monthDate)),
                  let nextMonth = calendar.date(byAdding: .month, value: 1, to: monthStart),
                  let monthEnd = calendar.date(byAdding: .second, value: -1, to: nextMonth)
            else { continue }

            let monthTxs = transactions.filter { $0.date >= monthStart && $0.date <= monthEnd }

            var amount: Double = 0
            var count = 0

            for tx in monthTxs {
                if let counterparty, let subcategoryId {
                    guard tx.counterparty == counterparty && matchesSubcategory(tx, subcategoryId: subcategoryId) else { continue }
                    amount += abs(tx.amount)
                    count += 1
                } else if let subcategoryId {
                    guard matchesSubcategory(tx, subcategoryId: subcategoryId) else { continue }
                    if tx.isSplit, let splits = tx.splits {
                        for split in splits where split.categoryId == subcategoryId {
                            amount += split.amount
                            count += 1
                        }
                    } else {
                        amount += abs(tx.amount)
                        count += 1
                    }
                } else if let categoryId {
                    let topLevel = topLevelCategoryId(for: tx.categoryId, categories: categories)
                    if tx.isSplit, let splits = tx.splits {
                        for split in splits {
                            let splitTop = topLevelCategoryId(for: split.categoryId, categories: categories)
                            if splitTop == categoryId {
                                amount += split.amount
                                count += 1
                            }
                        }
                    } else if topLevel == categoryId {
                        amount += abs(tx.amount)
                        count += 1
                    }
                } else {
                    amount += abs(tx.amount)
                    count += 1
                }
            }

            result.append(MonthlyTotal(
                id: key,
                month: display,
                monthKey: key,
                amount: (amount * 100).rounded() / 100,
                transactionCount: count
            ))
        }

        return result
    }

    private func calculateTopLevelBreakdown(
        transactions: [Transaction],
        categories: [Category]
    ) -> [CategoryBreakdown] {
        var spending: [String: (amount: Double, count: Int)] = [:]

        for tx in transactions {
            if tx.isSplit, let splits = tx.splits {
                for split in splits {
                    let topLevel = topLevelCategoryId(for: split.categoryId, categories: categories)
                    let current = spending[topLevel] ?? (0, 0)
                    spending[topLevel] = (current.amount + split.amount, current.count + 1)
                }
            } else {
                let topLevel = topLevelCategoryId(for: tx.categoryId, categories: categories)
                let current = spending[topLevel] ?? (0, 0)
                spending[topLevel] = (current.amount + abs(tx.amount), current.count + 1)
            }
        }

        let total = spending.values.reduce(0.0) { $0 + $1.amount }

        return spending.map { (catId, data) in
            let cat = categories.first(where: { $0.id == catId })
            return CategoryBreakdown(
                id: catId,
                categoryId: catId,
                categoryName: cat?.name ?? "Uncategorized",
                categoryIcon: cat?.icon ?? "questionmark.circle",
                categoryColor: cat?.color ?? "#9CA3AF",
                amount: (data.amount * 100).rounded() / 100,
                percentage: total > 0 ? ((data.amount / total) * 1000).rounded() / 10 : 0,
                transactionCount: data.count
            )
        }
        .sorted { $0.amount > $1.amount }
    }

    private func calculateCategoryBreakdown(
        transactions: [Transaction],
        categories: [Category],
        parentCategoryId: String
    ) -> [CategoryBreakdown] {
        var spending: [String: (amount: Double, count: Int)] = [:]

        for tx in transactions {
            if tx.isSplit, let splits = tx.splits {
                for split in splits {
                    let cat = categories.first(where: { $0.id == split.categoryId })
                    if cat?.parentId == parentCategoryId || split.categoryId == parentCategoryId {
                        let key = cat?.parentId == parentCategoryId ? split.categoryId : parentCategoryId
                        let current = spending[key] ?? (0, 0)
                        spending[key] = (current.amount + split.amount, current.count + 1)
                    }
                }
            } else {
                guard let txCatId = tx.categoryId else { continue }
                let cat = categories.first(where: { $0.id == txCatId })
                if cat?.parentId == parentCategoryId || txCatId == parentCategoryId {
                    let key = cat?.parentId == parentCategoryId ? txCatId : parentCategoryId
                    let current = spending[key] ?? (0, 0)
                    spending[key] = (current.amount + abs(tx.amount), current.count + 1)
                }
            }
        }

        let total = spending.values.reduce(0.0) { $0 + $1.amount }

        return spending.map { (catId, data) in
            let cat = categories.first(where: { $0.id == catId })
            return CategoryBreakdown(
                id: catId,
                categoryId: catId,
                categoryName: cat?.name ?? "Uncategorized",
                categoryIcon: cat?.icon ?? "questionmark.circle",
                categoryColor: cat?.color ?? "#9CA3AF",
                amount: (data.amount * 100).rounded() / 100,
                percentage: total > 0 ? ((data.amount / total) * 1000).rounded() / 10 : 0,
                transactionCount: data.count
            )
        }
        .sorted { $0.amount > $1.amount }
    }
}

// MARK: - Preview Helpers

#if DEBUG
extension SpendingExplorerViewModel {
    static let preview: SpendingExplorerViewModel = {
        let vm = SpendingExplorerViewModel()
        vm.currentTotal = 2450.00
        vm.monthlyTotals = [
            MonthlyTotal(id: "2024-07", month: "Jul 2024", monthKey: "2024-07", amount: 1800, transactionCount: 25),
            MonthlyTotal(id: "2024-08", month: "Aug 2024", monthKey: "2024-08", amount: 2100, transactionCount: 30),
            MonthlyTotal(id: "2024-09", month: "Sep 2024", monthKey: "2024-09", amount: 1950, transactionCount: 28),
            MonthlyTotal(id: "2024-10", month: "Oct 2024", monthKey: "2024-10", amount: 2300, transactionCount: 32),
            MonthlyTotal(id: "2024-11", month: "Nov 2024", monthKey: "2024-11", amount: 2050, transactionCount: 27),
            MonthlyTotal(id: "2024-12", month: "Dec 2024", monthKey: "2024-12", amount: 2450, transactionCount: 35),
        ]
        vm.categories = [
            CategoryBreakdown(id: "food", categoryId: "food", categoryName: "Food & Drink", categoryIcon: "fork.knife", categoryColor: "#C9A227", amount: 850, percentage: 34.7, transactionCount: 15),
            CategoryBreakdown(id: "transport", categoryId: "transport", categoryName: "Transport", categoryIcon: "car", categoryColor: "#4A6FA5", amount: 450, percentage: 18.4, transactionCount: 8),
        ]
        return vm
    }()
}
#endif
