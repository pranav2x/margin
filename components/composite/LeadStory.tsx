import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Txt } from '../primitives/Text';
import { MicroLabel } from '../primitives/MicroLabel';
import { GrayImage } from '../primitives/GrayImage';
import { PressableScale } from '../primitives/PressableScale';
import { EditorialHeadline } from './EditorialHeadline';
import { space, SCREEN_PADDING } from '../../theme';
import type { Story } from '../../types';

interface Props {
  story: Story;
}

export function LeadStory({ story }: Props) {
  const router = useRouter();

  return (
    <PressableScale onPress={() => router.push(`/story/${story.id}` as never)} scale={0.99}>
      <View style={{ width: '100%' }}>
        <View style={{ aspectRatio: 16 / 10, width: '100%' }}>
          <GrayImage uri={story.heroImage} style={{ flex: 1 }} />
        </View>
        <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[5], paddingBottom: space[3] }}>
          <MicroLabel style={{ marginBottom: space[3] }}>
            {story.tags.join(' · ')} · {story.readMinutes} MIN READ
          </MicroLabel>
          <EditorialHeadline
            text={story.headline}
            italicTokens={story.italicizeTokens}
            variant="display3"
          />
          <Txt variant="bodyLg" tone="ash" style={{ marginTop: space[4] }}>
            {story.deck}
          </Txt>
        </View>
      </View>
    </PressableScale>
  );
}
