# Project Report: SysAdmin Lab Manager Pro (LABCONTROL)

## 1. Executive Summary
**SysAdmin Lab Manager Pro** (branded as **LABCONTROL**) is an advanced, full-stack, real-time computer laboratory management and workstation monitoring system designed for academic and enterprise system administrators. 

Built using a high-density, theatre-style layout map, the system provides real-time telemetry, automated hardware/software compliance status evaluation, maintenance log tracking, and advanced reservation management (both individual node scheduling and bulk classroom booking). Powered by **React 19, TypeScript, Tailwind CSS**, and synchronized instantly with a cloud-hosted database, LABCONTROL transforms manual lab tracking into an automated, interactive administrative dashboard.

---

## 2. System Architecture & Tech Stack

The application employs a robust, modern full-stack architecture optimized for low-latency state synchronization:

```
+-----------------------------------------------------------+
|                      CLIENT LAYER                         |
|   React 19 + TypeScript + Tailwind CSS + FontAwesome      |
|                    (Vite Build Tool)                      |
+-------------------------------------+---------------------+
                                      |
                         HTTP / WebSockets (Real-time)
                                      |
+-------------------------------------+---------------------+
|                     DATABASE LAYER                        |
|  Firebase Realtime Database (RTDB) & Firebase Auth        |
+-------------------------------------+---------------------+
                                      | (Optional Integration)
                                 Apps Script
                                      |
+-------------------------------------+---------------------+
|                 SPREADSHEET STORAGE BACKEND              |
|        Google Sheets (Systems, Bookings, HW/SW Logs)      |
+-----------------------------------------------------------+
```

### Core Frontend Stack
*   **Framework:** React 19 (Functional Components, custom Hooks)
*   **Language:** TypeScript (Strict type checking, enums for hardware/software states)
*   **Styling:** Tailwind CSS (Modern dark slate theme, responsive fluid grids, transitions)
*   **Icons:** FontAwesome v6 (Vector-based dashboard elements)
*   **Build System:** Vite (Fast module bundling and server hosting)

### Backend & Cloud Infrastructure
*   **Authentication:** Firebase Auth (Secure administrative account initialization and session control)
*   **Durable Persistence:** Firebase Realtime Database (Instant, websocket-based synchronization of node configurations, reservation records, and maintenance tables across all active client views)
*   **Secondary Spreadsheet Bridge:** Google Apps Script (`apps-script-backend.gs`) providing structured endpoints for optional bi-directional synchronization with Google Sheets.

---

## 3. Database Schema & Data Models

All critical models are declared with strong typing in `/types.ts` to ensure end-to-end data safety.

### 3.1. Workstation Node Model (`System`)
Each workstation PC has a complete telemetry tree:
```typescript
interface System {
  id: string;            // Unique identifier (e.g., PC-001)
  name?: string;         // Optional human-readable alias
  hardware: HardwareInfo;
  software: SoftwareInfo[];
  status: SystemStatus;  // Calculated state (WORKING | PARTIAL | NOT_WORKING)
  remarks: string;
  bookings: Booking[];   // List of scheduled slots
  logs?: MaintenanceLog[];
}
```

### 3.2. Hardware Telemetry (`HardwareInfo`)
```typescript
interface HardwareInfo {
  pcId: string;
  cpu: string;
  ram: string;
  storage: string;
  os: string;
  keyboard: ComponentStatus; // OK | FAULTY | MISSING
  mouse: ComponentStatus;
  monitor: ComponentStatus;
  network: ComponentStatus;   // Connected | Not Connected
}
```

### 3.3. Booking / Slot Reservation (`Booking`)
```typescript
interface Booking {
  pcId: string;
  date: string;         // YYYY-MM-DD
  slot: string;         // Schedule range
  batch: string;        // Class/Department code
  session: string;      // Topic description
}
```

### 3.4. Maintenance Log (`MaintenanceLog`)
```typescript
interface MaintenanceLog {
  id: string;
  timestamp: string;
  note: string;
  adminEmail: string;   // Auditor identifier
}
```

---

## 4. Key Functional Modules

### 4.1. Real-Time Interactive Floorplan (`LabMap` & `SystemSeat`)
*   **Dynamic Grid Layout:** Translates the cloud-synchronized layout structure (`rows`, `cols`) into a bento-style laboratory map. Supports live resizing from 1x1 grids to 25x10 layouts dynamically.
*   **High-Density Visualization:** Workstations are represented as miniature nodes that dynamically alter background colors, border styles, and text badges based on real-time health checks.
*   **Table-Level Batch Selectors:** Allows administrators to click a single table identifier (e.g., "TB-A1") to instantly select/deselect all nested workstations for rapid bulk administration.
*   **Live Text Query Filtering:** Fast client-side fuzzy searching highlighting compliant/matching nodes in real-time.

### 4.2. Automated Health Evaluation Engine (`calculateSystemHealth`)
The application eliminates manual compliance audits by running a real-time rule engine on every system state change:
1.  **Critical Failure (`NOT_WORKING`):** Triggered if the Operating System is missing (`!os`), or if any core input/output component (`keyboard`, `monitor`) is designated as `FAULTY` or `MISSING`.
2.  **Partial Failure / Warning (`PARTIAL`):** Triggered if any mandatory campus software (defined in `REQUIRED_SOFTWARE` in `constants.tsx`) is not installed, or if the network adapter reports `NOT_CONNECTED`.
3.  **Healthy (`WORKING`):** Triggered when all hardware peripherals are operating normally, the network is connected, and software packages are fully compliant.

### 4.3. Centralized Booking Engine (Individual & Bulk)
*   **Single Node Booking:** Accessible directly from the workstation's telemetry modal, allowing slot allocation for specific lecture sessions.
*   **Theater-Style Bulk Reservations:** Designed for quick laboratory partitioning. Administrators can select dozens of workstations, choose a calendar date, schedule slot, batch, and topic, and commit the reservation records across all targeted nodes in a single atomic database operation.

### 4.4. Log Auditing & Configuration Customizer
*   **Layout Partitioning Configurator:** Administrators can modify rows, columns, and assign custom table names (e.g., "AI Lab A", "Network Lab B") directly from the interface.
*   **Maintenance Audit Log:** Captures exact actions, timestamps, and the email of the administrator who performed maintenance tasks on individual nodes.

---

## 5. Security & Administration

*   **Firebase Authentication Guard:** The entire console is blocked behind a secure administrative login. Only authenticated users can access telemetry feeds, alter layout settings, add logs, or modify node parameters.
*   **Encrypted Secrets Handling:** Secure database URLs and API keys are stored in background configurations, ensuring public code repositories contain zero hardcoded credentials.

---

## 6. Installation & Deployment Guide

### Prerequisites
*   Node.js (v18.0.0 or higher)
*   NPM Package Manager

### Step-by-Step Installation
1.  **Clone the Repository:**
    ```bash
    git clone <repository_url>
    cd sysadmin-lab-manager-pro
    ```

2.  **Install Base Dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Setup:**
    Create a `.env.local` file in the root directory (or use `.env` during production environments) and supply your Google Gemini/Firebase secrets:
    ```env
    GEMINI_API_KEY=your_api_key_here
    ```

4.  **Run Development Server:**
    ```bash
    npm run dev
    ```
    The application will launch locally at `http://localhost:3000`.

5.  **Build and Compile for Production:**
    ```bash
    npm run build
    ```
    This generates highly optimized static assets inside the `/dist` directory, fully prepared for serverless edge deployments (Firebase Hosting, Cloud Run, etc.).
