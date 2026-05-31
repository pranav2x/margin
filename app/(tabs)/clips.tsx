import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  FlatList,
  Pressable,
  Dimensions,
  StyleSheet,
  Alert,
  type ViewToken,
  type ListRenderItemInfo,
} from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { Txt } from '../../components/primitives/Text';
import { Avatar } from '../../components/primitives/Avatar';
import { AppIcon, type IconName } from '../../components/primitives/AppIcon';
import { Skeleton } from '../../components/primitives/Skeleton';
import { EmptyState } from '../../components/composite/EmptyState';
import { useCreateSheetStore } from '../../state/createSheet';
// NOTE: clips screens are dark-by-default regardless of theme preference (videos
// look better on black). We reach for `darkColors` directly so the chrome stays
// stable when the user is in light mode. This is the documented one-off
// exception to "always go through useTheme()".
import { darkColors } from '../../theme/colors';
import { space, radius, icon } from '../../theme';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Media-overlay scrim — pulled from the palette so chrome over video stays
// legible without inlining an alpha string here. See colors.scrim.
const SCRIM_BACKDROP = darkColors.scrim;

// Right-rail action button — 44pt circular hit target per spec.
const RAIL_TAP_TARGET = 44;

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

// Feed-level fetch state. Until the supabase hook lands these are wired
// to fixed values, but the screen renders all three designed states.
type FeedState = 'ready' | 'loading' | 'empty' | 'error';

export default function ClipsTab() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<FeedTab>('foryou');
  const [activeId, setActiveId] = useState<string>(MOCK_CLIPS[0]?.id ?? '');

  // TODO(supabase): wire to useClipsFeed() — `status`, `data`, `error`.
  const feedState: FeedState = 'ready';
  const clips = MOCK_CLIPS;

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
      {feedState === 'ready' ? (
        <FlatList
          data={clips}
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
      ) : feedState === 'loading' ? (
        <ClipLoadingState bottomInset={insets.bottom} />
      ) : feedState === 'empty' ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="Video"
            title="No clips yet — record your first PR"
            body="Capture a rep, a route, or a lift. Tag it to a stat and it becomes proof."
            ctaLabel="RECORD A CLIP"
            onPress={() => undefined}
          />
        </View>
      ) : (
        <ClipErrorState />
      )}

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
            width: StyleSheet.hairlineWidth,
            height: 14,
            backgroundColor: darkColors.shadow,
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
  // Captions ON by default — Gen Z baseline. Tap MessageSquare to toggle.
  const [captionsOn, setCaptionsOn] = useState(true);
  const openStatEntry = useCreateSheetStore((s) => s.openStatEntry);

  // Share-with-watermark hook. Wave 2.1 swaps this for a real ShareCard PNG
  // capture (handle + first-frame poster + Elevate watermark). For now the
  // OS share sheet receives the poster URL + a credit string so users can
  // already push to TikTok/IG/Snap/iMessage from here.
  const share = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(clip.posterUrl, {
          dialogTitle: `@${clip.author.handle} on Elevate`,
        });
      }
    } catch {
      // Share unavailable — no-op.
    }
  };

  // "Tag as proof" — wires the clip into a stat record as video-proof.
  // Wave 2.3 will pass the clip id through so the stat is created with
  // verification_method='video' and a clip_id back-reference. Until then the
  // stat-entry sheet opens with no clip context.
  const tagAsProof = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Tag this clip as proof?',
      'We’ll attach it to a stat you log — coaches and rivals will see the receipt.',
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Log a stat',
          onPress: () => openStatEntry(),
        },
      ],
    );
  };

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
            { backgroundColor: darkColors.paper },
            !videoReady ? undefined : styles.hidden,
          ]}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
        {/* Bottom-to-top scrim for overlay legibility. See SCRIM_BACKDROP
            comment for why this rgba is allowed. */}
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, styles.scrim]}
        />
        {/* Center play indicator when paused OR when there's no real video. */}
        {paused || !videoReady ? (
          <View pointerEvents="none" style={styles.centerPlay}>
            <View style={styles.playPill}>
              <AppIcon name="Play" size={icon.sizes.xl} tone="ink" filled />
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
          onPress={share}
          accessibilityLabel="Share"
        />
        <RailAction
          icon="Bookmark"
          label="Save"
          // TODO(supabase): wire to saved_clips toggle
          onPress={() => undefined}
          accessibilityLabel="Save"
        />
        {/* TAG AS PROOF — the verification-pipeline affordance. Tapping
            opens the stat-entry sheet so the clip becomes a video-proof
            receipt on a stat record (Wave 2.3 finishes the wire-up). */}
        <RailAction
          icon="Check"
          label="Tag"
          onPress={tagAsProof}
          accessibilityLabel="Tag clip as video proof for a stat"
        />
        {/* Captions toggle — ON by default. Active = ember tint. Using
            MessageSquare until Lucide `Subtitles` is added to AppIcon. */}
        <RailAction
          icon="MessageSquare"
          label={captionsOn ? 'CC on' : 'CC off'}
          active={captionsOn}
          onPress={() => {
            Haptics.selectionAsync();
            setCaptionsOn((c) => !c);
          }}
          accessibilityLabel={captionsOn ? 'Turn captions off' : 'Turn captions on'}
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
          <Avatar uri={clip.author.avatar} seed={clip.author.handle} size={40} />
          <Txt
            variant="bodyLg"
            weight="semibold"
            numberOfLines={1}
            style={{ color: darkColors.ink, flexShrink: 1 }}
          >
            @{clip.author.handle}
          </Txt>
        </View>
        {captionsOn ? (
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
        ) : null}
      </View>
    </View>
  );
}

