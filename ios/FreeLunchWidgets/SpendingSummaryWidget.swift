import WidgetKit
import SwiftUI

// MARK: - Timeline Provider

struct SpendingSummaryProvider: TimelineProvider {
    func placeholder(in context: Context) -> SpendingSummaryEntry {
        SpendingSummaryEntry(date: Date(), data: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (SpendingSummaryEntry) -> Void) {
        let data = UserDefaults.appGroup.widgetData ?? .placeholder
        let entry = SpendingSummaryEntry(date: Date(), data: data)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SpendingSummaryEntry>) -> Void) {
        let data = UserDefaults.appGroup.widgetData ?? .placeholder
        let entry = SpendingSummaryEntry(date: Date(), data: data)

        // Refresh every 30 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

// MARK: - Entry

struct SpendingSummaryEntry: TimelineEntry {
    let date: Date
    let data: WidgetData
}

// MARK: - Widget View

struct SpendingSummaryWidgetEntryView: View {
    var entry: SpendingSummaryProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            smallWidget
        case .systemMedium:
            mediumWidget
        case .systemLarge:
            largeWidget
        default:
            smallWidget
        }
    }

    // MARK: - Small Widget

    private var smallWidget: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "fork.knife.circle.fill")
                    .foregroundStyle(.blue)
                Text("Free Lunch")
                    .font(.caption)
                    .fontWeight(.semibold)
            }

            Spacer()

            VStack(alignment: .leading, spacing: 4) {
                Text("Month Spending")
                    .font(.caption2)
                    .foregroundStyle(.secondary)

                Text(formatCurrency(entry.data.monthSpending))
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundStyle(.red)
            }

            Text("Today: \(formatCurrency(entry.data.todaySpending))")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }

    // MARK: - Medium Widget

    private var mediumWidget: some View {
        HStack(spacing: 16) {
            // Left side - Summary
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: "fork.knife.circle.fill")
                        .foregroundStyle(.blue)
                    Text("Free Lunch")
                        .font(.caption)
                        .fontWeight(.semibold)
                }

                Spacer()

                VStack(alignment: .leading, spacing: 4) {
                    summaryRow(title: "Income", amount: entry.data.monthIncome, color: .green)
                    summaryRow(title: "Spending", amount: entry.data.monthSpending, color: .red)
                    summaryRow(title: "Balance", amount: entry.data.monthNetBalance, color: .primary)
                }
            }

            Divider()

            // Right side - Today
            VStack(alignment: .leading, spacing: 8) {
                Text("Today")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Text(formatCurrency(entry.data.todaySpending))
                    .font(.title)
                    .fontWeight(.bold)

                Spacer()

                if entry.data.pendingReimbursements > 0 {
                    HStack(spacing: 4) {
                        Image(systemName: "clock")
                            .font(.caption2)
                        Text(formatCurrency(entry.data.pendingReimbursements))
                            .font(.caption)
                    }
                    .foregroundStyle(.orange)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }

    // MARK: - Large Widget

    private var largeWidget: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Image(systemName: "fork.knife.circle.fill")
                    .foregroundStyle(.blue)
                Text("Free Lunch")
                    .font(.headline)
                Spacer()
                Text(monthString)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            // Summary Cards
            HStack(spacing: 12) {
                summaryCard(title: "Income", amount: entry.data.monthIncome, icon: "arrow.up.circle", color: .green)
                summaryCard(title: "Expenses", amount: entry.data.monthSpending, icon: "arrow.down.circle", color: .red)
            }

            HStack(spacing: 12) {
                summaryCard(title: "Balance", amount: entry.data.monthNetBalance, icon: "wallet.pass", color: .blue)
                summaryCard(title: "Pending", amount: entry.data.pendingReimbursements, icon: "clock", color: .orange)
            }

            Divider()

            // Recent Transactions
            Text("Recent")
                .font(.caption)
                .foregroundStyle(.secondary)

            ForEach(entry.data.recentTransactions.prefix(3)) { transaction in
                HStack {
                    Text(transaction.description)
                        .font(.caption)
                        .lineLimit(1)
                    Spacer()
                    Text(formatCurrency(transaction.amount))
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundStyle(transaction.amount >= 0 ? .green : .primary)
                }
            }
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }

    // MARK: - Helpers

    private func summaryRow(title: String, amount: Double, color: Color) -> some View {
        HStack {
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer()
            Text(formatCurrency(amount))
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(color)
        }
    }

    private func summaryCard(title: String, amount: Double, icon: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Image(systemName: icon)
                    .font(.caption)
                    .foregroundStyle(color)
                Text(title)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            Text(formatCurrency(amount))
                .font(.subheadline)
                .fontWeight(.semibold)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(8)
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private var monthString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM"
        return formatter.string(from: Date())
    }

    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "EUR"
        formatter.locale = Locale(identifier: "nl_NL")
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: abs(amount))) ?? "EUR \(amount)"
    }
}

// MARK: - Widget Definition

struct SpendingSummaryWidget: Widget {
    let kind: String = "SpendingSummaryWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SpendingSummaryProvider()) { entry in
            SpendingSummaryWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Spending Summary")
        .description("See your monthly spending at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Small", as: .systemSmall) {
    SpendingSummaryWidget()
} timeline: {
    SpendingSummaryEntry(date: Date(), data: .placeholder)
}

#Preview("Medium", as: .systemMedium) {
    SpendingSummaryWidget()
} timeline: {
    SpendingSummaryEntry(date: Date(), data: .placeholder)
}

#Preview("Large", as: .systemLarge) {
    SpendingSummaryWidget()
} timeline: {
    SpendingSummaryEntry(date: Date(), data: .placeholder)
}
#endif
