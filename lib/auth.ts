/**
 * Sign-in helpers → Supabase.
 *
 *  - Email one-time code: pure API calls (signInWithOtp / verifyOtp). Works
 *    EVERYWHERE, including Expo Go — no native module and no OAuth redirect.
 *  - Google: expo-auth-session + expo-web-browser OAuth flow. We generate and
 *    control the nonce on both sides, so Supabase nonce verification succeeds.
 *    Only available in a development build, NOT Expo Go.
 *  - Apple: native Apple Authentication module (dev/standalone build).
 *  - Web: Supabase full-page browser-redirect OAuth.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { sha256 } from 'js-sha256';
import * as Linking from 'expo-linking';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';
import * as AppleAuthentication from 'expo-apple-authentication';

// Required by expo-auth-session on iOS to complete the auth session
WebBrowser.maybeCompleteAuthSession();

export const isExpoGo = Constants.appOwnership === 'expo';

function generateRawNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

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

// ── Google (native dev build via expo-auth-session) ──────────

// @react-native-google-signin/google-signin is kept here in case it is
// referenced elsewhere, but the main flow no longer uses it.
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

  if (isExpoGo) {
    throw new Error(
      "Google sign-in needs a development build — it can't run in Expo Go.",
    );
  }

  // Generate nonce — we control both sides so Supabase verification succeeds.
  const rawNonce = generateRawNonce();
  const hashedNonce = sha256(rawNonce);

  // Build the Google OAuth URL via Supabase (handles client_id, redirect, etc.)
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'margin' });

  const { data: oauthData, error: oauthError } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUri,
      skipBrowserRedirect: true,
      queryParams: {
        nonce: hashedNonce,
      },
    },
  });

  if (oauthError || !oauthData?.url) {
    throw oauthError ?? new Error('Failed to get Google OAuth URL');
  }

  const result = await WebBrowser.openAuthSessionAsync(oauthData.url, redirectUri);

  if (result.type !== 'success') {
    throw new Error('Google sign-in was cancelled or did not complete.');
  }

  // Use expo-linking to parse the redirect URL (works reliably with Hermes)
  const parsed = Linking.parse(result.url);
  const params = (parsed.queryParams ?? {}) as Record<string, string>;

  const accessToken = params['access_token'];
  const refreshToken = params['refresh_token'] ?? '';

  if (accessToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return data;
  }

  // PKCE flow: extract code and exchange it
  const code = params['code'];
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data;
  }

  throw new Error('Google sign-in: no session tokens in redirect URL.');
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
