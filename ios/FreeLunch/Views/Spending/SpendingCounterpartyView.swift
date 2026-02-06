import SwiftUI

/// Counterparty detail within spending drill-down flow
struct SpendingCounterpartyView: View {
    let direction: SpendingDirection
    let categoryId: String
    let subcategoryId: String
    let counterpartyName: String
    @Environment(MonthViewModel.self) private var monthViewModel
    @State private var viewModel = SpendingExplorerViewModel()
    @State private var highlightedMonthKey: String?

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

                    Text(displayMonthLabel)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding(.top, 8)

                // Monthly bar chart
                MonthlyBarChartView(
                    monthlyTotals: viewModel.monthlyTotals,
                    selectedMonthKey: selectedMonthKey,
                    onMonthTap: { monthKey in
                        handleBarTap(monthKey)
                    }
                )
                .padding(.horizontal)

                // Transaction list
                if viewModel.isLoading {
                    ProgressView()
                        .frame(height: 200)
                } else if viewModel.transactions.isEmpty {
                    Text("No transactions for this month")
                        .foregroundStyle(.secondary)
                        .frame(height: 100)
                } else {
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(viewModel.transactions) { tx in
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(tx.description)
                                        .font(.subheadline)
                                        .fontWeight(.medium)
                                        .lineLimit(1)

                                    Text(tx.date, style: .date)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }

                                Spacer()

                                Text(formatCurrency(abs(tx.amount)))
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .monospacedDigit()
                            }
                            .padding(.horizontal)
                            .padding(.vertical, 4)
                        }
                    }
                    .padding(.horizontal)
                }
            }
        }
        .navigationTitle(counterpartyName)
        .task {
            await fetchData()
        }
        .onChange(of: monthViewModel.dateRange) { _, _ in
            Task { await fetchData() }
        }
    }

    private var globalMonthKey: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM"
        return formatter.string(from: monthViewModel.selectedMonth)
    }

    private var selectedMonthKey: String {
        highlightedMonthKey ?? globalMonthKey
    }

    private var displayMonthLabel: String {
        if let key = highlightedMonthKey,
           let total = viewModel.monthlyTotals.first(where: { $0.monthKey == key }) {
            return total.month
        }
        return monthViewModel.monthDisplayString
    }

    private func handleBarTap(_ monthKey: String) {
        let newKey = monthKey == globalMonthKey ? nil : monthKey
        highlightedMonthKey = newKey
        Task {
            await viewModel.recalculateBreakdown(
                for: newKey ?? globalMonthKey,
                direction: direction,
                categoryId: categoryId,
                subcategoryId: subcategoryId,
                counterparty: counterpartyName
            )
        }
    }

    private func fetchData() async {
        highlightedMonthKey = nil
        await viewModel.fetchData(
            direction: direction,
            dateRange: monthViewModel.dateRange,
            categoryId: categoryId,
            subcategoryId: subcategoryId,
            counterparty: counterpartyName
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
