import XCTest
@testable import FreeLunch

final class DashboardViewModelTests: XCTestCase {

    var sut: DashboardViewModel!

    override func setUp() {
        super.setUp()
        sut = DashboardViewModel()
    }

    override func tearDown() {
        sut = nil
        super.tearDown()
    }

    // MARK: - Income Calculation Tests

    func testTotalIncome_WithPositiveTransactions_CalculatesCorrectly() {
        sut.transactions = [
            createTransaction(amount: 3500.00),  // Income
            createTransaction(amount: 500.00),   // Income
            createTransaction(amount: -100.00),  // Expense (ignored)
        ]

        XCTAssertEqual(sut.totalIncome, 4000.00, accuracy: 0.01)
    }

    func testTotalIncome_ExcludesPendingReimbursements() {
        sut.transactions = [
            createTransaction(amount: 3500.00),
            createTransaction(amount: 100.00, reimbursementStatus: .pending), // Should be excluded
        ]

        XCTAssertEqual(sut.totalIncome, 3500.00, accuracy: 0.01)
    }

    func testTotalIncome_WithNoTransactions_ReturnsZero() {
        sut.transactions = []
        XCTAssertEqual(sut.totalIncome, 0.00)
    }

    // MARK: - Expense Calculation Tests

    func testTotalExpenses_WithNegativeTransactions_CalculatesAbsoluteValue() {
        sut.transactions = [
            createTransaction(amount: -100.00),
            createTransaction(amount: -50.50),
            createTransaction(amount: 500.00), // Income (ignored)
        ]

        XCTAssertEqual(sut.totalExpenses, 150.50, accuracy: 0.01)
    }

    func testTotalExpenses_ExcludesPendingReimbursements() {
        sut.transactions = [
            createTransaction(amount: -100.00),
            createTransaction(amount: -50.00, reimbursementStatus: .pending), // Excluded
        ]

        XCTAssertEqual(sut.totalExpenses, 100.00, accuracy: 0.01)
    }

    // MARK: - Net Balance Tests

    func testNetBalance_CalculatesIncomeMinusExpenses() {
        sut.transactions = [
            createTransaction(amount: 3500.00),  // Income
            createTransaction(amount: -1000.00), // Expense
            createTransaction(amount: -500.00),  // Expense
        ]

        XCTAssertEqual(sut.netBalance, 2000.00, accuracy: 0.01)
    }

    func testNetBalance_CanBeNegative() {
        sut.transactions = [
            createTransaction(amount: 1000.00),  // Income
            createTransaction(amount: -2000.00), // Expense
        ]

        XCTAssertEqual(sut.netBalance, -1000.00, accuracy: 0.01)
    }

    // MARK: - Pending Reimbursements Tests

    func testPendingReimbursements_CalculatesCorrectTotal() {
        sut.transactions = [
            createTransaction(amount: -100.00, reimbursementStatus: .pending),
            createTransaction(amount: -50.00, reimbursementStatus: .pending),
            createTransaction(amount: -200.00), // No reimbursement
        ]

        XCTAssertEqual(sut.pendingReimbursements, 150.00, accuracy: 0.01)
    }

    func testPendingReimbursementsCount_CountsCorrectly() {
        sut.transactions = [
            createTransaction(amount: -100.00, reimbursementStatus: .pending),
            createTransaction(amount: -50.00, reimbursementStatus: .pending),
            createTransaction(amount: -200.00, reimbursementStatus: .cleared),
            createTransaction(amount: -300.00),
        ]

        XCTAssertEqual(sut.pendingReimbursementsCount, 2)
    }

    // MARK: - Recent Transactions Tests

    func testRecentTransactions_ReturnsMaxFive() {
        sut.transactions = (0..<10).map { i in
            createTransaction(amount: Double(-i * 10))
        }

        XCTAssertEqual(sut.recentTransactions.count, 5)
    }

    func testRecentTransactions_WhenLessThanFive_ReturnsAll() {
        sut.transactions = [
            createTransaction(amount: -10.00),
            createTransaction(amount: -20.00),
        ]

        XCTAssertEqual(sut.recentTransactions.count, 2)
    }

    // MARK: - Spending by Category Tests

