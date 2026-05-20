import { View, type ViewStyle, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../theme';

interface Props {
  uri?: string;
  size?: number;
  style?: ViewStyle;
  inverted?: boolean;
}

function desaturate(uri?: string): string | undefined {
  if (!uri) return uri;
  if (uri.startsWith('http') && uri.includes('unsplash')) {
    const sep = uri.includes('?') ? '&' : '?';
    return `${uri}${sep}sat=-100&con=10`;
  }
  return uri;
}

export function Avatar({ uri, size = 56, style, inverted }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          backgroundColor: inverted ? colors.shadow : colors.fog,
        },
        style,
      ]}
    >
      <Image
        source={{ uri: desaturate(uri) }}
        style={{ width: size, height: size }}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: inverted ? colors.paper : colors.ink,
            opacity: 0.04,
          },
        ]}
      />
    </View>
  );
}
