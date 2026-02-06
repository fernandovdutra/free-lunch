import SwiftUI

/// Counterparty detail within spending drill-down flow
struct SpendingCounterpartyView: View {
    let direction: SpendingDirection
    let categoryId: String
    let subcategoryId: String
    let counterpartyName: String
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
