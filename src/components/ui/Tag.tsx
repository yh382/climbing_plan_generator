import { useMemo } from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { theme } from '@/lib/theme'
import { useThemeColors } from '@/lib/useThemeColors'

type Props = {
  label: string
  variant?: 'dark' | 'light' | 'accent'
  style?: ViewStyle
}

export function Tag({ label, variant = 'dark', style }: Props) {
  const colors = useThemeColors()
  const { variantStyles, textVariant, styles } = useMemo(
    () => createStyles(colors),
    [colors],
  )

  return (
    <View style={[styles.tag, variantStyles[variant], style]}>
      <Text style={[styles.text, textVariant[variant]]}>{label}</Text>
    </View>
  )
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => {
  const variantStyles = StyleSheet.create({
    dark: { backgroundColor: colors.cardDark },
    light: { backgroundColor: colors.backgroundSecondary },
    accent: { backgroundColor: colors.accent },
  })

  const textVariant = StyleSheet.create({
    dark: { color: '#FFFFFF' },
    light: { color: colors.textPrimary },
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

  return { variantStyles, textVariant, styles }
}
