
import React from 'react';
import { System, GridConfig } from '../types';
import { SYSTEMS_PER_LAB } from '../constants';
import SystemSeat from './SystemSeat';

interface LabMapProps {
  systems: System[];
  selectedPcIds: string[];
  onSystemClick: (system: System) => void;
  // Added gridConfig to props to fix the error in App.tsx where it was being passed but not defined in props
  gridConfig: GridConfig;
}

const LabMap: React.FC<LabMapProps> = ({ systems, selectedPcIds, onSystemClick, gridConfig }) => {
  const systemsMap = React.useMemo(() => {
    const map: Record<string, System> = {};
    systems.forEach(s => map[s.id] = s);
    return map;
  }, [systems]);

  const renderTable = (labIndex: number) => {
    const tableSystems = [];
    const startIndex = labIndex * SYSTEMS_PER_LAB;
    
    for (let i = 0; i < SYSTEMS_PER_LAB; i++) {
      const pcId = `PC-${(startIndex + i + 1).toString().padStart(3, '0')}`;
      const system = systemsMap[pcId];
      if (system) {
        tableSystems.push(
          <div key={pcId} className="w-8 h-8 sm:w-10 sm:h-10">
            <SystemSeat 
              system={system}
              isSelected={selectedPcIds.includes(system.id)}
              onClick={onSystemClick}
            />
          </div>
        );
      }
    }

    if (tableSystems.length === 0) return null;

    return (
      <div key={labIndex} className="bg-slate-800/20 border border-slate-700/30 p-2 rounded-xl flex flex-col items-center hover:bg-slate-800/40 transition-all group">
        <div className="flex flex-row gap-1">
          {tableSystems}
        </div>
        <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
           <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Lab {(labIndex + 1).toString().padStart(2, '0')}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-900/40 p-8 md:p-12 rounded-[3rem] border border-slate-800 shadow-2xl backdrop-blur-md">
      <div className="mb-10 flex flex-col items-center">
        <div className="w-full max-w-5xl h-1.5 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent rounded-full mb-4"></div>
        <h2 className="text-slate-500 text-[10px] font-black tracking-[1em] uppercase">Core Facility / Node Topology</h2>
      </div>

      <div 
        className="grid gap-x-12 gap-y-6" 
        style={{ gridTemplateColumns: `repeat(${gridConfig.cols}, minmax(0, 1fr))` }}
      >
        {/* We render columns and rows dynamically based on gridConfig props */}
        {[...Array(gridConfig.cols)].map((_, colIndex) => (
          <div key={colIndex} className="flex flex-col gap-4">
            {[...Array(gridConfig.rows)].map((_, rowIndex) => {
              const labIndex = colIndex * gridConfig.rows + rowIndex;
              return renderTable(labIndex);
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-12 pt-8 border-t border-slate-800 flex flex-wrap justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Healthy</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-amber-500 rounded-sm"></div>
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Software Issue</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-600 rounded-sm"></div>
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Network Error</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-rose-500 rounded-sm"></div>
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Offline</span>
        </div>
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-circle-check text-blue-400 text-[10px]"></i>
          <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Selected</span>
        </div>
      </div>
    </div>
  );
};

export default LabMap;
