import SwiftUI

/// Registration screen for new users
struct RegisterView: View {
    @Environment(AuthViewModel.self) private var authViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var displayName = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @FocusState private var focusedField: Field?

    private enum Field: Hashable {
        case displayName
        case email
        case password
        case confirmPassword
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 32) {
                // Header
                headerSection

                // Form
                formSection

                Spacer(minLength: 24)

                // Login Link
                loginSection
            }
            .padding(.horizontal, 24)
            .padding(.top, 24)
        }
        .scrollDismissesKeyboard(.interactively)
        .navigationTitle("Create Account")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Header Section

    private var headerSection: some View {
        VStack(spacing: 8) {
            Text("Welcome to Free Lunch")
                .font(.title2)
                .fontWeight(.bold)

            Text("Create an account to start tracking your finances")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Form Section

    private var formSection: some View {
        VStack(spacing: 16) {
            // Display Name Field
            VStack(alignment: .leading, spacing: 6) {
                Text("Name")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                TextField("Your name", text: $displayName)
                    .textFieldStyle(.plain)
                    .textContentType(.name)
                    .autocorrectionDisabled()
                    .focused($focusedField, equals: .displayName)
                    .padding()
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .submitLabel(.next)
                    .onSubmit {
                        focusedField = .email
                    }
            }

            // Email Field
            VStack(alignment: .leading, spacing: 6) {
                Text("Email")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                TextField("your@email.com", text: $email)
                    .textFieldStyle(.plain)
                    .keyboardType(.emailAddress)
                    .textContentType(.emailAddress)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    .focused($focusedField, equals: .email)
                    .padding()
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .submitLabel(.next)
                    .onSubmit {
                        focusedField = .password
                    }

                if !email.isEmpty && !authViewModel.isValidEmail(email) {
                    Text("Please enter a valid email address")
                        .font(.caption)
                        .foregroundStyle(.red)
                }
            }

            // Password Field
            VStack(alignment: .leading, spacing: 6) {
                Text("Password")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                SecureField("At least 6 characters", text: $password)
                    .textFieldStyle(.plain)
                    .textContentType(.newPassword)
                    .focused($focusedField, equals: .password)
                    .padding()
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .submitLabel(.next)
                    .onSubmit {
                        focusedField = .confirmPassword
                    }

                if !password.isEmpty && !authViewModel.isValidPassword(password) {
                    Text("Password must be at least 6 characters")
                        .font(.caption)
                        .foregroundStyle(.red)
                }
            }

            // Confirm Password Field
            VStack(alignment: .leading, spacing: 6) {
                Text("Confirm Password")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                SecureField("Re-enter your password", text: $confirmPassword)
                    .textFieldStyle(.plain)
                    .textContentType(.newPassword)
                    .focused($focusedField, equals: .confirmPassword)
                    .padding()
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .submitLabel(.go)
                    .onSubmit {
                        signUp()
                    }

                if !confirmPassword.isEmpty && password != confirmPassword {
                    Text("Passwords do not match")
                        .font(.caption)
                        .foregroundStyle(.red)
                }
            }

            // Error Message
            if let error = authViewModel.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            // Sign Up Button
            Button(action: signUp) {
                Group {
                    if authViewModel.isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text("Create Account")
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 24)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .disabled(!isFormValid || authViewModel.isLoading)
            .padding(.top, 8)

            // Terms
            Text("By creating an account, you agree to our Terms of Service and Privacy Policy")
                .font(.caption2)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Login Section

    private var loginSection: some View {
        HStack(spacing: 4) {
            Text("Already have an account?")
                .foregroundStyle(.secondary)

            Button("Sign in") {
                dismiss()
            }
            .fontWeight(.medium)
        }
        .font(.footnote)
    }

    // MARK: - Helpers

    private var isFormValid: Bool {
        !displayName.isEmpty &&
        authViewModel.isValidEmail(email) &&
        authViewModel.isValidPassword(password) &&
        password == confirmPassword
    }

    private func signUp() {
        guard isFormValid else { return }
        focusedField = nil

        Task {
            await authViewModel.signUp(email: email, password: password, displayName: displayName)
        }
    }
}

// MARK: - Preview

#if DEBUG
#Preview {
    NavigationStack {
        RegisterView()
            .environment(AuthViewModel())
    }
}
#endif
