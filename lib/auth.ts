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

// ── Google ──────────────────────────────────────────────────

export async function signInWithGoogle() {
  // The native @react-native-google-signin module is not implemented on web
  // (web support is a paid sponsor feature), so never touch it there — use
  // Supabase's full-page browser-redirect OAuth flow instead.
  if (Platform.OS === 'web') {
    return signInWithGoogleBrowserRedirect();
  }

  // Expo Go can't load the native Google module, so fall back to a
  // browser-based Supabase OAuth flow there. Dev builds use the native flow.
  if (isExpoGo) {
    return signInWithGoogleWeb();
  }

  const GoogleSignin = getGoogleSignin();

  // Clear any cached Google session to ensure a fresh ID token.
  try { await GoogleSignin.signOut(); } catch {}

  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();

  if (!response.data?.idToken) {
    throw new Error('Google sign-in failed — no ID token returned.');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: response.data.idToken,
  });

  if (error) throw error;
  return data;
}

// Establishes a Supabase session from an OAuth redirect URL on native.
// Handles both the PKCE flow (?code=...) and the implicit flow
// (#access_token=...&refresh_token=...) so it is robust to either response.
export async function createSessionFromUrl(url: string) {
  const { queryParams } = Linking.parse(url);

  // Surface any provider/Supabase error returned in the redirect.
  const errDesc = (queryParams?.error_description ?? queryParams?.error) as
    | string
    | undefined;
  if (errDesc) throw new Error(errDesc);

  // PKCE flow — exchange the auth code for a session.
  const code = queryParams?.code as string | undefined;
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data;
  }

  // Implicit flow fallback — tokens arrive in the URL fragment.
  const hash = url.includes('#') ? url.slice(url.indexOf('#') + 1) : '';
  const fragment = new URLSearchParams(hash);
  const access_token =
    fragment.get('access_token') ?? (queryParams?.access_token as string | undefined);
  const refresh_token =
    fragment.get('refresh_token') ?? (queryParams?.refresh_token as string | undefined);

  if (access_token && refresh_token) {
    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) throw error;
    return data;
  }

  throw new Error('Google sign-in failed — no auth code or tokens in redirect.');
}

// Supabase GoTrue rejects any redirect URL whose host is a non-loopback IP
// address (only 127.0.0.1 / ::1 are allowed) and silently falls back to the
// Site URL — see supabase/auth IsRedirectURLValid. Expo Go on a physical device
// produces exp://<LAN-IP>:<port>/--/auth-callback, so the browser OAuth flow can
// NEVER complete there regardless of the Redirect URLs allow-list. A development
// build (custom scheme margin://) is the supported path.
function redirectHostIsNonLoopbackIp(redirectUrl: string): boolean {
  const match = redirectUrl.match(/^[a-zA-Z][\w+.-]*:\/\/([^/]+)/);
  if (!match) return false;
  const host = match[1].replace(/:\d+$/, ''); // strip :port
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]') {
    return false;
  }
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host); // bare IPv4 LAN host
}

// Browser-based Google OAuth via Supabase — used in Expo Go (PKCE flow).
async function signInWithGoogleWeb() {
  // expo-web-browser is bundled in Expo Go but may be absent from older dev
  // builds, so require it lazily — this path only runs in Expo Go anyway.
  const WebBrowser = require('expo-web-browser') as typeof import('expo-web-browser');

  // Resolves to exp://<lan-ip>:<port>/--/auth-callback in Expo Go and
  // margin://auth-callback in dev/standalone builds — no hardcoded IP/port.
  const redirectTo = Linking.createURL('auth-callback');

  // Fail fast on Expo Go over a LAN IP: Supabase rejects the redirect and
  // bounces to the Site URL (localhost), which iOS can't intercept. No
  // allow-list entry can fix this — a development build is required.
  if (redirectHostIsNonLoopbackIp(redirectTo)) {
    throw new Error(
      'Google sign-in is not supported in Expo Go on a physical device. Supabase ' +
        `rejects LAN-IP redirect URLs (${redirectTo}) and falls back to the Site URL, ` +
        'so the flow cannot complete. Run a development build instead — `npx expo run:ios` — ' +
        'which uses native Google Sign-In (no browser redirect).',
    );
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('Google sign-in failed — no OAuth URL returned.');

  // The in-app auth session auto-closes when the provider redirects back to our
  // app scheme and returns the final URL to us.
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === 'success' && result.url) {
    return createSessionFromUrl(result.url);
  }

  // Secondary path: in some Expo Go cases the redirect re-opens the app as an
  // OS deep link rather than resolving the auth session.
  const deepLink = await Linking.getInitialURL();
  if (deepLink && deepLink.includes('auth-callback')) {
    return createSessionFromUrl(deepLink);
  }

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error(
      'Google sign-in did not return to the app. If the browser showed a localhost ' +
        'error, Supabase redirected to its Site URL instead of the callback URL. The ' +
        'most reliable fix is a development build (`npx expo run:ios`), which uses native ' +
        'Google Sign-In and avoids the browser redirect entirely.',
    );
  }
  throw new Error('Google sign-in failed — no redirect received.');
}

// Real web platform (expo start --web): full-page redirect OAuth via Supabase.
// The browser navigates to Google and back; the returned PKCE code is exchanged
// automatically by the Supabase client (detectSessionInUrl is enabled on web).
async function signInWithGoogleBrowserRedirect() {
  const redirectTo =
    typeof window !== 'undefined' ? window.location.origin : undefined;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: redirectTo ? { redirectTo } : undefined,
  });
  if (error) throw error;

  // The page is navigating to Google's consent screen, so nothing meaningful
  // returns synchronously here.
  return null;
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

  // Apple only sends the name on the FIRST sign-in — persist it to the profile.
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
