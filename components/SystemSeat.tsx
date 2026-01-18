
import React from 'react';
import { System, SystemStatus, ComponentStatus } from '../types';

interface SystemSeatProps {
  system: System;
  isSelected?: boolean;
  onClick: (system: System) => void;
}

const SystemSeat: React.FC<SystemSeatProps> = ({ system, isSelected, onClick }) => {
  const isNetworkDown = system.hardware.network === ComponentStatus.NOT_CONNECTED;

  const getStatusColor = () => {
    if (isNetworkDown) return 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30';
    switch (system.status) {
      case SystemStatus.WORKING: return 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20';
      case SystemStatus.PARTIAL: return 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/20';
      case SystemStatus.NOT_WORKING: return 'bg-rose-500 hover:bg-rose-400 shadow-rose-500/20';
      default: return 'bg-slate-700';
    }
  };

  const getStatusIcon = () => {
    if (isSelected) return <i className="fa-solid fa-circle-check text-[10px] text-white"></i>;
    if (isNetworkDown) return <i className="fa-solid fa-wifi text-[8px] text-white/70"></i>;
    
    switch (system.status) {
      case SystemStatus.WORKING: return null;
      case SystemStatus.PARTIAL: return <i className="fa-solid fa-triangle-exclamation text-[8px] text-white/70"></i>;
      case SystemStatus.NOT_WORKING: return <i className="fa-solid fa-xmark text-[8px] text-white/70"></i>;
      default: return null;
    }
  };

  return (
    <div 
      onClick={() => onClick(system)}
      className={`
        relative w-full h-full rounded-sm cursor-pointer transition-all duration-200 
        flex items-center justify-center border group
        ${isSelected ? 'border-white ring-2 ring-blue-500/50 scale-110 z-10' : 'border-white/5'}
        ${getStatusColor()}
        shadow-md
      `}
    >
      <div className="flex flex-col items-center">
        <span className={`text-[7px] font-black uppercase tracking-tighter transition-opacity ${isSelected ? 'hidden' : 'opacity-80'}`}>
          {system.id.split('-')[1]}
        </span>
        {getStatusIcon()}
      </div>

      {/* Booking Dot */}
      {system.bookings.length > 0 && !isSelected && (
        <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-white rounded-full"></div>
      )}

      {/* Compact Tooltip */}
      {!isSelected && (
        <div className="absolute bottom-full mb-2 hidden group-hover:block z-50 bg-slate-900 text-white text-[9px] p-2 rounded shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-1 pointer-events-none whitespace-nowrap">
          <div className="font-black border-b border-slate-700 mb-1 pb-1">{system.id}</div>
          <div className="flex gap-2">
            <span className="text-slate-500 uppercase font-black">Net:</span>
            <span className={isNetworkDown ? 'text-rose-400' : 'text-emerald-400'}>{system.hardware.network}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-slate-500 uppercase font-black">Status:</span>
            <span>{system.status.replace('_', ' ')}</span>
          </div>
          {system.bookings.length > 0 && (
            <div className="mt-1 pt-1 border-t border-slate-800 text-blue-400">
              Active Reservations: {system.bookings.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SystemSeat;
