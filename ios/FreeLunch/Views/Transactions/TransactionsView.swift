import SwiftUI

/// Main transactions list view with filters and swipe actions
struct TransactionsView: View {
    @Environment(TransactionsViewModel.self) private var viewModel
    @Environment(CategoriesViewModel.self) private var categoriesViewModel
    @Environment(MonthViewModel.self) private var monthViewModel
    @State private var showFilters = false
    @State private var selectedTransaction: Transaction?
    @State private var showCategoryPicker = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Month Selector
                MonthSelectorView()
                    .padding(.vertical, 8)

                // Search Bar
                searchBar

                // Filter Chips
                if viewModel.hasActiveFilters {
                    filterChips
                }

                // Transactions List
                if viewModel.isLoading {
                    loadingView
                } else if viewModel.filteredTransactions.isEmpty {
                    emptyView
                } else {
                    transactionsList
                }
            }
            .navigationTitle("Transactions")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showFilters = true
                    } label: {
                        Image(systemName: viewModel.hasActiveFilters ? "line.3.horizontal.decrease.circle.fill" : "line.3.horizontal.decrease.circle")
                    }
                }
            }
            .sheet(isPresented: $showFilters) {
                TransactionFiltersSheet(viewModel: viewModel, categories: categoriesViewModel.categories)
            }
            .sheet(item: $selectedTransaction) { transaction in
                CategoryPickerSheet(
                    transaction: transaction,
                    categories: categoriesViewModel.flatCategories,
                    onSelect: { categoryId in
                        Task {
                            await viewModel.updateCategory(transactionId: transaction.id ?? "", categoryId: categoryId)
                        }
                        selectedTransaction = nil
                    }
                )
            }
        }
    }

    // MARK: - Search Bar

    @ViewBuilder
    private var searchBar: some View {
        @Bindable var vm = viewModel
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(.secondary)

            TextField("Search transactions", text: $vm.searchText)
                .textFieldStyle(.plain)

            if !viewModel.searchText.isEmpty {
                Button {
                    viewModel.searchText = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(12)
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .padding(.horizontal)
    }

    // MARK: - Filter Chips

    private var filterChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                if viewModel.selectedDirection != .all {
                    FilterChip(
                        label: viewModel.selectedDirection.rawValue,
                        onRemove: { viewModel.selectedDirection = .all }
                    )
                }

                if viewModel.selectedReimbursementStatus != .all {
                    FilterChip(
                        label: viewModel.selectedReimbursementStatus.rawValue,
                        onRemove: { viewModel.selectedReimbursementStatus = .all }
                    )
                }

                if viewModel.selectedCategoryId != nil {
                    let categoryName = categoriesViewModel.categories.first { $0.id == viewModel.selectedCategoryId }?.name ?? "Category"
                    FilterChip(
                        label: categoryName,
                        onRemove: { viewModel.selectedCategoryId = nil }
                    )
                }

                Button("Clear All") {
                    viewModel.clearFilters()
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
        }
    }

    // MARK: - Transactions List

    private var transactionsList: some View {
        List {
            ForEach(viewModel.transactionsByDate, id: \.date) { group in
                Section {
                    ForEach(group.transactions) { transaction in
                        let category = categoriesViewModel.categories.first { $0.id == transaction.categoryId }
                        TransactionRowView(
                            transaction: transaction,
                            category: category,
                            onCategoryTap: {
                                selectedTransaction = transaction
                            }
                        )
                        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                            Button {
                                selectedTransaction = transaction
                            } label: {
                                Label("Categorize", systemImage: "folder")
                            }
                            .tint(.blue)
                        }
                        .swipeActions(edge: .leading, allowsFullSwipe: false) {
                            if transaction.reimbursement == nil {
                                Button {
                                    Task {
                                        await viewModel.markAsReimbursable(
                                            transactionId: transaction.id ?? "",
                                            type: .work,
                                            note: nil
                                        )
                                    }
                                } label: {
                                    Label("Reimbursable", systemImage: "arrow.uturn.left")
                                }
                                .tint(.orange)
                            }
                        }
                    }
                } header: {
                    Text(group.date, style: .date)
                }
            }
        }
        .listStyle(.plain)
        .refreshable {
            await viewModel.refresh(dateRange: monthViewModel.dateRange)
        }
    }

    // MARK: - Empty View

    private var emptyView: some View {
        ContentUnavailableView {
            Label("No Transactions", systemImage: "tray")
        } description: {
            if viewModel.hasActiveFilters {
                Text("No transactions match your filters")
            } else {
                Text("No transactions for this month")
            }
        } actions: {
            if viewModel.hasActiveFilters {
                Button("Clear Filters") {
                    viewModel.clearFilters()
                }
            }
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        List {
            ForEach(0..<10, id: \.self) { _ in
                TransactionRowSkeleton()
            }
        }
        .listStyle(.plain)
    }
}

// MARK: - Transaction Row

struct TransactionRowView: View {
    let transaction: Transaction
    let category: Category?
    let onCategoryTap: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            // Date Column
            VStack(alignment: .leading, spacing: 2) {
                Text(transaction.date, format: .dateTime.day().month(.abbreviated))
                    .font(.caption)
                    .fontWeight(.medium)

                if let time = transaction.transactionDate {
                    Text(time, format: .dateTime.hour().minute())
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
            .frame(width: 50, alignment: .leading)

            // Description & Badges
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
                            .lineLimit(1)
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
            AmountText(amount: transaction.amount, isPending: transaction.hasPendingReimbursement)
        }
        .padding(.vertical, 4)
    }
}

