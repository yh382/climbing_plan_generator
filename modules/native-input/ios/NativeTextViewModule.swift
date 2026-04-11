import ExpoModulesCore

public class NativeTextViewModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NativeTextView")

    View(NativeTextViewView.self) {
      Events(
        "onNativeChangeText",
        "onNativeSubmitEditing",
        "onNativeHeightChange",
        "onTextViewFocus",
        "onTextViewBlur"
      )

      Prop("placeholder") { (view, value: String?) in
        view.placeholderText = value ?? ""
        view.updatePlaceholder()
      }

      Prop("text") { (view, value: String?) in
        let newText = value ?? ""
        // Avoid resetting if same (prevents cursor jump during typing)
        if view.textView.text != newText {
          view.textView.text = newText
          view.updatePlaceholder()
          view.notifyHeightChange()
        }
      }

      Prop("maxHeight") { (view, value: Double?) in
        view.maxContentHeight = CGFloat(value ?? 0)
      }

      Prop("submitOnReturn") { (view, value: Bool?) in
        view.submitOnReturn = value ?? true
      }

      Prop("returnKeyType") { (view, value: String?) in
        switch value {
        case "send":
          view.textView.returnKeyType = .send
        case "done":
          view.textView.returnKeyType = .done
        case "go":
          view.textView.returnKeyType = .go
        case "search":
          view.textView.returnKeyType = .search
        case "next":
          view.textView.returnKeyType = .next
        default:
          view.textView.returnKeyType = .send
        }
      }

      Prop("fontSize") { (view, value: Double?) in
        let size = CGFloat(value ?? 15)
        view.textView.font = .systemFont(ofSize: size)
        view.placeholderLabel.font = .systemFont(ofSize: size)
      }

      Prop("textColor") { (view, value: String?) in
        if let hex = value {
          view.textView.textColor = UIColor(hex: hex)
        } else {
          view.textView.textColor = .label
        }
      }

      Prop("tintColor") { (view, value: String?) in
        if let hex = value {
          view.textView.tintColor = UIColor(hex: hex)
        }
      }

      Prop("placeholderColor") { (view, value: String?) in
        if let hex = value {
          view.placeholderLabel.textColor = UIColor(hex: hex)
        }
      }

      Prop("focused") { (view, value: Bool?) in
        view.wantsFocus = value ?? false
        view.updateFocus()
      }
    }
  }
}
