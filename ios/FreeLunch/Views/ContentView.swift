import SwiftUI

/// Root view that handles authentication state and main navigation
struct ContentView: View {
    @Environment(AuthViewModel.self) private var authViewModel
    @Environment(MonthViewModel.self) private var monthViewModel
    @State private var selectedTab = 0
    @State private var showBiometricLock = false

    var body: some View {
        Group {
            switch authViewModel.authState {
            case .loading:
                loadingView
            case .unauthenticated:
                LoginView()
            case .authenticated:
                if showBiometricLock {
                    BiometricLockView(onUnlock: {
                        showBiometricLock = false
                    })
                } else {
                    MainTabView(selectedTab: $selectedTab)
                }
            }
        }
        .onAppear {
            checkBiometricLock()
        }
        .onReceive(NotificationCenter.default.publisher(for: UIApplication.willEnterForegroundNotification)) { _ in
            checkBiometricLock()
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: 16) {
            Image(systemName: "fork.knife.circle.fill")
                .resizable()
                .scaledToFit()
                .frame(width: 80, height: 80)
                .foregroundStyle(.tint)

            ProgressView()
        }
    }

    // MARK: - Biometric Lock

    private func checkBiometricLock() {
        if UserDefaults.standard.requiresReauthentication() {
            showBiometricLock = true
        }
    }
}

// MARK: - Main Tab View

struct MainTabView: View {
    @Binding var selectedTab: Int
    @Environment(MonthViewModel.self) private var monthViewModel
    @State private var dashboardViewModel = DashboardViewModel()
    @State private var transactionsViewModel = TransactionsViewModel()
    @State private var categoriesViewModel = CategoriesViewModel()
    @State private var budgetsViewModel = BudgetsViewModel()

    var body: some View {
        TabView(selection: $selectedTab) {
            DashboardView(selectedTab: $selectedTab)
                .environment(dashboardViewModel)
                .environment(categoriesViewModel)
                .tabItem {
                    Label("Dashboard", systemImage: "chart.pie")
                }
                .tag(0)

            TransactionsView()
                .environment(transactionsViewModel)
                .environment(categoriesViewModel)
                .tabItem {
                    Label("Transactions", systemImage: "list.bullet")
                }
                .tag(1)

            CategoriesView()
                .environment(categoriesViewModel)
                .tabItem {
                    Label("Categories", systemImage: "folder")
                }
                .tag(2)

            BudgetsView()
                .environment(budgetsViewModel)
                .environment(categoriesViewModel)
                .tabItem {
                    Label("Budgets", systemImage: "chart.bar")
                }
                .tag(3)

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gear")
                }
                .tag(4)
        }
        .onAppear {
            startListeners()
        }
        .onChange(of: monthViewModel.dateRange) { _, newRange in
            dashboardViewModel.stopListening()
            transactionsViewModel.stopListening()
            dashboardViewModel.startListening(dateRange: newRange)
            transactionsViewModel.startListening(dateRange: newRange)
            Task {
                await budgetsViewModel.fetchBudgetProgress(
                    startDate: newRange.lowerBound,
                    endDate: newRange.upperBound
                )
            }
        }
        .onDisappear {
            stopListeners()
        }
    }

    private func startListeners() {
        let dateRange = monthViewModel.dateRange
        dashboardViewModel.startListening(dateRange: dateRange)
        transactionsViewModel.startListening(dateRange: dateRange)
        categoriesViewModel.startListening()
        budgetsViewModel.startListening(dateRange: dateRange)
    }

    private func stopListeners() {
        dashboardViewModel.stopListening()
        transactionsViewModel.stopListening()
        categoriesViewModel.stopListening()
        budgetsViewModel.stopListening()
    }
}

// MARK: - Biometric Lock View

struct BiometricLockView: View {
    let onUnlock: () -> Void
    @State private var isAuthenticating = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "lock.fill")
                .font(.system(size: 60))
                .foregroundStyle(.secondary)

            Text("Free Lunch is Locked")
                .font(.title2)
                .fontWeight(.semibold)

            if let error = errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
            }

            Button {
                authenticate()
            } label: {
                HStack {
                    Image(systemName: biometricIcon)
                    Text("Unlock with \(biometricName)")
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(isAuthenticating)

            Spacer()
        }
        .padding()
        .onAppear {
            authenticate()
        }
    }

    private var biometricIcon: String {
        Task {
            await BiometricService.shared.biometricType().icon
        }
        return "faceid"
    }

    private var biometricName: String {
        Task {
            await BiometricService.shared.biometricType().displayName
        }
        return "Face ID"
    }

    private func authenticate() {
        isAuthenticating = true
        errorMessage = nil

        Task {
            do {
                let success = try await BiometricService.shared.authenticateWithFallback()
                if success {
                    UserDefaults.standard.lastAuthenticatedDate = Date()
                    await MainActor.run {
                        onUnlock()
                    }
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                }
            }
            await MainActor.run {
                isAuthenticating = false
            }
        }
    }
}

// MARK: - Preview

#if DEBUG
#Preview {
    ContentView()
        .environment(AuthViewModel())
        .environment(MonthViewModel())
}
#endif
