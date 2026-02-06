# Free Lunch iOS App

Native SwiftUI iOS app for Free Lunch personal finance management.

## Project Setup

### Prerequisites

- Xcode 15.0 or later
- iOS 17.0+ deployment target
- CocoaPods or Swift Package Manager

### Creating the Xcode Project

1. **Create New Xcode Project**
   - Open Xcode
   - File > New > Project
   - Select "App" under iOS
   - Product Name: `FreeLunch`
   - Interface: SwiftUI
   - Language: Swift
   - Minimum Deployment: iOS 17.0
   - Include Tests: Yes

2. **Add Firebase SDK via Swift Package Manager**
   - File > Add Package Dependencies
   - URL: `https://github.com/firebase/firebase-ios-sdk`
   - Version: 10.0.0+
   - Select products:
     - FirebaseAuth
     - FirebaseFirestore
     - FirebaseMessaging
     - FirebaseFunctions

3. **Add GoogleSignIn SDK**
   - File > Add Package Dependencies
   - URL: `https://github.com/google/GoogleSignIn-iOS`
   - Version: 7.0.0+

4. **Configure Firebase**
   - Download `GoogleService-Info.plist` from Firebase Console
   - Add to FreeLunch target
   - Ensure "Copy items if needed" is checked

5. **Update Info.plist**
   ```xml
   <key>FirebaseAppDelegateProxyEnabled</key>
   <false/>

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

6. **Add Widget Extension**
   - File > New > Target
   - Select "Widget Extension"
   - Product Name: `FreeLunchWidgets`
   - Include Configuration Intent: No

7. **Configure App Groups**
   - Select FreeLunch target > Signing & Capabilities
   - Add "App Groups" capability
   - Add group: `group.com.freelunch.shared`
   - Repeat for FreeLunchWidgets target

### Project Structure

```
ios/
├── FreeLunch/
│   ├── App/
│   │   ├── AppDelegate.swift
│   │   └── FreeLunchApp.swift
│   ├── Core/
│   │   ├── Firebase/
│   │   │   └── FirestoreService.swift
│   │   ├── Networking/
│   │   │   └── BankingService.swift
│   │   └── Biometrics/
│   │       └── BiometricService.swift
│   ├── Models/
│   │   ├── Transaction.swift
│   │   ├── Category.swift
│   │   ├── Budget.swift
│   │   ├── BankConnection.swift
│   │   ├── User.swift
│   │   └── Rule.swift
│   ├── ViewModels/
│   │   ├── AuthViewModel.swift
│   │   ├── MonthViewModel.swift
│   │   ├── DashboardViewModel.swift
│   │   ├── TransactionsViewModel.swift
│   │   ├── CategoriesViewModel.swift
│   │   └── BudgetsViewModel.swift
│   ├── Views/
│   │   ├── ContentView.swift
│   │   ├── Auth/
│   │   ├── Dashboard/
│   │   ├── Transactions/
│   │   ├── Categories/
│   │   ├── Budgets/
│   │   └── Settings/
│   ├── Extensions/
│   │   └── Color+Hex.swift
│   └── Resources/
├── FreeLunchWidgets/
│   ├── FreeLunchWidgets.swift
│   ├── SpendingSummaryWidget.swift
│   ├── RecentTransactionsWidget.swift
│   └── BudgetAlertsWidget.swift
├── FreeLunchTests/
│   ├── MonthViewModelTests.swift
│   ├── DashboardViewModelTests.swift
│   └── TransactionsViewModelTests.swift
└── FreeLunchUITests/
```

### Running the App

1. **Simulator**
   ```bash
   xcodebuild -scheme FreeLunch -destination 'platform=iOS Simulator,name=iPhone 15' build
   ```

2. **Run Tests**
   ```bash
   xcodebuild test -scheme FreeLunch -destination 'platform=iOS Simulator,name=iPhone 15'
   ```

### Features

#### Authentication
- Email/password sign-in and registration
- Google Sign-In integration
- Biometric lock (Face ID / Touch ID)

#### Dashboard
- Monthly income/expense summary
- Spending by category pie chart
- Budget alerts
- Recent transactions

#### Transactions
- Full transaction list with date grouping
- Search by description or counterparty
- Filter by category, direction, reimbursement status
- Swipe actions for categorization

#### Categories
- Hierarchical category tree
- Create, edit, delete categories
- Icon and color picker

#### Budgets
- Budget progress cards
- Warning and exceeded alerts
- Overall monthly summary

#### Settings
- Bank connection management
- Theme selection
- Notification preferences
- Biometric lock toggle

#### Widgets
- Spending Summary (small, medium, large)
- Recent Transactions (medium, large)
- Budget Alerts (small, medium)

### Architecture

- **SwiftUI** with iOS 17+ features
- **@Observable** macro for state management
- **Firestore** real-time listeners
- **Async/await** for asynchronous operations
- **MVVM** pattern with separate ViewModels

### Backend Integration

The app connects to the existing Firebase backend:
- Cloud Firestore for data storage
- Cloud Functions for bank sync
- Firebase Auth for authentication
- FCM for push notifications

### Security

- Bank OAuth tokens handled by Cloud Functions (never stored on device)
- Keychain storage for sensitive data
- App Transport Security enabled
- User input validation before Firestore writes