interface RailActionProps {
  icon: IconName;
  label: string;
  active?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}

/**
 * One vertical action in the right rail. 44pt circular hit target (spec),
 * Lucide icon at `icon.sizes.lg` (24), micro label below. Active heart =
 * ember filled; everything else inherits `ink`.
 */
function RailAction({
  icon: iconName,
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
      style={({ pressed }) => [
        styles.railAction,
        pressed && styles.railActionPressed,
      ]}
    >
      <AppIcon
        name={iconName}
        size={icon.sizes.lg}
        tone={active ? 'ember' : 'ink'}
        filled={active}
      />
      <Txt
        variant="micro"
        style={{
          color: active ? darkColors.ember : darkColors.ink,
          marginTop: space[1],
        }}
      >
        {label}
      </Txt>
    </Pressable>
  );
}

/**
 * Skeleton screen for the clip feed — fakes the video tile + right-rail
 * footprint so the transition into real content doesn't shift the layout.
 */
function ClipLoadingState({ bottomInset }: { bottomInset: number }) {
  const TAB_BAR_OVERLAP = 64 + Math.max(bottomInset, space[3]);
  return (
    <View style={{ flex: 1, backgroundColor: darkColors.paper }}>
      <Skeleton
        w={'100%'}
        h={SCREEN_HEIGHT}
        radius="sm"
        style={{ position: 'absolute', top: 0, left: 0 }}
      />
      {/* Right-rail placeholders. Six dots, each at 44pt to match the real rail. */}
      <View
        style={[
          styles.rightRail,
          { bottom: TAB_BAR_OVERLAP + space[5] },
        ]}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} w={RAIL_TAP_TARGET} h={RAIL_TAP_TARGET} radius="full" />
        ))}
      </View>
      {/* Bottom-left author + caption placeholders. */}
      <View
        style={[
          styles.bottomLeft,
          { bottom: TAB_BAR_OVERLAP + space[4], gap: space[3] },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
          <Skeleton w={40} h={40} radius="full" />
          <Skeleton w={120} h={16} />
        </View>
        <Skeleton w={'80%'} h={16} />
      </View>
    </View>
  );
}

/**
 * Inline error state. No spinner, no blank screen — the rail/composition is
 * gone because there's no clip to act on, but the user is told what happened.
 */
function ClipErrorState() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: space[5],
        gap: space[3],
      }}
    >
      <AppIcon name="X" size={icon.sizes.xl} tone="ash" />
      <Txt variant="display4" weight="bold" style={{ color: darkColors.ink, textAlign: 'center' }}>
        Couldn’t load clips
      </Txt>
      <Txt variant="body" style={{ color: darkColors.ash, textAlign: 'center' }}>
        Check your connection and pull to refresh.
      </Txt>
    </View>
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
    gap: space[4],
  },
  railAction: {
    width: RAIL_TAP_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: RAIL_TAP_TARGET,
  },
  railActionPressed: {
    // Spec press state: subtle scale-down via opacity stand-in (no transform
    // here so the icon + label stay legible without layout jitter).
    opacity: 0.7,
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
    borderRadius: radius.full,
    backgroundColor: SCRIM_BACKDROP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrim: {
    backgroundColor: SCRIM_BACKDROP,
  },
  hidden: {
    opacity: 0,
  },
});
