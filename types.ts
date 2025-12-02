

export enum AttributeType {
  SANTE_SPORT = 'Santé / Sport',
  SOCIAL = 'Social',
  SAVOIR = 'Savoir',
  TRAVAIL = 'Travail',
  CREATIVITE = 'Créativité'
}

export enum HabitCategory {
  SANTE_SPORT = 'Santé / Sport',
  SOCIAL = 'Social',
  SAVOIR = 'Savoir',
  TRAVAIL = 'Travail',
  CREATIVITE = 'Créativité'
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export type HabitType = 'simple' | 'counter';

export interface Habit {
  id: string;
  title: string;
  category: HabitCategory;
  frequency: 'daily' | 'weekly';
  associatedAttribute: AttributeType;
  history: string[]; // ISO Date strings of completions
  streak: number;
  timeOfDay: TimeOfDay;
  targetTime: string; // HH:MM
  
  // Counter logic
  type: HabitType;
  targetValue: number;
  dailyProgress: Record<string, number>; 

  // v2.0 Focus Logic
  focusSeconds: number; // Current active session duration
  totalFocusTime: number; // Total accumulated time
}

export interface JournalEntry {
  id: string;
  date: string; // ISO string
  text: string; // Still used for daily reflection/legacy
  
  // Bio-Tracker v2.0
  mood: number; // 0-10
  sleepBedTime: string; // HH:MM
  sleepWakeTime: string; // HH:MM
  sleepWakenings: number;
  sleepQuality: number; // 1-4 (Emojis)
}

// v2.1: True Notepad System
export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

// --- HARD MODE LEVEL SYSTEM TYPES ---

export interface RPGStat {
  level: number;
  currentXP: number;
  nextLevelXP: number;
}

export interface UserStats {
  level: number;
  attributeXP: Record<AttributeType, number>; // XP in current cycle
  currentThreshold: number; // XP needed per attribute to pass
}

export const CATEGORY_TO_ATTRIBUTE: Record<HabitCategory, AttributeType> = {
  [HabitCategory.SANTE_SPORT]: AttributeType.SANTE_SPORT,
  [HabitCategory.SOCIAL]: AttributeType.SOCIAL,
  [HabitCategory.SAVOIR]: AttributeType.SAVOIR,
  [HabitCategory.TRAVAIL]: AttributeType.TRAVAIL,
  [HabitCategory.CREATIVITE]: AttributeType.CREATIVITE
};

export type CoachMode = 'idle' | 'input' | 'strategy';

export interface CoreContextType {
  habits: Habit[];
  journalEntries: JournalEntry[];
  notes: Note[];
  
  // User Status
  isPremium: boolean;
  upgradeToPremium: () => void;
  resetPremium: () => void;
  
  // V2 Level System (Hard Mode)
  userStats: UserStats;
  promoteUser: () => void;

  // AI & Chat
  chatHistory: ChatMessage[];
  isChatLoading: boolean;
  sendChatMessage: (message: string) => Promise<void>;
  generateDailyProtocol: (mode: 'replace' | 'append', userRequest: string) => Promise<void>;
  resetChatHistory: () => void;
  
  // Coach UI Persistence
  coachMode: CoachMode;
  setCoachMode: (mode: CoachMode) => void;
  coachInput: string;
  setCoachInput: (input: string) => void;

  // Actions
  setHabits: (habits: Habit[]) => void; // Exposed for AI injection
  addHabit: (title: string, category: HabitCategory, timeOfDay: TimeOfDay, type: HabitType, targetValue: number, targetTime: string) => void;
  toggleHabitCompletion: (id: string, dateStr: string) => void;
  updateHabitProgress: (id: string, dateStr: string, increment: number) => void;
  deleteHabit: (id: string) => void;
  
  // Focus Logic v2.0
  activeHabitId: string | null;
  toggleHabitFocus: (id: string) => void;
  
  // Journal v2.0 (Daily Bio-Tracker)
  saveDailyEntry: (data: Partial<Omit<JournalEntry, 'id' | 'date'>>) => void;
  deleteJournalEntry: (id: string) => void;

  // Notes v2.1
  createNote: () => string; // Returns new Note ID
  updateNote: (id: string, title: string, content: string) => void;
  deleteNote: (id: string) => void;

  // Calculators
  calculateCompletionRate: (habitId: string, timeframe: 'today' | 'week') => number;
  getDailyCompletionRate: (date: Date) => number;
  getGlobalConsistency: () => number;
  clearAllData: () => void;
}