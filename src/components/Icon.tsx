import {
  ArrowClockwise,
  At,
  BatteryMedium,
  CalendarBlank,
  CaretLeft,
  CaretRight,
  Check,
  CircleHalf,
  Clock,
  Eye,
  EyeSlash,
  FlagCheckered,
  GearSix,
  GlobeHemisphereWest,
  Hourglass,
  Lightning,
  LockSimple,
  Megaphone,
  PaperPlaneRight,
  PencilSimple,
  Play,
  SignOut,
  Trophy,
  User,
  Users,
  WifiSlash,
  Wrench,
  X,
  type IconWeight,
} from '@phosphor-icons/react';

/** Icônes de l'interface (bibliothèque Phosphor), nommées par usage. */
const ICONS = {
  play: Play,
  user: User,
  settings: GearSix,
  back: CaretLeft,
  close: X,
  send: PaperPlaneRight,
  logout: SignOut,
  eye: Eye,
  eyeOff: EyeSlash,
  trophy: Trophy,
  calendar: CalendarBlank,
  at: At,
  globe: GlobeHemisphereWest,
  contrast: CircleHalf,
  battery: BatteryMedium,
  users: Users,
  clock: Clock,
  flag: FlagCheckered,
  hourglass: Hourglass,
  lock: LockSimple,
  bolt: Lightning,
  megaphone: Megaphone,
  check: Check,
  pencil: PencilSimple,
  wrench: Wrench,
  refresh: ArrowClockwise,
  chevron: CaretRight,
  wifiOff: WifiSlash,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 22,
  weight = 'bold',
  className,
}: {
  name: IconName;
  size?: number;
  weight?: IconWeight;
  className?: string;
}) {
  const Component = ICONS[name];
  return <Component className={`icon${className ? ` ${className}` : ''}`} size={size} weight={weight} aria-hidden />;
}
