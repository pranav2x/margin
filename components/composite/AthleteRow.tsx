import { View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Txt } from '../primitives/Text';
import { MicroLabel } from '../primitives/MicroLabel';
import { Avatar } from '../primitives/Avatar';
import { PressableScale } from '../primitives/PressableScale';
import { useTheme, space, SCREEN_PADDING } from '../../theme';
import type { Athlete } from '../../types';

interface Props {
  athlete: Athlete;
  context: string;
  timeAgo: string;
}

export function AthleteRow({ athlete, context, timeAgo }: Props) {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <PressableScale
      onPress={() => router.push(`/athlete/${athlete.id}` as never)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SCREEN_PADDING,
        paddingVertical: space[4],
      }}
      scale={0.99}
    >
      <Avatar uri={athlete.avatar} size={56} />
      <View style={{ flex: 1, marginLeft: space[4] }}>
        <Txt variant="display4" style={{ fontSize: 22, lineHeight: 26 }}>
          {athlete.firstName} {athlete.lastName}
        </Txt>
        <MicroLabel style={{ marginTop: space[1] }}>
          {athlete.sport} · {athlete.team.abbreviation} · #{athlete.jersey}
        </MicroLabel>
        <Txt variant="bodySm" tone="ash" style={{ marginTop: space[2] }}>
          {context} · {timeAgo}
        </Txt>
      </View>
      <ChevronRight size={18} color={colors.ash} strokeWidth={1.25} />
    </PressableScale>
  );
}
