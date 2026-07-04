import React, { useState, useEffect, useMemo } from 'react';
import { System, SystemStatus, ComponentStatus, Booking, SoftwareInfo, LicenseStatus, MaintenanceLog, TimetableEntry, GridConfig } from '../types';
import { SLOTS, SYSTEMS_PER_LAB, LAB_MAP_COLS } from '../constants';
import { calculateSystemHealth, dataService } from '../services/dataService';
import { auth } from '../services/firebase';
import { Calendar, Clock, User, AlertCircle, BookmarkCheck } from 'lucide-react';
import { INITIAL_TIME_SLOTS } from '../timetableConstants';

interface SystemModalProps {
  system: System;
  onClose: () => void;
  onBook: (pcId: string, booking: Booking) => Promise<void>;
  onUpdate: (updatedSystem: System) => Promise<void>;
  timetables: TimetableEntry[];
  gridConfig: GridConfig;
  simulatedDay: string;
  simulatedPeriod: number;
}

const getPcTableBatch = (pcId: string, gridConfig: GridConfig) => {
  const pcIdNum = parseInt(pcId.replace('PC-', ''));
  if (isNaN(pcIdNum)) return '';
  const labIndex = Math.floor((pcIdNum - 1) / SYSTEMS_PER_LAB);
  
  const customName = gridConfig?.tableNames?.[labIndex];
  const cols = gridConfig?.cols || LAB_MAP_COLS;
  const colIndex = labIndex % cols;
  const rowIndex = Math.floor(labIndex / cols) + 1;
  const colLetter = String.fromCharCode(65 + colIndex);
  const defaultName = `TB-${colLetter}${rowIndex}`;
  const displayName = customName || defaultName;
  
  return displayName.replace('TB-', '').trim().toUpperCase();
};

const getDayNameFromDate = (dateString: string) => {
  const date = new Date(dateString);
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  return days[date.getDay()];
};

const getOverlappingPeriods = (slot: string) => {
  if (slot.includes('09:00 AM')) return [1, 2];
  if (slot.includes('11:30 AM')) return [3, 4];
  if (slot.includes('02:00 PM')) return [5, 6];
  return [];
};

