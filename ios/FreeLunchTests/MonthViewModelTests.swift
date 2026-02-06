import XCTest
@testable import FreeLunch

final class MonthViewModelTests: XCTestCase {

    var sut: MonthViewModel!

    override func setUp() {
        super.setUp()
        sut = MonthViewModel()
    }

    override func tearDown() {
        sut = nil
        super.tearDown()
    }

    // MARK: - Initialization Tests

    func testInit_SetsToCurrentMonth() {
        let calendar = Calendar.current
        let now = Date()

        XCTAssertTrue(
            calendar.isDate(sut.selectedMonth, equalTo: now, toGranularity: .month),
            "Initial month should be current month"
        )
    }

    func testInitWithDate_SetsToStartOfMonth() {
        let calendar = Calendar.current
        let midMonth = calendar.date(from: DateComponents(year: 2024, month: 6, day: 15))!

        let viewModel = MonthViewModel(date: midMonth)

        let expectedStart = calendar.date(from: DateComponents(year: 2024, month: 6, day: 1))!
        XCTAssertEqual(viewModel.selectedMonth, expectedStart)
    }

    // MARK: - Navigation Tests

    func testGoToNextMonth_AdvancesByOneMonth() {
        let calendar = Calendar.current
        let initialMonth = sut.selectedMonth

        sut.goToNextMonth()

        let expected = calendar.date(byAdding: .month, value: 1, to: initialMonth)!
        XCTAssertTrue(calendar.isDate(sut.selectedMonth, equalTo: expected, toGranularity: .month))
    }

    func testGoToPreviousMonth_GoesBackOneMonth() {
        let calendar = Calendar.current
        let initialMonth = sut.selectedMonth

        sut.goToPreviousMonth()

        let expected = calendar.date(byAdding: .month, value: -1, to: initialMonth)!
        XCTAssertTrue(calendar.isDate(sut.selectedMonth, equalTo: expected, toGranularity: .month))
    }

    func testGoToCurrentMonth_ResetsToToday() {
        // First go to different month
        sut.goToPreviousMonth()
        sut.goToPreviousMonth()

        sut.goToCurrentMonth()

        let calendar = Calendar.current
        XCTAssertTrue(calendar.isDate(sut.selectedMonth, equalTo: Date(), toGranularity: .month))
    }

    func testMoveByMonths_PositiveValue_AdvancesCorrectly() {
        let calendar = Calendar.current
        let initialMonth = sut.selectedMonth

        sut.moveByMonths(3)

        let expected = calendar.date(byAdding: .month, value: 3, to: initialMonth)!
        XCTAssertTrue(calendar.isDate(sut.selectedMonth, equalTo: expected, toGranularity: .month))
    }

    func testMoveByMonths_NegativeValue_GoesBackCorrectly() {
        let calendar = Calendar.current
        let initialMonth = sut.selectedMonth

        sut.moveByMonths(-2)

        let expected = calendar.date(byAdding: .month, value: -2, to: initialMonth)!
        XCTAssertTrue(calendar.isDate(sut.selectedMonth, equalTo: expected, toGranularity: .month))
    }

    // MARK: - Date Range Tests

    func testDateRange_ReturnsCorrectBounds() {
        let calendar = Calendar.current
        let viewModel = MonthViewModel(date: calendar.date(from: DateComponents(year: 2024, month: 2))!)

        let range = viewModel.dateRange

        // February 2024 has 29 days (leap year)
        let expectedStart = calendar.date(from: DateComponents(year: 2024, month: 2, day: 1))!
        let expectedEnd = calendar.date(from: DateComponents(year: 2024, month: 2, day: 29, hour: 23, minute: 59, second: 59))!

        XCTAssertEqual(range.lowerBound, expectedStart)
        XCTAssertEqual(calendar.component(.day, from: range.upperBound), 29)
    }

    func testStartDate_ReturnsFirstDayOfMonth() {
        let calendar = Calendar.current
        let viewModel = MonthViewModel(date: calendar.date(from: DateComponents(year: 2024, month: 3, day: 15))!)

        XCTAssertEqual(calendar.component(.day, from: viewModel.startDate), 1)
        XCTAssertEqual(calendar.component(.month, from: viewModel.startDate), 3)
    }

    // MARK: - isCurrentMonth Tests

    func testIsCurrentMonth_WhenCurrent_ReturnsTrue() {
        XCTAssertTrue(sut.isCurrentMonth)
    }

    func testIsCurrentMonth_WhenPastMonth_ReturnsFalse() {
        sut.goToPreviousMonth()
        XCTAssertFalse(sut.isCurrentMonth)
    }

    func testIsCurrentMonth_WhenFutureMonth_ReturnsFalse() {
        sut.goToNextMonth()
        XCTAssertFalse(sut.isCurrentMonth)
    }

    // MARK: - Display String Tests

    func testMonthDisplayString_FormatsCorrectly() {
        let calendar = Calendar.current
        let viewModel = MonthViewModel(date: calendar.date(from: DateComponents(year: 2024, month: 6))!)

        XCTAssertEqual(viewModel.monthDisplayString, "June 2024")
    }

    func testShortMonthDisplayString_FormatsCorrectly() {
        let calendar = Calendar.current
        let viewModel = MonthViewModel(date: calendar.date(from: DateComponents(year: 2024, month: 12))!)

        XCTAssertEqual(viewModel.shortMonthDisplayString, "Dec 2024")
    }

    // MARK: - Helper Method Tests

    func testDaysInMonth_February2024_Returns29() {
        let calendar = Calendar.current
        let viewModel = MonthViewModel(date: calendar.date(from: DateComponents(year: 2024, month: 2))!)

        XCTAssertEqual(viewModel.daysInMonth, 29, "February 2024 is a leap year")
    }

    func testDaysInMonth_February2023_Returns28() {
        let calendar = Calendar.current
        let viewModel = MonthViewModel(date: calendar.date(from: DateComponents(year: 2023, month: 2))!)

        XCTAssertEqual(viewModel.daysInMonth, 28, "February 2023 is not a leap year")
    }

    func testDaysInMonth_December_Returns31() {
        let calendar = Calendar.current
        let viewModel = MonthViewModel(date: calendar.date(from: DateComponents(year: 2024, month: 12))!)

        XCTAssertEqual(viewModel.daysInMonth, 31)
    }

    func testYear_ReturnsCorrectYear() {
        let calendar = Calendar.current
        let viewModel = MonthViewModel(date: calendar.date(from: DateComponents(year: 2025, month: 3))!)

        XCTAssertEqual(viewModel.year, 2025)
    }

    func testMonth_ReturnsCorrectMonth() {
        let calendar = Calendar.current
        let viewModel = MonthViewModel(date: calendar.date(from: DateComponents(year: 2024, month: 8))!)

        XCTAssertEqual(viewModel.month, 8)
    }

    func testAllDatesInMonth_ReturnsCorrectCount() {
        let calendar = Calendar.current
        let viewModel = MonthViewModel(date: calendar.date(from: DateComponents(year: 2024, month: 4))!)

        // April has 30 days
        XCTAssertEqual(viewModel.allDatesInMonth.count, 30)
    }
}
