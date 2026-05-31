import {
  Activity,
  Bell,
  Bookmark,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  Flame,
  Heart,
  Lock,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Search,
  Settings,
  Share2,
  Snowflake,
  Swords,
  Target,
  Trophy,
  User,
  Video,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useTheme } from '../../theme';

/**
 * Single line-icon set. 2px stroke. Filled-on-active via the `filled` prop.
 *
 * All icon usage in the app should go through this primitive so the
 * stroke-weight + tone vocabulary stays uniform. Add icons to the map below
 * before reaching for `lucide-react-native` directly.
 */
export const Icons = {
  // In use today
  Trophy,
  Swords,
  User,
  Flame,
  Snowflake,
  X,
  Check,
  // Phase 2 — Boards/Battles/Calls/Clips/Create chrome
  Plus,
  Heart,
  MessageCircle,
  MessageSquare,
  Share2,
  Play,
  Pause,
  MoreHorizontal,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Search,
  Settings,
  Bell,
  Bookmark,
  Eye,
  Camera,
  Video,
  Activity,
  Target,
  Lock,
} as const;

export type IconName = keyof typeof Icons;

interface Props {
  name: IconName;
  size?: number;
  tone?: 'ink' | 'ash' | 'ember' | 'paper';
  /**
   * When true, the icon renders with `fill` set to the tone color (so it
   * reads as the active state). Lucide doesn't ship filled siblings for every
   * icon — using fill works uniformly with `strokeWidth=2`.
   */
  filled?: boolean;
}

export function AppIcon({ name, size = 24, tone = 'ink', filled = false }: Props) {
  const { colors } = useTheme();
  const color =
    tone === 'ash' ? colors.ash : tone === 'ember' ? colors.ember : tone === 'paper' ? colors.paper : colors.ink;
  const Icon: LucideIcon = Icons[name];
  return (
    <Icon
      size={size}
      color={color}
      strokeWidth={2}
      fill={filled ? color : 'transparent'}
    />
  );
}
