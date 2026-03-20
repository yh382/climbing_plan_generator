import { View, StyleSheet, ViewStyle } from 'react-native'
import { theme } from '@/lib/theme'

type Props = {
  children: React.ReactNode
  style?: ViewStyle
}

export function CardDark({ children, style }: Props) {
  return <View style={[styles.card, style]}>{children}</View>
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.cardDark,
    borderRadius: theme.borderRadius.card,
    overflow: 'hidden',
  },
})
