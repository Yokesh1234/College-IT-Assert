
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

export interface System {
  id: string;
  hardware: HardwareInfo;
  software: SoftwareInfo[];
  status: SystemStatus;
  remarks: string;
  bookings: Booking[];
}

export interface GridConfig {
  rows: number;
  cols: number;
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
