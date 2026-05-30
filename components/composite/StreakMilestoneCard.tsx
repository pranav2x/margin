import { forwardRef } from 'react';
import { View } from 'react-native';
import { Flame } from 'lucide-react-native';
import { Txt } from '../primitives/Text';
import { MicroLabel } from '../primitives/MicroLabel';
import { HairlineRule } from '../primitives/HairlineRule';
import { Grain } from '../primitives/Grain';
import { Score } from '../motion/Score';
import { useTheme, space } from '../../theme';

interface Props {
  handle: string;
  days: number;
  school: string | null;
  sportLabel: string | null;
}

// A shareable milestone clipping for the 7 / 14 / 30-day marks. Mirrors
// ShareCard's newsprint treatment (surface + ink border + grain + masthead),
// but a streak milestone is a sanctioned ember celebration — so the flame and
// the day count carry the accent here. This is the capture target handed to the
// share sheet, so it must read as newsprint in both light and dark.
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
        borderColor: colors.ink,
        padding: space[6],
      }}
    >
      {/* Newsprint grain — sits under the type, captured with the card. */}
      <Grain />
      <Txt variant="display3" style={{ fontSize: 34, lineHeight: 36, letterSpacing: 1 }}>
        Elevate
      </Txt>
      <MicroLabel style={{ marginTop: space[2] }}>
        @{handle}{meta ? `  ·  ${meta}` : ''}
      </MicroLabel>

      <HairlineRule style={{ marginVertical: space[5] }} />

      {/* The celebration: ember flame + ember day count (Geist Mono tabular). */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Flame size={56} color={colors.ember} strokeWidth={1.5} />
        <Score value={days} size="xl" style={{ color: colors.ember, marginLeft: space[3] }} />
      </View>
      <Txt variant="display3" style={{ marginTop: space[3], fontSize: 28 }}>
        days in a row.
      </Txt>

      <HairlineRule style={{ marginVertical: space[5] }} />
      <MicroLabel>KEPT THE STREAK LIT</MicroLabel>
    </View>
  );
});
