import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { theme } from '@/lib/theme'

type Props = {
  label: string
  variant?: 'dark' | 'light' | 'accent'
  style?: ViewStyle
}

export function Tag({ label, variant = 'dark', style }: Props) {
  return (
    <View style={[styles.tag, variantStyles[variant], style]}>
      <Text style={[styles.text, textVariant[variant]]}>{label}</Text>
    </View>
  )
}

const variantStyles = StyleSheet.create({
  dark: { backgroundColor: theme.colors.cardDark },
  light: { backgroundColor: theme.colors.backgroundSecondary },
  accent: { backgroundColor: theme.colors.accent },
})

const textVariant = StyleSheet.create({
  dark: { color: '#FFFFFF' },
  light: { color: theme.colors.textPrimary },
  accent: { color: '#FFFFFF' },
})

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.pill,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    fontWeight: '600',
  },
})
