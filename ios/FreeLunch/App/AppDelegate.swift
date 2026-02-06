import UIKit

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        // Firebase is configured in FreeLunchApp.init()
        return true
    }

    // Handle URL for OAuth callback
    func application(
        _ app: UIApplication,
        open url: URL,
        options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    ) -> Bool {
        // Handle custom URL scheme callbacks (e.g., freelunch://)
        if url.scheme == "freelunch" {
            NotificationCenter.default.post(
                name: .bankOAuthCallback,
                object: nil,
                userInfo: ["url": url]
            )
            return true
        }
        return false
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let bankOAuthCallback = Notification.Name("bankOAuthCallback")
    static let openTransaction = Notification.Name("openTransaction")
}
