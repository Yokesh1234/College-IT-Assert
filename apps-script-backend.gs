
/**
 * GOOGLE APPS SCRIPT BACKEND FOR LAB MONITORING SYSTEM
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a Google Sheet.
 * 2. Add 4 tabs: "SYSTEMS", "HARDWARE_STATUS", "SOFTWARE_STATUS", "BOOKINGS"
 * 3. Go to Extensions > Apps Script.
 * 4. Paste this code.
 * 5. Deploy as a Web App (Access: Anyone).
 */

const SS = SpreadsheetApp.getActiveSpreadsheet();

function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'getSystems') {
    return ContentService.createTextOutput(JSON.stringify(getAllData()))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({error: 'Invalid action'}))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const params = JSON.parse(e.postData.contents);
  const action = params.action;
  
  if (action === 'book') {
    return ContentService.createTextOutput(JSON.stringify(createBooking(params.data)))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getAllData() {
  const systemsSheet = SS.getSheetByName('SYSTEMS');
  const hwSheet = SS.getSheetByName('HARDWARE_STATUS');
  const swSheet = SS.getSheetByName('SOFTWARE_STATUS');
  const bookingsSheet = SS.getSheetByName('BOOKINGS');
  
  const systemsRaw = systemsSheet.getDataRange().getValues().slice(1);
  const hwRaw = hwSheet.getDataRange().getValues().slice(1);
  const swRaw = swSheet.getDataRange().getValues().slice(1);
  const bookingsRaw = bookingsSheet.getDataRange().getValues().slice(1);
  
  // Logic to join data by PC_ID
  return systemsRaw.map(sys => {
    const pcId = sys[0];
    const hw = hwRaw.find(h => h[0] === pcId) || [];
    const sw = swRaw.filter(s => s[0] === pcId);
    const bookings = bookingsRaw.filter(b => b[0] === pcId);
    
    // Status calculation logic based on user requirements
    // OS or Hardware fails -> NOT WORKING
    // Software missing -> PARTIAL
    let status = 'WORKING';
    
    // Hardware check
    const keyboard = hw[1];
    const mouse = hw[2];
    const monitor = hw[3];
    const network = hw[4];
    const os = sys[4];
    
    if (!os || keyboard === 'Faulty' || keyboard === 'Missing' || monitor === 'Faulty' || network === 'No Network') {
      status = 'NOT_WORKING';
    } else {
      // Software check (Simplified logic for demo)
      const required = ['VS Code', 'Python', 'Chrome'];
      const installedNames = sw.filter(s => s[3] === 'Yes').map(s => s[1]);
      const hasAllRequired = required.every(r => installedNames.includes(r));
      if (!hasAllRequired) status = 'PARTIAL';
    }
    
    return {
      id: pcId,
      status: status,
      hardware: {
        cpu: sys[1], ram: sys[2], storage: sys[3], os: os,
        keyboard, mouse, monitor, network
      },
      software: sw.map(s => ({ name: s[1], version: s[2], installed: s[3] === 'Yes', license: s[4] })),
      bookings: bookings.map(b => ({ date: b[1], slot: b[2], batch: b[3], session: b[4] }))
    };
  });
}

function createBooking(data) {
  const systems = getAllData();
  const sys = systems.find(s => s.id === data.pcId);
  
  if (!sys || sys.status === 'NOT_WORKING') {
    return { success: false, message: 'System unavailable' };
  }
  
  const existingCount = sys.bookings.filter(b => b.date === data.date && b.slot === data.slot).length;
  if (existingCount >= 2) {
    return { success: false, message: 'Slot full (max 2 sessions)' };
  }
  
  const sheet = SS.getSheetByName('BOOKINGS');
  sheet.appendRow([data.pcId, data.date, data.slot, data.batch, data.session]);
  return { success: true };
}
