import { View, type ImageStyle, type ViewStyle, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../theme';

interface Props {
  uri?: string;
  style?: ImageStyle | ViewStyle;
  contentFit?: 'cover' | 'contain';
  inverted?: boolean;
}

/**
 * Photos are desaturated. Two complementary mechanisms keep them
 * editorial: (1) we append imgix saturation params to source URLs
 * when possible; (2) we overlay a low-opacity tint to push remaining
 * color toward newsprint.
 */
function desaturate(uri?: string): string | undefined {
  if (!uri) return uri;
  if (uri.startsWith('http') && uri.includes('unsplash')) {
    const sep = uri.includes('?') ? '&' : '?';
    return `${uri}${sep}sat=-100&con=20`;
  }
  return uri;
}

export function GrayImage({ uri, style, contentFit = 'cover', inverted }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[{ overflow: 'hidden', backgroundColor: colors.fog }, style as ViewStyle]}>
      <Image
        source={{ uri: desaturate(uri) }}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        cachePolicy="memory-disk"
        transition={240}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: inverted ? colors.paper : colors.ink,
            opacity: 0.06,
          },
        ]}
      />
    </View>
  );
}
