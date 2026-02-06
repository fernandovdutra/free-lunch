import SwiftUI

/// Budgets management view with progress cards
struct BudgetsView: View {
    @Environment(BudgetsViewModel.self) private var viewModel
    @Environment(CategoriesViewModel.self) private var categoriesViewModel
    @Environment(MonthViewModel.self) private var monthViewModel
    @State private var showAddBudget = false
    @State private var editingBudget: Budget?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Month Selector
                    MonthSelectorView()

                    // Overall Summary
                    if !viewModel.budgetProgress.isEmpty {
                        overallSummary
                    }

                    // Budget Cards
                    if viewModel.isLoading {
                        loadingView
                    } else if viewModel.budgetProgress.isEmpty {
                        emptyView
                    } else {
                        budgetsList
                    }
                }
                .padding()
            }
            .navigationTitle("Budgets")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showAddBudget = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showAddBudget) {
                BudgetFormSheet(
                    mode: .create,
                    categories: categoriesViewModel.flatCategories,
                    existingBudgetCategoryIds: Set(viewModel.budgets.map(\.categoryId)),
                    onSave: { name, categoryId, limit, threshold in
                        Task {
                            _ = await viewModel.createBudget(
                                name: name,
                                categoryId: categoryId,
                                monthlyLimit: limit,
                                alertThreshold: threshold
                            )
                        }
                    }
                )
            }
            .sheet(item: $editingBudget) { budget in
                BudgetFormSheet(
                    mode: .edit(budget),
                    categories: categoriesViewModel.flatCategories,
                    existingBudgetCategoryIds: Set(viewModel.budgets.filter { $0.id != budget.id }.map(\.categoryId)),
                    onSave: { name, categoryId, limit, threshold in
                        var updated = budget
                        updated.name = name
                        updated.categoryId = categoryId
                        updated.monthlyLimit = limit
                        updated.alertThreshold = threshold
                        Task {
                            await viewModel.updateBudget(updated)
                        }
                    }
                )
            }
        }
        .onAppear {
            // Sync transactions and categories for progress calculation
            viewModel.categories = categoriesViewModel.categories
        }
        .onChange(of: categoriesViewModel.categories) { _, newCategories in
            viewModel.categories = newCategories
        }
    }

    // MARK: - Overall Summary

    private var overallSummary: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Monthly Overview")
                    .font(.headline)
                Spacer()
                Text(monthViewModel.monthDisplayString)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            // Progress bar
            VStack(spacing: 8) {
                HStack {
                    Text(formatCurrency(viewModel.totalBudgetSpent))
                        .fontWeight(.semibold)
                    Text("of")
                        .foregroundStyle(.secondary)
                    Text(formatCurrency(viewModel.totalBudgetLimit))
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text("\(Int(viewModel.overallBudgetPercentage))%")
                        .fontWeight(.semibold)
                        .foregroundStyle(overallStatusColor)
                }
                .font(.subheadline)

                ProgressView(value: min(viewModel.overallBudgetPercentage, 100), total: 100)
                    .tint(overallStatusColor)
            }

            // Quick stats
            HStack(spacing: 24) {
                VStack {
                    Text("\(viewModel.exceededBudgets.count)")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(.red)
                    Text("Exceeded")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Divider()
                    .frame(height: 40)

                VStack {
                    Text("\(viewModel.warningBudgets.count)")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(.orange)
                    Text("Warning")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Divider()
                    .frame(height: 40)

                VStack {
                    Text("\(viewModel.budgetProgress.filter { $0.status == .safe }.count)")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(.green)
                    Text("On Track")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }

    private var overallStatusColor: Color {
        let percentage = viewModel.overallBudgetPercentage
        if percentage >= 100 {
            return .red
        } else if percentage >= 80 {
            return .orange
        }
        return .green
    }

    // MARK: - Budgets List

    private var budgetsList: some View {
        LazyVStack(spacing: 12) {
            ForEach(viewModel.budgetProgress) { progress in
                BudgetCard(
                    progress: progress,
                    onEdit: {
                        editingBudget = progress.budget
                    },
                    onDelete: {
                        Task {
                            await viewModel.deleteBudget(progress.budget.id ?? "")
                        }
                    }
                )
            }
        }
    }

    // MARK: - Empty View

    private var emptyView: some View {
        ContentUnavailableView {
            Label("No Budgets", systemImage: "chart.bar")
        } description: {
            Text("Create budgets to track your spending by category")
        } actions: {
            Button("Create Budget") {
                showAddBudget = true
            }
            .buttonStyle(.borderedProminent)
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        LazyVStack(spacing: 12) {
            ForEach(0..<3, id: \.self) { _ in
                BudgetCardSkeleton()
            }
        }
    }

    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "EUR"
        formatter.locale = Locale(identifier: "nl_NL")
        return formatter.string(from: NSNumber(value: amount)) ?? "EUR \(amount)"
    }
}

// MARK: - Budget Card

struct BudgetCard: View {
    let progress: BudgetProgress
    let onEdit: () -> Void
    let onDelete: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            // Header
            HStack {
                // Category Icon
                ZStack {
                    Circle()
                        .fill(Color(hex: progress.categoryColor)?.opacity(0.2) ?? .gray.opacity(0.2))
                        .frame(width: 40, height: 40)

                    IconView(icon: progress.categoryIcon)
                        .foregroundStyle(Color(hex: progress.categoryColor) ?? .gray)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(progress.budget.name)
                        .font(.headline)

                    Text(progress.categoryName)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                // Status Badge
                StatusBadge(status: progress.status)
            }

            // Progress Bar
            VStack(spacing: 6) {
                ProgressView(value: min(progress.percentage, 100), total: 100)
                    .tint(statusColor(for: progress.status))

                HStack {
                    Text(progress.spentFormatted)
                        .fontWeight(.medium)

                    Spacer()

                    Text("\(Int(progress.percentage))%")
                        .fontWeight(.semibold)
                        .foregroundStyle(statusColor(for: progress.status))
                }
                .font(.subheadline)

                HStack {
                    Text("Remaining: \(progress.remainingFormatted)")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    Spacer()

                    Text("Limit: \(progress.limitFormatted)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
        .contextMenu {
            Button {
                onEdit()
            } label: {
                Label("Edit", systemImage: "pencil")
            }

            Button(role: .destructive) {
                onDelete()
            } label: {
                Label("Delete", systemImage: "trash")
            }
        }
    }

    private func statusColor(for status: BudgetStatus) -> Color {
        switch status {
        case .safe: return .green
        case .warning: return .orange
        case .exceeded: return .red
        }
    }
}

struct StatusBadge: View {
    let status: BudgetStatus

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: status.icon)
                .font(.caption)

            Text(status.rawValue.capitalized)
                .font(.caption)
                .fontWeight(.medium)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(backgroundColor)
        .foregroundStyle(foregroundColor)
        .clipShape(Capsule())
    }

    private var backgroundColor: Color {
        switch status {
        case .safe: return .green.opacity(0.2)
        case .warning: return .orange.opacity(0.2)
        case .exceeded: return .red.opacity(0.2)
        }
    }

    private var foregroundColor: Color {
        switch status {
        case .safe: return .green
        case .warning: return .orange
        case .exceeded: return .red
        }
    }
}

struct BudgetCardSkeleton: View {
    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Circle()
                    .fill(Color(.systemGray5))
                    .frame(width: 40, height: 40)

                VStack(alignment: .leading, spacing: 4) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color(.systemGray5))
                        .frame(width: 100, height: 16)
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color(.systemGray5))
                        .frame(width: 60, height: 12)
                }

                Spacer()

                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(.systemGray5))
                    .frame(width: 60, height: 24)
            }

            VStack(spacing: 6) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color(.systemGray5))
                    .frame(height: 8)

                HStack {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color(.systemGray5))
                        .frame(width: 80, height: 14)
                    Spacer()
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color(.systemGray5))
                        .frame(width: 40, height: 14)
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }
}

