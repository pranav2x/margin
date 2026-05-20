import { View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Polyline } from 'react-native-svg';
import { Txt } from '../primitives/Text';
import { MicroLabel } from '../primitives/MicroLabel';
import { GrayImage } from '../primitives/GrayImage';
import { PressableScale } from '../primitives/PressableScale';
import { Score } from '../motion/Score';
import { EditorialHeadline } from './EditorialHeadline';
import { useTheme, space, SCREEN_PADDING } from '../../theme';
import type { Story } from '../../types';

interface QuoteProps {
  text: string;
  by: string;
  inverted?: boolean;
}

export function QuoteCard({ text, by, inverted }: QuoteProps) {
  return (
    <View style={{ paddingHorizontal: SCREEN_PADDING, paddingVertical: space[7] }}>
      <Txt variant="display4" italic inverted={inverted}>
        “{text}”
      </Txt>
      <MicroLabel inverted={inverted} style={{ marginTop: space[5] }}>
        — {by}
      </MicroLabel>
    </View>
  );
}

interface StatProps {
  value: string | number;
  label: string;
  trend?: number[];
  inverted?: boolean;
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 120;
  const h = 36;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <Svg width={w} height={h}>
      <Polyline points={pts} stroke={color} strokeWidth={1} fill="none" />
    </Svg>
  );
}

export function StatCard({ value, label, trend, inverted }: StatProps) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: SCREEN_PADDING,
        paddingVertical: space[6],
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <View>
          <Score value={value} size="xl" inverted={inverted} />
          <MicroLabel inverted={inverted} style={{ marginTop: space[3] }}>
            {label}
          </MicroLabel>
        </View>
        {trend && (
          <View style={{ marginBottom: space[3] }}>
            <Sparkline data={trend} color={inverted ? colors.paper : colors.ink} />
          </View>
        )}
      </View>
    </View>
  );
}

interface StoryCardProps {
  story: Story;
}

export function StoryCard({ story }: StoryCardProps) {
  const router = useRouter();

  return (
    <PressableScale onPress={() => router.push(`/story/${story.id}` as never)}>
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: SCREEN_PADDING,
          paddingVertical: space[5],
          alignItems: 'center',
        }}
      >
        <View style={{ flex: 1, marginRight: space[4] }}>
          <MicroLabel style={{ marginBottom: space[3] }}>
            {story.tags.join(' · ')} · {story.readMinutes} MIN
          </MicroLabel>
          <EditorialHeadline
            text={story.headline}
            italicTokens={story.italicizeTokens}
            variant="display4"
            style={{ fontSize: 24, lineHeight: 28 }}
          />
          <Txt variant="bodySm" tone="ash" style={{ marginTop: space[3] }}>
            {story.byline}
          </Txt>
        </View>
        <View style={{ width: 96, aspectRatio: 1 }}>
          <GrayImage uri={story.heroImage} style={{ flex: 1 }} />
        </View>
      </View>
    </PressableScale>
  );
}
