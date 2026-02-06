import SwiftUI
import Charts

/// Main dashboard view with spending summary and charts
struct DashboardView: View {
    @Binding var selectedTab: Int
    @Environment(DashboardViewModel.self) private var viewModel
    @Environment(MonthViewModel.self) private var monthViewModel

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Month Selector
                    MonthSelectorView()

                    // Summary Cards
                    SummaryCardsView(
                        totalIncome: viewModel.totalIncome,
                        totalExpenses: viewModel.totalExpenses,
                        netBalance: viewModel.netBalance,
                        pendingReimbursements: viewModel.pendingReimbursements,
                        pendingCount: viewModel.pendingReimbursementsCount,
                        isLoading: viewModel.isLoading
                    )

                    // Spending Drill-Down Entry Cards
                    SpendingEntryCards(
                        totalExpenses: viewModel.totalExpenses,
                        totalIncome: viewModel.totalIncome,
                        isLoading: viewModel.isLoading
                    )

                    // Spending by Category Chart
                    if !viewModel.topSpendingCategories.isEmpty {
                        SpendingByCategoryChart(data: viewModel.topSpendingCategories)
                    }

                    // Budget Alerts
                    if !viewModel.alertBudgets.isEmpty {
                        BudgetAlertsSection(budgets: viewModel.alertBudgets)
                    }

                    // Recent Transactions
                    if !viewModel.recentTransactions.isEmpty {
                        RecentTransactionsSection(
                            transactions: viewModel.recentTransactions,
                            categories: viewModel.categories,
                            selectedTab: $selectedTab
                        )
                    }

                    // Bank Connection Status
                    if viewModel.hasExpiredConnections {
                        BankAlertCard()
                    }
                }
                .padding()
            }
            .navigationTitle("Dashboard")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task {
                            await viewModel.syncTransactions()
                            // Refresh data after sync
                            viewModel.stopListening()
                            viewModel.startListening(dateRange: monthViewModel.dateRange)
                        }
                    } label: {
                        if viewModel.isSyncing {
                            ProgressView()
                        } else {
                            Image(systemName: "arrow.triangle.2.circlepath")
                        }
                    }
                    .disabled(viewModel.isSyncing)
                }
            }
            .refreshable {
                await viewModel.syncTransactions()
                viewModel.stopListening()
                viewModel.startListening(dateRange: monthViewModel.dateRange)
            }
        }
    }
}

// MARK: - Month Selector

struct MonthSelectorView: View {
    @Environment(MonthViewModel.self) private var monthViewModel

    var body: some View {
        HStack {
            Button {
                monthViewModel.goToPreviousMonth()
            } label: {
                Image(systemName: "chevron.left")
                    .fontWeight(.semibold)
            }
            .buttonStyle(.bordered)
            .buttonBorderShape(.circle)

            Spacer()

            VStack(spacing: 2) {
                Text(monthViewModel.monthDisplayString)
                    .font(.headline)

                if !monthViewModel.isCurrentMonth {
                    Button("Today") {
                        monthViewModel.goToCurrentMonth()
                    }
                    .font(.caption)
                }
            }

            Spacer()

            Button {
                monthViewModel.goToNextMonth()
            } label: {
                Image(systemName: "chevron.right")
                    .fontWeight(.semibold)
            }
            .buttonStyle(.bordered)
            .buttonBorderShape(.circle)
        }
        .padding(.horizontal)
    }
}

// MARK: - Summary Cards

struct SummaryCardsView: View {
    let totalIncome: Double
    let totalExpenses: Double
    let netBalance: Double
    let pendingReimbursements: Double
    let pendingCount: Int
    let isLoading: Bool

    var body: some View {
        if isLoading {
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                ForEach(0..<4, id: \.self) { _ in
                    SummaryCardSkeleton()
                }
            }
        } else {
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                SummaryCard(
                    title: "Income",
                    amount: totalIncome,
                    icon: "arrow.up.circle.fill",
                    color: .green
                )

                SummaryCard(
                    title: "Expenses",
                    amount: totalExpenses,
                    icon: "arrow.down.circle.fill",
                    color: .red
                )

                SummaryCard(
                    title: "Net Balance",
                    amount: netBalance,
                    icon: "wallet.pass.fill",
                    color: .blue,
                    showSign: true
                )

                SummaryCard(
                    title: "Pending",
                    amount: pendingReimbursements,
                    icon: "clock.fill",
                    color: .orange,
                    subtitle: "\(pendingCount) expense\(pendingCount != 1 ? "s" : "")"
                )
            }
        }
    }
}

struct SummaryCard: View {
    let title: String
    let amount: Double
    let icon: String
    let color: Color
    var showSign: Bool = false
    var subtitle: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(title)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                Image(systemName: icon)
                    .foregroundStyle(color)
            }

            Text(formatAmount(amount, showSign: showSign))
                .font(.title2)
                .fontWeight(.bold)
                .foregroundStyle(showSign && amount < 0 ? .red : (showSign && amount > 0 ? .green : .primary))

            // Always reserve space for subtitle to keep card heights consistent
            Text(subtitle ?? " ")
                .font(.caption2)
                .foregroundColor(subtitle != nil ? .secondary : .clear)
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }

    private func formatAmount(_ amount: Double, showSign: Bool) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "EUR"
        formatter.locale = Locale(identifier: "nl_NL")
        if showSign && amount > 0 {
            formatter.positivePrefix = "+"
        }
        return formatter.string(from: NSNumber(value: amount)) ?? "EUR \(amount)"
    }
}

