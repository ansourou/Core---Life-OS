
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useCore } from './context/CoreContext';
import { HabitCategory, AttributeType, TimeOfDay } from './types';
import { ATTRIBUTE_THEME, ATTRIBUTE_SHORT, LEVEL_THEMES } from './constants';
import { 
  LayoutGrid, Calendar, Bot, BookOpen, BarChart3, 
  Trash2, Check, User, 
  Moon, Sun, ArrowRight, Loader2, Sparkles, Plus, RefreshCw, Layers, X, ChevronLeft, ChevronRight, Edit3, Save, AlertTriangle, Clock,
  HeartPulse, Zap, Users, Palette, Target, Award, ArrowUp
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, Tooltip, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

// --- REUSABLE COMPONENTS ---

// 1. Full Screen Modal Wrapper (Restored to Bubble with Dark Overlay)
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode }> = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop - High opacity dark overlay (No Blur) */}
            <div 
                className="absolute inset-0 bg-[#000000]/90 transition-opacity duration-300" 
                onClick={onClose} 
            />
            
            {/* Modal Content - Bubble style */}
            <div className="relative z-10 bg-[#1F1F1F] w-[90%] max-w-[340px] rounded-[32px] p-6 border border-white/10 shadow-2xl animate-in zoom-in-95 fade-in duration-300">
                {children}
            </div>
        </div>
    );
};

// Updated PageHeader with top alignment to match actions with Title
const PageHeader: React.FC<{ title: string, subtitle?: string, action?: React.ReactNode }> = ({ title, subtitle, action }) => (
  <div className="flex justify-between items-start mb-4 shrink-0 h-[60px]">
    <div>
      <h1 className="text-3xl font-heading font-bold text-white tracking-tight leading-none">{title}</h1>
      <p className="text-sm text-slate-500 font-medium mt-1 h-5 flex items-center">{subtitle || '\u00A0'}</p>
    </div>
    {action && <div className="-mt-1.5">{action}</div>}
  </div>
);

// --- LAYOUT WRAPPERS ---

const ScrollablePage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="h-full overflow-y-auto px-4 pt-10 pb-36 no-scrollbar">
    {children}
  </div>
);

const FixedPage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="h-full flex flex-col px-4 pt-10 pb-36 overflow-hidden">
    {children}
  </div>
);

// --- HEATMAP COMPONENT ---
const Heatmap: React.FC<{ range: 'week' | 'month' | 'year', date: Date }> = ({ range, date }) => {
    const { habits } = useCore();
    
    // Generate dates based on calendar periods
    const dates = useMemo(() => {
        const result: (Date | null)[] = [];
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();

        if (range === 'week') {
            // Find Monday of the current week
            const dayOfWeek = date.getDay() || 7; // 1 (Mon) - 7 (Sun)
            const startOfWeek = new Date(date);
            startOfWeek.setDate(day - dayOfWeek + 1);
            
            for (let i = 0; i < 7; i++) {
                const d = new Date(startOfWeek);
                d.setDate(startOfWeek.getDate() + i);
                result.push(d);
            }
        } else if (range === 'month') {
            // Proper Calendar Alignment
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const firstDayOfWeek = new Date(year, month, 1).getDay() || 7; // 1-7
            
            // Pad start
            for (let i = 1; i < firstDayOfWeek; i++) {
                result.push(null);
            }
            
            for (let i = 1; i <= daysInMonth; i++) {
                result.push(new Date(year, month, i));
            }
        } else if (range === 'year') {
            // Generate all days of the year
            const start = new Date(year, 0, 1);
            const end = new Date(year, 11, 31);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                result.push(new Date(d));
            }
        }
        return result;
    }, [range, date]);

    const getIntensity = (d: Date | null) => {
        if (!d) return 0;
        
        // FIX: Construct YYYY-MM-DD from local date components to match cell intention
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        // Check if date is in future (Strict Comparison using strings)
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        if (dateStr > todayStr) return -1; // Future

        if (habits.length === 0) return 0;

        let completed = 0;
        habits.forEach(h => {
            if (h.history.includes(dateStr)) completed++;
        });
        const pct = completed / habits.length;
        if (pct === 0) return 0;
        if (pct < 0.4) return 1;
        if (pct < 0.7) return 2;
        return 3;
    };

    const isYear = range === 'year';
    
    // Grid Setup
    
    return (
        <div className={`w-full ${isYear ? 'flex flex-wrap justify-center gap-[3px] max-w-[340px]' : 'grid grid-cols-7 gap-2'}`}>
            {/* Weekday Headers for Month/Week view */}
            {!isYear && (
                <>
                    {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(day => (
                        <div key={day} className="text-center text-[10px] font-bold text-slate-500 mb-1">
                            {day}
                        </div>
                    ))}
                </>
            )}

            {dates.map((d, i) => {
                if (!d) {
                    return <div key={`empty-${range}-${i}`} className="aspect-square" />;
                }

                const intensity = getIntensity(d);
                const isToday = d.toDateString() === new Date().toDateString();
                
                let bg = ''; 
                
                // Visual Design - Ultra Rounded with clearer Contrast
                if (intensity === -1) {
                    bg = 'bg-[#121212] border border-white/5'; // Future (Very Dark + subtle border)
                } else if (intensity === 0) {
                    bg = 'bg-[#2A2A2A]'; // Empty (Lighter Grey, clearly visible)
                } else if (intensity === 1) {
                    bg = 'bg-[#FF8C42] opacity-30';
                } else if (intensity === 2) {
                    bg = 'bg-[#FF8C42] opacity-60';
                } else if (intensity === 3) {
                    bg = 'bg-gradient-sunset shadow-[0_0_12px_rgba(255,140,66,0.3)]';
                }

                // Shapes - "Arrondi tout"
                const cellClass = isYear 
                    ? 'w-2 h-2 rounded-full' 
                    : 'aspect-square rounded-2xl flex items-center justify-center relative';

                // Ring Logic: Added ring to Year view (ring-1) and Month/Week (ring-2)
                // Using isToday check regardless of view
                const ringClass = isToday 
                    ? (isYear ? 'ring-1 ring-white/80 z-10' : 'ring-2 ring-white/50') 
                    : '';

                return (
                    <div 
                        // Key fix: Included `range` in key. This forces React to destroy and recreate elements 
                        // when switching views (e.g., Year -> Month) instead of trying to animate the class change,
                        // which caused the unwanted morphing animation.
                        key={`${range}-${d.toISOString()}`} 
                        className={`
                            ${cellClass} 
                            ${bg} 
                            ${ringClass}
                            transition-all duration-300
                            cursor-default
                        `} 
                    >
                         {/* Tooltip */}
                         <div className="hidden md:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 backdrop-blur text-white text-[10px] rounded-lg border border-white/10 opacity-0 hover:opacity-100 pointer-events-none whitespace-nowrap z-20">
                            {d.toLocaleDateString()}
                         </div>
                    </div>
                );
            })}
        </div>
    );
};

