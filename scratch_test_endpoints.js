import mysql from 'mysql2/promise';

async function runTests() {
  console.log('=== REAL API & DATABASE VERIFICATION TEST ===\n');

  // 1. Database Connection & Config
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'NewPassword@123',
    database: 'wow_thailand'
  });

  const [dbName] = await pool.query('SELECT DATABASE() AS db, VERSION() AS ver');
  console.log(`[DB CHECK] Connected to ${dbName[0].db} (${dbName[0].ver})`);

  // 2. Test Customer Booking Endpoint (Hotel Booking)
  console.log('\n--- 1. Testing Customer Hotel Booking ---');
  const hotelPayload = {
    customer_name: 'Test Customer Thailand',
    customer_phone: '+66 81 234 5678',
    customer_email: 'test.thailand.guest@example.com',
    start_date: '2026-11-01',
    end_date: '2026-11-04',
    base_amount_thb: 9500.00,
    items: [
      {
        item_type: 'HOTEL',
        reference_id: 'th-htl-01',
        unit_price_thb: 9500.00,
        quantity: 1,
        details_json: JSON.stringify({ hotel_name: 'The Shore at Katathani', room_type: 'Pool Villa' })
      }
    ]
  };

  const hotelRes = await fetch('http://localhost:5000/api.php?resource=bookings&action=create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(hotelPayload)
  });
  const hotelData = await hotelRes.json();
  console.log(`Customer Hotel Booking Status: ${hotelRes.status}`, hotelData);

  const customerBookingId = hotelData.booking_id || hotelData.data?.id;
  if (customerBookingId) {
    const [dbRows] = await pool.query('SELECT id, customer_name, customer_phone, base_amount_thb, booking_status FROM bookings WHERE id = ?', [customerBookingId]);
    console.log(`[PERSISTENCE VERIFICATION] Customer booking in MySQL:`, dbRows[0]);
  }

  // 3. Test B2B Booking Endpoint
  console.log('\n--- 2. Testing B2B Booking ---');
  const b2bPayload = {
    b2b_partner_id: 'usr-b2b-01',
    b2b_mode: 'COMMISSION',
    service_type: 'CAB',
    item_id: 'veh-th-01-altis',
    item_name: 'Toyota Altis Chauffeur Cab',
    qty: 3,
    pickup_date: '2026-11-10',
    drop_date: '2026-11-13',
    guest_name: 'Khun Somchai B2B',
    guest_phone: '+66 89 765 4321',
    guest_email: 'somchai@b2bclient.th',
    payment_method: 'Prepaid Agent Wallet',
    extra_details: {
      total_amount: 3600.00,
      special_requests: 'BKK Airport Meet & Greet'
    }
  };

  const b2bRes = await fetch('http://localhost:5000/api.php?action=b2b_book', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(b2bPayload)
  });
  const b2bData = await b2bRes.json();
  console.log(`B2B Booking Status: ${b2bRes.status}`, b2bData);

  const b2bBookingId = b2bData.booking_id;
  if (b2bBookingId) {
    const [b2bDbRows] = await pool.query('SELECT id, customer_name, customer_phone, base_amount_thb, booking_status FROM bookings WHERE id = ?', [b2bBookingId]);
    console.log(`[PERSISTENCE VERIFICATION] B2B booking in MySQL:`, b2bDbRows[0]);
    const [b2bItems] = await pool.query('SELECT id, booking_id, item_type, reference_id, subtotal_thb FROM booking_items WHERE booking_id = ?', [b2bBookingId]);
    console.log(`[PERSISTENCE VERIFICATION] B2B booking_items in MySQL:`, b2bItems[0]);
  }

  // 4. Test Role-Based Authentication & Permissions
  console.log('\n--- 3. Testing Role Authentication & Accounts ---');
  const testAccounts = [
    { username: 'superadmin', label: 'SuperAdmin' },
    { username: 'admin', label: 'Admin' },
    { username: 'rakhi', label: 'Vendor (Cab/Transfer)' },
    { username: 'ashwini', label: 'Vendor (Hotel/Transfer)' }
  ];

  for (const acc of testAccounts) {
    const [user] = await pool.query('SELECT id, username, email, role, status FROM users WHERE username = ? LIMIT 1', [acc.username]);
    if (user.length > 0) {
      console.log(`✓ ${acc.label} (${acc.username}): ID=${user[0].id}, Role=${user[0].role}, Status=${user[0].status}`);
    } else {
      console.log(`✗ ${acc.label} (${acc.username}): Not found in DB`);
    }
  }

  // 5. Test Platform Fee & Wallet Balance
  console.log('\n--- 4. Testing Platform Fee & Wallet Balance Logic ---');
  const [walletRows] = await pool.query('SELECT vendor_id, balance_thb, is_locked FROM vendor_wallets LIMIT 3');
  console.log('Sample Vendor Wallets in MySQL:', walletRows);

  const [recentBookings] = await pool.query('SELECT id, customer_total_amount, platform_fee_thb, booking_status FROM bookings ORDER BY created_at DESC LIMIT 3');
  console.log('Recent Bookings Platform Fee Snapshot:', recentBookings);

  await pool.end();
  console.log('\n=== VERIFICATION COMPLETE ===');
}

runTests().catch(console.error);
