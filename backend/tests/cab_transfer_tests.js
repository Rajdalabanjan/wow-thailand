// ========================================================================
// WOW THAILAND: Phase 2 Cab & Airport Transfer Automated Test Suite
// Verifies APIs, 6-state lifecycle, 4-digit OTP, pricing & payments
// ========================================================================

import assert from 'assert';
import jwt from 'jsonwebtoken';
import { query, default as pool } from '../src/config/db.js';
import { runCabMigrations } from '../src/config/migrate_cabs.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'wow_thailand_dev_secret_key_change_in_production';

const TEST_PORT = 5004;
const BASE_URL = `http://localhost:${TEST_PORT}`;
const ACTIVE_JWT_SECRET = process.env.JWT_SECRET;
const JWT_ISSUER = 'wow_thailand';
const JWT_AUDIENCE = 'wow_thailand_app';

function createToken(payload) {
  return jwt.sign(payload, ACTIVE_JWT_SECRET, {
    expiresIn: '1h',
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  });
}

function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
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

async function putJson(endpoint, body, headers = {}) {
  return fetch(`${BASE_URL}${endpoint}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
}

async function runCabTests() {
  console.log(`\n============================================================`);
  console.log(`🚕 WOW THAILAND: CAB & AIRPORT TRANSFER TEST SUITE (PHASE 2)`);
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

  // Ensure migrations are up to date
  await runCabMigrations();

  // Spin up test server
  const { app } = await import('../src/server.js');
  const server = app.listen(TEST_PORT);

  const customerToken = createToken({
    id: 'cust-cab-01',
    username: 'cust_somkiat',
    email: 'somkiat@example.com',
    phone: '+66 81 234 5678',
    role: 'customer'
  });

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

  const adminToken = createToken({
    id: 'usr-admin-01',
    username: 'admin',
    role: 'admin'
  });

  // Seed test users
  await query(
    `INSERT INTO users (id, username, email, phone, role, password_hash)
     VALUES ('cust-cab-01', 'cust_somkiat', 'somkiat@example.com', '+66 81 234 5678', 'customer', '$2a$10$dummyhash')
     ON DUPLICATE KEY UPDATE username = 'cust_somkiat'`
  );
  await query(
    `INSERT INTO users (id, username, email, role, password_hash)
     VALUES ('usr-driver-other', 'driver_other', 'driver2@example.com', 'driver', '$2a$10$dummyhash')
     ON DUPLICATE KEY UPDATE username = 'driver_other'`
  );
  await query(
    `INSERT INTO drivers (id, user_id, full_name, phone, license_number)
     VALUES ('drv-other-99', 'usr-driver-other', 'Other Chauffeur', '+66 89 888 7777', 'TH-DL-888777')
     ON DUPLICATE KEY UPDATE full_name = 'Other Chauffeur'`
  );

  let createdDispatchId = null;
  let createdBookingId = null;
  let plainOtpCode = null;
  let cancelBookingId = null;

  try {
    // =============================================================
    // 1. FARE ESTIMATION & PRICING RULES
    // =============================================================
    console.log('--- 1. Testing Fare Estimation & Multi-Tier Pricing ---');

    // 1.1 Fixed Airport Route Estimate (BKK to Bangkok Central)
    const fixedEstRes = await postJson('/api/v1/cabs/estimate', {
      pickup_address: 'Suvarnabhumi Airport (BKK)',
      dropoff_address: 'Bangkok Central Hotels',
      target_currency: 'THB'
    });
    testAssert(fixedEstRes.status === 200, 'Fixed route estimation returns 200 OK');
    const fixedEstData = await fixedEstRes.json();
    testAssert(Array.isArray(fixedEstData.data) && fixedEstData.data.length === 3, 'Returns 3 vehicle tiers');

    const sedanFixed = fixedEstData.data.find(t => t.vehicle_category === 'SEDAN');
    const suvFixed = fixedEstData.data.find(t => t.vehicle_category === 'SUV');
    const vanFixed = fixedEstData.data.find(t => t.vehicle_category === 'VIP_VAN');

    testAssert(sedanFixed.total_fare_thb === 850, 'Sedan fixed fare matches catalog (฿850)');
    testAssert(suvFixed.total_fare_thb === 1250, 'SUV fixed fare matches catalog (฿1,250)');
    testAssert(vanFixed.total_fare_thb === 1750, 'VIP Van fixed fare matches catalog (฿1,750)');
    testAssert(sedanFixed.pricing_model === 'FIXED_ROUTE', 'Pricing model is FIXED_ROUTE');

    // 1.2 Distance-Based Pricing (Custom non-airport route, 40 km)
    const distEstRes = await postJson('/api/v1/cabs/estimate', {
      pickup_address: 'CentralWorld Mall Bangkok',
      dropoff_address: 'Ancient City Samut Prakan',
      distance_km: 40.0,
      target_currency: 'INR'
    });
    testAssert(distEstRes.status === 200, 'Distance estimation returns 200 OK');
    const distEstData = await distEstRes.json();
    const sedanDist = distEstData.data.find(t => t.vehicle_category === 'SEDAN');
    // Sedan: base 300 + 40km * 15 = 900 THB
    testAssert(sedanDist.total_fare_thb === 900, 'Sedan distance formula correct: 300 base + 40km * 15 = ฿900');
    testAssert(sedanDist.pricing_model === 'DISTANCE_BASED', 'Pricing model is DISTANCE_BASED');
    testAssert(sedanDist.currency_snapshot.customer_currency === 'INR', 'Currency converted to target currency (INR)');
    testAssert(sedanDist.currency_snapshot.customer_total_amount > 0, 'Customer display amount calculated');

    // =============================================================
    // 2. CAB BOOKING & IDEMPOTENCY
    // =============================================================
    console.log('\n--- 2. Testing Cab Booking Creation & 4-Digit OTP ---');

    const idempotencyKey = `cab_test_idem_${Date.now()}`;
    const bookingRes = await postJson('/api/v1/cabs/book', {
      customer_name: 'Khun Somkiat',
      customer_phone: '+66 81 234 5678',
      customer_email: 'somkiat@example.com',
      pickup_address: 'Suvarnabhumi Airport (BKK) Terminal 2',
      dropoff_address: 'Banyan Tree Bangkok Sathorn',
      pickup_datetime: '2026-11-05 14:30:00',
      transfer_type: 'AIRPORT_PICKUP',
      vehicle_category: 'SEDAN',
      passenger_count: 2,
      luggage_count: 2,
      payment_method: 'CASH_TO_DRIVER',
      idempotency_key: idempotencyKey
    }, authHeader(customerToken));

    const bookingBodyText = await bookingRes.text();
    if (bookingRes.status !== 201) {
      console.error('DEBUG bookingRes status:', bookingRes.status, 'body:', bookingBodyText);
    }
    testAssert(bookingRes.status === 201, 'Booking returns 201 Created');
    const bookingData = JSON.parse(bookingBodyText);
    testAssert(bookingData.success === true, 'Booking response success is true');
    testAssert(Boolean(bookingData.data.dispatch_id), 'Dispatch ID returned');
    testAssert(Boolean(bookingData.data.booking_id), 'Booking ID returned');
    testAssert(bookingData.data.ride_status === 'ALLOCATED', 'Initial ride status is strictly ALLOCATED');
    testAssert(bookingData.data.total_fare_thb === 850, 'Authoritative fare is ฿850 in THB');

    // Plain OTP verification
    testAssert(Boolean(bookingData.data.ride_otp), 'Plain 4-digit ride OTP returned to booking owner');
    testAssert(bookingData.data.ride_otp.length === 4, 'Ride OTP is exactly 4 digits');
    plainOtpCode = bookingData.data.ride_otp;
    createdDispatchId = bookingData.data.dispatch_id;
    createdBookingId = bookingData.data.booking_id;

    // Database check: verify plain OTP is NEVER stored in database plaintext
    const [dbDispatch] = await query('SELECT * FROM taxi_dispatches WHERE id = ?', [createdDispatchId]);
    testAssert(Boolean(dbDispatch.ride_otp_hash), 'DB stores ride_otp_hash');
    testAssert(dbDispatch.ride_otp_hash !== plainOtpCode, 'Plain OTP is NOT stored as plain text');

    // Test Idempotency: repeating request with same idempotency_key returns identical booking
    const repeatRes = await postJson('/api/v1/cabs/book', {
      customer_name: 'Khun Somkiat',
      customer_phone: '+66 81 234 5678',
      pickup_address: 'Suvarnabhumi Airport (BKK) Terminal 2',
      dropoff_address: 'Banyan Tree Bangkok Sathorn',
      pickup_datetime: '2026-11-05 14:30:00',
      idempotency_key: idempotencyKey
    }, authHeader(customerToken));
    testAssert(repeatRes.status === 200, 'Idempotent repeat request returns 200 OK');
    const repeatData = await repeatRes.json();
    testAssert(repeatData.idempotent === true, 'Response confirms idempotent retrieval');
    testAssert(repeatData.dispatch_id === createdDispatchId, 'Matches original dispatch ID');

    // =============================================================
    // 3. LIVE TRACKING & RIDE OTP PRIVACY
    // =============================================================
    console.log('\n--- 3. Testing Live Tracking & OTP Privacy ---');

    // 3.1 Anonymous Tracking Request: OTP is redacted
    const anonTrackRes = await getJson(`/api/v1/cabs/track/${createdDispatchId}`);
    testAssert(anonTrackRes.status === 200, 'Public tracking returns 200');
    const anonTrackData = await anonTrackRes.json();
    testAssert(anonTrackData.data.ride_otp === null, 'Anonymous request CANNOT see ride OTP (null)');
    testAssert(anonTrackData.data.ride_status === 'ALLOCATED', 'Tracking shows ALLOCATED status');

    // 3.2 Authenticated Booking Owner Tracking Request: OTP is decrypted & visible
    const ownerTrackRes = await getJson(`/api/v1/cabs/track/${createdDispatchId}`, authHeader(customerToken));
    testAssert(ownerTrackRes.status === 200, 'Owner tracking returns 200');
    const ownerTrackData = await ownerTrackRes.json();
    testAssert(ownerTrackData.data.ride_otp === plainOtpCode, 'Authenticated owner sees decrypted 4-digit ride OTP');
    testAssert(ownerTrackData.data.otp_instruction.includes('Your chauffeur is ready'), 'Contains chauffeur instruction text');

    // =============================================================
    // 4. CHAUFFEUR WORKFLOW & 6-STATE TRANSITIONS
    // =============================================================
    console.log('\n--- 4. Testing Chauffeur Companion Workflow & OTP Gate ---');

    // 4.1 Driver Somchai views duty offers
    const offersRes = await getJson('/api/v1/driver/duty-offers', authHeader(driver1Token));
    testAssert(offersRes.status === 200, 'Driver queries duty offers (200 OK)');
    const offersData = await offersRes.json();
    testAssert(offersData.data.some(o => o.id === createdDispatchId), 'Driver Somchai sees new ALLOCATED duty');

    // 4.2 Driver Somchai accepts the duty (ALLOCATED -> DISPATCHED)
    const acceptRes = await postJson('/api/v1/driver/accept-duty', {
      dispatch_id: createdDispatchId
    }, authHeader(driver1Token));
    testAssert(acceptRes.status === 200, 'Driver Somchai accepts duty returns 200 OK');
    const acceptData = await acceptRes.json();
    testAssert(acceptData.data.ride_status === 'DISPATCHED', 'Ride transitions to DISPATCHED');

    // 4.3 Concurrent acceptance prevention: Driver 2 tries to accept same duty
    const concurrentRes = await postJson('/api/v1/driver/accept-duty', {
      dispatch_id: createdDispatchId
    }, authHeader(driver2Token));
    testAssert(concurrentRes.status === 409, 'Concurrent acceptance by another driver rejected with 409 Conflict');

    // 4.4 Driver marks arrival at pickup (DISPATCHED -> ARRIVED)
    const arriveRes = await postJson('/api/v1/driver/update-status', {
      dispatch_id: createdDispatchId,
      status: 'ARRIVED'
    }, authHeader(driver1Token));
    testAssert(arriveRes.status === 200, 'Driver arrival returns 200 OK');
    const arriveData = await arriveRes.json();
    testAssert(arriveData.ride_status === 'ARRIVED', 'Ride status is now ARRIVED');

    // 4.5 Driver attempts to start trip with INCORRECT OTP -> REJECTED
    const badOtpRes = await postJson('/api/v1/driver/update-status', {
      dispatch_id: createdDispatchId,
      status: 'ON_TRIP',
      ride_otp: '0000'
    }, authHeader(driver1Token));
    testAssert(badOtpRes.status === 400, 'Incorrect ride OTP is strictly rejected (400)');

    // 4.6 Driver starts trip with VALID 4-digit OTP -> SUCCESS (ARRIVED -> ON_TRIP)
    const startRes = await postJson('/api/v1/driver/update-status', {
      dispatch_id: createdDispatchId,
      status: 'ON_TRIP',
      ride_otp: plainOtpCode
    }, authHeader(driver1Token));
    testAssert(startRes.status === 200, 'Valid ride OTP starts trip (200 OK)');
    const startData = await startRes.json();
    testAssert(startData.ride_status === 'ON_TRIP', 'Ride status is now ON_TRIP');

    // 4.7 Driver GPS ping during trip
    const gpsRes = await postJson('/api/v1/driver/location', {
      dispatch_id: createdDispatchId,
      latitude: 13.6900,
      longitude: 100.7500,
      heading: 270.5,
      speed: 65.0
    }, authHeader(driver1Token));
    testAssert(gpsRes.status === 200, 'Driver GPS location ping recorded (200 OK)');

    // Verify location saved in database
    const [dbLoc] = await query('SELECT * FROM taxi_driver_locations WHERE dispatch_id = ?', [createdDispatchId]);
    testAssert(Boolean(dbLoc), 'Driver location saved in taxi_driver_locations');
    testAssert(parseFloat(dbLoc.latitude) === 13.6900, 'Saved latitude matches telemetry ping');

    // 4.8 Driver completes trip (ON_TRIP -> COMPLETED)
    const completeRes = await postJson('/api/v1/driver/update-status', {
      dispatch_id: createdDispatchId,
      status: 'COMPLETED',
      toll_fee_thb: 50.00
    }, authHeader(driver1Token));
    testAssert(completeRes.status === 200, 'Driver completes trip (200 OK)');
    const completeData = await completeRes.json();
    testAssert(completeData.ride_status === 'COMPLETED', 'Ride status is now COMPLETED');
    testAssert(completeData.total_fare_thb === 900, 'Total fare includes ฿50 toll fee (850 + 50 = ฿900)');

    // =============================================================
    // 5. PAYMENT RECONCILIATION
    // =============================================================
    console.log('\n--- 5. Testing Payment Collection & Audit Trail ---');

    // 5.1 Driver records cash collected
    const cashRes = await postJson('/api/v1/cabs/payment/record-cash', {
      dispatch_id: createdDispatchId,
      amount_collected_thb: 900.00
    }, authHeader(driver1Token));
    testAssert(cashRes.status === 200, 'Cash collection recording returns 200 OK');
    const cashData = await cashRes.json();
    testAssert(cashData.data.payment_status === 'PAID', 'Payment status updated to PAID');

    // Verify booking payment status updated to PAID in bookings table
    const [dbBkg] = await query('SELECT payment_status FROM bookings WHERE id = ?', [createdBookingId]);
    testAssert(dbBkg.payment_status === 'PAID', 'Booking payment status updated to PAID in bookings table');

    // =============================================================
    // 6. CANCELLATION RESTRICTIONS & STATE VALIDATION
    // =============================================================
    console.log('\n--- 6. Testing Cancellation Rules & State Restrictions ---');

    // 6.1 Cannot cancel COMPLETED trip
    const cancelCompletedRes = await postJson('/api/v1/cabs/cancel', {
      dispatch_id: createdDispatchId,
      reason: 'Passenger changed mind'
    }, authHeader(customerToken));
    testAssert(cancelCompletedRes.status === 400, 'Cancelling a COMPLETED trip is rejected (400)');

    // 6.2 Test legitimate cancellation of an ALLOCATED trip
    const cancelTestRes = await postJson('/api/v1/cabs/book', {
      customer_name: 'Khun Somkiat',
      customer_phone: '+66 81 234 5678',
      pickup_address: 'Bangkok City',
      dropoff_address: 'Pattaya',
      pickup_datetime: '2026-11-06 10:00:00'
    }, authHeader(customerToken));
    const cancelJson = await cancelTestRes.json();
    const cancelDispatchId = cancelJson.data?.dispatch_id;
    cancelBookingId = cancelJson.data?.booking_id;

    // Missing reason rejected
    const noReasonRes = await postJson('/api/v1/cabs/cancel', {
      dispatch_id: cancelDispatchId
    }, authHeader(customerToken));
    testAssert(noReasonRes.status === 400, 'Cancellation without mandatory reason is rejected (400)');

    // Valid cancellation
    const validCancelRes = await postJson('/api/v1/cabs/cancel', {
      dispatch_id: cancelDispatchId,
      reason: 'Flight delayed by 4 hours'
    }, authHeader(customerToken));
    testAssert(validCancelRes.status === 200, 'Valid cancellation returns 200 OK');
    const validCancelData = await validCancelRes.json();
    testAssert(validCancelData.ride_status === 'CANCELLED', 'Ride status updated to CANCELLED');

    // =============================================================
    // 7. ADMIN DISPATCH CONSOLE & PRICING CONTROLS
    // =============================================================
    console.log('\n--- 7. Testing Admin Dispatch Management & Pricing Controls ---');

    // 7.1 Admin lists all dispatches
    const adminDispRes = await getJson('/api/v1/admin/cab-dispatches', authHeader(adminToken));
    testAssert(adminDispRes.status === 200, 'Admin lists cab dispatches (200 OK)');
    const adminDispData = await adminDispRes.json();
    testAssert(Array.isArray(adminDispData.data), 'Returns dispatches array');
    testAssert(adminDispData.data.some(d => d.id === createdDispatchId), 'Admin console sees created dispatch');

    // 7.2 Non-admin updating pricing is rejected
    const nonAdminPriceRes = await putJson('/api/v1/admin/cab-pricing', {
      vehicle_category: 'SEDAN',
      base_fare_thb: 350.00,
      per_km_rate_thb: 16.00,
      minimum_fare_thb: 400.00
    }, authHeader(driver1Token));
    testAssert(nonAdminPriceRes.status === 403, 'Non-admin updating pricing is forbidden (403)');

    // 7.3 Admin updates pricing successfully
    const adminPriceRes = await putJson('/api/v1/admin/cab-pricing', {
      vehicle_category: 'SEDAN',
      base_fare_thb: 300.00,
      per_km_rate_thb: 15.00,
      minimum_fare_thb: 350.00
    }, authHeader(adminToken));
    testAssert(adminPriceRes.status === 200, 'Admin updating pricing returns 200 OK');

    // Clean up test dispatches
    await query('DELETE FROM taxi_driver_locations WHERE dispatch_id IN (?, ?)', [createdDispatchId, cancelDispatchId]);
    await query('DELETE FROM taxi_dispatch_events WHERE dispatch_id IN (?, ?)', [createdDispatchId, cancelDispatchId]);
    await query('DELETE FROM taxi_payment_transactions WHERE dispatch_id IN (?, ?)', [createdDispatchId, cancelDispatchId]);
    await query('DELETE FROM taxi_dispatches WHERE id IN (?, ?)', [createdDispatchId, cancelDispatchId]);
    await query('DELETE FROM payments WHERE booking_id IN (?, ?)', [createdBookingId, cancelBookingId]);
    await query('DELETE FROM driver_assignments WHERE booking_id IN (?, ?)', [createdBookingId, cancelBookingId]);
    await query('DELETE FROM booking_items WHERE booking_id IN (?, ?)', [createdBookingId, cancelBookingId]);
    await query('DELETE FROM bookings WHERE id IN (?, ?)', [createdBookingId, cancelBookingId]);
    await query('DELETE FROM drivers WHERE id = ?', ['drv-other-99']);
    await query('DELETE FROM users WHERE id IN (?, ?)', ['cust-cab-01', 'usr-driver-other']);

  } catch (err) {
    console.error('\n❌ Cab Transfer Test Failed with error:', err.message);
  } finally {
    server.close();
    await pool.end();

    console.log(`\n============================================================`);
    console.log(`CAB TRANSFER TESTS FINISHED: ${passed} PASSED, ${failed} FAILED`);
    console.log(`============================================================\n`);

    if (failed > 0) process.exit(1);
    process.exit(0);
  }
}

runCabTests();
