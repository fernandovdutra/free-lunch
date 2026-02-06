import SwiftUI

/// Login screen with email/password and Google sign-in options
struct LoginView: View {
    @Environment(AuthViewModel.self) private var authViewModel
    @State private var email = ""
    @State private var password = ""
    @State private var isShowingRegister = false
    @State private var isShowingForgotPassword = false
    @FocusState private var focusedField: Field?

    private enum Field {
        case email
        case password
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 32) {
                    // Logo & Title
                    headerSection

                    // Login Form
                    formSection

                    // Divider
                    dividerSection

                    // Social Sign In
                    socialSignInSection

                    Spacer(minLength: 24)

                    // Register Link
                    registerSection
                }
                .padding(.horizontal, 24)
                .padding(.top, 48)
            }
            .scrollDismissesKeyboard(.interactively)
            .navigationDestination(isPresented: $isShowingRegister) {
                RegisterView()
            }
            .sheet(isPresented: $isShowingForgotPassword) {
                ForgotPasswordView()
            }
        }
    }

    // MARK: - Header Section

    private var headerSection: some View {
        VStack(spacing: 12) {
            // Logo placeholder - replace with actual logo
            Image(systemName: "fork.knife.circle.fill")
                .resizable()
                .scaledToFit()
                .frame(width: 80, height: 80)
                .foregroundStyle(.tint)

            Text("Free Lunch")
                .font(.largeTitle)
                .fontWeight(.bold)

            Text("Personal Finance Manager")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    // MARK: - Form Section

    private var formSection: some View {
        VStack(spacing: 16) {
            // Email Field
            TextField("Email", text: $email)
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

            // Password Field
            SecureField("Password", text: $password)
                .textFieldStyle(.plain)
                .textContentType(.password)
                .focused($focusedField, equals: .password)
                .padding()
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .submitLabel(.go)
                .onSubmit {
                    signIn()
                }

            // Forgot Password
            HStack {
                Spacer()
                Button("Forgot Password?") {
                    isShowingForgotPassword = true
                }
                .font(.footnote)
                .foregroundStyle(.secondary)
            }

            // Error Message
            if let error = authViewModel.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            // Sign In Button
            Button(action: signIn) {
                Group {
                    if authViewModel.isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text("Sign In")
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 24)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .disabled(!isFormValid || authViewModel.isLoading)
        }
    }

    // MARK: - Divider Section

    private var dividerSection: some View {
        HStack(spacing: 12) {
            Rectangle()
                .frame(height: 1)
                .foregroundStyle(.secondary.opacity(0.3))

            Text("or")
                .font(.caption)
                .foregroundStyle(.secondary)

            Rectangle()
                .frame(height: 1)
                .foregroundStyle(.secondary.opacity(0.3))
        }
    }

    // MARK: - Social Sign In Section

    private var socialSignInSection: some View {
        Button {
            Task {
                await authViewModel.signInWithGoogle()
            }
        } label: {
            HStack(spacing: 12) {
                // Google logo placeholder
                Image(systemName: "g.circle.fill")
                    .font(.title2)
                    .foregroundStyle(.red)

                Text("Continue with Google")
                    .fontWeight(.medium)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 24)
        }
        .buttonStyle(.bordered)
        .controlSize(.large)
        .disabled(authViewModel.isLoading)
    }

    // MARK: - Register Section

    private var registerSection: some View {
        HStack(spacing: 4) {
            Text("Don't have an account?")
                .foregroundStyle(.secondary)

            Button("Sign up") {
                isShowingRegister = true
            }
            .fontWeight(.medium)
        }
        .font(.footnote)
    }

    // MARK: - Helpers

    private var isFormValid: Bool {
        authViewModel.isValidEmail(email) && authViewModel.isValidPassword(password)
    }

    private func signIn() {
        guard isFormValid else { return }
        focusedField = nil

        Task {
            await authViewModel.signIn(email: email, password: password)
        }
    }
}

// MARK: - Preview

#if DEBUG
#Preview {
    LoginView()
        .environment(AuthViewModel())
}
#endif
