import React from 'react';
import { Clock, Calendar, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react';

interface TimeSimulatorProps {
  simulatedDay: string;
  simulatedPeriod: number;
  isRealTime: boolean;
  onSetDay: (day: string) => void;
  onSetPeriod: (period: number) => void;
  onToggleRealTime: (val: boolean) => void;
}

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const PERIODS = [
  { p: 1, label: 'Period 1 (9-10 AM)' },
  { p: 2, label: 'Period 2 (10-11 AM)' },
  { p: 3, label: 'Period 3 (11:15 AM-12:15 PM)' },
  { p: 4, label: 'Period 4 (12:15-1:15 PM)' },
  { p: 5, label: 'Period 5 (1:15-2:15 PM)' },
  { p: 6, label: 'Period 6 (2:15-3:15 PM)' }
];

export const TimeSimulator: React.FC<TimeSimulatorProps> = ({
  simulatedDay,
  simulatedPeriod,
  isRealTime,
  onSetDay,
  onSetPeriod,
  onToggleRealTime
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden transition-all">
      {/* Background glowing gradient */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full filter blur-2xl pointer-events-none"></div>
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Title Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600/15 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Time Warp Controller</span>
              <span className="text-[8px] bg-slate-800 px-1.5 py-0.5 rounded text-blue-400 border border-blue-500/10">Active</span>
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">Simulate any class hour to test seat states & booking schedules.</p>
          </div>
        </div>

        {/* Control inputs */}
        <div className="flex flex-wrap items-center gap-4">
          
          {/* Mode Switcher */}
          <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Real Clock</span>
            <button 
              type="button" 
              onClick={() => onToggleRealTime(!isRealTime)}
              className="text-blue-500 transition-colors"
            >
              {isRealTime ? (
                <ToggleRight className="w-6 h-6 text-blue-500" />
              ) : (
                <ToggleLeft className="w-6 h-6 text-slate-600" />
              )}
            </button>
          </div>

          {!isRealTime && (
            <>
              {/* Day picker */}
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <select 
                  value={simulatedDay} 
                  onChange={e => onSetDay(e.target.value)}
                  className="bg-transparent text-[10px] font-black text-slate-300 uppercase tracking-widest outline-none border-0 cursor-pointer"
                >
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* Period picker */}
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <select 
                  value={simulatedPeriod} 
                  onChange={e => onSetPeriod(Number(e.target.value))}
                  className="bg-transparent text-[10px] font-black text-slate-300 uppercase tracking-widest outline-none border-0 cursor-pointer"
                >
                  {PERIODS.map(p => <option key={p.p} value={p.p}>{p.label}</option>)}
                </select>
              </div>
            </>
          )}

          {/* Status Display badge */}
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 border border-blue-500/20 rounded-xl text-blue-400">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-wider">
              {isRealTime ? 'Synced to System Time' : `Simulating ${simulatedDay} @ Period ${simulatedPeriod}`}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};