// --- RADAR COMPONENT (V2 Hard Mode) ---
const RadarWidget: React.FC = () => {
    const { userStats } = useCore();
    const { attributeXP, level, currentThreshold } = userStats;

    // Normalize data: Value is % of current threshold
    const data = Object.values(AttributeType).map(attr => {
        const xp = attributeXP[attr];
        const progress = Math.min(100, (xp / currentThreshold) * 100);
        
        // Base visual offset (the hole in the middle)
        const baseVisualOffset = 40; // 40% offset

        return {
            subject: ATTRIBUTE_SHORT[attr],
            rawScore: xp,
            // Draw chart from 40 to 140
            A: progress + baseVisualOffset,
            fullMark: 140, 
            percentage: Math.round(progress)
        };
    });

    // Custom Tick Component to render Icons instead of Text
    const CustomTick = ({ payload, x, y, cx, cy, ...rest }: any) => {
        const shortToLong: Record<string, AttributeType> = {
            'SAN': AttributeType.SANTE_SPORT,
            'SOC': AttributeType.SOCIAL,
            'SAV': AttributeType.SAVOIR,
            'TRA': AttributeType.TRAVAIL,
            'CRE': AttributeType.CREATIVITE,
        };
        
        const attrType = shortToLong[payload.value];
        const theme = ATTRIBUTE_THEME[attrType];
        const Icon = theme?.icon || Sparkles;
        const xp = attributeXP[attrType];
        
        // Progression % (0 to 1)
        const progress = Math.min(1, Math.max(0, xp / currentThreshold));
        const isMaxed = progress >= 1;

        // Logic to push icons away from the center to detach them from the radar
        const distance = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
        const dirX = distance > 0 ? (x - cx) / distance : 0;
        const dirY = distance > 0 ? (y - cy) / distance : 0;

        const offset = 12; 
        const newX = x + dirX * offset;
        const newY = y + dirY * offset;
        
        // Unique ID for the clip path
        const uniqueId = `tick-clip-${payload.value}`;

        return (
            <g transform={`translate(${newX - 8},${newY - 8})`}>
                <defs>
                     <clipPath id={uniqueId}>
                        {/* A rectangle that fills from bottom up based on progress */}
                        <rect x="0" y={16 * (1 - progress)} width="16" height={16 * progress} />
                     </clipPath>
                </defs>
                
                {/* 1. Base Gray Icon (Background) */}
                <Icon size={16} color="#64748b" strokeWidth={2} />
                
                {/* 2. Colored Icon Overlay with Vertical Fill (Masked) */}
                <g clipPath={`url(#${uniqueId})`}>
                    <Icon 
                        size={16} 
                        stroke="url(#sunsetStroke)"
                        strokeWidth={2} 
                        className={`transition-all duration-300 ${isMaxed ? 'drop-shadow-[0_0_8px_rgba(255,140,66,0.8)]' : ''}`}
                    />
                </g>
            </g>
        );
    };

    return (
        <div className="relative w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="54%" outerRadius="74%" data={data}>
                    <defs>
                        <radialGradient id="sunsetRadial" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                            <stop offset="0%" stopColor="#FFC857" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#FF8C42" stopOpacity={0.05} />
                        </radialGradient>
                        <linearGradient id="sunsetStroke" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#FF8C42" />
                            <stop offset="100%" stopColor="#FFC857" />
                        </linearGradient>
                        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="4" in="SourceGraphic" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    
                    {/* Pentagon Grid */}
                    <PolarGrid gridType="polygon" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
                    
                    <PolarAngleAxis 
                        dataKey="subject" 
                        tick={(props) => <CustomTick {...props} />}
                    />
                    
                    {/* Axis hidden but configured with domain to handle offset */}
                    <PolarRadiusAxis angle={30} domain={[0, 140]} tick={false} axisLine={false} />
                    
                    <Radar
                        name="Skills"
                        dataKey="A"
                        stroke="url(#sunsetStroke)"
                        strokeWidth={3}
                        fill="url(#sunsetRadial)"
                        fillOpacity={0.35}
                        isAnimationActive={true}
                        filter="url(#glow)"
                    />
                </RadarChart>
            </ResponsiveContainer>
            
            {/* Center Level Indicator */}
            <div className="absolute top-[54%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-[10px] text-white font-bold uppercase tracking-widest leading-none mb-1 opacity-80">NIV</div>
                <div className="text-3xl font-heading font-bold leading-none text-white drop-shadow-lg">{level}</div>
            </div>
        </div>
    );
};

