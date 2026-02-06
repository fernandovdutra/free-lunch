# Feature: Free Lunch iOS App

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Native SwiftUI iOS app for Free Lunch personal finance management. The app will provide full feature parity with the web app (minus transaction splits and complex reimbursements for MVP), using Firebase Auth and Firestore directly. Includes home screen widgets, push notifications, and optional biometric lock.

## User Story

As a Free Lunch user
I want to manage my finances from my iPhone
So that I can categorize transactions, track budgets, and monitor spending on the go

## Problem Statement

The Free Lunch web app provides comprehensive personal finance tracking, but users need mobile access for quick transaction categorization, spending checks, and real-time notifications when they're away from their computer.

## Solution Statement

Build a native SwiftUI iOS app that connects to the existing Firebase backend, providing the same data and functionality as the web app with iOS-native UX patterns (tab bar navigation, swipe actions, widgets).

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High
**Primary Systems Affected**: New iOS app, Firebase Auth, Firestore, Cloud Functions
**Dependencies**: Firebase iOS SDK, Swift Charts, WidgetKit, ASWebAuthenticationSession

---

## CONTEXT REFERENCES

### Relevant Codebase Files - MUST READ BEFORE IMPLEMENTING

| File | Purpose |
|------|---------|
| `src/types/index.ts` | All TypeScript types - convert to Swift models |
| `firestore.rules` | Security rules and collection structure |
| `functions/src/handlers/syncTransactions.ts` | Transaction sync and transformation logic |
| `functions/src/handlers/initBankConnection.ts` | Bank OAuth flow initiation |
| `functions/src/handlers/bankCallback.ts` | Bank OAuth callback handling |
| `functions/src/categorization/categorizer.ts` | Auto-categorization logic |
| `src/contexts/AuthContext.tsx` | Auth state management pattern |
| `src/contexts/MonthContext.tsx` | Month/date range filtering pattern |
| `src/hooks/useTransactions.ts` | Transaction queries and mutations |
| `src/hooks/useCategories.ts` | Category hierarchy building |
| `src/hooks/useBudgets.ts` | Budget CRUD operations |
| `src/hooks/useBankConnection.ts` | Bank connection and sync |
| `src/components/dashboard/SummaryCards.tsx` | Dashboard summary calculations |

### New Files to Create

```
/ios/
├── FreeLunch/
│   ├── App/
│   │   ├── FreeLunchApp.swift
│   │   └── AppDelegate.swift
│   ├── Core/
│   │   ├── Firebase/
│   │   │   ├── FirebaseManager.swift
│   │   │   ├── AuthService.swift
│   │   │   └── FirestoreService.swift
│   │   ├── Networking/
│   │   │   └── BankingService.swift
│   │   └── Biometrics/
│   │       └── BiometricService.swift
│   ├── Models/
│   │   ├── User.swift
│   │   ├── Transaction.swift
│   │   ├── Category.swift
│   │   ├── Budget.swift
│   │   ├── Rule.swift
│   │   └── BankConnection.swift
│   ├── ViewModels/
│   │   ├── AuthViewModel.swift
│   │   ├── DashboardViewModel.swift
│   │   ├── TransactionsViewModel.swift
│   │   ├── CategoriesViewModel.swift
│   │   ├── BudgetsViewModel.swift
│   │   └── SettingsViewModel.swift
│   ├── Views/
│   │   ├── Auth/
│   │   ├── Dashboard/
│   │   ├── Transactions/
│   │   ├── Categories/
│   │   ├── Budgets/
│   │   ├── Settings/
│   │   └── Components/
│   ├── Extensions/
│   └── Resources/
├── FreeLunchWidgets/
├── FreeLunchTests/
└── FreeLunchUITests/
```

### Relevant Documentation - READ BEFORE IMPLEMENTING

