import XCTest

final class FreeLunchUITests: XCTestCase {

    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["UI-Testing"]
    }

    override func tearDownWithError() throws {
        app = nil
    }

    // MARK: - Login Flow Tests

    func testLoginScreen_ShowsEmailAndPasswordFields() throws {
        app.launch()

        // Verify login screen elements
        XCTAssertTrue(app.textFields["Email"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.secureTextFields["Password"].exists)
        XCTAssertTrue(app.buttons["Sign In"].exists)
    }

    func testLoginScreen_ShowsGoogleSignInButton() throws {
        app.launch()

        XCTAssertTrue(app.buttons["Continue with Google"].waitForExistence(timeout: 5))
    }

    func testLoginScreen_SignUpLink_NavigatesToRegistration() throws {
        app.launch()

        let signUpButton = app.buttons["Sign up"]
        XCTAssertTrue(signUpButton.waitForExistence(timeout: 5))

        signUpButton.tap()

        // Verify registration screen appears
        XCTAssertTrue(app.staticTexts["Create Account"].waitForExistence(timeout: 5))
    }

    // MARK: - Registration Flow Tests

    func testRegistrationScreen_ShowsAllFields() throws {
        app.launch()
        app.buttons["Sign up"].tap()

        XCTAssertTrue(app.textFields["Your name"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.textFields["your@email.com"].exists)
        XCTAssertTrue(app.secureTextFields["At least 6 characters"].exists)
        XCTAssertTrue(app.secureTextFields["Re-enter your password"].exists)
        XCTAssertTrue(app.buttons["Create Account"].exists)
    }

    // MARK: - Navigation Tests

    func testTabBar_ShowsAllTabs() throws {
        // This test requires authentication
        // Skip if not authenticated
        app.launch()

        // If we're on the login screen, this test should be skipped
        guard !app.textFields["Email"].waitForExistence(timeout: 2) else {
            throw XCTSkip("User not authenticated, skipping navigation test")
        }

        // Verify all tabs exist
        XCTAssertTrue(app.tabBars.buttons["Dashboard"].exists)
        XCTAssertTrue(app.tabBars.buttons["Transactions"].exists)
        XCTAssertTrue(app.tabBars.buttons["Categories"].exists)
        XCTAssertTrue(app.tabBars.buttons["Budgets"].exists)
        XCTAssertTrue(app.tabBars.buttons["Settings"].exists)
    }

    func testTabBar_CanNavigateBetweenTabs() throws {
        app.launch()

        guard !app.textFields["Email"].waitForExistence(timeout: 2) else {
            throw XCTSkip("User not authenticated")
        }

        // Navigate to Transactions tab
        app.tabBars.buttons["Transactions"].tap()
        XCTAssertTrue(app.navigationBars["Transactions"].waitForExistence(timeout: 3))

        // Navigate to Categories tab
        app.tabBars.buttons["Categories"].tap()
        XCTAssertTrue(app.navigationBars["Categories"].waitForExistence(timeout: 3))

        // Navigate to Budgets tab
        app.tabBars.buttons["Budgets"].tap()
        XCTAssertTrue(app.navigationBars["Budgets"].waitForExistence(timeout: 3))

        // Navigate to Settings tab
        app.tabBars.buttons["Settings"].tap()
        XCTAssertTrue(app.navigationBars["Settings"].waitForExistence(timeout: 3))

        // Navigate back to Dashboard
        app.tabBars.buttons["Dashboard"].tap()
        XCTAssertTrue(app.navigationBars["Dashboard"].waitForExistence(timeout: 3))
    }

    // MARK: - Performance Tests

    func testLaunchPerformance() throws {
        if #available(macOS 10.15, iOS 13.0, tvOS 13.0, watchOS 7.0, *) {
            measure(metrics: [XCTApplicationLaunchMetric()]) {
                XCUIApplication().launch()
            }
        }
    }
}

// MARK: - Accessibility Tests

final class FreeLunchAccessibilityUITests: XCTestCase {

    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["UI-Testing"]
        app.launch()
    }

    func testLoginScreen_AccessibilityLabels() throws {
        // Verify accessibility labels are set
        XCTAssertTrue(app.textFields["Email"].isHittable)
        XCTAssertTrue(app.secureTextFields["Password"].isHittable)
        XCTAssertTrue(app.buttons["Sign In"].isHittable)
    }
}