// --- 1. DASHBOARD (Accueil) ---
const Dashboard: React.FC = () => {
  const { activeHabitId, habits, toggleHabitFocus, userStats, promoteUser } = useCore();
  const activeHabit = useMemo(() => habits.find(h => h.id === activeHabitId), [habits, activeHabitId]);
  
  // Calculate Promotion Readiness
  const completedStats = Object.values(userStats.attributeXP).filter(xp => xp >= userStats.currentThreshold).length;
  const isReadyForPromotion = completedStats === 5; // 5 pillars

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const completedToday = habits.filter(h => h.history.includes(new Date().toISOString().split('T')[0])).length;

  return (
    <FixedPage>
        <PageHeader 
            title="Dashboard" 
            subtitle="Vue d'ensemble" 
        />

        <div className="flex-1 flex flex-col gap-4 min-h-0">
            {/* FOCUS WIDGET (If Active) */}
            {activeHabit && (
                <div className="bg-[#1F1F1F] rounded-[32px] p-6 border border-white/5 shadow-glow flex items-center justify-between animate-in slide-in-from-top-4 shrink-0">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-core-primary opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-core-primary"></span>
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider text-core-primary">Focus Actif</span>
                        </div>
                        <h3 className="text-lg font-bold text-white">{activeHabit.title}</h3>
                    </div>
                    <div className="text-3xl font-heading font-bold text-[#FFC857] tabular-nums tracking-tight">
                        {formatTime(activeHabit.focusSeconds)}
                    </div>
                </div>
            )}

            {/* RADAR & PROMOTION UI */}
            <div className="bg-[#1F1F1F] rounded-[32px] border border-white/5 shadow-lg relative flex flex-col items-center justify-center flex-1 min-h-[220px]">
                
                {/* PROMOTION OVERLAY (Only if ready) */}
                {isReadyForPromotion && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#141414]/95 backdrop-blur-md rounded-[32px] animate-in fade-in p-6 text-center">
                        <Award size={56} className="text-[#FFC857] mb-4 drop-shadow-[0_0_20px_rgba(255,200,87,0.5)] animate-bounce" />
                        
                        <h3 className="text-2xl font-heading font-bold text-white mb-2">Niveau Maîtrisé !</h3>
                        <p className="text-slate-400 text-sm font-medium mb-8">Tu as validé tous tes objectifs.</p>

                        <button 
                            onClick={promoteUser}
                            className="group w-full max-w-[280px] py-4 bg-gradient-sunset rounded-2xl text-white font-bold text-xs tracking-widest shadow-glow hover:scale-[1.02] transition-transform uppercase flex items-center justify-center gap-3"
                        >
                            <span>Passer au niveau supérieur</span>
                            <div className="bg-white/20 rounded-full p-1 group-hover:bg-white/30 transition">
                                <ArrowRight size={14} strokeWidth={3} />
                            </div>
                        </button>
                    </div>
                )}

                <RadarWidget />
            </div>

            {/* Summary Card - Compact */}
            <div className="bg-[#1F1F1F] p-6 rounded-[32px] border border-white/5 text-center shadow-lg shrink-0">
                 <h3 className="text-3xl font-heading font-bold text-white mb-1">{completedToday}/{habits.length}</h3>
                 <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Tâches Complétées</p>
                 
                 <div className="mt-4 flex justify-center">
                     <div className="w-full max-w-[200px] h-1 bg-white/10 rounded-full overflow-hidden">
                         <div 
                            className="h-full bg-gradient-sunset transition-all duration-1000" 
                            style={{ width: habits.length ? `${(completedToday / habits.length) * 100}%` : '0%' }} 
                         />
                     </div>
                 </div>
            </div>
        </div>
    </FixedPage>
  );
};

