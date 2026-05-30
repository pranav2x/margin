import { View, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../theme';

interface Props {
  uri?: string;
  size?: number;
  style?: ViewStyle;
  inverted?: boolean;
}

/**
 * Circular avatar with a 1px fog ring. Strava-faithful: full color, no
 * desaturation. Background falls back to `fog` while the image loads.
 */
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
          borderWidth: 1,
          borderColor: colors.fog,
        },
        style,
      ]}
    >
      <Image
        source={{ uri }}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
      />
    </View>
  );
}
