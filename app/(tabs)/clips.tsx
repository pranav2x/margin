import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  FlatList,
  Pressable,
  Dimensions,
  StyleSheet,
  type ViewToken,
  type ListRenderItemInfo,
} from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from '../../components/primitives/Text';
import { Avatar } from '../../components/primitives/Avatar';
import { AppIcon } from '../../components/primitives/AppIcon';
// NOTE: clips screens are dark-by-default regardless of theme preference (videos
// look better on black). We reach for `darkColors` directly so the chrome stays
// stable when the user is in light mode. This is the documented one-off
// exception to "always go through useTheme()".
import { darkColors } from '../../theme/colors';
import { space } from '../../theme';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Documented exception: chrome over video needs a translucent black backdrop
// for legibility. There is no token for "35% black scrim" in /theme/colors —
// adding one would force an alpha vocabulary on every other surface. Keep it
// here, named so the intent is obvious.
const SCRIM_BACKDROP = 'rgba(0,0,0,0.35)';

// TODO(supabase): replace with useClipsFeed() hook — pulls clips, pagination,
// like/comment counts, viewer's like state, etc. The mock shape below mirrors
// the eventual row shape so swap-in should be cheap.
export interface ClipItem {
  id: string;
  videoUrl: string | null;
  posterUrl: string;
  author: {
    handle: string;
    avatar: string;
  };
  caption: string;
  likes: number;
  comments: number;
  shares: number;
}

export const MOCK_CLIPS: ClipItem[] = [
  {
    id: 'c1',
    videoUrl: null,
    posterUrl:
      'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1080&q=80',
    author: {
      handle: 'jay.guard',
      avatar:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80',
    },
    caption: 'cooked the help D off a simple shake. floor was a little slick.',
    likes: 1284,
    comments: 92,
    shares: 41,
  },
  {
    id: 'c2',
    videoUrl: null,
    posterUrl:
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1080&q=80',
    author: {
      handle: 'mariah_b',
      avatar:
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80',
    },
    caption: 'pull-up from the logo. cold open against state finalists.',
    likes: 5621,
    comments: 312,
    shares: 188,
  },
  {
    id: 'c3',
    videoUrl: null,
    posterUrl:
      'https://images.unsplash.com/photo-1552667466-07770ae110d0?w=1080&q=80',
    author: {
      handle: 'tre.5',
      avatar:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
    },
    caption: 'pick six. read his eyes the whole way in.',
    likes: 832,
    comments: 47,
    shares: 19,
  },
  {
    id: 'c4',
    videoUrl: null,
    posterUrl:
      'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1080&q=80',
    author: {
      handle: 'kenzo.lift',
      avatar:
        'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=200&q=80',
    },
    caption: 'PR squat. left a rep in the tank tbh.',
    likes: 412,
    comments: 28,
    shares: 6,
  },
  {
    id: 'c5',
    videoUrl: null,
    posterUrl:
      'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1080&q=80',
    author: {
      handle: 'rae.runs',
      avatar:
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80',
    },
    caption: '4x400 anchor. caught two on the back stretch.',
    likes: 1899,
    comments: 71,
    shares: 33,
  },
];

type FeedTab = 'following' | 'foryou';

