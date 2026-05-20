import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MastheadBar } from '../../components/composite/MastheadBar';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { Txt } from '../../components/primitives/Text';
import { TabPill } from '../../components/composite/TabPill';
import { TakeCard } from '../../components/composite/TakeCard';
import { FloatingComposer } from '../../components/composite/FloatingComposer';
import { TakeComposer } from '../../components/composite/TakeComposer';
import { useTakesStore } from '../../state/takes';
import { useTheme, space } from '../../theme';

const FILTERS = ['Following', 'NBA', 'NFL', 'Soccer', 'CFB', 'WNBA', 'MLB', 'Hot', 'New'];

export default function TakesScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const takes = useTakesStore((s) => s.takes);
  const postTake = useTakesStore((s) => s.postTake);

  const [filter, setFilter] = useState('Following');
  const [composerOpen, setComposerOpen] = useState(false);

  const filtered = useMemo(() => {
    if (filter === 'Following' || filter === 'New') return takes;
    if (filter === 'Hot') {
      return [...takes].sort(
        (a, b) =>
          b.counts.cosign + b.counts.respond + b.counts.dispute -
          (a.counts.cosign + a.counts.respond + a.counts.dispute),
      );
    }
    return takes.filter((t) => (t.topic ? t.topic === filter.toUpperCase() : false));
  }, [filter, takes]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
      <MastheadBar title="MARGIN" showDate={false} />

      <View style={{ paddingVertical: space[2] }}>
        <TabPill items={FILTERS} active={filter} onChange={setFilter} />
      </View>
      <HairlineRule />

      <FlashList
        data={filtered}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => <TakeCard take={item} />}
        ItemSeparatorComponent={() => <HairlineRule />}
        contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
        ListEmptyComponent={
          <View style={{ paddingVertical: space[10], alignItems: 'center' }}>
            <Txt variant="display4" italic tone="ash" style={{ fontFamily: 'InstrumentSerifItalic' }}>
              Quiet in here.
            </Txt>
          </View>
        }
        ListFooterComponent={
          <View style={{ paddingVertical: space[10], alignItems: 'center' }}>
            <Txt
              variant="display4"
              italic
              tone="ash"
              style={{ fontSize: 18, fontFamily: 'InstrumentSerifItalic' }}
            >
              End of feed.
            </Txt>
          </View>
        }
      />

      <FloatingComposer
        onPress={() => setComposerOpen(true)}
        bottom={92 + insets.bottom}
      />

      <TakeComposer
        visible={composerOpen}
        onClose={() => setComposerOpen(false)}
        onPost={postTake}
      />
    </View>
  );
}
