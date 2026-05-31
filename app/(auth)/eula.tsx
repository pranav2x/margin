import { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { PrimaryButton } from '../../components/primitives/PrimaryButton';
import { AppIcon } from '../../components/primitives/AppIcon';
import { useTheme, space, radius, SCREEN_PADDING } from '../../theme';
import { supabase } from '../../lib/supabase';

const RULES: string[] = [
  'Report stats honestly. No fakes.',
  'No harassment, hate, threats, or nudity.',
  'Compete hard — keep it friendly.',
  'Report what you see. Reports are reviewed.',
  'No money, prizes, or wagering. Ever.',
];

const CHECKBOX_SIZE = 24;

function Checkbox({ checked }: { checked: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: CHECKBOX_SIZE,
        height: CHECKBOX_SIZE,
        borderRadius: radius.xs,
        borderWidth: 1,
        borderColor: checked ? colors.ember : colors.ink,
        backgroundColor: checked ? colors.ember : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {checked && <AppIcon name="Check" size={16} tone="paper" />}
    </View>
  );
}

export default function Eula() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const toggle = () => {
    Haptics.selectionAsync();
    setError(null);
    setAgreed((a) => !a);
  };

  const accept = async () => {
    if (!agreed) return;
    setError(null);
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Your session expired. Please sign in again.');
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ eula_accepted_at: new Date().toISOString() })
        .eq('id', user.id);

      if (updateError) {
        setError('Could not save your acceptance. Please try again.');
        return;
      }

      // Refresh the root auth-gate query so the route guard advances.
      await queryClient.invalidateQueries({ queryKey: ['auth-gate'] });
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.paper,
        paddingTop: insets.top + space[7],
      }}
    >
      <View style={{ paddingHorizontal: SCREEN_PADDING }}>
        <MicroLabel>THE GROUND RULES</MicroLabel>
        <Txt
          variant="display4"
          weight="bold"
          style={{ marginTop: space[3] }}
        >
          Community Rules
        </Txt>
        <Txt
          variant="body"
          tone="ash"
          style={{ marginTop: space[3] }}
        >
          Short version of what we expect from everyone on Elevate.
        </Txt>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_PADDING,
          paddingTop: space[7],
          paddingBottom: space[6],
        }}
      >
        {RULES.map((rule) => (
          <View
            key={rule}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: space[3],
              marginBottom: space[4],
            }}
          >
            <View style={{ paddingTop: 2 }}>
              <AppIcon name="Check" size={20} tone="ember" />
            </View>
            <Txt variant="bodyLg" style={{ flex: 1 }}>
              {rule}
            </Txt>
          </View>
        ))}

        <Pressable
          onPress={() => router.push('/(auth)/rules')}
          hitSlop={8}
          style={{ marginTop: space[4], alignSelf: 'flex-start' }}
        >
          <Txt
            variant="bodyLg"
            weight="semibold"
            style={{ textDecorationLine: 'underline' }}
          >
            Read the full rules →
          </Txt>
        </Pressable>
      </ScrollView>

      <View
        style={{
          paddingHorizontal: SCREEN_PADDING,
          paddingBottom: insets.bottom + space[5],
        }}
      >
        <HairlineRule style={{ marginBottom: space[5] }} />

        <Pressable
          onPress={toggle}
          hitSlop={8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space[3],
            marginBottom: space[5],
          }}
        >
          <Checkbox checked={agreed} />
          <Txt variant="body" style={{ flex: 1 }}>
            I am 13 or older and I agree to the community rules.
          </Txt>
        </Pressable>

        {error && (
          <Txt
            variant="bodySm"
            tone="error"
            style={{ marginBottom: space[4] }}
            accessibilityLiveRegion="polite"
          >
            {error}
          </Txt>
        )}

        <PrimaryButton
          label={submitting ? 'SAVING...' : 'ACCEPT'}
          full
          onPress={accept}
          disabled={!agreed || submitting}
        />
      </View>
    </View>
  );
}
