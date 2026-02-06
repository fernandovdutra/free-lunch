import SwiftUI

/// A row showing category spending with horizontal bar indicator
struct CategoryRowView: View {
    let name: String
    let icon: String
    let color: String
    let amount: Double
    let percentage: Double
    let transactionCount: Int

    var body: some View {
        HStack(spacing: 12) {
            // Icon
            ZStack {
                Circle()
                    .fill((Color(hex: color) ?? .gray).opacity(0.15))
                    .frame(width: 36, height: 36)
                IconView(icon: icon)
                    .font(.caption)
                    .foregroundStyle(Color(hex: color) ?? .gray)
            }

            // Name and count
            VStack(alignment: .leading, spacing: 2) {
                Text(name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(1)

                Text("\(transactionCount) transaction\(transactionCount != 1 ? "s" : "")")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Amount and percentage
            VStack(alignment: .trailing, spacing: 2) {
                Text(formatCurrency(amount))
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .monospacedDigit()

                Text(String(format: "%.1f%%", percentage))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background(
            GeometryReader { geometry in
                RoundedRectangle(cornerRadius: 8)
                    .fill((Color(hex: color) ?? .gray).opacity(0.08))
                    .frame(width: geometry.size.width * max(CGFloat(percentage) / 100, 0.02))
            }
        )
    }

    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "EUR"
        formatter.locale = Locale(identifier: "nl_NL")
        return formatter.string(from: NSNumber(value: amount)) ?? "€\(amount)"
    }
}

// MARK: - Preview

#if DEBUG
#Preview {
    VStack(spacing: 4) {
        CategoryRowView(
            name: "Food & Drink",
            icon: "fork.knife",
            color: "#C9A227",
            amount: 850,
            percentage: 34.7,
            transactionCount: 15
        )
        CategoryRowView(
            name: "Transport",
            icon: "car",
            color: "#4A6FA5",
            amount: 450,
            percentage: 18.4,
            transactionCount: 8
        )
    }
    .padding()
}
#endif
