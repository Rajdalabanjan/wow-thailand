// ========================================================================
// WOW THAILAND: Driver Chauffeur Companion Test Suite (Phase 4)
// Tests: Summary, Online/Offline, Duty Acceptance Race Conditions (409),
// 6-State Transitions, OTP Verification Gate, Real GPS Telemetry,
// Cash Reconciliation, Duplicate Prevention, and Trip History.
// ========================================================================

import { query, withTransaction } from '../src/config/db.js';
import { runCabMigrations } from '../src/config/migrate_cabs.js';
import { hashOtp, encryptOtp } from '../src/utils/cryptoHelper.js';
import jwt from 'jsonwebtoken';

const TEST_PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${TEST_PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || 'wow_thailand_secure_jwt_secret_2026_super_safe';

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    issuer: 'wow-thailand-api',
    audience: 'wow-thailand-users',
    expiresIn: '4h'
  });
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

async function postJson(endpoint, body, headers = {}) {
  return fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
}

async function getJson(endpoint, headers = {}) {
  return fetch(`${BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: { ...headers }
  });
}

async function runDriverCompanionTests() {
  console.log(`\n============================================================`);
  console.log(`🚘 WOW THAILAND: DRIVER COMPANION TEST SUITE (PHASE 4)`);
  console.log(`Testing Backend on ${BASE_URL} against MySQL wow_thailand`);
  console.log(`============================================================\n`);

  let passed = 0;
  let failed = 0;

  function testAssert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // 1. Ensure cab migrations are up to date
  await runCabMigrations();

  // 2. Prepare Test Tokens
  const driver1Token = createToken({
    id: 'usr-driver-somchai',
    username: 'driver_somchai',
    email: 'driver@thailand.com',
    role: 'driver'
  });

  const driver2Token = createToken({
    id: 'usr-driver-other',
    username: 'driver_other',
    email: 'driver2@example.com',
    role: 'driver'
  });

  const customerToken = createToken({
    id: 'cust-cab-01',
    username: 'cust_somkiat',
    email: 'somkiat@example.com',
    role: 'customer'
  });

  // Seed test users in MySQL
  await query(
    `INSERT INTO users (id, username, email, phone, role, password_hash)
     VALUES ('usr-driver-other', 'driver_other', 'driver2@example.com', '+66 89 888 7777', 'driver', '$2b$10$4kwzC5EhIjuXWkxDgzhOXeh95BkKBz2ZXr97kZuoDbwjMx5.VtGPi')
     ON DUPLICATE KEY UPDATE role = 'driver'`
  );

  // Seed two distinct driver records in MySQL
  await query(
    `INSERT INTO drivers (id, user_id, full_name, phone, license_number, vehicle_model, vehicle_plate, status)
     VALUES ('drv-bkk-01', 'usr-driver-somchai', 'Somchai Jaidee', '+66 83 456 7890', 'TH-DL-987234', 'Toyota Camry VIP', '1กข 4589', 'available')
     ON DUPLICATE KEY UPDATE full_name = 'Somchai Jaidee', vehicle_plate = '1กข 4589', vehicle_model = 'Toyota Camry VIP', status = 'available'`
  );

  // Clear any previous active trips for test driver so they start with clean slate
  await query("UPDATE taxi_dispatches SET ride_status = 'COMPLETED' WHERE driver_id = 'drv-bkk-01' AND ride_status IN ('DISPATCHED', 'ARRIVED', 'ON_TRIP')");

  // Driver 1 works for vnd-bangkok-cabs and drives an approved SUV, so the SUV test job
  // (3 passengers, 3 bags) is offered to them. Restored to the sedan at the end.
  await query("UPDATE drivers SET vendor_id = 'vnd-bangkok-cabs', active_vehicle_id = 'veh-fortuner-01' WHERE id = 'drv-bkk-01'");
  const restoreDriverVehicle = () =>
    query("UPDATE drivers SET active_vehicle_id = 'veh-camry-01', status = 'available' WHERE id = 'drv-bkk-01'");

  await query(
    `INSERT INTO drivers (id, user_id, full_name, phone, license_number, vehicle_model, vehicle_plate, status)
     VALUES ('drv-other-99', 'usr-driver-other', 'Kittisak Prasert', '+66 89 888 7777', 'TH-DL-888777', 'Toyota Fortuner SUV', '2ขค 9988', 'available')
     ON DUPLICATE KEY UPDATE full_name = 'Kittisak Prasert', status = 'available'`
  );

  try {
    // =============================================================
    // 1. DRIVER SUMMARY & ONLINE / OFFLINE TOGGLE
    // =============================================================
    console.log('--- 1. Testing Driver Summary & Online/Offline Duty Toggle ---');

    // 1.1 Fetch Driver Summary
    const summaryRes = await getJson('/api/v1/driver/summary', authHeader(driver1Token));
    testAssert(summaryRes.status === 200, 'Driver summary returns 200 OK');
    const summaryData = await summaryRes.json();
    testAssert(summaryData.success === true, 'Driver summary success is true');
    testAssert(summaryData.data.driver.name === 'Somchai Jaidee', 'Driver name matches profile');
    testAssert(summaryData.data.driver.vehicle_plate === '1กข 4589', 'Vehicle plate matches profile');
    testAssert(summaryData.data.metrics !== undefined, 'Returns aggregated metrics');

    // 1.2 Toggle Duty Status to Offline
    const offlineRes = await postJson('/api/v1/driver/toggle-status', { status: 'offline' }, authHeader(driver1Token));
    if (offlineRes.status !== 200) {
      console.log('DEBUG offlineRes:', offlineRes.status, await offlineRes.text());
    }
    testAssert(offlineRes.status === 200, 'Toggle to offline returns 200 OK');
    const offlineData = await offlineRes.json();
    testAssert(offlineData.status === 'offline', 'Status updated to offline in response');

    const [dbDrvOffline] = await query('SELECT status FROM drivers WHERE id = "drv-bkk-01"');
    testAssert(dbDrvOffline.status === 'offline', 'Database verifies driver status is offline');

    // 1.3 Toggle Duty Status back to Online (Available)
    const onlineRes = await postJson('/api/v1/driver/toggle-status', { status: 'available' }, authHeader(driver1Token));
    testAssert(onlineRes.status === 200, 'Toggle back to online returns 200 OK');
    const onlineData = await onlineRes.json();
    testAssert(onlineData.status === 'available', 'Status updated to available in response');

    // 1.4 Invalid status rejected
    const invalidToggleRes = await postJson('/api/v1/driver/toggle-status', { status: 'sleeping' }, authHeader(driver1Token));
    testAssert(invalidToggleRes.status === 400, 'Invalid status strictly rejected with 400');

    // =============================================================
    // 2. INCOMING DUTY OFFERS & CONCURRENT ACCEPTANCE RACE CONDITION
    // =============================================================
    console.log('\n--- 2. Testing Duty Offers & Concurrent Race Condition (409) ---');

    // Seed a new booking & ALLOCATED transfer dispatch
    const testBookingId = `bkg_driver_test_${Date.now()}`;
    const testDispatchId = `dsp_driver_test_${Date.now()}`;
    const testPlainOtp = '7391';
    const testOtpHash = hashOtp(testPlainOtp);
    const testOtpEnc = encryptOtp(testPlainOtp);

    await query(
      `INSERT INTO bookings (
        id, idempotency_key, customer_name, customer_phone, customer_email, start_date, end_date,
        base_amount_thb, platform_fee_thb, customer_currency, customer_total_amount,
        payment_currency, payment_amount, payment_status, booking_status
      ) VALUES (?, ?, 'Khun Pim', '+66 82 345 6789', 'pim@example.com', '2026-11-02', '2026-11-02',
        1250.00, 125.00, 'THB', 1250.00, 'THB', 1250.00, 'PENDING', 'Confirmed')`,
      [testBookingId, `idem_${Date.now()}`]
    );

    await query(
      `INSERT INTO taxi_dispatches (
        id, booking_id, vendor_id, transfer_type, pickup_address, dropoff_address, pickup_datetime,
        passenger_count, luggage_count, vehicle_category, distance_km, estimated_minutes,
        total_fare_thb, ride_status, ride_otp_hash, ride_otp_encrypted
      ) VALUES (?, ?, 'vnd-bangkok-cabs', 'AIRPORT_PICKUP', 'Suvarnabhumi Airport Terminal 1', 'Mandarin Oriental Bangkok',
        '2026-11-02 15:00:00', 3, 3, 'SUV', 35.0, 40, 1250.00, 'ALLOCATED', ?, ?)`,
      [testDispatchId, testBookingId, testOtpHash, testOtpEnc]
    );

    // 2.1 Fetch Duty Offers
    const offersRes = await getJson('/api/v1/driver/duty-offers', authHeader(driver1Token));
    testAssert(offersRes.status === 200, 'Duty offers query returns 200 OK');
    const offersData = await offersRes.json();
    testAssert(Array.isArray(offersData.data), 'Duty offers returned as array');
    const targetOffer = offersData.data.find(o => o.id === testDispatchId);
    testAssert(Boolean(targetOffer), 'Target offer visible in incoming duties pool');
    testAssert(targetOffer.total_fare_thb === 1250, 'Offer contains correct fare (฿1,250)');

    // 2.2 Driver 1 Accepts Duty
    const acceptRes1 = await postJson('/api/v1/driver/accept-duty', { dispatch_id: testDispatchId }, authHeader(driver1Token));
    testAssert(acceptRes1.status === 200, 'Driver 1 accepts duty returns 200 OK');
    const acceptData1 = await acceptRes1.json();
    testAssert(acceptData1.data.ride_status === 'DISPATCHED', 'Ride status is now DISPATCHED');

    // 2.3 Driver 2 Attempts to Accept the SAME Duty ➔ Must fail with 409 Conflict
    const acceptRes2 = await postJson('/api/v1/driver/accept-duty', { dispatch_id: testDispatchId }, authHeader(driver2Token));
    testAssert(acceptRes2.status === 409, 'Concurrent acceptance by Driver 2 strictly rejected with 409 Conflict');
    const acceptData2 = await acceptRes2.json();
    testAssert(acceptData2.success === false, 'Error response confirms duty unavailable');

    // 2.4 Verify Active Duty in Driver 1 Portal
    const activeDutyRes = await getJson('/api/v1/driver/active-duty', authHeader(driver1Token));
    testAssert(activeDutyRes.status === 200, 'Driver 1 active duty returns 200 OK');
    const activeDutyData = await activeDutyRes.json();
    testAssert(activeDutyData.active_duty.id === testDispatchId, 'Driver 1 active duty matches accepted dispatch');
    testAssert(activeDutyData.active_duty.ride_otp_hash === undefined, 'Driver NEVER sees customer ride_otp_hash');

    // =============================================================
    // 3. TRIP WORKFLOW: ARRIVAL & SECURE OTP VERIFICATION GATE
    // =============================================================
    console.log('\n--- 3. Testing Trip Lifecycle & OTP Verification Gate ---');

    // 3.1 Unassigned driver cannot update status (ownership enforcement)
    const unauthStatusRes = await postJson('/api/v1/driver/update-status', {
      dispatch_id: testDispatchId,
      status: 'ARRIVED'
    }, authHeader(driver2Token));
    testAssert(unauthStatusRes.status === 403, 'Unassigned Driver 2 updating status is strictly forbidden (403)');

    // 3.2 Driver 1 marks ARRIVED at pickup
    const arrivedRes = await postJson('/api/v1/driver/update-status', {
      dispatch_id: testDispatchId,
      status: 'ARRIVED'
    }, authHeader(driver1Token));
    testAssert(arrivedRes.status === 200, 'Driver marks ARRIVED returns 200 OK');
    const arrivedData = await arrivedRes.json();
    testAssert(arrivedData.ride_status === 'ARRIVED', 'Status transitioned to ARRIVED');

    // 3.3 Driver 1 submits INCORRECT OTP ➔ Must be rejected with 400
    const badOtpRes = await postJson('/api/v1/driver/update-status', {
      dispatch_id: testDispatchId,
      status: 'ON_TRIP',
      ride_otp: '9999'
    }, authHeader(driver1Token));
    testAssert(badOtpRes.status === 400, 'Incorrect ride OTP strictly rejected with 400');
    const badOtpData = await badOtpRes.json();
    testAssert(badOtpData.error.includes('Incorrect Ride OTP'), 'Clear error message displayed for chauffeur');

    // Verify status has NOT transitioned to ON_TRIP
    const [dbCheckArrived] = await query('SELECT ride_status FROM taxi_dispatches WHERE id = ?', [testDispatchId]);
    testAssert(dbCheckArrived.ride_status === 'ARRIVED', 'Ride status remains ARRIVED after bad OTP');

    // 3.4 Driver 1 submits CORRECT 4-digit OTP ('7391') ➔ Successfully starts trip
    const goodOtpRes = await postJson('/api/v1/driver/update-status', {
      dispatch_id: testDispatchId,
      status: 'ON_TRIP',
      ride_otp: testPlainOtp
    }, authHeader(driver1Token));
    testAssert(goodOtpRes.status === 200, 'Correct OTP verification returns 200 OK');
    const goodOtpData = await goodOtpRes.json();
    testAssert(goodOtpData.ride_status === 'ON_TRIP', 'Ride status is now ON_TRIP');

    // =============================================================
    // 4. AUTHENTICATED LIVE GPS TELEMETRY
    // =============================================================
    console.log('\n--- 4. Testing Authenticated Driver GPS Telemetry ---');

    const gpsLat = 13.69234;
    const gpsLng = 100.75123;
    const gpsRes = await postJson('/api/v1/driver/location', {
      dispatch_id: testDispatchId,
      latitude: gpsLat,
      longitude: gpsLng,
      heading: 180.5,
      speed: 38.0
    }, authHeader(driver1Token));
    testAssert(gpsRes.status === 200, 'Driver GPS ping returns 200 OK');
    const gpsData = await gpsRes.json();
    testAssert(gpsData.recorded === true, 'Telemetry ping recorded confirmation returned');

    // Verify stored location in DB
    const [latestLoc] = await query(
      'SELECT latitude, longitude FROM taxi_driver_locations WHERE driver_id = "drv-bkk-01" ORDER BY recorded_at DESC LIMIT 1'
    );
    testAssert(Math.abs(parseFloat(latestLoc.latitude) - gpsLat) < 0.0001, 'Stored GPS latitude matches device ping');

    // =============================================================
    // 5. TRIP COMPLETION, TOLL CHARGES & CASH RECONCILIATION
    // =============================================================
    console.log('\n--- 5. Testing Trip Completion, Toll Fee & Cash Reconciliation ---');

    // 5.1 Driver completes trip with ฿75 highway toll
    const completeRes = await postJson('/api/v1/driver/update-status', {
      dispatch_id: testDispatchId,
      status: 'COMPLETED',
      toll_fee_thb: 75.00
    }, authHeader(driver1Token));
    testAssert(completeRes.status === 200, 'Trip completion returns 200 OK');
    const completeData = await completeRes.json();
    testAssert(completeData.ride_status === 'COMPLETED', 'Ride status updated to COMPLETED');
    testAssert(completeData.total_fare_thb === 1325, 'Total fare includes ฿75 toll fee (1250 + 75 = ฿1325)');

    // 5.2 Driver records cash collected from passenger
    const cashRes = await postJson('/api/v1/cabs/payment/record-cash', {
      dispatch_id: testDispatchId,
      amount_collected_thb: 1325.00
    }, authHeader(driver1Token));
    testAssert(cashRes.status === 200, 'Cash collection recording returns 200 OK');
    const cashData = await cashRes.json();
    testAssert(cashData.data.payment_status === 'PAID', 'Payment status marked as PAID');

    // Verify database booking payment status
    const [dbBkg] = await query('SELECT payment_status, booking_status FROM bookings WHERE id = ?', [testBookingId]);
    testAssert(dbBkg.payment_status === 'PAID', 'Bookings table updated to PAID');
    testAssert(dbBkg.booking_status === 'Completed', 'Bookings table marked Completed');

    // 5.3 Duplicate Completion Prevention
    const dupCompleteRes = await postJson('/api/v1/driver/update-status', {
      dispatch_id: testDispatchId,
      status: 'COMPLETED'
    }, authHeader(driver1Token));
    testAssert(dupCompleteRes.status === 400, 'Duplicate trip completion attempt strictly rejected with 400');

    // =============================================================
    // 6. DRIVER TRIP HISTORY & METRICS AUDIT
    // =============================================================
    console.log('\n--- 6. Testing Driver Trip History & Real Database Metrics ---');

    const historyRes = await getJson('/api/v1/driver/trips', authHeader(driver1Token));
    testAssert(historyRes.status === 200, 'Driver trip history returns 200 OK');
    const historyData = await historyRes.json();
    testAssert(Array.isArray(historyData.data), 'Trip history returned as array');
    const completedTrip = historyData.data.find(t => t.id === testDispatchId);
    testAssert(Boolean(completedTrip), 'Completed transfer appears in driver history');
    testAssert(completedTrip.ride_status === 'COMPLETED', 'History confirms COMPLETED status');
    testAssert(completedTrip.toll_fee_thb === 75, 'History includes recorded toll fee');

    // Verify Driver 2 cannot see Driver 1's trips in their history
    const history2Res = await getJson('/api/v1/driver/trips', authHeader(driver2Token));
    const history2Data = await history2Res.json();
    testAssert(!history2Data.data.some(t => t.id === testDispatchId), 'Driver 2 history strictly isolated from Driver 1 trips');

    console.log(`\n============================================================`);
    console.log(`DRIVER COMPANION TESTS FINISHED: ${passed} PASSED, ${failed} FAILED`);
    console.log(`============================================================\n`);

    await restoreDriverVehicle();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Driver Companion Test Failed with error:', err.message);
    await restoreDriverVehicle().catch(() => {});
    process.exit(1);
  }
}

runDriverCompanionTests();
