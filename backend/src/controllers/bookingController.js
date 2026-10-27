// ========================================================================
// WOW THAILAND: Booking Controller
// Transactional checkout, idempotent payment confirmation & vouchers
// ========================================================================

import { withTransaction, query } from '../config/db.js';
import { createBookingTransaction, restoreBookingInventory } from '../services/bookingService.js';
import { confirmBookingAndDeductPlatformFee } from '../services/walletService.js';

export async function createBooking(req, res, next) {
  try {
    const payload = req.body;
    const result = await withTransaction(async (conn) => {
      return await createBookingTransaction(conn, payload);
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function verifyPayment(req, res, next) {
  try {
    const { booking_id, vendor_id } = req.body;
    if (!booking_id) {
      return res.status(400).json({ success: false, error: 'booking_id is required.' });
    }

    const result = await withTransaction(async (conn) => {
      return await confirmBookingAndDeductPlatformFee(conn, booking_id, vendor_id);
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getBookingById(req, res, next) {
  try {
    const { id } = req.params;
    const bookings = await query('SELECT * FROM bookings WHERE id = ?', [id]);
    if (bookings.length === 0) {
      return res.status(404).json({ success: false, error: 'Booking not found.' });
    }

    const items = await query('SELECT * FROM booking_items WHERE booking_id = ?', [id]);
    const vouchers = await query('SELECT * FROM vouchers WHERE booking_id = ?', [id]);

    res.json({
      success: true,
      data: {
        ...bookings[0],
        items,
        voucher: vouchers[0] || null
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function cancelBooking(req, res, next) {
  try {
    const { id } = req.params;
    const result = await withTransaction(async (conn) => {
      return await restoreBookingInventory(conn, id);
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}
