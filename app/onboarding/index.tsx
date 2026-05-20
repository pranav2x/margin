import { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { Avatar } from '../../components/primitives/Avatar';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { PrimaryButton } from '../../components/primitives/PrimaryButton';
import { useUserStore } from '../../state/user';
import { athletes } from '../../data/fixtures/athletes';
import { useTheme, space, SCREEN_PADDING } from '../../theme';
import type { Sport } from '../../types';

const SPORTS: Sport[] = ['NBA', 'WNBA', 'NFL', 'MLB', 'NHL', 'SOCCER', 'CFB', 'F1'];

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const setSports = useUserStore((s) => s.setSports);
  const follow = useUserStore((s) => s.follow);
  const unfollow = useUserStore((s) => s.unfollow);
  const followingAthletes = useUserStore((s) => s.followingAthletes);

  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<Sport[]>(['NBA', 'WNBA']);

  const togglePicked = (s: Sport) => {
    Haptics.selectionAsync();
    setPicked((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
  };

  const next = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 1) setSports(picked);
    if (step < 2) setStep(step + 1);
    else router.replace('/(tabs)');
  };

  const skip = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
      {step === 0 && (
        <View style={{ flex: 1, paddingHorizontal: SCREEN_PADDING, justifyContent: 'center' }}>
          <Txt variant="display2" style={{ fontSize: 52, lineHeight: 56 }}>
            Welcome to{' '}
            <Txt
              variant="display2"
              italic
              style={{ fontFamily: 'InstrumentSerifItalic', fontSize: 52, lineHeight: 56 }}
            >
              MARGIN.
            </Txt>
          </Txt>
          <Txt variant="bodyLg" tone="ash" style={{ marginTop: space[6], fontSize: 17, lineHeight: 26 }}>
            A sports app for people who watch the game, then read about it.
          </Txt>

          <View style={{ position: 'absolute', left: SCREEN_PADDING, right: SCREEN_PADDING, bottom: insets.bottom + space[5] }}>
            <PrimaryButton label="CONTINUE" full onPress={next} />
          </View>
        </View>
      )}

      {step === 1 && (
        <View style={{ flex: 1, paddingHorizontal: SCREEN_PADDING, paddingTop: space[7] }}>
          <Txt variant="display3">Pick your sports.</Txt>
          <Txt variant="bodyLg" tone="ash" style={{ marginTop: space[3] }}>
            We’ll keep the feed honest about it.
          </Txt>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              marginTop: space[7],
              gap: space[3],
            }}
          >
            {SPORTS.map((s) => {
              const active = picked.includes(s);
              return (
                <Pressable
                  key={s}
                  onPress={() => togglePicked(s)}
                  style={{
                    paddingVertical: space[3],
                    paddingHorizontal: space[5],
                    borderWidth: 1,
                    borderColor: colors.ink,
                    backgroundColor: active ? colors.ink : 'transparent',
                  }}
                >
                  <Txt
                    variant="label"
                    style={{ color: active ? colors.paper : colors.ink, letterSpacing: 0.6 }}
                  >
                    {s}
                  </Txt>
                </Pressable>
              );
            })}
          </View>

          <View style={{ position: 'absolute', left: SCREEN_PADDING, right: SCREEN_PADDING, bottom: insets.bottom + space[5], flexDirection: 'row', gap: space[3] }}>
            <PrimaryButton label="BACK" variant="ghost" onPress={() => setStep(0)} style={{ flex: 1 }} />
            <PrimaryButton label="CONTINUE" onPress={next} style={{ flex: 1 }} />
          </View>
        </View>
      )}

      {step === 2 && (
        <View style={{ flex: 1 }}>
          <View
            style={{
              paddingHorizontal: SCREEN_PADDING,
              paddingTop: space[7],
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
            }}
          >
            <View>
              <Txt variant="display3">Pick your athletes.</Txt>
              <Txt variant="bodyLg" tone="ash" style={{ marginTop: space[3] }}>
                The story is the person.
              </Txt>
            </View>
            <Pressable onPress={skip} hitSlop={8}>
              <MicroLabel>SKIP</MicroLabel>
            </Pressable>
          </View>

          <HairlineRule style={{ marginTop: space[6] }} />

          <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                paddingHorizontal: SCREEN_PADDING - space[2],
                paddingTop: space[5],
              }}
            >
              {athletes.slice(0, 24).map((a) => {
                const active = followingAthletes.includes(a.id);
                return (
                  <Pressable
                    key={a.id}
                    onPress={() => {
                      Haptics.selectionAsync();
                      if (active) unfollow(a.id);
                      else follow(a.id);
                    }}
                    style={{
                      width: '33.33%',
                      paddingHorizontal: space[2],
                      paddingVertical: space[3],
                      alignItems: 'center',
                    }}
                  >
                    <View
                      style={{
                        opacity: active ? 1 : 0.55,
                        borderWidth: active ? 1 : 0,
                        borderColor: colors.ink,
                        padding: active ? 2 : 0,
                        borderRadius: 999,
                      }}
                    >
                      <Avatar uri={a.avatar} size={72} />
                    </View>
                    <Txt
                      variant="bodySm"
                      style={{ marginTop: space[3], textAlign: 'center' }}
                      numberOfLines={2}
                    >
                      {a.firstName} {a.lastName}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={{ position: 'absolute', left: SCREEN_PADDING, right: SCREEN_PADDING, bottom: insets.bottom + space[5] }}>
            <PrimaryButton label="DONE" full onPress={next} />
          </View>
        </View>
      )}
    </View>
  );
}
