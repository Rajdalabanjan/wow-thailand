// ========================================================================
// WOW THAILAND: Phase 1 Security Regression Test Suite
// Verifies all Phase 1 security fixes against local MySQL database
// ========================================================================

process.env.NODE_ENV = 'test';

import pool, { query } from '../src/config/db.js';
import { signJwtToken, ACTIVE_JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE } from '../src/middleware/auth.js';
import { __setTestOtpForRegression } from '../src/services/otpService.js';
import jwt from 'jsonwebtoken';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
    throw new Error(`Security regression assertion failed: ${message}`);
  }
}

async function runSecurityTests() {
  const { server } = await import('../src/server.js');
  const PORT = 5003;
  await new Promise((resolve) => server.listen(PORT, resolve));
  const baseUrl = `http://localhost:${PORT}`;

  console.log(`\n============================================================`);
  console.log(`🔒 WOW THAILAND: PHASE 1 SECURITY REGRESSION TEST SUITE`);
  console.log(`Testing Backend on ${baseUrl} against MySQL wow_thailand`);
  console.log(`============================================================\n`);

  try {
    const postJson = (qs, body, headers = {}) => fetch(`${baseUrl}/api.php?${qs}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body)
    });

    const get = (qs, headers = {}) => fetch(`${baseUrl}/api.php?${qs}`, { headers });
    const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

    // -------------------------------------------------------------
    // Setup Logins for Test Roles
    // -------------------------------------------------------------
    // 1. Admin Token
    const adminLogin = await (await postJson('action=login', { username: 'admin', password: 'TestPassword123!' })).json();
    const adminToken = adminLogin.token;

    // 2. Vendor A Token (Phuket Luxury Hotels: vnd-phuket-01)
    const vendorALogin = await (await postJson('action=login', { username: 'phuket_resorts', password: 'TestPassword123!' })).json();
    const vendorAToken = vendorALogin.token;

    // 3. Vendor B Token (Siam VIP Transfers: vnd-1792583002121)
    const vendorBLogin = await (await postJson('action=login', { username: 'siam_transfers_1834', password: 'TestPassword123!' })).json();
    const vendorBToken = vendorBLogin.token;

    // 4. Driver Somchai Token (drv-bkk-01)
    const driverLogin = await (await postJson('action=login', { phone: '+66 83 456 7890', password: 'TestPassword123!' })).json();
    const driverToken = driverLogin.token;

    // 5. Customer A & Customer B JWTs
    const customerAToken = signJwtToken({
      id: 'cust-a-test',
      phone: '66811112222',
      email: 'customer_a@test.com',
      role: 'customer',
      name: 'Customer A'
    });

    const customerBToken = signJwtToken({
      id: 'cust-b-test',
      phone: '66822223333',
      email: 'customer_b@test.com',
      role: 'customer',
      name: 'Customer B'
    });

    // Ensure customer users exist in users table
    await query(
      `INSERT INTO users (id, username, email, phone, role, password_hash) VALUES ('cust-a-test', 'customer_a', 'customer_a@test.com', '+66 81 111 2222', 'customer', '$2a$10$abcdefghijklmnopqrstuu') ON DUPLICATE KEY UPDATE role = 'customer'`
    );
    await query(
      `INSERT INTO users (id, username, email, phone, role, password_hash) VALUES ('cust-b-test', 'customer_b', 'customer_b@test.com', '+66 82 222 3333', 'customer', '$2a$10$abcdefghijklmnopqrstuu') ON DUPLICATE KEY UPDATE role = 'customer'`
    );

    // Seed test bookings in MySQL for Customer A and Customer B
    const bookingAId = `BK-SEC-A-${Date.now()}`;
    const bookingBId = `BK-SEC-B-${Date.now()}`;

    await query(
      `INSERT INTO bookings (
        id, customer_name, customer_phone, customer_email, user_id, vendor_id,
        start_date, end_date, base_amount_thb, customer_total_amount, payment_status, booking_status
      ) VALUES (?, 'Customer A', '+66 81 111 2222', 'customer_a@test.com', 'cust-a-test', 'vnd-phuket-01', '2026-11-10', '2026-11-12', 15000, 15000, 'PAID', 'Confirmed')`,
      [bookingAId]
    );

    await query(
      `INSERT INTO bookings (
        id, customer_name, customer_phone, customer_email, user_id, vendor_id,
        start_date, end_date, base_amount_thb, customer_total_amount, payment_status, booking_status
      ) VALUES (?, 'Customer B', '+66 82 222 3333', 'customer_b@test.com', 'cust-b-test', 'vnd-1792583002121', '2026-11-15', '2026-11-17', 8000, 8000, 'PENDING', 'Awaiting Payment')`,
      [bookingBId]
    );

    // Seed test vouchers
    await query(
      `INSERT INTO vouchers (id, booking_id, voucher_code, qr_payload) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE voucher_code = VALUES(voucher_code)`,
      [`vch-${bookingAId}`, bookingAId, `VCH-${bookingAId}`, `QR-${bookingAId}`]
    );
    await query(
      `INSERT INTO vouchers (id, booking_id, voucher_code, qr_payload) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE voucher_code = VALUES(voucher_code)`,
      [`vch-${bookingBId}`, bookingBId, `VCH-${bookingBId}`, `QR-${bookingBId}`]
    );

    // =============================================================
    // 1. OTP SECURITY & BYPASS TESTS
    // =============================================================
    console.log('\n--- 1. Testing OTP Generation & Bypass Prevention ---');
    
    // 1.1 Request OTP does not leak code
    const otpSendRes = await postJson('action=send_customer_otp', { phone: '66811112222', email: 'customer_a@test.com' });
    assert(otpSendRes.status === 200, 'send_customer_otp returns 200');
    const otpSendData = await otpSendRes.json();
    assert(otpSendData.otp_preview === undefined, 'OTP code is strictly omitted from API response');
    assert(!otpSendData.message.includes('1234'), 'Message does not expose hard-coded demo OTP');

    // 1.2 Reject hardcoded '1234' bypass
    const bypass1234Res = await postJson('action=verify_customer_otp', { phone: '66811112222', otp: '1234' });
    assert(bypass1234Res.status === 400, 'Hard-coded OTP bypass "1234" is strictly rejected (400)');

    // 1.3 Reject hardcoded '123456' bypass
    const bypass123456Res = await postJson('action=verify_customer_otp', { phone: '66811112222', otp: '123456' });
    assert(bypass123456Res.status === 400, 'Hard-coded OTP bypass "123456" is strictly rejected (400)');

    // 1.4 Reject invalid code
    const invalidOtpRes = await postJson('action=verify_customer_otp', { phone: '66811112222', otp: '999888' });
    assert(invalidOtpRes.status === 400, 'Invalid OTP code is rejected (400)');

    // 1.5 Legitimate verification with correct hashed OTP
    __setTestOtpForRegression('66811112222', 'customer_a@test.com', '789123');
    const validOtpRes = await postJson('action=verify_customer_otp', { phone: '66811112222', email: 'customer_a@test.com', otp: '789123' });
    assert(validOtpRes.status === 200, 'Valid 6-digit OTP verification returns 200 OK');
    const validOtpData = await validOtpRes.json();
    assert(validOtpData.success === true, 'Verification success is true');
    assert(typeof validOtpData.token === 'string' && validOtpData.token.length > 20, 'Customer receives a signed JWT token');
    assert(validOtpData.customer.role === 'customer', 'Customer role is verified as customer');

    // 1.6 Anti-replay: cannot reuse the same OTP
    const replayRes = await postJson('action=verify_customer_otp', { phone: '66811112222', email: 'customer_a@test.com', otp: '789123' });
    assert(replayRes.status === 400, 'Replay attack prevented: used OTP cannot be reused (400)');

    // =============================================================
    // 2. CUSTOMER IDOR & DATA ISOLATION TESTS
    // =============================================================
    console.log('\n--- 2. Testing Customer IDOR & Data Isolation ---');

    // 2.1 Unauthenticated bookings query is rejected
    const anonBkgRes = await get('resource=bookings');
    assert(anonBkgRes.status === 401, 'Anonymous booking list query is rejected (401)');

    const anonPhoneBkgRes = await get('resource=bookings&mobile=66811112222');
    assert(anonPhoneBkgRes.status === 401, 'Anonymous customer booking lookup by phone is rejected (401)');

    // 2.2 Customer A listing bookings only sees their own
    const custABkgRes = await get('resource=bookings', authHeader(customerAToken));
    assert(custABkgRes.status === 200, 'Customer A can query their bookings (200)');
    const custABkgs = await custABkgRes.json();
    assert(Array.isArray(custABkgs), 'Customer bookings returned as array');
    assert(custABkgs.some(b => b.id === bookingAId), 'Customer A can see Booking A');
    assert(!custABkgs.some(b => b.id === bookingBId), 'Customer A CANNOT see Customer B\'s Booking B');

    // 2.3 Customer A cannot query Customer B by phone parameter
    const custATryingBPhone = await get('resource=bookings&mobile=66822223333', authHeader(customerAToken));
    assert(custATryingBPhone.status === 403, 'Customer A querying Customer B\'s phone is forbidden (403)');

    // 2.4 Customer A cannot view Customer B's booking by ID
    const custATryingBId = await get(`resource=bookings&id=${bookingBId}`, authHeader(customerAToken));
    assert(custATryingBId.status === 403, 'Customer A querying Customer B\'s booking by ID is forbidden (403)');

    // 2.5 Customer A CAN view their own booking by ID
    const custAOwnBooking = await get(`resource=bookings&id=${bookingAId}`, authHeader(customerAToken));
    assert(custAOwnBooking.status === 200, 'Customer A querying their own booking by ID returns 200 OK');

    // =============================================================
    // 3. INVOICES & VOUCHERS ACCESS CONTROL TESTS
    // =============================================================
    console.log('\n--- 3. Testing Invoice & Voucher Protection ---');

    // 3.1 Anonymous invoice access is rejected
    const anonInvRes = await get(`resource=booking_invoice_data&booking_id=${bookingAId}`);
    assert(anonInvRes.status === 401, 'Anonymous request for private invoice data returns 401');

    // 3.2 Customer B cannot access Customer A's invoice
    const custBInvA = await get(`resource=booking_invoice_data&booking_id=${bookingAId}`, authHeader(customerBToken));
    assert(custBInvA.status === 403, 'Customer B accessing Customer A\'s invoice is forbidden (403)');

    // 3.3 Customer A can access their own invoice
    const custAInvA = await get(`resource=booking_invoice_data&booking_id=${bookingAId}`, authHeader(customerAToken));
    assert(custAInvA.status === 200, 'Customer A accessing their own invoice returns 200 OK');

    // 3.4 Anonymous voucher download is rejected
    const anonVoucher = await get(`action=download_voucher_pdf&id=${bookingAId}`);
    assert(anonVoucher.status === 401, 'Anonymous request for PDF voucher download returns 401');

    // 3.5 Customer B cannot download Customer A's voucher
    const custBVoucherA = await get(`action=download_voucher_pdf&id=${bookingAId}`, authHeader(customerBToken));
    assert(custBVoucherA.status === 403, 'Customer B downloading Customer A\'s voucher is forbidden (403)');

    // 3.6 Customer A can download their own voucher
    const custAVoucherA = await get(`action=download_voucher_pdf&id=${bookingAId}`, authHeader(customerAToken));
    assert(custAVoucherA.status === 200, 'Customer A downloading their own voucher returns 200 OK');
    assert(custAVoucherA.headers.get('content-type') === 'application/pdf', 'Voucher is delivered as application/pdf');

    // =============================================================
    // 4. VENDOR WALLET & TRANSACTION ISOLATION TESTS
    // =============================================================
    console.log('\n--- 4. Testing Vendor Wallet & Transaction Isolation ---');

    // 4.1 Anonymous wallet query rejected
    assert((await get('resource=vendor_wallets')).status === 401, 'Anonymous vendor_wallets query returns 401');

    // 4.2 Vendor A listing wallets only sees their own
    const vAWalletsRes = await get('resource=vendor_wallets', authHeader(vendorAToken));
    assert(vAWalletsRes.status === 200, 'Vendor A queries vendor_wallets returns 200 OK');
    const vAWallets = await vAWalletsRes.json();
    assert(Array.isArray(vAWallets), 'Wallets returned as array');
    assert(vAWallets.every(w => w.vendor_id === 'vnd-phuket-01'), 'Vendor A ONLY sees their own wallet (vnd-phuket-01)');

    // 4.3 Vendor A cannot query Vendor B's wallet info
    const vATryingBWallet = await get('resource=vendor_wallet_info&vendor_id=vnd-1792583002121', authHeader(vendorAToken));
    assert(vATryingBWallet.status === 403, 'Vendor A querying Vendor B\'s wallet info is forbidden (403)');

    // 4.4 Vendor A can query their own wallet info
    const vAOwnWallet = await get('resource=vendor_wallet_info&vendor_id=vnd-phuket-01', authHeader(vendorAToken));
    assert(vAOwnWallet.status === 200, 'Vendor A querying their own wallet info returns 200 OK');

    // 4.5 Vendor A querying wallet_transactions only sees their own
    const vATxsRes = await get('resource=wallet_transactions', authHeader(vendorAToken));
    assert(vATxsRes.status === 200, 'Vendor A queries wallet_transactions returns 200 OK');
    const vATxs = await vATxsRes.json();
    assert(vATxs.every(t => t.vendor_id === 'vnd-phuket-01'), 'Vendor A ONLY sees transactions for vnd-phuket-01');

    // =============================================================
    // 5. CROSS-VENDOR BOOKING TAMPERING PREVENTION
    // =============================================================
    console.log('\n--- 5. Testing Cross-Vendor Booking Tampering Prevention ---');

    // 5.1 Vendor B cannot update Vendor A's booking checkin
    const vBTamperCheckin = await postJson('action=update_booking_checkin', {
      booking_id: bookingAId,
      assigned_room_no: '999',
      checkin_status: 'Checked In'
    }, authHeader(vendorBToken));
    assert(vBTamperCheckin.status === 403, 'Vendor B updating Vendor A\'s booking check-in is forbidden (403)');

    // 5.2 Vendor B cannot update Vendor A's booking status
    const vBTamperStatus = await postJson('action=update_booking_status', {
      booking_id: bookingAId,
      status: 'Cancelled'
    }, authHeader(vendorBToken));
    assert(vBTamperStatus.status === 403, 'Vendor B cancelling Vendor A\'s booking is forbidden (403)');

    // 5.3 Vendor B cannot verify payment for Vendor A's booking
    const vBTamperPayment = await postJson('resource=bookings&action=verify_booking_payment', {
      booking_id: bookingAId,
      vendor_id: 'vnd-phuket-01'
    }, authHeader(vendorBToken));
    assert(vBTamperPayment.status === 403, 'Vendor B verifying payment for Vendor A\'s booking is forbidden (403)');

    // 5.4 Vendor A CAN update check-in for their own booking
    const vAUpdateOwn = await postJson('action=update_booking_checkin', {
      booking_id: bookingAId,
      assigned_room_no: 'Villa 101',
      checkin_status: 'Checked In'
    }, authHeader(vendorAToken));
    assert(vAUpdateOwn.status === 200, 'Vendor A updating check-in for their own booking returns 200 OK');

    // =============================================================
    // 6. DRIVER JOB ISOLATION & MANIPULATION PREVENTION
    // =============================================================
    console.log('\n--- 6. Testing Driver Job Isolation & Manipulation Prevention ---');

    // Seed test jobs for Somchai and another driver
    const jobSomchaiId = `job-somchai-${Date.now()}`;
    const jobOtherId = `job-other-${Date.now()}`;

    // Seed secondary driver for cross-driver isolation testing
    await query(
      `INSERT INTO users (id, username, email, role, password_hash)
       VALUES ('usr-driver-other', 'driver_other', 'driver2@example.com', 'driver', '$2a$10$dummyhashfortestingonly')
       ON DUPLICATE KEY UPDATE username = 'driver_other'`
    );
    await query(
      `INSERT INTO drivers (id, user_id, full_name, phone, license_number)
       VALUES ('drv-other-99', 'usr-driver-other', 'Other Test Driver', '+66 89 999 9999', 'TH-DL-999999')
       ON DUPLICATE KEY UPDATE full_name = 'Other Test Driver'`
    );

    await query(
      `INSERT INTO driver_assignments (id, booking_id, driver_id, status, pickup_time)
       VALUES (?, ?, 'drv-bkk-01', 'ASSIGNED', '2026-11-10 14:00:00')
       ON DUPLICATE KEY UPDATE status = 'ASSIGNED'`,
      [jobSomchaiId, bookingAId]
    );

    await query(
      `INSERT INTO driver_assignments (id, booking_id, driver_id, status, pickup_time)
       VALUES (?, ?, 'drv-other-99', 'ASSIGNED', '2026-11-10 16:00:00')
       ON DUPLICATE KEY UPDATE status = 'ASSIGNED'`,
      [jobOtherId, bookingBId]
    );

    // 6.1 Driver Somchai listing jobs only sees their own
    const dJobsRes = await get('resource=driver_jobs', authHeader(driverToken));
    assert(dJobsRes.status === 200, 'Driver queries driver_jobs returns 200 OK');
    const dJobs = await dJobsRes.json();
    assert(dJobs.some(j => j.id === jobSomchaiId), 'Driver Somchai sees assigned job');
    assert(!dJobs.some(j => j.id === jobOtherId), 'Driver Somchai CANNOT see unrelated driver job');

    // 6.2 Driver Somchai cannot query another driver's jobs
    const dQueryOther = await get('resource=driver_jobs&driver_id=drv-other-99', authHeader(driverToken));
    assert(dQueryOther.status === 403, 'Driver querying another driver\'s manifest is forbidden (403)');

    // 6.3 Driver Somchai cannot modify an unrelated driver's job
    const dTamperJob = await postJson('action=update_driver_job_status', {
      booking_id: jobOtherId,
      status: 'COMPLETED'
    }, authHeader(driverToken));
    assert(dTamperJob.status === 403, 'Driver modifying an unrelated driver job is forbidden (403)');

    // 6.4 Driver Somchai CAN update their own assigned job
    const dUpdateOwnJob = await postJson('action=update_driver_job_status', {
      booking_id: jobSomchaiId,
      status: 'ACCEPTED'
    }, authHeader(driverToken));
    assert(dUpdateOwnJob.status === 200, 'Driver updating their own assigned job returns 200 OK');

    // =============================================================
    // 7. WALLET CREDITS & TOP-UP RESTRICTIONS
    // =============================================================
    console.log('\n--- 7. Testing Wallet Credit & Top-Up Restrictions ---');

    // 7.1 Vendor cannot credit wallet
    const vTopUp = await postJson('action=top_up_wallet', { vendor_id: 'vnd-phuket-01', amount_thb: 5000 }, authHeader(vendorAToken));
    assert(vTopUp.status === 403, 'Vendor attempting wallet top-up is forbidden (403)');

    // 7.2 Driver cannot credit wallet
    const dTopUp = await postJson('action=top_up_wallet', { vendor_id: 'vnd-phuket-01', amount_thb: 5000 }, authHeader(driverToken));
    assert(dTopUp.status === 403, 'Driver attempting wallet top-up is forbidden (403)');

    // 7.3 Customer cannot credit wallet
    const cTopUp = await postJson('action=top_up_wallet', { vendor_id: 'vnd-phuket-01', amount_thb: 5000 }, authHeader(customerAToken));
    assert(cTopUp.status === 403, 'Customer attempting wallet top-up is forbidden (403)');

    // 7.4 Anonymous cannot credit wallet
    const anonTopUp = await postJson('action=top_up_wallet', { vendor_id: 'vnd-phuket-01', amount_thb: 5000 });
    assert(anonTopUp.status === 401, 'Anonymous wallet top-up attempt returns 401');

    // 7.5 Admin CAN credit wallet
    const adminTopUp = await postJson('action=top_up_wallet', { vendor_id: 'vnd-phuket-01', amount_thb: 100 }, authHeader(adminToken));
    assert(adminTopUp.status === 200, 'Admin wallet top-up returns 200 OK');
    const adminTopUpData = await adminTopUp.json();
    assert(adminTopUpData.success === true, 'Admin top-up succeeded');

    // =============================================================
    // 8. JWT VALIDATION (ISSUER, AUDIENCE, EXPIRY, ROLES)
    // =============================================================
    console.log('\n--- 8. Testing JWT Validation & Tamper Resistance ---');

    // 8.1 Forged role
    const forgedRoleToken = jwt.sign(
      { id: 'hacker', username: 'hacker', role: 'root_super_admin' },
      ACTIVE_JWT_SECRET,
      { expiresIn: '1h', issuer: JWT_ISSUER, audience: JWT_AUDIENCE }
    );
    const forgedRes = await get('resource=users', authHeader(forgedRoleToken));
    assert(forgedRes.status === 401 || forgedRes.status === 403, 'Token with forged/unrecognized role is rejected');

    // 8.2 Expired token
    const expiredToken = jwt.sign(
      { id: 'usr-admin-01', username: 'admin', role: 'admin' },
      ACTIVE_JWT_SECRET,
      { expiresIn: '-1s', issuer: JWT_ISSUER, audience: JWT_AUDIENCE }
    );
    const expiredRes = await get('resource=users', authHeader(expiredToken));
    assert(expiredRes.status === 401, 'Expired JWT token is strictly rejected (401)');

    // 8.3 Invalid secret
    const badSecretToken = jwt.sign(
      { id: 'usr-admin-01', username: 'admin', role: 'admin' },
      'wrong_unauthorized_secret_key_123',
      { expiresIn: '1h', issuer: JWT_ISSUER, audience: JWT_AUDIENCE }
    );
    const badSecretRes = await get('resource=users', authHeader(badSecretToken));
    assert(badSecretRes.status === 401, 'Token signed with invalid secret is strictly rejected (401)');

    // Clean up test bookings, jobs and users
    await query('DELETE FROM driver_assignments WHERE id IN (?, ?)', [jobSomchaiId, jobOtherId]);
    await query('DELETE FROM drivers WHERE id = ?', ['drv-other-99']);
    await query('DELETE FROM vouchers WHERE booking_id IN (?, ?)', [bookingAId, bookingBId]);
    await query('DELETE FROM bookings WHERE id IN (?, ?)', [bookingAId, bookingBId]);
    await query('DELETE FROM users WHERE id IN (?, ?, ?)', ['cust-a-test', 'cust-b-test', 'usr-driver-other']);

  } catch (err) {
    console.error('\n❌ Security Regression Test Failed with error:', err.message);
    failed++;
  } finally {
    server.close();
    await pool.end();

    console.log(`\n============================================================`);
    console.log(`SECURITY REGRESSION TESTS FINISHED: ${passed} PASSED, ${failed} FAILED`);
    console.log(`============================================================\n`);

    if (failed > 0) process.exit(1);
    process.exit(0);
  }
}

runSecurityTests();
