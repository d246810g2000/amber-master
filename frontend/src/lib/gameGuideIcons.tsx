import React from 'react';
import Feather from 'lucide-react/dist/esm/icons/feather';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import ShoppingBag from 'lucide-react/dist/esm/icons/shopping-bag';
import Target from 'lucide-react/dist/esm/icons/target';
import Coins from 'lucide-react/dist/esm/icons/coins';
import Flag from 'lucide-react/dist/esm/icons/flag';
import Scale from 'lucide-react/dist/esm/icons/scale';
import BarChart2 from 'lucide-react/dist/esm/icons/bar-chart-2';
import Landmark from 'lucide-react/dist/esm/icons/landmark';
import Timer from 'lucide-react/dist/esm/icons/timer';
import Package from 'lucide-react/dist/esm/icons/package';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Heart from 'lucide-react/dist/esm/icons/heart';
import Tag from 'lucide-react/dist/esm/icons/tag';
import Shield from 'lucide-react/dist/esm/icons/shield';
import Swords from 'lucide-react/dist/esm/icons/swords';
import Egg from 'lucide-react/dist/esm/icons/egg';
import Handshake from 'lucide-react/dist/esm/icons/handshake';
import { cn } from './utils';

export type GuideIconKey =
  | 'feather'
  | 'calendar'
  | 'trophy'
  | 'shopping-bag'
  | 'target'
  | 'coins'
  | 'flag'
  | 'scale'
  | 'bar-chart'
  | 'landmark'
  | 'timer'
  | 'package'
  | 'zap'
  | 'sparkles'
  | 'refresh-cw'
  | 'heart'
  | 'tag'
  | 'shield'
  | 'swords'
  | 'egg'
  | 'handshake';

const ICONS: Record<GuideIconKey, React.FC<{ size?: number; className?: string }>> = {
  feather: Feather,
  calendar: Calendar,
  trophy: Trophy,
  'shopping-bag': ShoppingBag,
  target: Target,
  coins: Coins,
  flag: Flag,
  scale: Scale,
  'bar-chart': BarChart2,
  landmark: Landmark,
  timer: Timer,
  package: Package,
  zap: Zap,
  sparkles: Sparkles,
  'refresh-cw': RefreshCw,
  heart: Heart,
  tag: Tag,
  shield: Shield,
  swords: Swords,
  egg: Egg,
  handshake: Handshake,
};

interface GuideIconProps {
  name: GuideIconKey;
  size?: number;
  className?: string;
  box?: boolean;
  boxClassName?: string;
}

export function GuideIcon({ name, size = 16, className, box, boxClassName }: GuideIconProps) {
  const Icon = ICONS[name];
  const iconEl = <Icon size={size} className={className} strokeWidth={2.25} />;
  if (!box) return iconEl;
  return (
    <div className={cn('flex items-center justify-center rounded-lg shrink-0', boxClassName)}>
      {iconEl}
    </div>
  );
}
