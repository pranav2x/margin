import { forwardRef } from 'react';
import { View } from 'react-native';
import { Flame } from 'lucide-react-native';
import { Txt } from '../primitives/Text';
import { MicroLabel } from '../primitives/MicroLabel';
import { HairlineRule } from '../primitives/HairlineRule';
import { Score } from '../motion/Score';
import { useTheme, space } from '../../theme';

interface Props {
  handle: string;
  days: number;
  school: string | null;
  sportLabel: string | null;
}

// A shareable milestone clipping for the 7 / 14 / 30-day marks. Mirrors
// ShareCard's flat card treatment (surface + fog border + Inter wordmark), with
// the streak milestone as a sanctioned ember celebration: the flame and the
// day count carry the accent.
export const StreakMilestoneCard = forwardRef<View, Props>(function StreakMilestoneCard(
  { handle, days, school, sportLabel },
  ref,
) {
  const { colors } = useTheme();
  const meta = [school, sportLabel].filter(Boolean).join(' · ').toUpperCase();

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.fog,
        borderRadius: 12,
        padding: space[6],
      }}
    >
      <Txt variant="display2">Elevate</Txt>
      <MicroLabel style={{ marginTop: space[2] }}>
        @{handle}{meta ? `  ·  ${meta}` : ''}
      </MicroLabel>

      <HairlineRule style={{ marginVertical: space[5] }} />

      {/* The celebration: ember flame + ember day count (Inter tabular). */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Flame size={56} color={colors.ember} strokeWidth={2} fill={colors.ember} />
        <Score value={days} size="xl" tone="ember" style={{ marginLeft: space[3] }} />
      </View>
      <Txt variant="display3" style={{ marginTop: space[3] }}>
        days in a row.
      </Txt>

      <HairlineRule style={{ marginVertical: space[5] }} />
      <MicroLabel>KEPT THE STREAK LIT</MicroLabel>
    </View>
  );
});
