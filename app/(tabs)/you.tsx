import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { MastheadBar } from '../../components/composite/MastheadBar';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { Avatar } from '../../components/primitives/Avatar';
import { Score } from '../../components/motion/Score';
import { PressableScale } from '../../components/primitives/PressableScale';

import { useUserStore } from '../../state/user';
import { useCallsStore } from '../../state/calls';
import { useTakesStore } from '../../state/takes';
import { usePreferencesStore } from '../../state/preferences';
import { athleteById } from '../../data/fixtures/athletes';
import { useTheme, space, SCREEN_PADDING } from '../../theme';

type SettingKey = 'notifications' | 'sports' | 'appearance' | 'signout';
const SETTINGS: { key: SettingKey; label: string }[] = [
  { key: 'notifications', label: 'Notifications' },
  { key: 'sports', label: 'Sport preferences' },
  { key: 'appearance', label: 'Appearance' },
  { key: 'signout', label: 'Sign out' },
];

function StatColumn({ value, label, last }: { value: string | number; label: string; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        paddingVertical: space[5],
        paddingHorizontal: space[3],
        borderRightWidth: last ? 0 : 1,
        borderRightColor: colors.fog,
        alignItems: 'flex-start',
      }}
    >
      <Score value={value} size="lg" />
      <MicroLabel style={{ marginTop: space[3] }}>{label}</MicroLabel>
    </View>
  );
}

export default function YouScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const router = useRouter();
  const user = useUserStore();
  const record = useCallsStore((s) => s.record);
  const takes = useTakesStore((s) => s.takes);
  const themePref = usePreferencesStore((s) => s.themePreference);
  const setThemePref = usePreferencesStore((s) => s.setThemePreference);

  const cycleTheme = () => {
    Haptics.selectionAsync();
    setThemePref(themePref === 'system' ? 'light' : themePref === 'light' ? 'dark' : 'system');
  };

  const followed = user.followingAthletes
    .map((id) => athleteById(id))
    .filter((a): a is NonNullable<typeof a> => !!a);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
      <MastheadBar title="MARGIN" showDate={false} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
      >
        <View style={{ alignItems: 'flex-start', paddingHorizontal: SCREEN_PADDING, paddingTop: space[7] }}>
          <Avatar uri={user.avatar} size={96} />
          <Txt variant="display3" style={{ marginTop: space[5] }}>
            {user.displayName}
          </Txt>
          <Txt
            variant="bodySm"
            tone="ash"
            style={{ marginTop: space[1], fontFamily: 'GeistMono' }}
          >
            @{user.handle}
          </Txt>
        </View>

        <View style={{ flexDirection: 'row', marginTop: space[7], paddingHorizontal: SCREEN_PADDING }}>
          <StatColumn
            value={`${record.wins}–${record.losses}`}
            label="PICKS"
          />
          <StatColumn
            value={takes.filter((t) => t.author.handle === user.handle).length}
            label="TAKES"
          />
          <StatColumn
            value={user.followingAthletes.length}
            label="FOLLOWING"
            last
          />
        </View>

        <HairlineRule style={{ marginTop: space[3] }} />

        <View style={{ paddingHorizontal: SCREEN_PADDING, paddingVertical: space[6] }}>
          <MicroLabel>FOLLOWED ATHLETES</MicroLabel>
        </View>

        <View
          style={{
            paddingHorizontal: SCREEN_PADDING - space[2],
            flexDirection: 'row',
            flexWrap: 'wrap',
          }}
        >
          {followed.map((a) => (
            <PressableScale
              key={a.id}
              onPress={() => router.push(`/athlete/${a.id}` as never)}
              onLongPress={() => useUserStore.getState().unfollow(a.id)}
              style={{ width: '33.33%', alignItems: 'center', paddingVertical: space[3], paddingHorizontal: space[2] }}
            >
              <Avatar uri={a.avatar} size={72} />
              <Txt
                variant="bodySm"
                style={{ marginTop: space[3], textAlign: 'center' }}
                numberOfLines={2}
              >
                {a.firstName} {a.lastName}
              </Txt>
              <MicroLabel style={{ marginTop: space[1] }}>
                {a.team.abbreviation}
              </MicroLabel>
            </PressableScale>
          ))}
        </View>

        <HairlineRule style={{ marginTop: space[7] }} />

        <View style={{ paddingHorizontal: SCREEN_PADDING, paddingVertical: space[6] }}>
          <MicroLabel>SETTINGS</MicroLabel>
        </View>

        {SETTINGS.map((s, i) => {
          const trailing =
            s.key === 'appearance' ? (
              <Txt variant="bodySm" tone="ash" italic style={{ fontFamily: 'InstrumentSerifItalic' }}>
                {themePref}
              </Txt>
            ) : (
              <ChevronRight size={18} color={colors.ash} strokeWidth={1.25} />
            );
          return (
            <View key={s.key}>
              <Pressable
                onPress={s.key === 'appearance' ? cycleTheme : undefined}
                style={{
                  paddingHorizontal: SCREEN_PADDING,
                  paddingVertical: space[5],
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Txt variant="bodyLg">{s.label}</Txt>
                {trailing}
              </Pressable>
              {i < SETTINGS.length - 1 && <HairlineRule />}
            </View>
          );
        })}

        <HairlineRule />

        <View style={{ paddingVertical: space[10], alignItems: 'center' }}>
          <Txt
            variant="display4"
            italic
            tone="ash"
            style={{ fontSize: 18, fontFamily: 'InstrumentSerifItalic' }}
          >
            MARGIN · v1.0
          </Txt>
        </View>
      </ScrollView>
    </View>
  );
}
