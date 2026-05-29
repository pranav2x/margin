/**
 * Native Apple + Google OAuth → Supabase ID-token auth.
 *
 * NOTE: expo-apple-authentication and @react-native-google-signin/google-signin
 * are native modules — the app requires a development build
 * (npx expo run:ios / EAS dev client), NOT Expo Go.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';
import * as AppleAuthentication from 'expo-apple-authentication';

// @react-native-google-signin/google-signin is a native module that is NOT
// present in Expo Go. Importing it at module load crashes Expo Go, so we load
// it lazily and only configure it once, the first time Google sign-in is used.
const isExpoGo = Constants.appOwnership === 'expo';

let _googleSignin: typeof import('@react-native-google-signin/google-signin').GoogleSignin | null = null;

function getGoogleSignin() {
  if (isExpoGo) {
    throw new Error(
      'Google sign-in requires a development build (npx expo run:ios). It is not available in Expo Go.'
    );
  }
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

export async function signInWithGoogle() {
  // Expo Go can't load the native Google module, so fall back to a
  // browser-based Supabase OAuth flow there. Dev builds use the native flow.
  if (isExpoGo) {
    return signInWithGoogleWeb();
  }

  const GoogleSignin = getGoogleSignin();

  // Clear any cached Google session to ensure a fresh ID token
  try { await GoogleSignin.signOut(); } catch {}

  console.log('[NONCE DEBUG] ===== PROVIDER: GOOGLE path ran =====');

  await GoogleSignin.hasPlayServices();
  console.log('[NONCE DEBUG] signIn args ->', 'none');
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

// Browser-based Google OAuth via Supabase — works in Expo Go (PKCE flow).
async function signInWithGoogleWeb() {
  // expo-web-browser is bundled in Expo Go but may be absent from older dev
  // builds, so require it lazily — this path only runs in Expo Go anyway.
  const WebBrowser = require('expo-web-browser') as typeof import('expo-web-browser');

  const redirectTo = Linking.createURL('auth-callback');
  console.log('[GOOGLE OAUTH] redirectTo (add this to Supabase → Redirect URLs):', redirectTo);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('Google sign-in failed — no OAuth URL returned.');

  console.log('[GOOGLE OAUTH] full authorize url:', data.url);

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error('Google sign-in was cancelled.');
  }
  if (result.type !== 'success' || !result.url) {
    throw new Error('Google sign-in failed — no redirect received.');
  }

  const { queryParams } = Linking.parse(result.url);
  const code = queryParams?.code as string | undefined;
  if (!code) {
    const errDesc = (queryParams?.error_description ?? queryParams?.error) as string | undefined;
    throw new Error(errDesc ?? 'Google sign-in failed — no auth code in redirect.');
  }

  const { data: sessionData, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
  return sessionData;
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