// MARK: - Budget Form Sheet

struct BudgetFormSheet: View {
    enum Mode {
        case create
        case edit(Budget)
    }

    let mode: Mode
    let categories: [(category: Category, level: Int)]
    let existingBudgetCategoryIds: Set<String>
    let onSave: (String, String, Double, Double) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var categoryId: String?
    @State private var monthlyLimit = ""
    @State private var alertThreshold = 80.0

    private var availableCategories: [(category: Category, level: Int)] {
        categories.filter { item in
            guard let id = item.category.id else { return false }
            // Exclude categories that already have budgets (unless editing that budget)
            if case .edit(let budget) = mode {
                return !existingBudgetCategoryIds.contains(id) || id == budget.categoryId
            }
            return !existingBudgetCategoryIds.contains(id)
        }
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Budget Name") {
                    TextField("e.g., Monthly Food Budget", text: $name)
                }

                Section("Category") {
                    Picker("Category", selection: $categoryId) {
                        Text("Select a category").tag(nil as String?)

                        ForEach(availableCategories, id: \.category.id) { item in
                            HStack {
                                Text(String(repeating: "  ", count: item.level))
                                IconView(icon: item.category.icon)
                                    .foregroundStyle(Color(hex: item.category.color) ?? .gray)
                                Text(item.category.name)
                            }
                            .tag(item.category.id as String?)
                        }
                    }
                }

                Section("Monthly Limit") {
                    HStack {
                        Text("EUR")
                            .foregroundStyle(.secondary)
                        TextField("0.00", text: $monthlyLimit)
                            .keyboardType(.decimalPad)
                    }
                }

                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Alert Threshold: \(Int(alertThreshold))%")

                        Slider(value: $alertThreshold, in: 50...100, step: 5)
                    }
                } header: {
                    Text("Alert Threshold")
                } footer: {
                    Text("You'll be alerted when spending reaches this percentage of your budget")
                }
            }
            .navigationTitle(mode.isEdit ? "Edit Budget" : "New Budget")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") {
                        let limit = Double(monthlyLimit.replacingOccurrences(of: ",", with: ".")) ?? 0
                        onSave(name, categoryId ?? "", limit, alertThreshold)
                        dismiss()
                    }
                    .disabled(name.isEmpty || categoryId == nil || monthlyLimit.isEmpty)
                }
            }
            .onAppear {
                if case .edit(let budget) = mode {
                    name = budget.name
                    categoryId = budget.categoryId
                    monthlyLimit = String(format: "%.2f", budget.monthlyLimit)
                    alertThreshold = budget.alertThreshold
                }
            }
        }
    }
}

extension BudgetFormSheet.Mode {
    var isEdit: Bool {
        if case .edit = self { return true }
        return false
    }
}

// MARK: - Preview

#if DEBUG
#Preview {
    BudgetsView()
        .environment(BudgetsViewModel.preview)
        .environment(CategoriesViewModel.preview)
        .environment(MonthViewModel())
}
#endif
