

import { AttributeType } from './types';
import { HeartPulse, BookOpen, Users, Palette, Target } from 'lucide-react';

// Short codes for badges (Radar Labels)
export const ATTRIBUTE_SHORT: Record<AttributeType, string> = {
  [AttributeType.SANTE_SPORT]: 'SAN',
  [AttributeType.SOCIAL]: 'SOC',
  [AttributeType.SAVOIR]: 'SAV',
  [AttributeType.TRAVAIL]: 'TRA',
  [AttributeType.CREATIVITE]: 'CRE',
};

export const ATTRIBUTE_THEME = {
  [AttributeType.SANTE_SPORT]: {
    color: 'text-rose-500',
    bg: 'bg-rose-500',
    gradient: 'bg-gradient-to-r from-rose-500 to-red-400',
    border: 'border-rose-500/20',
    shadow: 'shadow-rose-500/10',
    icon: HeartPulse // Coeur + Activité
  },
  [AttributeType.SOCIAL]: {
    color: 'text-violet-400',
    bg: 'bg-violet-400',
    gradient: 'bg-gradient-to-r from-violet-400 to-purple-500',
    border: 'border-violet-400/20',
    shadow: 'shadow-violet-400/10',
    icon: Users
  },
  [AttributeType.SAVOIR]: {
    color: 'text-sky-400',
    bg: 'bg-sky-400',
    gradient: 'bg-gradient-to-r from-sky-400 to-blue-500',
    border: 'border-sky-400/20',
    shadow: 'shadow-sky-400/10',
    icon: BookOpen
  },
  [AttributeType.TRAVAIL]: {
    color: 'text-amber-400',
    bg: 'bg-amber-400',
    gradient: 'bg-gradient-to-r from-amber-400 to-yellow-300',
    border: 'border-amber-400/20',
    shadow: 'shadow-amber-400/10',
    icon: Target
  },
  [AttributeType.CREATIVITE]: {
    color: 'text-fuchsia-400',
    bg: 'bg-fuchsia-400',
    gradient: 'bg-gradient-to-r from-fuchsia-400 to-pink-500',
    border: 'border-fuchsia-400/20',
    shadow: 'shadow-fuchsia-400/10',
    icon: Palette
  }
};

export const ATTRIBUTE_ICONS = {
  [AttributeType.SANTE_SPORT]: HeartPulse,
  [AttributeType.SOCIAL]: Users,
  [AttributeType.SAVOIR]: BookOpen,
  [AttributeType.TRAVAIL]: Target,
  [AttributeType.CREATIVITE]: Palette,
};

// --- XP SYSTEM CONFIG (HARD MODE) ---

export const BASE_XP_PER_TASK = 10; // Fixed 10 XP per task as requested
export const STREAK_BONUS_MULTIPLIER = 0; // Disabled for strict calculation clarity in this mode

// Thresholds are now PER ATTRIBUTE per cycle
// Level 1 (Starts at 0): Need 40 XP per stat to pass to Lvl 2
// Level 2: Need 180 XP per stat to pass to Lvl 3
// Level 3+: Need 550 XP per stat to pass
export const LEVEL_CAPS = {
    1: 40,   // ~4 tasks/stat
    2: 180,  // ~18 tasks/stat
    3: 550   // ~55 tasks/stat
};

export const getLevelCap = (level: number) => {
    if (level === 1) return 40;
    if (level === 2) return 180;
    return 550; // Level 3 and above
};

// Visual Themes per Level
export const LEVEL_THEMES: Record<number, { stroke: string, fill: string, glow: string }> = {
    1: { stroke: '#FFC857', fill: '#FFC857', glow: 'rgba(255, 200, 87, 0.4)' }, // Sunset Amber (Yellow-Orange)
    2: { stroke: '#fbbf24', fill: '#fbbf24', glow: 'rgba(251, 191, 36, 0.5)' }, // Amber/Gold
    3: { stroke: '#38bdf8', fill: '#38bdf8', glow: 'rgba(56, 189, 248, 0.4)' }, // Cobalt (Blue)
    4: { stroke: '#8b5cf6', fill: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)' }, // Amethyst (Purple)
    5: { stroke: '#ef4444', fill: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)' }, // Ruby (Red)
    6: { stroke: '#10b981', fill: '#10b981', glow: 'rgba(16, 185, 129, 0.5)' }, // Emerald
    7: { stroke: '#22d3ee', fill: '#22d3ee', glow: 'rgba(34, 211, 238, 0.4)' }, // Cyan
    8: { stroke: '#ffffff', fill: '#ffffff', glow: 'rgba(255, 255, 255, 0.6)' }, // Diamond
};