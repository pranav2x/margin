import { useMemo } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MastheadBar } from '../../components/composite/MastheadBar';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { CallCard } from '../../components/composite/CallCard';
import { Score } from '../../components/motion/Score';
import { RollUpNumber } from '../../components/motion/RollUpNumber';
import { games } from '../../data/fixtures/games';
import { useCallsStore } from '../../state/calls';
import { useTheme, space, SCREEN_PADDING } from '../../theme';
import { recordPct } from '../../lib/utils/format';

export default function PicksScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const record = useCallsStore((s) => s.record);
  const filed = useCallsStore((s) => s.filed);
  const settle = useCallsStore((s) => s.settleAllRandom);

  const upcoming = useMemo(
    () => games.filter((g) => g.status === 'scheduled'),
    [],
  );

  const pct = recordPct(record.wins, record.losses);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
      <MastheadBar title="MARGIN" showDate={false} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
      >
        <View style={{ paddingHorizontal: SCREEN_PADDING, paddingVertical: space[7] }}>
          <MicroLabel>YOUR MARGIN</MicroLabel>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              marginTop: space[3],
            }}
          >
            <RollUpNumber value={record.wins} size="xl" />
            <Score
              value="–"
              size="xl"
              tone="ash"
              style={{ marginHorizontal: space[2] }}
            />
            <RollUpNumber value={record.losses} size="xl" />
          </View>
          <MicroLabel style={{ marginTop: space[4] }}>
            YOUR RECORD · {pct}% · TOP 4%
          </MicroLabel>
          {Object.keys(filed).some((k) => !filed[k].result) && (
            <Pressable
              onPress={settle}
              style={{
                marginTop: space[5],
                alignSelf: 'flex-start',
              }}
              hitSlop={8}
            >
              <Txt variant="bodySm" italic tone="ash" style={{ fontFamily: 'InstrumentSerifItalic' }}>
                simulate game results →
              </Txt>
            </Pressable>
          )}
        </View>

        <HairlineRule />

        <View
          style={{
            paddingHorizontal: SCREEN_PADDING,
            paddingVertical: space[5],
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <MicroLabel>TONIGHT</MicroLabel>
          <MicroLabel>{upcoming.length} GAMES</MicroLabel>
        </View>
        <HairlineRule />

        {upcoming.map((g, i) => (
          <View key={g.id}>
            <CallCard game={g} />
            {i < upcoming.length - 1 && <View style={{ height: space[3] }} />}
          </View>
        ))}

        <View style={{ paddingVertical: space[10], alignItems: 'center' }}>
          <Txt
            variant="display4"
            italic
            tone="ash"
            style={{ fontSize: 18, fontFamily: 'InstrumentSerifItalic' }}
          >
            That’s the slate.
          </Txt>
        </View>
      </ScrollView>
    </View>
  );
}
