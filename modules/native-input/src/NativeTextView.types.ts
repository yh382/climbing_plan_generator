import type { ViewProps } from "react-native";

// Internal native event names (prefixed to avoid collision with RN built-in events)
export interface NativeTextViewNativeProps {
  onNativeChangeText?: (e: { nativeEvent: { text: string } }) => void;
  onNativeSubmitEditing?: (e: { nativeEvent: { text: string } }) => void;
  onNativeHeightChange?: (e: { nativeEvent: { height: number } }) => void;
  onTextViewFocus?: () => void;
  onTextViewBlur?: () => void;
}

export interface NativeTextViewProps extends Omit<ViewProps, "onFocus" | "onBlur"> {
  /** Placeholder text shown when empty */
  placeholder?: string;
  /** Controlled text value */
  text?: string;
  /** Maximum height before switching to scroll mode (0 = no limit) */
  maxHeight?: number;
  /** If true, pressing return submits instead of inserting newline */
  submitOnReturn?: boolean;
  /** Keyboard return key type */
  returnKeyType?: "send" | "done" | "go" | "search" | "next";
  /** Font size in points (default 15) */
  fontSize?: number;
  /** Text color (hex). Defaults to system label color (auto dark mode). */
  textColor?: string;
  /** Cursor / selection tint color (hex) */
  tintColor?: string;
  /** Placeholder text color (hex) */
  placeholderColor?: string;
  /** When true, programmatically focuses the text view (shows keyboard) */
  focused?: boolean;

  /** Fired on every text change */
  onChangeText?: (e: { nativeEvent: { text: string } }) => void;
  /** Fired when return key is pressed (if submitOnReturn=true) */
  onSubmitEditing?: (e: { nativeEvent: { text: string } }) => void;
  /** Fired when content height changes (for auto-grow) */
  onHeightChange?: (e: { nativeEvent: { height: number } }) => void;
  /** Fired when text view gains focus */
  onFocus?: () => void;
  /** Fired when text view loses focus */
  onBlur?: () => void;
}
