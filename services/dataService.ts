
import { ref, onValue, set, update, push, get } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import { db } from './firebase';
import { System, SystemStatus, ComponentStatus, LicenseStatus, SoftwareInfo, Booking, GridConfig } from '../types';
import { REQUIRED_SOFTWARE } from '../constants';

const DB_PATHS = {
  SYSTEMS: 'systems',
  GRID: 'config/grid'
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
    if (missingRequired) {
      status = SystemStatus.PARTIAL;
    }
  }
  return { ...sys, status };
};

const generateInitialData = (rows: number, cols: number): System[] => {
  const systems: System[] = [];
  const count = rows * cols;
  for (let i = 1; i <= count; i++) {
    const pcId = `PC-${i.toString().padStart(3, '0')}`;
    systems.push({
      id: pcId,
      hardware: {
        pcId,
        cpu: 'Intel i7-12700',
        ram: '16GB DDR4',
        storage: '512GB NVMe SSD',
        os: 'Windows 11 Pro',
        keyboard: ComponentStatus.OK,
        mouse: ComponentStatus.OK,
        monitor: ComponentStatus.OK,
        network: ComponentStatus.CONNECTED,
      },
      software: [
        { name: 'VS Code', version: '1.82', installed: true, license: LicenseStatus.FREE },
        { name: 'Python', version: '3.11', installed: true, license: LicenseStatus.FREE },
        { name: 'Chrome', version: '118.0', installed: true, license: LicenseStatus.FREE }
      ],
      status: SystemStatus.WORKING,
      remarks: '',
      bookings: []
    });
  }
  return systems;
};

export const dataService = {
  subscribeSystems: (callback: (systems: System[]) => void, onError: (err: any) => void) => {
    const systemsRef = ref(db, DB_PATHS.SYSTEMS);
    return onValue(systemsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const systemsArray = Object.values(data) as System[];
        callback(systemsArray.map(s => ({ 
          ...s, 
          bookings: s.bookings ? Object.values(s.bookings) : [] 
        })));
      } else {
        const initial = generateInitialData(9, 18);
        const updates: any = {};
        initial.forEach(s => updates[s.id] = s);
        set(systemsRef, updates).catch(err => {
          console.warn("Could not initialize systems due to permissions. Using local mock data.");
          onError(err);
        });
        callback(initial);
      }
    }, (error) => {
      console.error("Firebase Systems Subscription Error:", error);
      onError(error);
      // Fallback to local generation so the UI doesn't crash
      callback(generateInitialData(9, 18));
    });
  },

  subscribeGridConfig: (callback: (config: GridConfig) => void, onError: (err: any) => void) => {
    const gridRef = ref(db, DB_PATHS.GRID);
    return onValue(gridRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        callback(data);
      } else {
        const initial = { rows: 9, cols: 18 };
        set(gridRef, initial).catch(err => {
          console.warn("Could not initialize grid due to permissions.");
          onError(err);
        });
        callback(initial);
      }
    }, (error) => {
      console.error("Firebase Grid Subscription Error:", error);
      onError(error);
      // Fallback to defaults
      callback({ rows: 9, cols: 18 });
    });
  },

  updateGridConfig: async (config: GridConfig): Promise<void> => {
    await set(ref(db, DB_PATHS.GRID), config);
    const systemsSnapshot = await get(ref(db, DB_PATHS.SYSTEMS));
    const currentCount = systemsSnapshot.exists() ? Object.keys(systemsSnapshot.val()).length : 0;
    const needed = config.rows * config.cols;
    
    if (needed > currentCount) {
      const extra = generateInitialData(config.rows, config.cols).slice(currentCount);
      const updates: any = {};
      extra.forEach(s => updates[s.id] = s);
      await update(ref(db, DB_PATHS.SYSTEMS), updates);
    }
  },

  updateSystem: async (updatedSystem: System): Promise<void> => {
    const healthChecked = calculateSystemHealth(updatedSystem);
    const { bookings, ...dataWithoutBookings } = healthChecked;
    await update(ref(db, `${DB_PATHS.SYSTEMS}/${updatedSystem.id}`), dataWithoutBookings);
  },

  bookSystem: async (pcId: string, booking: Booking): Promise<{ success: boolean; message: string }> => {
    return dataService.bookSystems([pcId], booking);
  },

  bookSystems: async (pcIds: string[], booking: Booking): Promise<{ success: boolean; message: string }> => {
    const updates: any = {};
    const errors: string[] = [];

    for (const pcId of pcIds) {
      const systemsRef = ref(db, `${DB_PATHS.SYSTEMS}/${pcId}`);
      const snapshot = await get(systemsRef);
      
      if (!snapshot.exists()) {
        errors.push(`${pcId}: Not found`);
        continue;
      }
      const sys = snapshot.val() as System;
      
      if (sys.status === SystemStatus.NOT_WORKING) {
        errors.push(`${pcId}: Maintenance lock`);
        continue;
      }

      const bookingsRef = ref(db, `${DB_PATHS.SYSTEMS}/${pcId}/bookings`);
      const bookingsSnapshot = await get(bookingsRef);
      const bookings = bookingsSnapshot.exists() ? Object.values(bookingsSnapshot.val() as any) as Booking[] : [];
      
      const existingInSlot = bookings.filter(b => b.date === booking.date && b.slot === booking.slot);
      if (existingInSlot.length >= 2) {
        errors.push(`${pcId}: Slot full`);
        continue;
      }

      const newBookingRef = push(bookingsRef);
      updates[`${DB_PATHS.SYSTEMS}/${pcId}/bookings/${newBookingRef.key}`] = booking;
    }

    if (Object.keys(updates).length === 0) {
      return { success: false, message: errors.join(', ') || 'No systems available for booking.' };
    }

    await update(ref(db), updates);
    return { success: true, message: `Successfully booked ${Object.keys(updates).length} workstations.` };
  }
};
