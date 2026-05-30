import { View, StyleSheet } from 'react-native';
import { Score } from '../motion/Score';
import { MicroLabel } from '../primitives/MicroLabel';
import { AppIcon } from '../primitives/AppIcon';
import { useTheme, space } from '../../theme';
import type { StreakData } from '../../lib/hooks/useStreak';

const CELL = 26;

interface Props {
  streak: StreakData;
}

// The daily-return module on the You tab. Ember flame numeral above a
// monochrome 7-day strip. Filled = active, hairline = missed, snowflake = a day
// a freeze bridged. Ember belongs to the flame and the day count only — the
// strip stays ink/fog so the celebration reads as a single accented line.
export function StreakBlock({ streak }: Props) {
  const { colors } = useTheme();

  return (
    <View accessibilityRole="summary" accessibilityLabel={`${streak.current} day streak`}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <AppIcon name="Flame" size={28} tone="ember" filled />
        {/* Inter tabular numeral — ember, tabular so 9 → 10 never shifts. */}
        <Score value={streak.current} size="lg" tone="ember" style={{ marginLeft: space[2] }} />
        <MicroLabel style={{ marginLeft: space[3] }}>DAY STREAK</MicroLabel>
      </View>

      <View style={{ flexDirection: 'row', gap: space[2], marginTop: space[4] }}>
        {streak.days.map((d) => (
          <View key={d.day} style={{ alignItems: 'center', gap: space[1] }}>
            <View
              style={{
                width: CELL,
                height: CELL,
                borderRadius: 6,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: d.state === 'active' ? colors.ink : 'transparent',
                borderWidth: d.state === 'active' ? 0 : StyleSheet.hairlineWidth,
                borderColor: colors.fog,
              }}
            >
              {d.state === 'frozen' ? <AppIcon name="Snowflake" size={14} tone="ash" /> : null}
            </View>
            <MicroLabel tone={d.isToday ? 'ink' : 'ash'}>{d.label}</MicroLabel>
          </View>
        ))}
      </View>
    </View>
  );
}
