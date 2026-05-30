import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { AppIcon } from '../../components/primitives/AppIcon';
import { useTheme, space, SCREEN_PADDING } from '../../theme';

const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: 'BE REAL',
    body: 'Report your own stats honestly. Elevate is built on trust between athletes — faking numbers ruins the board for everyone.',
  },
  {
    heading: 'NO OBJECTIONABLE CONTENT',
    body: 'No harassment, hate speech, threats, nudity, or abusive behavior of any kind. This applies to posts, names, and messages. There is zero tolerance.',
  },
  {
    heading: 'RESPECT OTHER ATHLETES',
    body: 'Compete hard, keep it friendly. Trash talk stops where cruelty begins. Treat younger and rival athletes the way you would want to be treated.',
  },
  {
    heading: 'REPORT WHAT YOU SEE',
    body: 'If you see content that breaks these rules, report it. Reports are reviewed and accounts that break the rules can be removed.',
  },
  {
    heading: 'NO MONEY, EVER',
    body: 'Elevate is for stats and friendly competition only. There is no betting, wagering, prizes, or money involved anywhere in the app.',
  },
];

export default function Rules() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
      <View
        style={{
          height: 56,
          paddingHorizontal: SCREEN_PADDING,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <MicroLabel>COMMUNITY RULES</MicroLabel>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <AppIcon name="X" size={22} tone="ink" />
        </Pressable>
      </View>

      <HairlineRule />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_PADDING,
          paddingTop: space[6],
          paddingBottom: insets.bottom + space[10],
        }}
      >
        <Txt variant="display4" weight="bold">
          The rules.
        </Txt>
        <Txt
          variant="body"
          tone="ash"
          style={{ marginTop: space[3] }}
        >
          Short version of how we keep Elevate worth being on.
        </Txt>

        <HairlineRule style={{ marginTop: space[6] }} />

        {SECTIONS.map((s, i) => (
          <View key={s.heading}>
            <View style={{ paddingVertical: space[6] }}>
              <MicroLabel tone="ink">{s.heading}</MicroLabel>
              <Txt
                variant="bodyLg"
                style={{ marginTop: space[3] }}
              >
                {s.body}
              </Txt>
            </View>
            {i < SECTIONS.length - 1 && <HairlineRule />}
          </View>
        ))}

        <View style={{ paddingVertical: space[10], alignItems: 'center' }}>
          <Txt variant="bodyLg" weight="semibold" tone="ash">
            Keep it clean.
          </Txt>
        </View>
      </ScrollView>
    </View>
  );
}
