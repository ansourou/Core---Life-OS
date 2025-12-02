import React from 'react';
import { RPGStat, AttributeType } from '../types';
import { ATTRIBUTE_THEME } from '../constants';

interface Props {
  type: AttributeType;
  stat: RPGStat;
}

const RPGStatCard: React.FC<Props> = ({ type, stat }) => {
  const theme = ATTRIBUTE_THEME[type];
  const Icon = theme.icon;
  const progress = Math.min(100, (stat.currentXP / stat.nextLevelXP) * 100);

  return (
    <div className="bg-core-card rounded-3xl p-5 relative overflow-hidden group hover:bg-[#252525] transition-colors duration-300 shadow-sm border border-white/5">
      
      <div className="flex justify-between items-start mb-4">
        {/* Icon & Title */}
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-2xl bg-[#141414] border border-white/5 ${theme.color} group-hover:scale-110 transition-transform duration-300`}>
            <Icon size={20} strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-sm font-heading font-semibold text-slate-200">{type}</h3>
            <p className="text-[10px] text-slate-500 font-medium">Niveau {stat.level}</p>
          </div>
        </div>

        {/* XP Text */}
        <div className="text-right">
           <span className="text-xs font-medium text-slate-400">
            {stat.currentXP} <span className="text-slate-600">/ {stat.nextLevelXP} XP</span>
           </span>
        </div>
      </div>

      {/* Elegant Progress Bar */}
      <div className="h-1.5 w-full bg-[#141414] rounded-full overflow-hidden">
        <div 
          className={`h-full ${theme.gradient} transition-all duration-700 ease-out shadow-[0_0_10px_rgba(0,0,0,0.1)]`} 
          style={{ width: `${progress}%`, boxShadow: `0 0 8px ${theme.color}` }}
        />
      </div>
    </div>
  );
};

export default RPGStatCard;