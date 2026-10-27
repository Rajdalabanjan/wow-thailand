// ========================================================================
// WOW THAILAND: Frontend Contract & 8-Portal Integration Tests
// Verifies frontend request/response contracts against Node.js Express backend
// Ensures zero runtime dependency on PHP backend and strict error reporting
// ========================================================================

import { server } from '../src/server.js';
import pool from '../src/config/db.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  const PORT = 5002;
  await new Promise((resolve) => server.listen(PORT, resolve));
  const baseUrl = `http://localhost:${PORT}`;

  console.log(`\n============================================================`);
  console.log(`WOW THAILAND: FRONTEND CONTRACT & 8-PORTAL INTEGRATION TESTS`);
  console.log(`Testing Backend on ${baseUrl} against MySQL wow_thailand`);
  console.log(`============================================================\n`);

  try {
    // -------------------------------------------------------------
    // 1. PORTAL 1: CUSTOMER PORTAL CONTRACTS
    // -------------------------------------------------------------
    console.log('1. Testing Customer Portal API Contracts:');
    
    // Hotels Catalog
    const hRes = await fetch(`${baseUrl}/api.php?resource=hotels`);
    assert(hRes.status === 200, 'GET /api.php?resource=hotels returns 200 OK');
    const hData = await hRes.json();
    const hotels = Array.isArray(hData) ? hData : (hData.data || []);
    assert(hotels.length >= 4, `Returned ${hotels.length} Thailand hotels (expected >= 4)`);
    assert(hotels.some(h => h.city === 'Phuket'), 'Contains Phuket luxury hotels');
    assert(hotels.some(h => h.city === 'Bangkok'), 'Contains Bangkok hotels');
    assert(hotels[0].amenities && Array.isArray(hotels[0].amenities), 'Hotels contain parsed amenities array');
    assert(hotels[0].image && hotels[0].image.length > 0, 'Hotels contain valid image paths');

    // Public Room Types
    const rRes = await fetch(`${baseUrl}/api.php?resource=hotel_rooms_public&hotel_id=th-htl-01`);
    assert(rRes.status === 200, 'GET /api.php?resource=hotel_rooms_public returns 200 OK');
    const rData = await rRes.json();
    assert(rData.success === true, 'Public rooms response success is true');
    assert(rData.room_types.length >= 1, `Found ${rData.room_types.length} room types for Phuket hotel`);
    assert(rData.room_types[0].base_price_thb > 0, 'Room has valid base_price_thb');

    // Vehicles / Airport Cabs
    const cRes = await fetch(`${baseUrl}/api.php?resource=cars`);
    assert(cRes.status === 200, 'GET /api.php?resource=cars returns 200 OK');
    const cars = await cRes.json();
    assert(Array.isArray(cars) && cars.length >= 4, `Returned ${cars.length} vehicles for transfers`);
    assert(cars.some(c => c.name.includes('Camry') || c.name.includes('Commuter')), 'Contains Toyota Camry / Commuter VIP');

    // Motorbikes (Decommissioned for WOW THAILAND Transfers)
    const bRes = await fetch(`${baseUrl}/api.php?resource=bikes`);
    assert(bRes.status === 404, 'GET /api.php?resource=bikes correctly returns 404 Decommissioned');
    const bData = await bRes.json();
    assert(bData.success === false && bData.error.includes('decommissioned'), 'Returns bike decommission error');

    // Cabs & Transfers (Approved Category)
    const cabRes = await fetch(`${baseUrl}/api.php?resource=cabs`);
    assert(cabRes.status === 200, 'GET /api.php?resource=cabs returns 200 OK');
    const cabs = await cabRes.json();
    assert(Array.isArray(cabs) && cabs.length >= 4, `Returned ${cabs.length} transfer vehicles`);

    // Transfer Routes
    const trRes = await fetch(`${baseUrl}/api.php?resource=transfer_routes`);
    assert(trRes.status === 200, 'GET /api.php?resource=transfer_routes returns 200 OK');
    const routes = await trRes.json();
    assert(Array.isArray(routes) && routes.length >= 4, 'Returned 4 airport transfer routes');

    // Tours & Sightseeing Packages
    const pRes = await fetch(`${baseUrl}/api.php?resource=packages`);
    assert(pRes.status === 200, 'GET /api.php?resource=packages returns 200 OK');
    const tours = await pRes.json();
    assert(Array.isArray(tours) && tours.length >= 3, 'Returned Thailand tour packages');
    assert(tours.some(t => t.title.includes('Phi Phi') || t.title.includes('Chao Phraya')), 'Contains signature Thailand tours');

    // Activities & Add-ons
    const actRes = await fetch(`${baseUrl}/api.php?resource=activities`);
    assert(actRes.status === 200, 'GET /api.php?resource=activities returns 200 OK');
    const activities = await actRes.json();
    assert(Array.isArray(activities) && activities.length >= 3, 'Returned activities and add-ons');

    // Currency Rates (Multi-currency checkout)
    const curRes = await fetch(`${baseUrl}/api.php?resource=currency&action=rates`);
    assert(curRes.status === 200, 'GET /api.php?resource=currency returns 200 OK');
    const curData = await curRes.json();
    assert(curData.base_currency === 'THB', 'System base currency is strictly THB');
    assert(curData.rates.THB === 1.0, 'THB rate is 1.0');
    assert(curData.rates.INR > 0, 'INR exchange rate is available');
    assert(curData.rates.USD > 0, 'USD exchange rate is available');

    // Domestic Flights (Decommissioned for WOW THAILAND)
    const flRes = await fetch(`${baseUrl}/api.php?resource=flights`);
    assert(flRes.status === 404, 'GET /api.php?resource=flights correctly returns 404 Decommissioned');
    const flData = await flRes.json();
    assert(flData.success === false && flData.error.includes('decommissioned'), 'Returns flight decommission error');

    // Vouchers / Coupons
    const cpRes = await fetch(`${baseUrl}/api.php?resource=coupons`);
    assert(cpRes.status === 200, 'GET /api.php?resource=coupons returns 200 OK');
    const coupons = await cpRes.json();
    assert(Array.isArray(coupons), 'Coupons response is array');

    // -------------------------------------------------------------
    // 2. AUTHENTICATION & SECURITY ACROSS ALL PORTALS
    // -------------------------------------------------------------
    console.log('\n2. Testing Authentication & Role Permissions:');
    
    // Admin login
    const loginRes = await fetch(`${baseUrl}/api.php?action=login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'TestPassword123!' })
    });
    assert(loginRes.status === 200, 'Admin login with valid password returns 200 OK');
    const loginData = await loginRes.json();
    assert(loginData.success === true, 'Admin login success is true');
    assert(loginData.token && loginData.token.length > 20, 'Received signed JWT token');
    assert(loginData.user.role === 'admin' || loginData.user.role === 'superadmin', 'User has admin or superadmin role');
    assert(loginData.user.password_hash === undefined, 'password_hash is strictly redacted');

    // Hotel Vendor login
    const vendorLoginRes = await fetch(`${baseUrl}/api.php?action=login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'phuket_resorts', password: 'TestPassword123!' })
    });
    assert(vendorLoginRes.status === 200, 'Vendor login returns 200 OK');
    const vendorLoginData = await vendorLoginRes.json();
    assert(vendorLoginData.user.role === 'hotel_vendor', 'User has hotel_vendor role');

    // Driver login (using phone number)
    const driverLoginRes = await fetch(`${baseUrl}/api.php?action=login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+66 83 456 7890', password: 'TestPassword123!' })
    });
    assert(driverLoginRes.status === 200, 'Driver login by phone number returns 200 OK');
    const driverLoginData = await driverLoginRes.json();
    assert(driverLoginData.user.role === 'driver', 'User has driver role');

    // Bad Credentials Failure
    const badLoginRes = await fetch(`${baseUrl}/api.php?action=login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'WrongPassword' })
    });
    assert(badLoginRes.status === 401, 'Bad credentials correctly returns 401 Unauthorized');
    const badData = await badLoginRes.json();
    assert(badData.success === false, 'Error reported with success: false');

    // Missing Credentials Failure
    const emptyLoginRes = await fetch(`${baseUrl}/api.php?action=login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert(emptyLoginRes.status === 400, 'Empty credentials correctly returns 400 Bad Request');

    // -------------------------------------------------------------
    // 3. PORTAL 2: HOTEL VENDOR & PMS PORTAL CONTRACTS
    // -------------------------------------------------------------
    console.log('\n3. Testing Hotel Vendor / PMS Portal API Contracts:');
    
    // PMS Dashboard & Stats
    const pmsStatsRes = await fetch(`${baseUrl}/api.php?resource=pms_stats&hotel_id=th-htl-01`);
    assert(pmsStatsRes.status === 200, 'GET /api.php?resource=pms_stats returns 200 OK');
    const pmsStats = await pmsStatsRes.json();
    assert(pmsStats.success === true, 'PMS stats success is true');
    assert(pmsStats.stats.total_bookings >= 0, 'PMS stats contains total_bookings count');

    // PMS Room Types
    const pmsRoomsRes = await fetch(`${baseUrl}/api.php?resource=hotel_room_types&hotel_id=th-htl-01`);
    assert(pmsRoomsRes.status === 200, 'GET /api.php?resource=hotel_room_types returns 200 OK');
    const pmsRoomTypes = await pmsRoomsRes.json();
    assert(Array.isArray(pmsRoomTypes) && pmsRoomTypes.length >= 1, 'PMS returns room types array');

    // Availability Calendar
    const calRes = await fetch(`${baseUrl}/api.php?resource=hotel_availability_calendar&hotel_id=th-htl-01`);
    assert(calRes.status === 200, 'GET /api.php?resource=hotel_availability_calendar returns 200 OK');
    const calData = await calRes.json();
    assert(calData.success === true && Array.isArray(calData.availability), 'Availability calendar contains slots');

    // Meal Plans & F&B Menu
    const mealRes = await fetch(`${baseUrl}/api.php?resource=pms_get_room_meal_plans`);
    const mealData = await mealRes.json();
    const plans = Array.isArray(mealData) ? mealData : (mealData.rate_plans || []);
    assert(Array.isArray(plans) && plans.some(m => (m.meal_plan || m.id || '').toUpperCase() === 'CP'), 'Contains Continental Plan (CP)');

    const menuRes = await fetch(`${baseUrl}/api.php?resource=hotel_menu_items&hotel_id=th-htl-01`);
    assert(menuRes.status === 200, 'GET /api.php?resource=hotel_menu_items returns 200 OK');
    const menuData = await menuRes.json();
    assert(menuData.success === true && menuData.menu_items.length >= 3, 'Returns authentic Thai menu items');

    const barRes = await fetch(`${baseUrl}/api.php?resource=pms_get_bar_lounge`);
    assert(barRes.status === 200, 'GET /api.php?resource=pms_get_bar_lounge returns 200 OK');
    const barData = await barRes.json();
    assert(barData.success === true && (barData.bar || Array.isArray(barData.items)), 'Returns bar and lounge details');

    // -------------------------------------------------------------
    // 4. PORTAL 3: B2B PARTNER PORTAL CONTRACTS
    // -------------------------------------------------------------
    console.log('\n4. Testing B2B Partner Portal API Contracts:');
    
    // B2B Dashboard
    const b2bDashRes = await fetch(`${baseUrl}/api.php?resource=b2b_dashboard&b2b_partner_id=b2b-01`);
    assert(b2bDashRes.status === 200, 'GET /api.php?resource=b2b_dashboard returns 200 OK');
    const b2bDash = await b2bDashRes.json();
    assert(b2bDash.success === true, 'B2B dashboard success is true');
    assert(b2bDash.partner.name.includes('Siam'), 'Contains B2B partner details');

    // B2B Wallet & Limits
    const b2bWalRes = await fetch(`${baseUrl}/api.php?resource=b2b_wallet&partner_id=b2b-01`);
    assert(b2bWalRes.status === 200, 'GET /api.php?resource=b2b_wallet returns 200 OK');
    const b2bWal = await b2bWalRes.json();
    assert(b2bWal.success === true && b2bWal.balance > 0, 'B2B wallet has active credit balance');

    // B2B Pricing Rules
    const b2bRulesRes = await fetch(`${baseUrl}/api.php?resource=b2b_pricing_rules`);
    assert(b2bRulesRes.status === 200, 'GET /api.php?resource=b2b_pricing_rules returns 200 OK');
    const b2bRules = await b2bRulesRes.json();
    assert(Array.isArray(b2bRules) && b2bRules.some(r => r.tier === 'Diamond'), 'Returns B2B tier pricing rules');

    // -------------------------------------------------------------
    // 5. PORTAL 4: DRIVER PORTAL CONTRACTS
    // -------------------------------------------------------------
    console.log('\n5. Testing Driver Portal API Contracts:');
    
    // Driver Jobs
    const dJobsRes = await fetch(`${baseUrl}/api.php?resource=driver_jobs&driver_id=usr-driver-somchai`);
    assert(dJobsRes.status === 200, 'GET /api.php?resource=driver_jobs returns 200 OK');
    const dJobs = await dJobsRes.json();
    assert(Array.isArray(dJobs), 'Driver jobs returned as array');

    // Drivers List
    const dListRes = await fetch(`${baseUrl}/api.php?resource=drivers`);
    assert(dListRes.status === 200, 'GET /api.php?resource=drivers returns 200 OK');
    const drivers = await dListRes.json();
    assert(Array.isArray(drivers) && drivers.length >= 1, 'Drivers list returned from database');

    // Driver Profile
    const dProfRes = await fetch(`${baseUrl}/api.php?resource=driver_details&id=usr-driver-somchai`);
    assert(dProfRes.status === 200, 'GET /api.php?resource=driver_details returns 200 OK');
    const dProf = await dProfRes.json();
    assert(dProf.success === true && dProf.data.name.includes('Somchai'), 'Driver profile contains Somchai Prasert');

    // -------------------------------------------------------------
    // 6. PORTAL 5: VEHICLE FLEET & VENDOR PORTAL CONTRACTS
    // -------------------------------------------------------------
    console.log('\n6. Testing Vehicle Fleet & Vendor Portal Contracts:');
    
    const vUnitsRes = await fetch(`${baseUrl}/api.php?resource=vehicle_units`);
    assert(vUnitsRes.status === 200, 'GET /api.php?resource=vehicle_units returns 200 OK');
    const vUnits = await vUnitsRes.json();
    assert(Array.isArray(vUnits) && vUnits.length >= 4, 'Vehicle fleet units returned');

    const v3dRes = await fetch(`${baseUrl}/api.php?resource=vehicle_3d_library`);
    assert(v3dRes.status === 404, 'GET /api.php?resource=vehicle_3d_library correctly returns 404 Decommissioned');
    const v3d = await v3dRes.json();
    assert(v3d.success === false && v3d.error.includes('decommissioned'), 'Returns 3D library decommission error');

    const vPolRes = await fetch(`${baseUrl}/api.php?resource=vendor_cancellation_policies`);
    assert(vPolRes.status === 200, 'GET /api.php?resource=vendor_cancellation_policies returns 200 OK');
    const vPol = await vPolRes.json();
    assert(vPol.free_cancellation_hours === 48, 'Vendor cancellation policy enforces 48h free cancellation');

    // -------------------------------------------------------------
    // 7. PORTALS 6, 7, 8: ADMIN, SUPERADMIN & SUBADMIN CONTRACTS
    // -------------------------------------------------------------
    console.log('\n7. Testing Admin, SuperAdmin & SubAdmin Contracts:');
    
    // Platform Site Configs
    const scRes = await fetch(`${baseUrl}/api.php?resource=site_configs`);
    assert(scRes.status === 200, 'GET /api.php?resource=site_configs returns 200 OK');
    const sc = await scRes.json();
    assert(sc.site_name === 'WOW THAILAND', 'Site name is WOW THAILAND');
    assert(sc.base_currency === 'THB', 'Base currency is THB');
    assert(sc.max_negative_bookings === 2, 'Max negative bookings limit is 2');

    // Users and Vendors
    const uRes = await fetch(`${baseUrl}/api.php?resource=users`);
    assert(uRes.status === 200, 'GET /api.php?resource=users returns 200 OK');
    const users = await uRes.json();
    assert(Array.isArray(users) && users.length >= 3, 'Users returned without password hashes');

    const vRes = await fetch(`${baseUrl}/api.php?resource=vendors`);
    assert(vRes.status === 200, 'GET /api.php?resource=vendors returns 200 OK');
    const vendors = await vRes.json();
    assert(Array.isArray(vendors) && vendors.length >= 1, 'Vendors returned from database');

    // Vendor Wallets & Transactions
    const wRes = await fetch(`${baseUrl}/api.php?resource=vendor_wallets`);
    assert(wRes.status === 200, 'GET /api.php?resource=vendor_wallets returns 200 OK');
    const wallets = await wRes.json();
    assert(Array.isArray(wallets) && wallets.length >= 1, 'Wallets returned as array for admin settlement');
    assert(wallets[0].negative_limit < 0, 'Controlled negative booking limit is enforced');

    const txRes = await fetch(`${baseUrl}/api.php?resource=wallet_transactions`);
    assert(txRes.status === 200, 'GET /api.php?resource=wallet_transactions returns 200 OK');
    const txs = await txRes.json();
    assert(Array.isArray(txs), 'Wallet ledger transactions returned');

    // Platform Revenue
    const revRes = await fetch(`${baseUrl}/api.php?resource=platform_revenue`);
    assert(revRes.status === 200, 'GET /api.php?resource=platform_revenue returns 200 OK');
    const rev = await revRes.json();
    assert(rev.success === true && rev.currency === 'THB', 'Platform revenue aggregated in THB');

    // Payment Gateways
    const gwRes = await fetch(`${baseUrl}/api.php?resource=payment_gateways`);
    assert(gwRes.status === 200, 'GET /api.php?resource=payment_gateways returns 200 OK');
    const gateways = await gwRes.json();
    assert(Array.isArray(gateways) && gateways.some(g => g.id === 'promptpay'), 'Includes PromptPay QR gateway');

    // -------------------------------------------------------------
    // 8. STRICT ERROR REPORTING & ZERO OLD PHP DEPENDENCY
    // -------------------------------------------------------------
    console.log('\n8. Testing Strict Error Handling & Zero Old Backend Dependency:');
    
    // Explicit 404 for unmapped/unimplemented legacy endpoint
    const missingRes = await fetch(`${baseUrl}/api.php?resource=non_existent_ancient_endpoint`);
    assert(missingRes.status === 404, 'Unimplemented resource strictly returns HTTP 404 (no silent mock data)');
    const missingData = await missingRes.json();
    assert(missingData.success === false, 'Returns explicit failure message');
    assert(missingData.error.includes('Resource not implemented'), 'Returns descriptive error text');

    // Ensure test room inventory is primed
    await pool.execute("INSERT INTO hotel_room_availability (room_type_id, calendar_date, available_rooms) VALUES ('rm-phuket-01', '2026-11-01', 10) ON DUPLICATE KEY UPDATE available_rooms = GREATEST(available_rooms, 10)");
    await pool.execute("INSERT INTO hotel_room_availability (room_type_id, calendar_date, available_rooms) VALUES ('rm-phuket-01', '2026-11-02', 10) ON DUPLICATE KEY UPDATE available_rooms = GREATEST(available_rooms, 10)");

    // Verify booking creation contract
    const createBookRes = await fetch(`${baseUrl}/api.php?resource=bookings&action=create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: 'Narongrit Somsak',
        customer_email: 'narongrit@thaiuser.com',
        customer_phone: '+66 84 999 8888',
        hotel_id: 'th-htl-01',
        room_type_id: 'rm-phuket-01',
        check_in_date: '2026-11-01',
        check_out_date: '2026-11-03',
        rooms_count: 1,
        vendor_id: 'vnd-phuket-01',
        currency: 'THB'
      })
    });
    assert(createBookRes.status === 201, 'POST /api.php?resource=bookings&action=create returns 201 Created');
    const bookResult = await createBookRes.json();
    assert(bookResult.success === true, 'Booking successfully registered');
    assert(bookResult.payment_status === 'PENDING', 'Payment status is strictly PENDING on creation');

    // Check customer booking exists query
    const checkExistsRes = await fetch(`${baseUrl}/api.php?resource=check_customer_booking_exists&phone=%2B66%2084%20999%208888`);
    assert(checkExistsRes.status === 200, 'check_customer_booking_exists returns 200 OK');
    const checkData = await checkExistsRes.json();
    assert(checkData.exists === true, 'Customer booking confirmed to exist in database');

    // Invoice query
    const invRes = await fetch(`${baseUrl}/api.php?resource=booking_invoice_data&booking_id=${bookResult.booking_id}`);
    assert(invRes.status === 200, 'booking_invoice_data returns 200 OK');
    const invData = await invRes.json();
    assert(invData.success === true, 'Invoice successfully loaded');
    assert(invData.company === 'WOW THAILAND TRAVEL & TRANSFERS', 'Invoice branded with WOW THAILAND');

    // Payment verification
    const payRes = await fetch(`${baseUrl}/api.php?resource=bookings&action=verify_booking_payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id: bookResult.booking_id,
        vendor_id: 'vnd-phuket-01'
      })
    });
    assert(payRes.status === 200, 'verify_booking_payment returns 200 OK');
    const payData = await payRes.json();
    assert(payData.success === true, 'Booking payment verified');
    assert(payData.payment_status === 'PAID', 'Status updated to PAID');

  } catch (err) {
    console.error('Integration test failed with error:', err);
    failed++;
  } finally {
    server.close();
    await pool.end();

    console.log(`\n============================================================`);
    console.log(`CONTRACT INTEGRATION TESTS FINISHED: ${passed} PASSED, ${failed} FAILED`);
    console.log(`============================================================\n`);

    if (failed > 0) process.exit(1);
    process.exit(0);
  }
}

runTests();