struct TransactionRowSkeleton: View {
    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color(.systemGray5))
                    .frame(width: 40, height: 12)
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color(.systemGray5))
                    .frame(width: 30, height: 10)
            }

            VStack(alignment: .leading, spacing: 4) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color(.systemGray5))
                    .frame(width: 120, height: 14)
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color(.systemGray5))
                    .frame(width: 80, height: 10)
            }

            Spacer()

            RoundedRectangle(cornerRadius: 4)
                .fill(Color(.systemGray5))
                .frame(width: 60, height: 14)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Reimbursement Badge

struct ReimbursementBadge: View {
    let info: ReimbursementInfo

    var body: some View {
        HStack(spacing: 2) {
            Image(systemName: info.status == .pending ? "clock" : "checkmark.circle")
                .font(.caption2)

            Text(info.type == .work ? "Work" : "Personal")
                .font(.caption2)
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 2)
        .background(info.status == .pending ? Color.orange.opacity(0.2) : Color.green.opacity(0.2))
        .foregroundStyle(info.status == .pending ? .orange : .green)
        .clipShape(Capsule())
    }
}

// MARK: - Category Badge

struct CategoryBadge: View {
    let category: Category

    var body: some View {
        HStack(spacing: 4) {
            IconView(icon: category.icon)
                .font(.caption)

            Text(category.name)
                .font(.caption)
                .lineLimit(1)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color(hex: category.color)?.opacity(0.2) ?? .gray.opacity(0.2))
        .foregroundStyle(Color(hex: category.color) ?? .gray)
        .clipShape(Capsule())
    }
}

// MARK: - Amount Text

struct AmountText: View {
    let amount: Double
    var isPending: Bool = false

    var body: some View {
        Text(formatAmount())
            .font(.subheadline)
            .fontWeight(.medium)
            .foregroundColor(isPending ? .secondary : (amount >= 0 ? Color.green : .primary))
            .strikethrough(isPending)
    }

    private func formatAmount() -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "EUR"
        formatter.locale = Locale(identifier: "nl_NL")
        return formatter.string(from: NSNumber(value: amount)) ?? "EUR \(amount)"
    }
}

// MARK: - Filter Chip

struct FilterChip: View {
    let label: String
    let onRemove: () -> Void

    var body: some View {
        HStack(spacing: 4) {
            Text(label)
                .font(.caption)

            Button(action: onRemove) {
                Image(systemName: "xmark.circle.fill")
                    .font(.caption)
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Color(.systemGray5))
        .clipShape(Capsule())
    }
}

// MARK: - Filters Sheet

struct TransactionFiltersSheet: View {
    @Bindable var viewModel: TransactionsViewModel
    let categories: [Category]
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Direction") {
                    Picker("Direction", selection: $viewModel.selectedDirection) {
                        ForEach(TransactionsViewModel.TransactionDirection.allCases, id: \.self) { direction in
                            Text(direction.rawValue).tag(direction)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                Section("Reimbursement") {
                    Picker("Status", selection: $viewModel.selectedReimbursementStatus) {
                        ForEach(TransactionsViewModel.ReimbursementFilter.allCases, id: \.self) { status in
                            Text(status.rawValue).tag(status)
                        }
                    }
                }

                Section("Category") {
                    Picker("Category", selection: $viewModel.selectedCategoryId) {
                        Text("All Categories").tag(nil as String?)
                        Text("Uncategorized").tag("uncategorized" as String?)

                        ForEach(categories.flatWithLevel(), id: \.category.id) { item in
                            Text(String(repeating: "  ", count: item.level) + item.category.name)
                                .tag(item.category.id as String?)
                        }
                    }
                }
            }
            .navigationTitle("Filters")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Clear") {
                        viewModel.clearFilters()
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.medium])
    }
}

// MARK: - Category Picker Sheet

struct CategoryPickerSheet: View {
    let transaction: Transaction
    let categories: [(category: Category, level: Int)]
    let onSelect: (String?) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                Button {
                    onSelect(nil)
                } label: {
                    HStack {
                        Image(systemName: "xmark.circle")
                        Text("Remove Category")
                        Spacer()
                        if transaction.categoryId == nil {
                            Image(systemName: "checkmark")
                                .foregroundStyle(.blue)
                        }
                    }
                }

                ForEach(categories, id: \.category.id) { item in
                    Button {
                        onSelect(item.category.id)
                    } label: {
                        HStack {
                            Text(String(repeating: "  ", count: item.level))
                            IconView(icon: item.category.icon)
                                .foregroundStyle(Color(hex: item.category.color) ?? .gray)
                            Text(item.category.name)
                            Spacer()
                            if transaction.categoryId == item.category.id {
                                Image(systemName: "checkmark")
                                    .foregroundStyle(.blue)
                            }
                        }
                    }
                    .tint(.primary)
                }
            }
            .navigationTitle("Select Category")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}

// MARK: - Preview

#if DEBUG
#Preview {
    TransactionsView()
        .environment(TransactionsViewModel.preview)
        .environment(CategoriesViewModel.preview)
        .environment(MonthViewModel())
}
#endif
