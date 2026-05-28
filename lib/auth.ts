/**
 * Native Apple + Google OAuth → Supabase ID-token auth.
 *
 * NOTE: expo-apple-authentication and @react-native-google-signin/google-signin
 * are native modules — the app requires a development build
 * (npx expo run:ios / EAS dev client), NOT Expo Go.
 */

import { Platform } from 'react-native';
import { sha256 } from 'js-sha256';
import { supabase } from './supabase';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// ── Nonce (pure JS — no native module) ─────────────────────

function generateRawNonce(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ── Google ──────────────────────────────────────────────────

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

export async function signInWithGoogle() {
  // Clear any cached Google session to ensure a fresh ID token
  try { await GoogleSignin.signOut(); } catch {}

  const rawNonce = generateRawNonce();
  const hashedNonce = sha256(rawNonce);

  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn({ nonce: hashedNonce });

  if (!response.data?.idToken) {
    throw new Error('Google sign-in failed — no ID token returned.');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: response.data.idToken,
    nonce: rawNonce,
  });

  if (error) throw error;
  return data;
}

// ── Apple ───────────────────────────────────────────────────

export function appleAuthAvailable(): boolean {
  return Platform.OS === 'ios' && AppleAuthentication.isAvailableAsync !== undefined;
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

  // Apple only sends the name on the FIRST sign-in — persist it to the profile
  if (credential.fullName?.givenName) {
    const fullName = [credential.fullName.givenName, credential.fullName.familyName]
      .filter(Boolean)
      .join(' ');

    await supabase
      .from('profiles')
      .update({ display_name: fullName })
      .eq('id', data.user.id);
  }

  return data;
}

// ── Sign out ────────────────────────────────────────────────

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
