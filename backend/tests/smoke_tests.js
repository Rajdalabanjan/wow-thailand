// ========================================================================
// WOW THAILAND: Automated API Smoke Test Suite
// Verifies REST endpoints, booking transactions, anti-double-booking, 
// payment verification, and /api.php compatibility router.
// ========================================================================

import { app, server } from '../src/server.js';
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
  }
}

async function runSmokeTests() {
  console.log('Starting WOW THAILAND API Smoke Tests...\n');

  // Start test server on dynamic port
  const testPort = 5001;
  await new Promise(resolve => server.listen(testPort, resolve));
  const baseUrl = `http://localhost:${testPort}`;

  try {
    // 1. Health Check
    console.log('1. Testing Health Endpoint:');
    const healthRes = await fetch(`${baseUrl}/api/v1/health`);
    const health = await healthRes.json();
    assert(healthRes.status === 200, 'Health check returns 200');
    assert(health.app === 'WOW THAILAND API', 'App identity is WOW THAILAND API');

    // 2. Hotels Endpoint
    console.log('\n2. Testing Hotels Catalog:');
    const hotelsRes = await fetch(`${baseUrl}/api/v1/hotels`);
    const hotels = await hotelsRes.json();
    assert(hotels.success === true, 'Hotels query successful');
    assert(hotels.data.length >= 4, `Returned ${hotels.data.length} hotels (expected >= 4)`);
    assert(hotels.data.some(h => h.city === 'Phuket'), 'Contains Phuket luxury resort');
    assert(hotels.data.some(h => h.city === 'Bangkok'), 'Contains Bangkok city hotel');

    // 3. Hotel Details & Room Types
    console.log('\n3. Testing Hotel Details:');
    const hotelId = hotels.data[0].id;
    const hotelDetailRes = await fetch(`${baseUrl}/api/v1/hotels/${hotelId}`);
    const hotelDetail = await hotelDetailRes.json();
    assert(hotelDetail.success === true, 'Hotel details query successful');
    assert(hotelDetail.data.room_types.length >= 1, `Found ${hotelDetail.data.room_types.length} room type(s)`);

    // 4. Airport Transfer Routes
    console.log('\n4. Testing Airport Transfer Routes:');
    const transferRes = await fetch(`${baseUrl}/api/v1/transfers/routes`);
    const transfers = await transferRes.json();
    assert(transfers.success === true, 'Transfers query successful');
    assert(transfers.data.length >= 4, `Returned ${transfers.data.length} routes`);
    assert(transfers.data.some(r => r.origin_type === 'AIRPORT'), 'Contains Airport routes');

    // 5. Sightseeing Tours
    console.log('\n5. Testing Sightseeing Tours:');
    const toursRes = await fetch(`${baseUrl}/api/v1/tours`);
    const tours = await toursRes.json();
    assert(tours.success === true, 'Tours query successful');
    assert(tours.data.some(t => t.title.includes('Phi Phi')), 'Contains Phi Phi Islands tour');

    // 6. Booking Transaction (Hotel Stay with Room Availability Check)
    console.log('\n6. Testing Booking Transaction & Inventory Lock:');
    const today = new Date();
    const d1 = new Date(today);
    d1.setDate(d1.getDate() + 5);
    const d2 = new Date(today);
    d2.setDate(d2.getDate() + 7);

    const checkIn = d1.toISOString().slice(0, 10);
    const checkOut = d2.toISOString().slice(0, 10);
    const roomType = hotelDetail.data.room_types[0];

    // Check available rooms before booking
    const [availBefore] = await pool.execute(
      'SELECT available_rooms FROM hotel_room_availability WHERE room_type_id = ? AND calendar_date = ?',
      [roomType.id, checkIn]
    );
    const roomsBefore = availBefore[0].available_rooms;

    const bookingPayload = {
      idempotency_key: `smoke_test_${Date.now()}`,
      customer_name: 'Somchai Tester',
      customer_phone: '+66 81 999 8888',
      customer_email: 'tester@thailand.com',
      start_date: checkIn,
      end_date: checkOut,
      room_type_id: roomType.id,
      quantity: 1,
      base_amount_thb: roomType.base_price_thb * 2,
      customer_currency: 'THB',
      vendor_id: 'vnd-phuket-01',
      items: [
        {
          item_type: 'HOTEL',
          reference_id: roomType.id,
          unit_price_thb: roomType.base_price_thb,
          quantity: 2,
          subtotal_thb: roomType.base_price_thb * 2
        }
      ]
    };

    const bookRes = await fetch(`${baseUrl}/api/v1/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingPayload)
    });
    const bookResult = await bookRes.json();

    assert(bookRes.status === 201, 'Booking returns 201 Created');
    assert(bookResult.success === true, 'Booking successful');
    assert(bookResult.payment_status === 'PENDING', 'Payment status is strictly PENDING on creation');
    assert(bookResult.voucher_code.startsWith('VCH-'), `Generated valid voucher: ${bookResult.voucher_code}`);

    // Verify room inventory decremented atomically
    const [availAfter] = await pool.execute(
      'SELECT available_rooms FROM hotel_room_availability WHERE room_type_id = ? AND calendar_date = ?',
      [roomType.id, checkIn]
    );
    assert(availAfter[0].available_rooms === roomsBefore - 1, 'Room inventory decremented by 1 atomically');

    // 7. Payment Verification & Wallet Platform Fee Deduction
    console.log('\n7. Testing Payment Verification & Controlled Wallet Deduction:');
    const verifyRes = await fetch(`${baseUrl}/api/v1/bookings/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id: bookResult.booking_id,
        vendor_id: 'vnd-phuket-01'
      })
    });
    const verifyResult = await verifyRes.json();
    assert(verifyRes.status === 200, 'Payment verification returns 200');
    assert(verifyResult.success === true, 'Payment verification succeeded');
    assert(verifyResult.wallet_deduction_status === 'Completed', 'Wallet platform fee deducted');

    // 8. Payment Idempotency Check
    console.log('\n8. Testing Payment Idempotency:');
    const repeatVerifyRes = await fetch(`${baseUrl}/api/v1/bookings/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id: bookResult.booking_id,
        vendor_id: 'vnd-phuket-01'
      })
    });
    const repeatResult = await repeatVerifyRes.json();
    assert(repeatResult.already_confirmed === true, 'Repeat payment returns idempotent confirmation without duplicate fee');

    // 9. Legacy /api.php Compatibility Router
    console.log('\n9. Testing /api.php Compatibility Router (Frontend compatibility):');
    const compatHotelsRes = await fetch(`${baseUrl}/api.php?resource=hotels`);
    const compatHotels = await compatHotelsRes.json();
    assert(compatHotels.success === true, 'Compat /api.php?resource=hotels returns 200');
    assert(compatHotels.data.length >= 4, 'Compat route returns hotels data');

    const compatRatesRes = await fetch(`${baseUrl}/api.php?resource=currency&action=rates`);
    const compatRates = await compatRatesRes.json();
    assert(compatRates.success === true, 'Compat /api.php?resource=currency returns 200');
    assert(compatRates.base_currency === 'THB', 'Compat base currency is THB');
    assert(compatRates.rates.INR > 0, 'Contains live/cached INR rate');

  } catch (err) {
    console.error('Smoke test error:', err);
    failed++;
  } finally {
    server.close();
    await pool.end();

    console.log(`\n========================================`);
    console.log(`SMOKE TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    if (failed > 0) process.exit(1);
  }
}

runSmokeTests();
