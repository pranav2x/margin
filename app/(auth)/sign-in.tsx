import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { PrimaryButton } from '../../components/primitives/PrimaryButton';
import { useTheme, space, SCREEN_PADDING } from '../../theme';
import {
  signInWithApple,
  signInWithGoogle,
  appleAuthAvailable,
  isExpoGo,
} from '../../lib/auth';

const googleAvailable = true;
const appleAvailable = !isExpoGo && appleAuthAvailable();

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
        <View style={{ flex: 1, justifyContent: 'center', paddingBottom: space[9] }}>
          <Txt
            variant="display1"
            style={{ fontSize: 76, lineHeight: 80 }}
            accessibilityRole="header"
          >
            Elevate
          </Txt>
          <Txt
            variant="display4"
            italic
            tone="ash"
            style={{
              marginTop: space[4],
              fontFamily: 'InstrumentSerifItalic',
              fontSize: 24,
              lineHeight: 30,
            }}
          >
            Your game, by the numbers.
          </Txt>
        </View>

        <View style={{ gap: space[3] }}>
          {googleAvailable && (
            <PrimaryButton
              label="CONTINUE WITH GOOGLE"
              full
              onPress={handleGoogle}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
            />
          )}

          {appleAvailable && (
            <PrimaryButton
              label="CONTINUE WITH APPLE"
              variant="ghost"
              full
              onPress={handleApple}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Continue with Apple"
            />
          )}

          {error != null && (
            <Txt
              variant="bodySm"
              tone="ash"
              accessibilityLiveRegion="polite"
            >
              {error}
            </Txt>
          )}

          <MicroLabel style={{ textAlign: 'center', marginTop: space[2] }}>
            AGES 13 AND UP
          </MicroLabel>
        </View>
      </View>
    </View>
  );
}
