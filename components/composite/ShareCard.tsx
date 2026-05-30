import { forwardRef } from 'react';
import { View } from 'react-native';
import { Txt } from '../primitives/Text';
import { MicroLabel } from '../primitives/MicroLabel';
import { HairlineRule } from '../primitives/HairlineRule';
import { Score } from '../motion/Score';
import { VerifiedMark } from './StatLine';
import { useTheme, space } from '../../theme';

export interface HeadlineStat {
  label: string;
  value: string;
  unit: string | null;
  verified: boolean;
}

interface Props {
  handle: string;
  school: string | null;
  sportLabel: string | null;
  stats: HeadlineStat[];
}

// A black-and-white press-clipping. Rendered on-screen and also the capture
// target for the share sheet. Reads as newsprint in both light and dark.
export const ShareCard = forwardRef<View, Props>(function ShareCard(
  { handle, school, sportLabel, stats },
  ref,
) {
  const { colors } = useTheme();
  const meta = [school, sportLabel].filter(Boolean).join(' · ').toUpperCase();

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
        @{handle}{meta ? `  ·  ${meta}` : ''}
      </MicroLabel>

      <HairlineRule style={{ marginVertical: space[5] }} />

      {stats.length === 0 ? (
        <Txt variant="display4" italic tone="ash" style={{ fontFamily: 'InstrumentSerifItalic' }}>
          No headline stat yet.
        </Txt>
      ) : (
        stats.map((s, i) => (
          <View key={s.label} style={{ marginTop: i === 0 ? 0 : space[5] }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: space[4] }}>
                <Txt variant="bodyLg">{s.label}</Txt>
                {s.unit ? <MicroLabel style={{ marginTop: space[1] }}>{s.unit}</MicroLabel> : null}
              </View>
              <Score value={s.value} size="lg" />
            </View>
            <View style={{ marginTop: space[3] }}>
              <VerifiedMark verified={s.verified} />
            </View>
          </View>
        ))
      )}

      <HairlineRule style={{ marginVertical: space[5] }} />
      <MicroLabel>YOUR GAME, BY THE NUMBERS</MicroLabel>
    </View>
  );
});