// --- 2. PLANNING (Action) ---
const Planning: React.FC = () => {
  const { habits, toggleHabitCompletion, deleteHabit, addHabit } = useCore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  
  // New Task State
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("09:00");
  const [newCategory, setNewCategory] = useState<HabitCategory>(HabitCategory.TRAVAIL);

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    
    // Infer TimeOfDay
    const hour = parseInt(newTime.split(':')[0]);
    let timeOfDay: TimeOfDay = 'morning';
    if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
    if (hour >= 18) timeOfDay = 'evening';

    addHabit(newTitle, newCategory, timeOfDay, 'simple', 1, newTime);
    
    // Reset
    setNewTitle("");
    setNewTime("09:00");
    setShowAddModal(false);
  };

  const handleDelete = () => {
      if (deleteConfirmationId) {
          deleteHabit(deleteConfirmationId);
          setDeleteConfirmationId(null);
      }
  };
  
  const sortedHabits = useMemo(() => {
     // Simple Sort by Time String HH:MM
     return [...habits].sort((a, b) => a.targetTime.localeCompare(b.targetTime));
  }, [habits]);

  const today = new Date().toISOString().split('T')[0];
  const completedCount = habits.filter(h => h.history.includes(today)).length;
  const progress = habits.length > 0 ? (completedCount / habits.length) * 100 : 0;

  return (
    <>
        <ScrollablePage>
          <div className="space-y-6 min-h-full flex flex-col">
            <PageHeader 
                title="Planning" 
                subtitle="Objectifs du jour"
                action={
                    <div className="flex items-center gap-4">
                        {/* Progress Bar (Only if habits exist) */}
                        {habits.length > 0 && (
                            <div className="w-24 text-right">
                                <div className="text-xs font-bold text-slate-400 mb-1">{Math.round(progress)}%</div>
                                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-sunset transition-all duration-500" style={{ width: `${progress}%` }} />
                                </div>
                            </div>
                        )}
                        {/* Add Button - Only show here if there are habits */}
                        {habits.length > 0 && (
                            <button 
                                onClick={() => setShowAddModal(true)}
                                className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-slate-200 transition"
                            >
                                <Plus size={20} strokeWidth={3} />
                            </button>
                        )}
                    </div>
                }
            />

            {habits.length === 0 && (
               <div className="text-center py-20 flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in-95">
                  <button 
                      onClick={() => setShowAddModal(true)}
                      className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 transition-transform shadow-glow mb-6"
                  >
                      <Plus size={48} strokeWidth={2.5} />
                  </button>
                  <p className="text-slate-600 text-sm font-medium tracking-wide">Planning vide</p>
               </div>
            )}

            {/* NEW CENTERED TIMELINE */}
            {habits.length > 0 && (
                <div className="flex-1 pb-10">
                    {sortedHabits.map((habit, index) => {
                        const isDone = habit.history.includes(today);
                        const isLast = index === sortedHabits.length - 1;
                        const isFirst = index === 0;

                        return (
                            <div key={habit.id} className="flex items-center gap-3 group min-h-[80px]">
                                {/* COLUMN 1: TIME (Explicitly centered) */}
                                <div className="w-14 text-right shrink-0 flex items-center justify-end">
                                    <span className={`font-sans text-xs font-bold leading-none tracking-tight translate-y-[1px] ${isDone ? 'text-[#FFC857]' : 'text-slate-500'}`}>
                                        {habit.targetTime}
                                    </span>
                                </div>

                                {/* COLUMN 2: VISUAL LINE (Centered) */}
                                <div className="relative w-6 flex flex-col items-center self-stretch justify-center">
                                    {/* Top Line Segment (Hidden for first item) */}
                                    {!isFirst && <div className="absolute top-0 bottom-1/2 w-[1px] bg-white/10" />}
                                    
                                    {/* Bottom Line Segment (Hidden for last item) */}
                                    {!isLast && <div className="absolute top-1/2 bottom-0 w-[1px] bg-white/10" />}
                                    
                                    {/* The Dot (Small, delicate, colored only when done) */}
                                    <div className={`relative z-10 w-3 h-3 rounded-full transition-all duration-300 border 
                                        ${isDone 
                                            ? 'bg-gradient-sunset border-transparent shadow-[0_0_10px_rgba(255,200,87,0.4)] scale-125' 
                                            : 'bg-[#141414] border-white/20'}`} 
                                    />
                                </div>

                                {/* COLUMN 3: CARD CONTENT */}
                                <div className="flex-1 py-1">
                                    <div 
                                        className={`relative p-5 rounded-3xl border transition-all duration-300 cursor-pointer
                                        ${isDone 
                                            ? 'bg-[#141414] border-white/5 opacity-60' 
                                            : 'bg-[#1F1F1F] border-white/5 hover:border-white/10 shadow-sm hover:shadow-glow'
                                        }`}
                                        onClick={() => toggleHabitCompletion(habit.id, today)}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h3 className={`font-bold text-base transition-colors ${isDone ? 'text-slate-500 line-through' : 'text-white'}`}>
                                                    {habit.title}
                                                </h3>
                                                <div className="text-[10px] font-bold uppercase tracking-wider mt-1 text-slate-500">
                                                    {habit.category}
                                                </div>
                                            </div>

                                            {/* Checkbox Visual */}
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-300 ml-4
                                                ${isDone ? 'bg-gradient-sunset border-transparent text-white' : 'border-slate-700 text-transparent'}`}>
                                                <Check size={14} strokeWidth={4} />
                                            </div>
                                        </div>
                                        
                                        {!isDone && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setDeleteConfirmationId(habit.id); }}
                                                className="absolute -top-2 -right-2 p-2 bg-[#141414] border border-white/10 rounded-full text-slate-500 hover:text-red-500 hover:border-red-500/50 transition opacity-0 group-hover:opacity-100 shadow-lg"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
          </div>
        </ScrollablePage>

        {/* CREATE MODAL */}
        <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)}>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-heading font-bold text-white">Nouvelle Tâche</h3>
                <button onClick={() => setShowAddModal(false)} className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10">
                    <X size={16} />
                </button>
            </div>
            
            <div className="space-y-4">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-2">Titre</label>
                    <input 
                        autoFocus
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Ex: Sport à 10h, réunion à 14h, lire ce soir..."
                        className="w-full bg-[#141414] rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-core-primary/50"
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-2">Heure</label>
                        <input 
                            type="time"
                            value={newTime}
                            onChange={(e) => setNewTime(e.target.value)}
                            className="w-full bg-[#141414] rounded-xl px-4 py-3 text-white font-mono focus:outline-none"
                        />
                    </div>
                        <div>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-2">Catégorie</label>
                        <select 
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value as HabitCategory)}
                            className="w-full bg-[#141414] rounded-xl px-4 py-3 text-white text-sm focus:outline-none appearance-none"
                        >
                            {Object.values(HabitCategory).map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <button 
                    onClick={handleCreate}
                    disabled={!newTitle.trim()}
                    className="w-full py-4 mt-2 bg-gradient-sunset rounded-xl text-white font-bold text-sm shadow-glow hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:scale-100"
                >
                    Ajouter au planning
                </button>
            </div>
        </Modal>

        {/* DELETE CONFIRMATION MODAL */}
        <Modal isOpen={!!deleteConfirmationId} onClose={() => setDeleteConfirmationId(null)}>
            <div className="text-center">
                <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={24} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Supprimer la tâche ?</h3>
                <p className="text-sm text-slate-500 mb-6">Cette action est définitive.</p>
                
                <div className="flex gap-3">
                        <button 
                        onClick={() => setDeleteConfirmationId(null)}
                        className="flex-1 py-3 bg-[#141414] text-white rounded-xl text-sm font-bold hover:bg-white/5 transition"
                        >
                        Annuler
                        </button>
                        <button 
                        onClick={handleDelete}
                        className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-500/20 hover:bg-red-600 transition"
                        >
                        Confirmer
                        </button>
                </div>
            </div>
        </Modal>
    </>
  );
};

// --- 3. COACH (Strategy) ---
const Coach: React.FC = () => {
    const { 
        chatHistory, sendChatMessage, isChatLoading, generateDailyProtocol, habits,
        coachMode, setCoachMode, coachInput, setCoachInput // Using Global Context State
    } = useCore();
    const [chatInput, setChatInput] = useState("");
    
    // NOTE: uiState and planInput replaced by context variables for persistence

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [chatHistory, isChatLoading]);

    // Step 1: User clicks "Generate" -> Show input form
    const startGeneration = () => {
        setCoachMode('input');
    };

    // Step 2: User submits goals -> Check habits -> Decide next step
    const handlePlanInputSubmit = () => {
        if (!coachInput.trim()) return;
        
        if (habits.length > 0) {
            setCoachMode('strategy');
        } else {
            generateDailyProtocol('replace', coachInput);
            setCoachMode('idle');
            setCoachInput("");
        }
    };

    // Step 3: User chooses Replace/Append
    const handleStrategyChoice = (mode: 'replace' | 'append') => {
        generateDailyProtocol(mode, coachInput);
        setCoachMode('idle');
        setCoachInput("");
    };

    const cancelGeneration = () => {
        setCoachMode('idle');
        setCoachInput("");
    };

    return (
        <FixedPage>
            <PageHeader title="Coach" subtitle="Stratégie & Soutien" />

            {/* AREA 1: GENERATION INTERFACE (Conditional Rendering) */}
            
            {coachMode === 'idle' && (
                 <div className="mb-6 shrink-0">
                   <button 
                     onClick={startGeneration}
                     disabled={isChatLoading}
                     className="w-full p-6 bg-gradient-sunset rounded-[32px] text-left shadow-glow hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:scale-100 relative overflow-hidden group"
                   >
                      <div className="relative z-10 flex justify-between items-center">
                          <div>
                              <h3 className="text-xl font-bold text-white mb-1">
                                  Générer mon Planning
                              </h3>
                              <p className="text-white/80 text-sm font-medium">
                                  Organisation intelligente.
                              </p>
                          </div>
                          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white">
                              {isChatLoading ? <Loader2 className="animate-spin" /> : <Sparkles size={24} />}
                          </div>
                      </div>
                   </button>
                </div>
            )}

            {coachMode === 'input' && (
                <div className="mb-6 bg-[#1F1F1F] border border-white/10 rounded-[28px] p-5 animate-in slide-in-from-top-4 shrink-0">
                    <h3 className="text-white font-bold text-lg mb-2">Quels sont tes objectifs ?</h3>
                    <p className="text-sm text-slate-400 mb-3">Liste ce que tu dois faire aujourd'hui (rdv, sport, études...).</p>
                    <textarea 
                        autoFocus
                        value={coachInput}
                        onChange={(e) => setCoachInput(e.target.value)}
                        placeholder="Ex: Sport à 10h, réunion à 14h, lire ce soir..."
                        className="w-full bg-[#141414] rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-core-primary/50 mb-3 h-20 resize-none"
                    />
                    <div className="flex gap-2">
                        <button onClick={cancelGeneration} className="flex-1 py-3 rounded-xl text-xs font-bold text-slate-500 hover:bg-white/5 transition">
                            Annuler
                        </button>
                        <button onClick={handlePlanInputSubmit} disabled={!coachInput.trim()} className="flex-[2] py-3 bg-white text-black rounded-xl text-xs font-bold hover:bg-slate-200 transition disabled:opacity-50">
                            Continuer
                        </button>
                    </div>
                </div>
            )}

            {coachMode === 'strategy' && (
                <div className="mb-6 bg-[#1F1F1F] border border-white/10 rounded-[28px] p-6 animate-in slide-in-from-top-4 shrink-0">
                    <h3 className="text-white font-bold text-lg mb-2">Tu as déjà un planning.</h3>
                    <p className="text-sm text-slate-400 mb-4">Que faisons-nous des tâches existantes ?</p>
                    <div className="grid grid-cols-2 gap-3">
                         <button 
                            onClick={() => handleStrategyChoice('replace')}
                            className="p-3 bg-red-500/10 text-red-500 rounded-xl text-sm font-bold hover:bg-red-500/20 transition flex flex-col items-center gap-1"
                         >
                            <RefreshCw size={18} />
                            Écraser
                         </button>
                         <button 
                            onClick={() => handleStrategyChoice('append')}
                            className="p-3 bg-core-primary/10 text-core-primary rounded-xl text-sm font-bold hover:bg-core-primary/20 transition flex flex-col items-center gap-1"
                         >
                            <Layers size={18} />
                            Compléter
                         </button>
                    </div>
                    <button onClick={cancelGeneration} className="w-full text-center text-xs text-slate-500 mt-3 underline">Annuler</button>
                </div>
            )}

            {/* AREA 2: CHAT INTERFACE */}
            <div className="flex-1 bg-[#1F1F1F] rounded-[32px] border border-white/5 flex flex-col overflow-hidden relative min-h-0">
                <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                    {chatHistory.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center opacity-30">
                            <Bot size={48} className="text-slate-500 mb-2" />
                            <p className="text-sm font-medium text-slate-400">Je suis à l'écoute.</p>
                        </div>
                    )}
                    {chatHistory.map(msg => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-4 text-sm font-medium leading-relaxed rounded-2xl ${msg.role === 'user' ? 'bg-[#2A2A2A] text-white rounded-br-none' : 'bg-core-primary/10 text-core-primary rounded-bl-none'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isChatLoading && <div className="p-4"><div className="flex gap-1"><span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></span><span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-100"></span><span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-200"></span></div></div>}
                </div>
                
                {/* Chat Input */}
                <div className="p-3 bg-[#141414] m-2 rounded-[24px] flex items-center gap-2 border border-white/5 shrink-0">
                    <input 
                        className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none"
                        placeholder="Message..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (sendChatMessage(chatInput), setChatInput(""))}
                    />
                    <button onClick={() => { sendChatMessage(chatInput); setChatInput(""); }} disabled={!chatInput.trim()} className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition">
                        <ArrowRight size={18} strokeWidth={3} />
                    </button>
                </div>
            </div>
        </FixedPage>
    );
};

// --- 4. JOURNAL (Notepad & Bio-Tracker) ---
const Journal: React.FC = () => {
    const { 
        saveDailyEntry, journalEntries, 
        notes, createNote, updateNote, deleteNote 
    } = useCore();

    // -- State --
    const [view, setView] = useState<'list' | 'editor'>('list');
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

    // -- Bio Tracker State (Daily) --
    const [bedTime, setBedTime] = useState("23:00");
    const [wakeTime, setWakeTime] = useState("07:00");
    const [mood, setMood] = useState(3); // 1-5 Scale for Emojis
    const [bioSaved, setBioSaved] = useState(false);
    
    // Animation control to prevent load-time pop
    const [moodAnimate, setMoodAnimate] = useState(false);

    // -- Editor State --
    const [editTitle, setEditTitle] = useState("");
    const [editContent, setEditContent] = useState("");

    // Enable animations shortly after mount
    useEffect(() => {
        const timer = setTimeout(() => setMoodAnimate(true), 300);
        return () => clearTimeout(timer);
    }, []);

    // Load today's bio data
    useEffect(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayEntry = journalEntries.find(e => e.date.startsWith(todayStr));
        if (todayEntry) {
            setBedTime(todayEntry.sleepBedTime);
            setWakeTime(todayEntry.sleepWakeTime);
            setMood(Math.min(5, Math.max(1, Math.round(todayEntry.mood / 2)))); // Convert 0-10 to 1-5 roughly
            setBioSaved(true);
        }
    }, [journalEntries]);

    // Handle Bio Save (Button Trigger)
    const handleBioSave = () => {
        saveDailyEntry({ 
            sleepBedTime: bedTime, 
            sleepWakeTime: wakeTime, 
            mood: mood * 2 // Store as 0-10 scale in backend to match types, but UI uses 1-5
        });
        setBioSaved(true);
    };

    // Note Navigation
    const openNote = (id: string) => {
        const n = notes.find(note => note.id === id);
        if (n) {
            setActiveNoteId(id);
            setEditTitle(n.title);
            setEditContent(n.content);
            setView('editor');
        }
    };

    const handleCreateNote = () => {
        const id = createNote();
        openNote(id);
    };

    const handleNoteSave = () => {
        if (activeNoteId) {
            updateNote(activeNoteId, editTitle, editContent);
        }
    };

    const handleBackToList = () => {
        // Auto-cleanup if empty
        if (!editTitle.trim() && !editContent.trim() && activeNoteId) {
             deleteNote(activeNoteId);
        } else {
             handleNoteSave();
        }
        setView('list');
        setActiveNoteId(null);
    };

    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setDeleteNoteId(id);
    };

    const confirmDelete = () => {
        if (deleteNoteId) {
            deleteNote(deleteNoteId);
            setDeleteNoteId(null);
        }
    };

    // Auto-save effect in editor
    useEffect(() => {
        const timer = setTimeout(() => {
            if (view === 'editor' && activeNoteId) {
                // We only auto-save if there is content, to avoid fighting with the "delete on back" logic
                // if the user is slowly typing. But actually, updating the note with "" is fine 
                // because handleBackToList checks the state variables editTitle/editContent, not the store.
                handleNoteSave();
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [editTitle, editContent, activeNoteId, view]);

    if (view === 'editor') {
        return (
            <FixedPage>
                <div className="flex items-center justify-between mb-4 shrink-0 h-[60px]">
                    <button onClick={handleBackToList} className="flex items-center gap-1 hover:opacity-80 transition">
                        <ChevronLeft size={20} className="text-[#FF8C42]" />
                        <span className="font-bold text-sm bg-gradient-sunset bg-clip-text text-transparent">Notes</span>
                    </button>
                    <button onClick={handleBackToList} className="font-bold text-sm bg-gradient-sunset bg-clip-text text-transparent">OK</button>
                </div>
                
                <div className="flex-1 bg-[#1F1F1F] rounded-[32px] border border-white/5 p-6 shadow-inner flex flex-col min-h-0 animate-in slide-in-from-right-4">
                    <input 
                        value={editTitle} 
                        onChange={e => setEditTitle(e.target.value)}
                        placeholder="Titre de la note"
                        className="bg-transparent text-2xl font-heading font-bold text-[#FFC857] placeholder-slate-600 focus:outline-none mb-4 w-full caret-[#FFC857]"
                    />
                    <textarea 
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        placeholder="Commencez à écrire..."
                        className="flex-1 w-full bg-transparent text-base leading-relaxed text-slate-300 placeholder-slate-700 resize-none focus:outline-none font-sans caret-[#FFC857]"
                        autoFocus
                    />
                    <div className="text-[10px] text-slate-600 mt-2 text-center">
                        {activeNoteId && "Dernière modification : " + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                </div>
            </FixedPage>
        );
    }

    // LIST VIEW
    return (
        <>
        <FixedPage>
            <PageHeader title="Journal" subtitle="Suivi & Réflexions" action={
                <button onClick={handleCreateNote} className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition shadow-glow">
                    <Edit3 size={18} />
                </button>
            }/>

            {/* BIO TRACKER WIDGET (UNIFIED & CLEAN) */}
            <div className="mb-6 shrink-0">
              <div className="bg-[#1F1F1F] rounded-[32px] border border-white/5 shadow-lg overflow-hidden flex flex-col">
                  
                  {/* Row 1: Sleep Times */}
                  <div className="flex divide-x divide-white/5">
                      {/* Bedtime */}
                      <div className="flex-1 py-4 flex flex-col items-center justify-center">
                         <div className="flex items-center gap-2 mb-1">
                             <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Coucher</span>
                             <Moon size={12} className="text-slate-500" />
                         </div>
                         <input 
                            type="time" 
                            value={bedTime} 
                            onChange={e => setBedTime(e.target.value)} 
                            className="bg-transparent font-heading text-lg font-bold text-white focus:outline-none w-auto text-center" 
                         />
                      </div>
                      
                      {/* Wake Time */}
                      <div className="flex-1 py-4 flex flex-col items-center justify-center">
                         <div className="flex items-center gap-2 mb-1">
                             <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Lever</span>
                             <Sun size={12} className="text-slate-500" />
                         </div>
                         <input 
                            type="time" 
                            value={wakeTime} 
                            onChange={e => setWakeTime(e.target.value)} 
                            className="bg-transparent font-heading text-lg font-bold text-white focus:outline-none w-auto text-center" 
                         />
                      </div>
                  </div>
                  
                  <div className="h-[1px] bg-white/5 w-full"></div>

                  {/* Row 2: Mood & Save */}
                  <div className="flex items-center justify-between px-6 py-3">
                      <div className="flex items-center gap-4">
                           {[1, 2, 3, 4, 5].map(m => (
                              <button 
                                  key={m} 
                                  onClick={() => setMood(m)} 
                                  className={`text-2xl ${moodAnimate ? 'transition-all duration-300' : ''} hover:scale-110 active:scale-95 ${mood === m ? 'scale-125 opacity-100 filter-none drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'opacity-20 grayscale hover:opacity-40'}`}
                              >
                                  {m === 1 ? '😫' : m === 2 ? '😞' : m === 3 ? '😐' : m === 4 ? '🙂' : '🤩'}
                              </button>
                          ))}
                      </div>

                      <button 
                          onClick={handleBioSave}
                          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${bioSaved ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-gradient-sunset text-white hover:scale-105'}`}
                      >
                          {bioSaved ? <Check size={20} strokeWidth={3} /> : <Save size={20} strokeWidth={2.5} />}
                      </button>
                  </div>
              </div>
            </div>

            {/* NOTES LIST */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-3 no-scrollbar pb-4">
                {notes.length === 0 ? (
                    <div className="text-center py-10 opacity-30">
                        <BookOpen size={40} className="mx-auto mb-2 text-slate-500" />
                        <p className="text-sm font-medium">Aucune note</p>
                    </div>
                ) : (
                    notes.map(note => (
                        <div 
                            key={note.id} 
                            onClick={() => openNote(note.id)}
                            className="bg-[#1F1F1F] p-5 rounded-[24px] border border-white/5 hover:bg-[#252525] transition cursor-pointer group relative"
                        >
                            <h3 className={`font-bold text-base mb-1 ${!note.title ? 'text-slate-500 italic' : 'text-white'}`}>
                                {note.title || "Nouvelle note"}
                            </h3>
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                {note.content || "Aucun contenu..."}
                            </p>
                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
                                <span className="text-[10px] text-slate-600">
                                    {new Date(note.updatedAt).toLocaleDateString()}
                                </span>
                                <button 
                                    onClick={(e) => handleDeleteClick(e, note.id)} 
                                    className="p-1.5 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </FixedPage>

        {/* DELETE CONFIRMATION MODAL */}
        <Modal isOpen={!!deleteNoteId} onClose={() => setDeleteNoteId(null)}>
            <div className="text-center">
                <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={24} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Supprimer la note ?</h3>
                <p className="text-sm text-slate-500 mb-6">Cette action est définitive.</p>
                
                <div className="flex gap-3">
                        <button 
                        onClick={() => setDeleteNoteId(null)}
                        className="flex-1 py-3 bg-[#141414] text-white rounded-xl text-sm font-bold hover:bg-white/5 transition"
                        >
                        Annuler
                        </button>
                        <button 
                        onClick={confirmDelete}
                        className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-500/20 hover:bg-red-600 transition"
                        >
                        Confirmer
                        </button>
                </div>
            </div>
        </Modal>
        </>
    );
};

// --- 5. VISION (Heatmap) ---
const Vision: React.FC = () => {
    const [range, setRange] = useState<'week' | 'month' | 'year'>('month');
    const [currentDate, setCurrentDate] = useState(new Date());

    const handlePrev = () => {
        const d = new Date(currentDate);
        if (range === 'week') d.setDate(d.getDate() - 7);
        else if (range === 'month') { d.setDate(1); d.setMonth(d.getMonth() - 1); }
        else d.setFullYear(d.getFullYear() - 1);
        setCurrentDate(d);
    };

    const handleNext = () => {
        const d = new Date(currentDate);
        if (range === 'week') d.setDate(d.getDate() + 7);
        else if (range === 'month') { d.setDate(1); d.setMonth(d.getMonth() + 1); }
        else d.setFullYear(d.getFullYear() + 1);
        setCurrentDate(d);
    };

    // Specific handler for independent Month/Year changes
    const changeDate = (type: 'month' | 'year', delta: number) => {
        const d = new Date(currentDate);
        d.setDate(1); // Safely reset to 1st to avoid overflow (e.g. Jan 31 -> Feb 31 -> Mar 3)
        if (type === 'month') d.setMonth(d.getMonth() + delta);
        if (type === 'year') d.setFullYear(d.getFullYear() + delta);
        setCurrentDate(d);
    };

    const periodLabel = useMemo(() => {
        if (range === 'week') {
             // Find start of week
             const day = currentDate.getDay() || 7;
             const start = new Date(currentDate);
             start.setDate(currentDate.getDate() - day + 1);
             const end = new Date(start);
             end.setDate(start.getDate() + 6);
             
             const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
             const startStr = start.toLocaleDateString('default', options);
             const endStr = end.toLocaleDateString('default', options);
             return `${startStr} - ${endStr}`;
        }
        if (range === 'month') {
            return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        }
        return currentDate.getFullYear().toString();
    }, [range, currentDate]);

    return (
        <ScrollablePage>
            <div className="space-y-6 min-h-full flex flex-col">
                <PageHeader title="Vision" subtitle="Constance & Habitudes" />

                {/* Range Selectors */}
                <div className="flex justify-center mb-4">
                    <div className="flex bg-[#1F1F1F] p-1 rounded-full border border-white/5">
                        {['week', 'month', 'year'].map(r => (
                            <button 
                                key={r} 
                                onClick={() => { setRange(r as any); setCurrentDate(new Date()); }}
                                className={`px-6 py-2 rounded-full text-xs font-bold uppercase transition-all ${range === r ? 'bg-white text-black shadow-md' : 'text-slate-500 hover:text-white'}`}
                            >
                                {r === 'week' ? 'Sem' : r === 'month' ? 'Mois' : 'Année'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Navigation & Heatmap */}
                <div className="bg-[#1F1F1F] p-6 rounded-[40px] border border-white/5 flex flex-col items-center shadow-card">
                    
                    {/* Navigation - Adaptive Layout */}
                    <div className="flex items-center justify-center gap-3 mb-6 w-full">
                        {range === 'month' ? (
                            <div className="flex gap-2 w-full justify-center">
                                {/* Month Control */}
                                <div className="flex items-center bg-[#141414] rounded-full p-1 border border-white/5 shadow-inner">
                                    <button onClick={() => changeDate('month', -1)} className="w-8 h-8 rounded-full bg-[#1F1F1F] text-slate-400 hover:text-white hover:bg-white/10 transition flex items-center justify-center border border-white/5">
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className="px-2 min-w-[80px] text-center font-heading font-bold text-white uppercase tracking-wider text-xs">
                                        {currentDate.toLocaleString('default', { month: 'long' })}
                                    </span>
                                    <button onClick={() => changeDate('month', 1)} className="w-8 h-8 rounded-full bg-[#1F1F1F] text-slate-400 hover:text-white hover:bg-white/10 transition flex items-center justify-center border border-white/5">
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                                {/* Year Control */}
                                <div className="flex items-center bg-[#141414] rounded-full p-1 border border-white/5 shadow-inner">
                                    <button onClick={() => changeDate('year', -1)} className="w-8 h-8 rounded-full bg-[#1F1F1F] text-slate-400 hover:text-white hover:bg-white/10 transition flex items-center justify-center border border-white/5">
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className="px-2 min-w-[50px] text-center font-heading font-bold text-white uppercase tracking-wider text-xs">
                                        {currentDate.getFullYear()}
                                    </span>
                                    <button onClick={() => changeDate('year', 1)} className="w-8 h-8 rounded-full bg-[#1F1F1F] text-slate-400 hover:text-white hover:bg-white/10 transition flex items-center justify-center border border-white/5">
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // Existing Single Control for Week/Year
                            <div className="flex items-center bg-[#141414] rounded-full p-1 border border-white/5 shadow-inner">
                                <button onClick={handlePrev} className="w-8 h-8 rounded-full bg-[#1F1F1F] text-slate-400 hover:text-white hover:bg-white/10 transition flex items-center justify-center border border-white/5">
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="px-4 min-w-[120px] text-center font-heading font-bold text-white uppercase tracking-wider text-xs">
                                    {periodLabel}
                                </span>
                                <button onClick={handleNext} className="w-8 h-8 rounded-full bg-[#1F1F1F] text-slate-400 hover:text-white hover:bg-white/10 transition flex items-center justify-center border border-white/5">
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    <Heatmap range={range} date={currentDate} />
                </div>
            </div>
        </ScrollablePage>
    );
};

// --- MAIN NAV & ROUTER ---
function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'planning' | 'coach' | 'journal' | 'vision'>('dashboard');

  const renderContent = () => {
    switch(activeTab) {
        case 'dashboard': return <Dashboard />;
        case 'planning': return <Planning />;
        case 'coach': return <Coach />;
        case 'journal': return <Journal />;
        case 'vision': return <Vision />;
        default: return <Dashboard />;
    }
  };

  const NavItem: React.FC<{ id: string, icon: any }> = ({ id, icon: Icon }) => {
      const isActive = activeTab === id;
      // Correction optique pour l'icône Journal qui paraît visuellement plus haute
      const adjustment = id === 'journal' ? 'translate-y-[2px]' : '';
      
      return (
          <button 
            onClick={() => setActiveTab(id as any)} 
            className={`w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 leading-none ${isActive ? 'text-white bg-white/10' : 'text-slate-500 hover:text-slate-300'}`}
          >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className={adjustment} />
          </button>
      )
  };

  return (
    <div className="fixed inset-0 bg-[#141414] text-[#EDEDED] font-sans selection:bg-core-primary selection:text-white overflow-hidden">
       <main className="max-w-md mx-auto h-full relative flex flex-col">
          {/* Main Content Area: Flex-1 and overflow controlled by pages */}
          <div className="flex-1 w-full relative overflow-hidden">
             {renderContent()}
          </div>
       </main>

       {/* Floating Pill Navigation */}
       <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[88%] max-w-[420px]">
           <div className="flex justify-between items-center bg-[#1F1F1F]/95 backdrop-blur-xl border border-white/10 rounded-full px-8 h-[72px] shadow-2xl">
               <NavItem id="dashboard" icon={LayoutGrid} />
               <NavItem id="planning" icon={Calendar} />
               
               {/* Center Coach Button - Inline and Aligned */}
                <button 
                    onClick={() => setActiveTab('coach')} 
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-glow 
                    ${activeTab === 'coach' ? 'bg-gradient-sunset text-white scale-110' : 'bg-gradient-sunset text-white/90 hover:scale-110'}`}
                >
                    <Sparkles size={24} strokeWidth={2.5} />
                </button>

               <NavItem id="journal" icon={BookOpen} />
               <NavItem id="vision" icon={BarChart3} />
           </div>
       </div>
    </div>
  );
}

export default App;
