import SwiftUI

/// Top-level spending explorer showing all categories
struct SpendingExplorerView: View {
    let direction: SpendingDirection
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
                    },
                    barColor: direction == .expenses
                        ? (Color(hex: "#1D4739") ?? .green)
                        : (Color(hex: "#2D5A4A") ?? .green)
                )
                .padding(.horizontal)

                // Category breakdown
                if viewModel.isLoading {
                    ProgressView()
                        .frame(height: 200)
                } else if viewModel.categories.isEmpty {
                    Text("No \(direction == .expenses ? "expenses" : "income") for this month")
                        .foregroundStyle(.secondary)
                        .frame(height: 100)
                } else {
                    VStack(spacing: 2) {
                        ForEach(viewModel.categories) { category in
                            NavigationLink {
                                SpendingCategoryView(
                                    direction: direction,
                                    categoryId: category.categoryId,
                                    categoryName: category.categoryName
                                )
                            } label: {
                                CategoryRowView(
                                    name: category.categoryName,
                                    icon: category.categoryIcon,
                                    color: category.categoryColor,
                                    amount: category.amount,
                                    percentage: category.percentage,
                                    transactionCount: category.transactionCount
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal)
                }
            }
        }
        .navigationTitle(direction == .expenses ? "Expenses" : "Income")
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
            dateRange: monthViewModel.dateRange
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

// MARK: - Preview

#if DEBUG
#Preview {
    NavigationStack {
        SpendingExplorerView(direction: .expenses)
            .environment(MonthViewModel())
    }
}
#endif
