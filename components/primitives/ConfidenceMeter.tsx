import { View, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Txt } from './Text';
import { space, radius, useTheme } from '../../theme';

type Size = 'sm' | 'md' | 'lg';

interface Props {
  value: number;
  max?: number;
  size?: Size;
  editable?: boolean;
  onChange?: (v: number) => void;
}

const SEGMENT_HEIGHTS: Record<Size, number> = {
  sm: 16,
  md: 24,
  lg: 32,
};

/**
 * 10-segment confidence meter. The centerpiece of the Calls UI.
 *   <ConfidenceMeter value={7} editable onChange={setConfidence} />
 *
 * Filled segments use ember; empty segments use fog. A big numeric readout
 * sits on the right: `${value} / ${max}` in display4.
 */
export function ConfidenceMeter({ value, max = 10, size = 'md', editable, onChange }: Props) {
  const { colors } = useTheme();
  const height = SEGMENT_HEIGHTS[size];
  const segments = Array.from({ length: max }, (_, i) => i + 1);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
      <View style={{ flex: 1, flexDirection: 'row', gap: space[1] }}>
        {segments.map((n) => {
          const active = n <= value;
          if (editable) {
            return (
              <Pressable
                key={n}
                hitSlop={6}
                onPress={() => {
                  Haptics.selectionAsync();
                  onChange?.(n);
                }}
                style={{
                  flex: 1,
                  height,
                  borderRadius: radius.xs,
                  backgroundColor: active ? colors.ember : colors.fog,
                }}
                accessibilityRole="adjustable"
                accessibilityLabel={`Confidence ${n} of ${max}`}
              />
            );
          }
          return (
            <View
              key={n}
              style={{
                flex: 1,
                height,
                borderRadius: radius.xs,
                backgroundColor: active ? colors.ember : colors.fog,
              }}
            />
          );
        })}
      </View>
      <Txt variant="display4" style={{ minWidth: 64, textAlign: 'right' }}>
        {value} / {max}
      </Txt>
    </View>
  );
}
