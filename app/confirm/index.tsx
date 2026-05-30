import { useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { Score } from '../../components/motion/Score';
import { useMyProfile, formatStatValue } from '../../lib/hooks/usePlayerProfile';
import { useSchoolUnconfirmed, useCosignStat, type UnconfirmedStat } from '../../lib/hooks/useCosign';
import { useTheme, space, SCREEN_PADDING } from '../../theme';

function ConfirmRow({
  row,
  pending,
  onConfirm,
}: {
  row: UnconfirmedStat;
  pending: boolean;
  onConfirm: () => void;
}) {
  const { colors } = useTheme();
  const unit = row.metric.unit;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SCREEN_PADDING,
        paddingVertical: space[4],
        minHeight: 64,
        gap: space[3],
      }}
    >
      <View style={{ flex: 1 }}>
        <Txt variant="bodyLg">@{row.owner_handle ?? 'teammate'}</Txt>
        <MicroLabel style={{ marginTop: 2 }}>
          {row.metric.label}{unit ? ` · ${unit}` : ''}
        </MicroLabel>
      </View>
      <Score value={formatStatValue(row.value, unit)} size="sm" />
      <Pressable
        onPress={onConfirm}
        disabled={pending}
        accessibilityRole="button"
        accessibilityLabel={`Confirm @${row.owner_handle ?? 'teammate'}'s ${row.metric.label}`}
        hitSlop={6}
        style={{
          borderWidth: 1,
          borderColor: colors.ink,
          paddingHorizontal: space[3],
          minHeight: 44,
          justifyContent: 'center',
          opacity: pending ? 0.4 : 1,
        }}
      >
        <MicroLabel tone="ink">{pending ? '…' : 'CONFIRM'}</MicroLabel>
      </Pressable>
    </View>
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
      <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
        <X size={22} color={colors.ink} strokeWidth={2} />
      </Pressable>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
      {Header}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + space[10] }}
      >
        <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[4] }}>
          <MicroLabel>PEER CO-SIGN</MicroLabel>
          <Txt variant="display2" accessibilityRole="header" style={{ marginTop: space[2] }}>
            Confirm at your school
          </Txt>
          <Txt variant="bodyLg" tone="ash" style={{ marginTop: space[4], lineHeight: 26 }}>
            Marks your teammates self-reported. Co-sign the ones you've seen are real — one co-sign turns a mark Verified.
          </Txt>
        </View>

        <HairlineRule style={{ marginTop: space[6] }} />

        {error && (
          <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[4] }}>
            <Txt variant="bodySm" tone="ink" accessibilityLiveRegion="polite">
              {error}
            </Txt>
          </View>
        )}

        {!me?.school_id ? (
          <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[8] }}>
            <Txt variant="display4" tone="ash" weight="semibold">
              Set your school on the You tab to confirm teammates.
            </Txt>
          </View>
        ) : feedQ.isLoading ? (
          <View style={{ paddingTop: space[8], alignItems: 'center' }}>
            <ActivityIndicator color={colors.ink} />
          </View>
        ) : rows.length === 0 ? (
          <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[8] }}>
            <Txt variant="display4" tone="ash" weight="semibold">
              Nothing to confirm right now.
            </Txt>
            <Txt variant="bodyLg" tone="ash" style={{ marginTop: space[3] }}>
              When teammates at your school add marks, they'll show up here.
            </Txt>
          </View>
        ) : (
          rows.map((row, i) => (
            <View key={row.id}>
              <ConfirmRow row={row} pending={pendingId === row.id} onConfirm={() => confirmRow(row.id)} />
              {i < rows.length - 1 && <HairlineRule />}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