    func testSpendingByCategory_GroupsCorrectly() {
        let foodCategory = Category(
            id: "food",
            name: "Food",
            icon: "fork.knife",
            color: "#C9A227",
            parentId: nil,
            order: 0
        )

        sut.categories = [foodCategory]
        sut.transactions = [
            createTransaction(amount: -50.00, categoryId: "food"),
            createTransaction(amount: -30.00, categoryId: "food"),
        ]

        let spending = sut.spendingByCategory

        XCTAssertEqual(spending.count, 1)
        XCTAssertEqual(spending.first?.category.id, "food")
        XCTAssertEqual(spending.first?.amount ?? 0, 80.00, accuracy: 0.01)
    }

    func testSpendingByCategory_CalculatesPercentageCorrectly() {
        let foodCategory = Category(id: "food", name: "Food", icon: "fork.knife", color: "#C9A227", parentId: nil, order: 0)
        let transportCategory = Category(id: "transport", name: "Transport", icon: "car", color: "#4A6FA5", parentId: nil, order: 1)

        sut.categories = [foodCategory, transportCategory]
        sut.transactions = [
            createTransaction(amount: -75.00, categoryId: "food"),
            createTransaction(amount: -25.00, categoryId: "transport"),
        ]

        let spending = sut.spendingByCategory.sorted { $0.amount > $1.amount }

        XCTAssertEqual(spending[0].percentage, 75.0, accuracy: 0.1)
        XCTAssertEqual(spending[1].percentage, 25.0, accuracy: 0.1)
    }

    func testSpendingByCategory_ExcludesPendingReimbursements() {
        let foodCategory = Category(id: "food", name: "Food", icon: "fork.knife", color: "#C9A227", parentId: nil, order: 0)

        sut.categories = [foodCategory]
        sut.transactions = [
            createTransaction(amount: -50.00, categoryId: "food"),
            createTransaction(amount: -30.00, categoryId: "food", reimbursementStatus: .pending),
        ]

        let spending = sut.spendingByCategory

        XCTAssertEqual(spending.first?.amount ?? 0, 50.00, accuracy: 0.01)
    }

    func testSpendingByCategory_HandlesUncategorized() {
        sut.categories = []
        sut.transactions = [
            createTransaction(amount: -50.00, categoryId: nil),
        ]

        let spending = sut.spendingByCategory

        XCTAssertEqual(spending.count, 1)
        XCTAssertEqual(spending.first?.category.id, "uncategorized")
    }

    // MARK: - Bank Connection Tests

    func testHasExpiredConnections_WhenExpired_ReturnsTrue() {
        sut.bankConnections = [
            BankConnection(
                id: "conn-1",
                bankId: "abn_amro",
                bankName: "ABN AMRO",
                status: .expired,
                accounts: []
            )
        ]

        XCTAssertTrue(sut.hasExpiredConnections)
    }

    func testHasExpiredConnections_WhenAllActive_ReturnsFalse() {
        sut.bankConnections = [
            BankConnection(
                id: "conn-1",
                bankId: "abn_amro",
                bankName: "ABN AMRO",
                status: .active,
                accounts: []
            )
        ]

        XCTAssertFalse(sut.hasExpiredConnections)
    }

    // MARK: - Transaction Count Tests

    func testTransactionCount_ReturnsCorrectCount() {
        sut.transactions = [
            createTransaction(amount: -10.00),
            createTransaction(amount: -20.00),
            createTransaction(amount: 100.00),
        ]

        XCTAssertEqual(sut.transactionCount, 3)
    }

    // MARK: - Helper Methods

    private func createTransaction(
        amount: Double,
        categoryId: String? = nil,
        reimbursementStatus: ReimbursementStatus? = nil
    ) -> Transaction {
        var reimbursement: ReimbursementInfo?
        if let status = reimbursementStatus {
            reimbursement = ReimbursementInfo(
                type: .work,
                note: nil,
                status: status,
                linkedTransactionId: nil,
                clearedAt: nil
            )
        }

        return Transaction(
            id: UUID().uuidString,
            date: Date(),
            description: "Test Transaction",
            amount: amount,
            categoryId: categoryId,
            reimbursement: reimbursement
        )
    }
}