| Documentation | Why |
|---------------|-----|
| [Firebase iOS Setup](https://firebase.google.com/docs/ios/setup) | SDK installation and configuration |
| [Firebase Auth iOS](https://firebase.google.com/docs/auth/ios/start) | Email/password and Google sign-in |
| [Firestore iOS](https://firebase.google.com/docs/firestore/query-data/listen) | Real-time listeners and Codable |
| [Swift Charts](https://developer.apple.com/documentation/Charts) | Pie and bar chart implementation |
| [WidgetKit](https://developer.apple.com/documentation/widgetkit/timelineprovider) | Widget timeline and data sharing |
| [ASWebAuthenticationSession](https://developer.apple.com/documentation/authenticationservices/aswebauthenticationsession) | Bank OAuth flow |
| [FCM iOS](https://firebase.google.com/docs/cloud-messaging/ios/client) | Push notification setup |

### Patterns to Follow

**Firestore Collection Structure (user-scoped)**:
```
/users/{userId}/
├── transactions/{transactionId}
├── categories/{categoryId}
├── budgets/{budgetId}
├── rules/{ruleId}
├── bankConnections/{connectionId}
└── rawBankTransactions/{rawId}
```

**Amount Convention**:
- Negative = expense
- Positive = income
- Pending reimbursements excluded from spending summaries

**Category Hierarchy**:
- Flat storage with `parentId` references
- Tree built client-side using `buildCategoryTree()` pattern
- Children indented in picker UI

**Month Filtering**:
- All views filter by selected month's date range
- `startDate` = first day of month, `endDate` = last day of month

---

## IMPLEMENTATION PLAN

### Phase 1: Project Setup & Foundation

Set up Xcode project, Firebase SDK, and core infrastructure.

**Tasks:**
- Create Xcode project with SwiftUI lifecycle
- Add Firebase SDK via Swift Package Manager
- Configure Firebase with GoogleService-Info.plist
- Set up project folder structure
- Create base Swift models matching Firestore schema
- Implement FirestoreService with generic CRUD

### Phase 2: Authentication

Implement sign-in, registration, and session management.

**Tasks:**
- Create AuthViewModel with @Observable
- Implement email/password sign-in and registration
- Add Google Sign-In integration
- Set up auth state listener
- Create login and registration views
- Implement biometric lock (optional setting)

### Phase 3: Core Data Layer

Implement ViewModels for all data types with Firestore listeners.

**Tasks:**
- TransactionsViewModel with real-time listener
- CategoriesViewModel with hierarchy building
- BudgetsViewModel with progress calculation
- Implement date range filtering (MonthContext equivalent)

### Phase 4: Main App Views

Build all tab views with navigation.

**Tasks:**
- Tab bar with 5 tabs (Dashboard, Transactions, Categories, Budgets, Settings)
- Dashboard with summary cards and charts
- Transactions list with swipe actions
- Category management with hierarchy
- Budget cards with progress bars
- Settings with bank connection

### Phase 5: Bank Integration

Implement Enable Banking OAuth flow via Cloud Functions.

**Tasks:**
- ASWebAuthenticationSession for bank OAuth
- Deep link handling for callback
- Bank status display
- Manual sync trigger
- Connection management

### Phase 6: iOS-Specific Features

Add widgets, push notifications, and polish.

**Tasks:**
- WidgetKit extension with 3 widget types
- App group for widget data sharing
- Push notification setup (APNs + FCM)
- Notification handling and deep linking

### Phase 7: Testing & Polish

Comprehensive testing and UI polish.

**Tasks:**
- Unit tests for ViewModels
- UI tests for critical flows
- Loading states and skeletons
- Error handling UI
- Haptic feedback

---

## STEP-BY-STEP TASKS

### Phase 1: Project Setup

#### 1.1 CREATE Xcode Project

- **IMPLEMENT**: Create new Xcode project
  - Product Name: `FreeLunch`
  - Interface: SwiftUI
  - Language: Swift
  - Minimum iOS: 17.0
  - Include Tests: Yes
- **VALIDATE**: Project builds and runs on simulator

#### 1.2 ADD Firebase SDK Dependencies

- **IMPLEMENT**: File > Add Package Dependencies
  - URL: `https://github.com/firebase/firebase-ios-sdk`
  - Version: 10.0.0+
  - Products: FirebaseAuth, FirebaseFirestore, FirebaseMessaging, FirebaseFunctions
- **IMPLEMENT**: Add GoogleSignIn SDK
  - URL: `https://github.com/google/GoogleSignIn-iOS`
  - Version: 7.0.0+
- **VALIDATE**: `import FirebaseCore` compiles

#### 1.3 UPDATE Info.plist Configuration

- **IMPLEMENT**: Add to Info.plist:
  ```xml
  <key>FirebaseAppDelegateProxyEnabled</key>
  <false/>
  ```
- **IMPLEMENT**: Add URL schemes for OAuth callbacks:
  ```xml
  <key>CFBundleURLTypes</key>
  <array>
    <dict>
      <key>CFBundleURLSchemes</key>
      <array>
        <string>freelunch</string>
        <string>com.googleusercontent.apps.YOUR_CLIENT_ID</string>
      </array>
    </dict>
  </array>
  ```
- **VALIDATE**: Build succeeds with new plist entries

#### 1.4 CREATE AppDelegate.swift

- **IMPLEMENT**: Create `FreeLunch/App/AppDelegate.swift`:
  ```swift
  import UIKit
  import FirebaseCore
  import FirebaseMessaging

  class AppDelegate: NSObject, UIApplicationDelegate {
      func application(
          _ application: UIApplication,
          didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
      ) -> Bool {
          FirebaseApp.configure()
          return true
      }

      func application(
          _ application: UIApplication,
          didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
      ) {
          Messaging.messaging().apnsToken = deviceToken
      }
  }
  ```
- **PATTERN**: Web app initializes Firebase in `src/lib/firebase.ts`
- **VALIDATE**: App launches without Firebase configuration errors

#### 1.5 UPDATE FreeLunchApp.swift

- **IMPLEMENT**: Update `FreeLunch/App/FreeLunchApp.swift`:
  ```swift
  import SwiftUI

  @main
  struct FreeLunchApp: App {
      @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate
      @State private var authViewModel = AuthViewModel()

      var body: some Scene {
          WindowGroup {
              ContentView()
                  .environment(authViewModel)
          }
      }
  }
  ```
- **VALIDATE**: App runs with Firebase initialized

#### 1.6 CREATE Swift Models

- **IMPLEMENT**: Create `FreeLunch/Models/Transaction.swift`:
  ```swift
  import FirebaseFirestore

  struct Transaction: Identifiable, Codable {
      @DocumentID var id: String?
      var externalId: String?
      var date: Date
      var bookingDate: Date?
      var transactionDate: Date?
      var description: String
      var amount: Double
      var currency: String = "EUR"
      var counterparty: String?
      var categoryId: String?
      var categoryConfidence: Double?
      var categorySource: CategorySource?
      var isSplit: Bool = false
      var splits: [TransactionSplit]?
      var reimbursement: ReimbursementInfo?
      var bankAccountId: String?
      var bankConnectionId: String?
      var status: String?
      var importedAt: Date?
      var updatedAt: Date?
  }

  enum CategorySource: String, Codable {
      case auto, manual, rule, merchant, learned, none
  }

  struct TransactionSplit: Codable {
      var amount: Double
      var categoryId: String
      var note: String?
  }

  struct ReimbursementInfo: Codable {
      var type: ReimbursementType
      var note: String?
      var status: ReimbursementStatus
      var linkedTransactionId: String?
      var clearedAt: Date?
  }

  enum ReimbursementType: String, Codable {
      case work, personal
  }

  enum ReimbursementStatus: String, Codable {
      case pending, cleared
  }
  ```
- **MIRROR**: `src/types/index.ts` Transaction interface
- **VALIDATE**: Model compiles with Codable conformance

- **IMPLEMENT**: Create `FreeLunch/Models/Category.swift`:
  ```swift
  import FirebaseFirestore

  struct Category: Identifiable, Codable {
      @DocumentID var id: String?
      var name: String
      var icon: String
      var color: String
      var parentId: String?
      var order: Int
      var isSystem: Bool = false
      var createdAt: Date?
      var updatedAt: Date?
  }

  struct CategoryWithChildren: Identifiable {
      var id: String { category.id ?? UUID().uuidString }
      var category: Category
      var children: [CategoryWithChildren]
      var level: Int = 0
  }
  ```
- **MIRROR**: `src/types/index.ts` Category interface
- **VALIDATE**: Model compiles

- **IMPLEMENT**: Create `FreeLunch/Models/Budget.swift`:
  ```swift
  import FirebaseFirestore

  struct Budget: Identifiable, Codable {
      @DocumentID var id: String?
      var name: String
      var categoryId: String
      var monthlyLimit: Double
      var alertThreshold: Double = 80
      var isActive: Bool = true
      var createdAt: Date?
      var updatedAt: Date?
  }

  struct BudgetProgress: Identifiable {
      var id: String { budget.id ?? UUID().uuidString }
      var budget: Budget
      var categoryName: String
      var categoryIcon: String
      var categoryColor: String
      var spent: Double
      var remaining: Double
      var percentage: Double
      var status: BudgetStatus
  }

  enum BudgetStatus: String {
      case safe, warning, exceeded
  }
  ```
- **VALIDATE**: Model compiles

- **IMPLEMENT**: Create `FreeLunch/Models/BankConnection.swift`:
  ```swift
  import FirebaseFirestore

  struct BankConnection: Identifiable, Codable {
      @DocumentID var id: String?
      var provider: String = "enable_banking"
      var bankId: String
      var bankName: String
      var status: ConnectionStatus
      var lastSync: Date?
      var consentExpiresAt: Date?
      var accounts: [BankAccount]
      var accountBalances: [String: AccountBalance]?
      var createdAt: Date?
      var updatedAt: Date?
  }

  enum ConnectionStatus: String, Codable {
      case active, expired, error
  }

  struct BankAccount: Codable {
      var uid: String
      var iban: String
      var name: String?
      var currency: String
  }

  struct AccountBalance: Codable {
      var amount: Double
      var currency: String
      var type: String
      var referenceDate: String?
      var updatedAt: Date?
  }
  ```
- **VALIDATE**: All models compile

#### 1.7 CREATE FirestoreService

- **IMPLEMENT**: Create `FreeLunch/Core/Firebase/FirestoreService.swift`:
  ```swift
  import FirebaseFirestore
  import FirebaseAuth

  actor FirestoreService {
      static let shared = FirestoreService()
      private let db = Firestore.firestore()

      private var userId: String? {
          Auth.auth().currentUser?.uid
      }

      private func userCollection(_ collection: String) -> CollectionReference? {
          guard let userId else { return nil }
          return db.collection("users").document(userId).collection(collection)
      }

      // MARK: - Transactions

      func transactionsListener(
          dateRange: ClosedRange<Date>,
          onChange: @escaping ([Transaction]) -> Void
      ) -> ListenerRegistration? {
          guard let collection = userCollection("transactions") else { return nil }

          return collection
              .whereField("date", isGreaterThanOrEqualTo: Timestamp(date: dateRange.lowerBound))
              .whereField("date", isLessThanOrEqualTo: Timestamp(date: dateRange.upperBound))
              .order(by: "date", descending: true)
              .addSnapshotListener { snapshot, error in
                  guard let documents = snapshot?.documents else { return }
                  let transactions = documents.compactMap { doc -> Transaction? in
                      try? doc.data(as: Transaction.self)
                  }
                  onChange(transactions)
              }
      }

      func updateTransaction(_ transaction: Transaction) async throws {
          guard let collection = userCollection("transactions"),
                let id = transaction.id else { return }
          try collection.document(id).setData(from: transaction, merge: true)
      }

      // MARK: - Categories

      func categoriesListener(
          onChange: @escaping ([Category]) -> Void
      ) -> ListenerRegistration? {
          guard let collection = userCollection("categories") else { return nil }

          return collection
              .order(by: "order")
              .addSnapshotListener { snapshot, error in
                  guard let documents = snapshot?.documents else { return }
                  let categories = documents.compactMap { doc -> Category? in
                      try? doc.data(as: Category.self)
                  }
                  onChange(categories)
              }
      }

      func createCategory(_ category: Category) async throws {
          guard let collection = userCollection("categories") else { return }
          try collection.addDocument(from: category)
      }

      func updateCategory(_ category: Category) async throws {
          guard let collection = userCollection("categories"),
                let id = category.id else { return }
          try collection.document(id).setData(from: category, merge: true)
      }

      func deleteCategory(_ categoryId: String) async throws {
          guard let collection = userCollection("categories") else { return }
          try await collection.document(categoryId).delete()
      }

      // MARK: - Budgets

      func budgetsListener(
          onChange: @escaping ([Budget]) -> Void
      ) -> ListenerRegistration? {
          guard let collection = userCollection("budgets") else { return nil }

          return collection
              .whereField("isActive", isEqualTo: true)
              .addSnapshotListener { snapshot, error in
                  guard let documents = snapshot?.documents else { return }
                  let budgets = documents.compactMap { doc -> Budget? in
                      try? doc.data(as: Budget.self)
                  }
                  onChange(budgets)
              }
      }

      func createBudget(_ budget: Budget) async throws {
          guard let collection = userCollection("budgets") else { return }
          try collection.addDocument(from: budget)
      }

      func updateBudget(_ budget: Budget) async throws {
          guard let collection = userCollection("budgets"),
                let id = budget.id else { return }
          try collection.document(id).setData(from: budget, merge: true)
      }

      func deleteBudget(_ budgetId: String) async throws {
          guard let collection = userCollection("budgets") else { return }
          try await collection.document(budgetId).delete()
      }

      // MARK: - Bank Connections

      func bankConnectionsListener(
          onChange: @escaping ([BankConnection]) -> Void
      ) -> ListenerRegistration? {
          guard let collection = userCollection("bankConnections") else { return nil }

          return collection
              .addSnapshotListener { snapshot, error in
                  guard let documents = snapshot?.documents else { return }
                  let connections = documents.compactMap { doc -> BankConnection? in
                      try? doc.data(as: BankConnection.self)
                  }
                  onChange(connections)
              }
      }
  }
  ```
- **PATTERN**: `src/hooks/useTransactions.ts` query patterns
- **VALIDATE**: Service compiles

---

### Phase 2: Authentication

#### 2.1 CREATE AuthViewModel

- **IMPLEMENT**: Create `FreeLunch/ViewModels/AuthViewModel.swift`:
  ```swift
  import Observation
  import FirebaseAuth
  import GoogleSignIn
  import FirebaseCore

  @Observable
  final class AuthViewModel {
      var currentUser: User?
      var authState: AuthState = .loading
      var errorMessage: String?

      enum AuthState {
          case loading
          case unauthenticated
          case authenticated
      }

      private var authStateListener: AuthStateDidChangeListenerHandle?

      init() {
          setupAuthStateListener()
      }

      private func setupAuthStateListener() {
          authStateListener = Auth.auth().addStateDidChangeListener { [weak self] _, user in
              self?.currentUser = user
              self?.authState = user != nil ? .authenticated : .unauthenticated
          }
      }

      func signIn(email: String, password: String) async {
          do {
              let result = try await Auth.auth().signIn(withEmail: email, password: password)
              currentUser = result.user
              authState = .authenticated
          } catch {
              errorMessage = error.localizedDescription
          }
      }

      func signUp(email: String, password: String, displayName: String) async {
          do {
              let result = try await Auth.auth().createUser(withEmail: email, password: password)

              let changeRequest = result.user.createProfileChangeRequest()
              changeRequest.displayName = displayName
              try await changeRequest.commitChanges()

              currentUser = Auth.auth().currentUser
              authState = .authenticated

              // Create default categories for new user
              await createDefaultCategories()
          } catch {
              errorMessage = error.localizedDescription
          }
      }

      func signInWithGoogle() async {
          guard let clientID = FirebaseApp.app()?.options.clientID,
                let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                let rootViewController = windowScene.windows.first?.rootViewController else {
              return
          }

          let config = GIDConfiguration(clientID: clientID)
          GIDSignIn.sharedInstance.configuration = config

          do {
              let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: rootViewController)

              guard let idToken = result.user.idToken?.tokenString else { return }
              let accessToken = result.user.accessToken.tokenString

              let credential = GoogleAuthProvider.credential(
                  withIDToken: idToken,
                  accessToken: accessToken
              )

              let authResult = try await Auth.auth().signIn(with: credential)
              currentUser = authResult.user
              authState = .authenticated
          } catch {
              errorMessage = error.localizedDescription
          }
      }

      func signOut() {
          do {
              try Auth.auth().signOut()
              GIDSignIn.sharedInstance.signOut()
              currentUser = nil
              authState = .unauthenticated
          } catch {
              errorMessage = error.localizedDescription
          }
      }

      private func createDefaultCategories() async {
          // Create default categories matching web app
          // See src/types/index.ts DEFAULT_CATEGORIES
      }

      deinit {
          if let handle = authStateListener {
              Auth.auth().removeStateDidChangeListener(handle)
          }
      }
  }
  ```
- **PATTERN**: `src/contexts/AuthContext.tsx` auth state management
- **VALIDATE**: ViewModel compiles

#### 2.2 CREATE LoginView

- **IMPLEMENT**: Create `FreeLunch/Views/Auth/LoginView.swift`:
  ```swift
  import SwiftUI

  struct LoginView: View {
      @Environment(AuthViewModel.self) private var authViewModel
      @State private var email = ""
      @State private var password = ""
      @State private var isShowingRegister = false

      var body: some View {
          NavigationStack {
              VStack(spacing: 24) {
                  // Logo
                  Image("logo")
                      .resizable()
                      .scaledToFit()
                      .frame(height: 80)

                  Text("Free Lunch")
                      .font(.largeTitle)
                      .fontWeight(.bold)

                  Text("Personal Finance Manager")
                      .font(.subheadline)
                      .foregroundStyle(.secondary)

                  // Form
                  VStack(spacing: 16) {
                      TextField("Email", text: $email)
                          .textFieldStyle(.roundedBorder)
                          .textContentType(.emailAddress)
                          .autocapitalization(.none)

                      SecureField("Password", text: $password)
                          .textFieldStyle(.roundedBorder)
                          .textContentType(.password)

                      if let error = authViewModel.errorMessage {
                          Text(error)
                              .font(.caption)
                              .foregroundStyle(.red)
                      }

                      Button("Sign In") {
                          Task {
                              await authViewModel.signIn(email: email, password: password)
                          }
                      }
                      .buttonStyle(.borderedProminent)
                      .disabled(email.isEmpty || password.isEmpty)
                  }
                  .padding()

                  // Divider
                  HStack {
                      Rectangle().frame(height: 1).foregroundStyle(.secondary.opacity(0.3))
                      Text("or")
                          .font(.caption)
                          .foregroundStyle(.secondary)
                      Rectangle().frame(height: 1).foregroundStyle(.secondary.opacity(0.3))
                  }
                  .padding(.horizontal)

                  // Google Sign In
                  Button {
                      Task {
                          await authViewModel.signInWithGoogle()
                      }
                  } label: {
                      HStack {
                          Image("google-logo")
                              .resizable()
                              .frame(width: 20, height: 20)
                          Text("Continue with Google")
                      }
                  }
                  .buttonStyle(.bordered)

                  Spacer()

                  // Register link
                  Button("Don't have an account? Sign up") {
                      isShowingRegister = true
                  }
                  .font(.footnote)
              }
              .padding()
              .navigationDestination(isPresented: $isShowingRegister) {
                  RegisterView()
              }
          }
      }
  }
  ```
- **PATTERN**: `src/pages/auth/Login.tsx` layout
- **VALIDATE**: View renders in preview

#### 2.3 CREATE RegisterView

- **IMPLEMENT**: Create `FreeLunch/Views/Auth/RegisterView.swift` with similar pattern
- **VALIDATE**: View renders and navigation works

#### 2.4 CREATE BiometricService

- **IMPLEMENT**: Create `FreeLunch/Core/Biometrics/BiometricService.swift`:
  ```swift
  import LocalAuthentication

  actor BiometricService {
      static let shared = BiometricService()

      enum BiometricType {
          case none, touchID, faceID
      }

      func biometricType() -> BiometricType {
          let context = LAContext()
          var error: NSError?

          guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
              return .none
          }

          switch context.biometryType {
          case .touchID: return .touchID
          case .faceID: return .faceID
          default: return .none
          }
      }

      func authenticate(reason: String) async -> Bool {
          let context = LAContext()
          var error: NSError?

          guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
              return false
          }

          do {
              return try await context.evaluatePolicy(
                  .deviceOwnerAuthenticationWithBiometrics,
                  localizedReason: reason
              )
          } catch {
              return false
          }
      }
  }
  ```
- **VALIDATE**: Service compiles

---

### Phase 3: Core Data Layer

#### 3.1 CREATE MonthContext Equivalent

- **IMPLEMENT**: Create `FreeLunch/ViewModels/MonthViewModel.swift`:
  ```swift
  import Observation
  import Foundation

  @Observable
  final class MonthViewModel {
      var selectedMonth: Date

      var dateRange: ClosedRange<Date> {
          let calendar = Calendar.current
          let start = calendar.date(from: calendar.dateComponents([.year, .month], from: selectedMonth))!
          let end = calendar.date(byAdding: DateComponents(month: 1, day: -1), to: start)!
          return start...end
      }

      var isCurrentMonth: Bool {
          Calendar.current.isDate(selectedMonth, equalTo: Date(), toGranularity: .month)
      }

      var monthDisplayString: String {
          let formatter = DateFormatter()
          formatter.dateFormat = "MMMM yyyy"
          return formatter.string(from: selectedMonth)
      }

      init() {
          self.selectedMonth = Calendar.current.date(from: Calendar.current.dateComponents([.year, .month], from: Date()))!
      }

      func goToNextMonth() {
          selectedMonth = Calendar.current.date(byAdding: .month, value: 1, to: selectedMonth)!
      }

      func goToPreviousMonth() {
          selectedMonth = Calendar.current.date(byAdding: .month, value: -1, to: selectedMonth)!
      }

      func goToCurrentMonth() {
          selectedMonth = Calendar.current.date(from: Calendar.current.dateComponents([.year, .month], from: Date()))!
      }
  }
  ```
- **PATTERN**: `src/contexts/MonthContext.tsx`
- **VALIDATE**: Date range calculations work correctly

#### 3.2 CREATE TransactionsViewModel

- **IMPLEMENT**: Create `FreeLunch/ViewModels/TransactionsViewModel.swift`:
  ```swift
  import Observation
  import FirebaseFirestore

  @Observable
  final class TransactionsViewModel {
      var transactions: [Transaction] = []
      var isLoading = false
      var errorMessage: String?

      // Filters
      var searchText = ""
      var selectedCategoryId: String?
      var selectedDirection: TransactionDirection = .all
      var selectedReimbursementStatus: ReimbursementFilter = .all

      enum TransactionDirection {
          case all, income, expense
      }

      enum ReimbursementFilter {
          case all, none, pending, cleared
      }

      var filteredTransactions: [Transaction] {
          transactions.filter { transaction in
              // Search filter
              if !searchText.isEmpty {
                  let searchLower = searchText.lowercased()
                  let matchesDescription = transaction.description.lowercased().contains(searchLower)
                  let matchesCounterparty = transaction.counterparty?.lowercased().contains(searchLower) ?? false
                  if !matchesDescription && !matchesCounterparty {
                      return false
                  }
              }

              // Category filter
              if let categoryId = selectedCategoryId {
                  if categoryId == "uncategorized" {
                      if transaction.categoryId != nil { return false }
                  } else if transaction.categoryId != categoryId {
                      return false
                  }
              }

              // Direction filter
              switch selectedDirection {
              case .income:
                  if transaction.amount < 0 { return false }
              case .expense:
                  if transaction.amount >= 0 { return false }
              case .all:
                  break
              }

              // Reimbursement filter
              switch selectedReimbursementStatus {
              case .none:
                  if transaction.reimbursement != nil { return false }
              case .pending:
                  if transaction.reimbursement?.status != .pending { return false }
              case .cleared:
                  if transaction.reimbursement?.status != .cleared { return false }
              case .all:
                  break
              }

              return true
          }
      }

      private var listener: ListenerRegistration?

      func startListening(dateRange: ClosedRange<Date>) {
          isLoading = true
          listener = FirestoreService.shared.transactionsListener(dateRange: dateRange) { [weak self] transactions in
              self?.transactions = transactions
              self?.isLoading = false
          }
      }

      func stopListening() {
          listener?.remove()
          listener = nil
      }

      func updateCategory(transactionId: String, categoryId: String?) async {
          guard var transaction = transactions.first(where: { $0.id == transactionId }) else { return }
          transaction.categoryId = categoryId
          transaction.categorySource = .manual
          transaction.updatedAt = Date()

          do {
              try await FirestoreService.shared.updateTransaction(transaction)
          } catch {
              errorMessage = error.localizedDescription
          }
      }

      func markAsReimbursable(transactionId: String, type: ReimbursementType, note: String?) async {
          guard var transaction = transactions.first(where: { $0.id == transactionId }) else { return }
          transaction.reimbursement = ReimbursementInfo(
              type: type,
              note: note,
              status: .pending,
              linkedTransactionId: nil,
              clearedAt: nil
          )
          transaction.updatedAt = Date()

          do {
              try await FirestoreService.shared.updateTransaction(transaction)
          } catch {
              errorMessage = error.localizedDescription
          }
      }

      deinit {
          stopListening()
      }
  }
  ```
- **PATTERN**: `src/hooks/useTransactions.ts`
- **VALIDATE**: ViewModel compiles

#### 3.3 CREATE CategoriesViewModel

- **IMPLEMENT**: Create `FreeLunch/ViewModels/CategoriesViewModel.swift` with hierarchy building
- **PATTERN**: `src/hooks/useCategories.ts` buildCategoryTree function
- **VALIDATE**: Tree structure builds correctly

#### 3.4 CREATE BudgetsViewModel

- **IMPLEMENT**: Create `FreeLunch/ViewModels/BudgetsViewModel.swift` with progress calculation
- **PATTERN**: `src/hooks/useBudgetProgress.ts`
- **VALIDATE**: Budget progress calculates correctly

#### 3.5 CREATE DashboardViewModel

- **IMPLEMENT**: Create `FreeLunch/ViewModels/DashboardViewModel.swift`:
  ```swift
  import Observation

  @Observable
  final class DashboardViewModel {
      var transactions: [Transaction] = []
      var categories: [Category] = []
      var budgets: [Budget] = []
      var isLoading = false

      // Computed summaries
      var totalIncome: Double {
          transactions
              .filter { $0.amount > 0 && $0.reimbursement?.status != .pending }
              .reduce(0) { $0 + $1.amount }
      }

      var totalExpenses: Double {
          transactions
              .filter { $0.amount < 0 && $0.reimbursement?.status != .pending }
              .reduce(0) { $0 + abs($1.amount) }
      }

      var netBalance: Double {
          totalIncome - totalExpenses
      }

      var pendingReimbursements: Double {
          transactions
              .filter { $0.amount < 0 && $0.reimbursement?.status == .pending }
              .reduce(0) { $0 + abs($1.amount) }
      }

      var pendingReimbursementsCount: Int {
          transactions.filter { $0.reimbursement?.status == .pending }.count
      }

      var recentTransactions: [Transaction] {
          Array(transactions.prefix(5))
      }

      var spendingByCategory: [(category: Category, amount: Double, percentage: Double)] {
          let expenses = transactions.filter { $0.amount < 0 && $0.reimbursement?.status != .pending }
          var categorySpending: [String: Double] = [:]

          for transaction in expenses {
              let categoryId = transaction.categoryId ?? "uncategorized"
              categorySpending[categoryId, default: 0] += abs(transaction.amount)
          }

          let totalExpenses = categorySpending.values.reduce(0, +)

          return categorySpending.compactMap { (categoryId, amount) in
              guard let category = categories.first(where: { $0.id == categoryId }) else { return nil }
              return (category, amount, totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0)
          }
          .sorted { $0.amount > $1.amount }
      }
  }
  ```
- **PATTERN**: `src/hooks/useDashboardData.ts`
- **VALIDATE**: Summary calculations match web app logic

---

### Phase 4: Main App Views

#### 4.1 CREATE ContentView with Tab Bar

- **IMPLEMENT**: Create `FreeLunch/Views/ContentView.swift`:
  ```swift
  import SwiftUI

  struct ContentView: View {
      @Environment(AuthViewModel.self) private var authViewModel
      @State private var selectedTab = 0
      @State private var monthViewModel = MonthViewModel()

      var body: some View {
          Group {
              switch authViewModel.authState {
              case .loading:
                  ProgressView()
              case .unauthenticated:
                  LoginView()
              case .authenticated:
                  MainTabView(selectedTab: $selectedTab)
                      .environment(monthViewModel)
              }
          }
      }
  }

  struct MainTabView: View {
      @Binding var selectedTab: Int

      var body: some View {
          TabView(selection: $selectedTab) {
              DashboardView()
                  .tabItem {
                      Label("Dashboard", systemImage: "chart.pie")
                  }
                  .tag(0)

              TransactionsView()
                  .tabItem {
                      Label("Transactions", systemImage: "list.bullet")
                  }
                  .tag(1)

              CategoriesView()
                  .tabItem {
                      Label("Categories", systemImage: "folder")
                  }
                  .tag(2)

              BudgetsView()
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
      }
  }
  ```
- **VALIDATE**: Tab bar renders with all tabs

#### 4.2 CREATE DashboardView

- **IMPLEMENT**: Create `FreeLunch/Views/Dashboard/DashboardView.swift` with:
  - MonthSelector at top
  - SummaryCards (4 cards: Income, Expenses, Net, Pending Reimbursements)
  - SpendingByCategoryChart (pie chart using Swift Charts)
  - SpendingOverTimeChart (bar chart)
  - RecentTransactions list
- **PATTERN**: `src/pages/Dashboard.tsx` and `src/components/dashboard/`
- **VALIDATE**: Dashboard renders with mock data

#### 4.3 CREATE SpendingByCategoryChart

- **IMPLEMENT**: Create `FreeLunch/Views/Dashboard/SpendingByCategoryChart.swift`:
  ```swift
  import SwiftUI
  import Charts

  struct SpendingByCategoryChart: View {
      let data: [(category: Category, amount: Double, percentage: Double)]
      @State private var selectedCategory: String?

      var body: some View {
          VStack(alignment: .leading, spacing: 12) {
              Text("Spending by Category")
                  .font(.headline)

              Chart(data, id: \.category.id) { item in
                  SectorMark(
                      angle: .value("Amount", item.amount),
                      innerRadius: .ratio(0.6),
                      angularInset: 1.5
                  )
                  .foregroundStyle(Color(hex: item.category.color) ?? .gray)
                  .opacity(selectedCategory == nil || selectedCategory == item.category.id ? 1 : 0.5)
              }
              .frame(height: 200)
              .chartAngleSelection(value: $selectedCategory)

              // Legend
              LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                  ForEach(data.prefix(6), id: \.category.id) { item in
                      HStack(spacing: 4) {
                          Circle()
                              .fill(Color(hex: item.category.color) ?? .gray)
                              .frame(width: 8, height: 8)
                          Text(item.category.icon)
                              .font(.caption)
                          Text(item.category.name)
                              .font(.caption)
                              .lineLimit(1)
                          Spacer()
                          Text(item.amount.currencyFormatted)
                              .font(.caption)
                              .fontWeight(.medium)
                      }
                  }
              }
          }
          .padding()
          .background(Color(.systemBackground))
          .clipShape(RoundedRectangle(cornerRadius: 12))
          .shadow(radius: 2)
      }
  }
  ```
- **VALIDATE**: Chart renders with sample data

#### 4.4 CREATE TransactionsView

- **IMPLEMENT**: Create `FreeLunch/Views/Transactions/TransactionsView.swift` with:
  - Search bar
  - Filter chips
  - Transaction list with swipe actions
- **PATTERN**: `src/pages/Transactions.tsx`
- **VALIDATE**: List renders with transactions

#### 4.5 CREATE TransactionRow

- **IMPLEMENT**: Create `FreeLunch/Views/Transactions/TransactionRow.swift`:
  ```swift
  import SwiftUI

  struct TransactionRow: View {
      let transaction: Transaction
      let category: Category?
      let onCategoryTap: () -> Void

      var body: some View {
          HStack(spacing: 12) {
              // Date
              VStack(alignment: .leading, spacing: 2) {
                  Text(transaction.date.formatted(date: .abbreviated, time: .omitted))
                      .font(.caption)
                  if let time = transaction.transactionDate {
                      Text(time.formatted(date: .omitted, time: .shortened))
                          .font(.caption2)
                          .foregroundStyle(.secondary)
                  }
              }
              .frame(width: 60, alignment: .leading)

              // Description & badges
              VStack(alignment: .leading, spacing: 4) {
                  Text(transaction.description)
                      .font(.subheadline)
                      .lineLimit(1)

                  HStack(spacing: 4) {
                      if let reimbursement = transaction.reimbursement {
                          ReimbursementBadge(info: reimbursement)
                      }
                      if let counterparty = transaction.counterparty {
                          Text(counterparty)
                              .font(.caption)
                              .foregroundStyle(.secondary)
                      }
                  }
              }

              Spacer()

              // Category
              Button(action: onCategoryTap) {
                  if let category {
                      CategoryBadge(category: category)
                  } else {
                      Image(systemName: "questionmark.circle")
                          .foregroundStyle(.secondary)
                  }
              }
              .buttonStyle(.plain)

              // Amount
              AmountText(amount: transaction.amount, isPendingReimbursement: transaction.reimbursement?.status == .pending)
          }
          .padding(.vertical, 8)
      }
  }
  ```
- **PATTERN**: `src/components/transactions/TransactionRow.tsx`
- **VALIDATE**: Row renders correctly

#### 4.6 CREATE Swipe Actions

- **IMPLEMENT**: Add swipe actions to TransactionRow:
  ```swift
  .swipeActions(edge: .trailing) {
      Button {
          onCategoryTap()
      } label: {
          Label("Categorize", systemImage: "folder")
      }
      .tint(.blue)
  }
  .swipeActions(edge: .leading) {
      Button {
          onMarkReimbursable()
      } label: {
          Label("Reimbursable", systemImage: "arrow.uturn.left")
      }
      .tint(.orange)
  }
  ```
- **VALIDATE**: Swipe actions work

#### 4.7 CREATE CategoriesView

- **IMPLEMENT**: Create hierarchical category list with expand/collapse
- **PATTERN**: `src/components/categories/CategoryTree.tsx`
- **VALIDATE**: Hierarchy displays correctly

#### 4.8 CREATE BudgetsView

- **IMPLEMENT**: Create budget cards with progress bars
- **PATTERN**: `src/components/budgets/BudgetList.tsx`
- **VALIDATE**: Progress bars display correctly

#### 4.9 CREATE SettingsView

- **IMPLEMENT**: Create settings with bank connection card
- **PATTERN**: `src/pages/Settings.tsx`
- **VALIDATE**: Settings render

---

### Phase 5: Bank Integration

#### 5.1 CREATE BankingService

- **IMPLEMENT**: Create `FreeLunch/Core/Networking/BankingService.swift`:
  ```swift
  import FirebaseFunctions
  import AuthenticationServices

  actor BankingService: NSObject {
      static let shared = BankingService()
      private let functions = Functions.functions(region: "europe-west1")

      struct Bank: Codable {
          let name: String
          let country: String
          let logo: String?
          let bic: String?
      }

      func getAvailableBanks() async throws -> [Bank] {
          let result = try await functions.httpsCallable("getAvailableBanks").call(["country": "NL"])
          guard let data = result.data as? [[String: Any]] else { throw BankingError.invalidResponse }

          return data.compactMap { dict in
              guard let name = dict["name"] as? String,
                    let country = dict["country"] as? String else { return nil }
              return Bank(name: name, country: country, logo: dict["logo"] as? String, bic: dict["bic"] as? String)
          }
      }

      func initBankConnection(bankName: String) async throws -> URL {
          let result = try await functions.httpsCallable("initBankConnection").call(["bankName": bankName])
          guard let data = result.data as? [String: Any],
                let authUrlString = data["authUrl"] as? String,
                let authUrl = URL(string: authUrlString) else {
              throw BankingError.invalidResponse
          }
          return authUrl
      }

      func syncTransactions(connectionId: String) async throws -> SyncResult {
          let result = try await functions.httpsCallable("syncTransactions").call(["connectionId": connectionId])
          guard let data = result.data as? [String: Any] else { throw BankingError.invalidResponse }

          return SyncResult(
              totalNew: data["totalNew"] as? Int ?? 0,
              totalUpdated: data["totalUpdated"] as? Int ?? 0
          )
      }

      struct SyncResult {
          let totalNew: Int
          let totalUpdated: Int
      }

      enum BankingError: Error {
          case invalidResponse
          case authFailed
      }
  }
  ```
- **PATTERN**: `src/lib/bankingFunctions.ts`
- **VALIDATE**: Cloud function calls work

#### 5.2 CREATE Bank OAuth Flow

- **IMPLEMENT**: Create `FreeLunch/Views/Settings/BankConnectionFlow.swift`:
  ```swift
  import SwiftUI
  import AuthenticationServices

  struct BankConnectionFlow: View {
      @State private var isConnecting = false
      @State private var authSession: ASWebAuthenticationSession?
      @State private var errorMessage: String?

      let bankName: String
      let onComplete: (Bool) -> Void

      var body: some View {
          Button("Connect \(bankName)") {
              Task {
                  await startConnection()
              }
          }
          .disabled(isConnecting)
      }

      @MainActor
      private func startConnection() async {
          isConnecting = true

          do {
              let authUrl = try await BankingService.shared.initBankConnection(bankName: bankName)

              let session = ASWebAuthenticationSession(
                  url: authUrl,
                  callbackURLScheme: "freelunch"
              ) { callbackURL, error in
                  isConnecting = false

                  if let error {
                      errorMessage = error.localizedDescription
                      onComplete(false)
                      return
                  }

                  guard let callbackURL,
                        let components = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false) else {
                      onComplete(false)
                      return
                  }

                  // Check for success or error in callback
                  if components.queryItems?.contains(where: { $0.name == "bank_connected" }) == true {
                      onComplete(true)
                  } else {
                      errorMessage = components.queryItems?.first(where: { $0.name == "bank_error" })?.value
                      onComplete(false)
                  }
              }

              session.presentationContextProvider = self
              session.prefersEphemeralWebBrowserSession = true
              session.start()

              authSession = session
          } catch {
              isConnecting = false
              errorMessage = error.localizedDescription
              onComplete(false)
          }
      }
  }

  extension BankConnectionFlow: ASWebAuthenticationPresentationContextProviding {
      func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
          UIApplication.shared.connectedScenes
              .compactMap { $0 as? UIWindowScene }
              .first?.windows.first ?? ASPresentationAnchor()
      }
  }
  ```
- **PATTERN**: `functions/src/handlers/initBankConnection.ts` and `bankCallback.ts`
- **VALIDATE**: OAuth flow opens bank authorization

---

### Phase 6: iOS-Specific Features

#### 6.1 CREATE Widget Extension

- **IMPLEMENT**: File > New > Target > Widget Extension
  - Product Name: FreeLunchWidgets
  - Include Configuration Intent: No
- **IMPLEMENT**: Enable App Groups for both targets:
  - Signing & Capabilities > App Groups
  - Add: `group.com.freelunch.shared`
- **VALIDATE**: Widget target created

#### 6.2 CREATE SpendingSummaryWidget

- **IMPLEMENT**: Create `FreeLunchWidgets/SpendingSummaryWidget.swift` with small/medium/large variants
- **IMPLEMENT**: Create TimelineProvider that reads from shared UserDefaults
- **VALIDATE**: Widget displays on home screen

#### 6.3 CREATE RecentTransactionsWidget

- **IMPLEMENT**: Medium widget showing last 3-5 transactions
- **VALIDATE**: Widget updates with new data

#### 6.4 CREATE BudgetAlertsWidget

- **IMPLEMENT**: Widget showing categories approaching/exceeding budget
- **VALIDATE**: Widget displays budget status

#### 6.5 UPDATE Main App to Share Widget Data

- **IMPLEMENT**: After Firestore listeners update, save summary to shared UserDefaults:
  ```swift
  func updateWidgetData() {
      let sharedDefaults = UserDefaults(suiteName: "group.com.freelunch.shared")!
      sharedDefaults.set(dashboardViewModel.totalExpenses, forKey: "monthSpending")
      sharedDefaults.set(todayExpenses, forKey: "todaySpending")
      sharedDefaults.set(Date(), forKey: "lastUpdated")

      WidgetCenter.shared.reloadAllTimelines()
  }
  ```
- **VALIDATE**: Widget receives updated data

#### 6.6 SETUP Push Notifications

- **IMPLEMENT**: Update AppDelegate for FCM:
  ```swift
  func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
      FirebaseApp.configure()

      // Request notification permission
      UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
          guard granted else { return }
          DispatchQueue.main.async {
              application.registerForRemoteNotifications()
          }
      }

      Messaging.messaging().delegate = self
      UNUserNotificationCenter.current().delegate = self

      return true
  }
  ```
- **IMPLEMENT**: Handle FCM token registration and store in Firestore
- **VALIDATE**: Push notifications received

---

### Phase 7: Testing & Polish

#### 7.1 CREATE Unit Tests

- **IMPLEMENT**: Test ViewModels in `FreeLunchTests/`:
  - `AuthViewModelTests.swift`
  - `TransactionsViewModelTests.swift`
  - `DashboardViewModelTests.swift`
- **VALIDATE**: `xcodebuild test -scheme FreeLunch`

#### 7.2 CREATE UI Tests

- **IMPLEMENT**: Test critical flows in `FreeLunchUITests/`:
  - Login flow
  - Transaction categorization
  - Navigation between tabs
- **VALIDATE**: `xcodebuild test -scheme FreeLunchUITests`

#### 7.3 ADD Loading States

- **IMPLEMENT**: Add ProgressView and skeleton views for loading states
- **VALIDATE**: Loading states appear during data fetch

#### 7.4 ADD Error Handling UI

- **IMPLEMENT**: Add error alerts and retry buttons
- **VALIDATE**: Errors display user-friendly messages

#### 7.5 ADD Haptic Feedback

- **IMPLEMENT**: Add UIImpactFeedbackGenerator for:
  - Swipe actions
  - Category selection
  - Successful sync
- **VALIDATE**: Haptics feel natural

---

## TESTING STRATEGY

### Unit Tests

- Test all ViewModel computed properties
- Test date range calculations
- Test category hierarchy building
- Test budget progress calculations
- Mock Firestore with protocol-based dependency injection

### UI Tests

```swift
func testLoginFlow() async throws {
    let app = XCUIApplication()
    app.launch()

    let emailField = app.textFields["Email"]
    emailField.tap()
    emailField.typeText("test@example.com")

    let passwordField = app.secureTextFields["Password"]
    passwordField.tap()
    passwordField.typeText("password123")

    app.buttons["Sign In"].tap()

    // Verify dashboard appears
    XCTAssertTrue(app.staticTexts["Dashboard"].waitForExistence(timeout: 5))
}
```

### Widget Tests

- Test TimelineProvider returns valid entries
- Test widget views render without errors
- Snapshot tests for widget appearances

---

## VALIDATION COMMANDS

### Level 1: Build

```bash
xcodebuild -scheme FreeLunch -destination 'platform=iOS Simulator,name=iPhone 15' build
```

### Level 2: Unit Tests

```bash
xcodebuild test -scheme FreeLunch -destination 'platform=iOS Simulator,name=iPhone 15'
```

### Level 3: UI Tests

```bash
xcodebuild test -scheme FreeLunchUITests -destination 'platform=iOS Simulator,name=iPhone 15'
```

### Level 4: Manual Validation

1. [ ] Sign up with email/password - user created in Firebase
2. [ ] Sign in with Google - auth works
3. [ ] Dashboard loads with real data from Firestore
4. [ ] Month navigation changes data range
5. [ ] Transactions list shows with filters
6. [ ] Swipe to categorize works
7. [ ] Category picker shows hierarchy
8. [ ] Create new category
9. [ ] Budget shows progress bar
10. [ ] Connect bank account via OAuth
11. [ ] Sync pulls new transactions
12. [ ] Widget shows spending summary
13. [ ] Push notification received
14. [ ] Biometric lock protects app

---

## ACCEPTANCE CRITERIA

- [ ] App authenticates with Firebase (email, Google)
- [ ] Dashboard displays accurate spending summaries
- [ ] Charts render with Swift Charts
- [ ] Transactions list with working filters
- [ ] Swipe-to-categorize works
- [ ] Category hierarchy displays correctly
- [ ] Budget progress calculates correctly
- [ ] Bank OAuth flow completes
- [ ] Transaction sync works
- [ ] Widgets update with spending data
- [ ] Push notifications delivered
- [ ] Biometric lock optional setting works
- [ ] No crashes on iPhone 15 simulator
- [ ] All unit tests pass
- [ ] All UI tests pass

---

## COMPLETION CHECKLIST

- [ ] Xcode project created with correct structure
- [ ] Firebase SDK integrated and configured
- [ ] All Swift models match Firestore schema
- [ ] Authentication flow complete
- [ ] All 5 tabs implemented
- [ ] Dashboard with charts working
- [ ] Transaction management complete
- [ ] Category hierarchy working
- [ ] Budget tracking working
- [ ] Bank integration working
- [ ] Widgets displaying data
- [ ] Push notifications configured
- [ ] Unit tests passing
- [ ] UI tests passing
- [ ] Manual testing complete

---

## NOTES

### Key Differences from Web App

1. **No transaction splitting** in MVP - excluded to reduce complexity
2. **No complex reimbursements** - basic marking only, no linking flows
3. **No counterparty analytics page** - excluded from MVP
4. **Native iOS patterns** - tab bar instead of sidebar, swipe actions instead of hover menus

### Security Considerations

- Never store bank OAuth tokens on device - handled by Cloud Functions
- Use Keychain for sensitive data (auth tokens)
- Enable App Transport Security
- Validate all user input before Firestore writes

### Performance Considerations

- Firestore offline persistence enabled by default
- Limit transaction queries to current month
- Paginate large lists (50 items per page)
- Cache category hierarchy locally

### Future Enhancements (Post-MVP)

- Transaction splitting
- Complex reimbursement linking
- Counterparty analytics
- Siri Shortcuts
- iPad/Mac support
- Apple Watch companion
