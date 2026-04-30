import ExpoModulesCore

public class NativeSearchBarModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NativeSearchBar")

    View(NativeSearchBarView.self) {
      Events(
        "onNativeChangeText",
        "onNativeSubmitSearch",
        "onSearchBarFocus",
        "onSearchBarBlur",
        "onNativeClear",
        "onNativeCancel"
      )

      Prop("placeholder") { (view, value: String?) in
        view.searchBar.placeholder = value
        // Re-apply custom placeholder font whenever text changes, since
        // setting `placeholder` resets attributedPlaceholder.
        view.applyPlaceholderFont()
      }

      Prop("placeholderFontSize") { (view, value: Double?) in
        view.placeholderFontSize = CGFloat(value ?? 0)
      }

      Prop("text") { (view, value: String?) in
        let newText = value ?? ""
        // Avoid resetting text if it matches (prevents cursor jump)
        if view.searchBar.text != newText {
          view.searchBar.text = newText
        }
      }

      Prop("showsCancelButton") { (view, value: Bool?) in
        view.showsCancelButton = value ?? false
        // Don't immediately show — delegate handles visibility on focus/blur
      }

      Prop("tintColor") { (view, value: String?) in
        if let hex = value {
          view.searchBar.tintColor = UIColor(hex: hex)
        }
      }

      Prop("searchFieldHeight") { (view, value: Double?) in
        view.searchTextFieldHeight = CGFloat(value ?? 40)
      }

      Prop("searchFieldBackgroundColor") { (view, value: String?) in
        if let hex = value {
          view.searchBar.searchTextField.backgroundColor = UIColor(hex: hex)
        }
      }

      // `focusOnMount` rather than `autoFocus` — the latter is a well-known
      // React Native convention that some layers (Fabric, DevTools) may
      // intercept or ignore for custom native views.
      Prop("focusOnMount") { (view, value: Bool?) in
        let shouldFocus = value ?? false
        NSLog("[NativeSearchBar] focusOnMount prop = \(shouldFocus), window=\(view.window != nil)")
        if shouldFocus {
          if view.window != nil {
            view.focusWithRetry()
          } else {
            view.pendingAutoFocus = true
          }
        } else {
          // Flipping back to false resigns focus so the keyboard hides
          // when the parent collapses the search bar.
          view.pendingAutoFocus = false
          view.searchBar.resignFirstResponder()
        }
      }

      Prop("autoCapitalize") { (view, value: String?) in
        switch value {
        case "none":
          view.searchBar.autocapitalizationType = .none
        case "words":
          view.searchBar.autocapitalizationType = .words
        case "sentences":
          view.searchBar.autocapitalizationType = .sentences
        case "all":
          view.searchBar.autocapitalizationType = .allCharacters
        default:
          view.searchBar.autocapitalizationType = .none
        }
      }
    }
  }
}
