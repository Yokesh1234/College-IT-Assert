
import { ref, onValue, set, update, push, get } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import { db } from './firebase';
import { System, SystemStatus, ComponentStatus, LicenseStatus, SoftwareInfo, Booking, GridConfig } from '../types';
import { REQUIRED_SOFTWARE, TOTAL_LABS, SYSTEMS_PER_LAB } from '../constants';

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
      software: [
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
        const initial = generateInitialData();
        const updates: any = {};
        initial.forEach(s => updates[s.id] = s);
        set(systemsRef, updates).catch(err => onError(err));
        callback(initial);
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
        callback(data);
      } else {
        const initial = { rows: 9, cols: 3 };
        set(gridRef, initial).catch(err => onError(err));
        callback(initial);
      }
    }, (error) => {
      onError(error);
      callback({ rows: 9, cols: 3 });
    });
  },

  updateSystem: async (updatedSystem: System): Promise<void> => {
    const healthChecked = calculateSystemHealth(updatedSystem);
    const { bookings, ...dataWithoutBookings } = healthChecked;
    await update(ref(db, `${DB_PATHS.SYSTEMS}/${updatedSystem.id}`), dataWithoutBookings);
  },

  // Added updateGridConfig to fix the missing property error in App.tsx
  updateGridConfig: async (config: GridConfig): Promise<void> => {
    const gridRef = ref(db, DB_PATHS.GRID);
    await set(gridRef, config);
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
  }
};
