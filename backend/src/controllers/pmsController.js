// ========================================================================
// WOW THAILAND: Hotel PMS Controller
// ========================================================================

import { query } from '../config/db.js';

export async function getPMSDashboard(req, res, next) {
  try {
    const vendorId = req.user?.id || req.query.vendor_id;
    const hotels = await query('SELECT * FROM hotels WHERE vendor_id = ? OR 1=1 LIMIT 1', [vendorId]);
    const hotel = hotels[0] || null;

    if (!hotel) {
      return res.json({ success: true, data: { stats: {}, recent_bookings: [] } });
    }

    const roomTypes = await query('SELECT * FROM hotel_room_types WHERE hotel_id = ?', [hotel.id]);
    const recentBookings = await query(
      `SELECT b.*, bi.item_type, bi.unit_price_thb 
       FROM bookings b
       JOIN booking_items bi ON b.id = bi.booking_id
       WHERE bi.reference_id IN (SELECT id FROM hotel_room_types WHERE hotel_id = ?)
       ORDER BY b.created_at DESC LIMIT 10`,
      [hotel.id]
    );

    res.json({
      success: true,
      data: {
        hotel,
        room_types: roomTypes,
        recent_bookings: recentBookings
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getRoomTypes(req, res, next) {
  try {
    const hotelId = req.query.hotel_id;
    let sql = 'SELECT * FROM hotel_room_types';
    const params = [];
    if (hotelId) {
      sql += ' WHERE hotel_id = ?';
      params.push(hotelId);
    }
    const types = await query(sql, params);
    res.json({ success: true, data: types });
  } catch (err) {
    next(err);
  }
}

export async function getAvailabilityCalendar(req, res, next) {
  try {
    const { room_type_id, start_date, end_date } = req.query;
    let sql = 'SELECT * FROM hotel_room_availability WHERE 1=1';
    const params = [];

    if (room_type_id) {
      sql += ' AND room_type_id = ?';
      params.push(room_type_id);
    }
    if (start_date) {
      sql += ' AND calendar_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND calendar_date <= ?';
      params.push(end_date);
    }
    sql += ' ORDER BY calendar_date ASC';

    const calendar = await query(sql, params);
    res.json({ success: true, data: calendar });
  } catch (err) {
    next(err);
  }
}
