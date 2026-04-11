import ExpoModulesCore
import UIKit

class NativeSearchBarView: ExpoView, UISearchBarDelegate {
  let searchBar = UISearchBar()
  var showsCancelButton = false

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
    // Use systemGray5 so the field is visible in both light & dark mode
    searchBar.searchTextField.backgroundColor = .systemGray5

    addSubview(searchBar)
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
