import SwiftUI
import UIKit

// Internal to climmate-charts. AV1 only needs Color(hex:) — kept lerp/darken
// for parity with climmate-activity-ring in case AV2 needs them.
extension Color {
    /// Parse "#RRGGBB" / "RRGGBB" hex; alpha not supported.
    init(hex: String) {
        let s = hex.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        let cleaned = s.hasPrefix("#") ? String(s.dropFirst()) : s
        var rgb: UInt64 = 0
        Scanner(string: cleaned).scanHexInt64(&rgb)
        let r = Double((rgb >> 16) & 0xFF) / 255.0
        let g = Double((rgb >> 8) & 0xFF) / 255.0
        let b = Double(rgb & 0xFF) / 255.0
        self.init(red: r, green: g, blue: b)
    }

    func darken(_ amt: Double) -> Color {
        let (r, g, b) = rgbComponents()
        return Color(red: max(0, r - amt), green: max(0, g - amt), blue: max(0, b - amt))
    }

    func lighten(_ amt: Double) -> Color {
        let (r, g, b) = rgbComponents()
        return Color(red: min(1, r + amt), green: min(1, g + amt), blue: min(1, b + amt))
    }

    static func lerp(_ a: Color, _ b: Color, _ t: Double) -> Color {
        let (r1, g1, b1) = a.rgbComponents()
        let (r2, g2, b2) = b.rgbComponents()
        return Color(
            red:   r1 + (r2 - r1) * t,
            green: g1 + (g2 - g1) * t,
            blue:  b1 + (b2 - b1) * t
        )
    }

    private func rgbComponents() -> (Double, Double, Double) {
        let ui = UIColor(self)
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        ui.getRed(&r, green: &g, blue: &b, alpha: &a)
        return (Double(r), Double(g), Double(b))
    }
}
