import SwiftUI

/// Forgot password screen for sending reset emails
struct ForgotPasswordView: View {
    @Environment(AuthViewModel.self) private var authViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var email = ""
    @State private var isEmailSent = false
    @FocusState private var isEmailFocused: Bool

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                if isEmailSent {
                    successView
                } else {
                    formView
                }
            }
            .padding(.horizontal, 24)
            .padding(.top, 24)
            .navigationTitle("Reset Password")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }

    // MARK: - Form View

    private var formView: some View {
        VStack(spacing: 24) {
            // Icon
            Image(systemName: "envelope.circle")
                .font(.system(size: 60))
                .foregroundStyle(.tint)

            // Description
            VStack(spacing: 8) {
                Text("Forgot your password?")
                    .font(.title3)
                    .fontWeight(.semibold)

                Text("Enter your email address and we'll send you instructions to reset your password.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            // Email Field
            VStack(spacing: 8) {
                TextField("Email address", text: $email)
                    .textFieldStyle(.plain)
                    .keyboardType(.emailAddress)
                    .textContentType(.emailAddress)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    .focused($isEmailFocused)
                    .padding()
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .onAppear {
                        isEmailFocused = true
                    }

                if let error = authViewModel.errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }

            // Send Button
            Button(action: sendResetEmail) {
                Group {
                    if authViewModel.isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text("Send Reset Link")
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 24)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .disabled(!authViewModel.isValidEmail(email) || authViewModel.isLoading)

            Spacer()
        }
    }

    // MARK: - Success View

    private var successView: some View {
        VStack(spacing: 24) {
            // Success Icon
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 60))
                .foregroundStyle(.green)

            // Message
            VStack(spacing: 8) {
                Text("Check your email")
                    .font(.title3)
                    .fontWeight(.semibold)

                Text("We've sent password reset instructions to:")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Text(email)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text("If you don't see the email, check your spam folder.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.top, 4)
            }

            // Done Button
            Button("Done") {
                dismiss()
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)

            Spacer()
        }
    }

    // MARK: - Helpers

    private func sendResetEmail() {
        isEmailFocused = false

        Task {
            await authViewModel.sendPasswordReset(email: email)
            if authViewModel.errorMessage == nil {
                withAnimation {
                    isEmailSent = true
                }
            }
        }
    }
}

// MARK: - Preview

#if DEBUG
#Preview {
    ForgotPasswordView()
        .environment(AuthViewModel())
}
#endif
