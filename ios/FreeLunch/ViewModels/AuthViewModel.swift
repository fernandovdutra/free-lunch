import Foundation
import Observation
import FirebaseAuth
import GoogleSignIn
import FirebaseCore

/// Manages authentication state and operations
@Observable
final class AuthViewModel {
    // MARK: - Published State

    var currentUser: User?
    var firebaseUser: FirebaseAuth.User?
    var authState: AuthState = .loading
    var errorMessage: String?
    var isLoading = false

    // MARK: - Auth State

    enum AuthState {
        case loading
        case unauthenticated
        case authenticated
    }

    // MARK: - Private Properties

    private var authStateListener: AuthStateDidChangeListenerHandle?

    // MARK: - Initialization

    init() {
        setupAuthStateListener()
    }

    deinit {
        if let handle = authStateListener {
            Auth.auth().removeStateDidChangeListener(handle)
        }
    }

    // MARK: - Auth State Listener

    private func setupAuthStateListener() {
        authStateListener = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            Task { @MainActor in
                self?.firebaseUser = user

                if let user {
                    do {
                        let appUser = try await FirestoreService.shared.fetchOrCreateUser(
                            userId: user.uid,
                            email: user.email ?? "",
                            displayName: user.displayName
                        )
                        self?.currentUser = appUser
                        self?.authState = .authenticated
                    } catch {
                        print("Error fetching user: \(error)")
                        self?.currentUser = nil
                        self?.authState = .unauthenticated
                    }
                } else {
                    self?.currentUser = nil
                    self?.authState = .unauthenticated
                }
            }
        }
    }

    // MARK: - Sign In

    /// Sign in with email and password
    func signIn(email: String, password: String) async {
        isLoading = true
        errorMessage = nil

        do {
            let result = try await Auth.auth().signIn(withEmail: email, password: password)
            firebaseUser = result.user

            let appUser = try await FirestoreService.shared.fetchOrCreateUser(
                userId: result.user.uid,
                email: result.user.email ?? "",
                displayName: result.user.displayName
            )
            currentUser = appUser
            authState = .authenticated
        } catch {
            handleAuthError(error)
        }

        isLoading = false
    }

    /// Sign in with Google
    @MainActor
    func signInWithGoogle() async {
        guard let clientID = FirebaseApp.app()?.options.clientID else {
            errorMessage = "Firebase configuration error"
            return
        }

        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let rootViewController = windowScene.windows.first?.rootViewController else {
            errorMessage = "Unable to find root view controller"
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            let config = GIDConfiguration(clientID: clientID)
            GIDSignIn.sharedInstance.configuration = config

            let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: rootViewController)

            guard let idToken = result.user.idToken?.tokenString else {
                errorMessage = "Failed to get ID token from Google"
                isLoading = false
                return
            }

            let credential = GoogleAuthProvider.credential(
                withIDToken: idToken,
                accessToken: result.user.accessToken.tokenString
            )

            let authResult = try await Auth.auth().signIn(with: credential)
            firebaseUser = authResult.user

            let appUser = try await FirestoreService.shared.fetchOrCreateUser(
                userId: authResult.user.uid,
                email: authResult.user.email ?? "",
                displayName: authResult.user.displayName
            )
            currentUser = appUser
            authState = .authenticated
        } catch {
            handleAuthError(error)
        }

        isLoading = false
    }

    // MARK: - Sign Up

    /// Create a new account with email and password
    func signUp(email: String, password: String, displayName: String) async {
        isLoading = true
        errorMessage = nil

        do {
            let result = try await Auth.auth().createUser(withEmail: email, password: password)

            // Update display name
            let changeRequest = result.user.createProfileChangeRequest()
            changeRequest.displayName = displayName
            try await changeRequest.commitChanges()

            firebaseUser = Auth.auth().currentUser

            let appUser = try await FirestoreService.shared.fetchOrCreateUser(
                userId: result.user.uid,
                email: email,
                displayName: displayName
            )
            currentUser = appUser
            authState = .authenticated
        } catch {
            handleAuthError(error)
        }

        isLoading = false
    }

    // MARK: - Sign Out

    /// Sign out the current user
    func signOut() {
        do {
            try Auth.auth().signOut()
            GIDSignIn.sharedInstance.signOut()
            currentUser = nil
            firebaseUser = nil
            authState = .unauthenticated
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Password Reset

    /// Send password reset email
    func sendPasswordReset(email: String) async {
        isLoading = true
        errorMessage = nil

        do {
            try await Auth.auth().sendPasswordReset(withEmail: email)
        } catch {
            handleAuthError(error)
        }

        isLoading = false
    }

    // MARK: - Error Handling

    private func handleAuthError(_ error: Error) {
        let nsError = error as NSError

        switch nsError.code {
        case AuthErrorCode.wrongPassword.rawValue:
            errorMessage = "Incorrect password. Please try again."
        case AuthErrorCode.invalidEmail.rawValue:
            errorMessage = "Invalid email address."
        case AuthErrorCode.userNotFound.rawValue:
            errorMessage = "No account found with this email."
        case AuthErrorCode.emailAlreadyInUse.rawValue:
            errorMessage = "An account already exists with this email."
        case AuthErrorCode.weakPassword.rawValue:
            errorMessage = "Password must be at least 6 characters."
        case AuthErrorCode.networkError.rawValue:
            errorMessage = "Network error. Please check your connection."
        case AuthErrorCode.tooManyRequests.rawValue:
            errorMessage = "Too many attempts. Please try again later."
        default:
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Helpers

    /// Clear any displayed error message
    func clearError() {
        errorMessage = nil
    }

    /// Check if email is valid format
    func isValidEmail(_ email: String) -> Bool {
        let emailRegex = #"^[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"#
        return email.range(of: emailRegex, options: .regularExpression) != nil
    }

    /// Check if password meets requirements
    func isValidPassword(_ password: String) -> Bool {
        password.count >= 6
    }
}
