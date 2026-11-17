const path = require('path');
const fs = require('fs');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright-core'));

const ARTIFACT_DIR = 'C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d';
const BASE_URL = 'http://localhost:5173';

async function run() {
  console.log('Launching browser to capture 5 portal verification screenshots...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  // 1. Customer Waiting Screen (Clean Radar, OTP, No Premature Driver Details)
  console.log('1. Capturing Customer Waiting Screen...');
  const page1 = await context.newPage();
  await page1.goto(BASE_URL + '/cabs', { waitUntil: 'domcontentloaded' });
  await page1.evaluate(() => {
    localStorage.removeItem('currentUser');
    const mockTrip = {
      booking_id: 'dsp_verify_screen_101',
      pickup_address: 'Suvarnabhumi Airport (BKK)',
      dropoff_address: 'Bangkok City (Sukhumvit / Silom / Riverside)',
      vehicle_type: 'SUV',
      ride_otp: '7842',
      status: 'SEARCHING',
      driver_id: null,
      driver_name: null,
      driver_phone: null,
      vehicle_plate: null,
      vehicle_model: null,
      pickup_lat: 13.6900,
      pickup_lng: 100.7501,
      dropoff_lat: 13.7367,
      dropoff_lng: 100.5605,
      driver_lat: null,
      driver_lng: null
    };
    localStorage.setItem('active_booking', JSON.stringify(mockTrip));
    localStorage.setItem('current_trip', JSON.stringify(mockTrip));
  });
  await page1.reload({ waitUntil: 'domcontentloaded' });
  await page1.waitForTimeout(2000);
  const path1 = path.join(ARTIFACT_DIR, 'e2e_1_customer_waiting_radar.png');
  await page1.screenshot({ path: path1 });
  console.log('Saved:', path1);
  await page1.close();

  // 2. Cab Vendor Fleet Management Portal
  console.log('2. Capturing Cab Vendor Fleet Management...');
  const page2 = await context.newPage();
  await page2.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page2.evaluate(() => {
    const vendorUser = {
      id: 'u-4',
      username: 'vendor',
      name: 'Bangkok Premium Cabs Fleet',
      role: 'vendor',
      vendor_type: 'vehicle'
    };
    localStorage.setItem('currentUser', JSON.stringify(vendorUser));
  });
  await page2.goto(BASE_URL + '/vendor', { waitUntil: 'domcontentloaded' });
  await page2.waitForTimeout(2000);
  // Dispatch custom event to switch to fleet tab or click button
  await page2.evaluate(() => {
    window.dispatchEvent(new CustomEvent('navigate-vendor-tab', { detail: 'fleet' }));
  });
  await page2.waitForTimeout(2000);
  const path2 = path.join(ARTIFACT_DIR, 'e2e_2_vendor_fleet_management.png');
  await page2.screenshot({ path: path2 });
  console.log('Saved:', path2);
  await page2.close();

  // 3. Admin Document Verification Console
  console.log('3. Capturing Admin Portal Fleet Document Verification...');
  const page3 = await context.newPage();
  await page3.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page3.evaluate(() => {
    const adminUser = {
      id: 'u-admin',
      username: 'admin',
      name: 'Operations Director',
      role: 'admin'
    };
    localStorage.setItem('currentUser', JSON.stringify(adminUser));
    localStorage.setItem('adminActiveTab', 'cab_dispatch');
  });
  await page3.goto(BASE_URL + '/admin', { waitUntil: 'domcontentloaded' });
  await page3.waitForTimeout(2500);
  // Switch subtab to fleet_verification inside CabDispatchMonitor
  await page3.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const fleetBtn = btns.find(b => b.textContent && b.textContent.includes('Fleet Vehicle Verification'));
    if (fleetBtn) fleetBtn.click();
  });
  await page3.waitForTimeout(2000);
  const path3 = path.join(ARTIFACT_DIR, 'e2e_3_admin_fleet_verification.png');
  await page3.screenshot({ path: path3 });
  console.log('Saved:', path3);
  await page3.close();

  // 4. Driver Companion Portal with Vehicle Selector & Shift Status
  console.log('4. Capturing Driver Companion Portal...');
  const page4 = await context.newPage();
  await page4.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page4.evaluate(() => {
    const driverUser = {
      id: 'drv-bkk-01',
      driver_id: 'drv-bkk-01',
      username: 'driver_somchai',
      full_name: 'Somchai Prasert',
      phone: '+66812345678',
      role: 'driver'
    };
    localStorage.setItem('currentUser', JSON.stringify(driverUser));
    localStorage.setItem('current_user', JSON.stringify(driverUser));
  });
  await page4.goto(BASE_URL + '/driver', { waitUntil: 'domcontentloaded' });
  await page4.waitForTimeout(2500);
  const path4 = path.join(ARTIFACT_DIR, 'e2e_4_driver_companion_portal.png');
  await page4.screenshot({ path: path4 });
  console.log('Saved:', path4);
  await page4.close();

  // 5. Super Admin Global Oversight & Dispatch Monitor
  console.log('5. Capturing Super Admin Portal...');
  const page5 = await context.newPage();
  await page5.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page5.evaluate(() => {
    const superUser = {
      id: 'u-super',
      username: 'superadmin',
      name: 'Global Executive Admin',
      role: 'superadmin'
    };
    localStorage.setItem('currentUser', JSON.stringify(superUser));
    localStorage.setItem('superAdminActiveTab', 'cab_dispatch');
  });
  await page5.goto(BASE_URL + '/superadmin', { waitUntil: 'domcontentloaded' });
  await page5.waitForTimeout(2500);
  const path5 = path.join(ARTIFACT_DIR, 'e2e_5_superadmin_oversight.png');
  await page5.screenshot({ path: path5 });
  console.log('Saved:', path5);
  await page5.close();

  await browser.close();
  console.log('All 5 screenshots captured successfully!');
}

run().catch(err => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
