import Foundation
import Observation
import FirebaseFirestore

/// Manages category data and operations
@Observable
final class CategoriesViewModel {
    // MARK: - Published State

    var categories: [Category] = []
    var isLoading = false
    var errorMessage: String?

    // MARK: - Computed Properties

    /// Categories organized as a tree structure
    var categoryTree: [CategoryWithChildren] {
        categories.buildTree()
    }

    /// Flat list of categories with indent levels (for pickers)
    var flatCategories: [(category: Category, level: Int)] {
        categories.flatWithLevel()
    }

    /// Root (top-level) categories only
    var rootCategories: [Category] {
        categories.filter { $0.parentId == nil }.sorted { $0.order < $1.order }
    }

    /// Map of category ID to category (for quick lookup)
    var categoriesById: [String: Category] {
        Dictionary(uniqueKeysWithValues: categories.compactMap { cat in
            guard let id = cat.id else { return nil }
            return (id, cat)
        })
    }

    /// Get children of a category
    func children(of categoryId: String) -> [Category] {
        categories.filter { $0.parentId == categoryId }.sorted { $0.order < $1.order }
    }

    /// Get parent of a category
    func parent(of category: Category) -> Category? {
        guard let parentId = category.parentId else { return nil }
        return categoriesById[parentId]
    }

    /// Get full path of a category (e.g., "Food & Drink > Groceries")
    func categoryPath(_ categoryId: String) -> String {
        guard let category = categoriesById[categoryId] else { return "" }

        var path = [category.name]
        var current = category

        while let parent = parent(of: current) {
            path.insert(parent.name, at: 0)
            current = parent
        }

        return path.joined(separator: " > ")
    }

    // MARK: - Private Properties

    private var listener: ListenerRegistration?

    // MARK: - Lifecycle

    deinit {
        stopListening()
    }

    // MARK: - Data Fetching

    /// Start listening to categories
    func startListening() {
        isLoading = true
        errorMessage = nil

        Task {
            listener = await FirestoreService.shared.categoriesListener { [weak self] categories in
                Task { @MainActor in
                    self?.categories = categories
                    self?.isLoading = false
                }
            }
        }
    }

    /// Stop listening to categories
    func stopListening() {
        listener?.remove()
        listener = nil
    }

    /// Fetch categories once
    func fetch() async {
        isLoading = true
        errorMessage = nil

        do {
            categories = try await FirestoreService.shared.fetchCategories()
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Category Operations

    /// Create a new category
    func createCategory(name: String, icon: String, color: String, parentId: String?) async -> String? {
        let maxOrder = categories.filter { $0.parentId == parentId }.map(\.order).max() ?? 0

        let category = Category(
            id: nil,
            name: name,
            icon: icon,
            color: color,
            parentId: parentId,
            order: maxOrder + 1,
            isSystem: false,
            createdAt: Date(),
            updatedAt: Date()
        )

        do {
            let id = try await FirestoreService.shared.createCategory(category)
            return id
        } catch {
            errorMessage = error.localizedDescription
            return nil
        }
    }

    /// Update an existing category
    func updateCategory(_ category: Category) async {
        do {
            try await FirestoreService.shared.updateCategory(category)

            // Optimistic update
            if let index = categories.firstIndex(where: { $0.id == category.id }) {
                categories[index] = category
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Delete a category and its children
    func deleteCategory(_ categoryId: String) async {
        do {
            try await FirestoreService.shared.deleteCategory(categoryId, categories: categories)

            // Optimistic update
            categories.removeAll { cat in
                cat.id == categoryId || isDescendant(of: categoryId, category: cat)
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Check if a category is a descendant of another
    private func isDescendant(of ancestorId: String, category: Category) -> Bool {
        var current = category
        while let parentId = current.parentId {
            if parentId == ancestorId { return true }
            guard let parent = categoriesById[parentId] else { break }
            current = parent
        }
        return false
    }

    /// Reorder categories
    func reorder(categoryId: String, newOrder: Int, newParentId: String?) async {
        guard var category = categoriesById[categoryId] else { return }

        category.order = newOrder
        if let newParentId {
            category.parentId = newParentId
        }

        await updateCategory(category)
    }
}

// MARK: - Preview Helpers

#if DEBUG
extension CategoriesViewModel {
    static let preview: CategoriesViewModel = {
        let vm = CategoriesViewModel()
        vm.categories = Category.samples
        return vm
    }()
}
#endif
