import { View, Pressable, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { Card } from '../../components/primitives/Card';
import { AppIcon } from '../../components/primitives/AppIcon';
import { ConfidenceMeter } from '../../components/primitives/ConfidenceMeter';
import { SocialActionRow } from '../../components/primitives/SocialActionRow';
import { PrimaryButton } from '../../components/primitives/PrimaryButton';
import { AvatarMeta } from '../../components/composite/AvatarMeta';
import { useTheme, space, radius, SCREEN_PADDING } from '../../theme';

// A Call is a sports prediction with a 1–10 confidence rating.
type CallStatus = 'open' | 'won' | 'lost';

interface CallDetailRow {
  id: string;
  author: {
    handle: string;
    avatarUrl?: string;
    sport: string;
  };
  timestamp: string;
  subject: string;
  detail?: string;
  confidence: number;
  status: CallStatus;
  likes: number;
  comments: number;
  shares: number;
  liked?: boolean;
}

interface CommentRow {
  id: string;
  author: {
    handle: string;
    avatarUrl?: string;
  };
  timestamp: string;
  body: string;
}

// TODO(supabase): replace with useCall(id) hook once the schema lands.
const MOCK_CALLS: CallDetailRow[] = [
  {
    id: 'call-1',
    author: { handle: 'jordanmiles', sport: 'NBA', avatarUrl: 'https://i.pravatar.cc/120?img=12' },
    timestamp: '2h',
    subject: 'Lakers cover the spread tonight.',
    detail:
      "LeBron has a chip on his shoulder after that loss in Denver. Defense has been locking in over the last 5 games, and the line moved 2pts in our favor since open.",
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
    subject: 'Bills win the AFC East outright.',
    detail: 'Defense is rebuilt and Josh Allen is healthy. Miami is going to fold by week 12.',
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
    subject: 'Sub-4:00 mile at state finals.',
    detail: "I've been splitting 59s in practice. Weather looks clean. Pacers are dialed.",
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
    subject: 'Wemby drops 40 against the Suns.',
    detail: "He's been telegraphing this matchup all week. Bradley is fresh off injury and KD is questionable.",
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
    subject: "A'ja Wilson is the MVP.",
    detail: "Lock it in — Aces close out the regular season at home and she's averaging 28/12.",
    confidence: 10,
    status: 'open',
    likes: 88,
    comments: 14,
    shares: 9,
    liked: true,
  },
];

// TODO(supabase): wire comments — useCallComments(id) once schema lands.
const MOCK_COMMENTS: CommentRow[] = [
  {
    id: 'c-1',
    author: { handle: 'baselinekev', avatarUrl: 'https://i.pravatar.cc/120?img=15' },
    timestamp: '1h',
    body: 'No way. The bench is gassed and DLo is a sieve right now.',
  },
  {
    id: 'c-2',
    author: { handle: 'gymrat', avatarUrl: 'https://i.pravatar.cc/120?img=39' },
    timestamp: '52m',
    body: 'Locked. Taking the over too while we are at it.',
  },
  {
    id: 'c-3',
    author: { handle: 'court_vision', avatarUrl: 'https://i.pravatar.cc/120?img=27' },
    timestamp: '14m',
    body: 'Defense has been a top-3 unit this month — solid take.',
  },
];

function StatusBanner({ status }: { status: Exclude<CallStatus, 'open'> }) {
  const { colors } = useTheme();
  const isWon = status === 'won';
  return (
    <Card
      tone="surface"
      style={{
        marginTop: space[5],
        padding: space[4],
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        borderColor: isWon ? colors.ember : colors.fog,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isWon ? colors.ember : colors.fog,
        }}
      >
        <AppIcon
          name={isWon ? 'Trophy' : 'X'}
          size={20}
          tone={isWon ? 'paper' : 'ink'}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Txt
          variant="label"
          style={{ color: isWon ? colors.ember : colors.ash, letterSpacing: 0.6 }}
        >
          {isWon ? 'CALLED IT' : 'MISSED'}
        </Txt>
        <Txt variant="bodySm" tone="ash" style={{ marginTop: 2 }}>
          {isWon ? 'This call landed.' : 'This call did not hit.'}
        </Txt>
      </View>
    </Card>
  );
}

function NotFound() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.paper,
        paddingTop: insets.top + space[5],
        paddingHorizontal: SCREEN_PADDING,
        alignItems: 'center',
        justifyContent: 'center',
        gap: space[4],
      }}
    >
      <AppIcon name="Target" size={48} tone="ash" />
      <Txt variant="display4" weight="bold">
        Call not found
      </Txt>
      <Txt variant="bodyLg" tone="ash" style={{ textAlign: 'center' }}>
        This call may have been removed.
      </Txt>
      <PrimaryButton label="GO BACK" onPress={() => router.back()} />
    </View>
  );
}

