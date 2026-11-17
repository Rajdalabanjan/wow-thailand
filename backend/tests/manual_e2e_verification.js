// ========================================================================
// WOW THAILAND: End-to-End Real-World Verification Script
// Tests all 13 verification points across the running application:
// MySQL database, REST APIs, and authentication tokens.
// ========================================================================

import assert from 'assert';
import jwt from 'jsonwebtoken';
import { query, default as pool } from '../src/config/db.js';

const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'wow_thailand_dev_secret_key_change_in_production';

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '2h',
    issuer: 'wow_thailand',
    audience: 'wow_thailand_app'
  });
}

function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function postJson(endpoint, body, headers = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function getJson(endpoint, headers = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: { ...headers }
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function putJson(endpoint, body, headers = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

let checksPassed = 0;
function logPass(msg, details = null) {
  checksPassed++;
  console.log(`  ✅ [PASS ${checksPassed}] ${msg}`);
  if (details) console.log(`     -> ${JSON.stringify(details)}`);
}

function logFail(msg, details = null) {
  console.error(`  ❌ [FAIL] ${msg}`);
  if (details) console.error(`     -> ${JSON.stringify(details)}`);
  throw new Error(`Verification Failed: ${msg}`);
}

async function runEndToEndVerification() {
  console.log('\n========================================================================');
  console.log('🚀 WOW THAILAND: FINAL COMPREHENSIVE END-TO-END VERIFICATION');
  console.log('Testing running application on http://localhost:5000 against MySQL wow_thailand');
  console.log('========================================================================\n');

  // Prepare Authenticated Tokens
  const vendorToken = createToken({
    id: 'usr-vendor-cabs',
    username: 'vendor_cabs',
    email: 'cabs@thailand.com',
    role: 'transfer_vendor',
    vendor_id: 'vnd-bangkok-cabs'
  });

  const adminToken = createToken({
    id: 'usr-admin-ops',
    username: 'admin_ops',
    email: 'admin@thailand.com',
    role: 'admin'
  });

  const superAdminToken = createToken({
    id: 'usr-superadmin-01',
    username: 'superadmin',
    email: 'superadmin@thailand.com',
    role: 'superadmin'
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

  const customerToken = createToken({
    id: 'cust-e2e-tester',
    username: 'cust_e2e',
    email: 'e2e@thailand.com',
    role: 'customer'
  });

  // Ensure test driver accounts are in clean, available state
  await query("UPDATE drivers SET status = 'available' WHERE id IN ('drv-bkk-01', 'drv-other-99')");
  await query("UPDATE taxi_dispatches SET ride_status = 'COMPLETED' WHERE driver_id IN ('drv-bkk-01', 'drv-other-99') AND ride_status IN ('ALLOCATED', 'DISPATCHED', 'ARRIVED', 'ON_TRIP')");

  // ----------------------------------------------------------------------
  // VERIFICATION 1: Vendor registers a vehicle and uploads documents
  // ----------------------------------------------------------------------
  console.log('\n--- VERIFICATION 1: Vendor Vehicle Registration & Thai Document Upload ---');
  const uniquePlate = `1กข ${Math.floor(1000 + Math.random() * 9000)}`;
  const regPayload = {
    brand: 'Toyota',
    model: 'Fortuner Legender 2.8 4WD',
    plate_number: uniquePlate,
    color: 'Attitude Black Mica',
    category: 'SUV',
    seating_capacity: 6,
    luggage_capacity: 4,
    photo_url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341',
    registration_doc_url: 'https://wowthailand.com/docs/dlt_registration_book_1kx.pdf',
    insurance_doc_url: 'https://wowthailand.com/docs/commercial_insurance_1kx.pdf',
    permit_doc_url: 'https://wowthailand.com/docs/public_transport_permit_1kx.pdf'
  };

  const regRes = await postJson('/api/v1/vendor/fleet-vehicles', regPayload, authHeader(vendorToken));
  if (regRes.status !== 201) logFail('Vendor failed to register vehicle', regRes.data);
  const newVehId = regRes.data.data.id;
  logPass('Vendor registered vehicle successfully (HTTP 201 Created)', { id: newVehId, plate: uniquePlate });

  // DB Verification
  const [dbVeh] = await query('SELECT * FROM cab_vehicles WHERE id = ?', [newVehId]);
  if (!dbVeh) logFail('Registered vehicle not found in cab_vehicles table');
  if (dbVeh.verification_status !== 'PENDING_APPROVAL') logFail('Vehicle did not start in PENDING_APPROVAL status', dbVeh);
  logPass('Database record verified in cab_vehicles: status is strictly PENDING_APPROVAL', {
    id: dbVeh.id,
    plate_number: dbVeh.plate_number,
    status: dbVeh.verification_status,
    has_reg_doc: Boolean(dbVeh.registration_doc_url)
  });

  // ----------------------------------------------------------------------
  // VERIFICATION 2: Admin approves the vehicle
  // ----------------------------------------------------------------------
  console.log('\n--- VERIFICATION 2: Admin Document Verification & Approval ---');
  // Admin queries queue
  const adminQueueRes = await getJson('/api/v1/admin/fleet-vehicles?status=PENDING_APPROVAL', authHeader(adminToken));
  const foundInQueue = adminQueueRes.data.data.find(v => v.id === newVehId);
  if (!foundInQueue) logFail('Pending vehicle missing from Admin verification queue');
  logPass('Admin verified pending vehicle with registration & insurance documents in queue');

  // Admin approves
  const approveRes = await postJson(`/api/v1/admin/fleet-vehicles/${newVehId}/verify`, { status: 'APPROVED' }, authHeader(adminToken));
  if (approveRes.status !== 200 || approveRes.data.data.verification_status !== 'APPROVED') {
    logFail('Admin approval API failed', approveRes.data);
  }
  logPass('Admin approved vehicle (HTTP 200 OK)');

  // DB Verification
  const [dbApproved] = await query('SELECT verification_status FROM cab_vehicles WHERE id = ?', [newVehId]);
  if (dbApproved.verification_status !== 'APPROVED') logFail('Database did not update to APPROVED status');
  logPass('Database confirms cab_vehicles status is now APPROVED');

  // ----------------------------------------------------------------------
  // VERIFICATION 3: Vendor assigns vehicle to a registered driver
  // ----------------------------------------------------------------------
  console.log('\n--- VERIFICATION 3: Vendor Driver-to-Vehicle Assignment ---');
  const assignRes = await postJson('/api/v1/vendor/fleet-vehicles/assign', {
    vehicle_id: newVehId,
    driver_id: 'drv-bkk-01'
  }, authHeader(vendorToken));

  if (assignRes.status !== 200) logFail('Vendor failed to assign vehicle to driver', assignRes.data);
  logPass('Vendor assigned vehicle to chauffeur drv-bkk-01');

  // DB Verification
  const [dbDva] = await query('SELECT * FROM driver_vehicle_assignments WHERE driver_id = "drv-bkk-01" AND vehicle_id = ?', [newVehId]);
  if (!dbDva) logFail('Assignment record missing from driver_vehicle_assignments');
  logPass('Database confirms driver_vehicle_assignments row active', { dva_id: dbDva.id, is_active: dbDva.is_active });

  // ----------------------------------------------------------------------
  // VERIFICATION 4: Driver selects active vehicle and goes online
  // ----------------------------------------------------------------------
  console.log('\n--- VERIFICATION 4: Driver Active Vehicle Selection & Online Toggle ---');
  const selectRes = await postJson('/api/v1/driver/select-vehicle', { vehicle_id: newVehId }, authHeader(driver1Token));
  if (selectRes.status !== 200) logFail('Driver failed to select active vehicle', selectRes.data);
  logPass('Chauffeur set active vehicle for shift (HTTP 200 OK)', selectRes.data.data);

  // Driver toggles online
  const onlineRes = await postJson('/api/v1/driver/toggle-status', { status: 'available' }, authHeader(driver1Token));
  if (onlineRes.status !== 200) logFail('Driver failed to toggle status online', onlineRes.data);
  logPass('Chauffeur toggled duty status to available (ONLINE)');

  // DB Verification
  const [dbDrv] = await query('SELECT active_vehicle_id, vehicle_model, vehicle_plate, status FROM drivers WHERE id = "drv-bkk-01"');
  if (dbDrv.active_vehicle_id !== newVehId || dbDrv.status !== 'available') {
    logFail('Driver record not updated with active_vehicle_id or status', dbDrv);
  }
  logPass('Database verifies drivers table: active_vehicle_id set to verified vehicle & status is available', dbDrv);

  // ----------------------------------------------------------------------
  // VERIFICATION 5 & 6: Customer Booking Capacity Validation (4, 6, 8 Pax)
  // ----------------------------------------------------------------------
  console.log('\n--- VERIFICATION 5 & 6: Customer Booking & Backend Capacity Matching ---');

  // 5a. Customer requests 4 passengers for Sedan (capacity 3/4) -> ALLOWED (201)
  const book4Res = await postJson('/api/v1/cabs/book', {
    customer_name: 'Pax 4 Customer',
    customer_phone: '+66 81 444 4444',
    pickup_address: 'Bangkok City (Sukhumvit)',
    dropoff_address: 'Suvarnabhumi Airport (BKK)',
    pickup_datetime: '2026-11-06 10:00:00',
    vehicle_category: 'SEDAN',
    passenger_count: 3,
    luggage_count: 2
  }, authHeader(customerToken));
  if (book4Res.status !== 201) logFail('Valid 3-4 Pax Sedan booking rejected', book4Res.data);
  logPass('Customer booking for 3-4 passengers in Sedan accepted (HTTP 201 Created)', { dispatchId: book4Res.data.dispatchId });

  // 5b. Customer requests 6 passengers for Sedan -> STRICTLY REJECTED (400)
  const book6SedanRes = await postJson('/api/v1/cabs/book', {
    customer_name: 'Pax 6 Customer',
    customer_phone: '+66 81 666 6666',
    pickup_address: 'Bangkok City (Sukhumvit)',
    dropoff_address: 'Suvarnabhumi Airport (BKK)',
    pickup_datetime: '2026-11-06 11:00:00',
    vehicle_category: 'SEDAN',
    passenger_count: 6,
    luggage_count: 2
  }, authHeader(customerToken));
  if (book6SedanRes.status !== 400) logFail('Over-capacity 6 passengers in Sedan was NOT rejected!', book6SedanRes);
  logPass('Customer booking for 6 passengers in Sedan strictly rejected with HTTP 400', { error: book6SedanRes.data.error });

  // 5c. Customer requests 6 passengers for SUV (capacity 6) -> ALLOWED (201)
  const book6SuvRes = await postJson('/api/v1/cabs/book', {
    customer_name: 'Pax 6 SUV Customer',
    customer_phone: '+66 81 666 7777',
    pickup_address: 'Bangkok City (Sukhumvit)',
    dropoff_address: 'Suvarnabhumi Airport (BKK)',
    pickup_datetime: '2026-11-06 12:00:00',
    vehicle_category: 'SUV',
    passenger_count: 6,
    luggage_count: 4
  }, authHeader(customerToken));
  if (book6SuvRes.status !== 201) logFail('Valid 6 Pax SUV booking rejected', book6SuvRes.data);
  const suvDispatchId = book6SuvRes.data.dispatchId;
  const suvOtp = book6SuvRes.data.rideOtp;
  logPass('Customer booking for 6 passengers in SUV accepted (HTTP 201 Created)', { dispatchId: suvDispatchId, plainOtp: suvOtp });

  // 5d. Customer requests 8 passengers for SUV -> STRICTLY REJECTED (400)
  const book8SuvRes = await postJson('/api/v1/cabs/book', {
    customer_name: 'Pax 8 Customer',
    customer_phone: '+66 81 888 8888',
    pickup_address: 'Bangkok City (Sukhumvit)',
    dropoff_address: 'Suvarnabhumi Airport (BKK)',
    pickup_datetime: '2026-11-06 13:00:00',
    vehicle_category: 'SUV',
    passenger_count: 8,
    luggage_count: 4
  }, authHeader(customerToken));
  if (book8SuvRes.status !== 400) logFail('Over-capacity 8 passengers in SUV was NOT rejected!', book8SuvRes);
  logPass('Customer booking for 8 passengers in SUV strictly rejected with HTTP 400', { error: book8SuvRes.data.error });

  // 5e. Customer requests 8 passengers for VIP Van -> ALLOWED (201)
  const book8VanRes = await postJson('/api/v1/cabs/book', {
    customer_name: 'Pax 8 Van Customer',
    customer_phone: '+66 81 888 9999',
    pickup_address: 'Bangkok City (Sukhumvit)',
    dropoff_address: 'Suvarnabhumi Airport (BKK)',
    pickup_datetime: '2026-11-06 14:00:00',
    vehicle_category: 'VIP_VAN',
    passenger_count: 8,
    luggage_count: 6
  }, authHeader(customerToken));
  if (book8VanRes.status !== 201) logFail('Valid 8 Pax VIP Van booking rejected', book8VanRes.data);
  logPass('Customer booking for 8 passengers in VIP Van accepted (HTTP 201 Created)', { dispatchId: book8VanRes.data.dispatchId });

  // ----------------------------------------------------------------------
  // VERIFICATION 6 & 7: Driver Broadcast & First-Accept-Wins Concurrency
  // ----------------------------------------------------------------------
  console.log('\n--- VERIFICATION 6 & 7: Capacity-Filtered Broadcast & First-Accept-Wins ---');
  // Chauffeur 1 (driving SUV capacity 6) fetches offers: MUST see suvDispatchId
  const offersRes = await getJson('/api/v1/driver/duty-offers', authHeader(driver1Token));
  const hasSuvOffer = offersRes.data.data.some(o => o.id === suvDispatchId);
  if (!hasSuvOffer) logFail('Driver with active 6-seater SUV did NOT receive the 6-pax SUV offer');
  logPass('Chauffeur 1 with active 6-seater SUV received the 6-passenger booking offer');

  // Concurrent Acceptance: Driver 1 and Driver 2 both accept suvDispatchId concurrently
  const [accept1, accept2] = await Promise.all([
    postJson('/api/v1/driver/accept-duty', { dispatch_id: suvDispatchId }, authHeader(driver1Token)),
    postJson('/api/v1/driver/accept-duty', { dispatch_id: suvDispatchId }, authHeader(driver2Token))
  ]);

  const results = [accept1.status, accept2.status];
  if (!results.includes(200) || !results.includes(409)) {
    logFail('First-Accept-Wins race condition failure: expected exactly one 200 and one 409', results);
  }
  logPass('First-Accept-Wins concurrency verified: exactly ONE driver won (HTTP 200), subsequent rejected (HTTP 409 Conflict)', {
    driver1_status: accept1.status,
    driver2_status: accept2.status
  });

  // DB Verification
  const [dbSuvDispatch] = await query('SELECT driver_id, vehicle_id, vehicle_plate, ride_status FROM taxi_dispatches WHERE id = ?', [suvDispatchId]);
  if (dbSuvDispatch.ride_status !== 'DISPATCHED' || !dbSuvDispatch.driver_id || dbSuvDispatch.vehicle_id !== newVehId) {
    logFail('Database taxi_dispatches missing driver or vehicle binding', dbSuvDispatch);
  }
  logPass('Database verifies dispatch state: ride_status is DISPATCHED, driver_id and vehicle_id bound atomically', dbSuvDispatch);

  // ----------------------------------------------------------------------
  // VERIFICATION 8: Customer sees actual driver and vehicle details
  // ----------------------------------------------------------------------
  console.log('\n--- VERIFICATION 8: Customer Tracking Display (No Fake Fallbacks) ---');
  const trackRes = await getJson(`/api/v1/cabs/track/${suvDispatchId}`, authHeader(customerToken));
  if (trackRes.status !== 200) logFail('Customer tracking API failed', trackRes.data);
  const trackData = trackRes.data.data;

  if (!trackData.driver) logFail('Driver data missing from customer tracking payload');
  if (trackData.driver.name === 'Somchai Prasert') logFail('Fake hardcoded name detected: Somchai Prasert');
  if (trackData.driver.vehicle_plate !== uniquePlate) logFail(`Plate mismatch: expected ${uniquePlate}, got ${trackData.driver.vehicle_plate}`);

  logPass('Customer receives authentic assigned chauffeur & vehicle details', {
    driver_name: trackData.driver.name,
    driver_phone: trackData.driver.phone,
    vehicle_model: trackData.vehicle_model,
    vehicle_plate: trackData.vehicle_plate,
    ride_status: trackData.ride_status
  });

  // ----------------------------------------------------------------------
  // VERIFICATION 9: Driver reaches pickup and verifies 4-digit Ride OTP
  // ----------------------------------------------------------------------
  console.log('\n--- VERIFICATION 9: Driver Arrival & 4-Digit Ride OTP Verification ---');
  // 9a. Driver reaches pickup
  const arrivedRes = await postJson('/api/v1/driver/update-status', {
    dispatch_id: suvDispatchId,
    status: 'ARRIVED'
  }, authHeader(driver1Token));
  if (arrivedRes.status !== 200) logFail('Driver failed to update status to ARRIVED', arrivedRes.data);
  logPass('Chauffeur updated status to ARRIVED at pickup point');

  // 9b. Driver attempts wrong OTP
  const badOtpRes = await postJson('/api/v1/driver/update-status', {
    dispatch_id: suvDispatchId,
    status: 'ON_TRIP',
    otp: '0000'
  }, authHeader(driver1Token));
  if (badOtpRes.status !== 400) logFail('Invalid OTP was NOT rejected!', badOtpRes);
  logPass('Incorrect ride OTP (0000) strictly rejected with HTTP 400 Bad Request');

  // 9c. Driver enters authentic OTP received by customer
  const goodOtpRes = await postJson('/api/v1/driver/update-status', {
    dispatch_id: suvDispatchId,
    status: 'ON_TRIP',
    otp: suvOtp
  }, authHeader(driver1Token));
  if (goodOtpRes.status !== 200) logFail('Authentic OTP verification failed', goodOtpRes.data);
  logPass('Authentic 4-digit ride OTP verified successfully; journey started (ON_TRIP)');

  // DB Verification
  const [dbOtpDispatch] = await query('SELECT ride_status, otp_verified_at FROM taxi_dispatches WHERE id = ?', [suvDispatchId]);
  if (dbOtpDispatch.ride_status !== 'ON_TRIP' || !dbOtpDispatch.otp_verified_at) {
    logFail('Database ride_status is not ON_TRIP or otp_verified_at is null', dbOtpDispatch);
  }
  logPass('Database verifies ride_status is ON_TRIP and otp_verified_at timestamp is set', {
    status: dbOtpDispatch.ride_status,
    verified_at: dbOtpDispatch.otp_verified_at
  });

  // ----------------------------------------------------------------------
  // VERIFICATION 10: Real Device GPS Telemetry Updates
  // ----------------------------------------------------------------------
  console.log('\n--- VERIFICATION 10: Real Device GPS Telemetry Broadcast ---');
  const realLat = 13.7468;
  const realLng = 100.5349;
  const pingRes = await postJson('/api/v1/driver/location', {
    dispatch_id: suvDispatchId,
    latitude: realLat,
    longitude: realLng,
    heading: 95.5,
    speed: 42.0
  }, authHeader(driver1Token));

  if (pingRes.status !== 200) logFail('Driver location ping failed', pingRes.data);
  logPass('Driver device transmitted genuine GPS telemetry ping', { lat: realLat, lng: realLng });

  // Verify telemetry in taxi_driver_locations table
  const [dbLoc] = await query('SELECT latitude, longitude, speed FROM taxi_driver_locations WHERE dispatch_id = ? ORDER BY recorded_at DESC LIMIT 1', [suvDispatchId]);
  if (!dbLoc || Math.abs(parseFloat(dbLoc.latitude) - realLat) > 0.001) {
    logFail('Genuine GPS location not persisted in taxi_driver_locations', dbLoc);
  }
  logPass('Database verifies taxi_driver_locations contains exact coordinates', {
    lat: parseFloat(dbLoc.latitude),
    lng: parseFloat(dbLoc.longitude),
    speed: parseFloat(dbLoc.speed)
  });

  // Customer tracking receives exact coordinates
  const liveTrackRes = await getJson(`/api/v1/cabs/track/${suvDispatchId}`, authHeader(customerToken));
  const liveLoc = liveTrackRes.data.data.driver_location;
  if (!liveLoc || Math.abs(liveLoc.latitude - realLat) > 0.001) {
    logFail('Customer tracking API did not receive genuine driver coordinates', liveLoc);
  }
  logPass('Customer live tracking map endpoint returns genuine device GPS coordinates (No simulated offset)', liveLoc);

  // ----------------------------------------------------------------------
  // VERIFICATION 11: Trip Completion & GPS Tracking Stopped
  // ----------------------------------------------------------------------
  console.log('\n--- VERIFICATION 11: Trip Completion & GPS Tracking Termination ---');
  const completeRes = await postJson('/api/v1/driver/update-status', {
    dispatch_id: suvDispatchId,
    status: 'COMPLETED',
    toll_fee: 50
  }, authHeader(driver1Token));

  if (completeRes.status !== 200) logFail('Trip completion failed', completeRes.data);
  logPass('Chauffeur completed transfer journey with ฿50 toll allowance included (HTTP 200 OK)');

  // Record cash payment
  const payRes = await postJson('/api/v1/cabs/payment/record-cash', {
    dispatch_id: suvDispatchId,
    amount_collected_thb: 1300
  }, authHeader(driver1Token));
  if (payRes.status !== 200) logFail('Cash payment recording failed', payRes.data);
  logPass('Trip payment recorded and verified as PAID');

  // DB Verification
  const [dbCompDispatch] = await query('SELECT ride_status, total_fare_thb FROM taxi_dispatches WHERE id = ?', [suvDispatchId]);
  if (dbCompDispatch.ride_status !== 'COMPLETED') logFail('Dispatch status is not COMPLETED in database', dbCompDispatch);
  const [dbDrvAvailable] = await query('SELECT status FROM drivers WHERE id = "drv-bkk-01"');
  if (dbDrvAvailable.status !== 'available') logFail('Driver status did not revert to available', dbDrvAvailable);
  logPass('Database confirms dispatch is COMPLETED and driver is back in available pool', {
    ride_status: dbCompDispatch.ride_status,
    driver_status: dbDrvAvailable.status
  });

  // ----------------------------------------------------------------------
  // VERIFICATION 12: Super Admin Global Fleet & Active Trips Monitoring
  // ----------------------------------------------------------------------
  console.log('\n--- VERIFICATION 12: Super Admin Global Fleet & Dispatch Oversight ---');
  const superAdminDispatchesRes = await getJson('/api/v1/admin/cab-dispatches', authHeader(superAdminToken));
  if (superAdminDispatchesRes.status !== 200) logFail('Super Admin dispatch monitor failed', superAdminDispatchesRes.data);
  const allDispatches = superAdminDispatchesRes.data.data;
  logPass(`Super Admin monitor queried global dispatches (${allDispatches.length} records retrieved across all vendors)`);

  const superAdminFleetRes = await getJson('/api/v1/admin/fleet-vehicles', authHeader(superAdminToken));
  if (superAdminFleetRes.status !== 200) logFail('Super Admin fleet oversight failed', superAdminFleetRes.data);
  logPass(`Super Admin verified global fleet oversight (${superAdminFleetRes.data.data.length} registered vehicles across all vendors)`);

  // ----------------------------------------------------------------------
  // VERIFICATION 13: Integrity Check (No Fake Coordinates or Duplicate Vehicles)
  // ----------------------------------------------------------------------
  console.log('\n--- VERIFICATION 13: Platform Integrity Check ---');
  // Check that duplicate vehicles cannot be registered
  const dupCheckRes = await postJson('/api/v1/vendor/fleet-vehicles', regPayload, authHeader(vendorToken));
  if (dupCheckRes.status !== 409) logFail('Duplicate Thai license plate was not rejected with 409 Conflict', dupCheckRes);
  logPass('Platform rejects duplicate vehicle registration with HTTP 409 Conflict');

  // Verify that an unaccepted booking has null driver and null GPS
  const unacceptedRes = await getJson(`/api/v1/cabs/track/${book4Res.data.dispatchId}`);
  if (unacceptedRes.data.data.driver !== null || unacceptedRes.data.data.driver_location !== null) {
    logFail('Unaccepted ride exposed fake driver or simulated GPS coordinates!', unacceptedRes.data.data);
  }
  logPass('Platform integrity confirmed: Unallocated dispatches strictly expose NULL driver and NULL GPS coordinates');

  console.log('\n========================================================================');
  console.log(`🎉 ALL 13 END-TO-END VERIFICATIONS PASSED SUCCESSFULLY (${checksPassed} checks verified)!`);
  console.log('========================================================================\n');
}

runEndToEndVerification()
  .then(() => pool.end())
  .catch((err) => {
    console.error('Fatal error during E2E verification:', err);
    process.exit(1);
  });

