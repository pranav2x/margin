import { View, Pressable } from 'react-native';
import { Txt } from '../primitives/Text';
import { MicroLabel } from '../primitives/MicroLabel';
import { Avatar } from '../primitives/Avatar';
import { HairlineRule } from '../primitives/HairlineRule';
import { Score } from '../motion/Score';
import { space, SCREEN_PADDING } from '../../theme';
import { timeAgo } from '../../lib/utils/format';
import type { Take } from '../../types';
import { useTakesStore } from '../../state/takes';
import * as Haptics from 'expo-haptics';

interface Props {
  take: Take;
}

const ACTIONS = [
  { key: 'respond', label: 'RESPOND' },
  { key: 'cosign', label: 'CO-SIGN' },
  { key: 'dispute', label: 'DISPUTE' },
] as const;

export function TakeCard({ take }: Props) {
  const react = useTakesStore((s) => s.react);

  const isLongForm = take.body.length > 140;

  return (
    <View style={{ paddingHorizontal: SCREEN_PADDING, paddingVertical: space[5] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space[4] }}>
        <Avatar uri={take.author.avatar} size={40} />
        <View style={{ marginLeft: space[3], flex: 1 }}>
          <Txt variant="bodySm" style={{ fontFamily: 'GeistMedium' }}>
            {take.author.displayName}
          </Txt>
          <MicroLabel>
            @{take.author.handle} · {timeAgo(take.createdAt)}
            {take.topic ? ` · ${take.topic}` : ''}
          </MicroLabel>
        </View>
      </View>

      {isLongForm ? (
        <Txt variant="bodyLg">{take.body}</Txt>
      ) : (
        <Txt variant="display4" italic={false} style={{ fontSize: 24, lineHeight: 30 }}>
          {take.body}
        </Txt>
      )}

      <View style={{ marginTop: space[5] }}>
        <HairlineRule />
        <View style={{ flexDirection: 'row', marginTop: space[3] }}>
          {ACTIONS.map((a, i) => {
            const active = take.myReaction === a.key;
            const count = take.counts[a.key];
            return (
              <Pressable
                key={a.key}
                onPress={() => {
                  Haptics.selectionAsync();
                  react(take.id, a.key);
                }}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: i === 0 ? 'flex-start' : i === ACTIONS.length - 1 ? 'flex-end' : 'center',
                  paddingVertical: space[2],
                }}
              >
                <MicroLabel tone={active ? 'ink' : 'ash'}>{a.label}</MicroLabel>
                <Score
                  value={count}
                  size="sm"
                  tone={active ? 'ink' : 'ash'}
                  style={{ marginLeft: space[2] }}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
