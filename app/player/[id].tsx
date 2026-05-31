import { useMemo, useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { Avatar } from '../../components/primitives/Avatar';
import { AppIcon } from '../../components/primitives/AppIcon';
import { PrimaryButton } from '../../components/primitives/PrimaryButton';
import { StatBlock, StatBlockRow } from '../../components/primitives/StatBlock';
import { StatLine } from '../../components/composite/StatLine';
import {
  SPORTS,
  SPORT_LABELS,
  formatStatValue,
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
import { useTheme, space, radius, SCREEN_PADDING } from '../../theme';

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
  const [showMore, setShowMore] = useState(false);

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
      setShowMore(false);
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

  const headline = useMemo(() => {
    const plausible = stats.filter((s) => s.is_plausible !== false);
    plausible.sort(
      (a, b) => Number(b.verified) - Number(a.verified) || a.metric.sort_order - b.metric.sort_order,
    );
    return plausible.slice(0, 1);
  }, [stats]);
  const top = headline[0];

  const verifiedCount = useMemo(
    () => stats.filter((s) => s.verified && s.is_plausible !== false).length,
    [stats],
  );
  const totalCount = stats.length;

  const handle = profile?.handle ?? '';
  const sportLabel = profile?.primary_sport ? SPORT_LABELS[profile.primary_sport as Sport] ?? null : null;
  const metaLine = [profile?.school?.name, profile?.grad_year ? `CLASS OF ${profile.grad_year}` : null, sportLabel?.toUpperCase()]
    .filter(Boolean)
    .join(' · ');

  // Top chrome row — close button on the left, More on the right (visible only
  // for non-self profiles so block/report don't surface on your own card).
  const Header = (
    <View
      style={{
        height: 56,
        paddingHorizontal: SCREEN_PADDING,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Close"
        style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}
      >
        <AppIcon name="X" size={22} tone="ink" />
      </Pressable>
      {!isSelf && profile ? (
        <Pressable
          onPress={() => { Haptics.selectionAsync(); setShowMore((v) => !v); }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="More options"
          style={{ minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <AppIcon name="MoreHorizontal" size={22} tone="ink" />
        </Pressable>
      ) : null}
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

  const headlineValue = top ? formatStatValue(top.value, top.metric.unit) : null;
  const headlineLabel = top
    ? `${top.metric.label.toUpperCase()}${top.metric.unit ? ` · ${top.metric.unit}` : ''}`
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
      {Header}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + space[10] }}
      >
        {/* Masthead — mirrors the You tab. Avatar 96px, name display3 bold,
            @handle in bodyLg ash semibold, meta in bodySm ash. Centered. */}
        <View
          style={{
            paddingHorizontal: SCREEN_PADDING,
            paddingTop: space[4],
            alignItems: 'center',
          }}
        >
          <Avatar uri={profile.avatar_url ?? undefined} seed={profile.handle ?? undefined} size={96} />
          <Txt
            variant="display3"
            weight="bold"
            accessibilityRole="header"
            style={{ marginTop: space[4], textAlign: 'center' }}
          >
            {profile.display_name ?? `@${handle}`}
          </Txt>
          <Txt
            variant="bodyLg"
            tone="ash"
            weight="semibold"
            style={{ marginTop: space[1], textAlign: 'center', fontVariant: ['tabular-nums'] }}
          >
            @{handle}
          </Txt>
          {metaLine.length > 0 && (
            <Txt
              variant="bodySm"
              tone="ash"
              style={{ marginTop: space[2], textAlign: 'center' }}
            >
              {metaLine}
            </Txt>
          )}

          {/* Follow / Following — filled ember when not following, ghost
              once following so the orange retreats to confirmation, not state. */}
          {!isSelf && (
            <View style={{ marginTop: space[5], alignSelf: 'stretch', alignItems: 'center' }}>
              <PrimaryButton
                label={isFollowing ? 'Following' : 'Follow'}
                variant={isFollowing ? 'ghost' : 'primary'}
                onPress={onToggleFollow}
                disabled={toggleFollowMut.isPending}
                accessibilityLabel={isFollowing ? 'Unfollow' : 'Follow'}
                style={{ minWidth: 140 }}
              />
            </View>
          )}
        </View>

        {/* Followers / Following — small StatBlock pair above the stat hero. */}
        <View
          style={{
            paddingHorizontal: SCREEN_PADDING,
            paddingTop: space[7],
            flexDirection: 'row',
            justifyContent: 'center',
            gap: space[8],
          }}
        >
          <StatBlock
            value={followers ?? 0}
            label="FOLLOWERS"
            size="sm"
            align="center"
          />
          <StatBlock
            value={following ?? 0}
            label="FOLLOWING"
            size="sm"
            align="center"
          />
        </View>

        {/* Headline stat — the public-facing narrative number. Ember accent
            (the one orange beat on the page besides the Follow CTA). */}
        {headlineValue && headlineLabel ? (
          <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[8] }}>
            <StatBlock
              value={headlineValue}
              label={headlineLabel}
              size="xl"
              tone="accent"
              align="center"
            />
          </View>
        ) : null}

        {/* Stat hero row — verified · tracked. No streak on a public profile
            (sensitive — only the viewer's own streak is shown on the You tab). */}
        {totalCount > 0 ? (
          <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[7] }}>
            <StatBlockRow>
              <StatBlock
                value={verifiedCount}
                label="VERIFIED"
                align="center"
                size="md"
              />
              <StatBlock
                value={totalCount}
                label="TRACKED"
                align="center"
                size="md"
              />
            </StatBlockRow>
          </View>
        ) : null}

        {/* Report / Block — surfaced via the More icon in the header. We keep
            the same reason flow that lived inline before. */}
        {showMore && !isSelf && (
          <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[6] }}>
            <View style={{ flexDirection: 'row', gap: space[3] }}>
              {reported ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 44 }}>
                  <MicroLabel tone="ink">REPORTED</MicroLabel>
                </View>
              ) : (
                <PrimaryButton
                  label="Report"
                  variant="ghost"
                  size="compact"
                  full
                  onPress={() => { Haptics.selectionAsync(); setShowReport((v) => !v); }}
                  style={{ flex: 1 }}
                />
              )}
              <PrimaryButton
                label="Block"
                variant="ghost"
                size="compact"
                full
                onPress={confirmBlock}
                style={{ flex: 1 }}
              />
            </View>

            {showReport && !reported && (
              <View style={{ marginTop: space[4] }}>
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
                        borderRadius: radius.sm,
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

        {/* Stat lines — grouped per sport. Hairlines do the partitioning,
            MicroLabel sport headers do the labelling. No card chrome. */}
        <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[8] }}>
          <MicroLabel>STAT LINES</MicroLabel>
        </View>

        {grouped.length === 0 ? (
          <View style={{ paddingHorizontal: SCREEN_PADDING, paddingVertical: space[5] }}>
            <Txt variant="display4" tone="ash" weight="semibold">
              No marks on this board yet.
            </Txt>
          </View>
        ) : (
          <View style={{ paddingTop: space[3] }}>
            {grouped.map((group, gi) => (
              <View key={group.sport}>
                {gi > 0 && <HairlineRule style={{ marginTop: space[5] }} />}
                <View
                  style={{
                    paddingHorizontal: SCREEN_PADDING,
                    paddingTop: gi === 0 ? space[2] : space[5],
                    paddingBottom: space[2],
                  }}
                >
                  <MicroLabel>{SPORT_LABELS[group.sport].toUpperCase()}</MicroLabel>
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
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
