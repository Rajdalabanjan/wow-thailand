// ========================================================================
// WOW THAILAND: B2B Agent Controller
// ========================================================================

import { query } from '../config/db.js';

export async function getB2BDashboard(req, res, next) {
  try {
    const partnerId = req.user?.id || req.query.partner_id || 'b2b-default';

    const recentBookings = await query(
      'SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
      [partnerId]
    );

    res.json({
      success: true,
      data: {
        partner_id: partnerId,
        recent_bookings: recentBookings
      }
    });
  } catch (err) {
    next(err);
  }
}
