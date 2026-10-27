// ========================================================================
// WOW THAILAND: Tours & Activities Controller
// ========================================================================

import { query } from '../config/db.js';

export async function getAllTours(req, res, next) {
  try {
    const tours = await query('SELECT * FROM tours ORDER BY title ASC');
    res.json({ success: true, data: tours, count: tours.length });
  } catch (err) {
    next(err);
  }
}

export async function getAllActivities(req, res, next) {
  try {
    const activities = await query('SELECT * FROM activities ORDER BY title ASC');
    res.json({ success: true, data: activities, count: activities.length });
  } catch (err) {
    next(err);
  }
}
