// ========================================================================
// WOW THAILAND: Booking Controller
// Transactional checkout, idempotent payment confirmation & vouchers
// ========================================================================

import { withTransaction, query } from '../config/db.js';
import { createBookingTransaction, restoreBookingInventory } from '../services/bookingService.js';
import { confirmBookingAndDeductPlatformFee } from '../services/walletService.js';
import { sendBookingVoucherEmail } from '../services/emailService.js';
import { isBookingOwnerOrStaff, resolveVendorId } from '../utils/identityResolver.js';

const STAFF_PRICING_ROLES = [
  'admin', 'superadmin', 'subadmin', 'sub_admin', 'super_admin',
  'hotel_vendor', 'transfer_vendor', 'tour_vendor', 'flight_vendor', 'vendor'
];

export async function createBooking(req, res, next) {
  try {
    const payload = req.body;
    // Staff and vendors may enter manual/negotiated prices; customer checkouts are price-checked.
    const trustedPricing = Boolean(req.user && STAFF_PRICING_ROLES.includes(req.user.role));
    const result = await withTransaction(async (conn) => {
      return await createBookingTransaction(conn, payload, { trustedPricing });
    });

    // Asynchronously trigger voucher email dispatch without blocking the response
    if (result && result.booking_id) {
      sendBookingVoucherEmail({ ...payload, id: result.booking_id }, result.voucher_code).catch(err => {
        console.warn('[Notification] Background voucher email error:', err.message);
      });
    }

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function verifyPayment(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { booking_id } = req.body;
    if (!booking_id) {
      return res.status(400).json({ success: false, error: 'booking_id is required.' });
    }

    const bookings = await query('SELECT * FROM bookings WHERE id = ?', [booking_id]);
    if (bookings.length === 0) {
      return res.status(404).json({ success: false, error: 'Booking not found.' });
    }
    const booking = bookings[0];

    // Server-side authoritative vendor resolution
    const resolvedVendorId = await resolveVendorId(req.user);
    if (resolvedVendorId && String(booking.vendor_id) !== String(resolvedVendorId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Vendors can only verify payments for their own bookings.'
      });
    }

    const effectiveVendorId = resolvedVendorId || booking.vendor_id || req.body.vendor_id;
    const result = await withTransaction(async (conn) => {
      return await confirmBookingAndDeductPlatformFee(conn, booking_id, effectiveVendorId);
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getBookingById(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required to access booking details.'
      });
    }

    const { id } = req.params;
    const bookings = await query('SELECT * FROM bookings WHERE id = ?', [id]);
    if (bookings.length === 0) {
      return res.status(404).json({ success: false, error: 'Booking not found.' });
    }

    const bookingRecord = { ...bookings[0] };
    const isAuthorized = await isBookingOwnerOrStaff(bookingRecord, req.user);
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You are not authorized to view this booking.'
      });
    }

    const items = await query('SELECT * FROM booking_items WHERE booking_id = ?', [id]);
    const vouchers = await query('SELECT * FROM vouchers WHERE booking_id = ?', [id]);
    let hotelName = '';
    let roomTypeName = '';
    let location = '';

    if (items.length > 0 && items[0].item_type === 'HOTEL' && items[0].reference_id) {
      const roomTypes = await query('SELECT * FROM hotel_room_types WHERE id = ?', [items[0].reference_id]);
      if (roomTypes.length > 0) {
        roomTypeName = roomTypes[0].name;
        const hotels = await query('SELECT * FROM hotels WHERE id = ?', [roomTypes[0].hotel_id]);
        if (hotels.length > 0) {
          hotelName = hotels[0].name;
          location = `${hotels[0].area || ''}, ${hotels[0].city || 'Thailand'}`.trim().replace(/^,\s*/, '');
        }
      }
    }

    const enriched = {
      ...bookingRecord,
      name: bookingRecord.customer_name,
      phone: bookingRecord.customer_phone,
      email: bookingRecord.customer_email,
      hotel_name: hotelName || bookingRecord.hotel_name || 'Thailand Travel Reservation',
      item_name: hotelName || bookingRecord.item_name || 'Thailand Travel Reservation',
      room_type: roomTypeName,
      location: location,
      total_amount: bookingRecord.base_amount_thb || bookingRecord.customer_total_amount,
      total_paid: bookingRecord.payment_amount || 0,
      voucher_code: vouchers[0]?.voucher_code || `VCH-${id}`,
      items,
      voucher: vouchers[0] || null
    };

    res.json({
      success: true,
      data: enriched
    });
  } catch (err) {
    next(err);
  }
}

export async function cancelBooking(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { id } = req.params;
    const bookings = await query('SELECT * FROM bookings WHERE id = ?', [id]);
    if (bookings.length === 0) {
      return res.status(404).json({ success: false, error: 'Booking not found.' });
    }

    const isAuthorized = await isBookingOwnerOrStaff(bookings[0], req.user);
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You are not authorized to cancel this booking.'
      });
    }

    const result = await withTransaction(async (conn) => {
      return await restoreBookingInventory(conn, id);
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}
