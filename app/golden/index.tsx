import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Txt } from '../../components/primitives/Text';
import { AppIcon } from '../../components/primitives/AppIcon';
import { useTheme, space, radius } from '../../theme';

/**
 * Golden index — entry point to the Phase 0 reference screens.
 */
export default function GoldenIndex() {
  const { colors } = useTheme();
  const router = useRouter();

  const links: Array<{ route: '/golden/boards' | '/golden/you'; label: string; sub: string }> = [
    { route: '/golden/boards', label: 'Boards (Leaderboard)',  sub: 'Populated, 25 athletes, current-user pinned' },
    { route: '/golden/you',    label: 'You (Profile)',          sub: 'Hero stats, recent log, school snippet' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={{ paddingHorizontal: space[5], paddingTop: space[5], paddingBottom: space[3] }}>
        <Txt variant="display3">Golden</Txt>
        <Txt variant="bodySm" tone="ash" style={{ marginTop: space[1] }}>
          Phase 0 reference screens. Locked tokens, populated data, real states.
        </Txt>
      </View>

      <View style={{ gap: space[2], paddingHorizontal: space[5] }}>
        {links.map((l) => (
          <Pressable
            key={l.route}
            onPress={() => router.push(l.route)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: space[3],
              padding: space[4],
              borderRadius: radius.lg,
              backgroundColor: pressed ? colors.overlay : colors.surface,
            })}
          >
            <View style={{ flex: 1 }}>
              <Txt variant="bodyLg" weight="semibold">{l.label}</Txt>
              <Txt variant="bodySm" tone="ash" style={{ marginTop: space[1] }}>{l.sub}</Txt>
            </View>
            <AppIcon name="ChevronRight" size={20} tone="ash" />
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}
