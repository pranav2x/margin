import { View, Text, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useTheme, radius, fonts } from '../../theme';

interface Props {
  uri?: string;
  size?: number;
  /** Used to render a monogram fallback when no uri is set. */
  seed?: string;
  style?: ViewStyle;
  inverted?: boolean;
}

/**
 * Circular avatar with a 1px fog ring. Strava-faithful: full color, no
 * desaturation. When no uri is supplied, renders a single-letter monogram on
 * a `surface` tile so empty fixtures don't read as broken images.
 */
export function Avatar({ uri, size = 56, seed, style, inverted }: Props) {
  const { colors } = useTheme();
  const monogram = (seed ?? '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 1).toUpperCase();
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius.full,
          overflow: 'hidden',
          backgroundColor: inverted ? colors.shadow : colors.surface,
          borderWidth: 1,
          borderColor: colors.fog,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
      ) : monogram ? (
        <Text
          allowFontScaling={false}
          style={{
            fontFamily: fonts.bold,
            fontSize: Math.round(size * 0.42),
            lineHeight: Math.round(size * 0.5),
            color: colors.ash,
          }}
        >
          {monogram}
        </Text>
      ) : null}
    </View>
  );
}
