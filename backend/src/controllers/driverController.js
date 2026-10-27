// ========================================================================
// WOW THAILAND: Driver Portal Controller (Airport Transfers)
// ========================================================================

import { query } from '../config/db.js';

export async function getDriverJobs(req, res, next) {
  try {
    const driverId = req.user?.id || req.query.driver_id || 'drv-bkk-01';

    const jobs = await query(
      `SELECT da.*, b.customer_name, b.customer_phone, b.start_date, b.special_requests,
              r.route_name, r.origin_name, r.destination_name
       FROM driver_assignments da
       JOIN bookings b ON da.booking_id = b.id
       LEFT JOIN booking_items bi ON b.id = bi.booking_id AND bi.item_type = 'TRANSFER'
       LEFT JOIN transfer_vehicle_pricing vp ON bi.reference_id = vp.id
       LEFT JOIN transfer_routes r ON vp.route_id = r.id
       WHERE da.driver_id = ?
       ORDER BY da.pickup_time ASC`,
      [driverId]
    );

    res.json({ success: true, data: jobs });
  } catch (err) {
    next(err);
  }
}

export async function updateJobStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['ASSIGNED', 'ACCEPTED', 'ON_WAY', 'COMPLETED', 'CANCELLED'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status.' });
    }

    await query('UPDATE driver_assignments SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, message: `Job status updated to ${status}.` });
  } catch (err) {
    next(err);
  }
}

export async function getDriverProfile(req, res, next) {
  try {
    const driverId = req.query.id || req.query.driver_id || req.user?.id || 'usr-driver-somchai';
    const drivers = await query(
      `SELECT d.*, u.username, u.email, u.phone as user_phone
       FROM drivers d
       LEFT JOIN users u ON d.user_id = u.id
       WHERE d.id = ? OR d.user_id = ? LIMIT 1`,
      [driverId, driverId]
    );
    if (drivers.length === 0) {
      return res.status(404).json({ success: false, error: 'Driver not found.' });
    }
    const d = drivers[0];
    res.json({
      success: true,
      data: {
        id: d.id,
        user_id: d.user_id,
        name: d.full_name || 'Somchai Prasert',
        phone: d.phone || d.user_phone,
        license_number: d.license_number,
        vehicle_model: d.vehicle_model,
        vehicle_plate: d.vehicle_plate,
        status: d.status,
        current_location: d.current_location
      }
    });
  } catch (err) {
    next(err);
  }
}

