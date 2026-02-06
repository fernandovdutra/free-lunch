import Foundation
import FirebaseFirestore
import FirebaseFirestoreSwift

/// Represents a categorization rule for auto-categorizing transactions
struct CategorizationRule: Identifiable, Codable, Equatable {
    @DocumentID var id: String?
    var pattern: String
    var matchType: MatchType
    var categoryId: String
    var priority: Int
    var isLearned: Bool = false
    var isSystem: Bool = false
    var createdAt: Date?
    var updatedAt: Date?

    // MARK: - Computed Properties

    /// Check if a description matches this rule
    func matches(_ description: String) -> Bool {
        switch matchType {
        case .contains:
            return description.localizedCaseInsensitiveContains(pattern)
        case .exact:
            return description.localizedCaseInsensitiveCompare(pattern) == .orderedSame
        case .regex:
            guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else {
                return false
            }
            let range = NSRange(description.startIndex..., in: description)
            return regex.firstMatch(in: description, options: [], range: range) != nil
        }
    }

    // MARK: - Coding Keys

    enum CodingKeys: String, CodingKey {
        case id
        case pattern
        case matchType
        case categoryId
        case priority
        case isLearned
        case isSystem
        case createdAt
        case updatedAt
    }
}

// MARK: - Match Type

/// Type of pattern matching for rules
enum MatchType: String, Codable, Equatable, CaseIterable {
    case contains
    case exact
    case regex

    var displayName: String {
        switch self {
        case .contains: return "Contains"
        case .exact: return "Exact Match"
        case .regex: return "Regex"
        }
    }

    var description: String {
        switch self {
        case .contains: return "Transaction description contains the pattern"
        case .exact: return "Transaction description exactly matches the pattern"
        case .regex: return "Transaction description matches the regex pattern"
        }
    }
}

// MARK: - Sample Data for Previews

#if DEBUG
extension CategorizationRule {
    static let sampleAlbertHeijn = CategorizationRule(
        id: "rule-1",
        pattern: "albert heijn",
        matchType: .contains,
        categoryId: "food-groceries",
        priority: 10,
        isLearned: true
    )

    static let sampleNS = CategorizationRule(
        id: "rule-2",
        pattern: "ns.nl",
        matchType: .contains,
        categoryId: "transport-public",
        priority: 10,
        isSystem: true
    )

    static let samples: [CategorizationRule] = [
        .sampleAlbertHeijn,
        .sampleNS
    ]
}
#endif
