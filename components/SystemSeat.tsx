
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
    // PRIORITIZE NETWORK: If network is down, the box turns BLUE regardless of system.status
    if (isNetworkDown) {
      return 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30';
    }

    switch (system.status) {
      case SystemStatus.WORKING: 
        return 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20';
      case SystemStatus.PARTIAL: 
        // If it's partial but NOT due to network (must be software), return Amber
        return 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/20';
      case SystemStatus.NOT_WORKING: 
        return 'bg-rose-500 hover:bg-rose-400 shadow-rose-500/20';
      default: 
        return 'bg-slate-700';
    }
  };

  const getStatusIcon = () => {
    if (isSelected) return <i className="fa-solid fa-circle-check text-[14px] text-white animate-in zoom-in duration-200"></i>;
    
    // Priority icon for Network
    if (isNetworkDown) return <i className="fa-solid fa-wifi text-[10px] text-white"></i>;

    switch (system.status) {
      case SystemStatus.WORKING: 
        return <i className="fa-solid fa-check text-[10px] text-white"></i>;
      case SystemStatus.PARTIAL: 
        return <i className="fa-solid fa-triangle-exclamation text-[10px] text-white"></i>;
      case SystemStatus.NOT_WORKING: 
        return <i className="fa-solid fa-xmark text-[10px] text-white"></i>;
    }
  };

  return (
    <div 
      onClick={() => onClick(system)}
      className={`
        relative w-full h-full rounded-md cursor-pointer transition-all duration-300 
        flex items-center justify-center border group
        ${isSelected ? 'border-blue-400 ring-4 ring-blue-500/40 scale-105 z-10' : 'border-white/10'}
        ${getStatusColor()}
        shadow-lg
      `}
      title={system.id}
    >
      <div className="flex flex-col items-center gap-0.5">
        <span className={`text-[10px] font-bold uppercase tracking-tighter transition-opacity ${isSelected ? 'opacity-0 h-0' : 'opacity-90'}`}>
          {system.id.split('-')[1]}
        </span>
        {getStatusIcon()}
      </div>

      {/* Booking Badge */}
      {system.bookings.length > 0 && !isSelected && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-slate-900 border border-white/20 rounded-full flex items-center justify-center">
          <span className="text-[8px] font-bold text-white">{system.bookings.length}</span>
        </div>
      )}

      {/* Tooltip on hover */}
      {!isSelected && (
        <div className="absolute bottom-full mb-2 hidden group-hover:block z-50 bg-slate-900 text-white text-[10px] p-2 rounded whitespace-nowrap border border-slate-700 shadow-2xl animate-in fade-in slide-in-from-bottom-1">
          <div className="font-bold border-b border-slate-700 pb-1 mb-1">{system.id}</div>
          <div>CPU: {system.hardware.cpu}</div>
          <div>Net: {system.hardware.network}</div>
          <div className="mt-1 font-semibold uppercase text-slate-400">
            {isNetworkDown ? 'Network Issue' : system.status.replace('_', ' ')}
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemSeat;
