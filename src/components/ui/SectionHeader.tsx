import { useMemo } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { theme } from '@/lib/theme'
import { useThemeColors } from '@/lib/useThemeColors'

type Props = {
  title: string
  actionText?: string
  onActionPress?: () => void
}

export function SectionHeader({ title, actionText, onActionPress }: Props) {
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])

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

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
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
      color: colors.textPrimary,
    },
    action: {
      fontFamily: theme.fonts.medium,
      fontSize: 13,
      color: colors.textSecondary,
    },
  })
