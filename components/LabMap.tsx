
import React from 'react';
import { System, GridConfig } from '../types';
import SystemSeat from './SystemSeat';

interface LabMapProps {
  systems: System[];
  gridConfig: GridConfig;
  selectedPcIds: string[];
  onSystemClick: (system: System) => void;
}

const LabMap: React.FC<LabMapProps> = ({ systems, gridConfig, selectedPcIds, onSystemClick }) => {
  const { rows, cols } = gridConfig;
  
  // Create a mapping for faster lookup
  const systemsMap = React.useMemo(() => {
    const map: Record<string, System> = {};
    systems.forEach(s => map[s.id] = s);
    return map;
  }, [systems]);

  const gridCells = Array.from({ length: rows * cols }, (_, i) => {
    const currentRow = Math.floor(i / cols);
    const currentCol = i % cols;
    
    // Aisle logic: add horizontal space every 4 rows
    const isAisle = currentRow > 0 && currentRow % 5 === 4;
    
    // Calculate system index based on rows, skipping aisle slots
    const systemsBefore = Math.floor(currentRow / 5);
    const systemIndex = (currentRow - systemsBefore) * cols + currentCol;
    
    const pcId = `PC-${(systemIndex + 1).toString().padStart(3, '0')}`;
    const system = isAisle ? null : systemsMap[pcId];

    return (
      <div key={i} className="w-10 h-10 md:w-14 md:h-14 p-0.5 flex items-center justify-center">
        {isAisle ? (
          <div className="w-full h-full flex items-center justify-center opacity-10">
            <div className="w-full h-0.5 bg-slate-500 rounded-full"></div>
          </div>
        ) : system ? (
          <SystemSeat 
            system={system} 
            isSelected={selectedPcIds.includes(system.id)}
            onClick={onSystemClick} 
          />
        ) : (
          <div className="w-full h-full rounded border border-dashed border-slate-800 bg-slate-900/50 flex items-center justify-center">
            <span className="text-[7px] text-slate-700 font-bold uppercase">Void</span>
          </div>
        )}
      </div>
    );
  });

  return (
    <div className="bg-slate-900/40 p-6 md:p-12 rounded-[2.5rem] border border-slate-800 shadow-2xl backdrop-blur-md">
      <div className="mb-14 flex flex-col items-center">
        <div className="w-full max-w-4xl h-2 bg-gradient-to-r from-transparent via-blue-500/40 to-transparent rounded-full blur-[2px]"></div>
        <div className="text-slate-500 text-[10px] font-black tracking-[0.8em] uppercase mt-4">Administrative Front-End / Central Console</div>
      </div>

      <div 
        className="grid gap-1 md:gap-2.5 mx-auto"
        style={{ 
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          width: 'fit-content'
        }}
      >
        {gridCells}
      </div>

      <div className="mt-14 flex flex-wrap justify-center gap-x-10 gap-y-4 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-950/40 p-6 rounded-3xl border border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
          <span>Healthy</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-amber-500 rounded-sm"></div>
          <span>Maintenance</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-rose-500 rounded-sm"></div>
          <span>Offline</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-blue-600 rounded-sm ring-2 ring-blue-500/50"></div>
          <span>Booked</span>
        </div>
        <div className="h-4 w-px bg-slate-800"></div>
        <div className="flex items-center gap-3 text-blue-400">
           <i className="fa-solid fa-circle-check"></i>
           <span>Selected</span>
        </div>
      </div>
    </div>
  );
};

export default LabMap;
