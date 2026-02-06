import XCTest
@testable import FreeLunch

final class TransactionsViewModelTests: XCTestCase {

    var sut: TransactionsViewModel!

    override func setUp() {
        super.setUp()
        sut = TransactionsViewModel()
    }

    override func tearDown() {
        sut = nil
        super.tearDown()
    }

    // MARK: - Search Filter Tests

    func testFilteredTransactions_SearchByDescription_FindsMatch() {
        sut.transactions = [
            createTransaction(description: "Albert Heijn"),
            createTransaction(description: "Jumbo Supermarket"),
            createTransaction(description: "NS Reizen"),
        ]

        sut.searchText = "albert"

        XCTAssertEqual(sut.filteredTransactions.count, 1)
        XCTAssertEqual(sut.filteredTransactions.first?.description, "Albert Heijn")
    }

    func testFilteredTransactions_SearchByCounterparty_FindsMatch() {
        sut.transactions = [
            createTransaction(description: "Payment", counterparty: "Albert Heijn BV"),
            createTransaction(description: "Payment", counterparty: "Jumbo BV"),
        ]

        sut.searchText = "albert"

        XCTAssertEqual(sut.filteredTransactions.count, 1)
        XCTAssertEqual(sut.filteredTransactions.first?.counterparty, "Albert Heijn BV")
    }

    func testFilteredTransactions_SearchIsCaseInsensitive() {
        sut.transactions = [
            createTransaction(description: "ALBERT HEIJN"),
        ]

        sut.searchText = "albert heijn"

        XCTAssertEqual(sut.filteredTransactions.count, 1)
    }

    // MARK: - Category Filter Tests

    func testFilteredTransactions_FilterByCategory_ShowsOnlyMatching() {
        sut.transactions = [
            createTransaction(description: "Food 1", categoryId: "food"),
            createTransaction(description: "Food 2", categoryId: "food"),
            createTransaction(description: "Transport", categoryId: "transport"),
        ]

        sut.selectedCategoryId = "food"

        XCTAssertEqual(sut.filteredTransactions.count, 2)
        XCTAssertTrue(sut.filteredTransactions.allSatisfy { $0.categoryId == "food" })
    }

    func testFilteredTransactions_FilterByUncategorized_ShowsNullCategory() {
        sut.transactions = [
            createTransaction(description: "Categorized", categoryId: "food"),
            createTransaction(description: "Uncategorized 1", categoryId: nil),
            createTransaction(description: "Uncategorized 2", categoryId: nil),
        ]

        sut.selectedCategoryId = "uncategorized"

        XCTAssertEqual(sut.filteredTransactions.count, 2)
        XCTAssertTrue(sut.filteredTransactions.allSatisfy { $0.categoryId == nil })
    }

    // MARK: - Direction Filter Tests

    func testFilteredTransactions_FilterIncome_ShowsPositiveOnly() {
        sut.transactions = [
            createTransaction(description: "Salary", amount: 3500.00),
            createTransaction(description: "Expense 1", amount: -100.00),
            createTransaction(description: "Expense 2", amount: -50.00),
        ]

        sut.selectedDirection = .income

        XCTAssertEqual(sut.filteredTransactions.count, 1)
        XCTAssertTrue(sut.filteredTransactions.allSatisfy { $0.amount > 0 })
    }

    func testFilteredTransactions_FilterExpense_ShowsNegativeOnly() {
        sut.transactions = [
            createTransaction(description: "Salary", amount: 3500.00),
            createTransaction(description: "Expense 1", amount: -100.00),
            createTransaction(description: "Expense 2", amount: -50.00),
        ]

        sut.selectedDirection = .expense

        XCTAssertEqual(sut.filteredTransactions.count, 2)
        XCTAssertTrue(sut.filteredTransactions.allSatisfy { $0.amount < 0 })
    }

    // MARK: - Reimbursement Filter Tests

    func testFilteredTransactions_FilterPendingReimbursements() {
        sut.transactions = [
            createTransaction(description: "Normal", amount: -100.00),
            createTransaction(description: "Pending", amount: -50.00, reimbursementStatus: .pending),
            createTransaction(description: "Cleared", amount: -75.00, reimbursementStatus: .cleared),
        ]

        sut.selectedReimbursementStatus = .pending

        XCTAssertEqual(sut.filteredTransactions.count, 1)
        XCTAssertEqual(sut.filteredTransactions.first?.description, "Pending")
    }

