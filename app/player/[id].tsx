import { useMemo, useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { Avatar } from '../../components/primitives/Avatar';
import { StatLine } from '../../components/composite/StatLine';
import {
  SPORTS,
  SPORT_LABELS,
  useMyProfile,
  usePublicProfile,
  usePublicStats,
  type PlayerStat,
  type Sport,
} from '../../lib/hooks/usePlayerProfile';
import {
  REPORT_REASONS,
  REPORT_REASON_LABELS,
  useBlockProfile,
  useReportProfile,
  type ReportReason,
} from '../../lib/hooks/useModeration';
import { useFollowCounts, useIsFollowing, useToggleFollow } from '../../lib/hooks/useFollows';
import { Score } from '../../components/motion/Score';
import { useTheme, space, SCREEN_PADDING } from '../../theme';

export default function PlayerProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const profileQ = usePublicProfile(id);
  const statsQ = usePublicStats(id);
  const meQ = useMyProfile();

  const profile = profileQ.data;
  const stats = useMemo(() => statsQ.data ?? [], [statsQ.data]);

  const isSelf = !!id && meQ.data?.id === id;
  const reportMut = useReportProfile();
  const blockMut = useBlockProfile();
  const [showReport, setShowReport] = useState(false);
  const [reported, setReported] = useState(false);

  const isFollowingQ = useIsFollowing(isSelf ? undefined : id);
  const followCountsQ = useFollowCounts(id);
  const toggleFollowMut = useToggleFollow(id);
  const isFollowing = !!isFollowingQ.data;
  const followers = followCountsQ.data?.followers ?? null;
  const following = followCountsQ.data?.following ?? null;

  const onToggleFollow = async () => {
    if (!id || isSelf) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await toggleFollowMut.mutateAsync(isFollowing);
    } catch {
      // Best-effort; query invalidation keeps state honest.
    }
  };

  const submitReport = async (reason: ReportReason) => {
    if (!id) return;
    Haptics.selectionAsync();
    try {
      await reportMut.mutateAsync({ targetProfileId: id, reason });
      setReported(true);
      setShowReport(false);
    } catch {
      // Best-effort; nothing destructive on failure.
    }
  };

  const confirmBlock = () => {
    if (!id) return;
    const who = profile?.handle ? `@${profile.handle}` : 'this athlete';
    Alert.alert(
      `Block ${who}?`,
      "You won't see each other on Elevate. You can't undo this here.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockMut.mutateAsync({ targetProfileId: id });
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.back();
            } catch {
              // Best-effort.
            }
          },
        },
      ],
    );
  };

  const grouped = useMemo(() => {
    const map = new Map<string, PlayerStat[]>();
    for (const s of stats) {
      const arr = map.get(s.metric.sport) ?? [];
      arr.push(s);
      map.set(s.metric.sport, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.metric.sort_order - b.metric.sort_order);
    return (SPORTS as readonly string[])
      .filter((s) => map.has(s))
      .map((s) => ({ sport: s as Sport, rows: map.get(s)! }));
  }, [stats]);

  const handle = profile?.handle ?? '';
  const sportLabel = profile?.primary_sport ? SPORT_LABELS[profile.primary_sport as Sport] ?? null : null;
  const metaLine = [profile?.school?.name, profile?.grad_year ? `CLASS OF ${profile.grad_year}` : null, sportLabel?.toUpperCase()]
    .filter(Boolean)
    .join(' · ');

  const Header = (
    <View
      style={{
        height: 56,
        paddingHorizontal: SCREEN_PADDING,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
      }}
    >
      <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
        <X size={22} color={colors.ink} strokeWidth={2} />
      </Pressable>
    </View>
  );

  if (profileQ.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
        {Header}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.ink} />
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
        {Header}
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: SCREEN_PADDING }}>
          <Txt variant="display3" weight="bold">
            This profile isn't available.
          </Txt>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
      {Header}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + space[10] }}
      >
        <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[5] }}>
          <Avatar uri={profile.avatar_url ?? undefined} size={88} />
          <Txt variant="display1" accessibilityRole="header" style={{ marginTop: space[5] }}>
            {profile.display_name ?? `@${handle}`}
          </Txt>
          <Txt variant="bodySm" tone="ash" weight="semibold" style={{ marginTop: space[1], fontVariant: ['tabular-nums'] }}>
            @{handle}
          </Txt>
          {metaLine.length > 0 && <MicroLabel style={{ marginTop: space[4] }}>{metaLine}</MicroLabel>}

          <View style={{ marginTop: space[4], flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
            <Score value={followers ?? ''} size="sm" tone="ash" />
            <MicroLabel tone="ash">FOLLOWERS</MicroLabel>
            <MicroLabel tone="ash" style={{ marginHorizontal: space[1] }}>·</MicroLabel>
            <Score value={following ?? ''} size="sm" tone="ash" />
            <MicroLabel tone="ash">FOLLOWING</MicroLabel>
          </View>

          {!isSelf && (
            <View style={{ marginTop: space[5] }}>
              <Pressable
                onPress={onToggleFollow}
                disabled={toggleFollowMut.isPending}
                accessibilityRole="button"
                accessibilityLabel={isFollowing ? 'Unfollow' : 'Follow'}
                style={({ pressed }) => ({
                  alignSelf: 'flex-start',
                  backgroundColor: isFollowing ? 'transparent' : colors.ink,
                  borderWidth: isFollowing ? 1 : 0,
                  borderColor: colors.ink,
                  paddingVertical: space[4],
                  paddingHorizontal: space[6],
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 44,
                  opacity: toggleFollowMut.isPending ? 0.4 : pressed ? 0.8 : 1,
                })}
              >
                <Txt variant="label" style={{ color: isFollowing ? colors.ink : colors.paper, letterSpacing: 0.6 }}>
                  {isFollowing ? 'FOLLOWING' : 'FOLLOW'}
                </Txt>
              </Pressable>

              <View style={{ flexDirection: 'row', gap: space[6], marginTop: space[5] }}>
                {reported ? (
                  <MicroLabel tone="ink">REPORTED</MicroLabel>
                ) : (
                  <Pressable
                    onPress={() => { Haptics.selectionAsync(); setShowReport((v) => !v); }}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Report this athlete"
                    style={{ minHeight: 44, justifyContent: 'center' }}
                  >
                    <MicroLabel tone="ink">REPORT</MicroLabel>
                  </Pressable>
                )}
                <Pressable
                  onPress={confirmBlock}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Block this athlete"
                  style={{ minHeight: 44, justifyContent: 'center' }}
                >
                  <MicroLabel tone="ink">BLOCK</MicroLabel>
                </Pressable>
              </View>

              {showReport && !reported && (
                <View style={{ marginTop: space[3] }}>
                  <MicroLabel>WHY ARE YOU REPORTING?</MicroLabel>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[3] }}>
                    {REPORT_REASONS.map((r) => (
                      <Pressable
                        key={r}
                        onPress={() => submitReport(r)}
                        accessibilityRole="button"
                        style={{
                          borderWidth: 1,
                          borderColor: colors.ink,
                          paddingHorizontal: space[3],
                          paddingVertical: space[2],
                          minHeight: 36,
                          justifyContent: 'center',
                        }}
                      >
                        <Txt variant="bodySm">{REPORT_REASON_LABELS[r]}</Txt>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        <HairlineRule style={{ marginTop: space[7] }} />
        <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[6], paddingBottom: space[2] }}>
          <MicroLabel>STAT LINES</MicroLabel>
        </View>

        {grouped.length === 0 ? (
          <View style={{ paddingHorizontal: SCREEN_PADDING, paddingVertical: space[5] }}>
            <Txt variant="display4" tone="ash" weight="semibold">
              No marks on this board yet.
            </Txt>
          </View>
        ) : (
          grouped.map((group) => (
            <View key={group.sport}>
              <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[5], paddingBottom: space[1] }}>
                <Txt variant="display4">{SPORT_LABELS[group.sport]}</Txt>
              </View>
              <HairlineRule />
              {group.rows.map((s, i) => (
                <View key={s.id}>
                  {/* Read-only profile: rows are not editable. */}
                  <StatLine stat={s} onPress={() => undefined} />
                  {i < group.rows.length - 1 && <HairlineRule />}
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
