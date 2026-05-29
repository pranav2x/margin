import { useState } from 'react';
import { View, TextInput, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { PrimaryButton } from '../../components/primitives/PrimaryButton';
import { useTheme, space, SCREEN_PADDING, fonts } from '../../theme';
import {
  signInWithApple,
  signInWithGoogle,
  sendEmailOtp,
  verifyEmailOtp,
  appleAuthAvailable,
  isExpoGo,
} from '../../lib/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Google/Apple use native modules (or an OAuth redirect) that don't run in
// Expo Go, so over the QR code we lead with the email code flow.
const socialAuthAvailable = !isExpoGo;

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [step, setStep] = useState<'start' | 'code'>('start');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailValid = EMAIL_RE.test(email.trim());
  // Supabase currently issues 8-digit email OTPs by default. We accept 6–10 so
  // the screen keeps working if the project setting changes.
  const codeValid = code.length >= 6 && code.length <= 10;

  const sendCode = async () => {
    if (!emailValid) {
      setError('Enter a valid email address.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await sendEmailOtp(email);
      setCode('');
      setStep('code');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!codeValid) return;
    setError(null);
    setLoading(true);
    try {
      // On success the root layout's auth listener picks up the session and
      // advances the gate — no manual navigation needed here.
      await verifyEmailOtp(email, code);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That code didn’t work. Try again.');
    } finally {
      setLoading(false);
    }
  };

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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.paper }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={{
          flex: 1,
          paddingHorizontal: SCREEN_PADDING,
          paddingTop: insets.top + space[5],
          paddingBottom: insets.bottom + space[5],
        }}
      >
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Txt variant="display1" style={{ fontSize: 76, lineHeight: 80 }} accessibilityRole="header">
            MARGIN
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

        {step === 'start' ? (
          <View style={{ gap: space[3] }}>
            {socialAuthAvailable && (
              <>
                <PrimaryButton
                  label="CONTINUE WITH GOOGLE"
                  full
                  onPress={handleGoogle}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Google"
                />
                {appleAuthAvailable() && (
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], marginVertical: space[1] }}>
                  <HairlineRule style={{ flex: 1, width: undefined }} />
                  <MicroLabel>OR USE EMAIL</MicroLabel>
                  <HairlineRule style={{ flex: 1, width: undefined }} />
                </View>
              </>
            )}

            <View>
              <TextInput
                value={email}
                onChangeText={(t) => {
                  setError(null);
                  setEmail(t);
                }}
                placeholder="you@email.com"
                placeholderTextColor={colors.ash}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="go"
                onSubmitEditing={sendCode}
                editable={!loading}
                allowFontScaling={false}
                accessibilityLabel="Email address"
                style={{
                  fontFamily: fonts.body,
                  fontSize: 22,
                  lineHeight: 28,
                  color: colors.ink,
                  paddingVertical: space[2],
                }}
              />
              <HairlineRule />
            </View>

            {error && (
              <Txt variant="bodySm" tone="ash" accessibilityLiveRegion="polite">
                {error}
              </Txt>
            )}

            <PrimaryButton
              label={loading ? 'SENDING...' : 'EMAIL ME A CODE'}
              variant={socialAuthAvailable ? 'ghost' : 'primary'}
              full
              onPress={sendCode}
              disabled={loading || !emailValid}
              accessibilityRole="button"
              accessibilityLabel="Email me a sign-in code"
            />

            <MicroLabel style={{ textAlign: 'center', marginTop: space[2] }}>
              AGES 13 AND UP · YOU'LL CONFIRM YOUR AGE NEXT
            </MicroLabel>
          </View>
        ) : (
          <View style={{ gap: space[3] }}>
            <Txt variant="bodyLg" tone="ash">
              Enter the code sent to{'\n'}
              <Txt variant="bodyLg" style={{ fontFamily: fonts.bodyMedium }}>
                {email.trim().toLowerCase()}
              </Txt>
            </Txt>

            <View>
              <TextInput
                value={code}
                onChangeText={(t) => {
                  setError(null);
                  setCode(t.replace(/[^0-9]/g, '').slice(0, 10));
                }}
                placeholder="········"
                placeholderTextColor={colors.fog}
                keyboardType="number-pad"
                maxLength={10}
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                autoFocus
                editable={!loading}
                allowFontScaling={false}
                accessibilityLabel="Sign-in code"
                style={{
                  fontFamily: fonts.monoMedium,
                  fontVariant: ['tabular-nums'],
                  fontSize: 36,
                  lineHeight: 44,
                  letterSpacing: 6,
                  color: colors.ink,
                  paddingVertical: space[2],
                }}
              />
              <HairlineRule />
            </View>

            {error && (
              <Txt variant="bodySm" tone="ash" accessibilityLiveRegion="polite">
                {error}
              </Txt>
            )}

            <PrimaryButton
              label={loading ? 'VERIFYING...' : 'VERIFY & CONTINUE'}
              full
              onPress={verifyCode}
              disabled={loading || !codeValid}
              accessibilityRole="button"
              accessibilityLabel="Verify code and continue"
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space[1] }}>
              <Pressable
                onPress={() => {
                  setError(null);
                  setCode('');
                  setStep('start');
                }}
                disabled={loading}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Use a different email"
              >
                <MicroLabel>← DIFFERENT EMAIL</MicroLabel>
              </Pressable>
              <Pressable
                onPress={sendCode}
                disabled={loading}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Resend code"
              >
                <MicroLabel>RESEND CODE</MicroLabel>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
