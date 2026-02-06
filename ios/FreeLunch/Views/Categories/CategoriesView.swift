import SwiftUI

/// Categories management view with hierarchical tree display
struct CategoriesView: View {
    @Environment(CategoriesViewModel.self) private var viewModel
    @State private var showAddCategory = false
    @State private var editingCategory: Category?
    @State private var expandedCategories: Set<String> = []

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    loadingView
                } else if viewModel.categories.isEmpty {
                    emptyView
                } else {
                    categoriesList
                }
            }
            .navigationTitle("Categories")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showAddCategory = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showAddCategory) {
                CategoryFormSheet(
                    mode: .create,
                    parentCategories: viewModel.rootCategories,
                    onSave: { name, icon, color, parentId in
                        Task {
                            _ = await viewModel.createCategory(name: name, icon: icon, color: color, parentId: parentId)
                        }
                    }
                )
            }
            .sheet(item: $editingCategory) { category in
                CategoryFormSheet(
                    mode: .edit(category),
                    parentCategories: viewModel.rootCategories.filter { $0.id != category.id },
                    onSave: { name, icon, color, parentId in
                        var updated = category
                        updated.name = name
                        updated.icon = icon
                        updated.color = color
                        updated.parentId = parentId
                        Task {
                            await viewModel.updateCategory(updated)
                        }
                    }
                )
            }
        }
    }

    // MARK: - Categories List

    private var categoriesList: some View {
        List {
            ForEach(viewModel.categoryTree, id: \.id) { node in
                CategoryTreeNode(
                    node: node,
                    expandedCategories: $expandedCategories,
                    onEdit: { category in
                        editingCategory = category
                    },
                    onDelete: { categoryId in
                        Task {
                            await viewModel.deleteCategory(categoryId)
                        }
                    }
                )
            }
        }
        .listStyle(.plain)
    }

    // MARK: - Empty View

    private var emptyView: some View {
        ContentUnavailableView {
            Label("No Categories", systemImage: "folder")
        } description: {
            Text("Add categories to organize your transactions")
        } actions: {
            Button("Add Category") {
                showAddCategory = true
            }
            .buttonStyle(.borderedProminent)
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        List {
            ForEach(0..<8, id: \.self) { _ in
                HStack(spacing: 12) {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color(.systemGray5))
                        .frame(width: 36, height: 36)

                    VStack(alignment: .leading, spacing: 4) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color(.systemGray5))
                            .frame(width: 100, height: 14)
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color(.systemGray5))
                            .frame(width: 60, height: 10)
                    }
                }
            }
        }
        .listStyle(.plain)
    }
}

// MARK: - Category Tree Node

struct CategoryTreeNode: View {
    let node: CategoryWithChildren
    @Binding var expandedCategories: Set<String>
    let onEdit: (Category) -> Void
    let onDelete: (String) -> Void

    private var isExpanded: Bool {
        expandedCategories.contains(node.id)
    }

    var body: some View {
        VStack(spacing: 0) {
            // Main Row
            HStack(spacing: 12) {
                // Expand/Collapse Button
                if node.hasChildren {
                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            if isExpanded {
                                expandedCategories.remove(node.id)
                            } else {
                                expandedCategories.insert(node.id)
                            }
                        }
                    } label: {
                        Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                    .frame(width: 20)
                } else {
                    Spacer()
                        .frame(width: 20)
                }

                // Icon
                ZStack {
                    Circle()
                        .fill(Color(hex: node.category.color)?.opacity(0.2) ?? .gray.opacity(0.2))
                        .frame(width: 36, height: 36)

                    IconView(icon: node.category.icon)
                        .font(.body)
                        .foregroundStyle(Color(hex: node.category.color) ?? .gray)
                }

                // Name
                VStack(alignment: .leading, spacing: 2) {
                    Text(node.category.name)
                        .font(.subheadline)
                        .fontWeight(.medium)

                    if node.hasChildren {
                        Text("\(node.children.count) subcategor\(node.children.count == 1 ? "y" : "ies")")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                // System Badge
                if node.category.isSystem {
                    Text("System")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color(.systemGray5))
                        .clipShape(Capsule())
                }
            }
            .padding(.vertical, 8)
            .contentShape(Rectangle())
            .contextMenu {
                Button {
                    onEdit(node.category)
                } label: {
                    Label("Edit", systemImage: "pencil")
                }

                if !node.category.isSystem {
                    Button(role: .destructive) {
                        if let id = node.category.id {
                            onDelete(id)
                        }
                    } label: {
                        Label("Delete", systemImage: "trash")
                    }
                }
            }

            // Children
            if isExpanded {
                ForEach(node.children, id: \.id) { child in
                    CategoryTreeNode(
                        node: child,
                        expandedCategories: $expandedCategories,
                        onEdit: onEdit,
                        onDelete: onDelete
                    )
                    .padding(.leading, 24)
                }
            }
        }
    }
}

