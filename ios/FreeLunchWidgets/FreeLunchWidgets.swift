import WidgetKit
import SwiftUI

// MARK: - Widget Bundle

@main
struct FreeLunchWidgets: WidgetBundle {
    var body: some Widget {
        SpendingSummaryWidget()
        RecentTransactionsWidget()
        BudgetAlertsWidget()
    }
}

// MARK: - Shared Data

struct WidgetData: Codable {
    var monthSpending: Double
    var todaySpending: Double
    var monthIncome: Double
    var monthNetBalance: Double
    var pendingReimbursements: Double
    var recentTransactions: [WidgetTransaction]
    var budgetAlerts: [WidgetBudgetAlert]
    var lastUpdated: Date

    static let placeholder = WidgetData(
        monthSpending: 1234.56,
        todaySpending: 45.67,
        monthIncome: 3500.00,
        monthNetBalance: 2265.44,
        pendingReimbursements: 85.00,
        recentTransactions: [
            WidgetTransaction(description: "Albert Heijn", amount: -45.67, category: "Groceries", date: Date()),
            WidgetTransaction(description: "NS Reizen", amount: -12.50, category: "Transport", date: Date()),
            WidgetTransaction(description: "Coffee Shop", amount: -4.50, category: "Food", date: Date())
        ],
        budgetAlerts: [
            WidgetBudgetAlert(categoryName: "Food", percentage: 85, status: .warning),
            WidgetBudgetAlert(categoryName: "Shopping", percentage: 110, status: .exceeded)
        ],
        lastUpdated: Date()
    )
}

struct WidgetTransaction: Codable, Identifiable {
    var id: String { "\(description)-\(date.timeIntervalSince1970)" }
    var description: String
    var amount: Double
    var category: String?
    var date: Date
}

struct WidgetBudgetAlert: Codable, Identifiable {
    var id: String { categoryName }
    var categoryName: String
    var percentage: Double
    var status: BudgetAlertStatus

    enum BudgetAlertStatus: String, Codable {
        case safe, warning, exceeded
    }
}

// MARK: - Shared User Defaults

extension UserDefaults {
    static let appGroup = UserDefaults(suiteName: "group.com.freelunch.shared")!

    var widgetData: WidgetData? {
        guard let data = data(forKey: "widgetData") else { return nil }
        return try? JSONDecoder().decode(WidgetData.self, from: data)
    }

    func setWidgetData(_ data: WidgetData) {
        guard let encoded = try? JSONEncoder().encode(data) else { return }
        set(encoded, forKey: "widgetData")
    }
}
