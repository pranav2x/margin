import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, Pressable, Text, ActivityIndicator, type TextStyle } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';

import { Txt } from '../primitives/Text';
import { MicroLabel } from '../primitives/MicroLabel';
import { HairlineRule } from '../primitives/HairlineRule';
import { PrimaryButton } from '../primitives/PrimaryButton';
import { useTheme, space, SCREEN_PADDING, fonts } from '../../theme';
import { supabase } from '../../lib/supabase';
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

type VerifyMethod = 'video_proof' | 'coach_cosign' | 'peer_cosign';

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
  const insets = useSafeAreaInsets();
  const modalRef = useRef<BottomSheetModal>(null);

  const [editing, setEditing] = useState<PlayerStat | null>(null);
  const [sport, setSport] = useState<Sport | null>(null);
  const [metric, setMetric] = useState<MetricRow | null>(null);
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [requested, setRequested] = useState<VerifyMethod | null>(null);

  useImperativeHandle(ref, () => ({
    present: (stat?: PlayerStat) => {
      setRequested(null);
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

  const save = async () => {
    if (!metric || !valueValid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('player_stats').upsert(
          {
            profile_id: user.id,
            metric_id: metric.id,
            value: numericValue,
            notes: notes.trim() ? notes.trim() : null,
            verified: false,
            verification_method: 'self_reported',
          },
          { onConflict: 'profile_id,metric_id' },
        );
      }
    } catch {
      // Best-effort; surfaced via the refreshed query on reopen.
    } finally {
      setSaving(false);
    }
    onSaved();
    modalRef.current?.dismiss();
  };

  const requestVerification = async (method: VerifyMethod) => {
    if (!editing) return;
    Haptics.selectionAsync();
    try {
      if (method === 'video_proof') {
        const res = await DocumentPicker.getDocumentAsync({ type: 'video/*', copyToCacheDirectory: false });
        if (res.canceled) return;
        // The picked file is a local placeholder only — nothing is uploaded.
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('verification_requests').insert({
        stat_id: editing.id,
        requester_id: user.id,
        method,
      });
      await supabase
        .from('player_stats')
        .update({ verification_method: method })
        .eq('id', editing.id);
      setRequested(method);
      onSaved();
    } catch {
      // Best-effort stub; no real verification happens.
    }
  };

  const inputStyle: TextStyle = {
    fontFamily: fonts.monoMedium,
    fontVariant: ['tabular-nums'],
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: 1,
    color: colors.ink,
    paddingVertical: space[2],
  };

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.paper, borderRadius: 0 }}
      handleIndicatorStyle={{ backgroundColor: colors.ash }}
    >
      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: insets.bottom + space[8] }}
        keyboardShouldPersistTaps="handled"
      >
        <MicroLabel>{editing ? 'EDIT STAT' : 'ADD A STAT'}</MicroLabel>

        {/* Sport + metric selection (add mode only) */}
        {!editing && !metric && (
          <View style={{ marginTop: space[4] }}>
            <Txt variant="display3" style={{ fontSize: 32 }}>Pick a metric.</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[5] }}>
              {SPORTS.map((s) => {
                const active = sport === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => { Haptics.selectionAsync(); setSport(s); }}
                    accessibilityRole="button"
                    style={{
                      paddingVertical: space[2],
                      paddingHorizontal: space[4],
                      borderWidth: 1,
                      borderColor: colors.ink,
                      backgroundColor: active ? colors.ink : 'transparent',
                      minHeight: 44,
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      allowFontScaling={false}
                      style={{ fontFamily: fonts.bodyMedium, fontSize: 12, letterSpacing: 0.6, color: active ? colors.paper : colors.ink }}
                    >
                      {SPORT_LABELS[s]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {sport && <HairlineRule style={{ marginTop: space[6] }} />}
            {sportMetrics.map((m, i) => (
              <View key={m.id}>
                <Pressable
                  onPress={() => { Haptics.selectionAsync(); setMetric(m); }}
                  accessibilityRole="button"
                  style={{ paddingVertical: space[4], minHeight: 44, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Txt variant="bodyLg">{m.label}</Txt>
                  {m.unit ? <MicroLabel>{m.unit}</MicroLabel> : null}
                </Pressable>
                {i < sportMetrics.length - 1 && <HairlineRule />}
              </View>
            ))}
          </View>
        )}

        {/* Value form */}
        {metric && (
          <View style={{ marginTop: space[4] }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Txt variant="display3" style={{ fontSize: 32, flex: 1 }}>{metric.label}</Txt>
              {!editing && (
                <Pressable onPress={() => { Haptics.selectionAsync(); setMetric(null); setValue(''); }} hitSlop={8}>
                  <MicroLabel>CHANGE</MicroLabel>
                </Pressable>
              )}
            </View>

            <View style={{ marginTop: space[6] }}>
              <MicroLabel>{metric.unit ? `VALUE · ${metric.unit}` : 'VALUE'}</MicroLabel>
              <BottomSheetTextInput
                value={value}
                onChangeText={(t) => setValue(sanitizeNumeric(t))}
                placeholder="0"
                placeholderTextColor={colors.ash}
                keyboardType="decimal-pad"
                autoFocus={!editing}
                style={inputStyle}
              />
              <HairlineRule />
              {!plausible && (
                <Txt variant="bodySm" tone="ash" italic style={{ marginTop: space[3], fontFamily: 'InstrumentSerifItalic' }}>
                  That's outside the expected range — we'll still save it, but verify it to rank.
                </Txt>
              )}
            </View>

            <View style={{ marginTop: space[6] }}>
              <MicroLabel>NOTES (OPTIONAL)</MicroLabel>
              <BottomSheetTextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. wind-legal, FAT timing, splits…"
                placeholderTextColor={colors.ash}
                style={{ fontFamily: fonts.body, fontSize: 16, lineHeight: 22, color: colors.ink, paddingVertical: space[2] }}
              />
              <HairlineRule />
            </View>

            <PrimaryButton
              label={saving ? 'SAVING…' : editing ? 'SAVE CHANGES' : 'SAVE STAT'}
              full
              onPress={save}
              disabled={saving || !valueValid}
              style={{ marginTop: space[7] }}
            />

            {/* Verification (edit mode, unverified only) */}
            {editing && !editing.verified && (
              <View style={{ marginTop: space[8] }}>
                <HairlineRule />
                <View style={{ marginTop: space[6] }}>
                  <MicroLabel>GET THIS VERIFIED TO RANK</MicroLabel>
                  {requested ? (
                    <Txt variant="bodyLg" italic tone="ash" style={{ marginTop: space[4], fontFamily: 'InstrumentSerifItalic' }}>
                      Request submitted. We'll mark it once it's confirmed.
                    </Txt>
                  ) : (
                    <View style={{ marginTop: space[4], gap: space[3] }}>
                      <PrimaryButton label="UPLOAD VIDEO PROOF" variant="ghost" full onPress={() => requestVerification('video_proof')} />
                      <PrimaryButton label="ASK A COACH TO CONFIRM" variant="ghost" full onPress={() => requestVerification('coach_cosign')} />
                      <PrimaryButton label="ASK A TEAMMATE TO CONFIRM" variant="ghost" full onPress={() => requestVerification('peer_cosign')} />
                      <View style={{ opacity: 0.4 }}>
                        <PrimaryButton label="EXTERNAL SOURCE · COMING SOON" variant="ghost" full disabled onPress={() => undefined} />
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}

            {saving && (
              <View style={{ marginTop: space[5], alignItems: 'center' }}>
                <ActivityIndicator color={colors.ink} />
              </View>
            )}
          </View>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});
