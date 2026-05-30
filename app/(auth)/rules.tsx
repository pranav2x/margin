import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { useTheme, space, SCREEN_PADDING } from '../../theme';

const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: 'Be real',
    body: 'Report your own stats honestly. Elevate is built on trust between athletes — faking numbers ruins the board for everyone.',
  },
  {
    heading: 'No objectionable content',
    body: 'No harassment, hate speech, threats, nudity, or abusive behavior of any kind. This applies to posts, names, and messages. There is zero tolerance.',
  },
  {
    heading: 'Respect other athletes',
    body: 'Compete hard, keep it friendly. Trash talk stops where cruelty begins. Treat younger and rival athletes the way you would want to be treated.',
  },
  {
    heading: 'Report what you see',
    body: 'If you see content that breaks these rules, report it. Reports are reviewed and accounts that break the rules can be removed.',
  },
  {
    heading: 'No money, ever',
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
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <X size={22} color={colors.ink} strokeWidth={2} />
        </Pressable>
      </View>

      <HairlineRule />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: insets.bottom + space[10] }}
      >
        <Txt variant="display2" style={{ marginTop: space[7] }}>
          The{' '}
          <Txt variant="display2" weight="extrabold" tone="ember">
            rules.
          </Txt>
        </Txt>
        <Txt variant="bodyLg" tone="ash" style={{ marginTop: space[4], lineHeight: 26 }}>
          Short version of how we keep Elevate worth being on.
        </Txt>

        {SECTIONS.map((s, i) => (
          <View key={s.heading} style={{ marginTop: i === 0 ? space[8] : space[6] }}>
            <Txt variant="display4">
              {s.heading}
            </Txt>
            <Txt variant="bodyLg" tone="ash" style={{ marginTop: space[3], lineHeight: 26 }}>
              {s.body}
            </Txt>
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
