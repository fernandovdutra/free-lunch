import SwiftUI

extension Color {
    /// Initialize Color from hex string (e.g., "#FF5733" or "FF5733")
    init?(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")

        var rgb: UInt64 = 0

        guard Scanner(string: hexSanitized).scanHexInt64(&rgb) else {
            return nil
        }

        let length = hexSanitized.count

        switch length {
        case 3: // RGB (12-bit)
            let r = Double((rgb >> 8) & 0xF) / 15.0
            let g = Double((rgb >> 4) & 0xF) / 15.0
            let b = Double(rgb & 0xF) / 15.0
            self.init(red: r, green: g, blue: b)

        case 6: // RGB (24-bit)
            let r = Double((rgb >> 16) & 0xFF) / 255.0
            let g = Double((rgb >> 8) & 0xFF) / 255.0
            let b = Double(rgb & 0xFF) / 255.0
            self.init(red: r, green: g, blue: b)

        case 8: // ARGB (32-bit)
            let a = Double((rgb >> 24) & 0xFF) / 255.0
            let r = Double((rgb >> 16) & 0xFF) / 255.0
            let g = Double((rgb >> 8) & 0xFF) / 255.0
            let b = Double(rgb & 0xFF) / 255.0
            self.init(red: r, green: g, blue: b, opacity: a)

        default:
            return nil
        }
    }

    /// Convert Color to hex string
    var hexString: String {
        guard let components = cgColor?.components, components.count >= 3 else {
            return "#000000"
        }

        let r = Int(components[0] * 255)
        let g = Int(components[1] * 255)
        let b = Int(components[2] * 255)

        return String(format: "#%02X%02X%02X", r, g, b)
    }
}

// MARK: - App Colors

extension Color {
    /// Free Lunch brand colors
    enum FreeLunch {
        static let income = Color(hex: "#2D5A4A")!
        static let expense = Color(hex: "#DC2626")!
        static let pending = Color(hex: "#C9A227")!
        static let neutral = Color(hex: "#5B6E8A")!
    }

    /// Category default colors
    static let categoryColors: [String] = [
        "#2D5A4A", // Green (Income)
        "#5B6E8A", // Blue Gray (Housing)
        "#4A6FA5", // Blue (Transport)
        "#C9A227", // Gold (Food)
        "#A67B8A", // Mauve (Shopping)
        "#7B6B8A", // Purple (Entertainment)
        "#4A9A8A", // Teal (Health)
        "#B87D4B", // Brown (Personal)
        "#9CA3A0", // Gray (Other)
        "#DC2626", // Red
        "#059669", // Emerald
        "#7C3AED"  // Violet
    ]
}
