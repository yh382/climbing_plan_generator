import ExpoModulesCore
import UIKit

class NativeSearchBarView: ExpoView, UISearchBarDelegate {
  let searchBar = UISearchBar()
  var showsCancelButton = false
  /// When true and the view has entered a window, focus the search field
  /// (programmatically raising the keyboard + placing the cursor inside).
  /// The flag is consumed (reset to false) after focus is applied so that
  /// re-renders with the same autoFocus=true don't re-focus on every update.
  var pendingAutoFocus = false

  // Event dispatchers (registered by module)
  let onNativeChangeText = EventDispatcher()
  let onNativeSubmitSearch = EventDispatcher()
  let onSearchBarFocus = EventDispatcher()
  let onSearchBarBlur = EventDispatcher()
  let onNativeClear = EventDispatcher()
  let onNativeCancel = EventDispatcher()

  /// Desired height for the inner search text field (set from JS via prop).
  var searchTextFieldHeight: CGFloat = 40 {
    didSet { setNeedsLayout() }
  }

  /// Placeholder font point size. 0 means "use system default".
  var placeholderFontSize: CGFloat = 0 {
    didSet { applyPlaceholderFont() }
  }

  /// Rebuilds the attributed placeholder whenever placeholder text or font
  /// size changes, so the custom font sticks even when the placeholder text
  /// is updated from JS.
  func applyPlaceholderFont() {
    guard placeholderFontSize > 0, let text = searchBar.placeholder, !text.isEmpty else {
      return
    }
    searchBar.searchTextField.attributedPlaceholder = NSAttributedString(
      string: text,
      attributes: [
        .font: UIFont.systemFont(ofSize: placeholderFontSize),
        .foregroundColor: UIColor.placeholderText,
      ]
    )
  }

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true

    searchBar.delegate = self
    searchBar.searchBarStyle = .minimal
    searchBar.backgroundImage = UIImage()  // transparent outer background
    searchBar.autocorrectionType = .no
    searchBar.autocapitalizationType = .none
    searchBar.spellCheckingType = .no
    // Default to fully clear — the JS side provides the fill tint via
    // `searchFieldBackgroundColor`. Leaving systemGray5 here caused a
    // dark chip to briefly flash behind the field on first mount, and the
    // color also leaked into the rightView container (the area around the
    // clear × button) as a separate darker rectangle.
    searchBar.searchTextField.backgroundColor = .clear
    // Kill the system shadow iOS 26 draws around the inner text field —
    // against a translucent sheet background it reads as a dark halo.
    searchBar.searchTextField.layer.shadowOpacity = 0
    searchBar.searchTextField.layer.borderWidth = 0
    searchBar.searchTextField.layer.masksToBounds = true

