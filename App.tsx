
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from './services/firebase';
import { System, Booking, GridConfig, TimetableEntry, Subject, Faculty, TimeSlot } from './types';
import { dataService } from './services/dataService';
import LabMap from './components/LabMap';
import SystemModal from './components/SystemModal';
import BulkBookingModal from './components/BulkBookingModal';
import { LAB_MAP_ROWS, LAB_MAP_COLS } from './constants';
import { TimetableModule } from './components/TimetableModule';
import { TimeSimulator } from './components/TimeSimulator';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [systems, setSystems] = useState<System[]>([]);
  const [timetables, setTimetables] = useState<TimetableEntry[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [gridConfig, setGridConfig] = useState<GridConfig>({ rows: LAB_MAP_ROWS, cols: LAB_MAP_COLS });
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<System | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPcIds, setSelectedPcIds] = useState<string[]>([]);
  const [isBulkBookingOpen, setIsBulkBookingOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sidebar view tab routing state
  const [activeView, setActiveView] = useState<'map' | 'timetable'>('map');

  // Simulated System Clock states
  const [simulatedDay, setSimulatedDay] = useState<string>('MONDAY');
  const [simulatedPeriod, setSimulatedPeriod] = useState<number>(1);
  const [isRealTime, setIsRealTime] = useState<boolean>(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const [actualTime, setActualTime] = useState<Date>(new Date());

  // Keep actualTime ticking every second
  useEffect(() => {
    const timer = setInterval(() => {
      setActualTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update simulated clock based on real clock ticking
  useEffect(() => {
    if (!isRealTime) return;

    const updateRealTime = () => {
      const now = new Date();
      const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const rawDay = days[now.getDay()].toUpperCase();
      // Sunday is not in standard timetables, fallback to MONDAY
      setSimulatedDay(rawDay === 'SUNDAY' ? 'MONDAY' : rawDay);

      const hour = now.getHours();
      const min = now.getMinutes();
      const timeInMins = hour * 60 + min;

      // Period hours mapping:
      if (timeInMins >= 540 && timeInMins < 600) setSimulatedPeriod(1); // 9-10 AM
      else if (timeInMins >= 600 && timeInMins < 675) setSimulatedPeriod(2); // 10-11:15 AM (approx)
      else if (timeInMins >= 675 && timeInMins < 735) setSimulatedPeriod(3); // 11:15-12:15 PM
      else if (timeInMins >= 735 && timeInMins < 795) setSimulatedPeriod(4); // 12:15-1:15 PM
      else if (timeInMins >= 795 && timeInMins < 855) setSimulatedPeriod(5); // 1:15-2:15 PM
      else if (timeInMins >= 855 && timeInMins < 915) setSimulatedPeriod(6); // 2:15-3:15 PM
      else setSimulatedPeriod(1); // Default fallback off-hours
    };

    updateRealTime();
    const interval = setInterval(updateRealTime, 60000);
    return () => clearInterval(interval);
  }, [isRealTime]);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    setSyncError(null);

    const safetyTimeout = setTimeout(() => {
      setLoading(false);
      if (systems.length === 0) {
        setSyncError("Connection slow. Check your internet or laboratory firewall.");
      }
    }, 10000);

    const unsubSystems = dataService.subscribeSystems(
      (newSystems) => {
        setSystems(newSystems);
        setLoading(false);
        clearTimeout(safetyTimeout);
      },
      (err) => {
        setSyncError(`Sync Warning: ${err.message}`);
        setLoading(false);
        clearTimeout(safetyTimeout);
      }
    );

    const unsubGrid = dataService.subscribeGridConfig(
      (newGrid) => {
        setGridConfig(newGrid);
      },
      (err) => {
        console.warn("Grid config fetch failed:", err);
      }
    );

    const unsubTimetables = dataService.subscribeTimetables(
      (newTimetables) => {
        setTimetables(newTimetables);
      },
      (err) => {
        console.warn("Timetables database subscription failed:", err);
      }
    );

    const unsubSubjects = dataService.subscribeSubjects(
      (newSubjects) => {
        setSubjects(newSubjects);
      },
      (err) => {
        console.warn("Subjects database subscription failed:", err);
      }
    );

    const unsubFaculty = dataService.subscribeFaculty(
      (newFaculty) => {
        setFaculty(newFaculty);
      },
      (err) => {
        console.warn("Faculty database subscription failed:", err);
      }
    );

    const unsubTimeSlots = dataService.subscribeTimeSlots(
      (newSlots) => {
        setTimeSlots(newSlots);
      },
      (err) => {
        console.warn("TimeSlots database subscription failed:", err);
      }
    );

    return () => {
      unsubSystems();
      unsubGrid();
      unsubTimetables();
      unsubSubjects();
      unsubFaculty();
      unsubTimeSlots();
      clearTimeout(safetyTimeout);
    };
  }, [user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleSignOut = () => signOut(auth);

  const handleSystemInteraction = (system: System) => {
    if (selectionMode) {
      setSelectedPcIds(prev => 
        prev.includes(system.id) 
          ? prev.filter(id => id !== system.id) 
          : [...prev, system.id]
      );
    } else {
      setSelectedSystem(system);
    }
  };

  const handleSelectTable = (pcIds: string[]) => {
    if (!selectionMode) return;
    
    const allPresent = pcIds.every(id => selectedPcIds.includes(id));
    if (allPresent) {
      // Deselect all PCs in this table
      setSelectedPcIds(prev => prev.filter(id => !pcIds.includes(id)));
    } else {
      // Add all PCs in this table that aren't already selected
      setSelectedPcIds(prev => {
        const newOnes = pcIds.filter(id => !prev.includes(id));
        return [...prev, ...newOnes];
      });
    }
  };

  const handleBook = async (pcId: string, booking: Booking) => {
    const result = await dataService.bookSystem(pcId, booking);
    if (!result.success) throw new Error(result.message);
  };

  const handleBulkBook = async (pcIds: string[], booking: Booking) => {
    const result = await dataService.bookSystems(pcIds, booking);
    if (!result.success) throw new Error(result.message);
    setSelectedPcIds([]);
    setSelectionMode(false);
  };

  const handleUpdateSystem = async (updated: System) => {
    await dataService.updateSystem(updated);
  };

  const handleUpdateGrid = async (e: React.FormEvent) => {
    e.preventDefault();
    await dataService.updateGridConfig(gridConfig);
    setIsConfigOpen(false);
  };

  const handleAddTimetable = async (entry: Omit<TimetableEntry, 'id'>) => {
    await dataService.addTimetable(entry);
  };
  const handleUpdateTimetable = async (entry: TimetableEntry) => {
    await dataService.updateTimetable(entry);
  };
  const handleDeleteTimetable = async (id: string) => {
    await dataService.deleteTimetable(id);
  };
  const handleDuplicateSemester = async () => {
    await dataService.duplicateSemester();
  };
  const handleAddSubject = async (subj: Subject) => {
    await dataService.addSubject(subj);
  };
  const handleAddFaculty = async (fac: Faculty) => {
    await dataService.addFaculty(fac);
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedPcIds([]);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl">
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-600/30">
              <i className="fa-solid fa-shield-halved text-white text-2xl sm:text-3xl"></i>
            </div>
          </div>
          <div className="text-center mb-8 sm:mb-10">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">LAB<span className="text-blue-500">CONTROL</span></h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-2">Centralized Monitoring Authentication</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4 sm:space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Email Address</label>
              <input 
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 sm:p-4 text-sm text-white focus:border-blue-500 outline-none transition-all"
                placeholder="admin@college.edu"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Security Key</label>
              <input 
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 sm:p-4 text-sm text-white focus:border-blue-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            {authError && <p className="text-rose-500 text-[10px] font-bold text-center bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">{authError}</p>}

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3 sm:py-4 rounded-xl shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98]">
              {isRegistering ? 'INITIALIZE ADMIN' : 'AUTHORIZE SESSION'}
            </button>
          </form>

          <div className="mt-6 sm:mt-8 text-center">
             <button onClick={() => setIsRegistering(!isRegistering)} className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors">
               {isRegistering ? 'Back to Login' : 'System Not Initialized? Create Admin'}
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <header className="sticky top-0 z-50 bg-slate-900/60 backdrop-blur-xl border-b border-slate-800/50 px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between transition-layout">
        <div className="flex items-center gap-2 sm:gap-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <i className="fa-solid fa-shield-halved text-white text-sm sm:text-lg"></i>
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-black text-white tracking-tight">LAB<span className="text-blue-500">CONTROL</span></h1>
              <p className="hidden sm:block text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-none">Administration</p>
            </div>
          </div>
          <div className="hidden md:block h-8 w-px bg-slate-800 mx-2"></div>
          {syncError && (
             <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500 text-[10px] font-black animate-pulse">
                <i className="fa-solid fa-cloud-bolt"></i>
                SYNCCLOUD_OFFLINE
             </div>
          )}
        </div>

        {/* Dynamic Live Clock & Current Period Display */}
        <div className="hidden md:flex items-center gap-4 bg-slate-950/80 px-4 py-2 rounded-2xl border border-slate-800/80 shadow-inner">
          <div className="flex items-center gap-2.5 border-r border-slate-800/85 pr-4">
            <i className="fa-solid fa-clock text-blue-400 text-xs animate-pulse"></i>
            <div className="text-left">
              <div className="text-[11px] font-black text-white leading-tight font-mono tracking-wider">
                {actualTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div className="text-[8px] text-slate-500 font-black uppercase tracking-wider leading-none mt-0.5">
                {actualTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse flex-shrink-0"></div>
            <div className="text-left">
              <div className="text-[10px] font-black text-violet-400 uppercase tracking-wider leading-tight">
                {simulatedDay} • {(() => {
                  const active = timetables
                    .filter(t => t.day === simulatedDay && t.period === simulatedPeriod)
                    .map(t => t.batch.toUpperCase());
                  return active.length > 0 ? `SECTIONS: ${active.join(' / ')}` : 'FREE LAB';
                })()}
              </div>
              <div className="text-[8px] text-slate-400 font-bold leading-none mt-0.5 font-mono">
                Period {simulatedPeriod} ({(() => {
                  const pRange = [
                    '09:00 AM - 10:00 AM',
                    '10:00 AM - 11:00 AM',
                    '11:15 AM - 12:15 PM',
                    '12:15 PM - 01:15 PM',
                    '01:15 PM - 02:15 PM',
                    '02:15 PM - 03:15 PM'
                  ];
                  return pRange[simulatedPeriod - 1] || '09:00 AM - 10:00 AM';
                })()})
              </div>
            </div>
          </div>
          
          <div className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400">
            {isRealTime ? 'Real-Time' : 'Simulated'}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={toggleSelectionMode}
            className={`flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg sm:rounded-xl transition-all border active:scale-95 ${selectionMode ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-300 border-slate-700'}`}
          >
            <i className={`fa-solid ${selectionMode ? 'fa-arrow-left' : 'fa-list-check'}`}></i>
            <span className="hidden sm:inline">{selectionMode ? 'EXIT BULK' : 'BULK SELECT'}</span>
          </button>
          
          <button 
            onClick={() => setIsConfigOpen(true)}
            className="flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg sm:rounded-xl transition-all border border-slate-700 active:scale-95"
          >
            <i className="fa-solid fa-table-cells"></i>
            <span className="hidden sm:inline">LAYOUT</span>
          </button>

          <button onClick={handleSignOut} className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 rounded-lg sm:rounded-xl text-rose-500 border border-rose-500/20 transition-all active:scale-95">
            <i className="fa-solid fa-power-off text-sm sm:text-base"></i>
          </button>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 sm:px-6 py-6 sm:py-10 relative">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center py-20 sm:py-40">
            <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-500 text-[10px] sm:text-xs font-black uppercase tracking-widest animate-pulse">Establishing Cloud Socket...</p>
          </div>
        ) : (
          <div className="flex flex-col xl:flex-row gap-6 sm:gap-10">
            {/* Sidebar Rail */}
            <div className="w-full xl:w-72 flex-shrink-0 space-y-4 sm:space-y-6">
              
              {/* Responsive Date, Time, and Active Period widget */}
              <div className="md:hidden bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
                <h2 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-800 pb-3 flex items-center justify-between">
                  <span>Scheduler Clock</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800/80 text-[7px] text-violet-400 font-black tracking-widest">{isRealTime ? 'REAL-TIME' : 'SIMULATED'}</span>
                </h2>
                <div className="flex justify-between items-center bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Local Time</p>
                    <p className="text-sm font-black text-white font-mono">{actualTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Active Date</p>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-wide">{actualTime.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                </div>

                 <div className="flex items-center gap-3 bg-violet-950/10 border border-violet-900/20 p-3.5 rounded-xl">
                  <div className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse flex-shrink-0"></div>
                  <div>
                    <p className="text-[10px] font-black text-violet-400 uppercase tracking-wider leading-none">
                      {simulatedDay} • {(() => {
                        const active = timetables
                          .filter(t => t.day === simulatedDay && t.period === simulatedPeriod)
                          .map(t => t.batch.toUpperCase());
                        return active.length > 0 ? `SECTIONS: ${active.join(' / ')}` : 'FREE LAB';
                      })()}
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold mt-1 font-mono">
                      Period {simulatedPeriod} ({(() => {
                        const pRange = [
                          '09:00 AM - 10:00 AM',
                          '10:00 AM - 11:00 AM',
                          '11:15 AM - 12:15 PM',
                          '12:15 PM - 01:15 PM',
                          '01:15 PM - 02:15 PM',
                          '02:15 PM - 03:15 PM'
                        ];
                        return pRange[simulatedPeriod - 1] || '09:00 AM - 10:00 AM';
                      })()})
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation Menu */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl">
                <h2 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 border-b border-slate-800 pb-3">
                  Console Navigator
                </h2>
                <div className="space-y-2">
                  <button 
                    onClick={() => setActiveView('map')}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left group ${
                      activeView === 'map' 
                        ? 'bg-blue-600/10 border-blue-500/30 text-white font-bold' 
                        : 'bg-slate-950/45 border-slate-800/40 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <i className={`fa-solid fa-desktop transition-colors ${activeView === 'map' ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`}></i>
                      <span className="text-[11px] uppercase tracking-wider font-black">Interactive Lab Map</span>
                    </div>
                    {activeView === 'map' && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></div>}
                  </button>

                  <button 
                    onClick={() => setActiveView('timetable')}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left group ${
                      activeView === 'timetable' 
                        ? 'bg-violet-600/10 border-violet-500/30 text-white font-bold' 
                        : 'bg-slate-950/45 border-slate-800/40 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <i className={`fa-solid fa-calendar-days transition-colors ${activeView === 'timetable' ? 'text-violet-400' : 'text-slate-500 group-hover:text-slate-300'}`}></i>
                      <span className="text-[11px] uppercase tracking-wider font-black">📅 Timetable</span>
                    </div>
                    {activeView === 'timetable' && <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-ping"></div>}
                  </button>
                </div>
              </div>

              {syncError && (
                 <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-2xl">
                    <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest mb-1">Warning Telemetry</p>
                    <p className="text-[10px] text-slate-400 leading-tight">{syncError}</p>
                 </div>
              )}

              {/* Floor Telemetry */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl transition-layout">
                <h2 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 border-b border-slate-800 pb-3 flex items-center gap-2">
                   <i className="fa-solid fa-chart-line text-blue-500"></i>
                   Floor Telemetry
                </h2>
                <div className="grid grid-cols-2 xl:grid-cols-1 gap-4">
                  <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-750 flex flex-col justify-center">
                    <div className="text-slate-500 text-[8px] font-black uppercase mb-1 tracking-widest">Capacity</div>
                    <div className="text-xl font-black text-white">{systems.length} <span className="text-slate-600 font-light text-[10px]">NODES</span></div>
                  </div>
                  <div className="space-y-2 col-span-1 xl:col-span-1">
                    <div className="flex justify-between items-center bg-emerald-500/5 p-3 rounded-2xl border border-emerald-500/10">
                      <span className="text-emerald-600/70 text-[7px] font-black uppercase tracking-widest">Healthy</span>
                      <span className="text-emerald-500 text-lg font-black">{systems.filter(s => s.status === 'WORKING').length}</span>
                    </div>
                    <div className="flex justify-between items-center bg-amber-500/5 p-3 rounded-2xl border border-amber-500/10">
                      <span className="text-amber-600/70 text-[7px] font-black uppercase tracking-widest">Issues</span>
                      <span className="text-amber-500 text-lg font-black">{systems.filter(s => s.status === 'PARTIAL').length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Render Window */}
            <div className="flex-grow space-y-6 sm:space-y-8">
              {activeView === 'map' ? (
                <>
                  {/* Time simulator bar at the top */}
                  <TimeSimulator 
                    simulatedDay={simulatedDay}
                    simulatedPeriod={simulatedPeriod}
                    isRealTime={isRealTime}
                    onSetDay={setSimulatedDay}
                    onSetPeriod={setSimulatedPeriod}
                    onToggleRealTime={setIsRealTime}
                  />

                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div className="flex-1">
                      <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tighter">Laboratory Floor Plan</h2>
                      <p className="text-slate-500 text-[11px] mt-1.5 max-w-lg leading-relaxed">
                        {selectionMode 
                          ? 'SELECTING WORKSTATIONS (SINGLE PC OR SELECT TABLE).' 
                          : 'REAL-TIME MONITORING ACTIVE.'}
                      </p>
                    </div>
                    
                    <div className="w-full sm:w-72 relative group">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <i className="fa-solid fa-magnifying-glass text-slate-500 group-focus-within:text-blue-500 transition-colors text-xs"></i>
                      </div>
                      <input 
                        type="text"
                        placeholder="SEARCH PC NAME..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-3.5 pl-11 pr-4 text-[10px] font-black text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:bg-slate-900 outline-none transition-all tracking-widest uppercase"
                      />
                      {searchQuery && (
                        <button 
                          onClick={() => setSearchQuery('')}
                          className="absolute inset-y-0 right-4 flex items-center text-slate-600 hover:text-white transition-colors"
                        >
                          <i className="fa-solid fa-circle-xmark text-xs"></i>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="pb-16 transition-layout">
                    <LabMap 
                      systems={systems} 
                      gridConfig={gridConfig}
                      selectedPcIds={selectedPcIds}
                      onSystemClick={handleSystemInteraction} 
                      onTableSelect={handleSelectTable}
                      selectionMode={selectionMode}
                      searchQuery={searchQuery}
                      timetables={timetables}
                      simulatedDay={simulatedDay}
                      simulatedPeriod={simulatedPeriod}
                    />
                  </div>
                </>
              ) : (
                <TimetableModule 
                  timetables={timetables}
                  subjects={subjects}
                  faculty={faculty}
                  timeSlots={timeSlots}
                  onAddTimetable={handleAddTimetable}
                  onUpdateTimetable={handleUpdateTimetable}
                  onDeleteTimetable={handleDeleteTimetable}
                  onDuplicateSemester={handleDuplicateSemester}
                  onAddSubject={handleAddSubject}
                  onAddFaculty={handleAddFaculty}
                  simulatedDay={simulatedDay}
                  simulatedPeriod={simulatedPeriod}
                />
              )}
            </div>
          </div>
        )}

        {selectedPcIds.length > 0 && (
          <div className="fixed bottom-4 sm:bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 duration-500 px-4 w-full max-w-2xl">
             <div className="bg-slate-900/95 backdrop-blur-2xl border border-slate-700/50 px-4 sm:px-8 py-4 sm:py-5 rounded-2xl sm:rounded-[2.5rem] shadow-2xl flex items-center gap-4 sm:gap-10">
                <div className="flex items-center gap-3 sm:gap-5">
                   <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-white text-lg sm:text-xl font-black shadow-lg shadow-blue-600/30">
                     {selectedPcIds.length}
                   </div>
                   <div className="hidden xs:block">
                      <p className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest leading-tight">Batch</p>
                      <p className="text-white font-black uppercase text-[10px] sm:text-xs">Selected</p>
                   </div>
                </div>
                <div className="h-8 w-px bg-slate-800"></div>
                <div className="flex items-center gap-2 sm:gap-4 flex-1">
                  <button onClick={() => setSelectedPcIds([])} className="flex-shrink-0 px-2 sm:px-4 py-2 text-[8px] sm:text-[10px] font-black text-slate-500 hover:text-rose-400 transition-colors uppercase tracking-widest">Clear</button>
                  <button onClick={() => setIsBulkBookingOpen(true)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-[9px] sm:text-[11px] font-black uppercase tracking-widest py-3 sm:py-3.5 px-4 sm:px-8 rounded-xl sm:rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-95">Commit Reservation</button>
                </div>
             </div>
          </div>
        )}
      </main>

      {isConfigOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-12 shadow-2xl">
              <h2 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight">System Map Partitioning</h2>
              <form onSubmit={handleUpdateGrid} className="space-y-8 sm:space-y-10 mt-6 sm:mt-10">
                <div className="space-y-3 sm:space-y-4">
                   <div className="flex justify-between items-center">
                     <label className="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-widest">Rows</label>
                     <span className="text-white font-black text-base sm:text-lg bg-slate-800 px-3 sm:px-4 py-0.5 sm:py-1 rounded-full border border-slate-700">{gridConfig.rows}</span>
                   </div>
                   <input type="range" min="1" max="25" step="1" value={gridConfig.rows} onChange={e => setGridConfig({...gridConfig, rows: parseInt(e.target.value)})} className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
                </div>
                <div className="space-y-3 sm:space-y-4">
                   <div className="flex justify-between items-center">
                     <label className="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-widest">Columns</label>
                     <span className="text-white font-black text-base sm:text-lg bg-slate-800 px-3 sm:px-4 py-0.5 sm:py-1 rounded-full border border-slate-700">{gridConfig.cols}</span>
                   </div>
                   <input type="range" min="1" max="10" step="1" value={gridConfig.cols} onChange={e => setGridConfig({...gridConfig, cols: parseInt(e.target.value)})} className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsConfigOpen(false)} className="flex-1 py-3 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest">Abort</button>
                  <button type="submit" className="flex-[2] py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl sm:rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-95">Apply Architecture</button>
                </div>
              </form>
           </div>
        </div>
      )}

      {selectedSystem && (
        <SystemModal 
          system={selectedSystem} 
          onClose={() => setSelectedSystem(null)}
          onBook={handleBook}
          onUpdate={handleUpdateSystem}
          timetables={timetables}
          gridConfig={gridConfig}
          simulatedDay={simulatedDay}
          simulatedPeriod={simulatedPeriod}
        />
      )}

      {isBulkBookingOpen && (
        <BulkBookingModal 
          selectedPcIds={selectedPcIds}
          onClose={() => setIsBulkBookingOpen(false)}
          onBook={handleBulkBook}
          timetables={timetables}
          gridConfig={gridConfig}
        />
      )}

      <footer className="bg-slate-950 border-t border-slate-800/50 py-6 sm:py-10 px-4 sm:px-8">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[8px] sm:text-[10px] text-slate-600 font-bold uppercase tracking-widest text-center sm:text-left">
            SysAdmin Lab Control &copy; 2024 • Secured Console
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
