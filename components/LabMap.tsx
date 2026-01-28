
import React, { useState } from 'react';
import { System, GridConfig } from '../types';
import { SYSTEMS_PER_LAB } from '../constants';
import SystemSeat from './SystemSeat';
import { dataService } from '../services/dataService';

interface LabMapProps {
  systems: System[];
  selectedPcIds: string[];
  onSystemClick: (system: System) => void;
  gridConfig: GridConfig;
}

const LabMap: React.FC<LabMapProps> = ({ systems, selectedPcIds, onSystemClick, gridConfig }) => {
  const [editingTableIndex, setEditingTableIndex] = useState<number | null>(null);
  const [tempTableName, setTempTableName] = useState('');

  const systemsMap = React.useMemo(() => {
    const map: Record<string, System> = {};
    systems.forEach(s => map[s.id] = s);
    return map;
  }, [systems]);

  const handleStartEditTable = (index: number, currentName: string) => {
    setEditingTableIndex(index);
    setTempTableName(currentName || `Table ${(index + 1).toString().padStart(2, '0')}`);
  };

  const handleSaveTableName = async (index: number) => {
    if (tempTableName.trim()) {
      await dataService.updateTableName(index, tempTableName.trim());
    }
    setEditingTableIndex(null);
  };

  const renderTable = (labIndex: number) => {
    const tableSystems = [];
    const startIndex = labIndex * SYSTEMS_PER_LAB;
    
    for (let i = 0; i < SYSTEMS_PER_LAB; i++) {
      const pcId = `PC-${(startIndex + i + 1).toString().padStart(3, '0')}`;
      const system = systemsMap[pcId];
      if (system) {
        tableSystems.push(
          <div key={pcId} className="w-8 h-8 sm:w-10 sm:h-10 lg:w-11 lg:h-11">
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

    const customName = gridConfig.tableNames?.[labIndex];
    const defaultName = `Table ${(labIndex + 1).toString().padStart(2, '0')}`;
    const displayName = customName || defaultName;

    return (
      <div key={labIndex} className="bg-slate-800/10 border border-slate-800/40 p-2 sm:p-3 rounded-xl flex flex-col items-center hover:bg-slate-800/30 transition-all group shadow-sm">
        <div className="flex flex-row gap-1 sm:gap-1.5 mb-2">
          {tableSystems}
        </div>
        
        <div className="w-full flex items-center justify-center gap-2">
          {editingTableIndex === labIndex ? (
            <div className="flex items-center gap-1">
              <input 
                autoFocus
                type="text"
                value={tempTableName}
                onChange={e => setTempTableName(e.target.value)}
                onBlur={() => handleSaveTableName(labIndex)}
                onKeyDown={e => e.key === 'Enter' && handleSaveTableName(labIndex)}
                className="bg-slate-900 text-[8px] font-black text-blue-400 uppercase border border-blue-500/50 rounded px-1 outline-none w-20"
              />
            </div>
          ) : (
            <div 
              className="flex items-center gap-1 cursor-pointer"
              onClick={() => handleStartEditTable(labIndex, displayName)}
            >
              <span className="text-[7px] sm:text-[8px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[80px]">
                {displayName}
              </span>
              <i className="fa-solid fa-pencil text-[6px] text-slate-600 opacity-0 group-hover:opacity-100"></i>
            </div>
          )}
        </div>
      </div>
    );
  };

  const totalTables = gridConfig.rows * gridConfig.cols;

  return (
    <div className="bg-slate-900/40 p-4 sm:p-8 md:p-12 rounded-2xl sm:rounded-[3rem] border border-slate-800 shadow-2xl backdrop-blur-md transition-layout">
      <div className="mb-6 sm:mb-10 flex flex-col items-center">
        <div className="w-full max-w-5xl h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent rounded-full mb-4"></div>
        <h2 className="text-slate-500 text-[9px] sm:text-[10px] font-black tracking-[0.5em] sm:tracking-[1em] uppercase text-center">Laboratory Node Architecture</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {[...Array(totalTables)].map((_, i) => renderTable(i))}
      </div>

      <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-slate-800 flex flex-wrap justify-center gap-3 sm:gap-6">
        <div className="flex items-center gap-2 px-2 py-1 bg-slate-800/30 rounded-lg">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></div>
          <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-widest">Healthy</span>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 bg-slate-800/30 rounded-lg">
          <div className="w-2.5 h-2.5 bg-amber-500 rounded-sm"></div>
          <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-widest">Issue</span>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 bg-slate-800/30 rounded-lg">
          <div className="w-2.5 h-2.5 bg-rose-500 rounded-sm"></div>
          <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-widest">Faulty</span>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 bg-slate-800/30 rounded-lg">
          <i className="fa-solid fa-circle-check text-blue-400 text-[9px]"></i>
          <span className="text-[8px] sm:text-[9px] font-black text-blue-400 uppercase tracking-widest">Selected</span>
        </div>
      </div>
    </div>
  );
};

export default LabMap;
