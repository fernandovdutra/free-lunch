import Foundation
import LocalAuthentication

/// Service for biometric authentication (Face ID / Touch ID)
actor BiometricService {
    static let shared = BiometricService()

    // MARK: - Biometric Type

    enum BiometricType {
        case none
        case touchID
        case faceID

        var displayName: String {
            switch self {
            case .none: return "None"
            case .touchID: return "Touch ID"
            case .faceID: return "Face ID"
            }
        }

        var icon: String {
            switch self {
            case .none: return "lock"
            case .touchID: return "touchid"
            case .faceID: return "faceid"
            }
        }
    }

    // MARK: - Error Types

    enum BiometricError: LocalizedError {
        case notAvailable
        case notEnrolled
        case lockout
        case cancelled
        case failed
        case unknown(Error)

        var errorDescription: String? {
            switch self {
            case .notAvailable:
                return "Biometric authentication is not available on this device."
            case .notEnrolled:
                return "No biometrics are enrolled. Please set up Face ID or Touch ID in Settings."
            case .lockout:
                return "Biometric authentication is locked. Please unlock your device first."
            case .cancelled:
                return "Authentication was cancelled."
            case .failed:
                return "Authentication failed. Please try again."
            case .unknown(let error):
                return error.localizedDescription
            }
        }
    }

    // MARK: - Public Methods

    /// Check which biometric type is available
    func biometricType() -> BiometricType {
        let context = LAContext()
        var error: NSError?

        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return .none
        }

        switch context.biometryType {
        case .touchID:
            return .touchID
        case .faceID:
            return .faceID
        case .opticID:
            return .faceID // Treat opticID like faceID for now
        case .none:
            return .none
        @unknown default:
            return .none
        }
    }

    /// Check if biometrics are available
    func isAvailable() -> Bool {
        biometricType() != .none
    }

    /// Authenticate using biometrics
    func authenticate(reason: String = "Authenticate to access Free Lunch") async throws -> Bool {
        let context = LAContext()
        var error: NSError?

        // Check availability
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            if let error {
                throw mapLAError(error)
            }
            throw BiometricError.notAvailable
        }

        // Perform authentication
        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: reason
            )
            return success
        } catch {
            throw mapLAError(error as NSError)
        }
    }

    /// Authenticate with fallback to device passcode
    func authenticateWithFallback(reason: String = "Authenticate to access Free Lunch") async throws -> Bool {
        let context = LAContext()
        context.localizedFallbackTitle = "Use Passcode"

        var error: NSError?

        // Check availability
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
            if let error {
                throw mapLAError(error)
            }
            throw BiometricError.notAvailable
        }

        // Perform authentication
        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthentication,
                localizedReason: reason
            )
            return success
        } catch {
            throw mapLAError(error as NSError)
        }
    }

    // MARK: - Private Methods

    private func mapLAError(_ error: NSError) -> BiometricError {
        guard error.domain == LAError.errorDomain else {
            return .unknown(error)
        }

        switch LAError.Code(rawValue: error.code) {
        case .biometryNotAvailable:
            return .notAvailable
        case .biometryNotEnrolled:
            return .notEnrolled
        case .biometryLockout:
            return .lockout
        case .userCancel, .systemCancel, .appCancel:
            return .cancelled
        case .authenticationFailed:
            return .failed
        default:
            return .unknown(error)
        }
    }
}

// MARK: - UserDefaults Keys

extension UserDefaults {
    private enum Keys {
        static let biometricLockEnabled = "biometricLockEnabled"
        static let lastAuthenticatedDate = "lastAuthenticatedDate"
    }

    var biometricLockEnabled: Bool {
        get { bool(forKey: Keys.biometricLockEnabled) }
        set { set(newValue, forKey: Keys.biometricLockEnabled) }
    }

    var lastAuthenticatedDate: Date? {
        get { object(forKey: Keys.lastAuthenticatedDate) as? Date }
        set { set(newValue, forKey: Keys.lastAuthenticatedDate) }
    }

    /// Check if re-authentication is required (after 5 minutes of inactivity)
    func requiresReauthentication(timeout: TimeInterval = 300) -> Bool {
        guard biometricLockEnabled else { return false }
        guard let lastAuth = lastAuthenticatedDate else { return true }
        return Date().timeIntervalSince(lastAuth) > timeout
    }
}
