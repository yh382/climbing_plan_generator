import ExpoModulesCore

public class NativeChatScrollModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NativeChatScroll")

    View(NativeChatScrollView.self) {
      Prop("scrollTrigger") { (view, value: Int) in
        view.handleScrollTrigger(value)
      }
      Prop("scrollToUserTrigger") { (view, value: Int) in
        view.handleScrollToUserTrigger(value)
      }
      Prop("contentHeight") { (view, value: Double) in
        view.contentHeight = CGFloat(value)
      }
      Prop("contentPaddingBottom") { (view, value: Double) in
        view.contentPaddingBottom = CGFloat(value)
      }
      Prop("showsIndicators") { (view, value: Bool) in
        view.showsIndicators = value
      }
    }
  }
}
