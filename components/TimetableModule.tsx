import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  BookOpen, 
  Layers, 
  Edit, 
  Trash2, 
  Copy, 
  FileSpreadsheet, 
  Printer, 
  ArrowRight, 
  Plus, 
  Download, 
  Upload, 
  Filter, 
  CalendarDays,
  RefreshCw,
  Search,
  CheckCircle,
  FileText
} from 'lucide-react';
import { TimetableEntry, Subject, Faculty, TimeSlot } from '../types';
import { INITIAL_TIME_SLOTS } from '../timetableConstants';

interface TimetableModuleProps {
  timetables: TimetableEntry[];
  subjects: Subject[];
  faculty: Faculty[];
  timeSlots: TimeSlot[];
  onAddTimetable: (entry: Omit<TimetableEntry, 'id'>) => Promise<void>;
  onUpdateTimetable: (entry: TimetableEntry) => Promise<void>;
  onDeleteTimetable: (id: string) => Promise<void>;
  onDuplicateSemester: () => Promise<void>;
  onAddSubject: (subj: Subject) => Promise<void>;
  onAddFaculty: (fac: Faculty) => Promise<void>;
  simulatedDay: string;
  simulatedPeriod: number;
}

const DAYS_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const LAB_BATCHES = ['A1', 'A2', 'A3', 'A4', 'A5', 'B1', 'B2', 'B3', 'B4', 'B5', 'C1', 'C2', 'C3', 'C4', 'C5', 'D1', 'D2', 'D3', 'D4', 'E5', 'G1'];

