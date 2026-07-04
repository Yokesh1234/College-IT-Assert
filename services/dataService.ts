
import { ref, onValue, set, update, push, remove } from 'firebase/database';
import { db } from './firebase';
import { System, SystemStatus, ComponentStatus, LicenseStatus, Booking, GridConfig, MaintenanceLog, TimetableEntry, Subject, Faculty, TimeSlot } from '../types';
import { REQUIRED_SOFTWARE, TOTAL_LABS, SYSTEMS_PER_LAB } from '../constants';
import { INITIAL_TIMETABLES, INITIAL_SUBJECTS, INITIAL_FACULTY, INITIAL_TIME_SLOTS } from '../timetableConstants';

const DB_PATHS = {
  SYSTEMS: 'systems',
  GRID: 'config/grid',
  TIMETABLES: 'timetables',
  SUBJECTS: 'subjects',
  FACULTY: 'faculty',
  TIME_SLOTS: 'timeSlots'
};

export const calculateSystemHealth = (sys: System): System => {
  let status = SystemStatus.WORKING;
  const hw = sys.hardware;
  
  if (!hw.os || 
      hw.keyboard === ComponentStatus.FAULTY || 
      hw.keyboard === ComponentStatus.MISSING ||
      hw.monitor === ComponentStatus.FAULTY || 
      hw.monitor === ComponentStatus.MISSING) {
    status = SystemStatus.NOT_WORKING;
  } else {
    const missingRequired = REQUIRED_SOFTWARE.some(req => 
      !sys.software || !sys.software.find(s => s.name === req && s.installed)
    );
    
    if (missingRequired || hw.network === ComponentStatus.NOT_CONNECTED) {
      status = SystemStatus.PARTIAL;
    }
  }
  return { ...sys, status };
};

const generateInitialData = (): System[] => {
  const systems: System[] = [];
  const totalCount = TOTAL_LABS * SYSTEMS_PER_LAB;
  for (let i = 1; i <= totalCount; i++) {
    const pcId = `PC-${i.toString().padStart(3, '0')}`;
    systems.push({
      id: pcId,
      name: pcId, // Default alias is the ID
      hardware: {
        pcId,
        cpu: 'Intel i5-12400',
        ram: '16GB DDR4',
        storage: '477GB NVMe SSD',
        os: 'Windows 10 Pro',
        keyboard: ComponentStatus.OK,
        mouse: ComponentStatus.OK,
        monitor: ComponentStatus.OK,
        network: ComponentStatus.CONNECTED,
      },
      software: REQUIRED_SOFTWARE.map(name => ({
        name,
        version: 'Latest',
        installed: true,
        license: LicenseStatus.FREE
      })),
      status: SystemStatus.WORKING,
      remarks: '',
      bookings: [],
      logs: []
    });
  }
  return systems;
};