struct SummaryCardSkeleton: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color(.systemGray5))
                    .frame(width: 60, height: 12)
                Spacer()
                Circle()
                    .fill(Color(.systemGray5))
                    .frame(width: 20, height: 20)
            }

            RoundedRectangle(cornerRadius: 4)
                .fill(Color(.systemGray5))
                .frame(width: 100, height: 24)

            RoundedRectangle(cornerRadius: 4)
                .fill(Color(.systemGray5))
                .frame(width: 80, height: 10)
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }
}

// MARK: - Spending by Category Chart

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
                    innerRadius: .ratio(0.5),
                    angularInset: 1.5
                )
                .foregroundStyle(Color(hex: item.category.color) ?? .gray)
                .opacity(selectedCategory == nil || selectedCategory == item.category.id ? 1 : 0.5)
                .annotation(position: .overlay) {
                    if item.percentage >= 8 {
                        VStack(spacing: 1) {
                            IconView(icon: item.category.icon)
                                .font(.caption2)
                            Text(item.category.name)
                                .font(.system(size: 9))
                                .lineLimit(1)
                            Text(formatCurrency(item.amount))
                                .font(.system(size: 9, weight: .semibold))
                        }
                        .foregroundStyle(.white)
                    }
                }
            }
            .frame(height: 240)
            .chartAngleSelection(value: $selectedCategory)
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }

    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "EUR"
        formatter.locale = Locale(identifier: "nl_NL")
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: amount)) ?? "EUR \(amount)"
    }
}

// MARK: - Budget Alerts Section

struct BudgetAlertsSection: View {
    let budgets: [BudgetProgress]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(.orange)
                Text("Budget Alerts")
                    .font(.headline)
            }

            ForEach(budgets) { budget in
                HStack {
                    IconView(icon: budget.categoryIcon)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(budget.categoryName)
                            .font(.subheadline)
                            .fontWeight(.medium)

                        ProgressView(value: min(budget.percentage, 100), total: 100)
                            .tint(budget.status == .exceeded ? .red : .orange)
                    }

                    Text("\(Int(budget.percentage))%")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(budget.status == .exceeded ? .red : .orange)
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }
}

// MARK: - Recent Transactions Section

struct RecentTransactionsSection: View {
    let transactions: [Transaction]
    let categories: [Category]
    @Binding var selectedTab: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Recent Transactions")
                    .font(.headline)
                Spacer()
                Button {
                    selectedTab = 1
                } label: {
                    Text("See All")
                        .font(.caption)
                }
            }

            ForEach(transactions) { transaction in
                let category = categories.first { $0.id == transaction.categoryId }
                RecentTransactionRow(transaction: transaction, category: category)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }
}

struct RecentTransactionRow: View {
    let transaction: Transaction
    let category: Category?

    var body: some View {
        HStack {
            // Category icon
            ZStack {
                Circle()
                    .fill(Color(hex: category?.color ?? "#9CA3A0")?.opacity(0.2) ?? .gray.opacity(0.2))
                    .frame(width: 36, height: 36)

                if let icon = category?.icon {
                    IconView(icon: icon)
                        .font(.caption)
                        .foregroundStyle(Color(hex: category?.color ?? "#9CA3A0") ?? .gray)
                } else {
                    Image(systemName: "questionmark.circle")
                        .font(.caption)
                        .foregroundStyle(.gray)
                }
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(transaction.description)
                    .font(.subheadline)
                    .lineLimit(1)

                Text(transaction.date, style: .date)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Text(formatAmount(transaction.amount))
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(transaction.amount >= 0 ? .green : .primary)
        }
    }

    private func formatAmount(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "EUR"
        formatter.locale = Locale(identifier: "nl_NL")
        return formatter.string(from: NSNumber(value: amount)) ?? "EUR \(amount)"
    }
}

// MARK: - Spending Entry Cards

struct SpendingEntryCards: View {
    let totalExpenses: Double
    let totalIncome: Double
    let isLoading: Bool

    var body: some View {
        HStack(spacing: 12) {
            NavigationLink {
                SpendingExplorerView(direction: .expenses)
            } label: {
                SpendingEntryCard(
                    title: "Expenses",
                    amount: totalExpenses,
                    icon: "arrow.down.circle.fill",
                    color: .red,
                    isLoading: isLoading
                )
            }
            .buttonStyle(.plain)

            NavigationLink {
                SpendingExplorerView(direction: .income)
            } label: {
                SpendingEntryCard(
                    title: "Income",
                    amount: totalIncome,
                    icon: "arrow.up.circle.fill",
                    color: .green,
                    isLoading: isLoading
                )
            }
            .buttonStyle(.plain)
        }
    }
}

struct SpendingEntryCard: View {
    let title: String
    let amount: Double
    let icon: String
    let color: Color
    let isLoading: Bool

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.caption)
                    .foregroundStyle(.secondary)

                if isLoading {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color(.systemGray5))
                        .frame(width: 80, height: 20)
                } else {
                    Text(formatCurrency(amount))
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundStyle(color)
                        .monospacedDigit()
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }

    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "EUR"
        formatter.locale = Locale(identifier: "nl_NL")
        return formatter.string(from: NSNumber(value: amount)) ?? "€\(amount)"
    }
}

// MARK: - Bank Alert Card

struct BankAlertCard: View {
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.title2)
                .foregroundStyle(.orange)

            VStack(alignment: .leading, spacing: 4) {
                Text("Bank Connection Expired")
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text("Reconnect your bank to sync new transactions")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .foregroundStyle(.secondary)
        }
        .padding()
        .background(Color.orange.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Preview

#if DEBUG
#Preview {
    DashboardView(selectedTab: .constant(0))
        .environment(DashboardViewModel.preview)
        .environment(MonthViewModel())
}
#endif