const SystemModal: React.FC<SystemModalProps> = ({ 
  system, 
  onClose, 
  onBook, 
  onUpdate,
  timetables,
  gridConfig,
  simulatedDay,
  simulatedPeriod
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'timetable' | 'book' | 'edit' | 'logs'>('info');
  
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingSlot, setBookingSlot] = useState(SLOTS[0]);
  const [bookingBatch, setBookingBatch] = useState('');
  const [bookingSession, setBookingSession] = useState('');
  
  const [newLogNote, setNewLogNote] = useState('');

  const [editData, setEditData] = useState<System>(JSON.parse(JSON.stringify(system)));
  const [isProcessing, setIsProcessing] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const pcBatch = useMemo(() => getPcTableBatch(system.id, gridConfig), [system.id, gridConfig]);

  // Check if booking slot is conflicted with timetable schedule
  const isConflictWithTimetable = useMemo(() => {
    const dayName = getDayNameFromDate(bookingDate);
    const periodsToCheck = getOverlappingPeriods(bookingSlot);
    
    return timetables.some(t => 
      t.day === dayName && 
      t.batch.toUpperCase() === pcBatch && 
      periodsToCheck.includes(t.period)
    );
  }, [bookingDate, bookingSlot, timetables, pcBatch]);

  useEffect(() => {
    setEditData(JSON.parse(JSON.stringify(system)));
    setMsg(null);
  }, [system, activeTab]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (system.status === SystemStatus.NOT_WORKING) return;
    
    // Conflict block validation
    if (isConflictWithTimetable) {
      setMsg({ 
        type: 'error', 
        text: 'This laboratory is already occupied according to the timetable.' 
      });
      return;
    }

    setIsProcessing(true);
    setMsg(null);
    try {
      await onBook(system.id, {
        pcId: system.id,
        date: bookingDate,
        slot: bookingSlot,
        batch: bookingBatch,
        session: bookingSession
      });
      setMsg({ type: 'success', text: 'Booking confirmed!' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Booking failed' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdate = async () => {
    setIsProcessing(true);
    setMsg(null);
    try {
      await onUpdate(editData);
      setMsg({ type: 'success', text: 'Configuration pushed successfully!' });
      setTimeout(() => setActiveTab('info'), 1000);
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Failed to update system' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddLog = async () => {
    if (!newLogNote.trim()) return;
    setIsProcessing(true);
    try {
      await dataService.addMaintenanceLog(system.id, {
        timestamp: new Date().toLocaleString(),
        note: newLogNote.trim(),
        adminEmail: auth.currentUser?.email || 'System'
      });
      setNewLogNote('');
      setMsg({ type: 'success', text: 'Log entry added' });
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Failed to add log' });
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSoftware = (name: string) => {
    setEditData(prev => ({
      ...prev,
      software: prev.software.map(sw => 
        sw.name === name ? { ...sw, installed: !sw.installed } : sw
      )
    }));
  };

  const getStatusBadge = (status: any) => {
    const isOk = status === ComponentStatus.OK || status === ComponentStatus.CONNECTED || status === true;
    const isFaulty = status === ComponentStatus.FAULTY || status === ComponentStatus.NOT_CONNECTED || status === ComponentStatus.MISSING;
    return (
      <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold ${isOk ? 'bg-emerald-500/10 text-emerald-400' : isFaulty ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-700 text-slate-400'}`}>
        {status.toString()}
      </span>
    );
  };

  const getStatusIndicator = (status: SystemStatus, sysData: System) => {
    const isNetworkDown = sysData.hardware.network === ComponentStatus.NOT_CONNECTED;
    switch(status) {
      case SystemStatus.WORKING: 
        return <span className="text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded text-[9px] font-black border border-emerald-500/20 uppercase tracking-tighter">Healthy</span>;
      case SystemStatus.PARTIAL: 
        return <span className={`text-[9px] px-2 py-1 rounded font-black border uppercase tracking-tighter ${isNetworkDown ? 'text-blue-500 bg-blue-500/10 border-blue-500/20' : 'text-amber-500 bg-amber-500/10 border-amber-500/20'}`}>
          {isNetworkDown ? 'Net Issue' : 'Soft Issue'}
        </span>;
      case SystemStatus.NOT_WORKING: 
        return <span className="text-rose-500 bg-rose-500/10 px-2 py-1 rounded text-[9px] font-black border border-rose-500/20 uppercase tracking-tighter">Critical</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col">
        
        <div className="p-4 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center bg-slate-900/50">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                 <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">{system.name || system.id}</h2>
                 {system.name && <span className="text-[10px] text-slate-600 font-bold bg-slate-800 px-1.5 py-0.5 rounded">{system.id}</span>}
              </div>
              <div className="mt-1">{getStatusIndicator(system.status, system)}</div>
            </div>
          </div>
          <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700 overflow-x-auto no-scrollbar">
            {['info', 'timetable', 'logs', 'book', 'edit'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="hidden sm:flex w-10 h-10 items-center justify-center bg-slate-800/50 hover:bg-slate-700 rounded-full text-slate-400">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col lg:flex-row">
          <div className="flex-1 p-4 sm:p-10">
            {activeTab === 'info' && (
              <div className="animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
                  <section>
                    <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Hardware Telemetry</h3>
                    <div className="space-y-3 bg-slate-800/20 p-4 sm:p-6 rounded-xl border border-slate-800">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">CPU Node</span>
                        <span className="text-white font-bold">{system.hardware.cpu}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Memory Matrix</span>
                        <span className="text-white font-bold">{system.hardware.ram}</span>
                      </div>
                      <div className="pt-2 grid grid-cols-2 gap-2">
                        {['keyboard', 'mouse', 'monitor', 'network'].map(k => (
                          <div key={k} className="flex flex-col gap-1 p-2 bg-slate-900/40 rounded-lg">
                            <span className="text-[8px] text-slate-500 uppercase font-black">{k}</span>
                            {getStatusBadge((system.hardware as any)[k])}
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                  <section>
                    <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Software Provisioning</h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                      {system.software.map(sw => (
                        <div key={sw.name} className="flex justify-between items-center bg-slate-800/30 p-3 rounded-xl border border-slate-700/50">
                          <span className="text-slate-200 text-xs font-bold">{sw.name}</span>
                          {getStatusBadge(sw.installed)}
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            )}

            {activeTab === 'timetable' && (
              <div className="animate-in fade-in duration-300 space-y-8">
                {/* Header Summary */}
                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Timetable Batch Mapping</h3>
                    <p className="text-base font-bold text-white mt-1">Workstation Table Batch Group: <span className="text-blue-400">{pcBatch}</span></p>
                  </div>
                  <div className="bg-blue-600/15 border border-blue-500/20 px-3.5 py-1.5 rounded-xl text-blue-400 text-[10px] font-black uppercase tracking-widest">
                    {simulatedDay} • {(() => {
                      const active = timetables
                        .filter(t => t.day === simulatedDay && t.period === simulatedPeriod)
                        .map(t => t.batch.toUpperCase());
                      return active.length > 0 ? `SECTIONS: ${active.join(' / ')}` : 'FREE LAB';
                    })()}
                  </div>
                </div>

                {/* Current & Next Period Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Current Period Card */}
                  <div className="bg-slate-800/10 border border-slate-800 p-5 rounded-2xl">
                    <span className="px-2 py-0.5 rounded-full bg-violet-600/10 text-violet-400 border border-violet-500/15 text-[8px] font-black uppercase tracking-widest">
                      Current Period (P{simulatedPeriod})
                    </span>
                    {(() => {
                      const cur = timetables.find(t => t.day === simulatedDay && t.period === simulatedPeriod && t.batch.toUpperCase() === pcBatch);
                      if (cur) {
                        return (
                          <div className="mt-4 space-y-2">
                            <h4 className="text-sm font-black text-white">{cur.subject}</h4>
                            <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 mt-1">
                              <User className="w-3.5 h-3.5 text-slate-500" />
                              <span>{cur.faculty}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-800/60 text-[9px]">
                              <div>
                                <span className="text-slate-500 uppercase font-black block">Time Slot</span>
                                <span className="text-slate-300 font-bold mt-1 block">{cur.startTime} - {cur.endTime}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 uppercase font-black block">Course Code</span>
                                <span className="text-violet-400 font-mono font-bold mt-1 block">{cur.subjectCode}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return <p className="text-slate-500 text-xs italic mt-4">Workstation table batch currently has no scheduled class for Period {simulatedPeriod}.</p>;
                    })()}
                  </div>

                  {/* Next Period Card */}
                  <div className="bg-slate-800/10 border border-slate-800 p-5 rounded-2xl">
                    <span className="px-2 py-0.5 rounded-full bg-blue-600/10 text-blue-400 border border-blue-500/15 text-[8px] font-black uppercase tracking-widest">
                      Next Period (P{simulatedPeriod + 1})
                    </span>
                    {(() => {
                      const nxt = timetables.find(t => t.day === simulatedDay && t.period === (simulatedPeriod + 1) && t.batch.toUpperCase() === pcBatch);
                      if (nxt) {
                        return (
                          <div className="mt-4 space-y-2">
                            <h4 className="text-sm font-black text-white">{nxt.subject}</h4>
                            <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 mt-1">
                              <User className="w-3.5 h-3.5 text-slate-500" />
                              <span>{nxt.faculty}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-800/60 text-[9px]">
                              <div>
                                <span className="text-slate-500 uppercase font-black block">Time Slot</span>
                                <span className="text-slate-300 font-bold mt-1 block">{nxt.startTime} - {nxt.endTime}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 uppercase font-black block">Course Code</span>
                                <span className="text-blue-400 font-mono font-bold mt-1 block">{nxt.subjectCode}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return <p className="text-slate-500 text-xs italic mt-4">Workstation table batch has no class scheduled for Period {simulatedPeriod + 1}.</p>;
                    })()}
                  </div>
                </div>

                {/* Today's Timetable Tracker */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Today's Lab Schedule Timetable ({simulatedDay})</h4>
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5, 6].map(p => {
                      const entry = timetables.find(t => t.day === simulatedDay && t.period === p && t.batch.toUpperCase() === pcBatch);
                      const isCurrent = p === simulatedPeriod;
                      const slot = INITIAL_TIME_SLOTS.find(s => s.period === p);

                      return (
                        <div key={p} className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                          isCurrent 
                            ? 'bg-blue-600/10 border-blue-500/20 text-blue-200' 
                            : 'bg-slate-950/40 border-slate-850 text-slate-300 hover:border-slate-800'
                        }`}>
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-black w-14">Period {p}</span>
                            <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">{slot?.startTime} - {slot?.endTime}</span>
                          </div>
                          {entry ? (
                            <div className="flex items-center gap-3">
                              <span className="px-1.5 py-0.5 bg-slate-800 rounded text-[9px] font-bold text-slate-400">{entry.subjectCode}</span>
                              <span className="text-xs font-bold truncate max-w-[200px]" title={entry.subject}>{entry.subject}</span>
                              <span className="text-[10px] text-slate-500 hidden md:inline">({entry.faculty})</span>
                            </div>
                          ) : (
                            <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Free Slot</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="animate-in fade-in duration-300 space-y-8">
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Add Maintenance Record</h4>
                  <div className="flex gap-3">
                    <textarea 
                      value={newLogNote}
                      onChange={e => setNewLogNote(e.target.value)}
                      placeholder="e.g. Cleaned internal dust, replaced CMOS battery..."
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-4 text-xs text-white outline-none focus:border-blue-500 min-h-[80px]"
                    />
                    <button 
                      onClick={handleAddLog}
                      disabled={isProcessing || !newLogNote.trim()}
                      className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                    >
                      Log Entry
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Maintenance History</h4>
                  <div className="space-y-3">
                    {system.logs && system.logs.length > 0 ? (
                       system.logs.map(log => (
                         <div key={log.id} className="bg-slate-800/20 border border-slate-800 p-4 rounded-xl">
                            <div className="flex justify-between items-center mb-2">
                               <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest">{log.timestamp}</span>
                               <span className="text-[8px] text-slate-600 font-bold uppercase">{log.adminEmail}</span>
                            </div>
                            <p className="text-xs text-slate-300 italic">"{log.note}"</p>
                         </div>
                       )).reverse()
                    ) : (
                      <div className="text-center py-10 opacity-30 text-[10px] uppercase font-black">No Maintenance Records Found</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'edit' && (
              <div className="animate-in slide-in-from-left-4 duration-300 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Workstation Alias</label>
                      <input 
                        type="text" 
                        value={editData.name} 
                        onChange={e => setEditData({...editData, name: e.target.value})} 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm text-white focus:border-blue-500 outline-none"
                        placeholder="e.g. Graphics Lab PC 01"
                      />
                    </div>
                    
                    <h3 className="text-[9px] font-black text-slate-500 uppercase pt-4">Hardware Config</h3>
                    <div className="grid grid-cols-2 gap-4">
                       {['keyboard', 'mouse', 'monitor', 'network'].map(part => {
                         const isNetwork = part === 'network';
                         return (
                           <div key={part} className="space-y-1">
                              <label className="text-[8px] font-black text-slate-500 uppercase">{part}</label>
                              <select 
                                value={(editData.hardware as any)[part]}
                                onChange={e => setEditData({...editData, hardware: {...editData.hardware, [part]: e.target.value as any}})}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none"
                              >
                                {isNetwork ? (
                                  <>
                                    <option value={ComponentStatus.CONNECTED}>Connected</option>
                                    <option value={ComponentStatus.NOT_CONNECTED}>Not Connected</option>
                                  </>
                                ) : (
                                  <>
                                    <option value={ComponentStatus.OK}>OK</option>
                                    <option value={ComponentStatus.FAULTY}>Faulty</option>
                                    <option value={ComponentStatus.MISSING}>Missing</option>
                                  </>
                                )}
                              </select>
                           </div>
                         );
                       })}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-[9px] font-black text-slate-500 uppercase">Software Provisioning</h3>
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                       {editData.software.map(sw => (
                         <div key={sw.name} className="flex items-center justify-between gap-4">
                           <label className="flex items-center gap-2 cursor-pointer">
                             <input type="checkbox" checked={sw.installed} onChange={() => toggleSoftware(sw.name)} className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-800 text-blue-600" />
                             <span className="text-[11px] text-slate-300 font-bold">{sw.name}</span>
                           </label>
                         </div>
                       ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800 flex justify-end gap-3">
                  <button onClick={handleUpdate} disabled={isProcessing} className="bg-blue-600 hover:bg-blue-500 text-white font-black py-4 px-12 rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-95 disabled:opacity-50 text-[10px] uppercase tracking-widest">
                    {isProcessing ? 'Saving Configuration...' : 'Commit Changes'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'book' && (
              <div className="animate-in slide-in-from-right-4 duration-300 max-w-lg mx-auto py-10">
                <form onSubmit={handleBooking} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Date</label>
                      <input type="date" required value={bookingDate} onChange={e => setBookingDate(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-xs text-white outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Slot</label>
                      <select value={bookingSlot} onChange={e => setBookingSlot(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-xs text-white outline-none">
                        {SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Batch ID</label>
                    <input type="text" placeholder="CS-FALL-2024" required value={bookingBatch} onChange={e => setBookingBatch(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-xs text-white outline-none" />
                  </div>

                  {isConflictWithTimetable && (
                    <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-[10px] text-rose-400 font-bold flex gap-2 items-center">
                      <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
                      <span>This laboratory is already occupied according to the timetable.</span>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={isProcessing || isConflictWithTimetable} 
                    className={`w-full text-white font-black py-5 rounded-2xl transition-all shadow-xl active:scale-95 text-[10px] uppercase tracking-widest ${
                      isConflictWithTimetable 
                        ? 'bg-rose-900/50 cursor-not-allowed text-rose-500/65 shadow-none border border-rose-900/20' 
                        : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                    }`}
                  >
                    {isProcessing ? 'Processing Cloud Reservation...' : 'Reserve Node'}
                  </button>
                </form>
              </div>
            )}
          </div>

          <div className="w-full lg:w-80 bg-slate-800/10 p-6 sm:p-10 border-t lg:border-t-0 lg:border-l border-slate-800">
             {msg && (
                <div className={`mb-8 p-4 rounded-xl text-[10px] font-black text-center border animate-in slide-in-from-top-2 ${msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                  {msg.text}
                </div>
              )}
             <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-6">Active Sessions</h3>
             <div className="space-y-3">
               {system.bookings.length === 0 ? (
                 <div className="text-center py-10 opacity-30 italic text-[9px] uppercase font-bold">Node Idle</div>
               ) : (
                 system.bookings.map((b, i) => (
                   <div key={i} className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                      <div className="text-[10px] font-black text-white mb-1 uppercase">{b.batch}</div>
                      <div className="text-[9px] text-blue-500 font-black uppercase tracking-widest">{b.date} • {b.slot.split(' ')[0]}</div>
                   </div>
                 ))
               )}
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SystemModal;