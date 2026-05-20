import { View, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Image } from 'expo-image';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { Score } from '../../components/motion/Score';
import { EditorialHeadline } from '../../components/composite/EditorialHeadline';
import { StoryCard } from '../../components/composite/EditorialCard';

import { storyById, stories } from '../../data/fixtures/stories';
import { useTheme, space, SCREEN_PADDING } from '../../theme';
import { useWindowDimensions } from 'react-native';

function desat(uri: string): string {
  if (uri.includes('unsplash')) {
    const sep = uri.includes('?') ? '&' : '?';
    return `${uri}${sep}sat=-100&con=20`;
  }
  return uri;
}

export default function StoryPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { height } = useWindowDimensions();

  const story = storyById(id ?? '');
  if (!story) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
        <Txt>Not found.</Txt>
      </View>
    );
  }

  const heroH = height * 0.7;

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const heroStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(scrollY.value, [-100, 0, heroH], [1.1, 1.05, 1.0], Extrapolation.CLAMP) },
      { translateY: interpolate(scrollY.value, [0, heroH], [0, -heroH * 0.4], Extrapolation.CLAMP) },
    ],
    opacity: interpolate(scrollY.value, [0, heroH], [1, 0.5], Extrapolation.CLAMP),
  }));

  const related = stories.filter((s) => s.id !== story.id).slice(0, 3);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}
      >
        <View style={{ height: heroH, overflow: 'hidden', backgroundColor: colors.fog }}>
          <Animated.View style={[{ width: '100%', height: '100%' }, heroStyle]}>
            <Image
              source={{ uri: desat(story.heroImage) }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: heroH / 2,
                backgroundColor: 'transparent',
              }}
            />
          </Animated.View>
        </View>

        <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[7] }}>
          <MicroLabel>
            {story.tags.join(' · ')} · {story.readMinutes} MIN READ
          </MicroLabel>
          <EditorialHeadline
            text={story.headline}
            italicTokens={story.italicizeTokens}
            variant="display2"
            style={{ marginTop: space[4], fontSize: 44, lineHeight: 48 }}
          />
          <MicroLabel style={{ marginTop: space[6] }}>
            {story.byline} · {story.readMinutes} MIN READ
          </MicroLabel>
        </View>

        <HairlineRule style={{ marginTop: space[7], marginHorizontal: SCREEN_PADDING }} />

        <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[6] }}>
          {story.body.map((block, i) => {
            if (block.type === 'paragraph') {
              return (
                <Txt
                  key={i}
                  variant="bodyLg"
                  style={{ marginBottom: space[5], fontSize: 17, lineHeight: 28 }}
                >
                  {block.text}
                </Txt>
              );
            }
            if (block.type === 'heading') {
              return (
                <Txt key={i} variant="display4" style={{ marginTop: space[5], marginBottom: space[4] }}>
                  {block.text}
                </Txt>
              );
            }
            if (block.type === 'quote') {
              return (
                <View key={i} style={{ marginVertical: space[6] }}>
                  <HairlineRule />
                  <View style={{ paddingVertical: space[6] }}>
                    <Txt variant="display4" italic style={{ fontFamily: 'InstrumentSerifItalic', fontSize: 30, lineHeight: 36 }}>
                      “{block.text}”
                    </Txt>
                    <MicroLabel style={{ marginTop: space[4] }}>— {block.by}</MicroLabel>
                  </View>
                  <HairlineRule />
                </View>
              );
            }
            if (block.type === 'stat') {
              return (
                <View
                  key={i}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.ink,
                    paddingHorizontal: space[5],
                    paddingVertical: space[6],
                    marginVertical: space[5],
                    alignItems: 'flex-start',
                  }}
                >
                  <Score value={block.value} size="xl" />
                  <MicroLabel style={{ marginTop: space[3] }}>{block.label}</MicroLabel>
                </View>
              );
            }
            return null;
          })}
        </View>

        <HairlineRule style={{ marginVertical: space[7] }} />

        <View style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space[3] }}>
          <MicroLabel>MORE FROM MARGIN</MicroLabel>
        </View>

        {related.map((s, i) => (
          <View key={s.id}>
            <StoryCard story={s} />
            {i < related.length - 1 && <HairlineRule />}
          </View>
        ))}
      </Animated.ScrollView>

      <Pressable
        onPress={() => router.back()}
        style={{
          position: 'absolute',
          top: insets.top + space[3],
          right: space[5],
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: colors.paper,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: colors.fog,
        }}
        hitSlop={8}
      >
        <X size={18} color={colors.ink} strokeWidth={1.25} />
      </Pressable>
    </View>
  );
}
