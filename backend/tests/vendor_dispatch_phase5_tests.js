// ========================================================================
// WOW THAILAND: Phase 5 Cab Vendor & Admin Central Dispatch Tests
// Tests:
// 1. Vendor driver roster queries & multi-tenant isolation (Vendor A vs B)
// 2. Chauffeur registration, updating & deletion ownership enforcement
// 3. Vendor transfer dispatch feed isolation (Vendor A cannot see B's dispatches)
// 4. Cross-vendor driver assignment protection (403 Forbidden)
// 5. Central Admin dispatch monitoring, filtering & reassignment
// 6. Admin transfer pricing control & RBAC security enforcement
// ========================================================================

import { query, withTransaction } from '../src/config/db.js';
import { runCabMigrations } from '../src/config/migrate_cabs.js';
import { signJwtToken } from '../src/middleware/auth.js';
import jwt from 'jsonwebtoken';

const TEST_PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${TEST_PORT}`;

function createToken(payload) {
  return signJwtToken(payload, '4h');
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

async function putJson(endpoint, body, headers = {}) {
  return fetch(`${BASE_URL}${endpoint}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
}

async function deleteJson(endpoint, headers = {}) {
  return fetch(`${BASE_URL}${endpoint}`, {
    method: 'DELETE',
    headers: { ...headers }
  });
}