export default function CallDetail() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // TODO(supabase): replace with useCall(id) hook once the schema lands.
  const call = MOCK_CALLS.find((c) => c.id === id);

  if (!call) {
    return <NotFound />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <Stack.Screen options={{ title: 'Call' }} />

      {/* Custom header */}
      <View
        style={{
          paddingTop: insets.top + space[2],
          paddingHorizontal: SCREEN_PADDING,
          paddingBottom: space[3],
          flexDirection: 'row',
          alignItems: 'center',
          gap: space[3],
        }}
      >
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.back();
          }}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginLeft: -space[1] }}
        >
          <AppIcon name="ChevronLeft" size={28} tone="ink" />
        </Pressable>
        <MicroLabel style={{ flex: 1 }}>CALL</MicroLabel>
        <Pressable
          onPress={() => Haptics.selectionAsync()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="More"
        >
          <AppIcon name="MoreHorizontal" size={22} tone="ash" />
        </Pressable>
      </View>
      <HairlineRule />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: SCREEN_PADDING,
          paddingTop: space[5],
          paddingBottom: insets.bottom + space[8],
        }}
        showsVerticalScrollIndicator={false}
      >
        <Card style={{ padding: space[5] }}>
          <AvatarMeta
            avatarUrl={call.author.avatarUrl}
            handle={call.author.handle}
            meta={call.author.sport}
            timestamp={call.timestamp}
            size="md"
          />

          <Txt variant="display3" style={{ marginTop: space[5] }}>
            {call.subject}
          </Txt>

          {call.detail ? (
            <Txt variant="bodyLg" tone="ash" style={{ marginTop: space[4] }}>
              {call.detail}
            </Txt>
          ) : null}

          <View style={{ marginTop: space[6] }}>
            <MicroLabel>CONFIDENCE</MicroLabel>
            <View style={{ marginTop: space[3] }}>
              <ConfidenceMeter value={call.confidence} editable={false} size="lg" />
            </View>
          </View>

          {call.status !== 'open' ? <StatusBanner status={call.status} /> : null}
        </Card>

        {/* Social */}
        <View style={{ marginTop: space[5], paddingHorizontal: space[2] }}>
          <SocialActionRow
            likes={call.likes}
            comments={call.comments}
            shares={call.shares}
            liked={call.liked}
          />
        </View>

        {/* Comments thread */}
        <View style={{ marginTop: space[7] }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: space[3],
            }}
          >
            <MicroLabel>COMMENTS · {MOCK_COMMENTS.length}</MicroLabel>
            <Pressable
              onPress={() => Haptics.selectionAsync()}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Add comment"
            >
              <Txt variant="label" weight="semibold" style={{ color: colors.ember }}>
                ADD
              </Txt>
            </Pressable>
          </View>
          <HairlineRule />

          {/* TODO(supabase): wire comments — useCallComments(id) + createComment mutation. */}
          {MOCK_COMMENTS.map((c, idx) => (
            <View key={c.id}>
              <View style={{ paddingVertical: space[4] }}>
                <AvatarMeta
                  avatarUrl={c.author.avatarUrl}
                  handle={c.author.handle}
                  timestamp={c.timestamp}
                  size="sm"
                />
                <Txt variant="body" style={{ marginTop: space[3], paddingLeft: space[8] + space[3] }}>
                  {c.body}
                </Txt>
              </View>
              {idx < MOCK_COMMENTS.length - 1 ? <HairlineRule /> : null}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
