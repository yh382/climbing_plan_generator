// components/ui/Theme.ts
export const tokens = {
  color: {
    primary: "#3B82F6",
    accent: "#FF8A00",
    success: "#16A34A",
    warn: "#F59E0B",
    error: "#EF4444",
    text: "#0F172A",
    muted: "#334155",
    bg: "#F8FAFC",
    card: "#FFFFFF",
    border: "#E5E7EB",
  },
  radius: { sm: 8, md: 12, lg: 16, xl: 20 },
  space: (n: number) => n * 4,
  shadow: {
    card: {
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 8,
      elevation: 3,
    },
  },
};
