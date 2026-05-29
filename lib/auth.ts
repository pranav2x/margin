/**
 * Sign-in helpers → Supabase.
 *
 *  - Email one-time code: pure API calls (signInWithOtp / verifyOtp). Works
 *    EVERYWHERE, including Expo Go — no native module and no OAuth redirect.
 *  - Google: native Google Sign-In SDK, only available in a development build
 *    (`npx expo run:ios` or an EAS dev/standalone build), NOT Expo Go.
 *  - Apple: native Apple Authentication module (dev/standalone build).
 *  - Web: Supabase full-page browser-redirect OAuth.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import * as AppleAuthentication from 'expo-apple-authentication';

export const isExpoGo = Constants.appOwnership === 'expo';

// ── Email one-time code (works in Expo Go) ───────────────────

// Sends a 6-digit login code to the address. shouldCreateUser lets brand-new
// emails sign up in the same step. No redirect — the user types the code back
// into the app, so this is the one flow that works over the Expo Go QR code.
export async function sendEmailOtp(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifyEmailOtp(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: 'email',
  });
  if (error) throw error;
  return data;
}

// ── Google (native dev build) ────────────────────────────────

// @react-native-google-signin/google-signin is a native module that is absent
// from Expo Go, so it is required lazily and configured once on first use. We
// never reach this code in Expo Go (signInWithGoogle throws earlier).
let _googleSignin: typeof import('@react-native-google-signin/google-signin').GoogleSignin | null =
  null;

function getGoogleSignin() {
  if (!_googleSignin) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _googleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
    _googleSignin!.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    });
  }
  return _googleSignin!;
}

export async function signInWithGoogle() {
  if (Platform.OS === 'web') {
    return signInWithGoogleBrowserRedirect();
  }

  // Google OAuth cannot complete inside Expo Go: the native SDK isn't bundled
  // there, and the browser-redirect fallback is rejected by Google because
  // there is no valid redirect URI (the Expo auth proxy has been retired). A
  // development build is the only supported path on device.
  if (isExpoGo) {
    throw new Error(
      'Google sign-in needs a development build — it can’t run in Expo Go. ' +
        'Run “npx expo run:ios” (or install an EAS dev build) and open the app from there.',
    );
  }

  const GoogleSignin = getGoogleSignin();

  // Clear any cached Google session so we always get a fresh ID token.
  try {
    await GoogleSignin.signOut();
  } catch {}

  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();

  const idToken = response.data?.idToken;
  if (!idToken) {
    throw new Error('Google sign-in failed — no ID token returned.');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });

  if (error) throw error;
  return data;
}

// Real web platform (expo start --web): full-page redirect OAuth via Supabase.
// The Supabase client exchanges the PKCE code on the callback URL automatically
// (detectSessionInUrl is enabled on web).
async function signInWithGoogleBrowserRedirect() {
  const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: redirectTo ? { redirectTo } : undefined,
  });
  if (error) throw error;
  return null;
}

// ── Apple ───────────────────────────────────────────────────

export function appleAuthAvailable(): boolean {
  return Platform.OS === 'ios';
}

export async function signInWithApple() {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('Apple sign-in failed — no identity token returned.');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });

  if (error) throw error;

  // Apple only sends the name on the FIRST sign-in — persist it to the profile.
  if (credential.fullName?.givenName) {
    const fullName = [credential.fullName.givenName, credential.fullName.familyName]
      .filter(Boolean)
      .join(' ');

    await supabase.from('profiles').update({ display_name: fullName }).eq('id', data.user.id);
  }

  return data;
}

// ── Sign out ────────────────────────────────────────────────

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
