import SwiftUI

/// A 6-month vertical bar chart for spending totals
struct MonthlyBarChartView: View {
    let monthlyTotals: [MonthlyTotal]
    let selectedMonthKey: String
    let onMonthTap: (String) -> Void
    var barColor: Color = Color(hex: "#1D4739") ?? .green

    var body: some View {
        if monthlyTotals.isEmpty {
            Text("No data available")
                .font(.caption)
                .foregroundStyle(.secondary)
                .frame(height: 150)
                .frame(maxWidth: .infinity)
        } else {
            let maxAmount = monthlyTotals.map(\.amount).max() ?? 1

            HStack(alignment: .bottom, spacing: 8) {
                ForEach(monthlyTotals) { total in
                    VStack(spacing: 4) {
                        Spacer(minLength: 0)

                        // Bar
                        RoundedRectangle(cornerRadius: 4)
                            .fill(barColor.opacity(total.monthKey == selectedMonthKey ? 1 : 0.35))
                            .frame(
                                height: maxAmount > 0
                                    ? max(4, CGFloat(total.amount / maxAmount) * 100)
                                    : 4
                            )

                        // Month label
                        Text(shortMonth(total.month))
                            .font(.caption2)
                            .foregroundStyle(
                                total.monthKey == selectedMonthKey ? .primary : .secondary
                            )
                            .fontWeight(total.monthKey == selectedMonthKey ? .semibold : .regular)
                    }
                    .frame(maxWidth: .infinity)
                    .contentShape(Rectangle())
                    .onTapGesture {
                        onMonthTap(total.monthKey)
                    }
                }
            }
            .frame(height: 150)
            .padding(.horizontal, 4)
        }
    }

    /// Extract short month name from "Jan 2024" → "Jan"
    private func shortMonth(_ display: String) -> String {
        String(display.prefix(3))
    }
}

// MARK: - Preview

#if DEBUG
#Preview {
    MonthlyBarChartView(
        monthlyTotals: [
            MonthlyTotal(id: "2024-07", month: "Jul 2024", monthKey: "2024-07", amount: 1800, transactionCount: 25),
            MonthlyTotal(id: "2024-08", month: "Aug 2024", monthKey: "2024-08", amount: 2100, transactionCount: 30),
            MonthlyTotal(id: "2024-09", month: "Sep 2024", monthKey: "2024-09", amount: 1950, transactionCount: 28),
            MonthlyTotal(id: "2024-10", month: "Oct 2024", monthKey: "2024-10", amount: 2300, transactionCount: 32),
            MonthlyTotal(id: "2024-11", month: "Nov 2024", monthKey: "2024-11", amount: 2050, transactionCount: 27),
            MonthlyTotal(id: "2024-12", month: "Dec 2024", monthKey: "2024-12", amount: 2450, transactionCount: 35),
        ],
        selectedMonthKey: "2024-12",
        onMonthTap: { _ in }
    )
    .padding()
}
#endif
