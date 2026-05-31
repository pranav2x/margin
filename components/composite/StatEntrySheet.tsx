import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { View, Pressable, ScrollView, ActivityIndicator, Share, type TextStyle } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetFooter,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as Linking from 'expo-linking';

import { Txt } from '../primitives/Text';
import { MicroLabel } from '../primitives/MicroLabel';
import { HairlineRule } from '../primitives/HairlineRule';
import { PrimaryButton } from '../primitives/PrimaryButton';
import { Card } from '../primitives/Card';
import { AppIcon } from '../primitives/AppIcon';
import { useTheme, space, radius, SCREEN_PADDING, type as typeScale } from '../../theme';
import { supabase } from '../../lib/supabase';
import { recordActivity } from '../../lib/hooks/useStreak';
import {
  SPORTS,
  SPORT_LABELS,
  isValuePlausible,
  type AgeBand,
  type MetricRow,
  type PlayerStat,
  type Sport,
} from '../../lib/hooks/usePlayerProfile';

export interface StatEntrySheetRef {
  present: (stat?: PlayerStat) => void;
}

interface Props {
  ageBand: AgeBand | null;
  metrics: MetricRow[];
  onSaved: () => void;
}

// Peer co-sign is the only path that actually verifies a mark. Video proof is
// kept as an honest request stub; coach / external aren't users yet.
type RequestedMethod = 'peer_cosign' | 'video_proof';

function sanitizeNumeric(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  return parts.length <= 1 ? cleaned : `${parts[0]}.${parts.slice(1).join('')}`;
}

