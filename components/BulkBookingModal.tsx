
import React, { useState } from 'react';
import { Booking, SystemStatus } from '../types';
import { SLOTS } from '../constants';

interface BulkBookingModalProps {
  selectedPcIds: string[];
  onClose: () => void;
  onBook: (pcIds: string[], booking: Booking) => Promise<void>;
}

const BulkBookingModal: React.FC<BulkBookingModalProps> = ({ selectedPcIds, onClose, onBook }) => {
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingSlot, setBookingSlot] = useState(SLOTS[0]);
  const [bookingBatch, setBookingBatch] = useState('');
  const [bookingSession, setBookingSession] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);
    try {
      await onBook(selectedPcIds, {
        pcId: 'BULK',
        date: bookingDate,
        slot: bookingSlot,
        batch: bookingBatch,
        session: bookingSession
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Batch booking failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col">
        <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Bulk Laboratory Reservation</h2>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Applying to {selectedPcIds.length} Workstations</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="p-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Date of Event</label>
                <input type="date" required value={bookingDate} onChange={e => setBookingDate(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-sm text-white focus:border-blue-500 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Schedule Slot</label>
                <select value={bookingSlot} onChange={e => setBookingSlot(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-sm text-white focus:border-blue-500 outline-none">
                  {SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Batch / Department ID</label>
              <input type="text" placeholder="e.g. CS-2024-B" required value={bookingBatch} onChange={e => setBookingBatch(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-sm text-white focus:border-blue-500 outline-none" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Session Topic</label>
              <input type="text" placeholder="e.g. Database Management Lab" required value={bookingSession} onChange={e => setBookingSession(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-sm text-white focus:border-blue-500 outline-none" />
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-rose-500 text-[11px] font-bold text-center">
                {error}
              </div>
            )}

            <div className="flex gap-4 pt-6">
              <button type="button" onClick={onClose} className="flex-1 py-4 text-xs font-black text-slate-500 hover:text-white uppercase tracking-widest">Abort Process</button>
              <button 
                type="submit" 
                disabled={isProcessing}
                className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-[1.5rem] shadow-xl shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {isProcessing ? 'SYNCHRONIZING CLOUD...' : 'COMMIT BATCH RESERVATION'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BulkBookingModal;