    func testFilteredTransactions_FilterNoReimbursements() {
        sut.transactions = [
            createTransaction(description: "Normal 1", amount: -100.00),
            createTransaction(description: "Normal 2", amount: -50.00),
            createTransaction(description: "Pending", amount: -75.00, reimbursementStatus: .pending),
        ]

        sut.selectedReimbursementStatus = .none

        XCTAssertEqual(sut.filteredTransactions.count, 2)
        XCTAssertTrue(sut.filteredTransactions.allSatisfy { $0.reimbursement == nil })
    }

    // MARK: - Combined Filters Tests

    func testFilteredTransactions_MultipleFilters_AppliesAll() {
        sut.transactions = [
            createTransaction(description: "Food Expense", amount: -50.00, categoryId: "food"),
            createTransaction(description: "Food Income", amount: 100.00, categoryId: "food"),
            createTransaction(description: "Transport Expense", amount: -25.00, categoryId: "transport"),
        ]

        sut.selectedCategoryId = "food"
        sut.selectedDirection = .expense

        XCTAssertEqual(sut.filteredTransactions.count, 1)
        XCTAssertEqual(sut.filteredTransactions.first?.description, "Food Expense")
    }

    func testFilteredTransactions_SearchAndCategoryFilter() {
        sut.transactions = [
            createTransaction(description: "Albert Heijn", amount: -50.00, categoryId: "food"),
            createTransaction(description: "Jumbo", amount: -30.00, categoryId: "food"),
            createTransaction(description: "Albert Gas", amount: -60.00, categoryId: "transport"),
        ]

        sut.searchText = "albert"
        sut.selectedCategoryId = "food"

        XCTAssertEqual(sut.filteredTransactions.count, 1)
        XCTAssertEqual(sut.filteredTransactions.first?.description, "Albert Heijn")
    }

    // MARK: - Grouped by Date Tests

    func testTransactionsByDate_GroupsCorrectly() {
        let today = Date()
        let yesterday = Calendar.current.date(byAdding: .day, value: -1, to: today)!

        sut.transactions = [
            createTransaction(description: "Today 1", date: today),
            createTransaction(description: "Today 2", date: today),
            createTransaction(description: "Yesterday", date: yesterday),
        ]

        let grouped = sut.transactionsByDate

        XCTAssertEqual(grouped.count, 2)
    }

    func testTransactionsByDate_SortedByDateDescending() {
        let today = Date()
        let yesterday = Calendar.current.date(byAdding: .day, value: -1, to: today)!

        sut.transactions = [
            createTransaction(description: "Yesterday", date: yesterday),
            createTransaction(description: "Today", date: today),
        ]

        let grouped = sut.transactionsByDate

        XCTAssertTrue(grouped[0].date > grouped[1].date)
    }

    // MARK: - Clear Filters Tests

    func testClearFilters_ResetsAllFilters() {
        sut.searchText = "test"
        sut.selectedCategoryId = "food"
        sut.selectedDirection = .expense
        sut.selectedReimbursementStatus = .pending

        sut.clearFilters()

        XCTAssertEqual(sut.searchText, "")
        XCTAssertNil(sut.selectedCategoryId)
        XCTAssertEqual(sut.selectedDirection, .all)
        XCTAssertEqual(sut.selectedReimbursementStatus, .all)
    }

    func testHasActiveFilters_WhenFiltersActive_ReturnsTrue() {
        sut.selectedCategoryId = "food"
        XCTAssertTrue(sut.hasActiveFilters)
    }

    func testHasActiveFilters_WhenNoFilters_ReturnsFalse() {
        XCTAssertFalse(sut.hasActiveFilters)
    }

    // MARK: - Summary Calculations Tests

    func testTotalIncome_CalculatesFromFiltered() {
        sut.transactions = [
            createTransaction(description: "Income 1", amount: 1000.00, categoryId: "income"),
            createTransaction(description: "Income 2", amount: 500.00, categoryId: "other"),
        ]

        sut.selectedCategoryId = "income"

        XCTAssertEqual(sut.totalIncome, 1000.00, accuracy: 0.01)
    }

    func testUncategorizedCount_CountsCorrectly() {
        sut.transactions = [
            createTransaction(description: "Categorized", categoryId: "food"),
            createTransaction(description: "Uncategorized 1", categoryId: nil),
            createTransaction(description: "Uncategorized 2", categoryId: nil),
        ]

        XCTAssertEqual(sut.uncategorizedCount, 2)
    }

    // MARK: - Helper Methods

    private func createTransaction(
        description: String,
        amount: Double = -10.00,
        date: Date = Date(),
        categoryId: String? = nil,
        counterparty: String? = nil,
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
            date: date,
            description: description,
            amount: amount,
            categoryId: categoryId,
            reimbursement: reimbursement
        )
    }
}
