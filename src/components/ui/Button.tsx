import { useMemo } from 'react'
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native'
import { theme } from '@/lib/theme'
import { useThemeColors } from '@/lib/useThemeColors'

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
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])

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

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    base: {
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: theme.borderRadius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    solid: {
      backgroundColor: colors.cardDark,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.cardDark,
    },
    disabled: {
      backgroundColor: colors.backgroundSecondary,
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
      color: colors.textPrimary,
    },
    textDisabled: {
      color: colors.textTertiary,
    },
  })