export default function ClipsTab() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<FeedTab>('foryou');
  const [activeId, setActiveId] = useState<string>(MOCK_CLIPS[0]?.id ?? '');

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.item) {
        const item = first.item as ClipItem;
        setActiveId(item.id);
      }
    }
  ).current;

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ClipItem>) => (
      <ClipSlide
        clip={item}
        active={item.id === activeId}
        bottomInset={insets.bottom}
      />
    ),
    [activeId, insets.bottom]
  );

  return (
    <View style={{ flex: 1, backgroundColor: darkColors.paper }}>
      {/* SafeArea top only — overlay top bar sits below the notch. */}
      <FlatList
        data={MOCK_CLIPS}
        keyExtractor={(c) => c.id}
        renderItem={renderItem}
        pagingEnabled
        snapToInterval={SCREEN_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        getItemLayout={(_, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
        // Bounces look bad on a paginating feed; matches TikTok / Reels.
        bounces={false}
        overScrollMode="never"
      />

      {/* Top tab pills (Following / For You). Floats above the video. */}
      <View
        pointerEvents="box-none"
        style={[styles.topBar, { top: insets.top + space[2] }]}
      >
        <Pressable
          onPress={() => setActiveTab('following')}
          accessibilityRole="button"
          accessibilityLabel="Following feed"
          hitSlop={8}
          style={{ paddingHorizontal: space[3] }}
        >
          <Txt
            variant="bodyLg"
            weight={activeTab === 'following' ? 'bold' : 'medium'}
            style={{
              color:
                activeTab === 'following' ? darkColors.ink : darkColors.ash,
            }}
          >
            Following
          </Txt>
        </Pressable>
        <View
          style={{
            width: 1,
            height: 14,
            backgroundColor: darkColors.ash,
            opacity: 0.5,
          }}
        />
        <Pressable
          onPress={() => setActiveTab('foryou')}
          accessibilityRole="button"
          accessibilityLabel="For You feed"
          hitSlop={8}
          style={{ paddingHorizontal: space[3] }}
        >
          <Txt
            variant="bodyLg"
            weight={activeTab === 'foryou' ? 'bold' : 'medium'}
            style={{
              color: activeTab === 'foryou' ? darkColors.ink : darkColors.ash,
            }}
          >
            For You
          </Txt>
        </Pressable>
      </View>
    </View>
  );
}

interface ClipSlideProps {
  clip: ClipItem;
  active: boolean;
  bottomInset: number;
}

/**
 * One full-screen clip slide. Rendered N times by the paginating FlatList.
 * Each slide owns its own VideoPlayer instance so playback state is isolated.
 */
function ClipSlide({ clip, active, bottomInset }: ClipSlideProps) {
  const [liked, setLiked] = useState(false);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);

  // Local count so taps feel responsive. TODO(supabase): wire to optimistic
  // mutation that posts a like row + counter trigger update.
  const [likeCount, setLikeCount] = useState(clip.likes);

  // TODO(supabase): replace clip.videoUrl with the signed playback URL coming
  // from the clips bucket. For now mock data has videoUrl = null, so the
  // player is initialized with an empty source and the poster + Play overlay
  // is shown instead. Hook MUST be called unconditionally — that's why we
  // pass `''` rather than wrapping in try/catch (hooks rules).
  const player = useVideoPlayer(clip.videoUrl ?? '', (p) => {
    p.loop = true;
    p.muted = true;
  });
  const videoReady = !!clip.videoUrl;

  // Pause / resume based on which slide is in view + user-toggled pause.
  useEffect(() => {
    if (!videoReady) return;
    try {
      if (active && !paused) player.play();
      else player.pause();
      player.muted = muted;
    } catch {
      // Player teardown / null source — safe to ignore.
    }
  }, [active, paused, muted, player, videoReady]);

  const handleLikeToggle = () => {
    setLiked((prev) => {
      const next = !prev;
      setLikeCount((c) => c + (next ? 1 : -1));
      return next;
    });
  };

  // Overlay bottom offset accounts for the floating tab bar (~64 + bottom inset).
  const TAB_BAR_OVERLAP = 64 + Math.max(bottomInset, space[3]);

  return (
    <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}>
      {/* Video layer (or poster fallback) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={paused ? 'Resume clip' : 'Pause clip'}
        onPress={() => setPaused((p) => !p)}
        style={StyleSheet.absoluteFill}
      >
        {videoReady ? (
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
            allowsFullscreen={false}
            allowsPictureInPicture={false}
          />
        ) : null}
        {/* Poster always rendered behind video so first-frame swap is seamless. */}
        <Image
          source={{ uri: clip.posterUrl }}
          style={[
            StyleSheet.absoluteFill,
            { opacity: videoReady ? 0 : 1, backgroundColor: darkColors.paper },
          ]}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
        {/* Bottom-to-top gradient for overlay legibility (cheap two-layer scrim). */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: darkColors.void,
              opacity: 0.18,
            },
          ]}
        />
        {/* Center play indicator when paused OR when there's no real video. */}
        {paused || !videoReady ? (
          <View pointerEvents="none" style={styles.centerPlay}>
            <View style={styles.playPill}>
              <AppIcon name="Play" size={36} tone="paper" filled />
            </View>
          </View>
        ) : null}
      </Pressable>

      {/* Right rail — vertical actions */}
      <View
        pointerEvents="box-none"
        style={[
          styles.rightRail,
          { bottom: TAB_BAR_OVERLAP + space[5] },
        ]}
      >
        <RailAction
          icon="Heart"
          label={formatCount(likeCount)}
          active={liked}
          onPress={handleLikeToggle}
          accessibilityLabel={liked ? 'Unlike' : 'Like'}
        />
        <RailAction
          icon="MessageCircle"
          label={formatCount(clip.comments)}
          // TODO(supabase): open comments sheet
          onPress={() => undefined}
          accessibilityLabel="Comments"
        />
        <RailAction
          icon="Share2"
          label={formatCount(clip.shares)}
          // TODO(share): wire to Share.share / deep link to /clips/[id]
          onPress={() => undefined}
          accessibilityLabel="Share"
        />
        <RailAction
          icon="Bookmark"
          label="Save"
          // TODO(supabase): wire to saved_clips toggle
          onPress={() => undefined}
          accessibilityLabel="Save"
        />
        <RailAction
          icon={muted ? 'Pause' : 'Play'}
          label={muted ? 'Muted' : 'On'}
          onPress={() => setMuted((m) => !m)}
          accessibilityLabel={muted ? 'Unmute' : 'Mute'}
        />
      </View>

      {/* Bottom-left overlay — author + caption */}
      <View
        pointerEvents="box-none"
        style={[
          styles.bottomLeft,
          { bottom: TAB_BAR_OVERLAP + space[4] },
        ]}
      >
        {/*
          We don't use the AvatarMeta composite here because it reads the
          active theme tones for handle + meta. The overlay needs hardcoded
          dark-palette tones so it looks right in both light and dark mode.
        */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space[3],
          }}
        >
          <Avatar uri={clip.author.avatar} size={40} />
          <Txt
            variant="bodyLg"
            weight="semibold"
            numberOfLines={1}
            style={{ color: darkColors.ink, flexShrink: 1 }}
          >
            @{clip.author.handle}
          </Txt>
        </View>
        <Txt
          variant="bodyLg"
          weight="semibold"
          numberOfLines={2}
          style={{
            color: darkColors.ink,
            marginTop: space[3],
            // Don't let the caption run under the right rail.
            paddingRight: space[10],
          }}
        >
          {clip.caption}
        </Txt>
      </View>
    </View>
  );
}

interface RailActionProps {
  icon: 'Heart' | 'MessageCircle' | 'Share2' | 'Bookmark' | 'Play' | 'Pause';
  label: string;
  active?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}

function RailAction({
  icon,
  label,
  active,
  onPress,
  accessibilityLabel,
}: RailActionProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={{ alignItems: 'center', gap: space[1] }}
    >
      <AppIcon
        name={icon}
        size={30}
        tone={active ? 'ember' : 'paper'}
        filled={active}
      />
      <Txt
        variant="micro"
        style={{
          color: active ? darkColors.ember : darkColors.ink,
        }}
      >
        {label}
      </Txt>
    </Pressable>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const styles = StyleSheet.create({
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: space[2],
  },
  rightRail: {
    position: 'absolute',
    right: space[4],
    alignItems: 'center',
    gap: space[5],
  },
  bottomLeft: {
    position: 'absolute',
    left: space[5],
    right: space[5],
  },
  centerPlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPill: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: SCRIM_BACKDROP,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
