
import React, { useState, useEffect, useMemo } from 'react';
import { System, SystemStatus, ComponentStatus, Booking, SoftwareInfo, LicenseStatus, MaintenanceLog } from '../types';
import { SLOTS } from '../constants';
import { calculateSystemHealth, dataService } from '../services/dataService';
import { auth } from '../services/firebase';

interface SystemModalProps {
  system: System;
  onClose: () => void;
  onBook: (pcId: string, booking: Booking) => Promise<void>;
  onUpdate: (updatedSystem: System) => Promise<void>;
}

const SystemModal: React.FC<SystemModalProps> = ({ system, onClose, onBook, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'book' | 'edit' | 'logs'>('info');
  
  // Booking State
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingSlot, setBookingSlot] = useState(SLOTS[0]);
  const [bookingBatch, setBookingBatch] = useState('');
  const [bookingSession, setBookingSession] = useState('');
  
  // Log State
  const [newLogNote, setNewLogNote] = useState('');

  // Edit State
  const [editData, setEditData] = useState<System>(JSON.parse(JSON.stringify(system)));
  const [isProcessing, setIsProcessing] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Live health preview based on edits
  const projectedSystem = useMemo(() => calculateSystemHealth(editData), [editData]);

  useEffect(() => {
    setEditData(JSON.parse(JSON.stringify(system)));
    setMsg(null);
  }, [system, activeTab]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (system.status === SystemStatus.NOT_WORKING) return;
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

  const getStatusBadge = (status: any, key?: string) => {
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
        
        {/* Header */}
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
            {['info', 'logs', 'book', 'edit'].map((tab) => (
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
                            {getStatusBadge((system.hardware as any)[k], k)}
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
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Workstation Alias (Custom Name)</label>
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
                       {['keyboard', 'mouse', 'monitor', 'network'].map(part => (
                         <div key={part} className="space-y-1">
                            <label className="text-[8px] font-black text-slate-500 uppercase">{part}</label>
                            <select 
                              value={(editData.hardware as any)[part]}
                              onChange={e => setEditData({...editData, hardware: {...editData.hardware, [part]: e.target.value as any}})}
                              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none"
                            >
                              <option value={ComponentStatus.OK}>OK</option>
                              <option value={ComponentStatus.FAULTY}>Faulty</option>
                              <option value={ComponentStatus.MISSING}>Missing</option>
                            </select>
                         </div>
                       ))}
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
                  <button type="submit" disabled={isProcessing} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-emerald-600/20 active:scale-95 text-[10px] uppercase tracking-widest">
                    {isProcessing ? 'Processing Cloud Reservation...' : 'Reserve Node'}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Messages & Sidebar */}
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
