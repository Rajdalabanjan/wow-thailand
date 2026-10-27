// ========================================================================
// WOW THAILAND: Hotel Controller
// ========================================================================

import { query } from '../config/db.js';

export async function getAllHotels(req, res, next) {
  try {
    const city = req.query.city;
    let sql = 'SELECT * FROM hotels WHERE is_published = 1';
    const params = [];

    if (city) {
      sql += ' AND city = ?';
      params.push(city);
    }
    sql += ' ORDER BY featured DESC, star_rating DESC, name ASC';

    const hotels = await query(sql, params);
    res.json({ success: true, data: hotels, count: hotels.length });
  } catch (err) {
    next(err);
  }
}

export async function getHotelById(req, res, next) {
  try {
    const { id } = req.params;
    const hotels = await query('SELECT * FROM hotels WHERE id = ?', [id]);
    if (hotels.length === 0) {
      return res.status(404).json({ success: false, error: 'Hotel not found.' });
    }

    const hotel = hotels[0];
    const roomTypes = await query('SELECT * FROM hotel_room_types WHERE hotel_id = ?', [id]);

    res.json({
      success: true,
      data: {
        ...hotel,
        room_types: roomTypes
      }
    });
  } catch (err) {
    next(err);
  }
}
