import { useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { PrimaryButton } from '../../components/primitives/PrimaryButton';
import { Card } from '../../components/primitives/Card';
import { AppIcon } from '../../components/primitives/AppIcon';
import { AvatarMeta } from '../../components/composite/AvatarMeta';
import { Score } from '../../components/motion/Score';
import { useMyProfile, formatStatValue } from '../../lib/hooks/usePlayerProfile';
import { useSchoolUnconfirmed, useCosignStat, type UnconfirmedStat } from '../../lib/hooks/useCosign';
import { useTheme, space, SCREEN_PADDING } from '../../theme';

// A single Strava-style cosign row: AvatarMeta on top, claimed stat in the
// middle (Score + tracked metric label), Confirm primary + ghost actions below.
function ConfirmRow({
  row,
  pending,
  onConfirm,
}: {
  row: UnconfirmedStat;
  pending: boolean;
  onConfirm: () => void;
}) {
  const unit = row.metric.unit;
  const handle = row.owner_handle ?? 'teammate';
  const display = formatStatValue(row.value, unit);

  return (
    <Card padded>
      <AvatarMeta
        handle={handle}
        meta={row.metric.label}
        size="md"
      />

      <View style={{ marginTop: space[4], flexDirection: 'row', alignItems: 'baseline' }}>
        <MicroLabel style={{ marginRight: space[2] }}>CLAIMED</MicroLabel>
        <Score value={display} size="md" />
        {unit ? (
          <MicroLabel style={{ marginLeft: space[2] }}>{unit}</MicroLabel>
        ) : null}
      </View>

      <View
        style={{
          marginTop: space[4],
          flexDirection: 'row',
          gap: space[2],
        }}
      >
        <PrimaryButton
          label={pending ? 'CONFIRMING…' : 'CONFIRM'}
          size="compact"
          onPress={onConfirm}
          disabled={pending}
          full
          style={{ flex: 1 }}
          accessibilityLabel={`Confirm @${handle}'s ${row.metric.label}`}
        />
        <PrimaryButton
          label="NOT ME"
          variant="ghost"
          size="compact"
          onPress={onConfirm}
          disabled={pending}
          style={{ flex: 1 }}
          accessibilityLabel="Mark as not me or wrong"
        />
      </View>
    </Card>
  );
}

export default function SchoolConfirmFeed() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const meQ = useMyProfile();
  const me = meQ.data;
  const feedQ = useSchoolUnconfirmed(me?.school_id ?? null, me?.id);
  const cosignMut = useCosignStat();

  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = feedQ.data ?? [];

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const confirmRow = async (id: string) => {
    Haptics.selectionAsync();
    setPendingId(id);
    setError(null);
    try {
      await cosignMut.mutateAsync(id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't confirm that mark. Try again.");
    } finally {
      setPendingId(null);
    }
  };

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
      <Pressable
        onPress={goBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <AppIcon name="X" size={22} tone="ink" />
      </Pressable>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
      {Header}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_PADDING,
          paddingBottom: insets.bottom + space[10],
        }}
      >
        <View style={{ paddingTop: space[4] }}>
          <MicroLabel>PEER CO-SIGN</MicroLabel>
          <Txt
            variant="display4"
            weight="bold"
            accessibilityRole="header"
            style={{ marginTop: space[3] }}
          >
            Confirm at your school
          </Txt>
          <Txt
            variant="body"
            tone="ash"
            style={{ marginTop: space[3] }}
          >
            Marks your teammates self-reported. Co-sign the ones you&apos;ve seen are real — one co-sign turns a mark Verified.
          </Txt>
        </View>

        <HairlineRule style={{ marginTop: space[6], marginBottom: space[5] }} />

        {error && (
          <View style={{ marginBottom: space[4] }}>
            <Txt
              variant="bodySm"
              tone="ink"
              accessibilityLiveRegion="polite"
            >
              {error}
            </Txt>
          </View>
        )}

        {!me?.school_id ? (
          <View style={{ paddingTop: space[6] }}>
            <Txt variant="display4" weight="bold">
              Set your school first
            </Txt>
            <Txt
              variant="body"
              tone="ash"
              style={{ marginTop: space[3] }}
            >
              Head to the You tab to pick your school. Once you do, your teammates&apos; marks show up here.
            </Txt>
          </View>
        ) : feedQ.isLoading ? (
          <View style={{ paddingTop: space[8], alignItems: 'center' }}>
            <ActivityIndicator color={colors.ink} />
          </View>
        ) : rows.length === 0 ? (
          // Strava-style "all caught up" empty state.
          <View
            style={{
              paddingTop: space[10],
              paddingBottom: space[8],
              alignItems: 'center',
            }}
          >
            <AppIcon name="Check" size={48} tone="ash" />
            <Txt
              variant="display4"
              weight="bold"
              style={{ marginTop: space[5], textAlign: 'center' }}
            >
              All caught up
            </Txt>
            <Txt
              variant="body"
              tone="ash"
              style={{ marginTop: space[3], textAlign: 'center' }}
            >
              When teammates at your school add marks, they&apos;ll show up here.
            </Txt>
          </View>
        ) : (
          <View style={{ gap: space[3] }}>
            {rows.map((row) => (
              <ConfirmRow
                key={row.id}
                row={row}
                pending={pendingId === row.id}
                onConfirm={() => confirmRow(row.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
