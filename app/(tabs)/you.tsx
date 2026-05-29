import { useMemo, useRef, useState } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { Avatar } from '../../components/primitives/Avatar';
import { PrimaryButton } from '../../components/primitives/PrimaryButton';
import { RollUpNumber } from '../../components/motion/RollUpNumber';
import { Score } from '../../components/motion/Score';
import { StatLine, VerifiedMark } from '../../components/composite/StatLine';
import { ShareCard, type HeadlineStat } from '../../components/composite/ShareCard';
import { StatEntrySheet, type StatEntrySheetRef } from '../../components/composite/StatEntrySheet';
import {
  SPORTS,
  SPORT_LABELS,
  formatStatValue,
  useMetricCatalog,
  useMyProfile,
  useMyStats,
  type PlayerStat,
  type Sport,
} from '../../lib/hooks/usePlayerProfile';
import { useTheme, space, SCREEN_PADDING } from '../../theme';
import { signOut } from '../../lib/auth';

export default function YouScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const profileQ = useMyProfile();
  const statsQ = useMyStats();
  const catalogQ = useMetricCatalog();

  const sheetRef = useRef<StatEntrySheetRef>(null);
  const cardRef = useRef<View>(null);

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setSignOutError(null);
    try {
      await signOut();
    } catch (err) {
      setSignOutError(err instanceof Error ? err.message : 'Sign out failed.');
      setIsSigningOut(false);
    }
  };

  const profile = profileQ.data;
  const stats = useMemo(() => statsQ.data ?? [], [statsQ.data]);

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
    return plausible.slice(0, 2);
  }, [stats]);

  const cardStats: HeadlineStat[] = headline.map((s) => ({
    label: s.metric.label,
    value: formatStatValue(s.value, s.metric.unit),
    unit: s.metric.unit,
    verified: s.verified,
  }));

  const top = headline[0];
  const handle = profile?.handle ?? 'you';
  const sportLabel = profile?.primary_sport ? SPORT_LABELS[profile.primary_sport as Sport] ?? null : null;
  const onSaved = () => queryClient.invalidateQueries({ queryKey: ['my-stats'] });

  const share = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your card' });
      }
    } catch {
      // Capture/share unavailable (e.g. simulator without share targets) — no-op.
    }
  };

  if (profileQ.isLoading || catalogQ.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  const metaLine = [profile?.school?.name, profile?.grad_year ? `CLASS OF ${profile.grad_year}` : null, sportLabel?.toUpperCase()]
    .filter(Boolean)
    .join(' · ');

  return (
    <BottomSheetModalProvider>
      <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
        >
          {/* Header */}
          <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[6] }}>
            <Avatar uri={profile?.avatar_url ?? undefined} size={88} />
            <Txt variant="display1" accessibilityRole="header" style={{ marginTop: space[5], fontSize: 56, lineHeight: 60 }}>
              {profile?.display_name ?? `@${handle}`}
            </Txt>
            <Txt variant="bodySm" tone="ash" style={{ marginTop: space[1], fontFamily: 'GeistMono' }}>
              @{handle}
            </Txt>
            {metaLine.length > 0 && <MicroLabel style={{ marginTop: space[4] }}>{metaLine}</MicroLabel>}
          </View>

          {/* Headline number */}
          {top ? (
            <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[7] }}>
              <MicroLabel>{top.metric.label.toUpperCase()}{top.metric.unit ? ` · ${top.metric.unit}` : ''}</MicroLabel>
              <View style={{ marginTop: space[3], flexDirection: 'row', alignItems: 'flex-end' }}>
                {Number.isInteger(top.value) ? (
                  <RollUpNumber value={top.value} size="xl" />
                ) : (
                  <Score value={formatStatValue(top.value, top.metric.unit)} size="xl" />
                )}
              </View>
              <View style={{ marginTop: space[4] }}>
                <VerifiedMark verified={top.verified} />
              </View>
            </View>
          ) : (
            <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[7] }}>
              <Txt variant="display4" italic tone="ash" style={{ fontFamily: 'InstrumentSerifItalic' }}>
                No stats yet — add your first below.
              </Txt>
            </View>
          )}

          {/* Share card (capture target) */}
          <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[7] }}>
            <ShareCard ref={cardRef} handle={handle} school={profile?.school?.name ?? null} sportLabel={sportLabel} stats={cardStats} />
            <PrimaryButton label="SHARE CARD" variant="ghost" full onPress={share} style={{ marginTop: space[4] }} />
          </View>

          {/* Stat lines grouped by sport */}
          <HairlineRule style={{ marginTop: space[8] }} />
          <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[6], paddingBottom: space[2] }}>
            <MicroLabel>STAT LINES</MicroLabel>
          </View>

          {grouped.length === 0 ? (
            <View style={{ paddingHorizontal: SCREEN_PADDING, paddingVertical: space[5] }}>
              <Txt variant="bodyLg" tone="ash">Nothing on the board yet.</Txt>
            </View>
          ) : (
            grouped.map((group) => (
              <View key={group.sport}>
                <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[5], paddingBottom: space[1] }}>
                  <Txt variant="display4" style={{ fontSize: 22 }}>{SPORT_LABELS[group.sport]}</Txt>
                </View>
                <HairlineRule />
                {group.rows.map((s, i) => (
                  <View key={s.id}>
                    <StatLine stat={s} onPress={() => sheetRef.current?.present(s)} />
                    {i < group.rows.length - 1 && <HairlineRule />}
                  </View>
                ))}
              </View>
            ))
          )}

          <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[8] }}>
            <PrimaryButton label="ADD A STAT" full onPress={() => sheetRef.current?.present()} />
          </View>
        </ScrollView>

        <StatEntrySheet ref={sheetRef} ageBand={profile?.age_band ?? null} metrics={catalogQ.data ?? []} onSaved={onSaved} />

        {/* Sign-out footer */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: SCREEN_PADDING,
            paddingTop: space[3],
            paddingBottom: insets.bottom + space[3],
            backgroundColor: colors.paper,
          }}
        >
          {signOutError ? (
            <Txt variant="bodySm" tone="ash" style={{ marginBottom: space[2], textAlign: 'center' }}>
              {signOutError}
            </Txt>
          ) : null}
          <PrimaryButton
            label="SIGN OUT"
            variant="ghost"
            full
            disabled={isSigningOut}
            onPress={handleSignOut}
          />
        </View>
      </View>
    </BottomSheetModalProvider>
  );
}
