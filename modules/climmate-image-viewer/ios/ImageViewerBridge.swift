import UIKit
import SwiftUI

/// Bridges the JS imperative `present(...)` call to a custom SwiftUI image
/// viewer (no longer using `QLPreviewController`). The custom viewer:
///
///  - Renders by HTTP `Content-Type` (URLSession + UIImage), so legacy R2 URLs
///    that lack a file extension still display correctly.
///  - Black backdrop, transparent top bar (Close · counter · Share).
///  - Pinch-zoom via wrapped `UIScrollView` (delegate viewForZooming).
///  - Multi-item swipe via `TabView`.
///  - Native iOS share sheet (`UIActivityViewController`).
///  - Videos handled by `AVPlayerViewController` (system controls).
class ImageViewerBridge: NSObject {
  static let shared = ImageViewerBridge()

  func present(urls: [String], types: [String], startIndex: Int) {
    let items: [ImageViewerItem] = zip(urls, types).compactMap { (urlStr, typeStr) in
      guard let url = URL(string: urlStr) else { return nil }
      let isVideo = typeStr.lowercased() == "video"
      return ImageViewerItem(url: url, isVideo: isVideo)
    }
    guard !items.isEmpty else { return }
    let safeStart = max(0, min(startIndex, items.count - 1))

    guard let topVC = topMostViewController() else { return }

    let host = ImageViewerHostingController(items: items, startIndex: safeStart)
    host.modalPresentationStyle = .fullScreen
    host.modalTransitionStyle = .crossDissolve
    topVC.present(host, animated: true)
  }

  private func topMostViewController() -> UIViewController? {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    let activeScene = scenes.first(where: { $0.activationState == .foregroundActive }) ?? scenes.first
    guard let scene = activeScene else { return nil }
    let keyWindow = scene.windows.first(where: { $0.isKeyWindow }) ?? scene.windows.first
    var top = keyWindow?.rootViewController
    while let presented = top?.presentedViewController {
      top = presented
    }
    return top
  }
}

struct ImageViewerItem: Identifiable, Hashable {
  let id = UUID()
  let url: URL
  let isVideo: Bool
}
