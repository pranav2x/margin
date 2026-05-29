import { View, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { Avatar } from '../../components/primitives/Avatar';
import { Score } from '../../components/motion/Score';

import { athleteById } from '../../data/fixtures/athletes';
import { useUserStore } from '../../state/user';
import { useTheme, space, SCREEN_PADDING } from '../../theme';

export default function AthletePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const athlete = athleteById(id ?? '');

  const isFollowing = useUserStore((s) => (id ? s.isFollowing(id) : false));
  const toggleFollow = useUserStore((s) => s.toggleFollow);

  if (!athlete) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
        <Txt>No athlete.</Txt>
      </View>
    );
  }

  const vitals: { label: string; value: string | number }[] = [];
  if (athlete.stats.ppg) vitals.push({ label: 'PPG', value: athlete.stats.ppg });
  if (athlete.stats.rpg) vitals.push({ label: 'RPG', value: athlete.stats.rpg });
  if (athlete.stats.apg) vitals.push({ label: 'APG', value: athlete.stats.apg });
  if (athlete.stats.threes) vitals.push({ label: '3PG', value: athlete.stats.threes });

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
        <MicroLabel>{athlete.sport} · {athlete.team.abbreviation} · #{athlete.jersey}</MicroLabel>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <X size={22} color={colors.ink} strokeWidth={1.25} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}
      >
        <View
          style={{
            paddingHorizontal: SCREEN_PADDING,
            paddingTop: space[6],
            paddingBottom: space[5],
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1 }}>
            <Txt
              variant="display1"
              style={{ fontSize: 56, lineHeight: 60 }}
            >
              {athlete.firstName}
            </Txt>
            <Txt
              variant="display1"
              italic
              style={{ fontSize: 56, lineHeight: 60, fontFamily: 'InstrumentSerifItalic' }}
            >
              {athlete.lastName}
            </Txt>
          </View>
          <Avatar uri={athlete.avatar} size={88} />
        </View>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toggleFollow(athlete.id);
          }}
          style={{
            marginHorizontal: SCREEN_PADDING,
            paddingVertical: space[3],
            paddingHorizontal: space[5],
            backgroundColor: isFollowing ? colors.ink : 'transparent',
            borderWidth: 1,
            borderColor: colors.ink,
            borderRadius: 999,
            alignSelf: 'flex-start',
          }}
        >
          <Txt
            variant="label"
            style={{ color: isFollowing ? colors.paper : colors.ink, letterSpacing: 0.6 }}
          >
            {isFollowing ? 'FOLLOWING' : 'FOLLOW'}
          </Txt>
        </Pressable>

        {athlete.bio && (
          <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[5] }}>
            <Txt variant="bodyLg" tone="ash">
              {athlete.bio}
            </Txt>
          </View>
        )}

        <HairlineRule style={{ marginTop: space[7] }} />

        <View style={{ paddingHorizontal: SCREEN_PADDING, paddingVertical: space[6] }}>
          <MicroLabel>SEASON</MicroLabel>
        </View>

        <View
          style={{
            flexDirection: 'row',
            paddingHorizontal: SCREEN_PADDING,
            paddingBottom: space[6],
            justifyContent: 'space-between',
          }}
        >
          {vitals.map((v, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'flex-start' }}>
              <Score value={v.value} size="md" />
              <MicroLabel style={{ marginTop: space[2] }}>{v.label}</MicroLabel>
            </View>
          ))}
        </View>

        {athlete.recent && athlete.recent.length > 0 && (
          <>
            <HairlineRule />
            <View style={{ paddingHorizontal: SCREEN_PADDING, paddingVertical: space[6] }}>
              <MicroLabel>RECENT</MicroLabel>
            </View>
            {athlete.recent.map((g, i) => (
              <View key={i}>
                <View
                  style={{
                    flexDirection: 'row',
                    paddingHorizontal: SCREEN_PADDING,
                    paddingVertical: space[4],
                    alignItems: 'center',
                  }}
                >
                  <View style={{ width: 80 }}>
                    <Score
                      value={new Date(g.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      size="sm"
                      tone="ash"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt variant="body">{g.opponent}</Txt>
                    <Txt variant="bodySm" tone="ash" style={{ marginTop: 2 }}>
                      {g.line}
                    </Txt>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Txt variant="bodyLg" italic={g.result === 'W'}>
                      {g.result}
                    </Txt>
                    <Score value={`±${g.margin}`} size="sm" tone="ash" />
                  </View>
                </View>
                {i < (athlete.recent?.length ?? 0) - 1 && <HairlineRule />}
              </View>
            ))}
          </>
        )}

        <View style={{ paddingVertical: space[10], alignItems: 'center' }}>
          <Txt
            variant="display4"
            italic
            tone="ash"
            style={{ fontSize: 18, fontFamily: 'InstrumentSerifItalic' }}
          >
            #{athlete.jersey} · {athlete.team.name}
          </Txt>
        </View>
      </ScrollView>
    </View>
  );
}
