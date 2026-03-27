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