// MARK: - Category Form Sheet

struct CategoryFormSheet: View {
    enum Mode {
        case create
        case edit(Category)
    }

    let mode: Mode
    let parentCategories: [Category]
    let onSave: (String, String, String, String?) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var name: String = ""
    @State private var icon: String = "folder"
    @State private var color: String = "#4A6FA5"
    @State private var parentId: String?
    @State private var showIconPicker = false
    @State private var showColorPicker = false

    private let defaultIcons = [
        "folder", "cart", "fork.knife", "car", "house",
        "bag", "film", "heart", "person", "tram",
        "fuelpump", "bolt", "shield", "cup.and.saucer",
        "gift", "briefcase", "graduationcap", "cross.case",
        "book", "gamecontroller", "tv", "desktopcomputer"
    ]

    private let defaultColors = [
        "#2D5A4A", "#5B6E8A", "#4A6FA5", "#C9A227",
        "#A67B8A", "#7B6B8A", "#4A9A8A", "#B87D4B",
        "#9CA3A0", "#DC2626", "#059669", "#7C3AED"
    ]

    var body: some View {
        NavigationStack {
            Form {
                Section("Name") {
                    TextField("Category name", text: $name)
                }

                Section("Icon") {
                    Button {
                        showIconPicker = true
                    } label: {
                        HStack {
                            IconView(icon: icon)
                                .font(.title2)
                                .foregroundStyle(Color(hex: color) ?? .blue)
                            Text("Choose Icon")
                            Spacer()
                            Image(systemName: "chevron.right")
                                .foregroundStyle(.secondary)
                        }
                    }
                    .tint(.primary)
                }

                Section("Color") {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 6), spacing: 12) {
                        ForEach(defaultColors, id: \.self) { colorHex in
                            Button {
                                color = colorHex
                            } label: {
                                Circle()
                                    .fill(Color(hex: colorHex) ?? .gray)
                                    .frame(width: 36, height: 36)
                                    .overlay {
                                        if color == colorHex {
                                            Image(systemName: "checkmark")
                                                .foregroundStyle(.white)
                                                .fontWeight(.bold)
                                        }
                                    }
                            }
                        }
                    }
                    .padding(.vertical, 4)
                }

                Section("Parent Category") {
                    Picker("Parent", selection: $parentId) {
                        Text("None (Top Level)").tag(nil as String?)

                        ForEach(parentCategories, id: \.id) { category in
                            HStack {
                                IconView(icon: category.icon)
                                Text(category.name)
                            }
                            .tag(category.id as String?)
                        }
                    }
                }
            }
            .navigationTitle(mode.isEdit ? "Edit Category" : "New Category")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") {
                        onSave(name, icon, color, parentId)
                        dismiss()
                    }
                    .disabled(name.isEmpty)
                }
            }
            .sheet(isPresented: $showIconPicker) {
                IconPickerSheet(selectedIcon: $icon, icons: defaultIcons)
            }
            .onAppear {
                if case .edit(let category) = mode {
                    name = category.name
                    icon = category.icon
                    color = category.color
                    parentId = category.parentId
                }
            }
        }
    }
}

extension CategoryFormSheet.Mode {
    var isEdit: Bool {
        if case .edit = self { return true }
        return false
    }
}

// MARK: - Icon Picker Sheet

struct IconPickerSheet: View {
    @Binding var selectedIcon: String
    let icons: [String]
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 5), spacing: 16) {
                    ForEach(icons, id: \.self) { icon in
                        Button {
                            selectedIcon = icon
                            dismiss()
                        } label: {
                            ZStack {
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(selectedIcon == icon ? Color.blue.opacity(0.2) : Color(.systemGray6))
                                    .frame(width: 56, height: 56)

                                Image(systemName: icon)
                                    .font(.title2)
                                    .foregroundStyle(selectedIcon == icon ? .blue : .primary)
                            }
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Choose Icon")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.medium])
    }
}

// MARK: - Preview

#if DEBUG
#Preview {
    CategoriesView()
        .environment(CategoriesViewModel.preview)
}
#endif
