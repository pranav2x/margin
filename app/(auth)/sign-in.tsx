import { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { PrimaryButton } from '../../components/primitives/PrimaryButton';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { useTheme, space, SCREEN_PADDING, fonts } from '../../theme';
import {
  signInWithApple,
  signInWithGoogle,
  appleAuthAvailable,
  isExpoGo,
  sendEmailOtp,
  verifyEmailOtp,
} from '../../lib/auth';

const googleAvailable = true;
const appleAvailable = !isExpoGo && appleAuthAvailable();

type Phase = 'email' | 'code';

function isValidEmail(raw: string): boolean {
  const trimmed = raw.trim().toLowerCase();
  return trimmed.includes('@') && trimmed.includes('.');
}

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [phase, setPhase] = useState<Phase>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  const codeInputRef = useRef<TextInput>(null);
  const autoVerifiedFor = useRef<string | null>(null);

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

  const handleSendCode = async () => {
    if (!isValidEmail(email) || loading) return;
    setError(null);
    setLoading(true);
    try {
      await sendEmailOtp(email);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCode('');
      autoVerifiedFor.current = null;
      setPhase('code');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (token: string) => {
    if (token.length !== 6 || loading) return;
    setError(null);
    setLoading(true);
    try {
      await verifyEmailOtp(email, token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      autoVerifiedFor.current = null;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e instanceof Error ? e.message : 'Invalid code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    if (error) setError(null);
    if (digits.length === 6 && autoVerifiedFor.current !== digits) {
      autoVerifiedFor.current = digits;
      handleVerify(digits);
    }
  };

  const handleBackToEmail = () => {
    setError(null);
    setCode('');
    autoVerifiedFor.current = null;
    setPhase('email');
  };

  useEffect(() => {
    if (phase === 'code') {
      const t = setTimeout(() => codeInputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const emailValid = isValidEmail(email);

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

        {phase === 'email' ? (
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

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space[3],
                marginTop: space[2],
                marginBottom: space[2],
              }}
            >
              <View style={{ flex: 1 }}>
                <HairlineRule />
              </View>
              <MicroLabel>OR</MicroLabel>
              <View style={{ flex: 1 }}>
                <HairlineRule />
              </View>
            </View>

            <View
              style={{
                borderWidth: 1,
                borderColor: colors.ink,
                paddingHorizontal: space[4],
                paddingVertical: space[3],
              }}
            >
              <TextInput
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  if (error) setError(null);
                }}
                placeholder="you@example.com"
                placeholderTextColor={colors.ash}
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                allowFontScaling={false}
                returnKeyType="send"
                onSubmitEditing={handleSendCode}
                editable={!loading}
                style={{
                  fontFamily: fonts.body,
                  fontSize: 17,
                  lineHeight: 22,
                  color: colors.ink,
                  padding: 0,
                }}
                accessibilityLabel="Email address"
              />
            </View>

            <PrimaryButton
              label="EMAIL ME A CODE"
              variant="ghost"
              full
              onPress={handleSendCode}
              disabled={!emailValid || loading}
              accessibilityRole="button"
              accessibilityLabel="Email me a one-time code"
            />

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
        ) : (
          <View style={{ gap: space[3] }}>
            <MicroLabel>CODE SENT TO</MicroLabel>
            <Txt variant="bodyLg" numberOfLines={1}>
              {email.trim().toLowerCase()}
            </Txt>

            <View
              style={{
                borderWidth: 1,
                borderColor: colors.ink,
                paddingHorizontal: space[4],
                paddingVertical: space[4],
                marginTop: space[2],
              }}
            >
              <TextInput
                ref={codeInputRef}
                value={code}
                onChangeText={handleCodeChange}
                placeholder="000000"
                placeholderTextColor={colors.fog}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                maxLength={6}
                allowFontScaling={false}
                editable={!loading}
                style={{
                  fontFamily: fonts.mono,
                  fontVariant: ['tabular-nums'],
                  fontSize: 32,
                  lineHeight: 36,
                  letterSpacing: 8,
                  color: colors.ink,
                  textAlign: 'center',
                  padding: 0,
                }}
                accessibilityLabel="Six digit code"
              />
            </View>

            <PrimaryButton
              label={loading ? 'VERIFYING…' : 'VERIFY'}
              full
              onPress={() => handleVerify(code)}
              disabled={code.length !== 6 || loading}
              accessibilityRole="button"
              accessibilityLabel="Verify code"
            />

            <PrimaryButton
              label="RESEND CODE"
              variant="ghost"
              full
              onPress={handleSendCode}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Resend code"
            />

            <PrimaryButton
              label="BACK"
              variant="ghost"
              full
              onPress={handleBackToEmail}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Back to email"
            />

            {error != null && (
              <Txt
                variant="bodySm"
                tone="ash"
                accessibilityLiveRegion="polite"
              >
                {error}
              </Txt>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
