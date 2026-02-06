import WidgetKit
import SwiftUI

// MARK: - Timeline Provider

struct BudgetAlertsProvider: TimelineProvider {
    func placeholder(in context: Context) -> BudgetAlertsEntry {
        BudgetAlertsEntry(date: Date(), alerts: WidgetData.placeholder.budgetAlerts)
    }

    func getSnapshot(in context: Context, completion: @escaping (BudgetAlertsEntry) -> Void) {
        let data = UserDefaults.appGroup.widgetData ?? .placeholder
        let entry = BudgetAlertsEntry(date: Date(), alerts: data.budgetAlerts)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<BudgetAlertsEntry>) -> Void) {
        let data = UserDefaults.appGroup.widgetData ?? .placeholder
        let entry = BudgetAlertsEntry(date: Date(), alerts: data.budgetAlerts)

        // Refresh every hour
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

// MARK: - Entry

struct BudgetAlertsEntry: TimelineEntry {
    let date: Date
    let alerts: [WidgetBudgetAlert]
}

// MARK: - Widget View

struct BudgetAlertsWidgetEntryView: View {
    var entry: BudgetAlertsProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(.orange)
                Text("Budget Alerts")
                    .font(.caption)
                    .fontWeight(.semibold)
                Spacer()

                if !entry.alerts.isEmpty {
                    Text("\(entry.alerts.count)")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(alertColor)
                        .clipShape(Capsule())
                }
            }

            if entry.alerts.isEmpty {
                Spacer()
                VStack(spacing: 4) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.title2)
                        .foregroundStyle(.green)
                    Text("All budgets on track")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .center)
                Spacer()
            } else {
                // Alert List
                ForEach(entry.alerts.prefix(alertCount)) { alert in
                    alertRow(alert)
                }

                if entry.alerts.count > alertCount {
                    Text("+ \(entry.alerts.count - alertCount) more")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }

    private var alertCount: Int {
        switch family {
        case .systemSmall:
            return 2
        case .systemMedium:
            return 3
        case .systemLarge:
            return 6
        default:
            return 3
        }
    }

    private var alertColor: Color {
        if entry.alerts.contains(where: { $0.status == .exceeded }) {
            return .red
        }
        return .orange
    }

    private func alertRow(_ alert: WidgetBudgetAlert) -> some View {
        HStack {
            // Status Icon
            Circle()
                .fill(statusColor(for: alert.status))
                .frame(width: 8, height: 8)

            // Category Name
            Text(alert.categoryName)
                .font(.caption)
                .lineLimit(1)

            Spacer()

            // Progress Bar (mini)
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color(.systemGray5))
                        .frame(height: 4)

                    RoundedRectangle(cornerRadius: 2)
                        .fill(statusColor(for: alert.status))
                        .frame(width: min(geo.size.width * CGFloat(alert.percentage) / 100, geo.size.width), height: 4)
                }
            }
            .frame(width: 50, height: 4)

            // Percentage
            Text("\(Int(alert.percentage))%")
                .font(.caption2)
                .fontWeight(.medium)
                .foregroundStyle(statusColor(for: alert.status))
                .frame(width: 36, alignment: .trailing)
        }
    }

    private func statusColor(for status: WidgetBudgetAlert.BudgetAlertStatus) -> Color {
        switch status {
        case .safe:
            return .green
        case .warning:
            return .orange
        case .exceeded:
            return .red
        }
    }
}

// MARK: - Widget Definition

struct BudgetAlertsWidget: Widget {
    let kind: String = "BudgetAlertsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: BudgetAlertsProvider()) { entry in
            BudgetAlertsWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Budget Alerts")
        .description("See budgets that need attention.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Small", as: .systemSmall) {
    BudgetAlertsWidget()
} timeline: {
    BudgetAlertsEntry(date: Date(), alerts: WidgetData.placeholder.budgetAlerts)
}

#Preview("Medium", as: .systemMedium) {
    BudgetAlertsWidget()
} timeline: {
    BudgetAlertsEntry(date: Date(), alerts: WidgetData.placeholder.budgetAlerts)
}

#Preview("Empty", as: .systemSmall) {
    BudgetAlertsWidget()
} timeline: {
    BudgetAlertsEntry(date: Date(), alerts: [])
}
#endif
