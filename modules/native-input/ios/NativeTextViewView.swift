import ExpoModulesCore
import UIKit

class NativeTextViewView: ExpoView, UITextViewDelegate {
  let textView = UITextView()
  let placeholderLabel = UILabel()

  var placeholderText = ""
  var maxContentHeight: CGFloat = 0
  var submitOnReturn = true

  // Event dispatchers
  let onNativeChangeText = EventDispatcher()
  let onNativeSubmitEditing = EventDispatcher()
  let onNativeHeightChange = EventDispatcher()
  let onTextViewFocus = EventDispatcher()
  let onTextViewBlur = EventDispatcher()

  private var lastReportedHeight: CGFloat = 0

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true

    // Text view setup
    textView.delegate = self
    textView.backgroundColor = .clear
    textView.font = .systemFont(ofSize: 15)
    textView.textContainerInset = UIEdgeInsets(top: 14, left: 12, bottom: 14, right: 12)
    textView.textContainer.lineFragmentPadding = 0
    textView.returnKeyType = .send
    textView.isScrollEnabled = false  // Start non-scrollable for auto-grow
    textView.showsVerticalScrollIndicator = false

    // Placeholder
    placeholderLabel.font = textView.font
    placeholderLabel.textColor = .placeholderText
    placeholderLabel.numberOfLines = 1

    addSubview(textView)
    textView.addSubview(placeholderLabel)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    textView.frame = bounds
    layoutPlaceholder()
    notifyHeightChange()
  }

  private func layoutPlaceholder() {
    let insets = textView.textContainerInset
    placeholderLabel.frame = CGRect(
      x: insets.left,
      y: insets.top,
      width: bounds.width - insets.left - insets.right,
      height: placeholderLabel.font.lineHeight
    )
  }

  func updatePlaceholder() {
    placeholderLabel.text = placeholderText
    placeholderLabel.isHidden = !textView.text.isEmpty
    layoutPlaceholder()
  }

  func notifyHeightChange() {
    let fittingSize = CGSizeMake(textView.frame.width, CGFloat.greatestFiniteMagnitude)
    var idealHeight = textView.sizeThatFits(fittingSize).height

    // Enforce maxHeight
    if maxContentHeight > 0 && idealHeight > maxContentHeight {
      idealHeight = maxContentHeight
      if !textView.isScrollEnabled {
        textView.isScrollEnabled = true
      }
    } else {
      if textView.isScrollEnabled {
        textView.isScrollEnabled = false
      }
    }

    // Only notify if height actually changed (avoid loops)
    if abs(idealHeight - lastReportedHeight) > 0.5 {
      lastReportedHeight = idealHeight
      onNativeHeightChange(["height": idealHeight])
    }
  }

  // MARK: - UITextViewDelegate

  func textViewDidChange(_ textView: UITextView) {
    updatePlaceholder()
    onNativeChangeText(["text": textView.text ?? ""])
    notifyHeightChange()
  }

  func textView(_ textView: UITextView, shouldChangeTextIn range: NSRange, replacementText text: String) -> Bool {
    // Intercept return key when submitOnReturn is true
    if text == "\n" && submitOnReturn {
      onNativeSubmitEditing(["text": textView.text ?? ""])
      return false  // Don't insert newline
    }
    return true
  }

  func textViewDidBeginEditing(_ textView: UITextView) {
    onTextViewFocus([:])
  }

  func textViewDidEndEditing(_ textView: UITextView) {
    onTextViewBlur([:])
  }
}
