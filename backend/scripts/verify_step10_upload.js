// ========================================================================
// WOW THAILAND: Step 10 Hotel Registration & Upload Verification Script
// ========================================================================

import pool from '../src/config/db.js';

async function main() {
  const baseUrl = 'http://localhost:5000';
  console.log('Testing Hotel Upload & Registration at ' + baseUrl + '...');

  // 1. Test multipart image upload
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const fakeImageBytes = Buffer.alloc(150 * 1024, 0x58); // 150KB simulated JPEG
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="resort_view.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
    fakeImageBytes,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);

  const uploadRes = await fetch(`${baseUrl}/api.php?action=upload_image`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body: body
  });
  const uploadJson = await uploadRes.json();
  console.log('1. Upload image response:', uploadRes.status, uploadJson);

  if (!uploadJson.success || !uploadJson.url) {
    throw new Error('Image upload failed: ' + JSON.stringify(uploadJson));
  }

  // Verify static serving of uploaded image
  const staticRes = await fetch(`${baseUrl}${uploadJson.url}`);
  console.log('2. Static file fetch response:', staticRes.status, staticRes.headers.get('content-type'));
  if (staticRes.status !== 200) {
    throw new Error('Static upload file could not be fetched');
  }

  // 2. Test registration with add_master_hotel containing both URL and raw Base64 (sanitization test)
  const testHotelId = 'test-htl-' + Date.now();
  const hotelPayload = {
    id: testHotelId,
    vendor_id: 'vnd-phuket-01',
    name: 'Verification Sunset Luxury Resort',
    property_type: 'Resort',
    star_rating: 5,
    destination: 'Phuket',
    city: 'Phuket',
    country: 'Thailand',
    address: '123 Kata Noi Beach Road',
    contact_email: 'sunset@resort-phuket.com',
    contact_phone: '+66 76 123 4567',
    images: [
      uploadJson.url,
      'data:image/jpeg;base64,' + Buffer.from('simulated inline base64 image data').toString('base64')
    ],
    documents: {
      trade_license: 'data:application/pdf;base64,' + Buffer.from('simulated inline pdf data').toString('base64'),
      tax_certificate: uploadJson.url
    },
    rooms: [
      {
        room_name: 'Sunset Ocean View Deluxe',
        room_type: 'Deluxe',
        base_rate_thb: 4500,
        max_adults: 2,
        max_children: 1,
        total_inventory: 10
      }
    ]
  };

  const regRes = await fetch(`${baseUrl}/api.php?action=add_master_hotel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(hotelPayload)
  });
  const regJson = await regRes.json();
  console.log('3. Add master hotel response:', regRes.status, regJson);

  // 3. Check MySQL to confirm sanitization and row persistence
  const [rows] = await pool.execute('SELECT id, name, images_json FROM hotels WHERE id = ?', [testHotelId]);
  console.log('4. MySQL query result:', rows);

  if (rows.length === 0) {
    throw new Error('Hotel record was not found in MySQL database');
  }

  const storedImages = typeof rows[0].images_json === 'string' ? JSON.parse(rows[0].images_json) : rows[0].images_json;
  console.log('5. Stored images:', storedImages);

  // Verify none of the stored strings start with data:image
  const hasBase64Image = (storedImages || []).some(img => typeof img === 'string' && img.startsWith('data:'));

  console.log('6. Base64 in DB images:', hasBase64Image ? 'FAILED (Base64 leaked)' : 'CLEAN (Sanitized to /uploads URL)');
  if (hasBase64Image) {
    throw new Error('Base64 image leaked into database!');
  }

  // Clean up test hotel
  await pool.execute('DELETE FROM hotel_room_types WHERE hotel_id = ?', [testHotelId]);
  await pool.execute('DELETE FROM hotels WHERE id = ?', [testHotelId]);
  console.log('9. Cleaned up test hotel record.');

  console.log('\n✅ STEP 10 VERIFICATION PASSED SUCCESSFULLY!');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Step 10 Verification Failed:', err);
  process.exit(1);
});
