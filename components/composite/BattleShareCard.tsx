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

// Black-and-white press-clipping for a head-to-head, mirroring ShareCard.
// Rendered on-screen and used as the view-shot capture target.
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
        backgroundColor: colors.paper,
        borderWidth: 1,
        borderColor: colors.ink,
        padding: space[6],
      }}
    >
      <Txt variant="display3" style={{ fontSize: 34, lineHeight: 36, letterSpacing: 1 }}>
        Elevate
      </Txt>
      <MicroLabel style={{ marginTop: space[2] }}>
        HEAD TO HEAD{sportLabel ? `  ·  ${sportLabel.toUpperCase()}` : ''}
      </MicroLabel>

      <HairlineRule style={{ marginVertical: space[5] }} />

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Txt variant="display4" style={{ fontSize: 22, flex: 1 }} numberOfLines={1}>
          @{meHandle}
        </Txt>
        <Score value={`${myWins}–${oppWins}`} size="lg" style={{ marginHorizontal: space[4] }} />
        <Txt variant="display4" style={{ fontSize: 22, flex: 1, textAlign: 'right' }} numberOfLines={1}>
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
