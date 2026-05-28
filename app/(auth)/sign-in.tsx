import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { PrimaryButton } from '../../components/primitives/PrimaryButton';
import { useTheme, space, SCREEN_PADDING } from '../../theme';
import { signInWithApple, signInWithGoogle, appleAuthAvailable } from '../../lib/auth';

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleApple = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithApple();
    } catch (e: any) {
      setError(e.message ?? 'Apple sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setError(e.message ?? 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.paper,
        paddingHorizontal: SCREEN_PADDING,
        paddingTop: insets.top,
        paddingBottom: insets.bottom + space[5],
        justifyContent: 'flex-end',
      }}
    >
      {/* Masthead */}
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Txt variant="display2" style={{ fontSize: 52, lineHeight: 56 }}>
          Welcome to{' '}
          <Txt
            variant="display2"
            italic
            style={{ fontFamily: 'InstrumentSerifItalic', fontSize: 52, lineHeight: 56 }}
          >
            MARGIN.
          </Txt>
        </Txt>
        <Txt variant="bodyLg" tone="ash" style={{ marginTop: space[6], lineHeight: 26 }}>
          A sports app for people who watch the game, then read about it.
        </Txt>
      </View>

      {/* Error */}
      {error && (
        <Txt variant="bodySm" style={{ color: '#C0392B', marginBottom: space[4] }}>
          {error}
        </Txt>
      )}

      {/* Auth buttons */}
      <View style={{ gap: space[3] }}>
        {appleAuthAvailable() && (
          <PrimaryButton
            label="CONTINUE WITH APPLE"
            full
            onPress={handleApple}
            disabled={loading}
          />
        )}
        <PrimaryButton
          label="CONTINUE WITH GOOGLE"
          variant="ghost"
          full
          onPress={handleGoogle}
          disabled={loading}
        />
        <MicroLabel style={{ textAlign: 'center', marginTop: space[2] }}>
          BY CONTINUING YOU AGREE TO OUR TERMS
        </MicroLabel>
      </View>
    </View>
  );
}
