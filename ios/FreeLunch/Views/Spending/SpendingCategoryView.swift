import SwiftUI

/// Category detail showing subcategories or transactions for leaf categories
struct SpendingCategoryView: View {
    let direction: SpendingDirection
    let categoryId: String
    let categoryName: String
    @Environment(MonthViewModel.self) private var monthViewModel
    @State private var viewModel = SpendingExplorerViewModel()

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Total amount
                VStack(spacing: 4) {
                    Text(formatCurrency(viewModel.currentTotal))
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .monospacedDigit()
                        .foregroundStyle(direction == .expenses ? .red : .green)

                    Text(monthViewModel.monthDisplayString)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding(.top, 8)

                // Monthly bar chart
                MonthlyBarChartView(
                    monthlyTotals: viewModel.monthlyTotals,
                    selectedMonthKey: selectedMonthKey,
                    onMonthTap: { monthKey in
                        navigateToMonth(monthKey)
                    }
                )
                .padding(.horizontal)

                // Subcategory breakdown or transaction list
                if viewModel.isLoading {
                    ProgressView()
                        .frame(height: 200)
                } else if !viewModel.categories.isEmpty {
                    // Subcategories
                    VStack(spacing: 2) {
                        ForEach(viewModel.categories) { subcat in
                            NavigationLink {
                                SpendingSubcategoryView(
                                    direction: direction,
                                    categoryId: categoryId,
                                    subcategoryId: subcat.categoryId,
                                    subcategoryName: subcat.categoryName
                                )
                            } label: {
                                CategoryRowView(
                                    name: subcat.categoryName,
                                    icon: subcat.categoryIcon,
                                    color: subcat.categoryColor,
                                    amount: subcat.amount,
                                    percentage: subcat.percentage,
                                    transactionCount: subcat.transactionCount
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal)
                } else if !viewModel.transactions.isEmpty {
                    // Leaf category: show transactions directly
                    TransactionListSection(
                        transactions: viewModel.transactions,
                        direction: direction,
                        categoryId: categoryId,
                        subcategoryId: categoryId
                    )
                } else {
                    Text("No data for this month")
                        .foregroundStyle(.secondary)
                        .frame(height: 100)
                }
            }
        }
        .navigationTitle(categoryName)
        .task {
            await fetchData()
        }
        .onChange(of: monthViewModel.dateRange) { _, _ in
            Task { await fetchData() }
        }
    }

    private var selectedMonthKey: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM"
        return formatter.string(from: monthViewModel.selectedMonth)
    }

    private func navigateToMonth(_ monthKey: String) {
        let parts = monthKey.split(separator: "-")
        guard parts.count == 2,
              let year = Int(parts[0]),
              let month = Int(parts[1])
        else { return }

        var components = DateComponents()
        components.year = year
        components.month = month
        components.day = 1
        if let date = Calendar.current.date(from: components) {
            monthViewModel.setMonth(date)
        }
    }

    private func fetchData() async {
        await viewModel.fetchData(
            direction: direction,
            dateRange: monthViewModel.dateRange,
            categoryId: categoryId
        )
    }

    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "EUR"
        formatter.locale = Locale(identifier: "nl_NL")
        return formatter.string(from: NSNumber(value: amount)) ?? "€\(amount)"
    }
}
