import Foundation
import FirebaseFirestore
import FirebaseFirestoreSwift

/// Represents a connection to a bank account via Enable Banking
struct BankConnection: Identifiable, Codable, Equatable {
    @DocumentID var id: String?
    var provider: String = "enable_banking"
    var bankId: String
    var bankName: String
    var status: ConnectionStatus
    var lastSync: Date?
    var consentExpiresAt: Date?
    var accounts: [BankAccount]
    var accountBalances: [String: AccountBalance]?
    var createdAt: Date?
    var updatedAt: Date?

    // MARK: - Computed Properties

    /// Whether the connection is active and can sync
    var isActive: Bool {
        status == .active
    }

    /// Whether the consent has expired
    var isExpired: Bool {
        guard let expiresAt = consentExpiresAt else { return false }
        return expiresAt < Date()
    }

    /// Days until consent expires
    var daysUntilExpiry: Int? {
        guard let expiresAt = consentExpiresAt else { return nil }
        let calendar = Calendar.current
        let components = calendar.dateComponents([.day], from: Date(), to: expiresAt)
        return components.day
    }

    /// Formatted last sync time
    var lastSyncFormatted: String? {
        guard let lastSync else { return nil }
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: lastSync, relativeTo: Date())
    }

    /// Total balance across all accounts
    var totalBalance: Double {
        accountBalances?.values.reduce(0) { $0 + $1.amount } ?? 0
    }

    // MARK: - Coding Keys

    enum CodingKeys: String, CodingKey {
        case id
        case provider
        case bankId
        case bankName
        case status
        case lastSync
        case consentExpiresAt
        case accounts
        case accountBalances
        case createdAt
        case updatedAt
    }
}

// MARK: - Supporting Types

/// Status of bank connection
enum ConnectionStatus: String, Codable, Equatable {
    case active
    case expired
    case error

    /// Human-readable description
    var description: String {
        switch self {
        case .active: return "Connected"
        case .expired: return "Consent Expired"
        case .error: return "Connection Error"
        }
    }

    /// Icon for the status
    var icon: String {
        switch self {
        case .active: return "checkmark.circle.fill"
        case .expired: return "clock.badge.exclamationmark"
        case .error: return "exclamationmark.triangle.fill"
        }
    }

    /// Color for the status
    var color: String {
        switch self {
        case .active: return "#2D5A4A"
        case .expired: return "#C9A227"
        case .error: return "#DC2626"
        }
    }
}

/// A bank account within a connection
struct BankAccount: Codable, Equatable, Identifiable {
    var uid: String
    var iban: String
    var name: String?
    var currency: String

    var id: String { uid }

    /// Masked IBAN for display (shows last 4 digits)
    var maskedIBAN: String {
        guard iban.count > 4 else { return iban }
        let suffix = String(iban.suffix(4))
        return "****\(suffix)"
    }

    /// Full IBAN formatted with spaces
    var formattedIBAN: String {
        // NL IBANs: NL00 ABCD 0000 0000 00
        var formatted = ""
        for (index, char) in iban.enumerated() {
            if index > 0 && index % 4 == 0 {
                formatted += " "
            }
            formatted.append(char)
        }
        return formatted
    }
}

/// Balance information for an account
struct AccountBalance: Codable, Equatable {
    var amount: Double
    var currency: String
    var type: String
    var referenceDate: String?
    var updatedAt: Date?

    /// Formatted balance amount
    var formattedAmount: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currency
        formatter.locale = Locale(identifier: "nl_NL")
        return formatter.string(from: NSNumber(value: amount)) ?? "\(currency) \(amount)"
    }
}

/// Available bank for connection
struct AvailableBank: Identifiable, Equatable {
    var id: String { bic ?? name }
    var name: String
    var country: String
    var logo: String?
    var bic: String?
}

// MARK: - Sample Data for Previews

#if DEBUG
extension BankConnection {
    static let sampleActive = BankConnection(
        id: "conn-1",
        provider: "enable_banking",
        bankId: "abn_amro",
        bankName: "ABN AMRO",
        status: .active,
        lastSync: Date().addingTimeInterval(-3600), // 1 hour ago
        consentExpiresAt: Date().addingTimeInterval(86400 * 30), // 30 days
        accounts: [
            BankAccount(uid: "acc-1", iban: "NL02ABNA0123456789", name: "Main Account", currency: "EUR"),
            BankAccount(uid: "acc-2", iban: "NL02ABNA9876543210", name: "Savings", currency: "EUR")
        ],
        accountBalances: [
            "acc-1": AccountBalance(amount: 2500.50, currency: "EUR", type: "available"),
            "acc-2": AccountBalance(amount: 15000.00, currency: "EUR", type: "available")
        ]
    )

    static let sampleExpired = BankConnection(
        id: "conn-2",
        provider: "enable_banking",
        bankId: "ing",
        bankName: "ING",
        status: .expired,
        lastSync: Date().addingTimeInterval(-86400 * 7), // 7 days ago
        consentExpiresAt: Date().addingTimeInterval(-86400), // Yesterday
        accounts: [
            BankAccount(uid: "acc-3", iban: "NL02INGB0001234567", name: "Checking", currency: "EUR")
        ]
    )

    static let samples: [BankConnection] = [
        .sampleActive,
        .sampleExpired
    ]
}

extension AvailableBank {
    static let abnAmro = AvailableBank(name: "ABN AMRO", country: "NL", logo: "abn_amro_logo", bic: "ABNANL2A")
    static let ing = AvailableBank(name: "ING", country: "NL", logo: "ing_logo", bic: "INGBNL2A")
    static let rabobank = AvailableBank(name: "Rabobank", country: "NL", logo: "rabobank_logo", bic: "RABONL2U")

    static let samples: [AvailableBank] = [.abnAmro, .ing, .rabobank]
}
#endif
