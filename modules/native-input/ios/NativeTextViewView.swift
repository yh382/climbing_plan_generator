import ExpoModulesCore
import UIKit

class NativeTextViewView: ExpoView, UITextViewDelegate {
  let textView = UITextView()
  let placeholderLabel = UILabel()

  var placeholderText = ""
  var maxContentHeight: CGFloat = 0
  var submitOnReturn = true
  var wantsFocus = false

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
    textView.isScrollEnabled = true   // Always scrollable — container height drives visible area
    textView.showsVerticalScrollIndicator = false
    textView.showsHorizontalScrollIndicator = false

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
    textView.layoutIfNeeded()
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
    guard textView.frame.width > 0 else { return }
    let fittingSize = CGSizeMake(textView.frame.width, CGFloat.greatestFiniteMagnitude)
    let idealHeight = textView.sizeThatFits(fittingSize).height

    // Clamp to maxHeight
    let clampedHeight = (maxContentHeight > 0 && idealHeight > maxContentHeight)
      ? maxContentHeight : idealHeight

    // Only notify if height actually changed (avoid loops)
    if abs(clampedHeight - lastReportedHeight) > 0.5 {
      lastReportedHeight = clampedHeight
      onNativeHeightChange(["height": clampedHeight])
    }
  }

  private func scrollToCursor() {
    guard let selectedRange = textView.selectedTextRange else { return }
    let caretRect = textView.caretRect(for: selectedRange.end)
    textView.scrollRectToVisible(caretRect, animated: false)
  }

  // MARK: - UITextViewDelegate

  func textViewDidChange(_ textView: UITextView) {
    updatePlaceholder()
    onNativeChangeText(["text": textView.text ?? ""])
    notifyHeightChange()
    scrollToCursor()
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

  // MARK: - Programmatic focus

  func updateFocus() {
    if wantsFocus {
      if textView.window != nil {
        textView.becomeFirstResponder()
      }
      // If window is nil, didMoveToWindow will retry
    } else {
      textView.resignFirstResponder()
    }
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window != nil && wantsFocus {
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
        guard let self = self, self.wantsFocus else { return }
        self.textView.becomeFirstResponder()
      }
    }
  }
}
