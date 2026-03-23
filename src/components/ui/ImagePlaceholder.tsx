import { View } from 'react-native'
import { theme } from '@/lib/theme'
import { useThemeColors } from '@/lib/useThemeColors'

type Props = {
  width?: number | string
  height?: number
  borderRadius?: number
  variant?: 'light' | 'dark'
}

export function ImagePlaceholder({
  width = '100%',
  height = 200,
  borderRadius = theme.borderRadius.card,
  variant = 'light',
}: Props) {
  const colors = useThemeColors()

  return (
    <View
      style={{
        width: width as any,
        height,
        borderRadius,
        backgroundColor:
          variant === 'dark'
            ? colors.cardDarkImage
            : colors.backgroundSecondary,
      }}
    />
  )
}
