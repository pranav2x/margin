/**
 * Native Apple + Google OAuth → Supabase ID-token auth.
 *
 * NOTE: expo-apple-authentication and @react-native-google-signin/google-signin
 * are native modules — the app requires a development build
 * (npx expo run:ios / EAS dev client), NOT Expo Go.
 */

import { Platform } from 'react-native';
import { supabase } from './supabase';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// ── [NONCE DEBUG] temporary diagnostics — REMOVE AFTER DEBUGGING ──
// Decodes a JWT's middle segment (base64url) → JSON. Never throws.
function __decodeJwtPayload(token: string): any {
  try {
    const seg = token.split('.')[1];
    if (!seg) return { __decodeError: 'no payload segment' };
    let b64 = seg.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4;
    if (pad) b64 += '='.repeat(4 - pad);
    const bin = typeof atob === 'function' ? atob(b64) : '';
    // handle UTF-8
    let json = bin;
    try { json = decodeURIComponent(escape(bin)); } catch {}
    return JSON.parse(json);
  } catch (e) {
    return { __decodeError: String(e) };
  }
}

// ── Google ──────────────────────────────────────────────────

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

export async function signInWithGoogle() {
  // Clear any cached Google session to ensure a fresh ID token
  try { await GoogleSignin.signOut(); } catch {}

  console.log('[NONCE DEBUG] ===== PROVIDER: GOOGLE path ran =====');

  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();

  if (!response.data?.idToken) {
    throw new Error('Google sign-in failed — no ID token returned.');
  }

  // [NONCE DEBUG] decode the returned ID token payload
  const __payload = __decodeJwtPayload(response.data.idToken);
  console.log('[NONCE DEBUG] FULL ID-TOKEN PAYLOAD:', JSON.stringify(__payload));
  console.log('[NONCE DEBUG] payload.nonce:', __payload?.nonce);
  console.log('[NONCE DEBUG] payload.aud:', __payload?.aud);
  console.log('[NONCE DEBUG] payload.iss:', __payload?.iss);

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: response.data.idToken,
  });

  if (error) {
    console.log('[NONCE DEBUG] signInWithIdToken (google) FULL ERROR:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    console.log('[NONCE DEBUG] error.message:', (error as any)?.message, '| error.code:', (error as any)?.code, '| error.status:', (error as any)?.status);
    throw error;
  }
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

  console.log('[NONCE DEBUG] ===== PROVIDER: APPLE path ran =====');
  console.log('[NONCE DEBUG] NOTE: Apple path generates NO rawNonce and sends NO nonce to signInWithIdToken.');

  if (!credential.identityToken) {
    throw new Error('Apple sign-in failed — no identity token returned.');
  }

  // [NONCE DEBUG] decode the returned identity token payload
  const __applePayload = __decodeJwtPayload(credential.identityToken);
  console.log('[NONCE DEBUG] FULL IDENTITY-TOKEN PAYLOAD:', JSON.stringify(__applePayload));
  console.log('[NONCE DEBUG] payload.nonce:', __applePayload?.nonce);
  console.log('[NONCE DEBUG] payload.aud:', __applePayload?.aud);
  console.log('[NONCE DEBUG] payload.iss:', __applePayload?.iss);

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });

  if (error) {
    console.log('[NONCE DEBUG] signInWithIdToken (apple) FULL ERROR:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    console.log('[NONCE DEBUG] error.message:', (error as any)?.message, '| error.code:', (error as any)?.code, '| error.status:', (error as any)?.status);
    throw error;
  }

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
