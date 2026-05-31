import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Alert, View, Pressable, ScrollView, ActivityIndicator, type TextStyle } from 'react-native';
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
import * as Location from 'expo-location';

import { Txt } from '../primitives/Text';
import { MicroLabel } from '../primitives/MicroLabel';
import { HairlineRule } from '../primitives/HairlineRule';
import { PrimaryButton } from '../primitives/PrimaryButton';
import { Avatar } from '../primitives/Avatar';
import { Card } from '../primitives/Card';
import { AppIcon } from '../primitives/AppIcon';
import { useTheme, space, radius, SCREEN_PADDING, type as typeScale } from '../../theme';
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

const CURRENT_YEAR = new Date().getFullYear();

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
  const [gradYear, setGradYear] = useState('');
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
      setGradYear(profile?.grad_year != null ? String(profile.grad_year) : '');
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

  // Grad year is plausible if it parses to a 4-digit year not absurdly far out.
  // Server side accepts null too — empty string clears it.
  const gradYearNum = gradYear.trim() ? Number(gradYear.trim()) : null;
  const gradYearValid =
    gradYearNum == null ||
    (Number.isInteger(gradYearNum) && gradYearNum >= CURRENT_YEAR - 12 && gradYearNum <= CURRENT_YEAR + 12);

  const save = async () => {
    if (!gradYearValid) return;
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
          grad_year: gradYearNum,
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

  const close = () => {
    Haptics.selectionAsync();
    modalRef.current?.dismiss();
  };

  const onChangeAvatar = () => {
    Haptics.selectionAsync();
    // Native picker isn't wired yet — URL input below is the working path.
    Alert.alert('Change avatar', 'Paste an image URL below — a native picker is coming.');
  };

  const schoolList = query.trim().length >= 2 ? results : nearby;
  const previewUri = avatarUrl.trim() ? avatarUrl.trim() : undefined;

  const nameInputStyle: TextStyle = {
    ...typeScale.bodyLg,
    color: colors.ink,
    paddingVertical: space[2],
  };
  const urlInputStyle: TextStyle = {
    ...typeScale.body,
    color: colors.ink,
    paddingVertical: space[2],
  };
  const gradInputStyle: TextStyle = {
    ...typeScale.scoreMd,
    color: colors.ink,
    paddingVertical: space[2],
  };
  const searchInputStyle: TextStyle = {
    ...typeScale.bodyLg,
    color: colors.ink,
    paddingVertical: space[2],
  };

  const canSave = !saving && gradYearValid;

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
          <PrimaryButton label={saving ? 'SAVING…' : 'SAVE'} full onPress={save} disabled={!canSave} />
        </View>
      </BottomSheetFooter>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [insets.bottom, colors.popover, colors.fog, saving, canSave],
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
          <Txt variant="display4">Edit Profile</Txt>
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
          paddingBottom: insets.bottom + space[10],
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* AVATAR */}
        <View>
          <MicroLabel tone="ash">AVATAR</MicroLabel>
          <View
            style={{
              marginTop: space[3],
              flexDirection: 'row',
              alignItems: 'center',
              gap: space[4],
            }}
          >
            <Avatar uri={previewUri} size={96} />
            <View style={{ flex: 1 }}>
              <PrimaryButton label="CHANGE AVATAR" variant="ghost" onPress={onChangeAvatar} full />
            </View>
          </View>
          {/* The native picker isn't wired — URL paste is the actual working
              path. Kept dense beneath the row so behavior is unchanged. */}
          <Card padded style={{ marginTop: space[3] }}>
            <MicroLabel tone="ash">IMAGE URL</MicroLabel>
            <BottomSheetTextInput
              value={avatarUrl}
              onChangeText={setAvatarUrl}
              placeholder="https://…"
              placeholderTextColor={colors.ash}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={urlInputStyle}
            />
          </Card>
        </View>

        {/* NAME */}
        <View style={{ marginTop: space[5] }}>
          <MicroLabel tone="ash">NAME</MicroLabel>
          <Card padded style={{ marginTop: space[3] }}>
            <BottomSheetTextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor={colors.ash}
              autoCapitalize="words"
              style={nameInputStyle}
            />
          </Card>
        </View>

        {/* SPORTS */}
        <View style={{ marginTop: space[5] }}>
          <MicroLabel tone="ash">PRIMARY SPORT</MicroLabel>
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
                  <Txt variant="label" style={{ color: active ? colors.paper : colors.ink }}>
                    {SPORT_LABELS[s]}
                  </Txt>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* SCHOOL */}
        <View style={{ marginTop: space[5] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <MicroLabel tone="ash">SCHOOL</MicroLabel>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setPicking((v) => !v);
              }}
              hitSlop={8}
              accessibilityRole="button"
              style={{ minHeight: 32, justifyContent: 'center' }}
            >
              <MicroLabel tone="ink">{picking ? 'DONE' : 'CHANGE'}</MicroLabel>
            </Pressable>
          </View>

          <Card padded style={{ marginTop: space[3] }}>
            <Txt variant="bodyLg" tone={selectedSchool ? 'ink' : 'ash'} weight={selectedSchool ? 'semibold' : 'medium'}>
              {selectedSchool ? selectedSchool.name : 'No school set'}
            </Txt>
            {selectedSchool && locality(selectedSchool).length > 0 && (
              <Txt variant="bodySm" tone="ash" style={{ marginTop: space[1] }}>
                {locality(selectedSchool)}
              </Txt>
            )}
          </Card>

          {picking && (
            <View style={{ marginTop: space[4], gap: space[3] }}>
              {locating ? (
                <Card padded>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
                    <ActivityIndicator color={colors.ash} />
                    <MicroLabel tone="ash">FINDING SCHOOLS NEAR YOU…</MicroLabel>
                  </View>
                </Card>
              ) : (
                <PrimaryButton label="USE MY LOCATION" variant="ghost" onPress={useMyLocation} full />
              )}

              <Card padded>
                <MicroLabel tone="ash">SEARCH</MicroLabel>
                <BottomSheetTextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search schools"
                  placeholderTextColor={colors.ash}
                  autoCorrect={false}
                  style={searchInputStyle}
                />
              </Card>

              {schoolList.length > 0 && (
                <Card>
                  {schoolList.map((s, i) => (
                    <View key={s.id}>
                      <Pressable
                        onPress={() => pickSchool(s)}
                        accessibilityRole="button"
                        style={({ pressed }) => ({
                          paddingVertical: space[4],
                          paddingHorizontal: space[4],
                          minHeight: 56,
                          backgroundColor: pressed ? colors.fog : 'transparent',
                        })}
                      >
                        <Txt variant="bodyLg" weight="semibold">{s.name}</Txt>
                        {locality(s).length > 0 && (
                          <Txt variant="bodySm" tone="ash" style={{ marginTop: space[1] }}>
                            {locality(s)}
                          </Txt>
                        )}
                      </Pressable>
                      {i < schoolList.length - 1 && <HairlineRule />}
                    </View>
                  ))}
                </Card>
              )}

              {query.trim().length >= 2 && results.length === 0 && (
                <Txt variant="bodySm" tone="ash" weight="semibold">
                  No schools found.
                </Txt>
              )}
            </View>
          )}
        </View>

        {/* GRAD YEAR */}
        <View style={{ marginTop: space[5] }}>
          <MicroLabel tone="ash">GRAD YEAR</MicroLabel>
          <Card padded style={{ marginTop: space[3] }}>
            <BottomSheetTextInput
              value={gradYear}
              onChangeText={(t) => setGradYear(t.replace(/[^0-9]/g, '').slice(0, 4))}
              placeholder={String(CURRENT_YEAR + 4)}
              placeholderTextColor={colors.ash}
              keyboardType="number-pad"
              style={gradInputStyle}
            />
          </Card>
          {!gradYearValid && (
            <Txt variant="bodySm" tone="ember" weight="semibold" style={{ marginTop: space[2] }}>
              That doesn't look like a graduation year.
            </Txt>
          )}
        </View>

        {error && (
          <Txt
            variant="bodySm"
            tone="ember"
            weight="semibold"
            style={{ marginTop: space[5], textAlign: 'center' }}
            accessibilityLiveRegion="polite"
          >
            {error}
          </Txt>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});
