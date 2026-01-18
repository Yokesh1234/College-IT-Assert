
import React, { useState, useEffect, useMemo } from 'react';
import { System, SystemStatus, ComponentStatus, Booking, SoftwareInfo, LicenseStatus } from '../types';
import { SLOTS } from '../constants';
import { calculateSystemHealth } from '../services/dataService';

interface SystemModalProps {
  system: System;
  onClose: () => void;
  onBook: (pcId: string, booking: Booking) => Promise<void>;
  onUpdate: (updatedSystem: System) => Promise<void>;
}

const SystemModal: React.FC<SystemModalProps> = ({ system, onClose, onBook, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'book' | 'edit'>('info');
  
  // Booking State
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingSlot, setBookingSlot] = useState(SLOTS[0]);
  const [bookingBatch, setBookingBatch] = useState('');
  const [bookingSession, setBookingSession] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Edit State
  const [editData, setEditData] = useState<System>(JSON.parse(JSON.stringify(system)));
  const [newSw, setNewSw] = useState({ name: '', version: '', license: LicenseStatus.FREE });

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

  const toggleSoftware = (name: string) => {
    setEditData(prev => ({
      ...prev,
      software: prev.software.map(sw => 
        sw.name === name ? { ...sw, installed: !sw.installed } : sw
      )
    }));
  };

  const removeSoftware = (name: string) => {
    setEditData(prev => ({
      ...prev,
      software: prev.software.filter(sw => sw.name !== name)
    }));
  };

  const addSoftware = () => {
    if (!newSw.name.trim()) return;
    if (editData.software.some(s => s.name === newSw.name)) {
      setMsg({ type: 'error', text: 'Software already exists' });
      return;
    }
    const software: SoftwareInfo = { ...newSw, installed: true };
    setEditData(prev => ({
      ...prev,
      software: [...prev.software, software]
    }));
    setNewSw({ name: '', version: '', license: LicenseStatus.FREE });
    setMsg(null);
  };

  const getStatusBadge = (status: any, key?: string) => {
    const isOk = status === ComponentStatus.OK || status === ComponentStatus.CONNECTED || status === true;
    if (key === 'network' && status === ComponentStatus.NOT_CONNECTED) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
          Link Down
        </span>
      );
    }
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
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center bg-slate-900/50">
          <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-6">
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">{system.id}</h2>
              <div className="mt-1">{getStatusIndicator(system.status, system)}</div>
            </div>
            <button onClick={onClose} className="sm:hidden w-8 h-8 flex items-center justify-center bg-slate-800/50 hover:bg-slate-700 rounded-full text-slate-400">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700 overflow-x-auto">
            {['info', 'book', 'edit'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="hidden sm:flex w-10 h-10 items-center justify-center bg-slate-800/50 hover:bg-slate-700 rounded-full text-slate-400 transition-colors">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col lg:flex-row">
          {/* Main Content Area */}
          <div className="flex-1 p-4 sm:p-10">
            {activeTab === 'info' && (
              <div className="animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
                  <section>
                    <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <i className="fa-solid fa-microchip text-blue-500"></i>
                      Hardware
                    </h3>
                    <div className="space-y-3 bg-slate-800/20 p-4 sm:p-6 rounded-xl border border-slate-800">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Processor</span>
                        <span className="text-white font-bold">{system.hardware.cpu}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Memory</span>
                        <span className="text-white font-bold">{system.hardware.ram}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">OS</span>
                        <span className="text-white font-bold truncate ml-4">{system.hardware.os || 'N/A'}</span>
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
                    <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <i className="fa-solid fa-layer-group text-blue-500"></i>
                      Software
                    </h3>
                    <div className="space-y-2">
                      {system.software.map(sw => (
                        <div key={sw.name} className="flex justify-between items-center bg-slate-800/30 p-3 rounded-xl border border-slate-700/50">
                          <div className="flex flex-col">
                            <span className="text-slate-200 text-xs font-bold">{sw.name}</span>
                            <span className="text-[8px] text-slate-600 uppercase font-black">v{sw.version}</span>
                          </div>
                          {getStatusBadge(sw.installed)}
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            )}

            {activeTab === 'edit' && (
              <div className="animate-in slide-in-from-left-4 duration-300 space-y-6 sm:space-y-10">
                <div className="bg-slate-800 p-3 rounded-xl border border-blue-500/30 flex items-center justify-between">
                  <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Live Health Preview</span>
                  <div>{getStatusIndicator(projectedSystem.status, editData)}</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10">
                  <div className="space-y-6">
                    <h3 className="text-[9px] font-black text-slate-500 uppercase">Specifications</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {['cpu', 'ram', 'storage', 'os'].map(field => (
                        <div key={field} className="space-y-1">
                          <label className="text-[8px] font-black text-slate-500 uppercase">{field}</label>
                          <input 
                            type="text" 
                            value={(editData.hardware as any)[field]} 
                            onChange={e => setEditData({...editData, hardware: {...editData.hardware, [field]: e.target.value}})} 
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-blue-500"
                          />
                        </div>
                      ))}
                    </div>

                    <h3 className="text-[9px] font-black text-slate-500 uppercase pt-4">Status Overrides</h3>
                    <div className="grid grid-cols-2 gap-4">
                       {['keyboard', 'mouse', 'monitor', 'network'].map(part => (
                         <div key={part} className="space-y-1">
                            <label className="text-[8px] font-black text-slate-500 uppercase">{part}</label>
                            <select 
                              value={(editData.hardware as any)[part]}
                              onChange={e => setEditData({...editData, hardware: {...editData.hardware, [part]: e.target.value as any}})}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none"
                            >
                              <option value={ComponentStatus.OK}>OK</option>
                              <option value={ComponentStatus.FAULTY}>Faulty</option>
                              <option value={ComponentStatus.MISSING}>Missing</option>
                              {part === 'network' && <option value={ComponentStatus.CONNECTED}>Connected</option>}
                              {part === 'network' && <option value={ComponentStatus.NOT_CONNECTED}>No Net</option>}
                            </select>
                         </div>
                       ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-[9px] font-black text-slate-500 uppercase">Software Provisioning</h3>
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar">
                       {editData.software.map(sw => (
                         <div key={sw.name} className="flex items-center justify-between gap-4">
                           <label className="flex items-center gap-2 cursor-pointer">
                             <input type="checkbox" checked={sw.installed} onChange={() => toggleSoftware(sw.name)} className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-800 text-blue-600" />
                             <span className="text-[11px] text-slate-300 font-bold">{sw.name}</span>
                           </label>
                           <button onClick={() => removeSoftware(sw.name)} className="text-slate-600 hover:text-rose-500 p-1">
                             <i className="fa-solid fa-trash-can text-[9px]"></i>
                           </button>
                         </div>
                       ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row justify-end gap-3">
                  <button onClick={() => setActiveTab('info')} className="order-2 sm:order-1 px-8 py-3 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest">Cancel</button>
                  <button 
                    onClick={handleUpdate}
                    disabled={isProcessing}
                    className="order-1 sm:order-2 bg-blue-600 hover:bg-blue-500 text-white font-black py-3 px-10 rounded-xl sm:rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-95 disabled:opacity-50 text-[10px] uppercase tracking-widest"
                  >
                    {isProcessing ? 'Syncing...' : 'Update Node'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'book' && (
              <div className="animate-in slide-in-from-right-4 duration-300 max-w-lg mx-auto py-6 sm:py-10">
                <form onSubmit={handleBooking} className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Date</label>
                      <input type="date" required value={bookingDate} onChange={e => setBookingDate(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Slot</label>
                      <select value={bookingSlot} onChange={e => setBookingSlot(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none">
                        {SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Batch ID</label>
                    <input type="text" placeholder="e.g. IT-FALL-2024" required value={bookingBatch} onChange={e => setBookingBatch(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Session</label>
                    <input type="text" placeholder="e.g. Data Mining Lab" required value={bookingSession} onChange={e => setBookingSession(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none" />
                  </div>
                  <button type="submit" disabled={isProcessing} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl sm:rounded-2xl transition-all shadow-xl shadow-emerald-600/20 active:scale-95 mt-4 text-[10px] uppercase tracking-widest">
                    {isProcessing ? 'Booking...' : 'Reserve Node'}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Right Info Bar / Bookings (hidden on very small screens or stacks) */}
          <div className="w-full lg:w-80 bg-slate-800/10 p-4 sm:p-10 border-t lg:border-t-0 lg:border-l border-slate-800">
             <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-6">Reservations</h3>
             <div className="space-y-3">
               {system.bookings.length === 0 ? (
                 <div className="text-center py-10 opacity-30">
                    <p className="text-[9px] font-bold uppercase tracking-widest italic">Idle Status</p>
                 </div>
               ) : (
                 system.bookings.map((b, i) => (
                   <div key={i} className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl relative group">
                      <div className="text-[10px] font-black text-white mb-1 uppercase">{b.batch}</div>
                      <div className="text-[10px] text-slate-400 mb-2 truncate">{b.session}</div>
                      <div className="flex items-center gap-2 text-[8px] text-blue-500 font-black uppercase tracking-widest">
                        <i className="fa-regular fa-clock"></i>
                        {b.date} • {b.slot.split(' ')[0]}
                      </div>
                   </div>
                 ))
               )}
             </div>

             {msg && (
                <div className={`mt-6 p-3 rounded-xl text-[9px] font-bold text-center border animate-in slide-in-from-bottom-2 ${msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                  {msg.text}
                </div>
              )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SystemModal;
