import { useState, useMemo } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import Svg, { Polyline, Line } from 'react-native-svg';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { Avatar } from '../../components/primitives/Avatar';
import { Score } from '../../components/motion/Score';
import { TabPill } from '../../components/composite/TabPill';
import { gameById } from '../../data/fixtures/games';
import { playByPlay } from '../../data/fixtures/playByPlay';
import { useTheme, space, SCREEN_PADDING, fonts } from '../../theme';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { useEffect } from 'react';
import { useWindowDimensions } from 'react-native';

const TABS = ['Play-by-play', 'Box', 'Chart', 'Chat'];

function LivePulse({ color }: { color: string }) {
  const o = useSharedValue(0.4);
  useEffect(() => {
    o.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      style={[{ width: 6, height: 6, backgroundColor: color, borderRadius: 3 }, style]}
    />
  );
}

interface BoxRow {
  name: string;
  pts: number;
  reb: number;
  ast: number;
  min: number;
}

const homeBox: BoxRow[] = [
  { name: 'LeBron James', pts: 21, reb: 5, ast: 7, min: 28 },
  { name: 'Anthony Davis', pts: 16, reb: 11, ast: 2, min: 27 },
  { name: 'Austin Reaves', pts: 14, reb: 3, ast: 4, min: 25 },
  { name: 'D’Angelo Russell', pts: 11, reb: 2, ast: 6, min: 22 },
  { name: 'Rui Hachimura', pts: 8, reb: 4, ast: 1, min: 18 },
];

const awayBox: BoxRow[] = [
  { name: 'Jalen Brunson', pts: 24, reb: 4, ast: 7, min: 29 },
  { name: 'Karl-Anthony Towns', pts: 18, reb: 8, ast: 3, min: 28 },
  { name: 'OG Anunoby', pts: 12, reb: 4, ast: 1, min: 26 },
  { name: 'Mikal Bridges', pts: 10, reb: 3, ast: 2, min: 25 },
  { name: 'Josh Hart', pts: 6, reb: 6, ast: 5, min: 22 },
];

function ScoreChart({ color, gridColor }: { color: string; gridColor: string }) {
  const { width } = useWindowDimensions();
  const w = width - SCREEN_PADDING * 2;
  const h = 160;
  const data = [0, -1, 2, 4, 1, -2, 0, 3, 6, 8, 5, 7, 9, 4, 2, 4, 6];
  const max = Math.max(...data.map(Math.abs));
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h / 2 - (v / max) * (h / 2 - 12);
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <Svg width={w} height={h}>
      <Line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke={gridColor} strokeWidth={1} strokeDasharray="2,4" />
      <Polyline points={pts} stroke={color} strokeWidth={1.25} fill="none" />
    </Svg>
  );
}

function ChatStub() {
  const messages = [
    { handle: 'ezra', body: 'this brunson is a problem.', t: '7:42' },
    { handle: 'june', body: 'reaves taking the smart pull-up. someone hand him a pen.', t: '7:38' },
    { handle: 'marisol', body: 'lebron pass to lebron incoming, you can feel it.', t: '7:30' },
    { handle: 'arthur', body: 'the knicks bench is a fashion magazine tonight.', t: '7:22' },
  ];
  return (
    <View>
      {messages.map((m, i) => (
        <View key={i}>
          <View
            style={{
              flexDirection: 'row',
              paddingHorizontal: SCREEN_PADDING,
              paddingVertical: space[4],
              gap: space[3],
            }}
          >
            <Avatar
              size={28}
              uri={`https://images.unsplash.com/photo-${
                ['1535713875002-d1d0cf377fde', '1438761681033-6461ffad8d80', '1492562080023-ab3db95bfbce', '1500648767791-00dcc994a43e'][i % 4]
              }?w=200`}
            />
            <View style={{ flex: 1 }}>
              <Txt variant="bodySm" style={{ fontFamily: 'GeistMedium' }}>
                @{m.handle}{' '}
                <Txt variant="bodySm" tone="ash" style={{ fontFamily: 'GeistMono' }}>
                  {m.t}
                </Txt>
              </Txt>
              <Txt variant="body" style={{ marginTop: 2 }}>
                {m.body}
              </Txt>
            </View>
          </View>
          {i < messages.length - 1 && <HairlineRule />}
        </View>
      ))}
    </View>
  );
}

