import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { PressableScale } from '../../components/primitives/PressableScale';
import { useTheme, space, SCREEN_PADDING } from '../../theme';
import {
  signInWithApple,
  signInWithGoogle,
  appleAuthAvailable,
  isExpoGo,
} from '../../lib/auth';

const googleAvailable = true;
const appleAvailable = !isExpoGo && appleAuthAvailable();
const BUTTON_HEIGHT = 48;
const BUTTON_RADIUS = 12;

// Strava sign-in convention: no ember on this screen. The wordmark is the hero,
// and the auth providers wear their system colors. The single accent moment
// stays parked for the next surface in.
interface AuthButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant: 'apple' | 'google';
  accessibilityLabel: string;
}

function AuthButton({ label, onPress, disabled, variant, accessibilityLabel }: AuthButtonProps) {
  const { colors } = useTheme();
  // Apple = black bg + white text per system standard.
  // Google = paper bg + ink text + ink border (Strava-faithful).
  const bg = variant === 'apple' ? colors.void : colors.paper;
  const fg = variant === 'apple' ? colors.paper : colors.ink;
  const border = variant === 'apple' ? 'transparent' : colors.ink;
  const borderWidth = variant === 'apple' ? 0 : 1;

  return (
    <PressableScale
      onPress={() => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{
        backgroundColor: bg,
        borderColor: border,
        borderWidth,
        borderRadius: BUTTON_RADIUS,
        minHeight: BUTTON_HEIGHT,
        paddingHorizontal: space[5],
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
        alignSelf: 'stretch',
      }}
    >
      <Txt variant="label" style={{ color: fg, letterSpacing: 0.6 }}>
        {label}
      </Txt>
    </PressableScale>
  );
}

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleApple = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithApple();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (!/cancel/i.test(message)) setError('Apple sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: SCREEN_PADDING,
          paddingTop: insets.top + space[6],
          paddingBottom: insets.bottom + space[6],
        }}
      >
        {/* Top half — centered ELEVATE wordmark + tagline. */}
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Txt
            variant="display1"
            weight="extrabold"
            accessibilityRole="header"
            style={{ textAlign: 'center' }}
          >
            ELEVATE
          </Txt>
          <Txt
            variant="bodyLg"
            tone="ash"
            style={{ marginTop: space[4], textAlign: 'center' }}
          >
            Verified stats. Real recruiting.
          </Txt>
        </View>

        {/* Bottom half — stacked auth buttons. */}
        <View style={{ gap: space[3] }}>
          {appleAvailable && (
            <AuthButton
              label="CONTINUE WITH APPLE"
              variant="apple"
              onPress={handleApple}
              disabled={loading}
              accessibilityLabel="Continue with Apple"
            />
          )}

          {googleAvailable && (
            <AuthButton
              label="CONTINUE WITH GOOGLE"
              variant="google"
              onPress={handleGoogle}
              disabled={loading}
              accessibilityLabel="Continue with Google"
            />
          )}

          {error != null && (
            <Txt
              variant="bodySm"
              tone="ash"
              style={{ textAlign: 'center', marginTop: space[2] }}
              accessibilityLiveRegion="polite"
            >
              {error}
            </Txt>
          )}

          <Txt
            variant="bodySm"
            tone="ash"
            style={{ textAlign: 'center', marginTop: space[3] }}
          >
            By continuing you agree to our{' '}
            <Txt variant="bodySm" tone="ash" weight="semibold">
              Terms
            </Txt>{' '}
            and{' '}
            <Txt variant="bodySm" tone="ash" weight="semibold">
              Community Rules
            </Txt>
            .
          </Txt>

          <MicroLabel style={{ textAlign: 'center', marginTop: space[2] }}>
            AGES 13 AND UP
          </MicroLabel>
        </View>
      </View>
    </View>
  );
}
