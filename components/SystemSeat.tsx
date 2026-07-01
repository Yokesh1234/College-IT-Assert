import React from 'react';
import { System, SystemStatus, ComponentStatus, TimetableEntry } from '../types';

interface SystemSeatProps {
  system: System;
  isSelected?: boolean;
  isHighlighted?: boolean;
  onClick: (system: System) => void;
  currentClass: TimetableEntry | null;
  currentStatus: 'FREE' | 'RUNNING CLASS' | 'BOOKED' | 'UNDER MAINTENANCE';
  currentPeriodLabel: string;
}

const SystemSeat: React.FC<SystemSeatProps> = ({ 
  system, 
  isSelected, 
  isHighlighted, 
  onClick,
  currentClass,
  currentStatus,
  currentPeriodLabel
}) => {
  const isNetworkDown = system.hardware.network === ComponentStatus.NOT_CONNECTED;

  const getStatusColor = () => {
    if (currentStatus === 'UNDER MAINTENANCE') return 'bg-rose-500 hover:bg-rose-400 shadow-rose-500/20';
    if (currentStatus === 'RUNNING CLASS') return 'bg-violet-600 hover:bg-violet-500 shadow-violet-600/30';
    if (currentStatus === 'BOOKED') return 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/20';
    return 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20';
  };

  const getStatusIcon = () => {
    if (isSelected) return <i className="fa-solid fa-circle-check text-[10px] sm:text-[12px] text-white"></i>;
    if (isNetworkDown) return <i className="fa-solid fa-wifi text-[8px] sm:text-[10px] text-white/70"></i>;
    
    if (currentStatus === 'UNDER MAINTENANCE') {
      return <i className="fa-solid fa-triangle-exclamation text-[8px] sm:text-[10px] text-white/70"></i>;
    }
    if (currentStatus === 'RUNNING CLASS') {
      return <i className="fa-solid fa-graduation-cap text-[8px] sm:text-[10px] text-white/70"></i>;
    }
    if (currentStatus === 'BOOKED') {
      return <i className="fa-solid fa-user-lock text-[8px] sm:text-[10px] text-white/70"></i>;
    }
    return null;
  };

  const seatLabel = system.name && system.name !== system.id 
    ? (system.name.length > 5 ? system.name.substring(0, 4) + '..' : system.name)
    : system.id.split('-')[1];

  return (
    <div 
      onClick={() => onClick(system)}
      className={`
        relative w-full h-full rounded-md cursor-pointer transition-all duration-200 
        flex items-center justify-center border group active:scale-90
        ${isSelected ? 'border-white ring-2 ring-blue-500/50 scale-110 z-10' : 'border-white/5'}
        ${isHighlighted ? 'ring-4 ring-white/50 border-white scale-110 z-20 animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.5)]' : ''}
        ${getStatusColor()}
        shadow-md
      `}
    >
      <div className="flex flex-col items-center">
        <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-tighter transition-opacity ${(isSelected || isHighlighted) ? 'hidden' : 'opacity-80'}`}>
          {seatLabel}
        </span>
        {(isSelected || isHighlighted) ? <i className="fa-solid fa-magnifying-glass text-[10px] sm:text-[12px] text-white"></i> : getStatusIcon()}
      </div>

      {system.bookings.length > 0 && !isSelected && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full border-2 border-slate-900"></div>
      )}

      {/* Expanded Hover Tooltip */}
      <div className="absolute bottom-full mb-2 hidden lg:group-hover:block z-50 bg-slate-950 text-white text-[9px] p-3 rounded-xl shadow-2xl border border-slate-800 pointer-events-none whitespace-nowrap">
        <div className="font-black border-b border-slate-800 mb-2 pb-1.5 flex justify-between gap-4 items-center">
           <span>{system.name || system.id}</span>
           <span className={`px-1.5 py-0.2 rounded font-black text-[8px] ${
             currentStatus === 'UNDER MAINTENANCE' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/10' :
             currentStatus === 'RUNNING CLASS' ? 'bg-violet-500/15 text-violet-400 border border-violet-500/10' :
             currentStatus === 'BOOKED' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/10' :
             'bg-emerald-500/15 text-emerald-400 border border-emerald-500/10'
           }`}>
             {currentStatus}
           </span>
        </div>
        
        {currentStatus === 'RUNNING CLASS' && currentClass && (
          <div className="space-y-1 bg-slate-900 p-2 rounded-lg border border-slate-800 mb-2">
            <div className="flex gap-2">
              <span className="text-slate-500 uppercase font-black">Class:</span>
              <span className="text-violet-300 font-bold">{currentClass.subject} ({currentClass.subjectCode})</span>
            </div>
            <div className="flex gap-2">
              <span className="text-slate-500 uppercase font-black">Lecturer:</span>
              <span className="text-slate-300">{currentClass.faculty}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-slate-500 uppercase font-black">Batch:</span>
              <span className="text-blue-400 font-black">{currentClass.batch}</span>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <div className="flex gap-2">
            <span className="text-slate-500 uppercase font-black">Current Slot:</span>
            <span className="text-slate-300">{currentPeriodLabel}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-slate-500 uppercase font-black">Net Conn:</span>
            <span className={isNetworkDown ? 'text-rose-400' : 'text-emerald-400'}>{system.hardware.network}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-slate-500 uppercase font-black">Admin Logs:</span>
            <span className="text-blue-400">{system.logs?.length || 0} maintenance logs</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSeat;