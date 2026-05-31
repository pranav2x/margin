import { useEffect, useState } from 'react';
import {
  View,
  Pressable,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from '../../components/primitives/Text';
import { Avatar } from '../../components/primitives/Avatar';
import { AppIcon } from '../../components/primitives/AppIcon';
// NOTE: clips screens are dark-by-default regardless of theme preference. See
// /(tabs)/clips.tsx for the rationale — same overlay-on-video contrast story.
import { darkColors } from '../../theme/colors';
import { space, radius } from '../../theme';
// TODO(supabase): replace with useClip(id) once data layer lands. For now we
// pull from the same mock array used by the tab feed so deep-linked clip ids
// resolve in dev.
import { MOCK_CLIPS, type ClipItem } from '../(tabs)/clips';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Documented exception: chrome over video needs a translucent black backdrop
// for legibility. See /(tabs)/clips.tsx for the rationale.
const SCRIM_BACKDROP = 'rgba(0,0,0,0.35)';

// Lane D — single-clip player. Deep-linkable (share + open from feed row).
export default function ClipDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // TODO(supabase): replace with useClip(id) hook — single-clip fetch with
  // author + counts. For now we resolve against the mock feed exported from
  // the tab screen so deep-linked ids "just work" in dev.
  const clip = MOCK_CLIPS.find((c) => c.id === id) ?? MOCK_CLIPS[0];

  if (!clip) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: darkColors.paper,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Txt variant="bodyLg" style={{ color: darkColors.ash }}>
          Clip not found.
        </Txt>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: darkColors.paper }}>
      <ClipPlayer clip={clip} bottomInset={insets.bottom} />

      {/* Back chevron — top-left, sits over the video. */}
      <View
        pointerEvents="box-none"
        style={[styles.header, { top: insets.top + space[2] }]}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={10}
          style={styles.backChip}
        >
          <AppIcon name="ChevronLeft" size={28} tone="paper" />
        </Pressable>
      </View>
    </View>
  );
}

interface ClipPlayerProps {
  clip: ClipItem;
  bottomInset: number;
}

function ClipPlayer({ clip, bottomInset }: ClipPlayerProps) {
  const [liked, setLiked] = useState(false);
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [likeCount, setLikeCount] = useState(clip.likes);

  // TODO(supabase): replace clip.videoUrl with the signed playback URL. Hook
  // is called unconditionally to satisfy rules-of-hooks; empty source is a
  // no-op and we fall back to the poster + Play overlay.
  const player = useVideoPlayer(clip.videoUrl ?? '', (p) => {
    p.loop = true;
    p.muted = false;
  });
  const videoReady = !!clip.videoUrl;

  useEffect(() => {
    if (!videoReady) return;
    try {
      if (!paused) player.play();
      else player.pause();
      player.muted = muted;
    } catch {
      // Player teardown — safe to ignore.
    }
  }, [paused, muted, player, videoReady]);

  const handleLikeToggle = () => {
    setLiked((prev) => {
      const next = !prev;
      setLikeCount((c) => c + (next ? 1 : -1));
      return next;
    });
  };

  // No tab bar on this stack route, so we just clear the home indicator.
  const BOTTOM_PAD = Math.max(bottomInset, space[5]);

  return (
    <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}>
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
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: darkColors.void, opacity: 0.18 },
          ]}
        />
        {paused || !videoReady ? (
          <View pointerEvents="none" style={styles.centerPlay}>
            <View style={styles.playPill}>
              <AppIcon name="Play" size={36} tone="paper" filled />
            </View>
          </View>
        ) : null}
      </Pressable>

      {/* Right rail — same vocab as the feed, just no Save slot. */}
      <View
        pointerEvents="box-none"
        style={[styles.rightRail, { bottom: BOTTOM_PAD + space[6] }]}
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
          onPress={() => undefined}
          accessibilityLabel="Comments"
        />
        <RailAction
          icon="Share2"
          label={formatCount(clip.shares)}
          onPress={() => undefined}
          accessibilityLabel="Share"
        />
        <RailAction
          icon={muted ? 'Pause' : 'Play'}
          label={muted ? 'Muted' : 'On'}
          onPress={() => setMuted((m) => !m)}
          accessibilityLabel={muted ? 'Unmute' : 'Mute'}
        />
      </View>

      {/* Bottom-left author + caption (same pattern as feed). */}
      <View
        pointerEvents="box-none"
        style={[styles.bottomLeft, { bottom: BOTTOM_PAD + space[4] }]}
      >
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
  icon: 'Heart' | 'MessageCircle' | 'Share2' | 'Play' | 'Pause';
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
        style={{ color: active ? darkColors.ember : darkColors.ink }}
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
  header: {
    position: 'absolute',
    left: space[4],
    right: space[4],
    flexDirection: 'row',
    alignItems: 'center',
  },
  backChip: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: SCRIM_BACKDROP,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: radius.full,
    backgroundColor: SCRIM_BACKDROP,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
