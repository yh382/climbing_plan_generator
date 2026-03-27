import ExpoModulesCore
import UIKit

class NativeChatScrollView: ExpoView {
  private let scrollView = UIScrollView()
  private var _contentHeight: CGFloat = 0
  private var _contentPaddingBottom: CGFloat = 180
  private var _scrollTrigger: Int = 0
  private var _scrollToUserTrigger: Int = 0

  var contentHeight: CGFloat {
    get { _contentHeight }
    set {
      _contentHeight = newValue
      updateContentSize()
    }
  }

  var contentPaddingBottom: CGFloat {
    get { _contentPaddingBottom }
    set {
      _contentPaddingBottom = newValue
      scrollView.contentInset.bottom = newValue
    }
  }

  var showsIndicators: Bool = false {
    didSet {
      scrollView.showsVerticalScrollIndicator = showsIndicators
    }
  }

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)

    scrollView.alwaysBounceVertical = true
    scrollView.showsVerticalScrollIndicator = false
    scrollView.showsHorizontalScrollIndicator = false
    scrollView.contentInsetAdjustmentBehavior = .never
    scrollView.contentInset.bottom = _contentPaddingBottom

    addSubview(scrollView)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    scrollView.frame = bounds
    updateContentSize()
  }

  // Redirect React Native children into the scroll view
  override func insertReactSubview(_ subview: UIView!, at atIndex: Int) {
    scrollView.insertSubview(subview, at: atIndex)
  }

  override func removeReactSubview(_ subview: UIView!) {
    subview.removeFromSuperview()
  }

  // MARK: - Scroll triggers

  func handleScrollTrigger(_ value: Int) {
    guard value != _scrollTrigger else { return }
    _scrollTrigger = value
    // Delay slightly so layout can settle after new content
    DispatchQueue.main.async { [weak self] in
      self?.scrollToBottom()
    }
  }

  func handleScrollToUserTrigger(_ value: Int) {
    guard value != _scrollToUserTrigger else { return }
    _scrollToUserTrigger = value
    DispatchQueue.main.async { [weak self] in
      self?.scrollToUser()
    }
  }

  // MARK: - Private

  private func updateContentSize() {
    let height = max(_contentHeight, 0)
    scrollView.contentSize = CGSize(width: bounds.width, height: height)
  }

  private func scrollToBottom() {
    let maxY = scrollView.contentSize.height
                + scrollView.contentInset.bottom
                - scrollView.bounds.height
    guard maxY > 0 else { return }
    UIView.animate(withDuration: 0.25, delay: 0, options: .curveEaseOut) {
      self.scrollView.contentOffset = CGPoint(x: 0, y: maxY)
    }
  }

  private func scrollToUser() {
    // Place the bottom of content (user's last bubble) near the top of the viewport
    let bubbleHeight: CGFloat = 60
    let targetY = max(_contentHeight - bubbleHeight, 0)
    let maxY = scrollView.contentSize.height
               + scrollView.contentInset.bottom
               - scrollView.bounds.height
    let clampedY = min(targetY, max(maxY, 0))
    UIView.animate(withDuration: 0.25, delay: 0, options: .curveEaseOut) {
      self.scrollView.contentOffset = CGPoint(x: 0, y: clampedY)
    }
  }
}
