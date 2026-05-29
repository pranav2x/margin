import { useState } from 'react';
import { View, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { PrimaryButton } from '../../components/primitives/PrimaryButton';
import { useTheme, space, SCREEN_PADDING, fonts } from '../../theme';
import { supabase } from '../../lib/supabase';
import { signOut } from '../../lib/auth';

const MIN_AGE = 13;

// Year-only gate: age is approximated as currentYear - birthYear (ignores
// birthday month, which is standard for a year-based check). Bands:
//   13-15 -> '13_15', 16-18 -> '16_18', 19+ -> '19_plus'. Under 13 is blocked.
function ageBandFor(age: number): '13_15' | '16_18' | '19_plus' {
  if (age <= 15) return '13_15';
  if (age <= 18) return '16_18';
  return '19_plus';
}

export default function AgeGate() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [year, setYear] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const currentYear = new Date().getFullYear();

  const onChange = (text: string) => {
    setError(null);
    setYear(text.replace(/[^0-9]/g, '').slice(0, 4));
  };

  const submit = async () => {
    setError(null);
    const parsed = Number(year);

    if (year.length !== 4 || Number.isNaN(parsed) || parsed < 1900 || parsed > currentYear) {
      setError('Enter the four-digit year you were born.');
      return;
    }

    const age = currentYear - parsed;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Your session expired. Please sign in again.');
        return;
      }

      // Under-13 block: purge any auto-created profile row, then show the
      // full-screen message. The server trigger also rejects this birth_year,
      // so an under-13 account can never be persisted.
      if (age < MIN_AGE) {
        await supabase.from('profiles').delete().eq('id', user.id);
        setBlocked(true);
        return;
      }

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            email: user.email ?? null,
            birth_year: parsed,
            age_band: ageBandFor(age),
          },
          { onConflict: 'id' },
        );

      if (upsertError) {
        setError('Could not save your age. Please try again.');
        return;
      }

      // Refresh the root auth-gate query so the route guard advances to EULA.
      await queryClient.invalidateQueries({ queryKey: ['auth-gate'] });
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (blocked) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.paper,
          paddingHorizontal: SCREEN_PADDING,
          paddingTop: insets.top,
          paddingBottom: insets.bottom + space[5],
          justifyContent: 'center',
        }}
      >
        <MicroLabel>AGE REQUIREMENT</MicroLabel>
        <Txt variant="display2" style={{ marginTop: space[4], fontSize: 44, lineHeight: 48 }}>
          MARGIN is for ages{' '}
          <Txt variant="display2" italic style={{ fontFamily: 'InstrumentSerifItalic', fontSize: 44, lineHeight: 48 }}>
            13 and up.
          </Txt>
        </Txt>
        <Txt variant="bodyLg" tone="ash" style={{ marginTop: space[6], lineHeight: 26 }}>
          Thanks for stopping by. Come back when you're a little older — we'll keep your spot on the board.
        </Txt>

        <View style={{ position: 'absolute', left: SCREEN_PADDING, right: SCREEN_PADDING, bottom: insets.bottom + space[5] }}>
          <PrimaryButton label="OK" full onPress={() => signOut()} />
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.paper,
        paddingHorizontal: SCREEN_PADDING,
        paddingTop: insets.top + space[7],
      }}
    >
      <MicroLabel>ONE QUICK THING</MicroLabel>
      <Txt variant="display2" style={{ marginTop: space[4], fontSize: 44, lineHeight: 48 }}>
        What year were you{' '}
        <Txt variant="display2" italic style={{ fontFamily: 'InstrumentSerifItalic', fontSize: 44, lineHeight: 48 }}>
          born?
        </Txt>
      </Txt>
      <Txt variant="bodyLg" tone="ash" style={{ marginTop: space[4], lineHeight: 26 }}>
        MARGIN is built for athletes ages 13 and up.
      </Txt>

      <View style={{ marginTop: space[8] }}>
        <TextInput
          value={year}
          onChangeText={onChange}
          placeholder="YYYY"
          placeholderTextColor={colors.ash}
          keyboardType="number-pad"
          maxLength={4}
          autoFocus
          allowFontScaling={false}
          style={{
            fontFamily: fonts.monoMedium,
            fontVariant: ['tabular-nums'],
            fontSize: 64,
            lineHeight: 68,
            letterSpacing: 4,
            color: colors.ink,
            paddingVertical: space[2],
          }}
        />
        <HairlineRule />
        {error && (
          <Txt variant="bodySm" tone="ash" style={{ marginTop: space[3] }}>
            {error}
          </Txt>
        )}
      </View>

      <View style={{ position: 'absolute', left: SCREEN_PADDING, right: SCREEN_PADDING, bottom: insets.bottom + space[5] }}>
        <PrimaryButton
          label={submitting ? 'CHECKING...' : 'CONTINUE'}
          full
          onPress={submit}
          disabled={submitting}
        />
      </View>
    </View>
  );
}