async function getJson(endpoint, headers = {}) {
  return fetch(`${BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: { ...headers }
  });
}

export async function runVendorDispatchPhase5Tests() {
  console.log(`\n============================================================`);
  console.log(`🏢 WOW THAILAND: CAB VENDOR & ADMIN DISPATCH TESTS (PHASE 5)`);
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

  try {
    await runCabMigrations();

    const adminToken = createToken({ id: 'usr-admin-01', username: 'admin', role: 'admin' });
    const vendorAToken = createToken({ id: 'usr-vendor-cabs', username: 'cabs_operator', role: 'transfer_vendor' });
    const vendorBToken = createToken({ id: 'usr-v-1792584528326', username: 'bangkok_transfers', role: 'transfer_vendor' });
    const customerToken = createToken({ id: 'usr-cust-01', username: 'testcustomer', role: 'customer' });

    console.log(`--- 1. Testing Vendor Chauffeur Roster Multi-Tenant Isolation ---`);

    // Ensure Vendor A has drv-bkk-01
    await query(`UPDATE drivers SET vendor_id = 'vnd-bangkok-cabs' WHERE id = 'drv-bkk-01'`);

    // Clean slate: no active trips for the test drivers. drv-bkk-01 drives the approved
    // sedan, drv-other-99 the approved SUV, so assignments can be checked against vehicle size.
    await query("UPDATE taxi_dispatches SET ride_status = 'COMPLETED' WHERE driver_id IN ('drv-bkk-01', 'drv-other-99') AND ride_status IN ('DISPATCHED', 'ARRIVED', 'ON_TRIP')");
    await query("UPDATE drivers SET active_vehicle_id = 'veh-camry-01', status = 'available' WHERE id = 'drv-bkk-01'");
    await query("UPDATE drivers SET vendor_id = 'vnd-bangkok-cabs', active_vehicle_id = 'veh-fortuner-01', status = 'available' WHERE id = 'drv-other-99'");

    // Vendor A queries drivers
    const vAdrvRes = await getJson('/api/v1/vendor/drivers', authHeader(vendorAToken));
    testAssert(vAdrvRes.status === 200, 'Vendor A queries drivers returns 200 OK');
    const vAdrvJson = await vAdrvRes.json();
    testAssert(vAdrvJson.success === true, 'Vendor A drivers query success is true');
    testAssert(Array.isArray(vAdrvJson.data), 'Vendor A drivers returned as array');
    const hasSomchai = vAdrvJson.data.some(d => d.id === 'drv-bkk-01');
    testAssert(hasSomchai, 'Vendor A roster contains their chauffeur Somchai (drv-bkk-01)');

    // Vendor B queries drivers - must NOT see Vendor A's drv-bkk-01
    const vBdrvRes = await getJson('/api/v1/vendor/drivers', authHeader(vendorBToken));
    testAssert(vBdrvRes.status === 200, 'Vendor B queries drivers returns 200 OK');
    const vBdrvJson = await vBdrvRes.json();
    testAssert(Array.isArray(vBdrvJson.data), 'Vendor B drivers returned as array');
    const vBHasSomchai = vBdrvJson.data.some(d => d.id === 'drv-bkk-01');
    testAssert(!vBHasSomchai, 'Vendor B roster strictly isolated: does NOT contain Vendor A driver');

    // Customer querying vendor drivers is forbidden
    const custDrvRes = await getJson('/api/v1/vendor/drivers', authHeader(customerToken));
    testAssert(custDrvRes.status === 403, 'Customer accessing vendor drivers is strictly rejected with 403');

    console.log(`\n--- 2. Testing Vendor Chauffeur Registration & Modification Security ---`);

    // Vendor A registers a new driver
    const newChauffeurPayload = {
      full_name: 'Anan Charoen',
      phone: `+66 81 222 ${Math.floor(1000 + Math.random() * 9000)}`,
      license_number: 'TH-DL-554433',
      vehicle_model: 'Toyota Fortuner SUV',
      vehicle_plate: '3กด 7788'
    };
    const regRes = await postJson('/api/v1/vendor/drivers', newChauffeurPayload, authHeader(vendorAToken));
    testAssert(regRes.status === 201, 'Vendor A registering new chauffeur returns 201 Created');
    const regJson = await regRes.json();
    testAssert(regJson.success === true, 'Registration success is true');
    const createdDriverId = regJson.data?.id;
    testAssert(createdDriverId && createdDriverId.startsWith('drv_'), 'Generated valid chauffeur driver_id');
    testAssert(regJson.data.vendor_id === 'vnd-bangkok-cabs', 'Chauffeur automatically associated with Vendor A');

    // Vendor B attempts to update Vendor A's chauffeur (must be 403)
    const rogueUpdateRes = await putJson(`/api/v1/vendor/drivers/${createdDriverId}`, {
      full_name: 'Hacked Chauffeur'
    }, authHeader(vendorBToken));
    testAssert(rogueUpdateRes.status === 403, 'Vendor B attempting to modify Vendor A chauffeur rejected with 403 Forbidden');

    // Vendor A updates their own chauffeur
    const validUpdateRes = await putJson(`/api/v1/vendor/drivers/${createdDriverId}`, {
      full_name: 'Anan Charoen VIP'
    }, authHeader(vendorAToken));
    testAssert(validUpdateRes.status === 200, 'Vendor A updating their own chauffeur returns 200 OK');
    const validUpdateJson = await validUpdateRes.json();
    testAssert(validUpdateJson.data.full_name === 'Anan Charoen VIP', 'Chauffeur full_name successfully updated in database');

    // Vendor B attempts to delete Vendor A's chauffeur (must be 403)
    const rogueDelRes = await deleteJson(`/api/v1/vendor/drivers/${createdDriverId}`, authHeader(vendorBToken));
    testAssert(rogueDelRes.status === 403, 'Vendor B attempting to delete Vendor A chauffeur rejected with 403 Forbidden');

    // Vendor A deletes their own chauffeur
    const validDelRes = await deleteJson(`/api/v1/vendor/drivers/${createdDriverId}`, authHeader(vendorAToken));
    testAssert(validDelRes.status === 200, 'Vendor A deleting their own chauffeur returns 200 OK');

    console.log(`\n--- 3. Testing Transfer Dispatches Multi-Tenant Isolation ---`);

    const testTimestamp = Date.now();
    const bkgAId = `bkg_v5_A_${testTimestamp}`;
    const dispAId = `dsp_v5_A_${testTimestamp}`;
    const bkgBId = `bkg_v5_B_${testTimestamp}`;
    const dispBId = `dsp_v5_B_${testTimestamp}`;

    // Insert dispatch for Vendor A
    await query(
      `INSERT INTO bookings (id, user_id, customer_name, customer_phone, customer_email, start_date, end_date, vendor_id, base_amount_thb, customer_total_amount, payment_status, booking_status)
       VALUES (?, NULL, 'Alice A', '+66 80 111 1111', 'alice@example.com', CURRENT_DATE(), CURRENT_DATE(), 'vnd-bangkok-cabs', 900.00, 900.00, 'PENDING', 'Confirmed')`,
      [bkgAId]
    );
    await query(
      `INSERT INTO taxi_dispatches (id, booking_id, vendor_id, pickup_address, dropoff_address, pickup_datetime, vehicle_category, total_fare_thb, ride_status)
       VALUES (?, ?, 'vnd-bangkok-cabs', 'Suvarnabhumi Airport (BKK)', 'Sukhumvit Soi 11 Bangkok', NOW() + INTERVAL 2 HOUR, 'SEDAN', 900.00, 'ALLOCATED')`,
      [dispAId, bkgAId]
    );

    // Insert dispatch for Vendor B
    await query(
      `INSERT INTO bookings (id, user_id, customer_name, customer_phone, customer_email, start_date, end_date, vendor_id, base_amount_thb, customer_total_amount, payment_status, booking_status)
       VALUES (?, NULL, 'Bob B', '+66 80 222 2222', 'bob@example.com', CURRENT_DATE(), CURRENT_DATE(), 'vnd-1792584528326', 1500.00, 1500.00, 'PENDING', 'Confirmed')`,
      [bkgBId]
    );
    await query(
      `INSERT INTO taxi_dispatches (id, booking_id, vendor_id, pickup_address, dropoff_address, pickup_datetime, vehicle_category, total_fare_thb, ride_status)
       VALUES (?, ?, 'vnd-1792584528326', 'Don Mueang Airport (DMK)', 'Pattaya Beachfront Resort', NOW() + INTERVAL 3 HOUR, 'SUV', 1500.00, 'ALLOCATED')`,
      [dispBId, bkgBId]
    );

    // Vendor A queries dispatches
    const vAdispRes = await getJson('/api/v1/admin/cab-dispatches', authHeader(vendorAToken));
    testAssert(vAdispRes.status === 200, 'Vendor A queries transfer dispatches returns 200 OK');
    const vAdispJson = await vAdispRes.json();
    testAssert(Array.isArray(vAdispJson.data), 'Vendor A dispatches returned as array');
    const vAHasA = vAdispJson.data.some(d => d.id === dispAId);
    const vAHasB = vAdispJson.data.some(d => d.id === dispBId);
    testAssert(vAHasA, 'Vendor A sees their own dispatch (dispAId)');
    testAssert(!vAHasB, 'Vendor A strictly cannot see Vendor B dispatch (dispBId)');

    // Vendor B queries dispatches
    const vBdispRes = await getJson('/api/v1/admin/cab-dispatches', authHeader(vendorBToken));
    testAssert(vBdispRes.status === 200, 'Vendor B queries transfer dispatches returns 200 OK');
    const vBdispJson = await vBdispRes.json();
    testAssert(Array.isArray(vBdispJson.data), 'Vendor B dispatches returned as array');
    const vBHasA = vBdispJson.data.some(d => d.id === dispAId);
    const vBHasB = vBdispJson.data.some(d => d.id === dispBId);
    testAssert(!vBHasA, 'Vendor B strictly cannot see Vendor A dispatch (dispAId)');
    testAssert(vBHasB, 'Vendor B sees their own dispatch (dispBId)');

    console.log(`\n--- 4. Testing Cross-Vendor Driver Assignment Authorization ---`);

    // Vendor A attempts to assign their driver to Vendor B's dispatch (must be 403 Forbidden)
    const rogueAssignRes = await postJson('/api/v1/admin/cab-assign-driver', {
      dispatch_id: dispBId,
      driver_id: 'drv-bkk-01'
    }, authHeader(vendorAToken));
    testAssert(rogueAssignRes.status === 403, 'Vendor A assigning driver to Vendor B dispatch strictly rejected with 403');

    // Vendor A assigns driver to their own dispatch (succeeds)
    const validAssignRes = await postJson('/api/v1/admin/cab-assign-driver', {
      dispatch_id: dispAId,
      driver_id: 'drv-bkk-01'
    }, authHeader(vendorAToken));
    testAssert(validAssignRes.status === 200, 'Vendor A assigning driver to their own dispatch returns 200 OK');
    const validAssignJson = await validAssignRes.json();
    testAssert(validAssignJson.success === true, 'Driver assignment confirmed in response');

    // Verify database reflects DISPATCHED status
    const [chkA] = await query('SELECT ride_status, driver_id FROM taxi_dispatches WHERE id = ?', [dispAId]);
    testAssert(chkA.driver_id === 'drv-bkk-01', 'Database verifies driver_id set to drv-bkk-01');
    testAssert(chkA.ride_status === 'DISPATCHED', 'Database verifies ride_status transitioned to DISPATCHED');

    console.log(`\n--- 5. Testing Admin Central Dispatch Console & Reassignment ---`);

    // Admin lists all dispatches (sees both Vendor A and Vendor B)
    const adminDispRes = await getJson('/api/v1/admin/cab-dispatches', authHeader(adminToken));
    testAssert(adminDispRes.status === 200, 'Admin queries central dispatches returns 200 OK');
    const adminDispJson = await adminDispRes.json();
    testAssert(Array.isArray(adminDispJson.data), 'Admin dispatches returned as array');
    const adminHasA = adminDispJson.data.some(d => d.id === dispAId);
    const adminHasB = adminDispJson.data.some(d => d.id === dispBId);
    testAssert(adminHasA && adminHasB, 'Admin console sees all dispatches across all vendors');

    // Admin cannot give the SUV job to a driver whose active vehicle is a sedan
    const tooSmallRes = await postJson('/api/v1/admin/cab-assign-driver', {
      dispatch_id: dispBId,
      driver_id: 'drv-bkk-01'
    }, authHeader(adminToken));
    const tooSmallJson = await tooSmallRes.json();
    if (tooSmallRes.status !== 400) console.log('DEBUG tooSmallRes:', tooSmallRes.status, tooSmallJson);
    testAssert(tooSmallRes.status === 400, 'Assigning a sedan driver to an SUV job is rejected (400)');
    testAssert(/SEDAN|seats|bags/.test(tooSmallJson.error || ''), 'Rejection explains the vehicle does not fit');

    // Admin reassigns Vendor B's dispatch to drv-other-99 (drives an SUV)
    const adminReassignRes = await postJson('/api/v1/admin/cab-assign-driver', {
      dispatch_id: dispBId,
      driver_id: 'drv-other-99'
    }, authHeader(adminToken));
    testAssert(adminReassignRes.status === 200, 'Admin can reassign any vendor dispatch (200 OK)');

    // The job moves to the driver's vendor and records the vehicle that will be sent
    const [chkB] = await query('SELECT vendor_id, vehicle_id FROM taxi_dispatches WHERE id = ?', [dispBId]);
    testAssert(chkB.vendor_id === 'vnd-bangkok-cabs', 'Dispatch ownership moves to the assigned driver\'s vendor');
    testAssert(chkB.vehicle_id === 'veh-fortuner-01', 'Dispatch records the assigned driver\'s active vehicle');

    // Admin filters by status
    const filterRes = await getJson('/api/v1/admin/cab-dispatches?status=DISPATCHED', authHeader(adminToken));
    testAssert(filterRes.status === 200, 'Admin filter by status returns 200 OK');
    const filterJson = await filterRes.json();
    const allDispatched = filterJson.data.every(d => d.ride_status === 'DISPATCHED');
    testAssert(allDispatched, 'All filtered dispatches match DISPATCHED status');

    console.log(`\n--- 6. Testing Admin Pricing Controls & Rate Cards ---`);

    // Customer attempting to update pricing is forbidden
    const custPricingRes = await putJson('/api/v1/admin/cab-pricing', {
      tier_id: 'tier-sedan',
      base_fare_thb: 999
    }, authHeader(customerToken));
    testAssert(custPricingRes.status === 403, 'Customer updating pricing is strictly rejected with 403');

    // Vendor attempting to update pricing is forbidden
    const vendPricingRes = await putJson('/api/v1/admin/cab-pricing', {
      tier_id: 'tier-sedan',
      base_fare_thb: 999
    }, authHeader(vendorAToken));
    testAssert(vendPricingRes.status === 403, 'Vendor updating pricing is strictly rejected with 403');

    // Admin updates pricing rules
    const adminPricingRes = await putJson('/api/v1/admin/cab-pricing', {
      tier_id: 'tier-sedan',
      base_fare_thb: 320,
      per_km_rate_thb: 16,
      minimum_fare_thb: 360
    }, authHeader(adminToken));
    testAssert(adminPricingRes.status === 200, 'Admin updating pricing returns 200 OK');

    // Restore standard sedan rate
    await putJson('/api/v1/admin/cab-pricing', {
      tier_id: 'tier-sedan',
      base_fare_thb: 300,
      per_km_rate_thb: 15,
      minimum_fare_thb: 350
    }, authHeader(adminToken));

    // Cleanup test records
    await query('DELETE FROM taxi_dispatches WHERE id IN (?, ?)', [dispAId, dispBId]);
    await query('DELETE FROM bookings WHERE id IN (?, ?)', [bkgAId, bkgBId]);
    await query("UPDATE drivers SET active_vehicle_id = NULL WHERE id = 'drv-other-99'");

    console.log(`\n============================================================`);
    console.log(`PHASE 5 TESTS FINISHED: ${passed} PASSED, ${failed} FAILED`);
    console.log(`============================================================\n`);

    return { passed, failed };
  } catch (err) {
    console.error(`\n❌ Phase 5 Test execution fatal error:`, err);
    throw err;
  }
}

if (process.argv[1] && process.argv[1].endsWith('vendor_dispatch_phase5_tests.js')) {
  runVendorDispatchPhase5Tests()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