export const TimetableModule: React.FC<TimetableModuleProps> = ({
  timetables,
  subjects,
  faculty,
  timeSlots,
  onAddTimetable,
  onUpdateTimetable,
  onDeleteTimetable,
  onDuplicateSemester,
  onAddSubject,
  onAddFaculty,
  simulatedDay,
  simulatedPeriod
}) => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'weekly' | 'daily' | 'faculty' | 'subject' | 'lab' | 'admin'>('weekly');
  
  // Filter States
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('');
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  
  // Form State for Adding / Editing
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [formData, setFormData] = useState({
    day: 'MONDAY',
    period: 1,
    year: 'III',
    department: 'CSE',
    subjectCode: '',
    batch: 'A1',
    facultyName: '',
    laboratory: 'Computer Society and Security Lab',
    room: "ST.PAUL'S BLOCK-GROUND FLOOR"
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const showAlert = (type: 'success' | 'error', text: string) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 4000);
  };

  // Pre-fill Form for Adding/Editing
  const handleOpenAdd = () => {
    setEditingEntry(null);
    setFormData({
      day: 'MONDAY',
      period: 1,
      year: 'III',
      department: 'CSE',
      subjectCode: subjects[0]?.subjectCode || '',
      batch: 'A1',
      facultyName: faculty[0]?.name || '',
      laboratory: 'Computer Society and Security Lab',
      room: "ST.PAUL'S BLOCK-GROUND FLOOR"
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setFormData({
      day: entry.day,
      period: entry.period,
      year: entry.year,
      department: entry.department,
      subjectCode: entry.subjectCode,
      batch: entry.batch,
      facultyName: entry.faculty,
      laboratory: entry.laboratory || 'Computer Society and Security Lab',
      room: entry.room || "ST.PAUL'S BLOCK-GROUND FLOOR"
    });
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedSubj = subjects.find(s => s.subjectCode === formData.subjectCode);
      const slot = INITIAL_TIME_SLOTS.find(s => s.period === Number(formData.period));
      
      const entryPayload = {
        day: formData.day,
        period: Number(formData.period),
        startTime: slot ? slot.startTime : '09:00 AM',
        endTime: slot ? slot.endTime : '10:00 AM',
        year: formData.year,
        department: formData.department,
        subject: selectedSubj ? selectedSubj.subjectName : 'Custom Subject',
        subjectCode: formData.subjectCode,
        batch: formData.batch,
        faculty: formData.facultyName,
        laboratory: formData.laboratory,
        room: formData.room
      };

      if (editingEntry) {
        await onUpdateTimetable({ ...entryPayload, id: editingEntry.id });
        showAlert('success', 'Timetable record updated successfully');
      } else {
        await onAddTimetable(entryPayload);
        showAlert('success', 'Timetable record created successfully');
      }
      setIsFormOpen(false);
    } catch (err: any) {
      showAlert('error', err.message || 'Failed to save record');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this timetable record?')) return;
    try {
      await onDeleteTimetable(id);
      showAlert('success', 'Timetable record deleted successfully');
    } catch (err: any) {
      showAlert('error', 'Failed to delete record');
    }
  };

  const handleCopy = async (entry: TimetableEntry) => {
    try {
      const { id, ...copiedData } = entry;
      await onAddTimetable({
        ...copiedData,
        day: copiedData.day === 'SATURDAY' ? 'MONDAY' : DAYS_OF_WEEK[DAYS_OF_WEEK.indexOf(copiedData.day) + 1]
      });
      showAlert('success', 'Record copied to next day!');
    } catch (err: any) {
      showAlert('error', 'Failed to copy record');
    }
  };

  const handleDuplicateSemester = async () => {
    if (!window.confirm('This will duplicate all records to clone the semester schedule. Continue?')) return;
    try {
      await onDuplicateSemester();
      showAlert('success', 'Semester duplicated successfully!');
    } catch (err: any) {
      showAlert('error', 'Failed to duplicate semester');
    }
  };

  // Export & Print Actions
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(timetables, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "timetable_export.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showAlert('success', 'JSON schema downloaded!');
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,ID,Day,Period,Start,End,Year,Subject,SubjectCode,Batch,Faculty,Room\n";
    timetables.forEach(t => {
      csvContent += `"${t.id}","${t.day}",${t.period},"${t.startTime}","${t.endTime}","${t.year}","${t.subject}","${t.subjectCode}","${t.batch}","${t.faculty}","${t.room}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", encodedUri);
    downloadAnchor.setAttribute("download", "timetable_export.csv");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showAlert('success', 'CSV sheet downloaded!');
  };

  const handlePrint = () => {
    window.print();
  };

  // Import Mock Processing
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      try {
        // Parse simple rows
        const lines = text.split('\n');
        let importCount = 0;
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const parts = line.split(',').map(p => p.replace(/^"|"$/g, ''));
          if (parts.length >= 10) {
            await onAddTimetable({
              day: parts[1] || 'MONDAY',
              period: Number(parts[2]) || 1,
              startTime: parts[3] || '09:00 AM',
              endTime: parts[4] || '10:00 AM',
              year: parts[5] || 'III',
              department: 'CSE',
              subject: parts[6] || 'Imported Subject',
              subjectCode: parts[7] || 'CS101',
              batch: parts[8] || 'A1',
              faculty: parts[9] || 'Faculty Name',
              laboratory: 'Computer Society and Security Lab',
              room: parts[10] || "ST.PAUL'S BLOCK-GROUND FLOOR"
            });
            importCount++;
          }
        }
        showAlert('success', `Successfully imported ${importCount} records from Excel/CSV!`);
      } catch (err) {
        showAlert('error', 'Error parsing import format. Please use correct columns.');
      }
    };
    reader.readAsText(file);
  };

  // Memoized Grid calculations for Weekly view
  const weeklyGrid = useMemo(() => {
    const grid: Record<string, Record<number, TimetableEntry[]>> = {};
    DAYS_OF_WEEK.forEach(day => {
      grid[day] = {};
      [1, 2, 3, 4, 5, 6].forEach(p => {
        grid[day][p] = [];
      });
    });

    timetables.forEach(t => {
      if (grid[t.day] && grid[t.day][t.period]) {
        grid[t.day][t.period].push(t);
      }
    });

    return grid;
  }, [timetables]);

  // Memoized filters
  const filteredFacultyEntries = useMemo(() => {
    if (!selectedFacultyId) return [];
    const fac = faculty.find(f => f.facultyId === selectedFacultyId);
    if (!fac) return [];
    return timetables.filter(t => t.faculty.toLowerCase().includes(fac.name.toLowerCase()));
  }, [selectedFacultyId, timetables, faculty]);

  const filteredSubjectEntries = useMemo(() => {
    if (!selectedSubjectCode) return [];
    return timetables.filter(t => t.subjectCode === selectedSubjectCode);
  }, [selectedSubjectCode, timetables]);

  const filteredLabEntries = useMemo(() => {
    if (!selectedBatch) return [];
    return timetables.filter(t => t.batch === selectedBatch);
  }, [selectedBatch, timetables]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl transition-all animate-in fade-in duration-300">
      
      {/* Module Title / Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-slate-800 pb-8 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Timetable Management</h1>
              <p className="text-slate-500 text-xs mt-0.5">Academic Scheduling, Batch Allocations & Faculty Workloads</p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-600/15"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Entry
          </button>
          
          <button 
            onClick={handleDuplicateSemester}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all active:scale-95"
          >
            <Copy className="w-3.5 h-3.5" />
            Clone Semester
          </button>

          <label className="flex items-center gap-2 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            Import Excel
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleImportCSV} 
              className="hidden" 
            />
          </label>

          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            Print PDF
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {alertMsg && (
        <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 text-xs font-bold animate-in slide-in-from-top-3 duration-250 ${
          alertMsg.type === 'success' 
            ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/15' 
            : 'bg-rose-500/5 text-rose-400 border-rose-500/15'
        }`}>
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{alertMsg.text}</span>
        </div>
      )}

      {/* Primary Tab Navigation */}
      <div className="flex border-b border-slate-800 mb-8 overflow-x-auto no-scrollbar">
        {[
          { id: 'weekly', label: 'Weekly Grid', icon: CalendarDays },
          { id: 'daily', label: 'Daily Schedule', icon: Clock },
          { id: 'faculty', label: 'Faculty Tracker', icon: User },
          { id: 'subject', label: 'Subject Syllabus', icon: BookOpen },
          { id: 'lab', label: 'Lab & Batches', icon: Layers }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                activeTab === t.id 
                  ? 'border-blue-500 text-blue-400 font-black' 
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tabs Content */}
      <div className="space-y-6">
        
        {/* TAB 1: WEEKLY GRID */}
        {activeTab === 'weekly' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800">
                  <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest w-32 border-r border-slate-800">Day</th>
                  {[1, 2, 3, 4, 5, 6].map(p => {
                    const slot = INITIAL_TIME_SLOTS.find(s => s.period === p);
                    return (
                      <th key={p} className="p-4 border-r border-slate-800 last:border-0">
                        <div className="text-[10px] font-black text-white">Period {p}</div>
                        <div className="text-[9px] text-slate-500 font-medium mt-0.5">{slot?.startTime} - {slot?.endTime}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                {DAYS_OF_WEEK.map(day => {
                  const isCurrentDay = day === simulatedDay;
                  return (
                    <tr key={day} className={`transition-colors ${isCurrentDay ? 'bg-blue-600/5' : 'hover:bg-slate-800/20'}`}>
                      <td className="p-4 font-black text-xs text-slate-300 border-r border-slate-800 bg-slate-950/20">
                        <div className="flex items-center gap-2">
                          {isCurrentDay && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></span>}
                          <span>{day}</span>
                        </div>
                      </td>
                      {[1, 2, 3, 4, 5, 6].map(p => {
                        const entries = weeklyGrid[day][p] || [];
                        const isCurrentSlot = isCurrentDay && p === simulatedPeriod;
                        return (
                          <td 
                            key={p} 
                            className={`p-3 border-r border-slate-800 last:border-0 vertical-align-top relative min-h-[100px] ${
                              isCurrentSlot ? 'bg-blue-600/10' : ''
                            }`}
                          >
                            {entries.length > 0 ? (
                              <div className="space-y-2">
                                {entries.map(entry => (
                                  <div 
                                    key={entry.id} 
                                    className={`p-2.5 rounded-xl border text-[10px] transition-all group/cell relative ${
                                      isCurrentSlot 
                                        ? 'bg-blue-950/40 border-blue-500/40 text-blue-200' 
                                        : 'bg-slate-950/40 border-slate-800/60 text-slate-300 hover:border-slate-700'
                                    }`}
                                  >
                                    <div className="flex justify-between items-start gap-1">
                                      <span className="font-bold text-[11px] truncate max-w-[120px]" title={entry.subject}>
                                        {entry.subject}
                                      </span>
                                      <span className="text-[8px] font-black bg-slate-800 px-1 py-0.2 rounded border border-slate-700 uppercase tracking-tight flex-shrink-0">
                                        {entry.batch}
                                      </span>
                                    </div>
                                    <div className="text-[9px] text-slate-500 mt-1 truncate">{entry.faculty}</div>
                                    <div className="text-[8px] text-slate-600 font-mono mt-1">{entry.subjectCode}</div>
                                    
                                    {/* Inline cell edit controls shown on hover */}
                                    <div className="absolute right-1 bottom-1 opacity-0 group-hover/cell:opacity-100 transition-opacity flex items-center gap-1 bg-slate-900 px-1 py-0.5 rounded border border-slate-700">
                                      <button 
                                        onClick={() => handleOpenEdit(entry)} 
                                        className="text-blue-400 hover:text-blue-300 p-0.5"
                                        title="Edit Entry"
                                      >
                                        <Edit className="w-3 h-3" />
                                      </button>
                                      <button 
                                        onClick={() => handleCopy(entry)} 
                                        className="text-amber-400 hover:text-amber-300 p-0.5"
                                        title="Copy to next day"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                      <button 
                                        onClick={() => handleDelete(entry.id)} 
                                        className="text-rose-500 hover:text-rose-450 p-0.5"
                                        title="Delete Entry"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-[8px] text-slate-700 uppercase font-black tracking-widest text-center py-6">
                                Free Slot
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: DAILY SCHEDULE */}
        {activeTab === 'daily' && (
          <div className="space-y-6">
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-blue-500" />
                  Today's Timeline ({simulatedDay})
                </h3>
                <p className="text-xs text-slate-500 mt-1">Timeline of classes scheduled for the laboratory floor plan</p>
              </div>
              <div className="bg-blue-600/10 border border-blue-500/20 px-4 py-2 rounded-xl text-blue-400 text-[10px] font-black uppercase tracking-widest">
                Active Slot: Period {simulatedPeriod}
              </div>
            </div>

            <div className="relative border-l border-slate-850 pl-6 ml-4 space-y-6">
              {[1, 2, 3, 4, 5, 6].map(p => {
                const slot = INITIAL_TIME_SLOTS.find(s => s.period === p);
                const entries = (timetables || []).filter(t => t.day === simulatedDay && t.period === p);
                const isActive = p === simulatedPeriod;

                return (
                  <div key={p} className="relative group">
                    {/* Circle Node */}
                    <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center ${
                      isActive 
                        ? 'bg-blue-500 border-blue-400 scale-125 shadow-lg shadow-blue-500/20 animate-pulse' 
                        : 'bg-slate-900 border-slate-750 group-hover:border-slate-500'
                    }`}>
                      {isActive && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                    </div>

                    <div className={`p-5 rounded-2xl border transition-all ${
                      isActive 
                        ? 'bg-blue-950/15 border-blue-500/30 shadow-lg' 
                        : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-900/60'
                    }`}>
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-white">Period {p}</span>
                          <span className="text-[10px] text-slate-500 font-medium">({slot?.startTime} - {slot?.endTime})</span>
                        </div>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[8px] font-black uppercase tracking-widest">
                            In Session
                          </span>
                        )}
                      </div>

                      {entries.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {entries.map(entry => (
                            <div key={entry.id} className="bg-slate-950/50 border border-slate-850 p-4 rounded-xl flex items-start justify-between gap-3">
                              <div>
                                <span className="px-1.5 py-0.5 bg-slate-800 rounded text-[8px] font-mono text-slate-400">{entry.subjectCode}</span>
                                <h4 className="text-xs font-black text-white mt-1.5">{entry.subject}</h4>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-2">
                                  <User className="w-3 h-3 text-slate-600" />
                                  <span>{entry.faculty}</span>
                                </div>
                                <div className="text-[9px] text-slate-600 font-bold uppercase mt-1 tracking-widest">
                                  {entry.laboratory}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <span className="bg-blue-600/10 border border-blue-500/20 text-blue-400 font-black text-[9px] px-2 py-0.5 rounded uppercase tracking-wide">
                                  Batch {entry.batch}
                                </span>
                                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleOpenEdit(entry)} className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded">
                                    <Edit className="w-3 h-3" />
                                  </button>
                                  <button onClick={() => handleDelete(entry.id)} className="p-1 hover:bg-slate-800 text-rose-500 rounded">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-600 text-xs italic">No running classes scheduled. Workstations are fully available for bookings.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: FACULTY TRACKER */}
        {activeTab === 'faculty' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-500" />
                  Faculty Workload Analyzer
                </h3>
                <p className="text-xs text-slate-500 mt-1">Audit active timetable entries and assignments for specific lecturers</p>
              </div>
              <div className="w-full md:w-80">
                <select 
                  value={selectedFacultyId} 
                  onChange={e => setSelectedFacultyId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-850 rounded-xl p-3 text-xs text-white outline-none focus:border-blue-500"
                >
                  <option value="">-- SELECT FACULTY LECTURER --</option>
                  {faculty.map(f => (
                    <option key={f.facultyId} value={f.facultyId}>{f.name} ({f.designation})</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedFacultyId ? (
              filteredFacultyEntries.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredFacultyEntries.map(entry => (
                    <div key={entry.id} className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl relative group hover:border-slate-700 transition-all">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[9px] font-mono font-bold text-blue-400 bg-blue-500/5 px-2 py-0.5 rounded-md border border-blue-500/10 uppercase tracking-wider">
                          {entry.subjectCode}
                        </span>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{entry.day}</span>
                      </div>
                      <h4 className="text-xs font-black text-white mt-3 leading-snug">{entry.subject}</h4>
                      
                      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-850/60">
                        <div>
                          <div className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">Period & Time</div>
                          <div className="text-[10px] text-slate-300 font-bold mt-1">Period {entry.period}</div>
                          <div className="text-[9px] text-slate-500">{entry.startTime}</div>
                        </div>
                        <div>
                          <div className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">Allocated Batch</div>
                          <div className="text-[10px] text-emerald-400 font-bold mt-1">Batch {entry.batch}</div>
                          <div className="text-[9px] text-slate-500">Year {entry.year}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-slate-950/20 border border-slate-850/40 rounded-2xl">
                  <User className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">No Active Workload entries scheduled in current cycle.</p>
                </div>
              )
            ) : (
              <div className="text-center py-20 bg-slate-950/20 border border-slate-850/40 rounded-2xl">
                <Filter className="w-10 h-10 text-slate-700 mx-auto mb-3 animate-pulse" />
                <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Please choose a Faculty Lecturer from the dropdown above.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SUBJECT SYLLABUS */}
        {activeTab === 'subject' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  Subject Syllabus Scheduling
                </h3>
                <p className="text-xs text-slate-500 mt-1">Inspect periods and batches assigned to individual courses</p>
              </div>
              <div className="w-full md:w-80">
                <select 
                  value={selectedSubjectCode} 
                  onChange={e => setSelectedSubjectCode(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-850 rounded-xl p-3 text-xs text-white outline-none focus:border-blue-500"
                >
                  <option value="">-- SELECT SUBJECT --</option>
                  {subjects.map(s => (
                    <option key={s.subjectCode} value={s.subjectCode}>{s.subjectName} ({s.subjectCode})</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedSubjectCode ? (
              filteredSubjectEntries.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSubjectEntries.map(entry => (
                    <div key={entry.id} className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl relative group hover:border-slate-700 transition-all">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[10px] font-black text-white">{entry.day}</span>
                        <span className="text-[8px] font-black bg-slate-800 text-blue-400 px-2 py-0.5 rounded uppercase tracking-wide">
                          Period {entry.period}
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-slate-400 mt-3 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        {entry.faculty}
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-850/60">
                        <div>
                          <div className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">Time Slot</div>
                          <div className="text-[10px] text-slate-300 font-bold mt-1">{entry.startTime}</div>
                          <div className="text-[9px] text-slate-500">{entry.endTime}</div>
                        </div>
                        <div>
                          <div className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">Batch Group</div>
                          <div className="text-[10px] text-amber-400 font-bold mt-1">Batch {entry.batch}</div>
                          <div className="text-[9px] text-slate-500">Year {entry.year}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-slate-950/20 border border-slate-850/40 rounded-2xl">
                  <BookOpen className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">No scheduled periods for this course code in this timetable.</p>
                </div>
              )
            ) : (
              <div className="text-center py-20 bg-slate-950/20 border border-slate-850/40 rounded-2xl">
                <Filter className="w-10 h-10 text-slate-700 mx-auto mb-3 animate-pulse" />
                <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Please choose a course subject from the dropdown above.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: LAB & BATCHES */}
        {activeTab === 'lab' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-500" />
                  Lab Partition & Workstation Batches
                </h3>
                <p className="text-xs text-slate-500 mt-1">Monitor the specific schedules assigned to each partitioned batch / desk group</p>
              </div>
              <div className="w-full md:w-80">
                <select 
                  value={selectedBatch} 
                  onChange={e => setSelectedBatch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-850 rounded-xl p-3 text-xs text-white outline-none focus:border-blue-500"
                >
                  <option value="">-- SELECT DESK BATCH --</option>
                  {LAB_BATCHES.map(b => (
                    <option key={b} value={b}>Batch Group {b}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedBatch ? (
              filteredLabEntries.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredLabEntries.map(entry => (
                    <div key={entry.id} className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl relative group hover:border-slate-700 transition-all">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[9px] font-mono font-bold text-blue-400 bg-blue-500/5 px-2 py-0.5 rounded-md border border-blue-500/10 uppercase tracking-wider">
                          {entry.subjectCode}
                        </span>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{entry.day}</span>
                      </div>
                      <h4 className="text-xs font-black text-white mt-3 leading-snug">{entry.subject}</h4>
                      <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-600" />
                        {entry.faculty}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-850/60">
                        <div>
                          <div className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">Period ID</div>
                          <div className="text-[10px] text-slate-300 font-bold mt-1">Period {entry.period}</div>
                        </div>
                        <div>
                          <div className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">Time range</div>
                          <div className="text-[9px] text-slate-400 font-bold mt-1">{entry.startTime}</div>
                          <div className="text-[8px] text-slate-500">{entry.endTime}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-slate-950/20 border border-slate-850/40 rounded-2xl">
                  <Layers className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">This workstation batch group currently has no running classes.</p>
                </div>
              )
            ) : (
              <div className="text-center py-20 bg-slate-950/20 border border-slate-850/40 rounded-2xl">
                <Filter className="w-10 h-10 text-slate-700 mx-auto mb-3 animate-pulse" />
                <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Please choose a partition batch group from the dropdown above.</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ADMIN ADD/EDIT RECORD SLIDE-OVER / DIALOG FORM */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">
                  {editingEntry ? 'Modify Class Slot Allocation' : 'Create New Timetable Entry'}
                </h2>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                  {editingEntry ? `Editing Record: ${editingEntry.id}` : 'Add a running class instance to the grid'}
                </p>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)} 
                className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400"
              >
                ✕
              </button>
            </div>

            <div className="p-8">
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Weekday</label>
                    <select 
                      value={formData.day} 
                      onChange={e => setFormData({ ...formData, day: e.target.value })} 
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3.5 text-xs text-white outline-none"
                    >
                      {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Period Index</label>
                    <select 
                      value={formData.period} 
                      onChange={e => setFormData({ ...formData, period: Number(e.target.value) })} 
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3.5 text-xs text-white outline-none"
                    >
                      {[1, 2, 3, 4, 5, 6].map(p => {
                        const slot = INITIAL_TIME_SLOTS.find(s => s.period === p);
                        return <option key={p} value={p}>Period {p} ({slot?.startTime} - {slot?.endTime})</option>;
                      })}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Allocated Course</label>
                    <select 
                      value={formData.subjectCode} 
                      onChange={e => setFormData({ ...formData, subjectCode: e.target.value })} 
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3.5 text-xs text-white outline-none"
                    >
                      {subjects.map(s => (
                        <option key={s.subjectCode} value={s.subjectCode}>{s.subjectName} ({s.subjectCode})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Batch Group</label>
                    <select 
                      value={formData.batch} 
                      onChange={e => setFormData({ ...formData, batch: e.target.value })} 
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3.5 text-xs text-white outline-none"
                    >
                      {LAB_BATCHES.map(b => <option key={b} value={b}>Batch {b}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Faculty Lecturer</label>
                    <select 
                      value={formData.facultyName} 
                      onChange={e => setFormData({ ...formData, facultyName: e.target.value })} 
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3.5 text-xs text-white outline-none"
                    >
                      {faculty.map(f => (
                        <option key={f.facultyId} value={f.name}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Auditing Year</label>
                    <select 
                      value={formData.year} 
                      onChange={e => setFormData({ ...formData, year: e.target.value })} 
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3.5 text-xs text-white outline-none"
                    >
                      {['I', 'II', 'III', 'IV'].map(yr => <option key={yr} value={yr}>Year {yr}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Laboratory Location</label>
                  <input 
                    type="text" 
                    value={formData.laboratory} 
                    onChange={e => setFormData({ ...formData, laboratory: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3.5 text-xs text-white outline-none"
                  />
                </div>

                <div className="flex gap-4 pt-4 border-t border-slate-850">
                  <button 
                    type="button" 
                    onClick={() => setIsFormOpen(false)} 
                    className="flex-1 py-3 text-xs font-black text-slate-500 hover:text-white uppercase tracking-widest"
                  >
                    Abort
                  </button>
                  <button 
                    type="submit" 
                    className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl transition-all shadow-xl shadow-blue-600/15 active:scale-95 text-xs uppercase tracking-widest"
                  >
                    {editingEntry ? 'Update Entry' : 'Create Entry'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
