import SwiftUI
import FirebaseCore

@main
struct FreeLunchApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate
    @State private var authViewModel: AuthViewModel
    @State private var monthViewModel = MonthViewModel()

    init() {
        // Configure Firebase before any Firebase services are used
        FirebaseApp.configure()

        // Now safe to create AuthViewModel which uses FirebaseAuth
        _authViewModel = State(initialValue: AuthViewModel())
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(authViewModel)
                .environment(monthViewModel)
        }
    }
}
