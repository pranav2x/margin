import { View, StyleSheet } from 'react-native';
import { Flame, Snowflake } from 'lucide-react-native';
import { Score } from '../motion/Score';
import { MicroLabel } from '../primitives/MicroLabel';
import { useTheme, space } from '../../theme';
import type { StreakData } from '../../lib/hooks/useStreak';

const CELL = 26;

interface Props {
  streak: StreakData;
}

// The daily-return module on the You tab: an ember flame numeral — the single
// sanctioned accent here — above a strictly monochrome 7-day strip. Filled =
// active, hairline = missed, snowflake = a day a freeze bridged. The strip and
// snowflake never use ember; ember belongs only to the flame.
export function StreakBlock({ streak }: Props) {
  const { colors } = useTheme();

  return (
    <View accessibilityRole="summary" accessibilityLabel={`${streak.current} day streak`}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Flame size={28} color={colors.ember} strokeWidth={1.75} />
        {/* Geist Mono tabular numeral — ember, tabular so 9 → 10 never shifts. */}
        <Score value={streak.current} size="lg" style={{ color: colors.ember, marginLeft: space[2] }} />
        <MicroLabel style={{ marginLeft: space[3] }}>DAY STREAK</MicroLabel>
      </View>

      <View style={{ flexDirection: 'row', gap: space[2], marginTop: space[4] }}>
        {streak.days.map((d) => (
          <View key={d.day} style={{ alignItems: 'center', gap: space[1] }}>
            <View
              style={{
                width: CELL,
                height: CELL,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: d.state === 'active' ? colors.ink : 'transparent',
                borderWidth: d.state === 'active' ? 0 : StyleSheet.hairlineWidth,
                borderColor: colors.fog,
              }}
            >
              {d.state === 'frozen' ? <Snowflake size={14} color={colors.ash} strokeWidth={1.5} /> : null}
            </View>
            <MicroLabel tone={d.isToday ? 'ink' : 'ash'}>{d.label}</MicroLabel>
          </View>
        ))}
      </View>
    </View>
  );
}
