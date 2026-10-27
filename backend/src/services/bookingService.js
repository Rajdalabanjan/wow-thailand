// ========================================================================
// WOW THAILAND: Transactional Booking Engine
// Multi-night row-level locking, anti-double-booking & QR vouchers
// ========================================================================

import { createCurrencySnapshot } from './currencyService.js';

/**
 * Generate a sequential date array between two dates [startDate, endDate)
 */
function getDatesInRange(startDateStr, endDateStr) {
  const dates = [];
  const current = new Date(startDateStr);
  const end = new Date(endDateStr);

  while (current < end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Create a new booking inside a transaction with multi-night room availability locking
 */
export async function createBookingTransaction(connection, payload) {
  // 1. Idempotency Check
  const idempotencyKey = (payload.idempotency_key || '').trim();
  if (idempotencyKey) {
    const [existing] = await connection.execute(
      'SELECT * FROM bookings WHERE idempotency_key = ? LIMIT 1',
      [idempotencyKey]
    );
    if (existing.length > 0) {
      return {
        success: true,
        idempotent: true,
        message: 'Booking retrieved via idempotency key.',
        booking_id: existing[0].id,
        booking: existing[0]
      };
    }
  }

  // 2. Validate Guest Details
  const customerName = (payload.customer_name || payload.name || 'Guest Customer').trim();
  const customerPhone = (payload.customer_phone || payload.phone || '+66 80 000 0000').trim();
  const customerEmail = (payload.customer_email || payload.email || '').trim().toLowerCase();
  const startDate = (payload.start_date || payload.pickup_date || payload.check_in_date || payload.date || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const endDate = (payload.end_date || payload.drop_date || payload.check_out_date || startDate).slice(0, 10);

  if (!customerName) {
    const err = new Error('Customer name is required.');
    err.statusCode = 400;
    throw err;
  }
  if (!startDate) {
    const err = new Error('Booking date is required.');
    err.statusCode = 400;
    throw err;
  }

  // 3. Multi-Night Availability Check for Hotel Bookings
  const items = payload.items || [];
  const roomTypeId = payload.room_type_id || (items.find(i => i.item_type === 'HOTEL')?.reference_id);
  const requestedRooms = parseInt(payload.quantity || payload.rooms || 1, 10);

  if (roomTypeId) {
    const nights = getDatesInRange(startDate, endDate);
    for (const night of nights) {
      // Row-level lock on each requested date
      const [rows] = await connection.execute(
        `SELECT available_rooms, is_blackout 
         FROM hotel_room_availability 
         WHERE room_type_id = ? AND calendar_date = ? 
         FOR UPDATE`,
        [roomTypeId, night]
      );

      if (rows.length === 0 || rows[0].available_rooms < requestedRooms || rows[0].is_blackout) {
        const err = new Error(`Rooms are unavailable for selected date: ${night}. Please select another date or room type.`);
        err.statusCode = 409;
        err.code = 'ROOM_UNAVAILABLE';
        throw err;
      }
    }

    // Atomic decrement for each night
    for (const night of nights) {
      await connection.execute(
        `UPDATE hotel_room_availability 
         SET available_rooms = available_rooms - ? 
         WHERE room_type_id = ? AND calendar_date = ?`,
        [requestedRooms, roomTypeId, night]
      );
    }
  }

  // 4. Calculate Base Amount & Currency Snapshot
  const baseAmountTHB = parseFloat(payload.base_amount_thb || payload.total_amount || 0.00);
  const customerCurrency = payload.customer_currency || 'THB';
  const currencySnapshot = createCurrencySnapshot(baseAmountTHB, customerCurrency);

  // 5. Generate Booking ID (PNR Format: TH-BKG-YYYYMMDD-XXXX)
  const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randTag = Math.floor(Math.random() * 9000 + 1000);
  const bookingId = `TH-BKG-${dateTag}-${randTag}`;

  // 6. Insert Booking Record (Status: Strictly PENDING / Awaiting Payment)
  await connection.execute(
    `INSERT INTO bookings (
      id, idempotency_key, user_id, customer_name, customer_phone, customer_email,
      start_date, end_date, vendor_id, base_amount_thb, platform_fee_thb,
      customer_currency, exchange_rate_applied, customer_total_amount,
      payment_status, payment_verification_status, wallet_deduction_status, booking_status, special_requests
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'Unverified', 'Pending', 'Awaiting Payment', ?)`,
    [
      bookingId,
      idempotencyKey || null,
      payload.user_id || null,
      customerName,
      customerPhone,
      customerEmail,
      startDate,
      endDate,
      payload.vendor_id || null,
      currencySnapshot.base_amount_thb,
      0.00,
      currencySnapshot.customer_currency,
      currencySnapshot.exchange_rate_applied,
      currencySnapshot.customer_total_amount,
      payload.special_requests || null
    ]
  );

  // 7. Insert Booking Items
  if (items.length > 0) {
    for (const item of items) {
      const itemId = `itm_${Date.now()}_${Math.floor(Math.random() * 900 + 100)}`;
      await connection.execute(
        `INSERT INTO booking_items (id, booking_id, item_type, reference_id, unit_price_thb, quantity, subtotal_thb, details_json) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itemId,
          bookingId,
          item.item_type || 'HOTEL',
          item.reference_id || 'general',
          parseFloat(item.unit_price_thb || 0.00),
          parseInt(item.quantity || 1, 10),
          parseFloat(item.subtotal_thb || 0.00),
          JSON.stringify(item.details || {})
        ]
      );
    }
  }

  // 8. Generate Printable Voucher & QR Payload
  const voucherCode = `VCH-${bookingId.replace('TH-BKG-', '')}`;
  const qrData = JSON.stringify({
    pnr: bookingId,
    voucher: voucherCode,
    name: customerName,
    dates: `${startDate} to ${endDate}`,
    currency: currencySnapshot.customer_currency,
    amount: currencySnapshot.customer_total_amount,
    status: 'Awaiting Payment'
  });

  await connection.execute(
    'INSERT INTO vouchers (id, booking_id, voucher_code, qr_payload) VALUES (?, ?, ?, ?)',
    [`vch_${Date.now()}`, bookingId, voucherCode, qrData]
  );

  return {
    success: true,
    booking_id: bookingId,
    voucher_code: voucherCode,
    status: 'Awaiting Payment',
    payment_status: 'PENDING',
    payment_verification_status: 'Unverified',
    currency_snapshot: currencySnapshot
  };
}

/**
 * Restore inventory when a hotel booking is cancelled
 */
export async function restoreBookingInventory(connection, bookingId) {
  const [items] = await connection.execute(
    `SELECT bi.*, b.start_date, b.end_date 
     FROM booking_items bi
     JOIN bookings b ON bi.booking_id = b.id
     WHERE bi.booking_id = ? AND bi.item_type = 'HOTEL'`,
    [bookingId]
  );

  for (const item of items) {
    const nights = getDatesInRange(item.start_date, item.end_date);
    for (const night of nights) {
      await connection.execute(
        `UPDATE hotel_room_availability 
         SET available_rooms = available_rooms + ? 
         WHERE room_type_id = ? AND calendar_date = ?`,
        [item.quantity, item.reference_id, night]
      );
    }
  }

  await connection.execute(
    `UPDATE bookings SET booking_status = 'Cancelled' WHERE id = ?`,
    [bookingId]
  );

  return { success: true, booking_id: bookingId, status: 'Cancelled' };
}
