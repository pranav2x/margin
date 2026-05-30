/**
 * Sign-in helpers → Supabase.
 *
 *  - Google: Supabase OAuth + PKCE. The provider URL opens in an in-app
 *    browser via expo-web-browser, redirects back to the app's deep-link
 *    scheme, and the auth code is exchanged for a session. Works in Expo Go
 *    via exp+margin:// and in dev/standalone builds via margin://.
 *  - Apple: native Apple Authentication module (dev/standalone build only).
 *  - Web: Supabase full-page browser-redirect OAuth.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

export const isExpoGo = Constants.appOwnership === 'expo';

// Required so the in-app browser closes when the OAuth callback URL arrives.
WebBrowser.maybeCompleteAuthSession();

// ── Google (OAuth + PKCE via in-app browser) ─────────────────

export async function signInWithGoogle() {
  if (Platform.OS === 'web') {
    return signInWithGoogleBrowserRedirect();
  }

  const redirectTo = AuthSession.makeRedirectUri(
    isExpoGo ? {} : { scheme: 'margin' },
  );

  const { data: oauthData, error: oauthError } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (oauthError) throw oauthError;
  if (!oauthData?.url) throw new Error('Failed to start Google sign-in.');

  const result = await WebBrowser.openAuthSessionAsync(oauthData.url, redirectTo);

  if (result.type !== 'success' || !result.url) {
    return null;
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(result.url);
  if (error) throw error;
  return data;
}

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