export default function GamePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [tab, setTab] = useState('Play-by-play');
  const game = gameById(id ?? '');

  const plays = useMemo(() => (id ? playByPlay[id] ?? playByPlay.g1 : playByPlay.g1), [id]);

  if (!game) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
        <Txt>No game.</Txt>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
      <View
        style={{
          height: 56,
          paddingHorizontal: SCREEN_PADDING,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <MicroLabel>{game.sport}</MicroLabel>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <X size={22} color={colors.ink} strokeWidth={1.25} />
        </Pressable>
      </View>

      <HairlineRule />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}
      >
        <View
          style={{
            paddingHorizontal: SCREEN_PADDING,
            paddingTop: space[6],
            paddingBottom: space[6],
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Txt variant="display3" style={{ fontSize: 32, lineHeight: 36 }}>
                {game.away.team.city}
              </Txt>
              <Txt variant="display3" italic style={{ fontFamily: 'InstrumentSerifItalic', fontSize: 32, lineHeight: 36, marginTop: -4 }}>
                {game.away.team.name}
              </Txt>
              <Score value={game.away.score} size="xl" style={{ marginTop: space[3] }} />
            </View>

            <View style={{ width: 1, backgroundColor: colors.fog, marginHorizontal: space[5], minHeight: 140 }} />

            <View style={{ flex: 1, alignItems: 'flex-start' }}>
              <Txt variant="display3" style={{ fontSize: 32, lineHeight: 36 }}>
                {game.home.team.city}
              </Txt>
              <Txt variant="display3" italic style={{ fontFamily: 'InstrumentSerifItalic', fontSize: 32, lineHeight: 36, marginTop: -4 }}>
                {game.home.team.name}
              </Txt>
              <Score value={game.home.score} size="xl" style={{ marginTop: space[3] }} />
            </View>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space[2],
              marginTop: space[5],
            }}
          >
            {game.status === 'live' && <LivePulse color={colors.ink} />}
            <MicroLabel tone="ink">
              {game.status === 'live'
                ? `${game.period} · ${game.clock}`
                : game.status === 'final'
                  ? 'FINAL'
                  : 'SCHEDULED'}
            </MicroLabel>
          </View>
        </View>

        <HairlineRule />

        <View style={{ paddingVertical: space[3] }}>
          <TabPill items={TABS} active={tab} onChange={setTab} />
        </View>
        <HairlineRule />

        {tab === 'Play-by-play' && (
          <View>
            {plays.map((p, i) => (
              <View key={p.id}>
                <View
                  style={{
                    flexDirection: 'row',
                    paddingHorizontal: SCREEN_PADDING,
                    paddingVertical: space[4],
                    alignItems: 'flex-start',
                    backgroundColor: p.scoring ? undefined : 'transparent',
                  }}
                >
                  <View style={{ width: 60 }}>
                    <Txt
                      variant="scoreSm"
                      tone="ash"
                      style={{ fontFamily: fonts.mono }}
                    >
                      {p.clock}
                    </Txt>
                    <MicroLabel style={{ marginTop: 2 }}>{p.period}</MicroLabel>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt variant="body" style={{ lineHeight: 22 }}>
                      {p.description}
                    </Txt>
                    {p.scoring && p.score && (
                      <Txt
                        variant="scoreSm"
                        style={{ marginTop: space[2], fontFamily: fonts.monoMedium }}
                      >
                        {game.away.team.abbreviation} {p.score.away}{'   '}
                        {game.home.team.abbreviation} {p.score.home}
                      </Txt>
                    )}
                  </View>
                </View>
                {i < plays.length - 1 && <HairlineRule />}
              </View>
            ))}
          </View>
        )}

        {tab === 'Box' && (
          <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[5] }}>
            <MicroLabel style={{ marginBottom: space[3] }}>
              {game.away.team.abbreviation}
            </MicroLabel>
            <View
              style={{
                flexDirection: 'row',
                paddingVertical: space[2],
                borderBottomWidth: 1,
                borderBottomColor: colors.fog,
              }}
            >
              <View style={{ flex: 2 }}>
                <MicroLabel>PLAYER</MicroLabel>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <MicroLabel>MIN</MicroLabel>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <MicroLabel>PTS</MicroLabel>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <MicroLabel>REB</MicroLabel>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <MicroLabel>AST</MicroLabel>
              </View>
            </View>
            {awayBox.map((row) => (
              <View
                key={row.name}
                style={{
                  flexDirection: 'row',
                  paddingVertical: space[3],
                  borderBottomWidth: 1,
                  borderBottomColor: colors.fog,
                  alignItems: 'center',
                }}
              >
                <View style={{ flex: 2 }}>
                  <Txt variant="bodySm" style={{ fontFamily: 'InstrumentSerif', fontSize: 18 }}>
                    {row.name}
                  </Txt>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Score value={row.min} size="sm" tone="ash" />
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Score value={row.pts} size="sm" />
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Score value={row.reb} size="sm" />
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Score value={row.ast} size="sm" />
                </View>
              </View>
            ))}

            <MicroLabel style={{ marginTop: space[6], marginBottom: space[3] }}>
              {game.home.team.abbreviation}
            </MicroLabel>
            <View
              style={{
                flexDirection: 'row',
                paddingVertical: space[2],
                borderBottomWidth: 1,
                borderBottomColor: colors.fog,
              }}
            >
              <View style={{ flex: 2 }}>
                <MicroLabel>PLAYER</MicroLabel>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <MicroLabel>MIN</MicroLabel>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <MicroLabel>PTS</MicroLabel>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <MicroLabel>REB</MicroLabel>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <MicroLabel>AST</MicroLabel>
              </View>
            </View>
            {homeBox.map((row) => (
              <View
                key={row.name}
                style={{
                  flexDirection: 'row',
                  paddingVertical: space[3],
                  borderBottomWidth: 1,
                  borderBottomColor: colors.fog,
                  alignItems: 'center',
                }}
              >
                <View style={{ flex: 2 }}>
                  <Txt variant="bodySm" style={{ fontFamily: 'InstrumentSerif', fontSize: 18 }}>
                    {row.name}
                  </Txt>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Score value={row.min} size="sm" tone="ash" />
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Score value={row.pts} size="sm" />
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Score value={row.reb} size="sm" />
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Score value={row.ast} size="sm" />
                </View>
              </View>
            ))}
          </View>
        )}

        {tab === 'Chart' && (
          <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[6] }}>
            <MicroLabel>SCORE DIFFERENTIAL · LAL — NYK</MicroLabel>
            <View style={{ marginTop: space[5] }}>
              <ScoreChart color={colors.ink} gridColor={colors.fog} />
            </View>
            <View style={{ marginTop: space[5], flexDirection: 'row', justifyContent: 'space-between' }}>
              <MicroLabel>Q1</MicroLabel>
              <MicroLabel>Q2</MicroLabel>
              <MicroLabel>Q3</MicroLabel>
              <MicroLabel>Q4</MicroLabel>
            </View>
          </View>
        )}

        {tab === 'Chat' && (
          <View>
            <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[5], paddingBottom: space[3] }}>
              <MicroLabel>WATCH PARTY · 42 ACTIVE</MicroLabel>
            </View>
            <ChatStub />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
