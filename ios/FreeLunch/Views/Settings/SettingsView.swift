import SwiftUI

/// Settings view with account, bank connection, and preferences
struct SettingsView: View {
    @Environment(AuthViewModel.self) private var authViewModel
    @State private var showBankConnection = false
    @State private var showSignOutAlert = false
    @State private var biometricLockEnabled = UserDefaults.standard.biometricLockEnabled

    var body: some View {
        NavigationStack {
            List {
                // Account Section
                accountSection

                // Bank Connection Section
                bankConnectionSection

                // Preferences Section
                preferencesSection

                // Security Section
                securitySection

                // About Section
                aboutSection

                // Sign Out
                signOutSection
            }
            .navigationTitle("Settings")
            .sheet(isPresented: $showBankConnection) {
                BankConnectionSheet()
            }
            .alert("Sign Out", isPresented: $showSignOutAlert) {
                Button("Cancel", role: .cancel) {}
                Button("Sign Out", role: .destructive) {
                    authViewModel.signOut()
                }
            } message: {
                Text("Are you sure you want to sign out?")
            }
        }
    }

    // MARK: - Account Section

    private var accountSection: some View {
        Section {
            HStack(spacing: 16) {
                // Avatar
                ZStack {
                    Circle()
                        .fill(Color.blue.opacity(0.2))
                        .frame(width: 60, height: 60)

                    Text(authViewModel.currentUser?.initials ?? "?")
                        .font(.title2)
                        .fontWeight(.semibold)
                        .foregroundStyle(.blue)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(authViewModel.currentUser?.displayNameOrEmail ?? "User")
                        .font(.headline)

                    Text(authViewModel.currentUser?.email ?? "")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()
            }
            .padding(.vertical, 8)
        } header: {
            Text("Account")
        }
    }

    // MARK: - Bank Connection Section

    private var bankConnectionSection: some View {
        Section {
            Button {
                showBankConnection = true
            } label: {
                HStack {
                    Image(systemName: "building.columns")
                        .foregroundStyle(.blue)
                        .frame(width: 28)

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Bank Connection")
                        Text("Connect or manage your bank")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .foregroundStyle(.secondary)
                }
            }
            .tint(.primary)
        } header: {
            Text("Banking")
        } footer: {
            Text("Connect your Dutch bank to automatically import transactions")
        }
    }

    // MARK: - Preferences Section

    private var preferencesSection: some View {
        Section("Preferences") {
            // Theme
            NavigationLink {
                ThemeSettingsView()
            } label: {
                HStack {
                    Image(systemName: "paintbrush")
                        .foregroundStyle(.purple)
                        .frame(width: 28)
                    Text("Appearance")
                }
            }

            // Notifications
            NavigationLink {
                NotificationSettingsView()
            } label: {
                HStack {
                    Image(systemName: "bell")
                        .foregroundStyle(.red)
                        .frame(width: 28)
                    Text("Notifications")
                }
            }

            // Language
            NavigationLink {
                LanguageSettingsView()
            } label: {
                HStack {
                    Image(systemName: "globe")
                        .foregroundStyle(.green)
                        .frame(width: 28)
                    Text("Language")
                }
            }
        }
    }

    // MARK: - Security Section

    private var securitySection: some View {
        Section {
            Toggle(isOn: $biometricLockEnabled) {
                HStack {
                    Image(systemName: biometricIcon)
                        .foregroundStyle(.orange)
                        .frame(width: 28)
                    Text("Require \(biometricName)")
                }
            }
            .onChange(of: biometricLockEnabled) { _, newValue in
                UserDefaults.standard.biometricLockEnabled = newValue
            }
        } header: {
            Text("Security")
        } footer: {
            Text("Require \(biometricName) when opening the app")
        }
    }

    // MARK: - About Section

    private var aboutSection: some View {
        Section("About") {
            HStack {
                Image(systemName: "info.circle")
                    .foregroundStyle(.gray)
                    .frame(width: 28)
                Text("Version")
                Spacer()
                Text(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0")
                    .foregroundStyle(.secondary)
            }

            Link(destination: URL(string: "https://github.com/free-lunch-app")!) {
                HStack {
                    Image(systemName: "questionmark.circle")
                        .foregroundStyle(.gray)
                        .frame(width: 28)
                    Text("Help & Support")
                    Spacer()
                    Image(systemName: "arrow.up.right")
                        .foregroundStyle(.secondary)
                }
            }
            .tint(.primary)

            Link(destination: URL(string: "https://github.com/free-lunch-app/privacy")!) {
                HStack {
                    Image(systemName: "hand.raised")
                        .foregroundStyle(.gray)
                        .frame(width: 28)
                    Text("Privacy Policy")
                    Spacer()
                    Image(systemName: "arrow.up.right")
                        .foregroundStyle(.secondary)
                }
            }
            .tint(.primary)
        }
    }

    // MARK: - Sign Out Section

    private var signOutSection: some View {
        Section {
            Button(role: .destructive) {
                showSignOutAlert = true
            } label: {
                HStack {
                    Spacer()
                    Text("Sign Out")
                    Spacer()
                }
            }
        }
    }

    // MARK: - Helpers

    private var biometricName: String {
        // Will be updated async but default to Face ID
        "Face ID"
    }

    private var biometricIcon: String {
        "faceid"
    }
}

// MARK: - Theme Settings

struct ThemeSettingsView: View {
    @AppStorage("userTheme") private var userTheme = "system"

    var body: some View {
        List {
            ForEach(["light", "dark", "system"], id: \.self) { theme in
                Button {
                    userTheme = theme
                } label: {
                    HStack {
                        Text(theme.capitalized)
                        Spacer()
                        if userTheme == theme {
                            Image(systemName: "checkmark")
                                .foregroundStyle(.blue)
                        }
                    }
                }
                .tint(.primary)
            }
        }
        .navigationTitle("Appearance")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Notification Settings

struct NotificationSettingsView: View {
    @AppStorage("budgetAlerts") private var budgetAlerts = true
    @AppStorage("newTransactionAlerts") private var newTransactionAlerts = false
    @AppStorage("weeklyDigest") private var weeklyDigest = true

    var body: some View {
        List {
            Section {
                Toggle("Budget Alerts", isOn: $budgetAlerts)
                Toggle("New Transactions", isOn: $newTransactionAlerts)
                Toggle("Weekly Digest", isOn: $weeklyDigest)
            } footer: {
                Text("Budget alerts notify you when spending approaches your limits")
            }
        }
        .navigationTitle("Notifications")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Language Settings

struct LanguageSettingsView: View {
    @AppStorage("userLanguage") private var userLanguage = "en"

    var body: some View {
        List {
            Button {
                userLanguage = "en"
            } label: {
                HStack {
                    Text("English")
                    Spacer()
                    if userLanguage == "en" {
                        Image(systemName: "checkmark")
                            .foregroundStyle(.blue)
                    }
                }
            }
            .tint(.primary)

            Button {
                userLanguage = "nl"
            } label: {
                HStack {
                    Text("Nederlands")
                    Spacer()
                    if userLanguage == "nl" {
                        Image(systemName: "checkmark")
                            .foregroundStyle(.blue)
                    }
                }
            }
            .tint(.primary)
        }
        .navigationTitle("Language")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Bank Connection Sheet

struct BankConnectionSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var availableBanks: [AvailableBank] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var selectedBank: AvailableBank?
    @State private var isConnecting = false

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView("Loading banks...")
                } else if let error = errorMessage {
                    ContentUnavailableView {
                        Label("Error", systemImage: "exclamationmark.triangle")
                    } description: {
                        Text(error)
                    } actions: {
                        Button("Retry") {
                            Task {
                                await loadBanks()
                            }
                        }
                    }
                } else {
                    banksList
                }
            }
            .navigationTitle("Connect Bank")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .task {
                await loadBanks()
            }
        }
    }

    private var banksList: some View {
        List {
            Section {
                ForEach(availableBanks) { bank in
                    Button {
                        selectedBank = bank
                        Task {
                            await connectBank(bank)
                        }
                    } label: {
                        HStack {
                            // Bank logo placeholder
                            ZStack {
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(Color(.systemGray5))
                                    .frame(width: 44, height: 44)

                                Text(String(bank.name.prefix(2)))
                                    .font(.headline)
                                    .foregroundStyle(.secondary)
                            }

                            VStack(alignment: .leading, spacing: 2) {
                                Text(bank.name)
                                    .font(.headline)

                                if let bic = bank.bic {
                                    Text(bic)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }

                            Spacer()

                            if selectedBank?.id == bank.id && isConnecting {
                                ProgressView()
                            } else {
                                Image(systemName: "chevron.right")
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .disabled(isConnecting)
                    .tint(.primary)
                }
            } header: {
                Text("Available Banks")
            } footer: {
                Text("Select your bank to securely connect via Enable Banking")
            }
        }
    }

    private func loadBanks() async {
        isLoading = true
        errorMessage = nil

        // Simulated bank list - in production this would call BankingService
        try? await Task.sleep(for: .seconds(1))

        availableBanks = [
            AvailableBank(name: "ABN AMRO", country: "NL", logo: nil, bic: "ABNANL2A"),
            AvailableBank(name: "ING", country: "NL", logo: nil, bic: "INGBNL2A"),
            AvailableBank(name: "Rabobank", country: "NL", logo: nil, bic: "RABONL2U")
        ]

        isLoading = false
    }

    private func connectBank(_ bank: AvailableBank) async {
        isConnecting = true

        // This would call BankingService.shared.initBankConnection
        // and open ASWebAuthenticationSession

        try? await Task.sleep(for: .seconds(2))

        isConnecting = false
        dismiss()
    }
}

// MARK: - Preview

#if DEBUG
#Preview {
    SettingsView()
        .environment(AuthViewModel())
}
#endif
