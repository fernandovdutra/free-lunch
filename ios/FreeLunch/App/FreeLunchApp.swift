import SwiftUI
import FirebaseCore

@main
struct FreeLunchApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate
    @State private var authViewModel: AuthViewModel
    @State private var monthViewModel = MonthViewModel()
    @AppStorage("userTheme") private var userTheme = "system"

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
                .preferredColorScheme(colorScheme)
        }
    }

    private var colorScheme: ColorScheme? {
        switch userTheme {
        case "light": return .light
        case "dark": return .dark
        default: return nil
        }
    }
}
