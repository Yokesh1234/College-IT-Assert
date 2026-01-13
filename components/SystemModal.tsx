
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
    // Check if name exists
    if (editData.software.some(s => s.name === newSw.name)) {
      setMsg({ type: 'error', text: 'Software already exists in list' });
      return;
    }
    const software: SoftwareInfo = {
      ...newSw,
      installed: true
    };
    setEditData(prev => ({
      ...prev,
      software: [...prev.software, software]
    }));
    setNewSw({ name: '', version: '', license: LicenseStatus.FREE });
    setMsg(null);
  };

  const getStatusBadge = (status: any, key?: string) => {
    const isOk = status === ComponentStatus.OK || status === ComponentStatus.CONNECTED || status === true;
    
    // Special Blue handling for Network issue
    if (key === 'network' && status === ComponentStatus.NOT_CONNECTED) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
          Not Connected
        </span>
      );
    }

    const isFaulty = status === ComponentStatus.FAULTY || status === ComponentStatus.NOT_CONNECTED || status === ComponentStatus.MISSING;
    
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isOk ? 'bg-emerald-500/10 text-emerald-400' : isFaulty ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-700 text-slate-400'}`}>
        {status.toString()}
      </span>
    );
  };

  const getStatusIndicator = (status: SystemStatus, sysData: System) => {
    const isNetworkDown = sysData.hardware.network === ComponentStatus.NOT_CONNECTED;

    switch(status) {
      case SystemStatus.WORKING: 
        return <span className="text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded text-[10px] font-black border border-emerald-500/20 uppercase tracking-tighter">Healthy / Working</span>;
      case SystemStatus.PARTIAL: 
        if (isNetworkDown) {
          return <span className="text-blue-500 bg-blue-500/10 px-2 py-1 rounded text-[10px] font-black border border-blue-500/20 uppercase tracking-tighter">Partial / Network Link Down</span>;
        }
        return <span className="text-amber-500 bg-amber-500/10 px-2 py-1 rounded text-[10px] font-black border border-amber-500/20 uppercase tracking-tighter">Partial / Missing Software</span>;
      case SystemStatus.NOT_WORKING: 
        return <span className="text-rose-500 bg-rose-500/10 px-2 py-1 rounded text-[10px] font-black border border-rose-500/20 uppercase tracking-tighter">Critical / Maintenance Needed</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl flex flex-col">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">{system.id}</h2>
              <div className="mt-1">{getStatusIndicator(system.status, system)}</div>
            </div>
            <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700">
              {['info', 'book', 'edit'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-slate-800/50 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col lg:flex-row">
          {/* Main Content Area */}
          <div className="flex-1 p-6 md:p-10">
            {activeTab === 'info' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <section>
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      <i className="fa-solid fa-microchip text-blue-500"></i>
                      Hardware Architecture
                    </h3>
                    <div className="space-y-4 bg-slate-800/20 p-6 rounded-2xl border border-slate-800">
                      <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
                        <span className="text-slate-400 text-xs">Processor</span>
                        <span className="text-white text-xs font-bold">{system.hardware.cpu}</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
                        <span className="text-slate-400 text-xs">Memory</span>
                        <span className="text-white text-xs font-bold">{system.hardware.ram}</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
                        <span className="text-slate-400 text-xs">Storage</span>
                        <span className="text-white text-xs font-bold">{system.hardware.storage}</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
                        <span className="text-slate-400 text-xs">OS Environment</span>
                        <span className="text-white text-xs font-bold">{system.hardware.os || 'N/A'}</span>
                      </div>
                      <div className="pt-2 grid grid-cols-2 gap-x-8 gap-y-3">
                        {['keyboard', 'mouse', 'monitor', 'network'].map(k => (
                          <div key={k} className="flex justify-between items-center">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">{k}</span>
                            {getStatusBadge((system.hardware as any)[k], k)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      <i className="fa-solid fa-layer-group text-blue-500"></i>
                      Software Stack
                    </h3>
                    <div className="space-y-2">
                      {system.software.map(sw => (
                        <div key={sw.name} className="flex justify-between items-center bg-slate-800/30 p-3 rounded-xl border border-slate-700/50">
                          <div className="flex flex-col">
                            <span className="text-slate-200 text-xs font-bold">{sw.name}</span>
                            <span className="text-[9px] text-slate-600 uppercase font-black tracking-tighter">v{sw.version} • {sw.license}</span>
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
              <div className="animate-in slide-in-from-left-4 duration-300 space-y-10">
                {/* Live Health Preview Bar */}
                <div className="bg-slate-800 p-4 rounded-2xl border border-blue-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Projected Health Status</span>
                  </div>
                  <div>{getStatusIndicator(projectedSystem.status, editData)}</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Core Specifications</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">CPU Model</label>
                        <input type="text" value={editData.hardware.cpu} onChange={e => setEditData({...editData, hardware: {...editData.hardware, cpu: e.target.value}})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-blue-500 outline-none transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">RAM Capacity</label>
                        <input type="text" value={editData.hardware.ram} onChange={e => setEditData({...editData, hardware: {...editData.hardware, ram: e.target.value}})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-blue-500 outline-none transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Storage</label>
                        <input type="text" value={editData.hardware.storage} onChange={e => setEditData({...editData, hardware: {...editData.hardware, storage: e.target.value}})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-blue-500 outline-none transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">OS Build</label>
                        <input type="text" value={editData.hardware.os} onChange={e => setEditData({...editData, hardware: {...editData.hardware, os: e.target.value}})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-blue-500 outline-none transition-all" />
                      </div>
                    </div>

                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pt-4">Peripheral Health</h3>
                    <div className="grid grid-cols-2 gap-4">
                       {['keyboard', 'mouse', 'monitor'].map(part => (
                         <div key={part} className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase">{part}</label>
                            <select 
                              value={(editData.hardware as any)[part]}
                              onChange={e => setEditData({...editData, hardware: {...editData.hardware, [part]: e.target.value as any}})}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-blue-500 outline-none appearance-none"
                            >
                              <option value={ComponentStatus.OK}>Operational (OK)</option>
                              <option value={ComponentStatus.FAULTY}>Faulty / Repair</option>
                              <option value={ComponentStatus.MISSING}>Missing Assert</option>
                            </select>
                         </div>
                       ))}
                       <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Network Link</label>
                        <select 
                          value={editData.hardware.network}
                          onChange={e => setEditData({...editData, hardware: {...editData.hardware, network: e.target.value as any}})}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-blue-500 outline-none appearance-none"
                        >
                          <option value={ComponentStatus.CONNECTED}>Connected</option>
                          <option value={ComponentStatus.NOT_CONNECTED}>No Network</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Software Configuration</h3>
                    
                    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                       {editData.software.map(sw => (
                         <div key={sw.name} className="flex items-center justify-between gap-4 group">
                           <label className="flex items-center gap-3 cursor-pointer flex-1">
                             <input type="checkbox" checked={sw.installed} onChange={() => toggleSoftware(sw.name)} className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                             <span className="text-xs text-slate-300 font-bold group-hover:text-white transition-colors">{sw.name}</span>
                           </label>
                           <button onClick={() => removeSoftware(sw.name)} className="text-slate-600 hover:text-rose-500 transition-colors p-1 opacity-0 group-hover:opacity-100">
                             <i className="fa-solid fa-trash-can text-[10px]"></i>
                           </button>
                         </div>
                       ))}
                    </div>

                    <div className="bg-slate-800/40 p-5 rounded-2xl border border-dashed border-slate-700 space-y-4">
                      <p className="text-[10px] font-black text-slate-500 uppercase">Add New Provision</p>
                      <div className="grid grid-cols-2 gap-3">
                        <input placeholder="Name" value={newSw.name} onChange={e => setNewSw({...newSw, name: e.target.value})} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none" />
                        <input placeholder="v1.0" value={newSw.version} onChange={e => setNewSw({...newSw, version: e.target.value})} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none" />
                      </div>
                      <div className="flex gap-3">
                         <select value={newSw.license} onChange={e => setNewSw({...newSw, license: e.target.value as any})} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none">
                            {Object.values(LicenseStatus).map(l => <option key={l} value={l}>{l}</option>)}
                         </select>
                         <button onClick={addSoftware} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-black transition-all">
                           ADD OPTION
                         </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-10 border-t border-slate-800 flex justify-end gap-4">
                  <button onClick={() => setActiveTab('info')} className="px-8 py-3 text-xs font-black text-slate-500 hover:text-white transition-colors">DISCARD CHANGES</button>
                  <button 
                    onClick={handleUpdate}
                    disabled={isProcessing}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-black py-3 px-10 rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-95 disabled:opacity-50"
                  >
                    {isProcessing ? 'Pushing Data...' : 'Assert Configuration Updates'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'book' && (
              <div className="animate-in slide-in-from-right-4 duration-300 max-w-lg mx-auto py-10">
                {system.status === SystemStatus.NOT_WORKING ? (
                   <div className="text-center py-20 bg-rose-500/5 rounded-3xl border border-rose-500/10">
                     <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <i className="fa-solid fa-triangle-exclamation text-rose-500 text-2xl"></i>
                     </div>
                     <h4 className="text-xl font-black text-rose-500">Booking Intercepted</h4>
                     <p className="text-slate-500 text-sm mt-3 px-10">This workstation has critical hardware failures. Please use the Edit tab to verify and resolve maintenance issues before making reservations.</p>
                   </div>
                ) : (
                  <form onSubmit={handleBooking} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Event Date</label>
                        <input type="date" required value={bookingDate} onChange={e => setBookingDate(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Time Schedule</label>
                        <select value={bookingSlot} onChange={e => setBookingSlot(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none">
                          {SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Batch Identifier</label>
                      <input type="text" placeholder="e.g. IT-FALL-2024-SECTION-A" required value={bookingBatch} onChange={e => setBookingBatch(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Lab Session Title</label>
                      <input type="text" placeholder="e.g. Network Security Practicum" required value={bookingSession} onChange={e => setBookingSession(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none" />
                    </div>
                    <button type="submit" disabled={isProcessing} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-emerald-600/20 mt-6 active:scale-[0.98]">
                      {isProcessing ? 'Processing Reservation...' : 'Confirm Lab Reservation'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Right Info Bar / Bookings */}
          <div className="w-full lg:w-96 bg-slate-800/20 p-6 md:p-10 border-t lg:border-t-0 lg:border-l border-slate-800">
             <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-8">Active Assignments</h3>
             <div className="space-y-4">
               {system.bookings.length === 0 ? (
                 <div className="text-center py-10 opacity-30">
                    <i className="fa-regular fa-calendar-xmark text-3xl mb-3 block"></i>
                    <p className="text-xs font-bold uppercase tracking-widest italic">No bookings found</p>
                 </div>
               ) : (
                 system.bookings.map((b, i) => (
                   <div key={i} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg relative group overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
                      <div className="text-xs font-black text-white mb-1 uppercase tracking-tight">{b.batch}</div>
                      <div className="text-[11px] text-slate-400 font-medium mb-3">{b.session}</div>
                      <div className="flex items-center gap-2 text-[10px] text-blue-500 font-black uppercase">
                        <i className="fa-regular fa-clock"></i>
                        {b.date} • {b.slot.split(' ')[0]}
                      </div>
                   </div>
                 ))
               )}
             </div>

             {msg && (
                <div className={`mt-10 p-4 rounded-2xl text-[11px] font-bold text-center border animate-in slide-in-from-bottom-2 ${msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
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
