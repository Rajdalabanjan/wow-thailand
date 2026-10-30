// ========================================================================
// WOW THAILAND: Master Production Readiness Verification Suite
// Deep Runtime Testing of RBAC, Transaction Safety, Inventory Locking,
// Idempotency, Ledger Consistency, 3-Service Model, and End-to-End Journeys.
// ========================================================================

import pool, { withTransaction } from '../src/config/db.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_only_for_dev';
const BASE_URL = 'http://localhost:5000';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message, details = '') {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message} ${details ? '--> ' + details : ''}`);
    failedTests++;
  }
}

// Generate test JWT tokens for each role
function makeToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

async function runMasterVerification() {
  console.log('============================================================');
  console.log('🚀 WOW THAILAND: COMPREHENSIVE PRODUCTION READINESS AUDIT');
  console.log('Target: ' + BASE_URL + ' against MySQL wow_thailand');
  console.log('============================================================\n');

  const customerToken = makeToken({ id: 'usr-cust-01', username: 'customer_john', role: 'customer' });
  const b2bToken = makeToken({ id: 'usr-b2b-01', username: 'partner_a', role: 'b2b_agent' });
  const hotelVendorToken = makeToken({ id: 'u-5', username: 'hotel_vendor', role: 'hotel_vendor' });
  const cabVendorToken = makeToken({ id: 'usr-vendor-cabs', username: 'cabs_operator', role: 'transfer_vendor' });
  const driverToken = makeToken({ id: 'usr-driver-somchai', username: 'somchai_transfers', role: 'driver' });
  const adminToken = makeToken({ id: 'usr-admin-01', username: 'admin', role: 'admin' });
  const superAdminToken = makeToken({ id: 'usr-superadmin', username: 'superadmin', role: 'superadmin' });

  // ------------------------------------------------------------------------
  // PART 1: Role-Based Authorization (RBAC) Enforcement
  // ------------------------------------------------------------------------
  console.log('--- 1. VERIFYING ROLE-BASED ACCESS CONTROL (RBAC) ---');

  // A. Unauthenticated access
  const unauthPMS = await fetch(`${BASE_URL}/api/v1/pms/dashboard`);
  assert(unauthPMS.status === 401, 'Unauthenticated access to /api/v1/pms/dashboard returns 401 Unauthorized');

  const unauthDrivers = await fetch(`${BASE_URL}/api/v1/drivers/jobs`);
  assert(unauthDrivers.status === 401, 'Unauthenticated access to /api/v1/drivers/jobs returns 401 Unauthorized');

  const unauthB2B = await fetch(`${BASE_URL}/api/v1/b2b/dashboard`);
  assert(unauthB2B.status === 401, 'Unauthenticated access to /api/v1/b2b/dashboard returns 401 Unauthorized');

  // B. Role Mismatch (Customer accessing vendor/driver/admin routes)
  const custOnPMS = await fetch(`${BASE_URL}/api/v1/pms/dashboard`, {
    headers: { 'Authorization': `Bearer ${customerToken}` }
  });
  assert(custOnPMS.status === 403, 'Customer role accessing /api/v1/pms/dashboard returns 403 Forbidden');

  const custOnDrivers = await fetch(`${BASE_URL}/api/v1/drivers/jobs`, {
    headers: { 'Authorization': `Bearer ${customerToken}` }
  });
  assert(custOnDrivers.status === 403, 'Customer role accessing /api/v1/drivers/jobs returns 403 Forbidden');

  const custOnB2B = await fetch(`${BASE_URL}/api/v1/b2b/dashboard`, {
    headers: { 'Authorization': `Bearer ${customerToken}` }
  });
  assert(custOnB2B.status === 403, 'Customer role accessing /api/v1/b2b/dashboard returns 403 Forbidden');

  // C. Cross-Vendor Isolation (Driver accessing PMS, Hotel Vendor accessing Driver jobs)
  const driverOnPMS = await fetch(`${BASE_URL}/api/v1/pms/dashboard`, {
    headers: { 'Authorization': `Bearer ${driverToken}` }
  });
  assert(driverOnPMS.status === 403, 'Driver role accessing /api/v1/pms/dashboard returns 403 Forbidden');

  const hotelOnDrivers = await fetch(`${BASE_URL}/api/v1/drivers/jobs`, {
    headers: { 'Authorization': `Bearer ${hotelVendorToken}` }
  });
  assert(hotelOnDrivers.status === 403, 'Hotel Vendor accessing /api/v1/drivers/jobs returns 403 Forbidden');

  // D. Authorized Role Access
  const hotelOnPMS = await fetch(`${BASE_URL}/api/v1/pms/dashboard`, {
    headers: { 'Authorization': `Bearer ${hotelVendorToken}` }
  });
  assert(hotelOnPMS.status === 200, 'Hotel Vendor accessing /api/v1/pms/dashboard returns 200 OK');

  const driverOnJobs = await fetch(`${BASE_URL}/api/v1/drivers/jobs`, {
    headers: { 'Authorization': `Bearer ${driverToken}` }
  });
  assert(driverOnJobs.status === 200, 'Driver accessing /api/v1/drivers/jobs returns 200 OK');

  const b2bOnDashboard = await fetch(`${BASE_URL}/api/v1/b2b/dashboard`, {
    headers: { 'Authorization': `Bearer ${b2bToken}` }
  });
  assert(b2bOnDashboard.status === 200, 'B2B Agent accessing /api/v1/b2b/dashboard returns 200 OK');

  const adminOnPMS = await fetch(`${BASE_URL}/api/v1/pms/dashboard`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(adminOnPMS.status === 200, 'Admin accessing /api/v1/pms/dashboard returns 200 OK');

  const superAdminOnB2B = await fetch(`${BASE_URL}/api/v1/b2b/dashboard`, {
    headers: { 'Authorization': `Bearer ${superAdminToken}` }
  });
  assert(superAdminOnB2B.status === 200, 'SuperAdmin accessing /api/v1/b2b/dashboard returns 200 OK');


  // ------------------------------------------------------------------------
  // PART 2: Transaction Safety, Row-Level Inventory Locking & Anti-Double-Booking
  // ------------------------------------------------------------------------
  console.log('\n--- 2. VERIFYING TRANSACTION SAFETY & INVENTORY LOCKING ---');

  const testNight = '2026-12-25';
  const testRoomTypeId = 'rm-phuket-01';

  // Seed / set inventory for test night to exactly 1
  await pool.execute(
    `INSERT INTO hotel_room_availability (room_type_id, calendar_date, available_rooms, price_override_thb, is_blackout)
     VALUES (?, ?, 1, 4500.00, 0)
     ON DUPLICATE KEY UPDATE available_rooms = 1, is_blackout = 0`,
    [testRoomTypeId, testNight]
  );

  // First booking: should succeed and decrement available_rooms from 1 to 0
  const bookingPayload1 = {
    customer_name: 'Piti Srivanich',
    customer_phone: '+66 81 111 2222',
    customer_email: 'piti@example.com',
    start_date: testNight,
    end_date: '2026-12-26',
    room_type_id: testRoomTypeId,
    quantity: 1,
    base_amount_thb: 4500.00,
    vendor_id: 'vnd-phuket-01'
  };

  const res1 = await fetch(`${BASE_URL}/api/v1/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bookingPayload1)
  });
  const json1 = await res1.json();
  assert(res1.status === 201, 'Booking 1 returns 201 Created');
  assert(Boolean(json1.booking_id), `Booking 1 confirmed with ID: ${json1.booking_id}`);

  // Check inventory in DB: must be exactly 0
  const [invCheck1] = await pool.execute(
    'SELECT available_rooms FROM hotel_room_availability WHERE room_type_id = ? AND calendar_date = ?',
    [testRoomTypeId, testNight]
  );
  assert(invCheck1[0].available_rooms === 0, 'Available rooms atomically decremented to 0');

  // Second booking: attempted for same night when available_rooms is 0. MUST BE REJECTED!
  const bookingPayload2 = {
    customer_name: 'Overbooking Attempt',
    customer_phone: '+66 89 999 8888',
    customer_email: 'overbook@example.com',
    start_date: testNight,
    end_date: '2026-12-26',
    room_type_id: testRoomTypeId,
    quantity: 1,
    base_amount_thb: 4500.00,
    vendor_id: 'vnd-phuket-01'
  };

  const res2 = await fetch(`${BASE_URL}/api/v1/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bookingPayload2)
  });
  const json2 = await res2.json();
  assert(res2.status === 409, 'Overbooking attempt correctly rejected with HTTP 409 Conflict');
  assert(json2.code === 'ROOM_UNAVAILABLE', 'Returns explicit error code ROOM_UNAVAILABLE');

  // Verify inventory is still 0 (no negative inventory, rollback held)
  const [invCheck2] = await pool.execute(
    'SELECT available_rooms FROM hotel_room_availability WHERE room_type_id = ? AND calendar_date = ?',
    [testRoomTypeId, testNight]
  );
  assert(invCheck2[0].available_rooms === 0, 'Available rooms remains 0 with zero overbooking leakage');

  // Test booking cancellation restores inventory atomically
  const cancelRes = await fetch(`${BASE_URL}/api/v1/bookings/${json1.booking_id}/cancel`, {
    method: 'POST'
  });
  const cancelJson = await cancelRes.json();
  assert(cancelRes.status === 200, 'Booking cancellation returns 200 OK');

  const [invCheck3] = await pool.execute(
    'SELECT available_rooms FROM hotel_room_availability WHERE room_type_id = ? AND calendar_date = ?',
    [testRoomTypeId, testNight]
  );
  assert(invCheck3[0].available_rooms === 1, 'Inventory restored to 1 upon cancellation');


  // ------------------------------------------------------------------------
  // PART 3: Payment Idempotency, Wallet Overdraft Rules & Ledger Consistency
  // ------------------------------------------------------------------------
  console.log('\n--- 3. VERIFYING PAYMENT IDEMPOTENCY, OVERDRAFT & LEDGER ---');

  // Create a new booking for payment verification test
  const idempNight = '2026-12-28';
  await pool.execute(
    `INSERT INTO hotel_room_availability (room_type_id, calendar_date, available_rooms, price_override_thb, is_blackout)
     VALUES (?, ?, 5, 3000.00, 0)
     ON DUPLICATE KEY UPDATE available_rooms = 5, is_blackout = 0`,
    [testRoomTypeId, idempNight]
  );

  const idempKey = 'audit-idemp-' + Date.now();
  const idempBookingPayload = {
    idempotency_key: idempKey,
    customer_name: 'Anan Idempotent',
    customer_phone: '+66 82 333 4444',
    customer_email: 'anan@example.com',
    start_date: idempNight,
    end_date: '2026-12-29',
    room_type_id: testRoomTypeId,
    quantity: 1,
    base_amount_thb: 3000.00,
    vendor_id: 'vnd-phuket-01'
  };

  const idempRes1 = await fetch(`${BASE_URL}/api/v1/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(idempBookingPayload)
  });
  const idempJson1 = await idempRes1.json();
  assert(idempRes1.status === 201, 'First booking with idempotency_key returns 201');

  // Duplicate call with exact same idempotency_key: returns existing booking without re-booking
  const idempRes2 = await fetch(`${BASE_URL}/api/v1/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(idempBookingPayload)
  });
  const idempJson2 = await idempRes2.json();
  assert(idempRes2.status === 201 || idempRes2.status === 200, 'Duplicate booking call handled cleanly');
  assert(idempJson2.idempotent === true, 'Response flags idempotent: true');
  assert(idempJson2.booking_id === idempJson1.booking_id, 'Returned identical booking_id without duplication');

  // Check initial vendor wallet balance
  const [initialWallet] = await pool.execute('SELECT balance_thb FROM vendor_wallets WHERE vendor_id = ?', ['vnd-phuket-01']);
  const startBalance = parseFloat(initialWallet[0]?.balance_thb || 0);

  // Confirm payment 1st time
  const payRes1 = await fetch(`${BASE_URL}/api/v1/bookings/verify-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ booking_id: idempJson1.booking_id, vendor_id: 'vnd-phuket-01' })
  });
  const payJson1 = await payRes1.json();
  assert(payRes1.status === 200, 'Payment verification 1st time returns 200');
  assert(payJson1.payment_status === 'PAID', 'Payment status set to PAID');

  // Check vendor wallet after 1st deduction
  const [afterWallet1] = await pool.execute('SELECT balance_thb FROM vendor_wallets WHERE vendor_id = ?', ['vnd-phuket-01']);
  const midBalance = parseFloat(afterWallet1[0]?.balance_thb || 0);
  assert(midBalance < startBalance, 'Platform fee deducted from vendor wallet');

  // Confirm payment 2nd time (Payment Idempotency): MUST NOT deduct fee a second time
  const payRes2 = await fetch(`${BASE_URL}/api/v1/bookings/verify-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ booking_id: idempJson1.booking_id, vendor_id: 'vnd-phuket-01' })
  });
  const payJson2 = await payRes2.json();
  assert(payRes2.status === 200, 'Payment verification 2nd time returns 200');
  assert(payJson2.already_confirmed === true, 'Repeat payment returns already_confirmed: true');

  const [afterWallet2] = await pool.execute('SELECT balance_thb FROM vendor_wallets WHERE vendor_id = ?', ['vnd-phuket-01']);
  const finalBalance = parseFloat(afterWallet2[0]?.balance_thb || 0);
  assert(finalBalance === midBalance, 'Wallet balance unchanged on repeat call (Zero duplicate deduction)');

  // Ledger consistency check: verify balance_before - amount = balance_after for all transactions
  const [txns] = await pool.execute('SELECT id, amount_thb, balance_before_thb, balance_after_thb, type FROM wallet_transactions ORDER BY created_at DESC LIMIT 20');
  let ledgerConsistent = true;
  for (const t of txns) {
    const amt = parseFloat(t.amount_thb);
    const before = parseFloat(t.balance_before_thb);
    const after = parseFloat(t.balance_after_thb);
    if (t.type === 'debit') {
      const expected = Math.round((before - amt) * 100) / 100;
      if (Math.abs(expected - after) > 0.05) {
        ledgerConsistent = false;
        console.error(`Ledger inconsistency on txn ${t.id}: before=${before}, amt=${amt}, expected=${expected}, after=${after}`);
      }
    }
  }
  assert(ledgerConsistent, 'Audit ledger math is 100% consistent (balance_before - amount = balance_after)');

  // Wallet Overdraft Rule Test: Set wallet negative and negative_booking_count = 2 (max allowed)
  const testOverdraftVendor = 'vnd-od-' + Date.now();
  await pool.execute(
    'INSERT INTO vendors (id, user_id, business_name, commission_rate, verification_status) VALUES (?, ?, ?, 0.10, ?)',
    [testOverdraftVendor, 'u-5', 'Overdraft Test Vendor', 'Verified']
  );
  await pool.execute(
    'INSERT INTO vendor_wallets (id, vendor_id, balance_thb, hold_amount_thb, minimum_balance_thb, negative_booking_count, max_negative_bookings) VALUES (?, ?, -500.00, 0.00, 1000.00, 2, 2)',
    [`wal_od_${Date.now()}`, testOverdraftVendor]
  );

  // Attempt payment verification on a booking for this overdraft vendor
  const odBookingId = 'od-bkg-' + Date.now();
  await pool.execute(
    `INSERT INTO bookings (id, customer_name, customer_phone, customer_email, start_date, end_date, vendor_id, base_amount_thb, platform_fee_thb, customer_total_amount, payment_status, booking_status)
     VALUES (?, 'Overdraft Test', '+66 80 000 9999', 'od@example.com', '2026-12-01', '2026-12-02', ?, 2000.00, 200.00, 2000.00, 'PENDING', 'Awaiting Payment')`,
    [odBookingId, testOverdraftVendor]
  );

  const odRes = await fetch(`${BASE_URL}/api/v1/bookings/verify-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ booking_id: odBookingId, vendor_id: testOverdraftVendor })
  });
  const odJson = await odRes.json();
  assert(odRes.status === 403, 'Overdraft booking confirmation blocked with HTTP 403 Forbidden');
  assert(odJson.error && odJson.error.includes('Wallet recharge required'), 'Clear overdraft recharge warning displayed');

  // Clean up overdraft test data
  await pool.execute('DELETE FROM bookings WHERE id = ?', [odBookingId]);
  await pool.execute('DELETE FROM vendor_wallets WHERE vendor_id = ?', [testOverdraftVendor]);
  await pool.execute('DELETE FROM vendors WHERE id = ?', [testOverdraftVendor]);


  // ------------------------------------------------------------------------
  // PART 4: Business Model Confinement (Strictly 3 Core Services)
  // ------------------------------------------------------------------------
  console.log('\n--- 4. CONFIRMING STRICT 3-SERVICE BUSINESS MODEL ---');

  // Decommissioned services must return HTTP 404
  const flightRes = await fetch(`${BASE_URL}/api.php?resource=flights`);
  assert(flightRes.status === 404, 'Flight endpoint returns HTTP 404 Decommissioned');

  const bikeRes = await fetch(`${BASE_URL}/api.php?resource=bikes`);
  assert(bikeRes.status === 404, 'Self-drive bike endpoint returns HTTP 404 Decommissioned');

  const model3dRes = await fetch(`${BASE_URL}/api.php?resource=vehicle_3d_library`);
  assert(model3dRes.status === 404, 'Vehicle 3D library returns HTTP 404 Decommissioned');

  // Core Service 1: Hotels & Resorts
  const hotelRes = await fetch(`${BASE_URL}/api.php?resource=hotels`);
  const hotels = await hotelRes.json();
  assert(hotelRes.status === 200, 'Hotels catalog returns HTTP 200 OK');
  assert(Array.isArray(hotels) && hotels.length >= 4, `Active hotels: ${hotels.length} Thailand properties`);

  // Core Service 2: Cab Airport Transfers & Point-to-Point
  const transferRes = await fetch(`${BASE_URL}/api.php?resource=transfer_routes`);
  const transfers = await transferRes.json();
  assert(transferRes.status === 200, 'Airport transfer routes return HTTP 200 OK');
  assert(Array.isArray(transfers) && transfers.length >= 3, `Active transfer routes: ${transfers.length} routes`);

  // Core Service 3: Admin-Curated Sightseeing & Activities
  const toursRes = await fetch(`${BASE_URL}/api.php?resource=packages`);
  const tours = await toursRes.json();
  assert(toursRes.status === 200, 'Admin-curated sightseeing tours return HTTP 200 OK');
  assert(Array.isArray(tours) && tours.length >= 2, `Active sightseeing tours: ${tours.length} curated packages`);


  // ------------------------------------------------------------------------
  // PART 5: End-to-End Booking Journeys & QR Vouchers
  // ------------------------------------------------------------------------
  console.log('\n--- 5. TESTING END-TO-END BOOKING JOURNEYS ---');

  // Journey A: Customer Hotel Booking Journey
  const custBkgId = 'audit-cust-htl-' + Date.now();
  const custBkgPayload = {
    booking_id: custBkgId,
    customer_name: 'Siriporn Ratanakul',
    customer_phone: '+66 84 555 6677',
    customer_email: 'siriporn@example.com',
    start_date: '2026-11-10',
    end_date: '2026-11-12',
    hotel_id: 'th-htl-01',
    room_type_id: 'rm-phuket-01',
    rooms: 1,
    base_amount_thb: 9000.00,
    customer_currency: 'INR',
    exchange_rate: 2.45,
    customer_total: 22050.00
  };

  const cBkgRes = await fetch(`${BASE_URL}/api.php?resource=bookings&action=create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(custBkgPayload)
  });
  const cBkgJson = await cBkgRes.json();
  assert(cBkgRes.status === 201 || cBkgRes.status === 200, 'Customer hotel booking created successfully');

  // Verify invoice generation
  const invRes = await fetch(`${BASE_URL}/api.php?action=booking_invoice_data&booking_id=${cBkgJson.booking_id || custBkgId}`);
  const invJson = await invRes.json();
  assert(invRes.status === 200, 'Customer invoice generated successfully');
  assert(invJson.company_name === 'WOW THAILAND', 'Invoice branded with WOW THAILAND');

  // Verify voucher generation
  const [voucherRows] = await pool.execute('SELECT * FROM vouchers WHERE booking_id = ?', [cBkgJson.booking_id || custBkgId]);
  assert(voucherRows.length > 0, `Generated secure voucher with code: ${voucherRows[0]?.voucher_code}`);

  // Journey B: B2B Agent Wholesale Net Booking Journey
  const b2bBkgId = 'audit-b2b-' + Date.now();
  const b2bPayload = {
    id: b2bBkgId,
    user_id: 'usr-b2b-01',
    customer_name: 'Siam Discovery Travels Client',
    customer_phone: '+66 88 777 6655',
    customer_email: 'agent@siamdiscovery.com',
    start_date: '2026-11-15',
    end_date: '2026-11-17',
    vendor_id: 'vnd-phuket-01',
    base_amount_thb: 7200.00, // Wholesale Net Rate (20% off rack rate)
    platform_fee_thb: 0.00, // B2B direct settlement
    payment_status: 'PAID',
    booking_status: 'Confirmed'
  };

  const b2bRes = await fetch(`${BASE_URL}/api.php?resource=bookings&action=create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${b2bToken}`
    },
    body: JSON.stringify(b2bPayload)
  });
  const b2bJson = await b2bRes.json();
  assert(b2bRes.status === 201 || b2bRes.status === 200, 'B2B agent booking processed successfully');

  // Verify B2B booking in database
  const [b2bRows] = await pool.execute('SELECT id, user_id, payment_status, booking_status FROM bookings WHERE id = ?', [b2bJson.booking_id || b2bBkgId]);
  assert(b2bRows.length > 0 && b2bRows[0].user_id === 'usr-b2b-01', 'B2B booking accurately associated with agent user_id');

  // Clean up test bookings
  await pool.execute('DELETE FROM vouchers WHERE booking_id IN (?, ?, ?)', [custBkgId, b2bBkgId, idempJson1.booking_id]);
  await pool.execute('DELETE FROM bookings WHERE id IN (?, ?, ?)', [custBkgId, b2bBkgId, idempJson1.booking_id]);
  await pool.execute('DELETE FROM hotel_room_availability WHERE calendar_date = ?', [testNight]);

  // Reset vendor wallet balance for clean operational state
  await pool.execute('UPDATE vendor_wallets SET balance_thb = 25000.00, negative_booking_count = 0 WHERE vendor_id = ?', ['vnd-phuket-01']);

  console.log('\n============================================================');
  console.log(`MASTER AUDIT COMPLETE: ${passedTests}/${totalTests} TESTS PASSED (${failedTests} FAILED)`);
  console.log('============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runMasterVerification().catch(err => {
  console.error('Master Verification Exception:', err);
  process.exit(1);
});