    addSubview(searchBar)
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window != nil && pendingAutoFocus {
      NSLog("[NativeSearchBar] didMoveToWindow with pendingAutoFocus=true → focusWithRetry")
      pendingAutoFocus = false
      focusWithRetry()
    }
  }

  /// becomeFirstResponder can fail silently when the view is inside a
  /// TrueSheet whose detent animation hasn't settled, or when its window
  /// hasn't become key yet. Poll for up to ~2s before giving up. The retry
  /// is cheap — each attempt is a single method call with no side effects
  /// until it succeeds.
  func focusWithRetry(attempt: Int = 0) {
    let maxAttempts = 10
    // First attempt: wait for a single runloop pass so the initial layout
    // commits. Subsequent attempts: 200ms — wide enough to span a sheet
    // detent transition (~300-500ms) over several retries.
    let delayMs = attempt == 0 ? 80 : 200
    DispatchQueue.main.asyncAfter(deadline: .now() + .milliseconds(delayMs)) { [weak self] in
      guard let self else { return }
      // If the view has been torn out of the hierarchy, stop retrying.
      guard self.window != nil else {
        NSLog("[NativeSearchBar] focus attempt \(attempt): no window, abort")
        return
      }
      // Try the inner UITextField first — on iOS 17+ it accepts focus
      // more reliably than the wrapping UISearchBar when the view is
      // inside a modal presentation (TrueSheet) that hasn't fully
      // finalized its UIResponder chain yet.
      let tf = self.searchBar.searchTextField
      var ok = tf.becomeFirstResponder()
      if !ok {
        ok = self.searchBar.becomeFirstResponder()
      }
      NSLog("[NativeSearchBar] focus attempt \(attempt): \(ok ? "OK" : "failed")")
      if !ok && attempt < maxAttempts {
        self.focusWithRetry(attempt: attempt + 1)
      }
    }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    searchBar.frame = bounds

    // Resize the inner text field to the desired height
    let tf = searchBar.searchTextField
    let targetH = searchTextFieldHeight
    if tf.frame.height != targetH {
      tf.frame = CGRect(
        x: tf.frame.origin.x,
        y: (bounds.height - targetH) / 2,
        width: tf.frame.width,
        height: targetH
      )
    }

    // Post-layout: zero out any residual background UIKit may have added
    // to the left/right auxiliary containers. The clear × button sits in
    // `rightView`; its wrapper can render a darker chip against the
    // translucent sheet material if not explicitly cleared.
    tf.leftView?.backgroundColor = .clear
    tf.rightView?.backgroundColor = .clear
    for sub in tf.subviews {
      // Any internal `_UISearchBarSearchFieldBackgroundView` (private)
      // contributes the "dark halo" — force it transparent.
      let name = String(describing: type(of: sub))
      if name.contains("Background") {
        sub.backgroundColor = .clear
        sub.layer.shadowOpacity = 0
      }
    }
  }

  // MARK: - UISearchBarDelegate

  func searchBar(_ searchBar: UISearchBar, textDidChange searchText: String) {
    onNativeChangeText(["text": searchText])
  }

  func searchBarSearchButtonClicked(_ searchBar: UISearchBar) {
    onNativeSubmitSearch(["text": searchBar.text ?? ""])
    searchBar.resignFirstResponder()
  }

  func searchBarTextDidBeginEditing(_ searchBar: UISearchBar) {
    if showsCancelButton {
      searchBar.setShowsCancelButton(true, animated: true)
    }
    onSearchBarFocus([:])
  }

  func searchBarTextDidEndEditing(_ searchBar: UISearchBar) {
    if showsCancelButton {
      searchBar.setShowsCancelButton(false, animated: true)
    }
    onSearchBarBlur([:])
  }

  func searchBarCancelButtonClicked(_ searchBar: UISearchBar) {
    searchBar.text = ""
    searchBar.resignFirstResponder()
    onNativeCancel([:])
  }

  func searchBar(_ searchBar: UISearchBar, shouldChangeTextIn range: NSRange, replacementText text: String) -> Bool {
    return true
  }

  // UISearchBar calls textDidChange with "" when built-in clear (×) is tapped.
  // We detect this via the clear button specifically:
  func searchBarShouldBeginEditing(_ searchBar: UISearchBar) -> Bool {
    return true
  }
}

// MARK: - UIColor hex helper

extension UIColor {
  convenience init(hex: String) {
    var hexString = hex.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
    if hexString.hasPrefix("#") {
      hexString.removeFirst()
    }

    var rgbValue: UInt64 = 0
    Scanner(string: hexString).scanHexInt64(&rgbValue)

    let r, g, b, a: CGFloat
    switch hexString.count {
    case 6:
      r = CGFloat((rgbValue & 0xFF0000) >> 16) / 255.0
      g = CGFloat((rgbValue & 0x00FF00) >> 8) / 255.0
      b = CGFloat(rgbValue & 0x0000FF) / 255.0
      a = 1.0
    case 8:
      r = CGFloat((rgbValue & 0xFF000000) >> 24) / 255.0
      g = CGFloat((rgbValue & 0x00FF0000) >> 16) / 255.0
      b = CGFloat((rgbValue & 0x0000FF00) >> 8) / 255.0
      a = CGFloat(rgbValue & 0x000000FF) / 255.0
    default:
      r = 0; g = 0; b = 0; a = 1
    }
    self.init(red: r, green: g, blue: b, alpha: a)
  }
}
