import { useMemo } from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { theme } from '@/lib/theme'
import { useThemeColors } from '@/lib/useThemeColors'

type Props = {
  children: React.ReactNode
  style?: ViewStyle
}

export function CardDark({ children, style }: Props) {
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])

  return <View style={[styles.card, style]}>{children}</View>
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.cardDark,
      borderRadius: theme.borderRadius.card,
      overflow: 'hidden',
    },
  })
