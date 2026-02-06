import Foundation
import FirebaseFirestore
import FirebaseFirestoreSwift

/// Represents an authenticated user
struct User: Identifiable, Codable, Equatable {
    @DocumentID var id: String?
    var email: String
    var displayName: String?
    var createdAt: Date?
    var settings: UserSettings?

    // MARK: - Computed Properties

    /// Display name or email as fallback
    var displayNameOrEmail: String {
        displayName ?? email.components(separatedBy: "@").first ?? email
    }

    /// Initials for avatar
    var initials: String {
        let name = displayName ?? email
        let components = name.components(separatedBy: " ")
        if components.count >= 2 {
            let first = String(components[0].prefix(1))
            let last = String(components[1].prefix(1))
            return "\(first)\(last)".uppercased()
        }
        return String(name.prefix(2)).uppercased()
    }

    // MARK: - Coding Keys

    enum CodingKeys: String, CodingKey {
        case id
        case email
        case displayName
        case createdAt
        case settings
    }
}

// MARK: - User Settings

/// User preferences
struct UserSettings: Codable, Equatable {
    var language: Language = .en
    var currency: Currency = .eur
    var defaultDateRange: DateRange = .month
    var theme: Theme = .system
    var biometricLockEnabled: Bool = false
    var notificationsEnabled: Bool = true
    var budgetAlertsEnabled: Bool = true
    var newTransactionAlertsEnabled: Bool = false

    enum Language: String, Codable, CaseIterable {
        case en
        case nl

        var displayName: String {
            switch self {
            case .en: return "English"
            case .nl: return "Nederlands"
            }
        }
    }

    enum Currency: String, Codable, CaseIterable {
        case eur = "EUR"

        var symbol: String {
            switch self {
            case .eur: return "EUR"
            }
        }
    }

    enum DateRange: String, Codable, CaseIterable {
        case week
        case month
        case year

        var displayName: String {
            switch self {
            case .week: return "Week"
            case .month: return "Month"
            case .year: return "Year"
            }
        }
    }

    enum Theme: String, Codable, CaseIterable {
        case light
        case dark
        case system

        var displayName: String {
            switch self {
            case .light: return "Light"
            case .dark: return "Dark"
            case .system: return "System"
            }
        }
    }
}

// MARK: - Sample Data for Previews

#if DEBUG
extension User {
    static let sample = User(
        id: "user-123",
        email: "john.doe@example.com",
        displayName: "John Doe",
        createdAt: Date(),
        settings: UserSettings()
    )
}
#endif