export const StatEntrySheet = forwardRef<StatEntrySheetRef, Props>(function StatEntrySheet(
  { ageBand, metrics, onSaved },
  ref,
) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const modalRef = useRef<BottomSheetModal>(null);

  const [editing, setEditing] = useState<PlayerStat | null>(null);
  const [sport, setSport] = useState<Sport | null>(null);
  const [metric, setMetric] = useState<MetricRow | null>(null);
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [requested, setRequested] = useState<RequestedMethod | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    present: (stat?: PlayerStat) => {
      setRequested(null);
      setError(null);
      setVerifyError(null);
      if (stat) {
        setEditing(stat);
        setSport(stat.metric.sport as Sport);
        setMetric(stat.metric);
        setValue(String(stat.value));
        setNotes(stat.notes ?? '');
      } else {
        setEditing(null);
        setSport(null);
        setMetric(null);
        setValue('');
        setNotes('');
      }
      modalRef.current?.present();
    },
  }));

  const snapPoints = useMemo(() => ['85%'], []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.4} />
    ),
    [],
  );

  const sportMetrics = useMemo(
    () => (sport ? metrics.filter((m) => m.sport === sport).sort((a, b) => a.sort_order - b.sort_order) : []),
    [sport, metrics],
  );

  const numericValue = Number(value);
  const valueValid = value.length > 0 && !Number.isNaN(numericValue);
  const plausible = metric && valueValid ? isValuePlausible(numericValue, metric, ageBand) : true;
  const canSave = valueValid && !saving;

  const save = async () => {
    if (!metric || !valueValid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    setError(null);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw authError ?? new Error('You need to be signed in to save a stat.');

      const trimmedNotes = notes.trim() ? notes.trim() : null;

      // `verified` / `verification_method` are server-controlled (locked in 0008),
      // so the client only ever writes value + notes. Find the existing row for
      // this metric (unique key is profile_id+metric_id) and update it; otherwise
      // insert a fresh self-reported mark (column defaults + trigger fill the rest).
      let statId = editing?.id ?? null;
      if (!statId) {
        const { data: existing, error: findError } = await supabase
          .from('player_stats')
          .select('id')
          .eq('profile_id', user.id)
          .eq('metric_id', metric.id)
          .maybeSingle();
        if (findError) throw findError;
        statId = (existing as { id: string } | null)?.id ?? null;
      }

      if (statId) {
        const { error: updateError } = await supabase
          .from('player_stats')
          .update({ value: numericValue, notes: trimmedNotes })
          .eq('id', statId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('player_stats')
          .insert({ profile_id: user.id, metric_id: metric.id, value: numericValue, notes: trimmedNotes });
        if (insertError) throw insertError;
      }

      // Only confirm and dismiss once the write actually succeeded. A saved
      // stat is a core-loop action — advance the streak, fire-and-forget so a
      // streak hiccup can never block the save.
      void recordActivity(queryClient);
      onSaved();
      modalRef.current?.dismiss();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that stat. Try again.");
    } finally {
      setSaving(false);
    }
  };

  // Log a verification_request row. Never writes the locked trust columns —
  // `verified` / `verification_method` change only via the cosign_stat RPC.
  const logRequest = async (method: RequestedMethod): Promise<void> => {
    if (!editing) return;
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw authError ?? new Error('You need to be signed in.');
    const { error: requestError } = await supabase
      .from('verification_requests')
      .insert({ stat_id: editing.id, requester_id: user.id, method });
    if (requestError) throw requestError;
  };

  // The growth loop: log a peer-cosign request, then hand the owner a shareable
  // deep link. Whoever opens it lands on the confirm screen and must be (or
  // become) a same-school user to co-sign — which pulls a teammate into the app.
  const askTeammate = async () => {
    if (!editing) return;
    Haptics.selectionAsync();
    setVerifyError(null);
    try {
      await logRequest('peer_cosign');
      setRequested('peer_cosign');
      const url = Linking.createURL(`/confirm/${editing.id}`);
      await Share.share({
        message: `Confirm my ${editing.metric.label} on Elevate — you have to be at my school to co-sign it. ${url}`,
        url,
      });
    } catch (e) {
      setVerifyError(e instanceof Error ? e.message : "Couldn't start that invite. Try again.");
    }
  };

  const uploadVideoProof = async () => {
    if (!editing) return;
    Haptics.selectionAsync();
    setVerifyError(null);
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'video/*', copyToCacheDirectory: false });
      if (res.canceled) return;
      // The picked file is a local placeholder only — nothing is uploaded. We log
      // the request; a teammate's co-sign is still what turns a mark Verified.
      await logRequest('video_proof');
      setRequested('video_proof');
    } catch (e) {
      setVerifyError(e instanceof Error ? e.message : "Couldn't log that. Try again.");
    }
  };

  const close = () => {
    Haptics.selectionAsync();
    modalRef.current?.dismiss();
  };

  const clearMetric = () => {
    Haptics.selectionAsync();
    setMetric(null);
    setValue('');
  };

  // Strava-style score input: big tabular-nums right-aligned ember-on-focus.
  const valueInputStyle: TextStyle = {
    ...typeScale.scoreLg,
    color: colors.ink,
    textAlign: 'right',
    flex: 1,
    paddingVertical: space[2],
  };

  const notesInputStyle: TextStyle = {
    ...typeScale.bodyLg,
    color: colors.ink,
    paddingVertical: space[2],
  };

  const headerTitle = editing ? 'Edit Stat' : 'Add a Stat';
  const ctaLabel = saving
    ? 'SAVING…'
    : editing
      ? 'SAVE CHANGES'
      : metric
        ? 'SAVE STAT'
        : 'PICK A METRIC';

  // Sticky bottom CTA — `@gorhom/bottom-sheet`'s footer rides above the
  // keyboard, so BottomSheetTextInput keyboard avoidance keeps working.
  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={insets.bottom}>
        <View
          style={{
            paddingHorizontal: SCREEN_PADDING,
            paddingTop: space[4],
            paddingBottom: space[4],
            backgroundColor: colors.popover,
            borderTopWidth: 1,
            borderTopColor: colors.fog,
          }}
        >
          <PrimaryButton
            label={ctaLabel}
            full
            onPress={save}
            disabled={!canSave || !metric}
          />
        </View>
      </BottomSheetFooter>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [insets.bottom, colors.popover, colors.fog, ctaLabel, canSave, metric],
  );

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      footerComponent={renderFooter}
      backgroundStyle={{ backgroundColor: colors.popover, borderRadius: radius.xl }}
      handleIndicatorStyle={{ backgroundColor: colors.fog, width: 36, height: 4 }}
    >
      {/* Header */}
      <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[2], paddingBottom: space[4] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt variant="display4">{headerTitle}</Txt>
          <Pressable
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={12}
            style={{
              width: 32,
              height: 32,
              borderRadius: radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.surface,
            }}
          >
            <AppIcon name="X" size={20} tone="ink" />
          </Pressable>
        </View>
      </View>
      <HairlineRule />

      <BottomSheetScrollView
        contentContainerStyle={{
          paddingHorizontal: SCREEN_PADDING,
          paddingTop: space[5],
          // Reserve space so the footer never overlaps content.
          paddingBottom: insets.bottom + space[10],
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* SPORT */}
        <View>
          <MicroLabel tone="ash">SPORT</MicroLabel>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: space[2], paddingTop: space[3], paddingRight: space[4] }}
          >
            {SPORTS.map((s) => {
              const active = sport === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSport(s);
                    if (metric && metric.sport !== s) {
                      setMetric(null);
                      setValue('');
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => ({
                    paddingVertical: space[2],
                    paddingHorizontal: space[4],
                    borderRadius: radius.full,
                    backgroundColor: active
                      ? pressed
                        ? colors.emberPressed
                        : colors.ember
                      : pressed
                        ? colors.fog
                        : colors.surface,
                    borderWidth: 1,
                    borderColor: active ? 'transparent' : colors.fog,
                    minHeight: 36,
                    justifyContent: 'center',
                  })}
                >
                  <Txt
                    variant="label"
                    style={{ color: active ? colors.paper : colors.ink }}
                  >
                    {SPORT_LABELS[s]}
                  </Txt>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* METRIC */}
        <View style={{ marginTop: space[5] }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: space[3],
            }}
          >
            <MicroLabel tone="ash">METRIC</MicroLabel>
            {metric && !editing && (
              <Pressable onPress={clearMetric} hitSlop={8} accessibilityRole="button">
                <MicroLabel tone="ink">CHANGE</MicroLabel>
              </Pressable>
            )}
          </View>
          {metric ? (
            <Card padded>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Txt variant="bodyLg" weight="semibold">{metric.label}</Txt>
                {metric.unit ? <MicroLabel tone="ash">{metric.unit}</MicroLabel> : null}
              </View>
            </Card>
          ) : sport ? (
            sportMetrics.length === 0 ? (
              <Txt variant="bodySm" tone="ash">No metrics for this sport yet.</Txt>
            ) : (
              <Card>
                {sportMetrics.map((m, i) => (
                  <View key={m.id}>
                    <Pressable
                      onPress={() => {
                        Haptics.selectionAsync();
                        setMetric(m);
                      }}
                      accessibilityRole="button"
                      style={({ pressed }) => ({
                        paddingVertical: space[4],
                        paddingHorizontal: space[4],
                        minHeight: 56,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: pressed ? colors.fog : 'transparent',
                      })}
                    >
                      <Txt variant="bodyLg">{m.label}</Txt>
                      {m.unit ? <MicroLabel tone="ash">{m.unit}</MicroLabel> : null}
                    </Pressable>
                    {i < sportMetrics.length - 1 && <HairlineRule />}
                  </View>
                ))}
              </Card>
            )
          ) : (
            <Txt variant="bodySm" tone="ash">Pick a sport above to see its metrics.</Txt>
          )}
        </View>

        {/* VALUE */}
        {metric && (
          <View style={{ marginTop: space[5] }}>
            <MicroLabel tone="ash">{metric.unit ? `VALUE · ${metric.unit}` : 'VALUE'}</MicroLabel>
            <Card padded style={{ marginTop: space[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
                <BottomSheetTextInput
                  value={value}
                  onChangeText={(t) => setValue(sanitizeNumeric(t))}
                  placeholder="0"
                  placeholderTextColor={colors.ash}
                  keyboardType="decimal-pad"
                  autoFocus={!editing}
                  style={valueInputStyle}
                />
                {metric.unit ? (
                  <Txt variant="bodySm" tone="ash">{metric.unit}</Txt>
                ) : null}
              </View>
            </Card>
            {!plausible && (
              <Txt variant="bodySm" tone="ash" weight="semibold" style={{ marginTop: space[3] }}>
                That's outside the expected range — we'll still save it, but verify it to rank.
              </Txt>
            )}
          </View>
        )}

        {/* NOTE */}
        {metric && (
          <View style={{ marginTop: space[5] }}>
            <MicroLabel tone="ash">NOTE · OPTIONAL</MicroLabel>
            <Card padded style={{ marginTop: space[3] }}>
              <BottomSheetTextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. wind-legal, FAT timing, splits…"
                placeholderTextColor={colors.ash}
                style={notesInputStyle}
                multiline
              />
            </Card>
          </View>
        )}

        {/* Save error */}
        {error && (
          <Txt
            variant="bodySm"
            tone="ember"
            weight="semibold"
            style={{ marginTop: space[4], textAlign: 'center' }}
            accessibilityLiveRegion="polite"
          >
            {error}
          </Txt>
        )}

        {/* Verification (edit mode, unverified only). Peer co-sign is the only
            path that turns a mark Verified — the rest is honest about not being
            live yet. */}
        {editing && !editing.verified && (
          <View style={{ marginTop: space[7] }}>
            <HairlineRule />
            <View style={{ marginTop: space[5] }}>
              <MicroLabel tone="ash">VERIFY THIS MARK</MicroLabel>
              <Txt variant="bodySm" tone="ash" style={{ marginTop: space[2] }}>
                Self-reported until a teammate at your school confirms it. One co-sign turns it Verified.
              </Txt>

              <View style={{ marginTop: space[4], gap: space[3] }}>
                <PrimaryButton label="ASK A TEAMMATE TO CONFIRM" full onPress={askTeammate} />
                <PrimaryButton label="UPLOAD VIDEO PROOF" variant="ghost" full onPress={uploadVideoProof} />
                <PrimaryButton
                  label="ASK A COACH · COMING LATER"
                  variant="ghost"
                  full
                  disabled
                  onPress={() => undefined}
                />
                <PrimaryButton
                  label="EXTERNAL SOURCE · COMING LATER"
                  variant="ghost"
                  full
                  disabled
                  onPress={() => undefined}
                />
              </View>

              {requested === 'peer_cosign' && (
                <Txt variant="bodySm" weight="semibold" tone="ash" style={{ marginTop: space[4] }}>
                  Invite shared. When a teammate at your school opens it and co-signs, this mark goes Verified.
                </Txt>
              )}
              {requested === 'video_proof' && (
                <Txt variant="bodySm" weight="semibold" tone="ash" style={{ marginTop: space[4] }}>
                  Logged — but a teammate's co-sign is what turns a mark Verified for now.
                </Txt>
              )}
              {verifyError && (
                <Txt variant="bodySm" tone="ember" weight="semibold" style={{ marginTop: space[3] }} accessibilityLiveRegion="polite">
                  {verifyError}
                </Txt>
              )}
            </View>
          </View>
        )}

        {saving && (
          <View style={{ marginTop: space[5], alignItems: 'center' }}>
            <ActivityIndicator color={colors.ash} />
          </View>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});
