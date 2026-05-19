import { View, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Txt } from '../primitives/Text';
import { MicroLabel } from '../primitives/MicroLabel';
import { HairlineRule } from '../primitives/HairlineRule';
import { useTheme, space, SCREEN_PADDING, fonts } from '../../theme';
import type { Game } from '../../types';
import { formatGameTime } from '../../lib/utils/format';
import { useCallsStore } from '../../state/calls';

interface Props {
  game: Game;
}

function lockedTimeFormat(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `LOCKED ${time}`;
}

export function PickCard({ game }: Props) {
  const { colors } = useTheme();
  const filed = useCallsStore((s) => s.filed[game.id]);
  const fileCall = useCallsStore((s) => s.fileCall);

  const pick = (teamId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    fileCall(game.id, teamId);
  };

  const renderTeamButton = (teamId: string, teamName: string, record?: string) => {
    const isPicked = filed?.selection === teamId;
    const result = filed?.result;

    let stateNote = null;
    if (isPicked && result === 'win') {
      stateNote = (
        <Txt variant="display4" italic style={{ fontSize: 28, marginTop: space[1] }}>
          ✓
        </Txt>
      );
    } else if (isPicked && result === 'loss') {
      stateNote = (
        <Txt variant="display4" style={{ fontSize: 28, marginTop: space[1] }}>
          —
        </Txt>
      );
    }

    return (
      <Pressable
        onPress={() => pick(teamId)}
        disabled={!!filed}
        style={{
          flex: 1,
          paddingVertical: space[5],
          paddingHorizontal: space[4],
          alignItems: 'flex-start',
        }}
      >
        <Txt
          variant="display4"
          italic={isPicked}
          style={{
            fontSize: 22,
            lineHeight: 26,
            textDecorationLine: isPicked ? 'underline' : 'none',
            textDecorationStyle: 'solid',
          }}
        >
          {teamName}
        </Txt>
        {record && (
          <MicroLabel style={{ marginTop: space[2] }}>{record}</MicroLabel>
        )}
        {stateNote}
      </Pressable>
    );
  };

  return (
    <View>
      <View style={{ paddingHorizontal: SCREEN_PADDING, paddingVertical: space[5] }}>
        <MicroLabel>{formatGameTime(game.startTime)} · {game.sport}</MicroLabel>
        <Txt
          variant="display4"
          style={{ marginTop: space[3] }}
        >
          {game.away.team.name}{' '}
          <Txt
            variant="display4"
            italic
            style={{ fontFamily: fonts.serifItalic }}
          >
            vs.
          </Txt>{' '}
          {game.home.team.name}
        </Txt>
        {filed && (
          <MicroLabel style={{ marginTop: space[3] }}>
            {lockedTimeFormat(filed.filedAt)}
          </MicroLabel>
        )}
      </View>

      <HairlineRule />

      <View style={{ flexDirection: 'row', paddingHorizontal: SCREEN_PADDING - space[4] }}>
        {renderTeamButton(
          game.away.team.id,
          game.away.team.name,
          game.away.team.record,
        )}
        <View style={{ width: 1, backgroundColor: colors.fog, marginVertical: space[5] }} />
        {renderTeamButton(
          game.home.team.id,
          game.home.team.name,
          game.home.team.record,
        )}
      </View>

      <HairlineRule />
    </View>
  );
}