export const dataService = {
  subscribeSystems: (callback: (systems: System[]) => void, onError: (err: any) => void) => {
    const systemsRef = ref(db, DB_PATHS.SYSTEMS);
    return onValue(systemsRef, (snapshot) => {
      try {
        const data = snapshot.val();
        if (data) {
          const systemsArray = Object.values(data) as System[];
          callback(systemsArray.map(s => ({ 
            ...s, 
            bookings: s.bookings ? Object.values(s.bookings) : [],
            logs: s.logs ? Object.values(s.logs) : []
          })));
        } else {
          const initial = generateInitialData();
          callback(initial);
          const updates: any = {};
          initial.forEach(s => updates[s.id] = s);
          set(systemsRef, updates).catch(err => console.warn(err));
        }
      } catch (e) {
        onError(e);
      }
    }, (error) => {
      onError(error);
      callback(generateInitialData());
    });
  },

  subscribeGridConfig: (callback: (config: GridConfig) => void, onError: (err: any) => void) => {
    const gridRef = ref(db, DB_PATHS.GRID);
    return onValue(gridRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        callback({
          ...data,
          tableNames: data.tableNames || {}
        });
      } else {
        const initial = { rows: 9, cols: 3, tableNames: {} };
        callback(initial);
        set(gridRef, initial).catch(() => {});
      }
    }, (error) => {
      onError(error);
      callback({ rows: 9, cols: 3, tableNames: {} });
    });
  },

  updateSystem: async (updatedSystem: System): Promise<void> => {
    const healthChecked = calculateSystemHealth(updatedSystem);
    const { bookings, logs, ...dataToSave } = healthChecked;
    await update(ref(db, `${DB_PATHS.SYSTEMS}/${updatedSystem.id}`), dataToSave);
  },

  addMaintenanceLog: async (pcId: string, log: Omit<MaintenanceLog, 'id'>): Promise<void> => {
    const logsRef = ref(db, `${DB_PATHS.SYSTEMS}/${pcId}/logs`);
    const newLogRef = push(logsRef);
    await set(newLogRef, { ...log, id: newLogRef.key });
  },

  updateGridConfig: async (config: GridConfig): Promise<void> => {
    const gridRef = ref(db, DB_PATHS.GRID);
    await set(gridRef, config);
  },

  updateTableName: async (tableIndex: number, newName: string): Promise<void> => {
    const nameRef = ref(db, `${DB_PATHS.GRID}/tableNames/${tableIndex}`);
    await set(nameRef, newName);
  },

  bookSystems: async (pcIds: string[], booking: Booking): Promise<{ success: boolean; message: string }> => {
    const updates: any = {};
    for (const pcId of pcIds) {
      const bookingsRef = ref(db, `${DB_PATHS.SYSTEMS}/${pcId}/bookings`);
      const newBookingRef = push(bookingsRef);
      updates[`${DB_PATHS.SYSTEMS}/${pcId}/bookings/${newBookingRef.key}`] = booking;
    }
    await update(ref(db), updates);
    return { success: true, message: `Successfully booked ${pcIds.length} workstations.` };
  },

  bookSystem: async (pcId: string, booking: Booking): Promise<{ success: boolean; message: string }> => {
    return dataService.bookSystems([pcId], booking);
  },

  subscribeTimetables: (callback: (entries: TimetableEntry[]) => void, onError: (err: any) => void) => {
    const timetableRef = ref(db, DB_PATHS.TIMETABLES);
    return onValue(timetableRef, (snapshot) => {
      try {
        const data = snapshot.val();
        if (data) {
          const arr = Object.values(data) as TimetableEntry[];
          callback(arr);
        } else {
          // Auto-seed the initial timetable data visible in the image
          callback(INITIAL_TIMETABLES);
          const updates: any = {};
          INITIAL_TIMETABLES.forEach(t => {
            updates[t.id] = t;
          });
          set(timetableRef, updates).catch(err => console.warn(err));
        }
      } catch (e) {
        onError(e);
      }
    }, (error) => {
      onError(error);
      callback(INITIAL_TIMETABLES);
    });
  },

  subscribeSubjects: (callback: (subjects: Subject[]) => void, onError: (err: any) => void) => {
    const subjectsRef = ref(db, DB_PATHS.SUBJECTS);
    return onValue(subjectsRef, (snapshot) => {
      try {
        const data = snapshot.val();
        if (data) {
          callback(Object.values(data) as Subject[]);
        } else {
          callback(INITIAL_SUBJECTS);
          const updates: any = {};
          INITIAL_SUBJECTS.forEach(s => {
            updates[s.subjectCode] = s;
          });
          set(subjectsRef, updates).catch(err => console.warn(err));
        }
      } catch (e) {
        onError(e);
      }
    }, (error) => {
      onError(error);
      callback(INITIAL_SUBJECTS);
    });
  },

  subscribeFaculty: (callback: (faculty: Faculty[]) => void, onError: (err: any) => void) => {
    const facultyRef = ref(db, DB_PATHS.FACULTY);
    return onValue(facultyRef, (snapshot) => {
      try {
        const data = snapshot.val();
        if (data) {
          callback(Object.values(data) as Faculty[]);
        } else {
          callback(INITIAL_FACULTY);
          const updates: any = {};
          INITIAL_FACULTY.forEach(f => {
            updates[f.facultyId] = f;
          });
          set(facultyRef, updates).catch(err => console.warn(err));
        }
      } catch (e) {
        onError(e);
      }
    }, (error) => {
      onError(error);
      callback(INITIAL_FACULTY);
    });
  },

  subscribeTimeSlots: (callback: (slots: TimeSlot[]) => void, onError: (err: any) => void) => {
    const slotsRef = ref(db, DB_PATHS.TIME_SLOTS);
    return onValue(slotsRef, (snapshot) => {
      try {
        const data = snapshot.val();
        if (data) {
          callback(Object.values(data) as TimeSlot[]);
        } else {
          callback(INITIAL_TIME_SLOTS);
          const updates: any = {};
          INITIAL_TIME_SLOTS.forEach(s => {
            updates[s.period] = s;
          });
          set(slotsRef, updates).catch(err => console.warn(err));
        }
      } catch (e) {
        onError(e);
      }
    }, (error) => {
      onError(error);
      callback(INITIAL_TIME_SLOTS);
    });
  },

  addTimetable: async (entry: Omit<TimetableEntry, 'id'>): Promise<void> => {
    const timetableRef = ref(db, DB_PATHS.TIMETABLES);
    const newRef = push(timetableRef);
    if (newRef.key) {
      await set(newRef, { ...entry, id: newRef.key });
    }
  },

  updateTimetable: async (entry: TimetableEntry): Promise<void> => {
    await set(ref(db, `${DB_PATHS.TIMETABLES}/${entry.id}`), entry);
  },

  deleteTimetable: async (id: string): Promise<void> => {
    await remove(ref(db, `${DB_PATHS.TIMETABLES}/${id}`));
  },

  duplicateSemester: async (): Promise<void> => {
    // Fetches the current snapshot once and duplicates it by appending "-SEM2" to keys
    const timetableRef = ref(db, DB_PATHS.TIMETABLES);
    const currentRef = ref(db, DB_PATHS.TIMETABLES);
    const updates: any = {};
    INITIAL_TIMETABLES.forEach(t => {
      const dupId = `${t.id}-DUP`;
      updates[dupId] = { ...t, id: dupId };
    });
    await update(timetableRef, updates);
  },

  addSubject: async (subject: Subject): Promise<void> => {
    await set(ref(db, `${DB_PATHS.SUBJECTS}/${subject.subjectCode}`), subject);
  },

  deleteSubject: async (subjectCode: string): Promise<void> => {
    await remove(ref(db, `${DB_PATHS.SUBJECTS}/${subjectCode}`));
  },

  addFaculty: async (fac: Faculty): Promise<void> => {
    await set(ref(db, `${DB_PATHS.FACULTY}/${fac.facultyId}`), fac);
  },

  deleteFaculty: async (facultyId: string): Promise<void> => {
    await remove(ref(db, `${DB_PATHS.FACULTY}/${facultyId}`));
  },

  saveTimeSlots: async (slots: TimeSlot[]): Promise<void> => {
    const slotsRef = ref(db, DB_PATHS.TIME_SLOTS);
    const updates: any = {};
    slots.forEach(s => {
      updates[s.period] = s;
    });
    await set(slotsRef, updates);
  }
};
