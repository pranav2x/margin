import { useEffect, useRef, useState } from 'react';
import { View, Pressable, useWindowDimensions, StyleSheet } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Bookmark, Share2, MessageCircle, Pause } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Svg, { Defs, Pattern, Rect, Circle } from 'react-native-svg';
import { Txt } from '../primitives/Text';
import { MicroLabel } from '../primitives/MicroLabel';
import { useTheme, space } from '../../theme';
import type { Clip } from '../../types';

const ICON_COL = 56;

function Grain() {
  // SVG-based subtle film grain overlay — non-animated for perf.
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" opacity={0.18}>
        <Defs>
          <Pattern id="grain" width="4" height="4" patternUnits="userSpaceOnUse">
            <Rect width="4" height="4" fill="transparent" />
            <Circle cx="1" cy="1" r="0.5" fill="white" opacity="0.5" />
            <Circle cx="3" cy="3" r="0.5" fill="white" opacity="0.4" />
            <Circle cx="2" cy="3" r="0.3" fill="white" opacity="0.3" />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#grain)" />
      </Svg>
    </View>
  );
}

function Vignette({ voidColor }: { voidColor: string }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: 'transparent',
            borderColor: voidColor,
            borderWidth: 60,
            borderRadius: 200,
            opacity: 0.55,
          },
        ]}
      />
    </View>
  );
}

interface Props {
  clip: Clip;
  active: boolean;
  onSave?: () => void;
  onShare?: () => void;
  onComment?: () => void;
}

export function ClipPlayer({ clip, active, onSave, onShare, onComment }: Props) {
  const { width, height } = useWindowDimensions();
  const { colors } = useTheme();

  const player = useVideoPlayer(clip.videoUrl, (p) => {
    p.loop = true;
    p.muted = true;
  });

  const [paused, setPaused] = useState(false);
  const pauseO = useSharedValue(0);
  const lastTap = useRef(0);

  useEffect(() => {
    if (active && !paused) {
      try { player.play(); } catch {}
    } else {
      try { player.pause(); } catch {}
    }
  }, [active, paused, player]);

  const togglePause = () => {
    setPaused((p) => {
      const next = !p;
      pauseO.value = next ? 1 : 0;
      return next;
    });
  };

  const handleSingleTap = () => {
    togglePause();
  };

  const handleDoubleTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSave?.();
  };

  const onPress = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      handleDoubleTap();
      lastTap.current = 0;
    } else {
      lastTap.current = now;
      setTimeout(() => {
        if (lastTap.current && Date.now() - lastTap.current >= 270) {
          handleSingleTap();
          lastTap.current = 0;
        }
      }, 280);
    }
  };

  const pauseStyle = useAnimatedStyle(() => ({ opacity: pauseO.value }));

  return (
    <View style={{ width, height, backgroundColor: colors.void }}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />

      <Grain />
      <Vignette voidColor={colors.void} />

      <Pressable onPress={onPress} style={StyleSheet.absoluteFill}>
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', top: '46%', left: '46%' },
            pauseStyle,
          ]}
        >
          <Pause size={48} color={colors.paper} strokeWidth={1.25} />
        </Animated.View>
      </Pressable>

      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          paddingTop: 80,
          paddingHorizontal: space[5],
        }}
      >
        <MicroLabel inverted tone="ash">{clip.eyebrow}</MicroLabel>
      </View>

      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          right: space[3],
          bottom: 200,
          gap: space[6],
          alignItems: 'center',
        }}
      >
        {[
          { icon: Bookmark, label: clip.saves, onPress: onSave, key: 'save' },
          { icon: Share2, label: clip.shares, onPress: onShare, key: 'share' },
          { icon: MessageCircle, label: clip.comments, onPress: onComment, key: 'comment' },
        ].map(({ icon: Icon, label, onPress, key }) => (
          <Pressable
            key={key}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPress?.();
            }}
            style={{ alignItems: 'center', width: ICON_COL }}
          >
            <Icon size={26} color={colors.paper} strokeWidth={1.25} />
            <Txt
              variant="scoreSm"
              tone="paper"
              style={{ marginTop: space[2], fontSize: 12 }}
            >
              {label > 999 ? `${(label / 1000).toFixed(1)}k` : label}
            </Txt>
          </Pressable>
        ))}
      </View>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: ICON_COL + space[4],
          bottom: 130,
          paddingHorizontal: space[5],
        }}
      >
        <Txt
          variant="display4"
          tone="paper"
          style={{ fontSize: 28, lineHeight: 32 }}
        >
          {clip.athleteName}
        </Txt>
        <Txt
          variant="bodyLg"
          italic
          tone="paper"
          style={{ marginTop: space[2], fontFamily: 'InstrumentSerifItalic', fontSize: 20 }}
        >
          {clip.context}
        </Txt>
        {clip.photographer && clip.photographerSchool && (
          <MicroLabel inverted tone="ash" style={{ marginTop: space[3] }}>
            PHOTO · {clip.photographer} · {clip.photographerSchool}
          </MicroLabel>
        )}
      </View>
    </View>
  );
}
