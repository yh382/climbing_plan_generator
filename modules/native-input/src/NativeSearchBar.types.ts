import type { ViewProps } from "react-native";

// Internal native event names (prefixed to avoid collision with RN built-in events)
export interface NativeSearchBarNativeProps {
  onNativeChangeText?: (e: { nativeEvent: { text: string } }) => void;
  onNativeSubmitSearch?: (e: { nativeEvent: { text: string } }) => void;
  onSearchBarFocus?: () => void;
  onSearchBarBlur?: () => void;
  onNativeClear?: () => void;
  onNativeCancel?: () => void;
}

export interface NativeSearchBarProps extends Omit<ViewProps, "onFocus" | "onBlur"> {
  /** Placeholder text */
  placeholder?: string;
  /** Controlled text value */
  text?: string;
  /** Show cancel button when focused */
  showsCancelButton?: boolean;
  /** Cursor / selection tint color (hex) */
  tintColor?: string;
  /** Auto-capitalize mode */
  autoCapitalize?: "none" | "words" | "sentences" | "all";
  /** Custom height for the search field */
  searchFieldHeight?: number;
  /** Background color for the search text field (hex) */
  searchFieldBackgroundColor?: string;

  /** Fired on every text change */
  onChangeText?: (e: { nativeEvent: { text: string } }) => void;
  /** Fired when keyboard search button is pressed */
  onSubmitSearch?: (e: { nativeEvent: { text: string } }) => void;
  /** Fired when search bar gains focus */
  onFocus?: () => void;
  /** Fired when search bar loses focus */
  onBlur?: () => void;
  /** Fired when native clear (x) button is tapped */
  onClear?: () => void;
  /** Fired when cancel button is tapped */
  onCancel?: () => void;
}
