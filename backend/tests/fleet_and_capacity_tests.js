// ========================================================================
// WOW THAILAND: Fleet Vehicle Management & Capacity Verification Test Suite
// Verifies:
// 1. Vendor Vehicle Registration with Thai Plate & Documents
// 2. Admin Vehicle Document Verification (Pending -> Approved)
// 3. Vendor Driver-to-Vehicle Assignment
// 4. Driver Active Vehicle Selection Before Shift
// 5. Backend Passenger & Luggage Capacity Validation (Over-capacity Rejection)
// 6. Duty Offers Capacity-Based Filtering
// 7. First-Accept-Wins Atomic Dispatch Under Concurrency
// 8. Genuine GPS Telemetry (No fake offset coordinates)
// ========================================================================

import assert from 'assert';
import jwt from 'jsonwebtoken';
import { query, default as pool } from '../src/config/db.js';
import { runCabMigrations } from '../src/config/migrate_cabs.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'wow_thailand_dev_secret_key_change_in_production';

const TEST_PORT = 5006;
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

let passedCount = 0;
function testAssert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runFleetAndCapacityTests() {
  console.log(`\n============================================================`);
  console.log(`🚕 WOW THAILAND: FLEET MANAGEMENT & CAPACITY VERIFICATION TESTS`);
  console.log(`Testing Backend on ${BASE_URL} against MySQL wow_thailand`);
  console.log(`============================================================\n`);

  await runCabMigrations();

  // Tokens
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
    id: 'cust-fleet-01',
    username: 'cust_ananda',
    email: 'ananda@gmail.com',
    role: 'customer'
  });

  // Ensure test driver drv-bkk-01 exists and belongs to vnd-bangkok-cabs
  await query(`
    INSERT INTO drivers (id, user_id, full_name, phone, license_number, vehicle_model, vehicle_plate, status, vendor_id)
    VALUES ('drv-bkk-01', 'usr-driver-somchai', 'Somchai Jaidee', '+66 83 456 7890', 'TH-DL-987234', 'Toyota Camry VIP', '1กข 4589', 'available', 'vnd-bangkok-cabs')
    ON DUPLICATE KEY UPDATE status = 'available', vendor_id = 'vnd-bangkok-cabs'
  `);

  await query(`
    INSERT INTO drivers (id, user_id, full_name, phone, license_number, vehicle_model, vehicle_plate, status, vendor_id)
    VALUES ('drv-other-99', 'usr-driver-other', 'Kittisak Prasert', '+66 89 888 7777', 'TH-DL-888777', 'Toyota Fortuner SUV', '2ขค 9988', 'available', 'vnd-bangkok-cabs')
    ON DUPLICATE KEY UPDATE status = 'available', vendor_id = 'vnd-bangkok-cabs'
  `);

  // Clear any existing active trips for test drivers
  await query("UPDATE taxi_dispatches SET ride_status = 'COMPLETED' WHERE driver_id IN ('drv-bkk-01', 'drv-other-99') AND ride_status IN ('ALLOCATED', 'DISPATCHED', 'ARRIVED', 'ON_TRIP')");

  // Driver 2 drives the approved seeded SUV so both drivers can compete for the SUV job
  await query("UPDATE drivers SET active_vehicle_id = 'veh-fortuner-01' WHERE id = 'drv-other-99'");

  // ========================================================================
  // 1. VENDOR FLEET VEHICLE REGISTRATION & DOCUMENTS
  // ========================================================================
  console.log('--- 1. Testing Vendor Vehicle Registration & Document Submission ---');

  const testPlate = `1ขพ ${Math.floor(1000 + Math.random() * 9000)}`;
  const regRes = await postJson('/api/v1/vendor/fleet-vehicles', {
    brand: 'Toyota',
    model: 'Fortuner GR Sport',
    plate_number: testPlate,
    color: 'Platinum White Pearl',
    category: 'SUV',
    seating_capacity: 6,
    luggage_capacity: 4,
    photo_url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341',
    registration_doc_url: 'https://wowthailand.com/docs/car_reg_sample.pdf',
    insurance_doc_url: 'https://wowthailand.com/docs/insurance_sample.pdf',
    permit_doc_url: 'https://wowthailand.com/docs/transport_permit.pdf'
  }, authHeader(vendorToken));

  testAssert(regRes.status === 201, 'Vehicle registration returns 201 Created');
  const regData = await regRes.json();
  testAssert(regData.success === true, 'Vehicle registration success flag is true');
  testAssert(regData.data.verification_status === 'PENDING_APPROVAL', 'Vehicle starts in PENDING_APPROVAL status');
  testAssert(regData.data.seating_capacity === 6, 'Seating capacity saved correctly');
  const newVehId = regData.data.id;

  // Duplicate plate rejected
  const dupRes = await postJson('/api/v1/vendor/fleet-vehicles', {
    brand: 'Toyota',
    model: 'Fortuner duplicate',
    plate_number: testPlate,
    color: 'Black',
    category: 'SUV'
  }, authHeader(vendorToken));
  testAssert(dupRes.status === 409, 'Duplicate Thai plate number rejected with 409 Conflict');

  // Vendor lists fleet vehicles
  const listRes = await getJson('/api/v1/vendor/fleet-vehicles', authHeader(vendorToken));
  testAssert(listRes.status === 200, 'Vendor fleet list returns 200 OK');
  const listData = await listRes.json();
  testAssert(Array.isArray(listData.data), 'Vendor fleet returned as array');
  const foundVeh = listData.data.find(v => v.id === newVehId);
  testAssert(Boolean(foundVeh), 'Newly registered vehicle present in vendor fleet list');

  // ========================================================================
  // 2. ADMIN FLEET OVERSIGHT & DOCUMENT VERIFICATION
  // ========================================================================
  console.log('\n--- 2. Testing Admin Document Verification & Approval ---');

  const adminListRes = await getJson('/api/v1/admin/fleet-vehicles?status=PENDING_APPROVAL', authHeader(adminToken));
  testAssert(adminListRes.status === 200, 'Admin pending fleet list returns 200 OK');
  const adminListData = await adminListRes.json();
  const pendingVeh = adminListData.data.find(v => v.id === newVehId);
  testAssert(Boolean(pendingVeh), 'Pending vehicle visible in Admin verification queue');

  // Try to assign unapproved vehicle to driver (should fail)
  const prematureAssignRes = await postJson('/api/v1/vendor/fleet-vehicles/assign', {
    vehicle_id: newVehId,
    driver_id: 'drv-bkk-01'
  }, authHeader(vendorToken));
  testAssert(prematureAssignRes.status === 400, 'Premature assignment of unapproved vehicle rejected (400)');

  // Admin approves vehicle
  const verifyRes = await postJson(`/api/v1/admin/fleet-vehicles/${newVehId}/verify`, {
    status: 'APPROVED'
  }, authHeader(adminToken));
  testAssert(verifyRes.status === 200, 'Admin vehicle approval returns 200 OK');
  const verifyData = await verifyRes.json();
  testAssert(verifyData.data.verification_status === 'APPROVED', 'Vehicle status updated to APPROVED');

  // ========================================================================
  // 3. DRIVER-TO-VEHICLE ASSIGNMENT & ACTIVE SHIFT SELECTION
  // ========================================================================
  console.log('\n--- 3. Testing Driver-Vehicle Assignment & Active Selection ---');

  // Vendor assigns approved vehicle to drv-bkk-01
  const assignRes = await postJson('/api/v1/vendor/fleet-vehicles/assign', {
    vehicle_id: newVehId,
    driver_id: 'drv-bkk-01'
  }, authHeader(vendorToken));
  testAssert(assignRes.status === 200, 'Vendor assigns approved vehicle to chauffeur (200 OK)');

  // Chauffeur inspects assigned vehicles
  const driverVehsRes = await getJson('/api/v1/driver/assigned-vehicles', authHeader(driver1Token));
  testAssert(driverVehsRes.status === 200, 'Chauffeur assigned vehicles returns 200 OK');
  const driverVehsData = await driverVehsRes.json();
  testAssert(Array.isArray(driverVehsData.data), 'Driver assigned vehicles returned as array');
  const hasAssigned = driverVehsData.data.some(v => v.id === newVehId);
  testAssert(hasAssigned, 'Newly approved vehicle visible in chauffeur assigned vehicle options');

  // Chauffeur selects active vehicle for shift
  const selectRes = await postJson('/api/v1/driver/select-vehicle', {
    vehicle_id: newVehId
  }, authHeader(driver1Token));
  testAssert(selectRes.status === 200, 'Chauffeur sets active vehicle before going online (200 OK)');
  const selectData = await selectRes.json();
  testAssert(selectData.data.vehicle_id === newVehId, 'Active vehicle successfully updated to new vehicle');

  // ========================================================================
  // 4. AUTOMATIC VEHICLE SELECTION FROM PASSENGERS & BAGS
  // The customer never picks a vehicle; the server picks the smallest one that fits.
  // ========================================================================
  console.log('\n--- 4. Testing Automatic Vehicle Selection from Passengers & Bags ---');

  const baseBooking = {
    customer_name: 'Ananda Test',
    customer_phone: '+66 81 999 8888',
    pickup_address: 'Bangkok City (Sukhumvit)',
    dropoff_address: 'Suvarnabhumi Airport (BKK)'
  };
  const estimateFor = async (passenger_count, luggage_count) =>
    (await postJson('/api/v1/cabs/estimate', { ...baseBooking, passenger_count, luggage_count })).json();

  const estSmall = await estimateFor(2, 1);
  testAssert(estSmall.recommended?.tier === 'SEDAN', '2 passengers + 1 bag -> Sedan recommended');
  const estBags = await estimateFor(3, 3);
  testAssert(estBags.recommended?.tier === 'SUV', '3 passengers + 3 bags -> SUV recommended (bags decide)');
  const estGroup = await estimateFor(7, 2);
  testAssert(estGroup.recommended?.tier === 'VIP_VAN', '7 passengers -> VIP Van recommended');
  testAssert(estGroup.vehicleAvailable === true, 'Estimate confirms a vendor owns a fitting approved vehicle');
  const estHuge = await estimateFor(15, 0);
  testAssert(estHuge.recommended === null && estHuge.availabilityMessage.includes('exceeds'), 'Oversized group gets no vehicle and a clear message');

  // Client cannot force a smaller vehicle: 6 passengers sent as SEDAN becomes a VIP Van
  const forcedRes = await postJson('/api/v1/cabs/book', {
    ...baseBooking,
    pickup_datetime: '2026-11-05 08:00:00',
    vehicle_category: 'SEDAN',
    passenger_count: 6,
    luggage_count: 2
  }, authHeader(customerToken));
  testAssert(forcedRes.status === 201, '6-passenger booking accepted (201 Created)');
  const forcedData = await forcedRes.json();
  const vanDispatchId = forcedData.dispatchId;
  testAssert(forcedData.vehicleCategory === 'VIP_VAN', 'Client-sent SEDAN ignored; system chose VIP_VAN for 6 passengers');

  const [vanRow] = await query('SELECT vendor_id, passenger_count, luggage_count FROM taxi_dispatches WHERE id = ?', [vanDispatchId]);
  testAssert(vanRow.vendor_id === 'vnd-bangkok-cabs', 'Booking routed to the vendor that owns a fitting vehicle (not hardcoded)');
  testAssert(vanRow.passenger_count === 6 && vanRow.luggage_count === 2, 'Real passenger and bag counts stored on the dispatch');

  // Groups larger than the biggest vehicle are rejected
  const overPaxRes = await postJson('/api/v1/cabs/book', {
    ...baseBooking, pickup_datetime: '2026-11-05 10:00:00', passenger_count: 12, luggage_count: 2
  }, authHeader(customerToken));
  testAssert(overPaxRes.status === 400, '12 passengers (more than the largest vehicle) rejected (400)');
  const overPaxData = await overPaxRes.json();
  testAssert(overPaxData.error.includes('exceeds'), 'Rejection error message clearly indicates capacity exceeded');

  const overLuggageRes = await postJson('/api/v1/cabs/book', {
    ...baseBooking, pickup_datetime: '2026-11-05 10:00:00', passenger_count: 2, luggage_count: 12
  }, authHeader(customerToken));
  testAssert(overLuggageRes.status === 400, '12 bags (more than the largest vehicle) rejected (400)');

  const zeroPaxRes = await postJson('/api/v1/cabs/book', {
    ...baseBooking, pickup_datetime: '2026-11-05 10:00:00', passenger_count: 0
  }, authHeader(customerToken));
  testAssert(zeroPaxRes.status === 400, '0 passengers rejected (400)');

  // Valid booking: 4 passengers, 3 bags, no vehicle sent -> SUV; child seat charged by server
  const validBookingRes = await postJson('/api/v1/cabs/book', {
    ...baseBooking,
    pickup_datetime: '2026-11-05 12:00:00',
    passenger_count: 4,
    luggage_count: 3,
    child_seat: true
  }, authHeader(customerToken));

  testAssert(validBookingRes.status === 201, 'Valid 4-passenger booking returns 201 Created');
  const validBookingData = await validBookingRes.json();
  const validDispatchId = validBookingData.dispatchId || validBookingData.data?.dispatch_id;
  testAssert(validBookingData.vehicleCategory === 'SUV', '4 passengers + 3 bags -> SUV chosen automatically');
  const estSuv = await estimateFor(4, 3);
  testAssert(validBookingData.fareThb === estSuv.recommended.fareThb + 200, 'Child seat (+฿200) included in the server-side total');

  // The taxi owner (vendor) sees the new booking in their dispatch list
  const vendorListRes = await getJson('/api/v1/admin/cab-dispatches?date=2026-11-05', authHeader(vendorToken));
  const vendorList = await vendorListRes.json();
  testAssert(vendorList.data.some(d => d.id === validDispatchId), 'Vendor sees the new booking in their Transfer Dispatches list');

  // ========================================================================
  // 5. DRIVER DUTY OFFERS: SAME VENDOR + VEHICLE THAT FITS + ONLINE
  // ========================================================================
  console.log('\n--- 5. Testing Driver Duty Offers Capacity Matching ---');

  // A job that belongs to another vendor must never be offered to this vendor's drivers
  const otherBookingId = `bkg_fleet_other_${Date.now()}`;
  const otherDispatchId = `dsp_fleet_other_${Date.now()}`;
  await query(
    `INSERT INTO bookings (id, user_id, customer_name, customer_phone, customer_email, start_date, end_date, vendor_id, base_amount_thb, customer_total_amount, payment_status, booking_status)
     VALUES (?, NULL, 'Other Vendor Guest', '+66 80 333 3333', 'other@example.com', '2026-11-05', '2026-11-05', 'vnd-1792584528326', 900.00, 900.00, 'PENDING', 'Confirmed')`,
    [otherBookingId]
  );
  await query(
    `INSERT INTO taxi_dispatches (id, booking_id, vendor_id, pickup_address, dropoff_address, pickup_datetime, passenger_count, luggage_count, vehicle_category, total_fare_thb, ride_status)
     VALUES (?, ?, 'vnd-1792584528326', 'Don Mueang Airport (DMK)', 'Silom Bangkok', '2026-11-05 16:00:00', 1, 0, 'SEDAN', 900.00, 'ALLOCATED')`,
    [otherDispatchId, otherBookingId]
  );

  // drv-bkk-01 has active vehicle with capacity 6 (SUV) -> should see validDispatchId
  const offersRes = await getJson('/api/v1/driver/duty-offers', authHeader(driver1Token));
  testAssert(offersRes.status === 200, 'Driver duty offers query returns 200 OK');
  const offersData = await offersRes.json();
  const matchingOffer = offersData.data.find(o => o.id === validDispatchId);
  testAssert(Boolean(matchingOffer), 'Driver with matching SUV capacity receives booking offer');
  testAssert(!offersData.data.some(o => o.id === vanDispatchId), 'SUV driver is not offered the VIP Van job');
  testAssert(!offersData.data.some(o => o.id === otherDispatchId), 'Driver is not offered another vendor\'s job');

  // Offline drivers get no open offers
  await query("UPDATE drivers SET status = 'offline' WHERE id = 'drv-bkk-01'");
  const offlineOffers = await (await getJson('/api/v1/driver/duty-offers', authHeader(driver1Token))).json();
  testAssert(
    offlineOffers.can_receive_offers === false && !offlineOffers.data.some(o => o.id === validDispatchId),
    'Offline driver receives no open job offers'
  );
  await query("UPDATE drivers SET status = 'available' WHERE id = 'drv-bkk-01'");

  // ========================================================================
  // 6. FIRST-ACCEPT-WINS CONCURRENT DISPATCH TEST
  // ========================================================================
  console.log('\n--- 6. Testing Concurrent First-Accept-Wins Atomic Lock ---');

  // Both driver1 and driver2 try to accept the same dispatch at the exact same moment
  const [res1, res2] = await Promise.all([
    postJson('/api/v1/driver/accept-duty', { dispatch_id: validDispatchId }, authHeader(driver1Token)),
    postJson('/api/v1/driver/accept-duty', { dispatch_id: validDispatchId }, authHeader(driver2Token))
  ]);

  const statuses = [res1.status, res2.status];
  testAssert(statuses.includes(200), 'Exactly one driver successfully accepted duty (200 OK)');
  testAssert(statuses.includes(409), 'Second driver acceptance strictly rejected with 409 Conflict');

  // Verify database record has exactly one driver and vehicle_id populated
  const dispRows = await query('SELECT * FROM taxi_dispatches WHERE id = ?', [validDispatchId]);
  testAssert(dispRows.length === 1, 'Dispatch record verified in database');
  testAssert(dispRows[0].ride_status === 'DISPATCHED', 'Dispatch transitioned to DISPATCHED');
  testAssert(Boolean(dispRows[0].driver_id), 'Driver ID accurately persisted on dispatch');
  const driver1Won = res1.status === 200;
  const winnerDriverId = driver1Won ? 'drv-bkk-01' : 'drv-other-99';
  const loserDriverId = driver1Won ? 'drv-other-99' : 'drv-bkk-01';
  testAssert(dispRows[0].driver_id === winnerDriverId, 'Winning driver persisted on dispatch');
  testAssert(dispRows[0].vehicle_id === (driver1Won ? newVehId : 'veh-fortuner-01'), 'Winning driver\'s active vehicle persisted on dispatch');

  // ========================================================================
  // 6b. MANUAL ASSIGNMENT SAFETY CHECKS (VENDOR / ADMIN)
  // ========================================================================
  console.log('\n--- 6b. Testing Manual Assignment Safety Checks ---');

  // An SUV driver cannot be given the 6-passenger VIP Van job
  const vanAssignRes = await postJson('/api/v1/admin/cab-assign-driver', {
    dispatch_id: vanDispatchId,
    driver_id: 'drv-bkk-01'
  }, authHeader(vendorToken));
  testAssert(vanAssignRes.status === 400, 'Vendor cannot assign an SUV driver to a VIP Van job (400)');

  // The winner already drives at 12:00, so a 12:15 job would double-book them
  const overlapRes = await postJson('/api/v1/cabs/book', {
    ...baseBooking, pickup_datetime: '2026-11-05 12:15:00', passenger_count: 2, luggage_count: 1
  }, authHeader(customerToken));
  const overlapDispatchId = (await overlapRes.json()).dispatchId;
  const doubleRes = await postJson('/api/v1/admin/cab-assign-driver', {
    dispatch_id: overlapDispatchId,
    driver_id: winnerDriverId
  }, authHeader(adminToken));
  testAssert(doubleRes.status === 409, 'Admin cannot double-book a driver who already has a trip at that time (409)');

  // An offline driver cannot be given a pickup that starts within the hour
  const soon = new Date(Date.now() + 30 * 60 * 1000);
  const pad = n => String(n).padStart(2, '0');
  const soonStr = `${soon.getFullYear()}-${pad(soon.getMonth() + 1)}-${pad(soon.getDate())} ${pad(soon.getHours())}:${pad(soon.getMinutes())}:00`;
  const soonRes = await postJson('/api/v1/cabs/book', {
    ...baseBooking, pickup_datetime: soonStr, passenger_count: 2, luggage_count: 1
  }, authHeader(customerToken));
  const soonDispatchId = (await soonRes.json()).dispatchId;
  await query("UPDATE drivers SET status = 'offline' WHERE id = ?", [loserDriverId]);
  const offlineAssignRes = await postJson('/api/v1/admin/cab-assign-driver', {
    dispatch_id: soonDispatchId,
    driver_id: loserDriverId
  }, authHeader(adminToken));
  testAssert(offlineAssignRes.status === 400, 'Offline driver cannot be assigned a pickup starting within the hour (400)');
  await query("UPDATE drivers SET status = 'available' WHERE id = ?", [loserDriverId]);

  // An online driver with a fitting vehicle and a free schedule can be assigned
  const okAssignRes = await postJson('/api/v1/admin/cab-assign-driver', {
    dispatch_id: soonDispatchId,
    driver_id: loserDriverId
  }, authHeader(adminToken));
  testAssert(okAssignRes.status === 200, 'Online driver with a fitting vehicle and free schedule is assigned (200)');

  // ========================================================================
  // 7. GENUINE GPS TELEMETRY VERIFICATION (NO SIMULATED FALLBACK)
  // ========================================================================
  console.log('\n--- 7. Testing Genuine GPS Telemetry Verification ---');

  // Create an unaccepted dispatch to test tracking
  const dummyBookingRes = await postJson('/api/v1/cabs/book', {
    customer_name: 'Tracking Test',
    customer_phone: '+66 81 111 2222',
    pickup_address: 'Bangkok City',
    dropoff_address: 'Suvarnabhumi Airport',
    pickup_lat: 13.7563,
    pickup_lng: 100.5018,
    pickup_datetime: '2026-11-05 14:00:00',
    vehicle_category: 'SEDAN',
    passenger_count: 2,
    luggage_count: 1
  }, authHeader(customerToken));

  const dummyData = await dummyBookingRes.json();
  const testDispId = dummyData.dispatchId || dummyData.data?.dispatch_id;
  const trackRes = await getJson(`/api/v1/cabs/track/${testDispId}`);
  testAssert(trackRes.status === 200, 'Tracking endpoint returns 200 OK');
  const trackData = await trackRes.json();
  testAssert(trackData.data.driver === null, 'Driver is null before acceptance');
  testAssert(trackData.data.driver_location === null, 'GPS location is strictly null (no simulated offset coordinates)');

  // Clean up and restore baseline test driver vehicle state
  await query("UPDATE drivers SET active_vehicle_id = 'veh-camry-01', vehicle_model = 'Toyota Camry VIP', vehicle_plate = '1กข 4589', status = 'available' WHERE id = 'drv-bkk-01'");
  await query("UPDATE drivers SET active_vehicle_id = NULL, status = 'available' WHERE id = 'drv-other-99'");
  const createdDispatchIds = [validDispatchId, testDispId, vanDispatchId, overlapDispatchId, soonDispatchId, otherDispatchId].filter(Boolean);
  await query(`DELETE FROM taxi_dispatches WHERE id IN (${createdDispatchIds.map(() => '?').join(', ')})`, createdDispatchIds);
  await query('DELETE FROM bookings WHERE id = ?', [otherBookingId]);

  console.log(`\n============================================================`);
  console.log(`🎉 ALL ${passedCount} FLEET & CAPACITY TESTS PASSED SUCCESSFULLY!`);
  console.log(`============================================================\n`);
}

// Spin up test server if invoked directly
async function start() {
  const { app } = await import('../src/server.js');
  const server = app.listen(TEST_PORT, async () => {
    try {
      await runFleetAndCapacityTests();
      server.close();
      await pool.end();
      process.exit(0);
    } catch (err) {
      console.error('🔥 Test suite failed:', err);
      server.close();
      await pool.end();
      process.exit(1);
    }
  });
}

start();
