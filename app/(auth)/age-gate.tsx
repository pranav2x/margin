import { useState } from 'react';
import { View, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { Card } from '../../components/primitives/Card';
import { PrimaryButton } from '../../components/primitives/PrimaryButton';
import { AppIcon } from '../../components/primitives/AppIcon';
import { useTheme, space, SCREEN_PADDING, type } from '../../theme';
import { supabase } from '../../lib/supabase';
import { signOut } from '../../lib/auth';

const MIN_AGE = 13;
const YEAR_LEN = 4;

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
  const ready = year.length === YEAR_LEN;

  const onChange = (text: string) => {
    setError(null);
    setYear(text.replace(/[^0-9]/g, '').slice(0, YEAR_LEN));
  };

  const submit = async () => {
    setError(null);
    const parsed = Number(year);

    if (year.length !== YEAR_LEN || Number.isNaN(parsed) || parsed < 1900 || parsed > currentYear) {
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
    // Under-13 dead-end. The single ember moment lives in the Card border
    // tint — a sanctioned exception to the orange-restraint rule since the
    // ember stands in for the rejection signal.
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
        <Card
          padded
          style={{
            borderColor: colors.ember,
            alignItems: 'center',
          }}
        >
          <AppIcon name="Snowflake" size={28} tone="ember" />
          <MicroLabel
            tone="ink"
            style={{ marginTop: space[4], textAlign: 'center' }}
          >
            AGE REQUIREMENT
          </MicroLabel>
          <Txt
            variant="display4"
            weight="bold"
            style={{ marginTop: space[3], textAlign: 'center' }}
          >
            Elevate is for ages 13 and up.
          </Txt>
          <Txt
            variant="body"
            tone="ash"
            style={{ marginTop: space[4], textAlign: 'center' }}
          >
            Thanks for stopping by. Come back when you&apos;re a little older — we&apos;ll keep your spot on the board.
          </Txt>
        </Card>

        <View
          style={{
            position: 'absolute',
            left: SCREEN_PADDING,
            right: SCREEN_PADDING,
            bottom: insets.bottom + space[5],
          }}
        >
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
        paddingTop: insets.top + space[8],
      }}
    >
      <MicroLabel>ONE QUICK THING</MicroLabel>
      <Txt variant="display4" weight="bold" style={{ marginTop: space[3] }}>
        When were you born?
      </Txt>
      <Txt variant="body" tone="ash" style={{ marginTop: space[3] }}>
        Elevate is built for athletes ages 13 and up.
      </Txt>

      {/* Big centered tabular YYYY input. */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <TextInput
          value={year}
          onChangeText={onChange}
          placeholder="YYYY"
          placeholderTextColor={colors.fog}
          keyboardType="number-pad"
          maxLength={YEAR_LEN}
          autoFocus
          allowFontScaling={false}
          style={[
            type.scoreXl,
            {
              textAlign: 'center',
              color: colors.ink,
              letterSpacing: 4,
              minWidth: 220,
              paddingVertical: space[3],
            },
          ]}
        />
        {error && (
          <Txt
            variant="bodySm"
            tone="ash"
            style={{ marginTop: space[3], textAlign: 'center' }}
            accessibilityLiveRegion="polite"
          >
            {error}
          </Txt>
        )}
      </View>

      <View
        style={{
          paddingBottom: insets.bottom + space[5],
        }}
      >
        <PrimaryButton
          label={submitting ? 'CHECKING...' : 'CONTINUE'}
          full
          onPress={submit}
          disabled={submitting || !ready}
        />
      </View>
    </View>
  );
}
