import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, Pressable, Text, ActivityIndicator } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';

import { Txt } from '../primitives/Text';
import { MicroLabel } from '../primitives/MicroLabel';
import { HairlineRule } from '../primitives/HairlineRule';
import { PrimaryButton } from '../primitives/PrimaryButton';
import { Avatar } from '../primitives/Avatar';
import { useTheme, space, SCREEN_PADDING, fonts } from '../../theme';
import { supabase } from '../../lib/supabase';
import { SPORTS, SPORT_LABELS, type MyProfile, type Sport } from '../../lib/hooks/usePlayerProfile';

export interface ProfileEditSheetRef {
  present: () => void;
}

interface Props {
  profile: MyProfile | null;
  onSaved: () => void;
}

interface School {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
}

function locality(s: { city: string | null; state: string | null }): string {
  return [s.city, s.state].filter(Boolean).join(', ');
}

export const ProfileEditSheet = forwardRef<ProfileEditSheetRef, Props>(function ProfileEditSheet(
  { profile, onSaved },
  ref,
) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const modalRef = useRef<BottomSheetModal>(null);

  const [displayName, setDisplayName] = useState('');
  const [sport, setSport] = useState<Sport | null>(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);

  // School picker (mirrors the onboarding nearby + manual-search flow).
  const [picking, setPicking] = useState(false);
  const [locating, setLocating] = useState(false);
  const [nearby, setNearby] = useState<School[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<School[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed every field from the current profile each time the sheet opens.
  useImperativeHandle(ref, () => ({
    present: () => {
      setDisplayName(profile?.display_name ?? '');
      setSport((profile?.primary_sport as Sport) ?? null);
      setAvatarUrl(profile?.avatar_url ?? '');
      setSelectedSchool(
        profile?.school_id
          ? {
              id: profile.school_id,
              name: profile.school?.name ?? 'Your school',
              city: profile.school?.city ?? null,
              state: profile.school?.state ?? null,
            }
          : null,
      );
      setPicking(false);
      setLocating(false);
      setNearby([]);
      setQuery('');
      setResults([]);
      setError(null);
      modalRef.current?.present();
    },
  }));

  const snapPoints = useMemo(() => ['90%'], []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.4} />
    ),
    [],
  );

  // Debounced manual school search.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('schools')
        .select('id,name,city,state')
        .ilike('name', `%${q}%`)
        .order('name')
        .limit(10);
      setResults((data ?? []) as School[]);
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const useMyLocation = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      // One-shot read — the coordinates feed this RPC only and are never stored.
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { data, error: rpcError } = await supabase.rpc('nearby_schools', {
        p_lat: pos.coords.latitude,
        p_lng: pos.coords.longitude,
        p_limit: 6,
      });
      if (rpcError || !data) return;
      setNearby(data as School[]);
    } catch {
      // Location unavailable — manual search stays available as the fallback.
    } finally {
      setLocating(false);
    }
  };

  const pickSchool = (s: School) => {
    Haptics.selectionAsync();
    setSelectedSchool(s);
    setPicking(false);
    setQuery('');
    setResults([]);
    setNearby([]);
  };

  const save = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    setError(null);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw authError ?? new Error('You need to be signed in to edit your profile.');
      const { error: saveError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim() ? displayName.trim() : null,
          primary_sport: sport,
          school_id: selectedSchool ? selectedSchool.id : null,
          avatar_url: avatarUrl.trim() ? avatarUrl.trim() : null,
        })
        .eq('id', user.id);
      if (saveError) throw saveError;
      // Only confirm and dismiss once the write actually succeeded.
      onSaved();
      modalRef.current?.dismiss();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your profile. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const schoolList = query.trim().length >= 2 ? results : nearby;
  const previewUri = avatarUrl.trim() ? avatarUrl.trim() : undefined;

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.surface, borderRadius: 0 }}
      handleIndicatorStyle={{ backgroundColor: colors.ash }}
    >
      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: insets.bottom + space[8] }}
        keyboardShouldPersistTaps="handled"
      >
        <MicroLabel>EDIT PROFILE</MicroLabel>

        {/* Avatar preview + URL */}
        <View style={{ marginTop: space[5], alignItems: 'center' }}>
          <Avatar uri={previewUri} size={88} />
        </View>
        <View style={{ marginTop: space[5] }}>
          <MicroLabel>AVATAR · IMAGE LINK</MicroLabel>
          <BottomSheetTextInput
            value={avatarUrl}
            onChangeText={setAvatarUrl}
            placeholder="https://…"
            placeholderTextColor={colors.ash}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={{ fontFamily: fonts.body, fontSize: 16, lineHeight: 22, color: colors.ink, paddingVertical: space[2] }}
          />
          <HairlineRule />
        </View>

        {/* Display name */}
        <View style={{ marginTop: space[7] }}>
          <MicroLabel>DISPLAY NAME</MicroLabel>
          <BottomSheetTextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor={colors.ash}
            autoCapitalize="words"
            style={{ fontFamily: fonts.serif, fontSize: 24, lineHeight: 30, color: colors.ink, paddingVertical: space[2] }}
          />
          <HairlineRule />
        </View>

        {/* Primary sport */}
        <View style={{ marginTop: space[7] }}>
          <MicroLabel>PRIMARY SPORT</MicroLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[4] }}>
            {SPORTS.map((s) => {
              const active = sport === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => { Haptics.selectionAsync(); setSport(s); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
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
        </View>

        {/* School */}
        <View style={{ marginTop: space[7] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <MicroLabel>SCHOOL</MicroLabel>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); setPicking((v) => !v); }}
              hitSlop={8}
              accessibilityRole="button"
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <MicroLabel tone="ink">{picking ? 'DONE' : 'CHANGE'}</MicroLabel>
            </Pressable>
          </View>
          <Txt variant="bodyLg" tone={selectedSchool ? 'ink' : 'ash'} style={{ marginTop: space[1] }}>
            {selectedSchool ? selectedSchool.name : 'No school set'}
          </Txt>
          {selectedSchool && locality(selectedSchool).length > 0 && (
            <MicroLabel style={{ marginTop: space[1] }}>{locality(selectedSchool)}</MicroLabel>
          )}
          <HairlineRule style={{ marginTop: space[3] }} />

          {picking && (
            <View style={{ marginTop: space[4] }}>
              {locating ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
                  <ActivityIndicator color={colors.ink} />
                  <MicroLabel>FINDING SCHOOLS NEAR YOU…</MicroLabel>
                </View>
              ) : (
                <PrimaryButton label="USE MY LOCATION" variant="ghost" onPress={useMyLocation} />
              )}

              <View style={{ marginTop: space[5] }}>
                <BottomSheetTextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search schools"
                  placeholderTextColor={colors.ash}
                  autoCorrect={false}
                  style={{ fontFamily: fonts.serif, fontSize: 20, lineHeight: 26, color: colors.ink, paddingVertical: space[2] }}
                />
                <HairlineRule />
              </View>

              {schoolList.map((s, i) => (
                <View key={s.id}>
                  <Pressable
                    onPress={() => pickSchool(s)}
                    accessibilityRole="button"
                    style={{ paddingVertical: space[4], minHeight: 44 }}
                  >
                    <Txt variant="bodyLg">{s.name}</Txt>
                    {locality(s).length > 0 && <MicroLabel style={{ marginTop: space[1] }}>{locality(s)}</MicroLabel>}
                  </Pressable>
                  {i < schoolList.length - 1 && <HairlineRule />}
                </View>
              ))}

              {query.trim().length >= 2 && results.length === 0 && (
                <Txt variant="bodySm" tone="ash" italic style={{ marginTop: space[3], fontFamily: 'InstrumentSerifItalic' }}>
                  No schools found.
                </Txt>
              )}
            </View>
          )}
        </View>

        <PrimaryButton
          label={saving ? 'SAVING…' : 'SAVE PROFILE'}
          full
          onPress={save}
          disabled={saving}
          style={{ marginTop: space[8] }}
        />

        {error && (
          <Txt
            variant="bodySm"
            tone="ink"
            style={{ marginTop: space[3], textAlign: 'center' }}
            accessibilityLiveRegion="polite"
          >
            {error}
          </Txt>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});
