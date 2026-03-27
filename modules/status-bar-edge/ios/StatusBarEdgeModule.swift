import ExpoModulesCore
import UIKit

class StatusBarEdgeView: ExpoView {
  private var didAttach = false

  func attach(scrollViewTag: Int) {
    guard #available(iOS 26.0, *), !didAttach else { return }
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }
      guard let rootView = self.window else { return }
      guard let scrollView = self.findScrollView(tag: scrollViewTag, in: rootView) else {
        print("[StatusBarEdge] ScrollView not found for tag \(scrollViewTag)")
        return
      }
      let interaction = UIScrollEdgeElementContainerInteraction()
      interaction.scrollView = scrollView
      interaction.edge = .top
      self.addInteraction(interaction)
      self.didAttach = true
      print("[StatusBarEdge] Attached successfully")
    }
  }

  private func findScrollView(tag: Int, in view: UIView) -> UIScrollView? {
    // RCTScrollView 包含 UIScrollView 作为子视图
    if let rctScroll = findViewWithTag(tag, in: view) {
      // 直接就是 UIScrollView
      if let sv = rctScroll as? UIScrollView { return sv }
      // RCTScrollView 的第一个子视图是 UIScrollView
      for sub in rctScroll.subviews {
        if let sv = sub as? UIScrollView { return sv }
      }
    }
    return nil
  }

  private func findViewWithTag(_ tag: Int, in view: UIView) -> UIView? {
    if view.reactTag?.intValue == tag { return view }
    for sub in view.subviews {
      if let found = findViewWithTag(tag, in: sub) { return found }
    }
    return nil
  }
}

public class StatusBarEdgeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("StatusBarEdge")
    View(StatusBarEdgeView.self) {
      Prop("scrollViewTag") { (view: StatusBarEdgeView, tag: Int) in
        view.attach(scrollViewTag: tag)
      }
    }
  }
}
