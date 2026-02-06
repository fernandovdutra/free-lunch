import Foundation
import FirebaseFirestore
import FirebaseFirestoreSwift

/// Represents a transaction category with hierarchical support
struct Category: Identifiable, Codable, Equatable, Hashable {
    @DocumentID var id: String?
    var name: String
    var icon: String
    var color: String
    var parentId: String?
    var order: Int
    var isSystem: Bool = false
    var createdAt: Date?
    var updatedAt: Date?

    // MARK: - Computed Properties

    /// Whether this is a root (top-level) category
    var isRoot: Bool {
        parentId == nil
    }

    // MARK: - Coding Keys

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case icon
        case color
        case parentId
        case order
        case isSystem
        case createdAt
        case updatedAt
    }
}

// MARK: - Category Tree Node

/// A category with its children, used for building hierarchical views
struct CategoryWithChildren: Identifiable, Equatable {
    var id: String { category.id ?? UUID().uuidString }
    var category: Category
    var children: [CategoryWithChildren]
    var level: Int = 0

    /// Whether this node has children
    var hasChildren: Bool {
        !children.isEmpty
    }

    /// Total number of descendants
    var descendantCount: Int {
        children.reduce(0) { $0 + 1 + $1.descendantCount }
    }
}

// MARK: - Category Tree Builder

extension Array where Element == Category {
    /// Build a tree structure from flat categories
    func buildTree() -> [CategoryWithChildren] {
        var map = [String: CategoryWithChildren]()
        var roots = [CategoryWithChildren]()

        // First pass: create all nodes
        for category in self {
            guard let id = category.id else { continue }
            map[id] = CategoryWithChildren(category: category, children: [], level: 0)
        }

        // Second pass: build tree
        for category in self {
            guard let id = category.id, let node = map[id] else { continue }

            if let parentId = category.parentId, var parent = map[parentId] {
                var updatedNode = node
                updatedNode.level = parent.level + 1
                parent.children.append(updatedNode)
                map[parentId] = parent
            } else {
                roots.append(node)
            }
        }

        // Update map with children and rebuild roots
        roots = []
        for category in self {
            guard let id = category.id else { continue }
            if category.parentId == nil {
                if let node = map[id] {
                    roots.append(node)
                }
            }
        }

        // Sort by order
        let sortByOrder: (CategoryWithChildren, CategoryWithChildren) -> Bool = { $0.category.order < $1.category.order }
        roots.sort(by: sortByOrder)
        for id in map.keys {
            map[id]?.children.sort(by: sortByOrder)
        }

        return roots
    }

    /// Get flat list with indent level for pickers/dropdowns
    func flatWithLevel() -> [(category: Category, level: Int)] {
        let tree = buildTree()
        var result: [(Category, Int)] = []

        func traverse(_ nodes: [CategoryWithChildren], level: Int) {
            for node in nodes {
                result.append((node.category, level))
                traverse(node.children, level: level + 1)
            }
        }

        traverse(tree, level: 0)
        return result
    }
}

// MARK: - Sample Data for Previews

#if DEBUG
extension Category {
    static let sampleFood = Category(
        id: "food",
        name: "Food & Drink",
        icon: "fork.knife",
        color: "#C9A227",
        parentId: nil,
        order: 3,
        isSystem: true
    )

    static let sampleGroceries = Category(
        id: "food-groceries",
        name: "Groceries",
        icon: "cart",
        color: "#C9A227",
        parentId: "food",
        order: 0,
        isSystem: true
    )

    static let sampleRestaurants = Category(
        id: "food-restaurants",
        name: "Restaurants",
        icon: "fork.knife.circle",
        color: "#C9A227",
        parentId: "food",
        order: 1,
        isSystem: true
    )

    static let sampleTransport = Category(
        id: "transport",
        name: "Transport",
        icon: "car",
        color: "#4A6FA5",
        parentId: nil,
        order: 2,
        isSystem: true
    )

    static let sampleIncome = Category(
        id: "income",
        name: "Income",
        icon: "banknote",
        color: "#2D5A4A",
        parentId: nil,
        order: 0,
        isSystem: true
    )

    static let samples: [Category] = [
        .sampleIncome,
        .sampleTransport,
        .sampleFood,
        .sampleGroceries,
        .sampleRestaurants
    ]
}
#endif
