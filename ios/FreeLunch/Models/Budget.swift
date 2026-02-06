import Foundation
import FirebaseFirestore
import FirebaseFirestoreSwift

/// Represents a monthly spending budget for a category
struct Budget: Identifiable, Codable, Equatable {
    @DocumentID var id: String?
    var name: String
    var categoryId: String
    /// Monthly spending limit in EUR
    var monthlyLimit: Double
    /// Percentage threshold for warning (default 80)
    var alertThreshold: Double = 80
    var isActive: Bool = true
    var createdAt: Date?
    var updatedAt: Date?

    // MARK: - Coding Keys

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case categoryId
        case monthlyLimit
        case alertThreshold
        case isActive
        case createdAt
        case updatedAt
    }
}

// MARK: - Budget Progress

/// Calculated budget progress with status
struct BudgetProgress: Identifiable, Equatable {
    var id: String { budget.id ?? UUID().uuidString }
    var budget: Budget
    var categoryName: String
    var categoryIcon: String
    var categoryColor: String
    var spent: Double
    var remaining: Double
    var percentage: Double
    var status: BudgetStatus

    /// Format spent amount as currency string
    var spentFormatted: String {
        formatCurrency(spent)
    }

    /// Format remaining amount as currency string
    var remainingFormatted: String {
        formatCurrency(remaining)
    }

    /// Format limit amount as currency string
    var limitFormatted: String {
        formatCurrency(budget.monthlyLimit)
    }

    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "EUR"
        formatter.locale = Locale(identifier: "nl_NL")
        return formatter.string(from: NSNumber(value: amount)) ?? "EUR \(amount)"
    }
}

/// Budget spending status
enum BudgetStatus: String, Equatable {
    case safe
    case warning
    case exceeded

    /// Color for the status indicator
    var color: String {
        switch self {
        case .safe: return "#2D5A4A"      // Green
        case .warning: return "#C9A227"   // Amber
        case .exceeded: return "#DC2626"  // Red
        }
    }

    /// Icon for the status
    var icon: String {
        switch self {
        case .safe: return "checkmark.circle.fill"
        case .warning: return "exclamationmark.triangle.fill"
        case .exceeded: return "xmark.circle.fill"
        }
    }
}

// MARK: - Budget Progress Calculator

extension Budget {
    /// Calculate progress for this budget given spending amount
    func calculateProgress(spent: Double, category: Category?) -> BudgetProgress {
        let remaining = max(0, monthlyLimit - spent)
        let percentage = monthlyLimit > 0 ? (spent / monthlyLimit) * 100 : 0

        let status: BudgetStatus
        if percentage >= 100 {
            status = .exceeded
        } else if percentage >= alertThreshold {
            status = .warning
        } else {
            status = .safe
        }

        return BudgetProgress(
            budget: self,
            categoryName: category?.name ?? "Unknown",
            categoryIcon: category?.icon ?? "questionmark.circle",
            categoryColor: category?.color ?? "#9CA3A0",
            spent: spent,
            remaining: remaining,
            percentage: percentage,
            status: status
        )
    }
}

// MARK: - Sample Data for Previews

#if DEBUG
extension Budget {
    static let sampleFood = Budget(
        id: "budget-food",
        name: "Food Budget",
        categoryId: "food",
        monthlyLimit: 500,
        alertThreshold: 80,
        isActive: true
    )

    static let sampleTransport = Budget(
        id: "budget-transport",
        name: "Transport Budget",
        categoryId: "transport",
        monthlyLimit: 200,
        alertThreshold: 80,
        isActive: true
    )

    static let samples: [Budget] = [
        .sampleFood,
        .sampleTransport
    ]
}

extension BudgetProgress {
    static let sampleSafe = BudgetProgress(
        budget: .sampleFood,
        categoryName: "Food & Drink",
        categoryIcon: "fork.knife",
        categoryColor: "#C9A227",
        spent: 250,
        remaining: 250,
        percentage: 50,
        status: .safe
    )

    static let sampleWarning = BudgetProgress(
        budget: .sampleFood,
        categoryName: "Food & Drink",
        categoryIcon: "fork.knife",
        categoryColor: "#C9A227",
        spent: 425,
        remaining: 75,
        percentage: 85,
        status: .warning
    )

    static let sampleExceeded = BudgetProgress(
        budget: .sampleTransport,
        categoryName: "Transport",
        categoryIcon: "car",
        categoryColor: "#4A6FA5",
        spent: 250,
        remaining: 0,
        percentage: 125,
        status: .exceeded
    )

    static let samples: [BudgetProgress] = [
        .sampleSafe,
        .sampleWarning,
        .sampleExceeded
    ]
}
#endif
