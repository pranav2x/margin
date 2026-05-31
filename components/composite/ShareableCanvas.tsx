import { forwardRef, type ReactNode } from 'react';
import { View, Dimensions } from 'react-native';
import { Txt } from '../primitives/Text';
import { MicroLabel } from '../primitives/MicroLabel';
import { HairlineRule } from '../primitives/HairlineRule';
import { useTheme, space, radius } from '../../theme';

/**
 * ShareableCanvas — a 9:16 paper-canvas wrapper used as the captureRef
 * target so every export ships at story-aspect with the Elevate watermark.
 *
 * Wraps any card the app already renders (ShareCard, BattleShareCard,
 * StreakMilestoneCard, plus the future PR / Rank-up cards). The canvas is
 * always rendered — capturing a ref needs the view in the tree — but the
 * caller controls visibility via `style` (e.g. position: absolute, opacity 0,
 * or scaled into the flow as a preview).
 *
 *   const ref = useRef<View>(null);
 *   ...
 *   <ShareableCanvas ref={ref} kicker="PR BEATEN">
 *     <PRShareCard ... />
 *   </ShareableCanvas>
 *   <PrimaryButton label="Share" onPress={() => shareSnapshot(ref, 'PR')} />
 */

const SCREEN_WIDTH = Dimensions.get('window').width;
const CANVAS_WIDTH = Math.min(SCREEN_WIDTH - space[4] * 2, 360);
const CANVAS_HEIGHT = Math.round((CANVAS_WIDTH * 16) / 9);

interface Props {
  kicker?: string;
  children: ReactNode;
}

export const ShareableCanvas = forwardRef<View, Props>(function ShareableCanvas(
  { kicker, children },
  ref,
) {
  const { colors } = useTheme();
  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: colors.paper,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.fog,
        padding: space[5],
        overflow: 'hidden',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Txt variant="display4" weight="extrabold">
          Elevate
        </Txt>
        {kicker ? (
          <MicroLabel style={{ color: colors.ember }}>{kicker}</MicroLabel>
        ) : null}
      </View>
      <HairlineRule style={{ marginVertical: space[4] }} />
      <View style={{ flex: 1 }}>{children}</View>
      <HairlineRule style={{ marginVertical: space[4] }} />
      <MicroLabel>YOUR GAME, BY THE NUMBERS</MicroLabel>
    </View>
  );
});
