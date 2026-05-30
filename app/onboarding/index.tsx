import { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Flame } from 'lucide-react-native';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { PrimaryButton } from '../../components/primitives/PrimaryButton';
import { TabPill } from '../../components/composite/TabPill';
import { Score } from '../../components/motion/Score';
import { useTheme, space, SCREEN_PADDING, fonts } from '../../theme';
import { supabase } from '../../lib/supabase';
import { recordActivity } from '../../lib/hooks/useStreak';
import { useNearbySchools, type NearbySchool } from '../../lib/hooks/useNearbySchools';

interface School {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
}

const SPORTS = ['Football', 'Basketball', 'Baseball', 'Track'] as const;
type SportLabel = (typeof SPORTS)[number];

type HandleStatus = 'idle' | 'invalid' | 'checking' | 'available' | 'taken';
type SchoolMode = 'intro' | 'nearby' | 'manual';

function normalizeHandle(raw: string): string {
  return raw.toLowerCase().trim().replace(/[^a-z0-9_]/g, '').slice(0, 20);
}

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<0 | 1>(0);
  const [committed, setCommitted] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);

  // Step 0 — identity
  const [handle, setHandle] = useState('');
  const [handleStatus, setHandleStatus] = useState<HandleStatus>('idle');
  const [gradYear, setGradYear] = useState('');
  const [primarySport, setPrimarySport] = useState<SportLabel | null>(null);

  // Step 1 — school
  const [schoolMode, setSchoolMode] = useState<SchoolMode>('intro');
  const nearbyHook = useNearbySchools(6);
  const { loading: locating, denied: locationDenied, data: nearby } = nearbyHook;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<School[]>([]);
  const [selected, setSelected] = useState<School | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const gradYearNum = Number(gradYear);
  const gradYearValid =
    gradYear.length === 4 && gradYearNum >= currentYear - 1 && gradYearNum <= currentYear + 8;
  const canContinue = handleStatus === 'available' && gradYearValid && !!primarySport;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setMyId(user?.id ?? null));
  }, []);

  // Debounced handle uniqueness check.
  useEffect(() => {
    if (handle.length === 0) {
      setHandleStatus('idle');
      return;
    }
    if (handle.length < 3) {
      setHandleStatus('invalid');
      return;
    }
    setHandleStatus('checking');
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('handle', handle)
        .maybeSingle();
      setHandleStatus(data && data.id !== myId ? 'taken' : 'available');
    }, 450);
    return () => clearTimeout(t);
  }, [handle, myId]);

  // Debounced manual school search.
  useEffect(() => {
    if (schoolMode !== 'manual') return;
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
  }, [query, schoolMode]);

  const handleStatusLabel = (): string => {
    if (handleStatus === 'checking') return 'CHECKING…';
    if (handleStatus === 'taken') return 'THAT HANDLE IS TAKEN';
    if (handleStatus === 'available') return 'AVAILABLE';
    if (handleStatus === 'invalid') return 'AT LEAST 3 CHARACTERS';
    return 'LOWERCASE LETTERS, NUMBERS, UNDERSCORE';
  };

  const useMyLocation = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Hook handles the foreground permission + nearby_schools RPC and never
    // persists coordinates. We just react to the result.
    const list = await nearbyHook.locate(6);
    if (list && list.length > 0) {
      setSchoolMode('nearby');
    } else {
      setSchoolMode('manual');
    }
  };

  const pickSchool = (s: School | NearbySchool) => {
    Haptics.selectionAsync();
    setSelected({ id: s.id, name: s.name, city: s.city, state: s.state });
  };

  const finish = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    setSaveError(null);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw authError ?? new Error('You need to be signed in to finish.');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          handle,
          grad_year: gradYearNum,
          primary_sport: primarySport ? primarySport.toLowerCase() : null,
          school_id: selected ? selected.id : null,
          onboarded: true,
        })
        .eq('id', user.id);
      if (updateError) throw updateError;
      // Only flip the route guard forward once the profile write succeeded —
      // otherwise the guard bounces straight back to onboarding.
      await queryClient.invalidateQueries({ queryKey: ['auth-gate'] });
      // Day 1: the user is already authenticated here, so seed their first
      // activity day now. Fire-and-forget — a streak hiccup must never block
      // finishing onboarding. Then hand them the commitment beat before tabs.
      void recordActivity(queryClient);
      setCommitted(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Couldn't finish setting up. Try again.");
      setSaving(false);
    }
  };

  // ── Commitment beat: streak Day 1 ─────────────────────────
  // Shown once the profile write lands (and Day 1 is seeded). The route guard
  // already reads onboarded=true, so it won't yank us off this screen; we hold
  // here until the athlete taps in, then hand off to the tabs.
  if (committed) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
        <View style={{ flex: 1, paddingHorizontal: SCREEN_PADDING, justifyContent: 'center' }}>
          {/* Sanctioned ember celebration: the flame + Day 1 numeral. */}
          <Flame size={48} color={colors.ember} strokeWidth={1.5} />
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: space[5] }}>
            <Score value={1} size="xl" style={{ color: colors.ember }} />
            <MicroLabel style={{ marginLeft: space[3], marginBottom: space[2] }}>DAY STREAK</MicroLabel>
          </View>
          <Txt variant="display2" style={{ marginTop: space[5], fontSize: 44, lineHeight: 48 }}>
            Your streak{' '}
            <Txt variant="display2" italic style={{ fontFamily: 'InstrumentSerifItalic', fontSize: 44, lineHeight: 48 }}>
              starts now.
            </Txt>
          </Txt>
          <Txt variant="bodyLg" tone="ash" style={{ marginTop: space[4], lineHeight: 26 }}>
            Show up tomorrow — add a stat, co-sign a teammate, or file a battle — to keep it lit. Miss a day and a freeze has your back.
          </Txt>
        </View>
        <View style={{ position: 'absolute', left: SCREEN_PADDING, right: SCREEN_PADDING, bottom: insets.bottom + space[5] }}>
          <PrimaryButton
            label="START MY STREAK"
            full
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.replace('/(tabs)/you');
            }}
          />
        </View>
      </View>
    );
  }

  // ── Step 0: identity ──────────────────────────────────────
  if (step === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top + space[7] }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: insets.bottom + 120 }}
        >
          <MicroLabel>SET UP YOUR BYLINE</MicroLabel>
          <Txt variant="display2" style={{ marginTop: space[3], fontSize: 44, lineHeight: 48 }}>
            Who are{' '}
            <Txt variant="display2" italic style={{ fontFamily: 'InstrumentSerifItalic', fontSize: 44, lineHeight: 48 }}>
              you?
            </Txt>
          </Txt>

          {/* Handle */}
          <View style={{ marginTop: space[8] }}>
            <MicroLabel>HANDLE</MicroLabel>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: space[2] }}>
              <Txt variant="display3" tone="ash" style={{ fontSize: 28 }}>@</Txt>
              <TextInput
                value={handle}
                onChangeText={(t) => setHandle(normalizeHandle(t))}
                placeholder="yourname"
                placeholderTextColor={colors.ash}
                autoCapitalize="none"
                autoCorrect={false}
                allowFontScaling={false}
                style={{
                  flex: 1,
                  marginLeft: space[1],
                  fontFamily: fonts.serif,
                  fontSize: 28,
                  lineHeight: 32,
                  color: colors.ink,
                  paddingVertical: space[1],
                }}
              />
            </View>
            <HairlineRule />
            <MicroLabel
              tone={handleStatus === 'available' ? 'ink' : 'ash'}
              style={{ marginTop: space[3] }}
            >
              {handleStatusLabel()}
            </MicroLabel>
          </View>

          {/* Grad year */}
          <View style={{ marginTop: space[7] }}>
            <MicroLabel>GRAD YEAR</MicroLabel>
            <TextInput
              value={gradYear}
              onChangeText={(t) => setGradYear(t.replace(/[^0-9]/g, '').slice(0, 4))}
              placeholder="YYYY"
              placeholderTextColor={colors.ash}
              keyboardType="number-pad"
              maxLength={4}
              allowFontScaling={false}
              style={{
                marginTop: space[2],
                fontFamily: fonts.monoMedium,
                fontVariant: ['tabular-nums'],
                fontSize: 40,
                lineHeight: 44,
                letterSpacing: 2,
                color: colors.ink,
                paddingVertical: space[1],
              }}
            />
            <HairlineRule />
          </View>

          {/* Primary sport */}
          <View style={{ marginTop: space[7] }}>
            <MicroLabel style={{ marginBottom: space[3] }}>PRIMARY SPORT</MicroLabel>
            <TabPill
              items={SPORTS as unknown as string[]}
              active={primarySport ?? ''}
              onChange={(item) => setPrimarySport(item as SportLabel)}
            />
          </View>
        </ScrollView>

        <View style={{ position: 'absolute', left: SCREEN_PADDING, right: SCREEN_PADDING, bottom: insets.bottom + space[5] }}>
          <PrimaryButton
            label="CONTINUE"
            full
            disabled={!canContinue}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setStep(1);
            }}
          />
        </View>
      </View>
    );
  }

  // ── Step 1: school ────────────────────────────────────────
  const list: (School | NearbySchool)[] = schoolMode === 'nearby' ? (nearby ?? []) : results;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top + space[7] }}>
      <View style={{ paddingHorizontal: SCREEN_PADDING }}>
        <MicroLabel>WHERE DO YOU PLAY?</MicroLabel>
        <Txt variant="display2" style={{ marginTop: space[3], fontSize: 44, lineHeight: 48 }}>
          Your{' '}
          <Txt variant="display2" italic style={{ fontFamily: 'InstrumentSerifItalic', fontSize: 44, lineHeight: 48 }}>
            school.
          </Txt>
        </Txt>
        <Txt variant="bodyLg" tone="ash" style={{ marginTop: space[4], lineHeight: 26 }}>
          We check your location once to find it — your location is never saved.
        </Txt>
      </View>

      <HairlineRule style={{ marginTop: space[6] }} />

      {schoolMode === 'intro' ? (
        <View style={{ flex: 1, paddingHorizontal: SCREEN_PADDING, paddingTop: space[8], alignItems: 'flex-start' }}>
          {locating ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
              <ActivityIndicator color={colors.ink} />
              <MicroLabel>FINDING SCHOOLS NEAR YOU…</MicroLabel>
            </View>
          ) : (
            <>
              <PrimaryButton label="FIND MY SCHOOL" onPress={useMyLocation} />
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setSchoolMode('manual');
                }}
                hitSlop={8}
                style={{ marginTop: space[6] }}
              >
                <Txt variant="bodyLg" italic style={{ fontFamily: 'InstrumentSerifItalic', textDecorationLine: 'underline' }}>
                  Search by name instead →
                </Txt>
              </Pressable>
            </>
          )}
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        >
          {schoolMode === 'manual' && (
            <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[5] }}>
              {locationDenied && (
                <MicroLabel style={{ marginBottom: space[3] }}>
                  NO LOCATION — SEARCH FOR YOUR SCHOOL
                </MicroLabel>
              )}
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search schools"
                placeholderTextColor={colors.ash}
                autoCorrect={false}
                allowFontScaling={false}
                style={{
                  fontFamily: fonts.serif,
                  fontSize: 24,
                  lineHeight: 28,
                  color: colors.ink,
                  paddingVertical: space[2],
                }}
              />
              <HairlineRule />
            </View>
          )}

          {schoolMode === 'nearby' && (
            <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[5], paddingBottom: space[3] }}>
              <MicroLabel>NEAREST TO YOU</MicroLabel>
            </View>
          )}

          {list.map((s, i) => {
            const isSel = selected?.id === s.id;
            return (
              <View key={s.id}>
                <Pressable
                  onPress={() => pickSchool(s)}
                  style={{
                    paddingHorizontal: SCREEN_PADDING,
                    paddingVertical: space[4],
                    backgroundColor: isSel ? colors.ink : 'transparent',
                  }}
                >
                  <Txt variant="bodyLg" style={{ color: isSel ? colors.paper : colors.ink }}>
                    {s.name}
                  </Txt>
                  <MicroLabel tone={isSel ? 'ink' : 'ash'} inverted={isSel} style={{ marginTop: space[1] }}>
                    {[s.city, s.state].filter(Boolean).join(', ')}
                  </MicroLabel>
                </Pressable>
                {i < list.length - 1 && <HairlineRule />}
              </View>
            );
          })}

          {schoolMode === 'manual' && query.trim().length >= 2 && results.length === 0 && (
            <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[6] }}>
              <Txt variant="bodyLg" tone="ash" italic style={{ fontFamily: 'InstrumentSerifItalic' }}>
                No schools found.
              </Txt>
            </View>
          )}
        </ScrollView>
      )}

      <View style={{ position: 'absolute', left: SCREEN_PADDING, right: SCREEN_PADDING, bottom: insets.bottom + space[5] }}>
        {saveError && (
          <Txt
            variant="bodySm"
            tone="ink"
            style={{ marginBottom: space[3], textAlign: 'center' }}
            accessibilityLiveRegion="polite"
          >
            {saveError}
          </Txt>
        )}
        <View style={{ flexDirection: 'row', gap: space[3] }}>
          <PrimaryButton label="BACK" variant="ghost" onPress={() => setStep(0)} style={{ flex: 1 }} />
          <PrimaryButton
            label={saving ? 'SAVING…' : 'DONE'}
            onPress={finish}
            disabled={saving || !selected}
            style={{ flex: 1 }}
          />
        </View>
        <Pressable onPress={finish} hitSlop={8} disabled={saving} style={{ marginTop: space[4], alignItems: 'center' }}>
          <MicroLabel>SKIP FOR NOW</MicroLabel>
        </Pressable>
      </View>
    </View>
  );
}
