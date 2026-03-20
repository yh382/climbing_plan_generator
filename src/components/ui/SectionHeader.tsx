import { View, Text, Pressable, StyleSheet } from 'react-native'
import { theme } from '@/lib/theme'

type Props = {
  title: string
  actionText?: string
  onActionPress?: () => void
}

export function SectionHeader({ title, actionText, onActionPress }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {actionText && onActionPress && (
        <Pressable onPress={onActionPress}>
          <Text style={styles.action}>{actionText}</Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.screenPadding,
    marginBottom: 10,
  },
  title: {
    fontFamily: theme.fonts.black,
    ...theme.typography.sectionTitle,
    color: theme.colors.textPrimary,
  },
  action: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
})
