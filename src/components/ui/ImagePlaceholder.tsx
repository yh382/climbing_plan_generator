import { View } from 'react-native'
import { theme } from '@/lib/theme'

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
  return (
    <View
      style={{
        width: width as any,
        height,
        borderRadius,
        backgroundColor:
          variant === 'dark'
            ? theme.colors.cardDarkImage
            : theme.colors.backgroundSecondary,
      }}
    />
  )
}
