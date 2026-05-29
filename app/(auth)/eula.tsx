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
import { useTheme, space, SCREEN_PADDING } from '../../theme';
import { supabase } from '../../lib/supabase';

function Checkbox({ checked }: { checked: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderWidth: 1,
        borderColor: colors.ink,
        backgroundColor: checked ? colors.ink : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {checked && (
        <Txt style={{ color: colors.paper, fontSize: 14, lineHeight: 16, fontFamily: 'GeistMedium' }}>
          ✓
        </Txt>
      )}
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
        <Txt variant="display2" style={{ marginTop: space[4], fontSize: 44, lineHeight: 48 }}>
          Play it{' '}
          <Txt variant="display2" italic style={{ fontFamily: 'InstrumentSerifItalic', fontSize: 44, lineHeight: 48 }}>
            straight.
          </Txt>
        </Txt>
      </View>

      <HairlineRule style={{ marginTop: space[6] }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingVertical: space[6] }}
      >
        <Txt variant="bodyLg" tone="ash" style={{ lineHeight: 26 }}>
          MARGIN is a community for student athletes to share their stats and stack up
          against each other. By continuing, you agree to our Terms of Use and Community
          Rules.
        </Txt>
        <Txt variant="bodyLg" tone="ash" style={{ marginTop: space[5], lineHeight: 26 }}>
          You agree not to post objectionable content — harassment, hate, threats, nudity,
          or anything abusive — and to report it when you see it. There is zero tolerance for
          abusive behavior. Accounts that break these rules can be removed.
        </Txt>
        <Txt variant="bodyLg" tone="ash" style={{ marginTop: space[5], lineHeight: 26 }}>
          MARGIN is for stats and friendly competition only. It is not a betting, wagering,
          or prize platform, and involves no money.
        </Txt>

        <Pressable
          onPress={() => router.push('/(auth)/rules')}
          hitSlop={8}
          style={{ marginTop: space[6], alignSelf: 'flex-start' }}
        >
          <Txt
            variant="bodyLg"
            italic
            style={{ fontFamily: 'InstrumentSerifItalic', textDecorationLine: 'underline' }}
          >
            Read the full community rules →
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
          style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], marginBottom: space[5] }}
        >
          <Checkbox checked={agreed} />
          <Txt variant="body" style={{ flex: 1 }}>
            I am 13 or older and I agree to the Terms and Community Rules.
          </Txt>
        </Pressable>

        {error && (
          <Txt variant="bodySm" tone="ash" style={{ marginBottom: space[4] }}>
            {error}
          </Txt>
        )}

        <PrimaryButton
          label={submitting ? 'SAVING...' : 'AGREE & CONTINUE'}
          full
          onPress={accept}
          disabled={!agreed || submitting}
        />
      </View>
    </View>
  );
}
