import { useMemo, useState } from 'react';
import { View, FlatList } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from '../../components/primitives/Text';
import { Card } from '../../components/primitives/Card';
import { AppIcon } from '../../components/primitives/AppIcon';
import { PrimaryButton } from '../../components/primitives/PrimaryButton';
import { ConfidenceMeter } from '../../components/primitives/ConfidenceMeter';
import { SocialActionRow } from '../../components/primitives/SocialActionRow';
import { AvatarMeta } from '../../components/composite/AvatarMeta';
import { TabPill } from '../../components/composite/TabPill';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { useTheme, space, SCREEN_PADDING } from '../../theme';

// A Call is a sports prediction with a 1–10 confidence rating.
type CallStatus = 'open' | 'won' | 'lost';

interface CallRow {
  id: string;
  author: {
    handle: string;
    avatarUrl?: string;
    sport: string;
  };
  timestamp: string; // human-readable for now ("2h", "yesterday")
  body: string;
  confidence: number; // 1–10
  status: CallStatus;
  likes: number;
  comments: number;
  shares: number;
  liked?: boolean;
}

// TODO(supabase): replace with useCalls() hook once the schema lands.
const MOCK_CALLS: CallRow[] = [
  {
    id: 'call-1',
    author: { handle: 'jordanmiles', sport: 'NBA', avatarUrl: 'https://i.pravatar.cc/120?img=12' },
    timestamp: '2h',
    body: 'Lakers cover the spread tonight. LeBron has a chip on his shoulder after that loss in Denver.',
    confidence: 8,
    status: 'open',
    likes: 24,
    comments: 6,
    shares: 2,
  },
  {
    id: 'call-2',
    author: { handle: 'sammccree', sport: 'NFL', avatarUrl: 'https://i.pravatar.cc/120?img=32' },
    timestamp: '5h',
    body: 'Bills win the AFC East outright. Defense is rebuilt and Josh Allen is healthy.',
    confidence: 9,
    status: 'won',
    likes: 142,
    comments: 38,
    shares: 17,
    liked: true,
  },
  {
    id: 'call-3',
    author: { handle: 'tay_runs_track', sport: 'TRACK', avatarUrl: 'https://i.pravatar.cc/120?img=47' },
    timestamp: 'yesterday',
    body: "Sub-4:00 mile at state finals. I've been splitting 59s in practice.",
    confidence: 6,
    status: 'open',
    likes: 11,
    comments: 3,
    shares: 0,
  },
  {
    id: 'call-4',
    author: { handle: 'mikedrops', sport: 'NBA', avatarUrl: 'https://i.pravatar.cc/120?img=8' },
    timestamp: '2d',
    body: "Wemby drops 40 against the Suns. He's been telegraphing this matchup all week.",
    confidence: 4,
    status: 'lost',
    likes: 56,
    comments: 22,
    shares: 4,
  },
  {
    id: 'call-5',
    author: { handle: 'kara.h', sport: 'WNBA', avatarUrl: 'https://i.pravatar.cc/120?img=20' },
    timestamp: '3d',
    body: "A'ja Wilson is the MVP. Lock it in — Aces close out the regular season at home.",
    confidence: 10,
    status: 'open',
    likes: 88,
    comments: 14,
    shares: 9,
    liked: true,
  },
];

const FILTERS = ['All', 'Open', 'Decided', 'Following'] as const;
type Filter = (typeof FILTERS)[number];

function StatusBadge({ status }: { status: Exclude<CallStatus, 'open'> }) {
  const { colors } = useTheme();
  const isWon = status === 'won';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[1],
        paddingHorizontal: space[2],
        paddingVertical: space[1],
        borderRadius: 4,
        backgroundColor: isWon ? colors.surface : colors.surface,
      }}
    >
      <AppIcon name={isWon ? 'Trophy' : 'X'} size={14} tone={isWon ? 'ember' : 'ash'} />
      <Txt
        variant="micro"
        style={{ color: isWon ? colors.ember : colors.ash }}
      >
        {isWon ? 'CALLED IT' : 'MISSED'}
      </Txt>
    </View>
  );
}

function CallCard({ call, onPress }: { call: CallRow; onPress: () => void }) {
  return (
    <Card pressable onPress={onPress} style={{ padding: space[5] }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <AvatarMeta
            avatarUrl={call.author.avatarUrl}
            handle={call.author.handle}
            meta={call.author.sport}
            timestamp={call.timestamp}
            size="md"
          />
        </View>
        {call.status !== 'open' ? <StatusBadge status={call.status} /> : null}
      </View>

      <Txt variant="bodyLg" style={{ marginTop: space[4] }}>
        {call.body}
      </Txt>

      <View style={{ marginTop: space[5] }}>
        <ConfidenceMeter value={call.confidence} editable={false} size="sm" />
      </View>

      <View style={{ marginTop: space[5] }}>
        <HairlineRule />
        <View style={{ marginTop: space[4] }}>
          <SocialActionRow
            likes={call.likes}
            comments={call.comments}
            shares={call.shares}
            liked={call.liked}
          />
        </View>
      </View>
    </Card>
  );
}

function EmptyState({ onMakeCall }: { onMakeCall: () => void }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SCREEN_PADDING,
        gap: space[4],
        minHeight: 360,
      }}
    >
      <AppIcon name="Target" size={48} tone="ash" />
      <Txt variant="display4" weight="bold" style={{ textAlign: 'center' }}>
        No calls yet
      </Txt>
      <Txt variant="bodyLg" tone="ash" style={{ textAlign: 'center' }}>
        Be the first to make one.
      </Txt>
      <View style={{ marginTop: space[3] }}>
        <PrimaryButton label="MAKE A CALL" onPress={onMakeCall} />
      </View>
    </View>
  );
}

export default function CallsIndex() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('All');

  // TODO(supabase): replace with useCalls({ filter }) hook once the schema lands.
  const visible = useMemo(() => {
    if (filter === 'Open') return MOCK_CALLS.filter((c) => c.status === 'open');
    if (filter === 'Decided') return MOCK_CALLS.filter((c) => c.status !== 'open');
    if (filter === 'Following') {
      // TODO(supabase): filter to authors the current user follows.
      return MOCK_CALLS.slice(0, 2);
    }
    return MOCK_CALLS;
  }, [filter]);

  const renderHeader = () => (
    <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: insets.top + space[3], paddingBottom: space[4] }}>
      <Txt variant="display4" weight="bold">
        Calls
      </Txt>
      <View style={{ marginTop: space[4], marginHorizontal: -SCREEN_PADDING }}>
        <TabPill items={[...FILTERS]} active={filter} onChange={(v) => setFilter(v as Filter)} />
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <Stack.Screen options={{ title: 'Calls' }} />
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState onMakeCall={() => router.push('/calls/new')} />
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: space[4] }}>
            <CallCard call={item} onPress={() => router.push(`/calls/${item.id}`)} />
          </View>
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + space[8] }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
