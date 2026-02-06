import WidgetKit
import SwiftUI

// MARK: - Timeline Provider

struct RecentTransactionsProvider: TimelineProvider {
    func placeholder(in context: Context) -> RecentTransactionsEntry {
        RecentTransactionsEntry(date: Date(), transactions: WidgetData.placeholder.recentTransactions)
    }

    func getSnapshot(in context: Context, completion: @escaping (RecentTransactionsEntry) -> Void) {
        let data = UserDefaults.appGroup.widgetData ?? .placeholder
        let entry = RecentTransactionsEntry(date: Date(), transactions: data.recentTransactions)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<RecentTransactionsEntry>) -> Void) {
        let data = UserDefaults.appGroup.widgetData ?? .placeholder
        let entry = RecentTransactionsEntry(date: Date(), transactions: data.recentTransactions)

        // Refresh every 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

// MARK: - Entry

struct RecentTransactionsEntry: TimelineEntry {
    let date: Date
    let transactions: [WidgetTransaction]
}

// MARK: - Widget View

struct RecentTransactionsWidgetEntryView: View {
    var entry: RecentTransactionsProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header
            HStack {
                Image(systemName: "list.bullet")
                    .foregroundStyle(.blue)
                Text("Recent Transactions")
                    .font(.caption)
                    .fontWeight(.semibold)
                Spacer()
            }

            if entry.transactions.isEmpty {
                Spacer()
                Text("No recent transactions")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                Spacer()
            } else {
                // Transaction List
                ForEach(entry.transactions.prefix(transactionCount)) { transaction in
                    transactionRow(transaction)
                }

                if entry.transactions.count > transactionCount {
                    Text("+ \(entry.transactions.count - transactionCount) more")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }

    private var transactionCount: Int {
        switch family {
        case .systemMedium:
            return 3
        case .systemLarge:
            return 7
        default:
            return 3
        }
    }

    private func transactionRow(_ transaction: WidgetTransaction) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(transaction.description)
                    .font(.caption)
                    .fontWeight(.medium)
                    .lineLimit(1)

                if let category = transaction.category {
                    Text(category)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text(formatCurrency(transaction.amount))
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(transaction.amount >= 0 ? .green : .primary)

                Text(transaction.date, style: .time)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "EUR"
        formatter.locale = Locale(identifier: "nl_NL")
        return formatter.string(from: NSNumber(value: amount)) ?? "EUR \(amount)"
    }
}

// MARK: - Widget Definition

struct RecentTransactionsWidget: Widget {
    let kind: String = "RecentTransactionsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: RecentTransactionsProvider()) { entry in
            RecentTransactionsWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Recent Transactions")
        .description("See your latest transactions.")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Medium", as: .systemMedium) {
    RecentTransactionsWidget()
} timeline: {
    RecentTransactionsEntry(date: Date(), transactions: WidgetData.placeholder.recentTransactions)
}
#endif
