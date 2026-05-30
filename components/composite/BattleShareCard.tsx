import { forwardRef } from 'react';
import { View } from 'react-native';
import { Txt } from '../primitives/Text';
import { MicroLabel } from '../primitives/MicroLabel';
import { HairlineRule } from '../primitives/HairlineRule';
import { Score } from '../motion/Score';
import { useTheme, space } from '../../theme';

interface Props {
  meHandle: string;
  oppHandle: string;
  sportLabel: string | null;
  myWins: number;
  oppWins: number;
  // True when one or both sides had a mark outside its plausible range, so it
  // was left out of the tally.
  hasUncounted: boolean;
}

// Strava-faithful head-to-head clipping. Display2 Inter 800 wordmark,
// tabular score in the middle, hairlines between sections.
export const BattleShareCard = forwardRef<View, Props>(function BattleShareCard(
  { meHandle, oppHandle, sportLabel, myWins, oppWins, hasUncounted },
  ref,
) {
  const { colors } = useTheme();

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
        HEAD TO HEAD{sportLabel ? `  ·  ${sportLabel.toUpperCase()}` : ''}
      </MicroLabel>

      <HairlineRule style={{ marginVertical: space[5] }} />

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Txt variant="display4" weight="bold" style={{ flex: 1 }} numberOfLines={1}>
          @{meHandle}
        </Txt>
        <Score value={`${myWins}–${oppWins}`} size="lg" style={{ marginHorizontal: space[4] }} />
        <Txt variant="display4" weight="bold" style={{ flex: 1, textAlign: 'right' }} numberOfLines={1}>
          @{oppHandle}
        </Txt>
      </View>

      <HairlineRule style={{ marginVertical: space[5] }} />
      <MicroLabel>
        TALLY · ALL PLAUSIBLE MARKS{hasUncounted ? ' · SOME OUT OF RANGE' : ''}
      </MicroLabel>
    </View>
  );
});
