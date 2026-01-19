
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { auth } from './services/firebase';
import { System, Booking, GridConfig } from './types';
import { dataService } from './services/dataService';
import LabMap from './components/LabMap';
import SystemModal from './components/SystemModal';
import BulkBookingModal from './components/BulkBookingModal';
import { LAB_MAP_ROWS, LAB_MAP_COLS } from './constants';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [systems, setSystems] = useState<System[]>([]);
  const [gridConfig, setGridConfig] = useState<GridConfig>({ rows: LAB_MAP_ROWS, cols: LAB_MAP_COLS });
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<System | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
  // Selection Logic
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPcIds, setSelectedPcIds] = useState<string[]>([]);
  const [isBulkBookingOpen, setIsBulkBookingOpen] = useState(false);

  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');

  const isPermissionDenied = syncError?.toLowerCase().includes('permission_denied');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    setSyncError(null);

    const unsubSystems = dataService.subscribeSystems(
      (newSystems) => {
        setSystems(newSystems);
        if (!isPermissionDenied) setLoading(false);
      },
      (err) => {
        setSyncError(`System Sync Failed: ${err.message}`);
        setLoading(false);
      }
    );

    const unsubGrid = dataService.subscribeGridConfig(
      (newGrid) => {
        setGridConfig(newGrid);
      },
      (err) => {
        setSyncError(`Grid Config Failed: ${err.message}`);
      }
    );

    return () => {
      unsubSystems();
      unsubGrid();
    };
  }, [user, isPermissionDenied]);

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
      {/* Navbar */}
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
          <div className="hidden sm:flex items-center gap-3">
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center transition-colors ${selectionMode ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
              <i className={`fa-solid ${selectionMode ? 'fa-check-double' : 'fa-user-shield'} text-[10px] sm:text-xs`}></i>
            </div>
            <div className="hidden lg:block">
              <p className="text-[9px] text-slate-500 font-black uppercase leading-none">{selectionMode ? 'Active Mode' : 'Logged in as'}</p>
              <p className="text-[10px] sm:text-[11px] text-white font-bold truncate max-w-[120px]">{selectionMode ? 'BULK SELECTION' : user.email}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={toggleSelectionMode}
            title={selectionMode ? 'Exit Selection Mode' : 'Enter Selection Mode'}
            className={`flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg sm:rounded-xl transition-all border active:scale-95 ${selectionMode ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-300 border-slate-700'}`}
          >
            <i className={`fa-solid ${selectionMode ? 'fa-arrow-left' : 'fa-list-check'}`}></i>
            <span className="hidden sm:inline">{selectionMode ? 'EXIT BULK' : 'BULK SELECT'}</span>
          </button>
          
          <button 
            onClick={() => setIsConfigOpen(true)}
            title="Update Layout Configuration"
            className="flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg sm:rounded-xl transition-all border border-slate-700 active:scale-95"
          >
            <i className="fa-solid fa-table-cells"></i>
            <span className="hidden sm:inline">LAYOUT</span>
          </button>

          <button 
            onClick={handleSignOut}
            title="Log Out"
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 rounded-lg sm:rounded-xl text-rose-500 border border-rose-500/20 transition-all active:scale-95"
          >
            <i className="fa-solid fa-power-off text-sm sm:text-base"></i>
          </button>
        </div>
      </header>

      {/* Main View */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-6 sm:py-10 relative">
        {loading && !isPermissionDenied ? (
          <div className="h-full flex flex-col items-center justify-center py-20 sm:py-40">
            <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-500 text-[10px] sm:text-xs font-black uppercase tracking-widest animate-pulse">Synchronizing Cloud Data...</p>
          </div>
        ) : (
          <div className="flex flex-col xl:flex-row gap-6 sm:gap-12">
            
            {/* Sidebar Stats (stacks on mobile) */}
            <div className="w-full xl:w-80 flex-shrink-0 space-y-4 sm:space-y-8">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl transition-layout">
                <h2 className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 sm:mb-8 border-b border-slate-800 pb-4 flex items-center gap-3">
                   <i className="fa-solid fa-chart-line text-blue-500"></i>
                   Floor Telemetry
                </h2>
                <div className="grid grid-cols-2 xl:grid-cols-1 gap-3 sm:gap-6">
                  <div className="bg-slate-800/40 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-700/50 flex flex-col justify-center">
                    <div className="text-slate-500 text-[8px] sm:text-[9px] font-black uppercase mb-1 tracking-widest">Capacity</div>
                    <div className="text-lg sm:text-2xl font-black text-white">{systems.length} <span className="text-slate-600 font-light text-[10px] sm:text-sm">NODES</span></div>
                  </div>
                  <div className="space-y-2 sm:space-y-4 col-span-1 xl:col-span-1">
                    <div className="flex justify-between items-center bg-emerald-500/5 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-emerald-500/10">
                      <span className="text-emerald-600/70 text-[7px] sm:text-[8px] font-black uppercase tracking-widest">Healthy</span>
                      <span className="text-emerald-500 text-base sm:text-xl font-black">{systems.filter(s => s.status === 'WORKING').length}</span>
                    </div>
                    <div className="flex justify-between items-center bg-amber-500/5 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-amber-500/10">
                      <span className="text-amber-600/70 text-[7px] sm:text-[8px] font-black uppercase tracking-widest">Issues</span>
                      <span className="text-amber-500 text-base sm:text-xl font-black">{systems.filter(s => s.status === 'PARTIAL').length}</span>
                    </div>
                    <div className="flex justify-between items-center bg-rose-500/5 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-rose-500/10">
                      <span className="text-rose-600/70 text-[7px] sm:text-[8px] font-black uppercase tracking-widest">Faults</span>
                      <span className="text-rose-500 text-base sm:text-xl font-black">{systems.filter(s => s.status === 'NOT_WORKING').length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Map Area */}
            <div className="flex-grow">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-10">
                <div>
                  <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tighter">Laboratory Floor Plan</h2>
                  <p className="text-slate-500 text-[11px] sm:text-sm mt-1 sm:mt-2 max-w-lg leading-relaxed">
                    {selectionMode 
                      ? 'SELECTING WORKSTATIONS FOR BATCH BOOKING. CLICK NODES TO HIGHLIGHT.' 
                      : 'REAL-TIME MONITORING ACTIVE. TAP A WORKSTATION FOR TELEMETRY.'}
                  </p>
                </div>
              </div>

              <div className="pb-24 sm:pb-32 transition-layout">
                <LabMap 
                  systems={systems} 
                  gridConfig={gridConfig}
                  selectedPcIds={selectedPcIds}
                  onSystemClick={handleSystemInteraction} 
                />
              </div>
            </div>
          </div>
        )}

        {/* Floating Bulk Action Bar (fixed to bottom) */}
        {selectedPcIds.length > 0 && (
          <div className="fixed bottom-4 sm:bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 duration-500 px-4 w-full max-w-2xl">
             <div className="bg-slate-900/95 backdrop-blur-2xl border border-slate-700/50 px-4 sm:px-8 py-4 sm:py-5 rounded-2xl sm:rounded-[2.5rem] shadow-2xl flex items-center gap-4 sm:gap-10">
                <div className="flex items-center gap-3 sm:gap-5">
                   <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-white text-lg sm:text-xl font-black shadow-lg shadow-blue-600/30">
                     {selectedPcIds.length}
                   </div>
                   <div className="hidden xs:block">
                      <p className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] sm:tracking-[0.2em] leading-tight">Workstations</p>
                      <p className="text-white font-black uppercase text-[10px] sm:text-xs">Selected</p>
                   </div>
                </div>
                
                <div className="h-8 w-px bg-slate-800"></div>
                
                <div className="flex items-center gap-2 sm:gap-4 flex-1">
                  <button 
                    onClick={() => setSelectedPcIds([])}
                    className="flex-shrink-0 px-2 sm:px-4 py-2 text-[8px] sm:text-[10px] font-black text-slate-500 hover:text-rose-400 transition-colors uppercase tracking-widest"
                  >
                    Clear
                  </button>
                  <button 
                    onClick={() => setIsBulkBookingOpen(true)}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-[9px] sm:text-[11px] font-black uppercase tracking-widest py-3 sm:py-3.5 px-4 sm:px-8 rounded-xl sm:rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-95"
                  >
                    Commit Reservation
                  </button>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* Grid Configuration Modal */}
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
                  <button type="submit" className="flex-[2] py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl sm:rounded-2xl shadow-xl shadow-blue-600/20 active:scale-95 transition-all">Apply Architecture</button>
                </div>
              </form>
           </div>
        </div>
      )}

      {/* Modals */}
      {selectedSystem && (
        <SystemModal 
          system={selectedSystem} 
          onClose={() => setSelectedSystem(null)}
          onBook={handleBook}
          onUpdate={handleUpdateSystem}
        />
      )}

      {isBulkBookingOpen && (
        <BulkBookingModal 
          selectedPcIds={selectedPcIds}
          onClose={() => setIsBulkBookingOpen(false)}
          onBook={handleBulkBook}
        />
      )}

      <footer className="bg-slate-950 border-t border-slate-800/50 py-6 sm:py-10 px-4 sm:px-8">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[8px] sm:text-[10px] text-slate-600 font-bold uppercase tracking-widest text-center sm:text-left">
            SysAdmin Lab Control &copy; 2024 • Secured Administrative Console BY Yokesh
          </p>
          <div className="flex gap-4">
            <i className="fa-brands fa-github text-slate-700 hover:text-slate-500 transition-colors"></i>
            <i className="fa-brands fa-linkedin text-slate-700 hover:text-slate-500 transition-colors"></i>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
