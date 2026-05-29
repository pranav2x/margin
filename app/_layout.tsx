import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { View, ActivityIndicator } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';
import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
} from '@expo-google-fonts/geist';
import {
  GeistMono_400Regular,
  GeistMono_500Medium,
} from '@expo-google-fonts/geist-mono';

import * as Linking from 'expo-linking';

import { useTheme } from '../theme';
import { supabase } from '../lib/supabase';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    InstrumentSerif: InstrumentSerif_400Regular,
    InstrumentSerifItalic: InstrumentSerif_400Regular_Italic,
    Geist: Geist_400Regular,
    GeistMedium: Geist_500Medium,
    GeistSemibold: Geist_600SemiBold,
    GeistMono: GeistMono_400Regular,
    GeistMonoMedium: GeistMono_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemedRoot />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

interface AuthGate {
  birth_year: number | null;
  eula_accepted_at: string | null;
  onboarded: boolean;
}

function ThemedRoot() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const segments = useSegments();

  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Subscribe to auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle OAuth deep link redirects — Google sign-in returns here via
  // exp+margin:// (Expo Go) or margin:// (dev build) after browser completes.
  useEffect(() => {
    const linkingSub = Linking.addEventListener('url', async ({ url }) => {
      if (!url) return;
      if (url.includes('code=')) {
        await supabase.auth.exchangeCodeForSession(url);
      }
    });
    return () => linkingSub.remove();
  }, []);

  // Gate state lives in react-query so the gate screens can invalidate it after
  // writing (age, EULA), and the guard below re-runs against fresh data.
  const userId = session?.user?.id;
  const { data: gate, isLoading: gateLoading } = useQuery({
    queryKey: ['auth-gate', userId],
    enabled: !!userId,
    queryFn: async (): Promise<AuthGate | null> => {
      const { data } = await supabase
        .from('profiles')
        .select('birth_year, eula_accepted_at, onboarded')
        .eq('id', userId!)
        .maybeSingle();
      return (data as AuthGate) ?? null;
    },
  });

  const loading = !authReady || (!!session && gateLoading);

  // Route guard — enforces gate order: sign-in -> age gate -> EULA -> onboarding -> tabs.
  useEffect(() => {
    if (loading) return;

    const seg0 = segments[0];
    const seg1 = segments[1];
    const inAuthGroup = seg0 === '(auth)';

    if (!session) {
      if (!inAuthGroup) router.replace('/(auth)/sign-in');
      return;
    }

    const needsAge = !gate || gate.birth_year == null;
    const needsEula = !needsAge && gate!.eula_accepted_at == null;
    const needsOnboard = !needsAge && !needsEula && !gate!.onboarded;

    if (needsAge) {
      if (!(inAuthGroup && seg1 === 'age-gate')) router.replace('/(auth)/age-gate');
    } else if (needsEula) {
      if (!(inAuthGroup && (seg1 === 'eula' || seg1 === 'rules'))) router.replace('/(auth)/eula');
    } else if (needsOnboard) {
      if (seg0 !== 'onboarding') router.replace('/onboarding');
    } else if (inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, gate, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        initialRouteName="(tabs)"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.paper },
          animation: 'slide_from_bottom',
          animationDuration: 320,
        }}
      >
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="athlete/[id]"
          options={{ animation: 'slide_from_bottom', presentation: 'card' }}
        />
        <Stack.Screen
          name="player/[id]"
          options={{ animation: 'slide_from_bottom', presentation: 'card' }}
        />
        <Stack.Screen name="onboarding/index" options={{ animation: 'fade' }} />
        <Stack.Screen name="splash" options={{ animation: 'fade' }} />
      </Stack>
    </View>
  );
}
