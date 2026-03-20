import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native'
import { theme } from '@/lib/theme'

type Props = {
  title: string
  onPress: () => void
  variant?: 'solid' | 'outline'
  disabled?: boolean
  fullWidth?: boolean
  style?: ViewStyle
}

export function Button({
  title,
  onPress,
  variant = 'solid',
  disabled = false,
  fullWidth = false,
  style,
}: Props) {
  const isSolid = variant === 'solid'
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.base,
        isSolid ? styles.solid : styles.outline,
        disabled && styles.disabled,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          isSolid ? styles.textSolid : styles.textOutline,
          disabled && styles.textDisabled,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: theme.borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solid: {
    backgroundColor: theme.colors.cardDark,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.cardDark,
  },
  disabled: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderColor: 'transparent',
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontFamily: theme.fonts.bold,
    fontSize: 15,
    fontWeight: '700',
  },
  textSolid: {
    color: '#FFFFFF',
  },
  textOutline: {
    color: theme.colors.textPrimary,
  },
  textDisabled: {
    color: theme.colors.textTertiary,
  },
})
