// components/ui/Text.tsx
import { Text as RNText, TextProps } from "react-native";
import { tokens } from "./Theme";

const base = { color: tokens.color.text };

export const H1 = (p: TextProps) => <RNText {...p} style={[{ ...base, fontSize: 24, fontWeight: "600" }, p.style]} />;
export const H2 = (p: TextProps) => <RNText {...p} style={[{ ...base, fontSize: 18, fontWeight: "600" }, p.style]} />;
export const Body = (p: TextProps) => <RNText {...p} style={[{ ...base, fontSize: 15 }, p.style]} />;
export const Caption = (p: TextProps) => <RNText {...p} style={[{ color: tokens.color.muted, fontSize: 12, fontWeight: "500" }, p.style]} />;
