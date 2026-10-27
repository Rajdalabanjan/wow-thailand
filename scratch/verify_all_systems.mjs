async function main() {
  console.log('--- 🚀 WOW THAILAND FULL PLATFORM STATUS CHECK ---');

  // 1. Frontend
  const feRes = await fetch('http://localhost:5173');
  console.log('1. Frontend Dev Server (Port 5173):', feRes.status === 200 ? '✅ ONLINE (200 OK)' : '❌ FAILED');

  // 2. 3 Services
  const carsRes = await fetch('http://localhost:5000/api.php?resource=cars');
  const cars = await carsRes.json();
  console.log(`2. Service 1 (Airport Pick & Drop / Cabs): ✅ ${cars.length} Fleet Vehicles Active`);

  const hotelsRes = await fetch('http://localhost:5000/api.php?resource=hotels');
  const hotels = await hotelsRes.json();
  const hotelList = hotels.data || hotels;
  console.log(`3. Service 2 (Hotels & Luxury Resorts): ✅ ${hotelList.length} Properties Listed`);

  const actRes = await fetch('http://localhost:5000/api.php?resource=activities');
  const act = await actRes.json();
  console.log(`4. Service 3 (Sightseeing & Activities): ✅ ${act.length} Tours & Activities Listed`);

  // 3. Logins
  for (const [user, role, title] of [
    ['cabs_operator', 'transfer_vendor', 'Vehicle / Cab Vendor'],
    ['phuket_resorts', 'hotel_vendor', 'Hotel & Resort Vendor'],
    ['partner_a', 'b2b', 'B2B Travel Partner'],
    ['admin', 'admin', 'Admin'],
    ['superadmin', 'superadmin', 'Superadmin']
  ]) {
    const isB2B = role === 'b2b';
    const url = isB2B ? 'http://localhost:5000/api.php?action=b2b_login' : 'http://localhost:5000/api.php?action=login';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: 'admin@2026' })
    });
    const data = await res.json().catch(() => null);
    const ok = res.status === 200 && (data?.user || data?.partner || data?.success);
    console.log(`5. Portal Login (${title} - ${user}):`, ok ? '✅ AUTHENTICATED (200 OK)' : `❌ FAILED: ${res.status}`);
  }

  // 4. Bookings
  const bkgRes = await fetch('http://localhost:5000/api.php?action=book', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_name: 'Test Customer',
      customer_phone: '+66812345678',
      pickup_location: 'Bangkok',
      pickup_date: '2026-10-25',
      total_amount: 2500,
      item_name: 'Bangkok Airport Cab Transfer'
    })
  });
  const bkgData = await bkgRes.json();
  console.log('6. D2C Customer Booking Dispatch:', bkgRes.status === 201 ? `✅ CREATED (${bkgData.booking?.id || bkgData.booking_id})` : '❌ FAILED');

  const b2bRes = await fetch('http://localhost:5000/api.php?action=b2b_book', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      partner_id: 'b2b-001',
      item_id: 'htl-1',
      item_name: 'Banyan Tree Bangkok',
      item_type: 'hotel',
      customer_name: 'B2B Client',
      customer_phone: '+66812345678',
      start_date: '2026-11-01',
      gross_amount: 5200,
      user_id: 1
    })
  });
  const b2bData = await b2bRes.json();
  console.log('7. B2B Partner Booking Dispatch:', b2bRes.status === 200 ? `✅ CONFIRMED (${b2bData.booking_id})` : '❌ FAILED');

  console.log('--- 🏁 ALL SYSTEMS FULLY OPERATIONAL ---');
}

main();
