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
import { Card } from '../../components/primitives/Card';
import { StatBlock } from '../../components/primitives/StatBlock';
import { useTheme, space, SCREEN_PADDING, type, fonts } from '../../theme';
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

// Onboarding lives in two logical steps. We surface that explicitly at the top
// of each step so the form never feels open-ended.
const TOTAL_STEPS = 2;

interface FieldProps {
  label: string;
  helper?: React.ReactNode;
  children: React.ReactNode;
}

// Strava-style form field: MicroLabel above + Card containing the input. The
// Card is the affordance — taps land in the input inside.
function Field({ label, helper, children }: FieldProps) {
  return (
    <View style={{ marginBottom: space[5] }}>
      <MicroLabel style={{ marginBottom: space[2] }}>{label}</MicroLabel>
      <Card tone="surface" padded>
        {children}
      </Card>
      {helper}
    </View>
  );
}

// Sport selector laid out as a wrap-row of pill chips. Active = ember fill +
// paper text. Inactive = surface bg + ink text + fog border.
function SportPills({
  value,
  onChange,
}: {
  value: SportLabel | null;
  onChange: (s: SportLabel) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
      {SPORTS.map((sport) => {
        const active = value === sport;
        return (
          <Pressable
            key={sport}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(sport);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{
              paddingHorizontal: space[4],
              minHeight: 40,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: active ? colors.ember : colors.fog,
              backgroundColor: active ? colors.ember : colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Txt
              variant="label"
              style={{
                color: active ? colors.paper : colors.ink,
                letterSpacing: 0.4,
              }}
            >
              {sport}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
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
        <View
          style={{
            flex: 1,
            paddingHorizontal: SCREEN_PADDING,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Sanctioned ember celebration: the flame + Day 1 numeral. */}
          <Flame
            size={56}
            color={colors.ember}
            strokeWidth={2}
            fill={colors.ember}
          />
          <View style={{ marginTop: space[5] }}>
            <StatBlock
              value="1"
              label="DAY STREAK"
              size="xl"
              tone="accent"
              align="center"
            />
          </View>
          <Txt
            variant="display3"
            weight="bold"
            style={{ marginTop: space[6], textAlign: 'center' }}
          >
            Your streak starts now.
          </Txt>
          <Txt
            variant="bodyLg"
            tone="ash"
            style={{ marginTop: space[4], textAlign: 'center' }}
          >
            Show up tomorrow — add a stat, co-sign a teammate, or file a battle — to keep it lit. Miss a day and a freeze has your back.
          </Txt>
        </View>
        <View
          style={{
            position: 'absolute',
            left: SCREEN_PADDING,
            right: SCREEN_PADDING,
            bottom: insets.bottom + space[5],
          }}
        >
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
      <View
        style={{
          flex: 1,
          backgroundColor: colors.paper,
          paddingTop: insets.top + space[7],
        }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: SCREEN_PADDING,
            paddingBottom: insets.bottom + 120,
          }}
        >
          <MicroLabel>STEP 1 OF {TOTAL_STEPS}</MicroLabel>
          <Txt
            variant="display3"
            weight="bold"
            style={{ marginTop: space[3] }}
          >
            Tell us about you
          </Txt>
          <Txt
            variant="body"
            tone="ash"
            style={{ marginTop: space[3], marginBottom: space[7] }}
          >
            How you&apos;ll show up on the boards.
          </Txt>

          {/* Handle */}
          <Field
            label="HANDLE"
            helper={
              <MicroLabel
                tone={handleStatus === 'available' ? 'ink' : 'ash'}
                style={{ marginTop: space[2], marginLeft: space[1] }}
              >
                {handleStatusLabel()}
              </MicroLabel>
            }
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Txt
                variant="bodyLg"
                tone="ash"
                weight="semibold"
                style={{ marginRight: 2 }}
              >
                @
              </Txt>
              <TextInput
                value={handle}
                onChangeText={(t) => setHandle(normalizeHandle(t))}
                placeholder="yourname"
                placeholderTextColor={colors.ash}
                autoCapitalize="none"
                autoCorrect={false}
                allowFontScaling={false}
                style={[
                  type.bodyLg,
                  {
                    flex: 1,
                    fontFamily: fonts.semibold,
                    color: colors.ink,
                    paddingVertical: 0,
                  },
                ]}
              />
            </View>
          </Field>

          {/* Grad year */}
          <Field label="GRAD YEAR">
            <TextInput
              value={gradYear}
              onChangeText={(t) => setGradYear(t.replace(/[^0-9]/g, '').slice(0, 4))}
              placeholder="YYYY"
              placeholderTextColor={colors.ash}
              keyboardType="number-pad"
              maxLength={4}
              allowFontScaling={false}
              style={[
                type.bodyLg,
                {
                  fontFamily: fonts.semibold,
                  fontVariant: ['tabular-nums'],
                  letterSpacing: 1,
                  color: colors.ink,
                  paddingVertical: 0,
                },
              ]}
            />
          </Field>

          {/* Primary sport — pill row, ember on active. */}
          <View style={{ marginBottom: space[5] }}>
            <MicroLabel style={{ marginBottom: space[3] }}>PRIMARY SPORT</MicroLabel>
            <SportPills value={primarySport} onChange={setPrimarySport} />
          </View>
        </ScrollView>

        <View
          style={{
            position: 'absolute',
            left: SCREEN_PADDING,
            right: SCREEN_PADDING,
            bottom: insets.bottom + space[5],
          }}
        >
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
    <View
      style={{
        flex: 1,
        backgroundColor: colors.paper,
        paddingTop: insets.top + space[7],
      }}
    >
      <View style={{ paddingHorizontal: SCREEN_PADDING }}>
        <MicroLabel>STEP 2 OF {TOTAL_STEPS}</MicroLabel>
        <Txt
          variant="display3"
          weight="bold"
          style={{ marginTop: space[3] }}
        >
          Pick your school
        </Txt>
        <Txt
          variant="body"
          tone="ash"
          style={{ marginTop: space[3] }}
        >
          We check your location once to find it — your location is never saved.
        </Txt>
      </View>

      <HairlineRule style={{ marginTop: space[6] }} />

      {schoolMode === 'intro' ? (
        <View
          style={{
            flex: 1,
            paddingHorizontal: SCREEN_PADDING,
            paddingTop: space[8],
          }}
        >
          {locating ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space[3],
              }}
            >
              <ActivityIndicator color={colors.ink} />
              <MicroLabel>FINDING SCHOOLS NEAR YOU…</MicroLabel>
            </View>
          ) : (
            <>
              <PrimaryButton label="FIND MY SCHOOL" full onPress={useMyLocation} />
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setSchoolMode('manual');
                }}
                hitSlop={8}
                style={{ marginTop: space[6], alignSelf: 'center' }}
              >
                <Txt
                  variant="bodyLg"
                  weight="semibold"
                  style={{ textDecorationLine: 'underline' }}
                >
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
            <View
              style={{
                paddingHorizontal: SCREEN_PADDING,
                paddingTop: space[5],
              }}
            >
              {locationDenied && (
                <MicroLabel style={{ marginBottom: space[3] }}>
                  NO LOCATION — SEARCH FOR YOUR SCHOOL
                </MicroLabel>
              )}
              <Card tone="surface" padded>
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search schools"
                  placeholderTextColor={colors.ash}
                  autoCorrect={false}
                  allowFontScaling={false}
                  style={[
                    type.bodyLg,
                    {
                      fontFamily: fonts.semibold,
                      color: colors.ink,
                      paddingVertical: 0,
                    },
                  ]}
                />
              </Card>
            </View>
          )}

          {schoolMode === 'nearby' && (
            <View
              style={{
                paddingHorizontal: SCREEN_PADDING,
                paddingTop: space[5],
                paddingBottom: space[3],
              }}
            >
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
                    backgroundColor: isSel ? colors.surface : 'transparent',
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSel }}
                >
                  <Txt variant="bodyLg" weight={isSel ? 'bold' : 'medium'}>
                    {s.name}
                  </Txt>
                  <MicroLabel
                    tone="ash"
                    style={{ marginTop: space[1] }}
                  >
                    {[s.city, s.state].filter(Boolean).join(', ')}
                  </MicroLabel>
                </Pressable>
                {i < list.length - 1 && <HairlineRule />}
              </View>
            );
          })}

          {schoolMode === 'manual' && query.trim().length >= 2 && results.length === 0 && (
            <View
              style={{
                paddingHorizontal: SCREEN_PADDING,
                paddingTop: space[6],
              }}
            >
              <Txt variant="bodyLg" tone="ash" weight="semibold">
                No schools found.
              </Txt>
            </View>
          )}
        </ScrollView>
      )}

      <View
        style={{
          position: 'absolute',
          left: SCREEN_PADDING,
          right: SCREEN_PADDING,
          bottom: insets.bottom + space[5],
        }}
      >
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
          <PrimaryButton
            label="BACK"
            variant="ghost"
            onPress={() => setStep(0)}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            label={saving ? 'SAVING…' : 'DONE'}
            onPress={finish}
            disabled={saving || !selected}
            style={{ flex: 1 }}
          />
        </View>
        <Pressable
          onPress={finish}
          hitSlop={8}
          disabled={saving}
          style={{ marginTop: space[4], alignItems: 'center' }}
        >
          <MicroLabel>SKIP FOR NOW</MicroLabel>
        </Pressable>
      </View>
    </View>
  );
}
