import Foundation
import FirebaseFunctions
import AuthenticationServices
import UIKit

/// Service for bank connection and transaction sync via Cloud Functions
actor BankingService: NSObject {
    static let shared = BankingService()
    private let functions = Functions.functions(region: "europe-west1")

    // MARK: - Types

    struct SyncResult: Sendable {
        let totalNew: Int
        let totalUpdated: Int
        let accounts: Int
    }

    enum BankingError: LocalizedError {
        case invalidResponse
        case authFailed
        case connectionFailed(String)
        case syncFailed(String)
        case cancelled

        var errorDescription: String? {
            switch self {
            case .invalidResponse:
                return "Received an invalid response from the server."
            case .authFailed:
                return "Bank authentication failed. Please try again."
            case .connectionFailed(let message):
                return "Failed to connect to bank: \(message)"
            case .syncFailed(let message):
                return "Failed to sync transactions: \(message)"
            case .cancelled:
                return "Bank connection was cancelled."
            }
        }
    }

    // MARK: - Available Banks

    /// Fetch list of available banks for connection
    func getAvailableBanks() async throws -> [AvailableBank] {
        let result = try await functions.httpsCallable("getAvailableBanks").call(["country": "NL"])

        guard let data = result.data as? [[String: Any]] else {
            throw BankingError.invalidResponse
        }

        return data.compactMap { dict in
            guard let name = dict["name"] as? String,
                  let country = dict["country"] as? String else {
                return nil
            }
            return AvailableBank(
                name: name,
                country: country,
                logo: dict["logo"] as? String,
                bic: dict["bic"] as? String
            )
        }
    }

    // MARK: - Bank Connection

    /// Initialize bank connection and get OAuth URL
    func initBankConnection(bankName: String) async throws -> URL {
        let result = try await functions.httpsCallable("initBankConnection").call([
            "bankName": bankName
        ])

        guard let data = result.data as? [String: Any],
              let authUrlString = data["authUrl"] as? String,
              let authUrl = URL(string: authUrlString) else {
            throw BankingError.invalidResponse
        }

        return authUrl
    }

    /// Start OAuth flow with ASWebAuthenticationSession
    @MainActor
    func connectBank(
        bankName: String,
        presentationContext: ASWebAuthenticationPresentationContextProviding
    ) async throws -> Bool {
        // Get OAuth URL from Cloud Function
        let authUrl = try await initBankConnection(bankName: bankName)

        // Start OAuth session
        return try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(
                url: authUrl,
                callbackURLScheme: "freelunch"
            ) { callbackURL, error in
                if let error {
                    if (error as NSError).code == ASWebAuthenticationSessionError.canceledLogin.rawValue {
                        continuation.resume(throwing: BankingError.cancelled)
                    } else {
                        continuation.resume(throwing: BankingError.authFailed)
                    }
                    return
                }

                guard let callbackURL,
                      let components = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false) else {
                    continuation.resume(throwing: BankingError.authFailed)
                    return
                }

                // Check for success or error in callback
                if components.queryItems?.contains(where: { $0.name == "bank_connected" }) == true {
                    continuation.resume(returning: true)
                } else if let error = components.queryItems?.first(where: { $0.name == "bank_error" })?.value {
                    continuation.resume(throwing: BankingError.connectionFailed(error))
                } else {
                    continuation.resume(throwing: BankingError.authFailed)
                }
            }

            session.presentationContextProvider = presentationContext
            session.prefersEphemeralWebBrowserSession = true

            if !session.start() {
                continuation.resume(throwing: BankingError.authFailed)
            }
        }
    }

    // MARK: - Transaction Sync

    /// Sync transactions for a specific connection
    func syncTransactions(connectionId: String) async throws -> SyncResult {
        let result = try await functions.httpsCallable("syncTransactions").call([
            "connectionId": connectionId
        ])

        guard let data = result.data as? [String: Any] else {
            throw BankingError.invalidResponse
        }

        return SyncResult(
            totalNew: data["totalNew"] as? Int ?? 0,
            totalUpdated: data["totalUpdated"] as? Int ?? 0,
            accounts: data["accounts"] as? Int ?? 0
        )
    }

    /// Sync all bank connections
    func syncAllConnections() async throws -> [String: SyncResult] {
        let result = try await functions.httpsCallable("syncAllBankConnections").call()

        guard let data = result.data as? [String: [String: Any]] else {
            throw BankingError.invalidResponse
        }

        var results: [String: SyncResult] = [:]
        for (connectionId, syncData) in data {
            results[connectionId] = SyncResult(
                totalNew: syncData["totalNew"] as? Int ?? 0,
                totalUpdated: syncData["totalUpdated"] as? Int ?? 0,
                accounts: syncData["accounts"] as? Int ?? 0
            )
        }

        return results
    }

    // MARK: - Connection Management

    /// Disconnect a bank connection
    func disconnectBank(connectionId: String) async throws {
        _ = try await functions.httpsCallable("disconnectBank").call([
            "connectionId": connectionId
        ])
    }

    /// Refresh bank connection consent
    func refreshConsent(connectionId: String) async throws -> URL {
        let result = try await functions.httpsCallable("refreshBankConsent").call([
            "connectionId": connectionId
        ])

        guard let data = result.data as? [String: Any],
              let authUrlString = data["authUrl"] as? String,
              let authUrl = URL(string: authUrlString) else {
            throw BankingError.invalidResponse
        }

        return authUrl
    }

    // MARK: - Dashboard Aggregations

    /// Response types for Cloud Function results
    struct DashboardSummary: Sendable {
        let totalIncome: Double
        let totalExpenses: Double
        let netBalance: Double
        let pendingReimbursements: Double
        let transactionCount: Int
    }

    struct DashboardCategorySpending: Sendable {
        let categoryId: String
        let categoryName: String
        let categoryColor: String
        let amount: Double
        let percentage: Double
        let transactionCount: Int
    }

    struct DashboardTimelineEntry: Sendable {
        let date: String
        let dateKey: String
        let income: Double
        let expenses: Double
    }

    struct DashboardDataResponse: Sendable {
        let summary: DashboardSummary
        let categorySpending: [DashboardCategorySpending]
        let timeline: [DashboardTimelineEntry]
        let recentTransactionDicts: [[String: Any]]
    }

    /// Fetch dashboard aggregations from Cloud Function
    func getDashboardData(startDate: Date, endDate: Date) async throws -> DashboardDataResponse {
        let formatter = ISO8601DateFormatter()
        let result = try await functions.httpsCallable("getDashboardData").call([
            "startDate": formatter.string(from: startDate),
            "endDate": formatter.string(from: endDate)
        ])

        guard let data = result.data as? [String: Any],
              let summaryDict = data["summary"] as? [String: Any],
              let categorySpendingArray = data["categorySpending"] as? [[String: Any]],
              let timelineArray = data["timeline"] as? [[String: Any]],
              let recentArray = data["recentTransactions"] as? [[String: Any]] else {
            throw BankingError.invalidResponse
        }

        let summary = DashboardSummary(
            totalIncome: summaryDict["totalIncome"] as? Double ?? 0,
            totalExpenses: summaryDict["totalExpenses"] as? Double ?? 0,
            netBalance: summaryDict["netBalance"] as? Double ?? 0,
            pendingReimbursements: summaryDict["pendingReimbursements"] as? Double ?? 0,
            transactionCount: summaryDict["transactionCount"] as? Int ?? 0
        )

        let categorySpending = categorySpendingArray.map { dict in
            DashboardCategorySpending(
                categoryId: dict["categoryId"] as? String ?? "",
                categoryName: dict["categoryName"] as? String ?? "Unknown",
                categoryColor: dict["categoryColor"] as? String ?? "#9CA3AF",
                amount: dict["amount"] as? Double ?? 0,
                percentage: dict["percentage"] as? Double ?? 0,
                transactionCount: dict["transactionCount"] as? Int ?? 0
            )
        }

        let timeline = timelineArray.map { dict in
            DashboardTimelineEntry(
                date: dict["date"] as? String ?? "",
                dateKey: dict["dateKey"] as? String ?? "",
                income: dict["income"] as? Double ?? 0,
                expenses: dict["expenses"] as? Double ?? 0
            )
        }

        return DashboardDataResponse(
            summary: summary,
            categorySpending: categorySpending,
            timeline: timeline,
            recentTransactionDicts: recentArray
        )
    }

    // MARK: - Budget Progress

    struct BudgetProgressItem: Sendable {
        let budgetId: String
        let budgetName: String
        let categoryId: String
        let categoryName: String
        let categoryIcon: String
        let categoryColor: String
        let monthlyLimit: Double
        let alertThreshold: Double
        let spent: Double
        let remaining: Double
        let percentage: Double
        let status: String // "safe", "warning", "exceeded"
    }

    struct BudgetProgressResponse: Sendable {
        let budgetProgress: [BudgetProgressItem]
        let suggestions: [String: Double]?
    }

    /// Fetch budget progress from Cloud Function
    func getBudgetProgress(startDate: Date? = nil, endDate: Date? = nil, suggestions: Bool = false) async throws -> BudgetProgressResponse {
        var params: [String: Any] = ["suggestions": suggestions]
        if let startDate {
            params["startDate"] = ISO8601DateFormatter().string(from: startDate)
        }
        if let endDate {
            params["endDate"] = ISO8601DateFormatter().string(from: endDate)
        }

        let result = try await functions.httpsCallable("getBudgetProgress").call(params)

        guard let data = result.data as? [String: Any],
              let progressArray = data["budgetProgress"] as? [[String: Any]] else {
            throw BankingError.invalidResponse
        }

        let budgetProgress = progressArray.map { dict in
            BudgetProgressItem(
                budgetId: dict["budgetId"] as? String ?? "",
                budgetName: dict["budgetName"] as? String ?? "",
                categoryId: dict["categoryId"] as? String ?? "",
                categoryName: dict["categoryName"] as? String ?? "Unknown",
                categoryIcon: dict["categoryIcon"] as? String ?? "📁",
                categoryColor: dict["categoryColor"] as? String ?? "#9CA3AF",
                monthlyLimit: dict["monthlyLimit"] as? Double ?? 0,
                alertThreshold: dict["alertThreshold"] as? Double ?? 80,
                spent: dict["spent"] as? Double ?? 0,
                remaining: dict["remaining"] as? Double ?? 0,
                percentage: dict["percentage"] as? Double ?? 0,
                status: dict["status"] as? String ?? "safe"
            )
        }

        let suggestions = data["suggestions"] as? [String: Double]

        return BudgetProgressResponse(budgetProgress: budgetProgress, suggestions: suggestions)
    }

    // MARK: - Reimbursement Summary

    struct ReimbursementSummaryResult: Sendable {
        let pendingCount: Int
        let pendingTotal: Double
        let pendingWorkTotal: Double
        let pendingPersonalTotal: Double
        let clearedCount: Int
        let clearedTotal: Double
    }

    struct ReimbursementSummaryResponse: Sendable {
        let summary: ReimbursementSummaryResult
        let pendingTransactionDicts: [[String: Any]]
        let clearedTransactionDicts: [[String: Any]]
    }

    /// Fetch reimbursement summary from Cloud Function
    func getReimbursementSummary(clearedLimit: Int = 10) async throws -> ReimbursementSummaryResponse {
        let result = try await functions.httpsCallable("getReimbursementSummary").call([
            "clearedLimit": clearedLimit
        ])

        guard let data = result.data as? [String: Any],
              let summaryDict = data["summary"] as? [String: Any],
              let pendingArray = data["pendingTransactions"] as? [[String: Any]],
              let clearedArray = data["clearedTransactions"] as? [[String: Any]] else {
            throw BankingError.invalidResponse
        }

        let summary = ReimbursementSummaryResult(
            pendingCount: summaryDict["pendingCount"] as? Int ?? 0,
            pendingTotal: summaryDict["pendingTotal"] as? Double ?? 0,
            pendingWorkTotal: summaryDict["pendingWorkTotal"] as? Double ?? 0,
            pendingPersonalTotal: summaryDict["pendingPersonalTotal"] as? Double ?? 0,
            clearedCount: summaryDict["clearedCount"] as? Int ?? 0,
            clearedTotal: summaryDict["clearedTotal"] as? Double ?? 0
        )

        return ReimbursementSummaryResponse(
            summary: summary,
            pendingTransactionDicts: pendingArray,
            clearedTransactionDicts: clearedArray
        )
    }

    // MARK: - Default Categories

    struct DefaultCategoriesResponse: Sendable {
        let created: Bool
        let count: Int
    }

    /// Create default categories via Cloud Function (idempotent)
    func createDefaultCategories() async throws -> DefaultCategoriesResponse {
        let result = try await functions.httpsCallable("createDefaultCategories").call()

        guard let data = result.data as? [String: Any] else {
            throw BankingError.invalidResponse
        }

        return DefaultCategoriesResponse(
            created: data["created"] as? Bool ?? false,
            count: data["count"] as? Int ?? 0
        )
    }
}

// MARK: - Presentation Context Provider

/// Helper class for ASWebAuthenticationSession presentation
class BankConnectionPresentationContext: NSObject, ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = scene.windows.first else {
            return ASPresentationAnchor()
        }
        return window
    }
}
