
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
    if (isSelected) return <i className="fa-solid fa-circle-check text-[10px] sm:text-[12px] text-white"></i>;
    if (isNetworkDown) return <i className="fa-solid fa-wifi text-[8px] sm:text-[10px] text-white/70"></i>;
    
    switch (system.status) {
      case SystemStatus.WORKING: return null;
      case SystemStatus.PARTIAL: return <i className="fa-solid fa-triangle-exclamation text-[8px] sm:text-[10px] text-white/70"></i>;
      case SystemStatus.NOT_WORKING: return <i className="fa-solid fa-xmark text-[8px] sm:text-[10px] text-white/70"></i>;
      default: return null;
    }
  };

  // Extract a short identifier for the seat label
  // If there's an alias that differs from the ID and is reasonably short, we use it
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
        ${getStatusColor()}
        shadow-md
      `}
    >
      <div className="flex flex-col items-center">
        <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-tighter transition-opacity ${isSelected ? 'hidden' : 'opacity-80'}`}>
          {seatLabel}
        </span>
        {getStatusIcon()}
      </div>

      {/* Booking Dot */}
      {system.bookings.length > 0 && !isSelected && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full border-2 border-slate-900"></div>
      )}

      {/* Desktop-only Compact Tooltip */}
      <div className="absolute bottom-full mb-2 hidden lg:group-hover:block z-50 bg-slate-950 text-white text-[9px] p-2 rounded-lg shadow-2xl border border-slate-800 pointer-events-none whitespace-nowrap">
        <div className="font-black border-b border-slate-800 mb-1 pb-1">
           {system.name || system.id}
           {system.name && <span className="ml-2 text-slate-500">[{system.id}]</span>}
        </div>
        <div className="flex gap-2">
          <span className="text-slate-500 uppercase font-black">Net:</span>
          <span className={isNetworkDown ? 'text-rose-400' : 'text-emerald-400'}>{system.hardware.network}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-slate-500 uppercase font-black">Maintenance:</span>
          <span className="text-blue-400">{system.logs?.length || 0} logs</span>
        </div>
      </div>
    </div>
  );
};

export default SystemSeat;
