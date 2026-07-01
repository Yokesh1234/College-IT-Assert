
export enum SystemStatus {
  WORKING = 'WORKING',
  PARTIAL = 'PARTIAL',
  NOT_WORKING = 'NOT_WORKING'
}

export enum ComponentStatus {
  OK = 'OK',
  FAULTY = 'FAULTY',
  MISSING = 'MISSING',
  CONNECTED = 'Connected',
  NOT_CONNECTED = 'Not Connected'
}

export enum LicenseStatus {
  FREE = 'Free',
  LICENSED = 'Licensed',
  EXPIRED = 'Expired'
}

export interface HardwareInfo {
  pcId: string;
  cpu: string;
  ram: string;
  storage: string;
  os: string;
  keyboard: ComponentStatus;
  mouse: ComponentStatus;
  monitor: ComponentStatus;
  network: ComponentStatus;
}

export interface SoftwareInfo {
  name: string;
  version: string;
  installed: boolean;
  license: LicenseStatus;
}

export interface Booking {
  pcId: string;
  date: string;
  slot: string;
  batch: string;
  session: string;
}

export interface MaintenanceLog {
  id: string;
  timestamp: string;
  note: string;
  adminEmail: string;
}

export interface System {
  id: string;
  name?: string; // System Alias
  hardware: HardwareInfo;
  software: SoftwareInfo[];
  status: SystemStatus;
  remarks: string;
  bookings: Booking[];
  logs?: MaintenanceLog[]; // Maintenance History
}

export interface GridConfig {
  rows: number;
  cols: number;
  tableNames?: Record<string, string>; // Mapping of tableIndex to custom names
}

export interface LabLayout {
  id: string;
  name: string;
  tables: LabTable[];
}

export interface LabTable {
  id: string;
  systems: System[];
}

export interface TimetableEntry {
  id: string;
  day: string; // "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"
  period: number; // 1, 2, 3, 4, 5, 6
  startTime: string;
  endTime: string;
  year: string; // "II", "III", "IV"
  department: string; // "CSE"
  subject: string;
  subjectCode: string;
  laboratory: string;
  batch: string;
  faculty: string;
  room: string;
}

export interface Subject {
  subjectCode: string;
  subjectName: string;
  department: string;
  year: string;
}

export interface Faculty {
  facultyId: string;
  name: string;
  designation: string;
  department: string;
}

export interface TimeSlot {
  period: number;
  startTime: string;
  endTime: string;
}

