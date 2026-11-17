// ========================================================================
// WOW THAILAND: Admin & Vendor Cab Dispatch Console Controller
// Fleet assignment, central dispatch monitoring & route pricing control
// ========================================================================

import { query, withTransaction } from '../config/db.js';
import { resolveVendorId } from '../utils/identityResolver.js';
import { broadcastEvent } from '../server.js';
import { queueRideNotification, RIDE_EVENTS } from '../services/rideNotificationService.js';
import {
  loadVehicle,
  getVehicleMismatchReason,
  findDriverScheduleConflict
} from '../services/cabMatchingService.js';

// A driver must be online to be given a ride that starts within this many minutes
const SOON_PICKUP_MINUTES = 60;

const ADMIN_ROLES = new Set(['admin', 'superadmin', 'super_admin', 'subadmin', 'sub_admin']);
const VENDOR_CAB_ROLES = new Set(['transfer_vendor', 'cab_vendor', 'vendor', 'vehicle_vendor', 'hotel_vendor']);

/**
 * GET /api/v1/admin/cab-dispatches
 * List all transfer dispatches with filtering
 */
export async function getAdminDispatches(req, res, next) {
  try {
    if (!req.user || (!ADMIN_ROLES.has(req.user.role) && !VENDOR_CAB_ROLES.has(req.user.role))) {
      return res.status(403).json({ success: false, error: 'Administrative or Vendor privileges required.' });
    }

    const { status, driver_id, vendor_id, date } = req.query;
    let sql = `
      SELECT d.*, 
             b.customer_name, b.customer_phone, b.customer_email, b.payment_status as booking_payment_status,
             drv.full_name as driver_name, drv.phone as driver_phone, drv.license_number as driver_license,
             drv.vehicle_model as driver_vehicle_model, drv.vehicle_plate as driver_vehicle_plate,
             drv.current_location as driver_current_location,
             (SELECT TIMESTAMPDIFF(SECOND, MAX(l.recorded_at), NOW())
                FROM taxi_driver_locations l WHERE l.driver_id = drv.id) as driver_location_age_sec,
             p.payment_method, p.payment_status as tx_payment_status
      FROM taxi_dispatches d
      JOIN bookings b ON d.booking_id = b.id
      LEFT JOIN drivers drv ON d.driver_id = drv.id
      LEFT JOIN taxi_payment_transactions p ON d.id = p.dispatch_id
    `;
    const params = [];
    const conditions = [];
    let viewerVendorId = null;

    // If vendor, restrict to their vendor_id
    if (!ADMIN_ROLES.has(req.user.role)) {
      const resolvedVendor = await resolveVendorId(req.user);
      viewerVendorId = resolvedVendor || null;
      conditions.push('d.vendor_id = ?');
      params.push(resolvedVendor || 'vnd-cabs-01');
    } else if (vendor_id) {
      conditions.push('d.vendor_id = ?');
      params.push(vendor_id);
    }

    if (status) {
      conditions.push('d.ride_status = ?');
      params.push(status);
    }
    if (driver_id) {
      conditions.push('d.driver_id = ?');
      params.push(driver_id);
    }
    if (date) {
      conditions.push('DATE(d.pickup_datetime) = ?');
      params.push(date);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY d.pickup_datetime DESC LIMIT 100';

    const dispatches = await query(sql, params);
    // Sanitize OTP hashes
    const sanitized = dispatches.map(d => {
      const { ride_otp_hash, ride_otp_encrypted, ...rest } = d;
      return rest;
    });

    res.json({
      success: true,
      data: sanitized,
      // Lets the vendor screen join its own live-update room (vendor_<id>)
      viewer_vendor_id: viewerVendorId
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/admin/cab-assign-driver
 * Admin or authorized vendor assigns / reassigns a driver to a dispatch
 */
export async function assignDriver(req, res, next) {
  try {
    if (!req.user || (!ADMIN_ROLES.has(req.user.role) && !VENDOR_CAB_ROLES.has(req.user.role))) {
      return res.status(403).json({ success: false, error: 'Staff or Vendor authorization required.' });
    }

    const { dispatch_id, driver_id } = req.body;
    if (!dispatch_id || !driver_id) {
      return res.status(400).json({ success: false, error: 'dispatch_id and driver_id are required.' });
    }

    // Verify driver exists
    const drivers = await query('SELECT * FROM drivers WHERE id = ? LIMIT 1', [driver_id]);
    if (drivers.length === 0) {
      return res.status(404).json({ success: false, error: 'Driver not found.' });
    }
    const drv = drivers[0];

    // Verify dispatch exists (minutes_until_pickup is computed by MySQL so it uses the same clock as pickup_datetime)
    const dispatches = await query(
      'SELECT *, TIMESTAMPDIFF(MINUTE, NOW(), pickup_datetime) AS minutes_until_pickup FROM taxi_dispatches WHERE id = ? LIMIT 1',
      [dispatch_id]
    );
    if (dispatches.length === 0) {
      return res.status(404).json({ success: false, error: 'Transfer dispatch not found.' });
    }
    const dispatch = dispatches[0];

    // Vendor ownership enforcement
    if (!ADMIN_ROLES.has(req.user.role)) {
      const resolvedVendor = await resolveVendorId(req.user);
      if (dispatch.vendor_id && String(dispatch.vendor_id) !== String(resolvedVendor)) {
        return res.status(403).json({ success: false, error: 'Access denied: You cannot assign drivers to another vendor\'s transfer duty.' });
      }
      if (drv.vendor_id && String(drv.vendor_id) !== String(resolvedVendor)) {
        return res.status(403).json({ success: false, error: 'Access denied: You cannot assign another vendor\'s driver.' });
      }
    }

    // Cannot reassign completed or cancelled trips
    if (['COMPLETED', 'CANCELLED'].includes(dispatch.ride_status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot reassign a trip that is already ${dispatch.ride_status}.`
      });
    }

    // Trips already under way cannot be handed to another driver
    if (['ARRIVED', 'ON_TRIP'].includes(dispatch.ride_status) && String(dispatch.driver_id) !== String(driver_id)) {
      return res.status(400).json({
        success: false,
        error: `Cannot reassign a trip that is already ${dispatch.ride_status}.`
      });
    }

    // The driver's active vehicle must be approved and big enough for this group
    const vehicle = await loadVehicle(query, drv.active_vehicle_id);
    const mismatch = getVehicleMismatchReason(vehicle, dispatch);
    if (mismatch) {
      return res.status(400).json({ success: false, error: mismatch });
    }

    // An offline driver cannot be given a ride that starts soon
    const startsSoon = Number(dispatch.minutes_until_pickup) < SOON_PICKUP_MINUTES;
    if (startsSoon && drv.status === 'offline') {
      return res.status(400).json({
        success: false,
        error: `${drv.full_name} is offline. Choose an online driver for a pickup within the next ${SOON_PICKUP_MINUTES} minutes.`
      });
    }

    // The driver must not already have a trip at the same time
    const conflict = await findDriverScheduleConflict(query, driver_id, dispatch.id);
    if (conflict) {
      return res.status(409).json({
        success: false,
        error: `${drv.full_name} already has trip ${conflict.id} at that time.`
      });
    }

    // When admin hands the job to another vendor's driver, that vendor now owns the job
    const nextVendorId = drv.vendor_id || dispatch.vendor_id;
    const nextStatus = dispatch.ride_status === 'ALLOCATED' ? 'DISPATCHED' : dispatch.ride_status;

    await withTransaction(async (conn) => {
      await conn.execute(
        `UPDATE taxi_dispatches
         SET driver_id = ?, vendor_id = ?, vehicle_id = ?, vehicle_model = ?, vehicle_plate = ?, ride_status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [driver_id, nextVendorId, vehicle.id, `${vehicle.brand} ${vehicle.model}`, vehicle.plate_number, nextStatus, dispatch_id]
      );
      if (nextVendorId !== dispatch.vendor_id) {
        await conn.execute('UPDATE bookings SET vendor_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [nextVendorId, dispatch.booking_id]);
      }

      // Keep legacy driver_assignments in sync
      await conn.execute(
        `INSERT INTO driver_assignments (id, booking_id, driver_id, pickup_time, status)
         VALUES (?, ?, ?, ?, 'ASSIGNED')
         ON DUPLICATE KEY UPDATE driver_id = VALUES(driver_id), status = 'ASSIGNED'`,
        [`da_${dispatch_id}`, dispatch.booking_id, driver_id, dispatch.pickup_datetime]
      );

      // Log event
      await conn.execute(
        `INSERT INTO taxi_dispatch_events (
          id, dispatch_id, event_type, old_status, new_status, actor_type, actor_id, metadata_json
        ) VALUES (?, ?, 'ADMIN_ASSIGNED', ?, ?, ?, ?, ?)`,
        [
          `evt_${Date.now()}_asgn`,
          dispatch_id,
          dispatch.ride_status,
          nextStatus,
          ADMIN_ROLES.has(req.user.role) ? 'ADMIN' : 'VENDOR',
          req.user.id,
          JSON.stringify({ driver_id, driver_name: drv.full_name, vehicle_id: vehicle.id, vendor_id: nextVendorId })
        ]
      );
    });

    const vehicleModel = `${vehicle.brand} ${vehicle.model}`;

    // Notify driver, vendor, admin and the customer's tracking room
    broadcastEvent(`driver_${driver_id}`, 'NEW_DUTY_ASSIGNED', {
      dispatch_id,
      pickup_address: dispatch.pickup_address,
      dropoff_address: dispatch.dropoff_address,
      pickup_datetime: dispatch.pickup_datetime,
      passenger_count: dispatch.passenger_count,
      luggage_count: dispatch.luggage_count
    });
    const assignedSummary = { dispatch_id, driver_id, driver_name: drv.full_name, ride_status: nextStatus };
    broadcastEvent(`vendor_${nextVendorId}`, 'CAB_DRIVER_ASSIGNED', assignedSummary);
    broadcastEvent('admin', 'CAB_DRIVER_ASSIGNED', { ...assignedSummary, vendor_id: nextVendorId });
    broadcastEvent(`dispatch_${dispatch_id}`, 'DRIVER_ASSIGNED', {
      dispatch_id,
      driver_name: drv.full_name,
      driver_phone: drv.phone,
      vehicle_model: vehicleModel,
      vehicle_plate: vehicle.plate_number,
      ride_status: nextStatus
    });

    // Tell the customer who is coming (skip if the same driver was simply re-saved)
    if (String(dispatch.driver_id || '') !== String(driver_id)) {
      queueRideNotification(dispatch_id, RIDE_EVENTS.DRIVER_ASSIGNED, { reassigned: Boolean(dispatch.driver_id) });
    }

    res.json({
      success: true,
      message: `Driver ${drv.full_name} assigned successfully with ${vehicleModel} (${vehicle.plate_number}).`,
      ride_status: nextStatus,
      vendor_id: nextVendorId,
      vehicle_id: vehicle.id
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/admin/cab-pricing
 * Admin updates vehicle tier pricing parameters
 */
export async function updateCabPricing(req, res, next) {
  try {
    if (!req.user || !ADMIN_ROLES.has(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Administrator access required.' });
    }

    let cat = req.body.vehicle_category;
    if (!cat && req.body.tier_id) {
      const lower = String(req.body.tier_id).toLowerCase();
      if (lower.includes('sedan')) cat = 'SEDAN';
      else if (lower.includes('suv')) cat = 'SUV';
      else if (lower.includes('van')) cat = 'VIP_VAN';
    }

    const { base_fare_thb, per_km_rate_thb, minimum_fare_thb } = req.body;
    if (!cat) {
      return res.status(400).json({ success: false, error: 'vehicle_category or valid tier_id is required.' });
    }

    const baseFare = parseFloat(base_fare_thb);
    const perKm = parseFloat(per_km_rate_thb);
    const minFare = parseFloat(minimum_fare_thb);

    if (isNaN(baseFare) || isNaN(perKm) || isNaN(minFare)) {
      return res.status(400).json({ success: false, error: 'Numeric pricing values are required.' });
    }

    await query(
      `UPDATE transfer_tier_pricing 
       SET base_fare_thb = ?, per_km_rate_thb = ?, minimum_fare_thb = ?, updated_at = CURRENT_TIMESTAMP
       WHERE vehicle_category = ?`,
      [baseFare, perKm, minFare, cat.toUpperCase()]
    );

    const updated = await query(
      'SELECT * FROM transfer_tier_pricing WHERE vehicle_category = ?',
      [cat.toUpperCase()]
    );

    res.json({
      success: true,
      message: `Pricing for ${cat} updated successfully.`,
      data: updated[0]
    });
  } catch (err) {
    next(err);
  }
}

