import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { 
  CoreContextType, 
  Habit, 
  HabitCategory, 
  JournalEntry, 
  CATEGORY_TO_ATTRIBUTE,
  AttributeType,
  ChatMessage,
  TimeOfDay,
  HabitType,
  UserStats,
  Note,
  CoachMode
} from '../types';
import { chatWithNeuralArchitect, generatePlanFromAI } from '../services/geminiService';
import { getLevelCap, BASE_XP_PER_TASK } from '../constants';

const CoreContext = createContext<CoreContextType | undefined>(undefined);

export const useCore = () => {
  const context = useContext(CoreContext);
  if (!context) {
    throw new Error('useCore must be used within a CoreProvider');
  }
  return context;
};

export const CoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- State ---
  const [habits, setHabits] = useState<Habit[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // User Status
  const [isPremium, setIsPremium] = useState(false);
  
  // HARD MODE: Persistent Stats State
  const [userStats, setUserStats] = useState<UserStats>({
      level: 1,
      currentThreshold: 40,
      attributeXP: {
          [AttributeType.SANTE_SPORT]: 0,
          [AttributeType.SOCIAL]: 0,
          [AttributeType.SAVOIR]: 0,
          [AttributeType.TRAVAIL]: 0,
          [AttributeType.CREATIVITE]: 0
      }
  });

  // Focus State v2.0
  const [activeHabitId, setActiveHabitId] = useState<string | null>(null);
  const focusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Neural Architect State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // Coach UI Persistence
  const [coachMode, setCoachMode] = useState<CoachMode>('idle');
  const [coachInput, setCoachInput] = useState("");

  // --- Persistence ---
  useEffect(() => {
    const loadData = () => {
      const savedHabits = localStorage.getItem('core_habits');
      const savedJournal = localStorage.getItem('core_journal');
      const savedNotes = localStorage.getItem('core_notes');
      const savedPremium = localStorage.getItem('core_is_premium');
      const savedStats = localStorage.getItem('core_user_stats');

      if (savedJournal) setJournalEntries(JSON.parse(savedJournal));
      if (savedNotes) setNotes(JSON.parse(savedNotes));
      if (savedPremium) setIsPremium(JSON.parse(savedPremium));
      
      if (savedStats) {
          setUserStats(JSON.parse(savedStats));
      }

      if (savedHabits) {
        const parsed = JSON.parse(savedHabits);
        const migrated = parsed.map((h: any) => ({
            ...h,
            focusSeconds: h.focusSeconds || 0,
            totalFocusTime: h.totalFocusTime || 0
        }));
        setHabits(migrated);
      } else {
        initDemoData();
      }
      setIsLoaded(true);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('core_habits', JSON.stringify(habits));
      localStorage.setItem('core_journal', JSON.stringify(journalEntries));
      localStorage.setItem('core_notes', JSON.stringify(notes));
      localStorage.setItem('core_is_premium', JSON.stringify(isPremium));
      localStorage.setItem('core_user_stats', JSON.stringify(userStats));
    }
  }, [habits, journalEntries, notes, isPremium, userStats, isLoaded]);

  // --- LOGIC: XP Transaction System (Hard Mode) ---
  
  const grantXP = (attribute: AttributeType, amount: number) => {
      setUserStats(prev => {
          const cap = prev.currentThreshold;
          const currentVal = prev.attributeXP[attribute];
          // Allow overflow for display, but logic checks cap
          const newVal = Math.max(0, currentVal + amount);
          
          return {
              ...prev,
              attributeXP: {
                  ...prev.attributeXP,
                  [attribute]: newVal
              }
          };
      });
  };

  const promoteUser = () => {
      setUserStats(prev => {
          // Verify conditions again (safety)
          const isReady = Object.values(prev.attributeXP).every(xp => xp >= prev.currentThreshold);
          if (!isReady) return prev;

          const nextLevel = prev.level + 1;
          return {
              level: nextLevel,
              currentThreshold: getLevelCap(nextLevel),
              attributeXP: {
                [AttributeType.SANTE_SPORT]: 0,
                [AttributeType.SOCIAL]: 0,
                [AttributeType.SAVOIR]: 0,
                [AttributeType.TRAVAIL]: 0,
                [AttributeType.CREATIVITE]: 0
              }
          };
      });
  };

  // --- Focus Timer Logic v2.0 ---
  useEffect(() => {
    if (activeHabitId) {
        focusIntervalRef.current = setInterval(() => {
            setHabits(prev => prev.map(h => {
                if (h.id === activeHabitId) {
                    return { ...h, focusSeconds: h.focusSeconds + 1, totalFocusTime: (h.totalFocusTime || 0) + 1 };
                }
                return h;
            }));
        }, 1000);
    } else {
        if (focusIntervalRef.current) clearInterval(focusIntervalRef.current);
    }

    return () => {
        if (focusIntervalRef.current) clearInterval(focusIntervalRef.current);
    };
  }, [activeHabitId]);

  const toggleHabitFocus = (id: string) => {
      if (activeHabitId === id) {
          // Stop
          setActiveHabitId(null);
      } else {
          // Start (Switching implies stopping previous)
          setActiveHabitId(id);
      }
  };

  const initDemoData = () => {
      setHabits([]);
  };

  const addHabit = (title: string, category: HabitCategory, timeOfDay: TimeOfDay, type: HabitType, targetValue: number, targetTime: string) => {
    const newHabit: Habit = {
      id: crypto.randomUUID(), title, category, frequency: 'daily', associatedAttribute: CATEGORY_TO_ATTRIBUTE[category], history: [], streak: 0, timeOfDay, type, targetValue, targetTime, dailyProgress: {}, focusSeconds: 0, totalFocusTime: 0
    };
    setHabits(prev => [...prev, newHabit]);
  };

  const deleteHabit = (id: string) => {
      setHabits(prev => prev.filter(h => h.id !== id));
  };

  const toggleHabitCompletion = (id: string, dateStr: string) => {
    // 1. Find habit to get attribute
    const habit = habits.find(h => h.id === id);
    if(!habit) return;

    setHabits(prev => prev.map(h => {
      if (h.id !== id) return h;
      if (h.type === 'counter') return h; 

      const isCompleted = h.history.includes(dateStr);
      let newHistory = isCompleted ? h.history.filter(d => d !== dateStr) : [...h.history, dateStr];
      
      // Update XP State Transactionally
      if (!isCompleted) {
          grantXP(h.associatedAttribute, BASE_XP_PER_TASK);
      } else {
          grantXP(h.associatedAttribute, -BASE_XP_PER_TASK);
      }

      // Simple streak logic for UI
      let newStreak = h.streak;
      if (!isCompleted) { 
          const yesterday = new Date(dateStr);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          
          if (h.history.includes(yesterdayStr)) {
              newStreak += 1;
          } else {
              newStreak = 1; 
          }
      } else {
          newStreak = Math.max(0, h.streak - 1);
      }

      return { ...h, history: newHistory, streak: newStreak };
    }));
  };

  const updateHabitProgress = (id: string, dateStr: string, increment: number) => {
    // Simplified: No XP partial updates for counters in this version to keep strict logic simple. 
    // XP is only granted on full completion (not implemented in this snippet for brevity, assuming simple tasks primarily)
  };

  const saveDailyEntry = (data: Partial<Omit<JournalEntry, 'id' | 'date'>>) => {
    const todayStr = new Date().toISOString().split('T')[0];
    setJournalEntries(prev => {
        const existingIndex = prev.findIndex(e => e.date.startsWith(todayStr));
        if (existingIndex >= 0) {
            const updatedEntries = [...prev];
            updatedEntries[existingIndex] = { ...updatedEntries[existingIndex], ...data };
            return updatedEntries;
        } else {
            const newEntry: JournalEntry = {
                id: crypto.randomUUID(),
                date: new Date().toISOString(),
                text: data.text || "",
                mood: data.mood || 5,
                sleepBedTime: data.sleepBedTime || "23:00",
                sleepWakeTime: data.sleepWakeTime || "07:00",
                sleepWakenings: data.sleepWakenings || 0,
                sleepQuality: data.sleepQuality || 3
            };
            return [newEntry, ...prev];
        }
    });
  };

  const deleteJournalEntry = (id: string) => {
    setJournalEntries(prev => prev.filter(e => e.id !== id));
  };

  const createNote = (): string => {
      const id = crypto.randomUUID();
      const newNote: Note = { id, title: "", content: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      setNotes(prev => [newNote, ...prev]);
      return id;
  };

  const updateNote = (id: string, title: string, content: string) => {
      setNotes(prev => prev.map(note => {
          if (note.id === id) {
              return { ...note, title, content, updatedAt: new Date().toISOString() };
          }
          return note;
      }));
  };

  const deleteNote = (id: string) => {
      setNotes(prev => prev.filter(n => n.id !== id));
  };

  const calculateCompletionRate = (habitId: string, timeframe: 'today' | 'week'): number => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return 0;
    if (timeframe === 'today') {
      const today = new Date().toISOString().split('T')[0];
      return habit.history.includes(today) ? 100 : 0;
    } 
    if (timeframe === 'week') {
      let completedCount = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        if (habit.history.includes(dateStr)) completedCount++;
      }
      return Math.round((completedCount / 7) * 100);
    }
    return 0;
  };

  const getDailyCompletionRate = (date: Date): number => {
    if (habits.length === 0) return 0;
    const dateStr = date.toISOString().split('T')[0];
    let completedCount = 0;
    habits.forEach(habit => {
      if (habit.history.includes(dateStr)) completedCount++;
    });
    return completedCount / habits.length;
  };

  const getGlobalConsistency = (): number => {
    let totalRate = 0;
    const daysToCheck = 30; 
    for (let i = 0; i < daysToCheck; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      totalRate += getDailyCompletionRate(d);
    }
    return Math.round((totalRate / daysToCheck) * 100);
  };

  const upgradeToPremium = () => setIsPremium(true);
  const resetPremium = () => setIsPremium(false);

  const sendChatMessage = async (message: string) => {
    if (!process.env.API_KEY) return;
    setIsChatLoading(true);
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: message, timestamp: new Date() };
    setChatHistory(prev => [...prev, userMsg]);
    const aiResponseText = await chatWithNeuralArchitect(chatHistory, message, { habits, journal: journalEntries }, process.env.API_KEY);
    const aiMsg: ChatMessage = { id: crypto.randomUUID(), role: 'model', text: aiResponseText, timestamp: new Date() };
    setChatHistory(prev => [...prev, aiMsg]);
    setIsChatLoading(false);
  };

  const generateDailyProtocol = async (mode: 'replace' | 'append', userRequest: string) => {
    if (!process.env.API_KEY) return;
    setIsChatLoading(true);
    try {
        const currentHabits = mode === 'append' ? habits : [];
        const generatedHabits = await generatePlanFromAI(journalEntries, process.env.API_KEY, currentHabits, userRequest);
        if (mode === 'replace') {
            setHabits(generatedHabits);
        } else {
            setHabits(prev => [...prev, ...generatedHabits]);
        }
        const aiMsg: ChatMessage = { 
            id: crypto.randomUUID(), role: 'model', text: mode === 'replace' ? "J'ai structuré ta journée selon tes objectifs." : "J'ai ajouté tes nouvelles missions au planning.", timestamp: new Date() 
        };
        setChatHistory(prev => [...prev, aiMsg]);
    } catch (e) {
        const aiMsg: ChatMessage = { id: crypto.randomUUID(), role: 'model', text: "Erreur de connexion neurale. Réessaie.", timestamp: new Date() };
        setChatHistory(prev => [...prev, aiMsg]);
    }
    setIsChatLoading(false);
  };

  const resetChatHistory = () => setChatHistory([]);

  const clearAllData = () => {
    localStorage.clear();
    setHabits([]);
    setJournalEntries([]);
    setNotes([]);
    setIsPremium(false);
    setChatHistory([]);
    setUserStats({ level: 1, currentThreshold: 40, attributeXP: {
      [AttributeType.SANTE_SPORT]: 0, [AttributeType.SOCIAL]: 0, [AttributeType.SAVOIR]: 0, [AttributeType.TRAVAIL]: 0, [AttributeType.CREATIVITE]: 0
    }});
  };

  return (
    <CoreContext.Provider value={{
      habits, journalEntries, notes, isPremium, upgradeToPremium, resetPremium, userStats, promoteUser,
      chatHistory, isChatLoading, sendChatMessage, generateDailyProtocol, resetChatHistory,
      coachMode, setCoachMode, coachInput, setCoachInput,
      setHabits, addHabit, toggleHabitCompletion, updateHabitProgress, deleteHabit,
      activeHabitId, toggleHabitFocus,
      saveDailyEntry, deleteJournalEntry,
      createNote, updateNote, deleteNote,
      calculateCompletionRate, getDailyCompletionRate, getGlobalConsistency, clearAllData
    }}>
      {children}
    </CoreContext.Provider>
  );
};