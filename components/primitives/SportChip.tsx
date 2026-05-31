import { Pressable, View, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Txt } from './Text';
import { useTheme, space, radius } from '../../theme';

/**
 * SportChip — 64px-tall glyph-over-label chip for the Boards sport rail.
 *
 * Strava-style: a fat, tappable target with a single glyph above a short
 * label. Active = ember fill + paper foreground; inactive = surface fill +
 * fog hairline + ink foreground. Rendered in a horizontal scroller; the
 * partial-peek of the next chip at the screen edge is the caller's job
 * (just give the scroller `paddingRight: space[5]` and the last chip half-
 * peeks naturally).
 */

interface Props {
  glyph: string;
  label: string;
  active: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

const CHIP_WIDTH = 72;
const CHIP_HEIGHT = 64;

export function SportChip({ glyph, label, active, onPress, style }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${label} sport`}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        {
          width: CHIP_WIDTH,
          height: CHIP_HEIGHT,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: active ? 'transparent' : colors.fog,
          backgroundColor: active
            ? pressed
              ? colors.emberPressed
              : colors.ember
            : pressed
              ? colors.fog
              : colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: space[2],
        },
        style ?? {},
      ]}
    >
      <View style={{ height: 24, alignItems: 'center', justifyContent: 'center' }}>
        <Txt
          variant="display4"
          weight="bold"
          style={{
            fontSize: 22,
            lineHeight: 24,
            color: active ? colors.paper : colors.ink,
          }}
        >
          {glyph}
        </Txt>
      </View>
      <Txt
        variant="micro"
        style={{
          marginTop: space[1],
          color: active ? colors.paper : colors.ash,
        }}
      >
        {label.toUpperCase()}
      </Txt>
    </Pressable>
  );
}

/**
 * Stable glyph map for the four Elevate sports. Single emoji each so the
 * SportChip stays a one-line render and the rail stays homogeneous.
 */
export const SPORT_GLYPHS: Record<string, string> = {
  football: '🏈',
  basketball: '🏀',
  baseball: '⚾',
  track: '🏃',
};
