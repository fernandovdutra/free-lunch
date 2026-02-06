import Foundation
import Observation

/// Manages the selected month for filtering data
@Observable
final class MonthViewModel {
    // MARK: - Published State

    /// The first day of the currently selected month
    var selectedMonth: Date

    // MARK: - Computed Properties

    /// Date range for the selected month (start to end)
    var dateRange: ClosedRange<Date> {
        let calendar = Calendar.current
        let start = calendar.date(from: calendar.dateComponents([.year, .month], from: selectedMonth))!
        var components = DateComponents()
        components.month = 1
        components.second = -1
        let end = calendar.date(byAdding: components, to: start)!
        return start...end
    }

    /// Start date of the selected month
    var startDate: Date {
        dateRange.lowerBound
    }

    /// End date of the selected month
    var endDate: Date {
        dateRange.upperBound
    }

    /// Whether the selected month is the current month
    var isCurrentMonth: Bool {
        Calendar.current.isDate(selectedMonth, equalTo: Date(), toGranularity: .month)
    }

    /// Display string for the selected month (e.g., "February 2024")
    var monthDisplayString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: selectedMonth)
    }

    /// Short display string (e.g., "Feb 2024")
    var shortMonthDisplayString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM yyyy"
        return formatter.string(from: selectedMonth)
    }

    /// Year of the selected month
    var year: Int {
        Calendar.current.component(.year, from: selectedMonth)
    }

    /// Month number (1-12)
    var month: Int {
        Calendar.current.component(.month, from: selectedMonth)
    }

    // MARK: - Initialization

    init() {
        let calendar = Calendar.current
        self.selectedMonth = calendar.date(from: calendar.dateComponents([.year, .month], from: Date()))!
    }

    init(date: Date) {
        let calendar = Calendar.current
        self.selectedMonth = calendar.date(from: calendar.dateComponents([.year, .month], from: date))!
    }

    // MARK: - Navigation Methods

    /// Move to the next month
    func goToNextMonth() {
        guard let nextMonth = Calendar.current.date(byAdding: .month, value: 1, to: selectedMonth) else { return }
        selectedMonth = nextMonth
    }

    /// Move to the previous month
    func goToPreviousMonth() {
        guard let previousMonth = Calendar.current.date(byAdding: .month, value: -1, to: selectedMonth) else { return }
        selectedMonth = previousMonth
    }

    /// Jump to the current month
    func goToCurrentMonth() {
        let calendar = Calendar.current
        selectedMonth = calendar.date(from: calendar.dateComponents([.year, .month], from: Date()))!
    }

    /// Set to a specific month
    func setMonth(_ date: Date) {
        let calendar = Calendar.current
        selectedMonth = calendar.date(from: calendar.dateComponents([.year, .month], from: date))!
    }

    /// Move by a number of months (positive for future, negative for past)
    func moveByMonths(_ count: Int) {
        guard let newMonth = Calendar.current.date(byAdding: .month, value: count, to: selectedMonth) else { return }
        selectedMonth = newMonth
    }

    // MARK: - Helper Methods

    /// Get the number of days in the selected month
    var daysInMonth: Int {
        let calendar = Calendar.current
        let range = calendar.range(of: .day, in: .month, for: selectedMonth)!
        return range.count
    }

    /// Get the day of week for the first day of the month (1 = Sunday, 7 = Saturday)
    var firstWeekday: Int {
        Calendar.current.component(.weekday, from: startDate)
    }

    /// Get all dates in the selected month
    var allDatesInMonth: [Date] {
        let calendar = Calendar.current
        var dates: [Date] = []
        var currentDate = startDate

        while currentDate <= endDate {
            dates.append(currentDate)
            guard let nextDate = calendar.date(byAdding: .day, value: 1, to: currentDate) else { break }
            currentDate = nextDate
        }

        return dates
    }
}

// MARK: - Preview Helpers

#if DEBUG
extension MonthViewModel {
    static let preview: MonthViewModel = {
        let vm = MonthViewModel()
        return vm
    }()

    static let previousMonth: MonthViewModel = {
        let vm = MonthViewModel()
        vm.goToPreviousMonth()
        return vm
    }()
}
#endif
