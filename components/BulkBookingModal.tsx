
import React, { useState, useMemo } from 'react';
import { Booking, SystemStatus, TimetableEntry, GridConfig } from '../types';
import { SLOTS, SYSTEMS_PER_LAB, LAB_MAP_COLS } from '../constants';
import { AlertCircle } from 'lucide-react';

interface BulkBookingModalProps {
  selectedPcIds: string[];
  onClose: () => void;
  onBook: (pcIds: string[], booking: Booking) => Promise<void>;
  timetables: TimetableEntry[];
  gridConfig: GridConfig;
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

const BulkBookingModal: React.FC<BulkBookingModalProps> = ({ 
  selectedPcIds, 
  onClose, 
  onBook,
  timetables,
  gridConfig
}) => {
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingSlot, setBookingSlot] = useState(SLOTS[0]);
  const [bookingBatch, setBookingBatch] = useState('');
  const [bookingSession, setBookingSession] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if any selected PC tables have active classes during the slot
  const conflictedBatches = useMemo(() => {
    const dayName = getDayNameFromDate(bookingDate);
    const periodsToCheck = getOverlappingPeriods(bookingSlot);
    
    // Find all distinct batches for selected PCs
    const activeBatches = new Set(selectedPcIds.map(id => getPcTableBatch(id, gridConfig)));
    
    // Find which of those are scheduled in the timetable
    const conflicts = timetables.filter(t => 
      t.day === dayName && 
      activeBatches.has(t.batch.toUpperCase()) && 
      periodsToCheck.includes(t.period)
    ).map(t => t.batch);

    return Array.from(new Set(conflicts));
  }, [bookingDate, bookingSlot, selectedPcIds, timetables, gridConfig]);

  const isConflict = conflictedBatches.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isConflict) {
      setError('This laboratory is already occupied according to the timetable.');
      return;
    }

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

            {isConflict && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-2xl text-[11px] text-rose-400 font-bold flex gap-3 items-center">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="font-black uppercase tracking-wider text-rose-500">Laboratory Occupied</p>
                  <p className="mt-1">Workstation table groups {conflictedBatches.join(', ')} are occupied according to the active timetable schedule. Bulk booking is disabled.</p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-rose-500 text-[11px] font-bold text-center">
                {error}
              </div>
            )}

            <div className="flex gap-4 pt-6">
              <button type="button" onClick={onClose} className="flex-1 py-4 text-xs font-black text-slate-500 hover:text-white uppercase tracking-widest">Abort Process</button>
              <button 
                type="submit" 
                disabled={isProcessing || isConflict}
                className={`flex-[2] text-white font-black py-4 rounded-[1.5rem] shadow-xl active:scale-95 transition-all disabled:opacity-50 ${
                  isConflict 
                    ? 'bg-rose-900/50 text-rose-500/70 border border-rose-900/30 cursor-not-allowed shadow-none' 
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                }`}
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
