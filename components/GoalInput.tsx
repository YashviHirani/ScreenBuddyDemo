import React from 'react';

interface GoalInputProps {
  goal: string;
  setGoal: (goal: string) => void;
  disabled: boolean;
}

export const GoalInput: React.FC<GoalInputProps> = ({ goal, setGoal, disabled }) => {
  return (
    <div className="w-full mb-10 group">
      <div className="flex items-center justify-between mb-3 px-1">
        <label htmlFor="goal" className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 group-focus-within:text-indigo-400 transition-colors">
          Operational Goal
        </label>
        <span className="text-[9px] font-mono text-slate-600 uppercase">Input Terminal v1.0</span>
      </div>
      
      <div className="relative group/input">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-0 group-focus-within/input:opacity-20 transition duration-500"></div>
        
        <input
          type="text"
          id="goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="ENTER YOUR MISSION (E.G. DEBUG REACT HOOKS, DRAFT EMAIL...)"
          className={`relative w-full glass-card bg-slate-900/50 border border-white/10 text-white focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 rounded-2xl py-5 px-6 outline-none transition-all duration-300 placeholder-slate-700 text-lg font-bold tracking-tight uppercase italic`}
        />
        
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
          {disabled ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
               <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
               <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Tracking</span>
            </div>
          ) : (
            <div className="text-slate-700 group-focus-within:text-indigo-500/50 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-3 flex justify-between items-center px-1">
        <p className="text-[10px] text-slate-600 font-medium">Goal refinement is possible in real-time during session.</p>
        <div className="flex gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
           <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
           <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
        </div>
      </div>
    </div>
  );
};