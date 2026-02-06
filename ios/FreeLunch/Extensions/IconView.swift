import SwiftUI

/// A view that renders either an SF Symbol (via Image) or an emoji (via Text).
/// Categories from the Cloud Function use emoji icons (💰, 🎁), while iOS-created
/// categories use SF Symbol names (banknote, gift). This view handles both.
struct IconView: View {
    let icon: String

    var body: some View {
        if icon.isSFSymbolName {
            Image(systemName: icon)
        } else {
            Text(icon)
        }
    }
}

extension String {
    /// Returns true if the string looks like an SF Symbol name (ASCII lowercase with dots/numbers).
    /// Emoji and other Unicode characters will return false.
    var isSFSymbolName: Bool {
        !isEmpty && allSatisfy { $0.isASCII && ($0.isLetter || $0.isNumber || $0 == ".") }
    }
}
