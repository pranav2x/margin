import { useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { PrimaryButton } from '../../components/primitives/PrimaryButton';
import { Score } from '../../components/motion/Score';
import { VerifiedMark } from '../../components/composite/StatLine';
import { useConfirmStat, useCosignStat } from '../../lib/hooks/useCosign';
import { useMyProfile, formatStatValue } from '../../lib/hooks/usePlayerProfile';
import { useTheme, space, SCREEN_PADDING } from '../../theme';

export default function ConfirmStatScreen() {
  const { statId } = useLocalSearchParams<{ statId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const statQ = useConfirmStat(statId);
  const meQ = useMyProfile();
  const cosignMut = useCosignStat();

  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stat = statQ.data;
  const me = meQ.data;
  const handle = stat?.owner_handle ?? 'this athlete';

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const isSelf = !!me && !!stat && me.id === stat.owner_id;
  const differentSchool =
    !!me && !!stat && (me.school_id == null || stat.owner_school_id == null || me.school_id !== stat.owner_school_id);

  const confirm = async () => {
    if (!statId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError(null);
    try {
      await cosignMut.mutateAsync(statId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(true);
    } catch (e) {
      // cosign_stat is the source of truth — surface exactly why it rejected.
      setError(e instanceof Error ? e.message : "Couldn't confirm that mark. Try again.");
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

  if (statQ.isLoading || meQ.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
        {Header}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.ink} />
        </View>
      </View>
    );
  }

  if (!stat) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
        {Header}
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: SCREEN_PADDING }}>
          <Txt variant="display3" weight="bold">
            This mark isn't available.
          </Txt>
          <Txt variant="bodyLg" tone="ash" style={{ marginTop: space[3] }}>
            It may have been removed, or it's hidden from you.
          </Txt>
        </View>
      </View>
    );
  }

  const unit = stat.metric.unit;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
      {Header}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: insets.bottom + space[10] }}
      >
        <MicroLabel style={{ marginTop: space[4] }}>PEER CO-SIGN</MicroLabel>
        <Txt variant="display2" accessibilityRole="header" style={{ marginTop: space[2] }}>
          {done ? 'Confirmed.' : `Confirm @${handle}'s mark`}
        </Txt>

        {/* The mark itself */}
        <View style={{ marginTop: space[7] }}>
          <MicroLabel>{stat.metric.label.toUpperCase()}{unit ? ` · ${unit}` : ''}</MicroLabel>
          <View style={{ marginTop: space[3] }}>
            <Score value={formatStatValue(stat.value, unit)} size="xl" />
          </View>
          <View style={{ marginTop: space[4] }}>
            <VerifiedMark verified={stat.verified || done} />
          </View>
        </View>

        <HairlineRule style={{ marginTop: space[8] }} />

        {/* Outcome / action */}
        {done ? (
          <View style={{ marginTop: space[6] }}>
            <Txt variant="bodyLg" style={{ lineHeight: 26 }}>
              You co-signed @{handle}'s {stat.metric.label}. It's Verified now — and you just pulled a teammate onto the boards.
            </Txt>
            <PrimaryButton label="DONE" full onPress={goBack} style={{ marginTop: space[7] }} />
          </View>
        ) : stat.verified ? (
          <View style={{ marginTop: space[6] }}>
            <Txt variant="bodyLg" tone="ash" style={{ lineHeight: 26 }}>
              This mark is already verified. Nothing more to do here.
            </Txt>
            <PrimaryButton label="DONE" variant="ghost" full onPress={goBack} style={{ marginTop: space[7] }} />
          </View>
        ) : isSelf ? (
          <View style={{ marginTop: space[6] }}>
            <Txt variant="bodyLg" tone="ash" style={{ lineHeight: 26 }}>
              This is your own mark — you can't co-sign it. Send the invite to a teammate at your school instead.
            </Txt>
            <PrimaryButton label="DONE" variant="ghost" full onPress={goBack} style={{ marginTop: space[7] }} />
          </View>
        ) : (
          <View style={{ marginTop: space[6] }}>
            <Txt variant="bodyLg" style={{ lineHeight: 26 }}>
              Co-signing says you've seen this is real. You both have to be at the same school.
            </Txt>

            {!me ? (
              <Txt variant="bodySm" tone="ash" weight="semibold" style={{ marginTop: space[4] }}>
                Sign in with your school account to co-sign.
              </Txt>
            ) : differentSchool ? (
              <Txt variant="bodySm" tone="ash" weight="semibold" style={{ marginTop: space[4] }}>
                Heads up: you need to be at @{handle}'s school. Set your school on the You tab if it's wrong.
              </Txt>
            ) : null}

            <PrimaryButton
              label={cosignMut.isPending ? 'CONFIRMING…' : 'CONFIRM THIS MARK'}
              full
              disabled={cosignMut.isPending || !me}
              onPress={confirm}
              style={{ marginTop: space[7] }}
            />

            {error && (
              <Txt variant="bodySm" tone="ink" style={{ marginTop: space[3] }} accessibilityLiveRegion="polite">
                {error}
              </Txt>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
