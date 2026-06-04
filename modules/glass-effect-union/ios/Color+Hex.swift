import SwiftUI

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
}
