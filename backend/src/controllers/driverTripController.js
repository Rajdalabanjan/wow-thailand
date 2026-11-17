// ========================================================================
// WOW THAILAND: Driver Chauffeur Companion Trip Controller
// Duty acceptance, 6-state ride lifecycle, 4-digit OTP verification & GPS
// ========================================================================

import { query, withTransaction } from '../config/db.js';
import { resolveDriverId } from '../utils/identityResolver.js';
import { hashOtp } from '../utils/cryptoHelper.js';
import { broadcastEvent } from '../server.js';
import { queueRideNotification, RIDE_EVENTS } from '../services/rideNotificationService.js';
import {
  loadVehicle,
  categoriesServedBy,
  getVehicleMismatchReason,
  findDriverScheduleConflict
} from '../services/cabMatchingService.js';

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * Why a driver cannot receive new (unassigned) job offers right now, or null if they can.
 */
function getOfferBlockReason(drv, vehicle) {
  if (!drv.vendor_id) return 'Your account is not linked to a taxi company yet.';
  if (drv.status === 'offline') return 'You are offline. Go online to receive new jobs.';
  if (!vehicle) return 'Select your active vehicle to receive new jobs.';
  if (vehicle.verification_status !== 'APPROVED') return 'Your active vehicle is waiting for admin approval.';
  if (!vehicle.is_available || vehicle.is_maintenance) return 'Your active vehicle is marked unavailable or under maintenance.';
  return null;
}

/**
 * GET /api/v1/driver/active-duty
 * Fetch the current in-progress duty for the authenticated driver
 */
export async function getActiveDuty(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const driverId = await resolveDriverId(req.user);
    if (!driverId) {
      return res.status(403).json({ success: false, error: 'Driver account required.' });
    }

    const duties = await query(
      `SELECT d.*, 
              b.customer_name, b.customer_phone, b.customer_email, b.customer_currency,
              b.customer_total_amount, b.payment_status as booking_payment_status,
              p.payment_method, p.payment_status as tx_payment_status
       FROM taxi_dispatches d
       JOIN bookings b ON d.booking_id = b.id
       LEFT JOIN taxi_payment_transactions p ON d.id = p.dispatch_id
       WHERE d.driver_id = ? AND d.ride_status IN ('DISPATCHED', 'ARRIVED', 'ON_TRIP')
       ORDER BY d.pickup_datetime ASC LIMIT 1`,
      [driverId]
    );

    if (duties.length === 0) {
      return res.json({ success: true, active_duty: null });
    }

    const duty = duties[0];
    // Driver NEVER sees the customer's ride_otp_hash or plain OTP!
    const { ride_otp_hash, ride_otp_encrypted, ...sanitizedDuty } = duty;

    res.json({
      success: true,
      active_duty: sanitizedDuty
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/driver/duty-offers
 * List pending transfer offers available for acceptance
 */
export async function getDutyOffers(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const driverId = await resolveDriverId(req.user);
    if (!driverId) {
      return res.status(403).json({ success: false, error: 'Driver account required.' });
    }

    // Inspect driver's active vehicle
    const drivers = await query('SELECT * FROM drivers WHERE id = ? LIMIT 1', [driverId]);
    const drv = drivers[0] || {};

    let querySql = `
      SELECT d.id, d.booking_id, d.transfer_type, d.pickup_address, d.dropoff_address,
             d.pickup_lat, d.pickup_lng, d.dropoff_lat, d.dropoff_lng, d.pickup_datetime,
             d.passenger_count, d.luggage_count,
             d.vehicle_category, d.vehicle_model, d.distance_km, d.estimated_minutes,
             d.total_fare_thb, d.ride_status, b.customer_name, b.customer_phone
      FROM taxi_dispatches d
      JOIN bookings b ON d.booking_id = b.id
      WHERE d.ride_status = 'ALLOCATED'
    `;
    const params = [];

    // Open jobs are only shown when the driver is online, belongs to the job's vendor,
    // and their approved active vehicle is big enough. Jobs assigned directly to the
    // driver are always shown.
    const vehicle = await loadVehicle(query, drv.active_vehicle_id);
    const blockReason = getOfferBlockReason(drv, vehicle);

    if (!blockReason) {
      const cats = categoriesServedBy(vehicle.category);
      querySql += `
        AND (
          d.driver_id = ?
          OR (
            d.driver_id IS NULL
            AND d.vendor_id = ?
            AND d.passenger_count <= ?
            AND d.luggage_count <= ?
            AND d.vehicle_category IN (${cats.map(() => '?').join(', ')})
          )
        )
      `;
      params.push(driverId, drv.vendor_id, vehicle.seating_capacity, vehicle.luggage_capacity, ...cats);
    } else {
      querySql += ` AND d.driver_id = ?`;
      params.push(driverId);
    }

    querySql += ` ORDER BY d.pickup_datetime ASC LIMIT 20`;

    const offers = await query(querySql, params);

    res.json({
      success: true,
      data: offers,
      can_receive_offers: !blockReason,
      offers_blocked_reason: blockReason
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/driver/accept-duty
 * Chauffeur accepts an assigned duty with atomic row-level lock
 */
export async function acceptDuty(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const driverId = await resolveDriverId(req.user);
    if (!driverId) {
      return res.status(403).json({ success: false, error: 'Driver profile required.' });
    }

    const { dispatch_id } = req.body;
    if (!dispatch_id) {
      return res.status(400).json({ success: false, error: 'dispatch_id is required.' });
    }

    // Fetch driver vehicle details
    const drivers = await query('SELECT * FROM drivers WHERE id = ? LIMIT 1', [driverId]);
    const drv = drivers[0] || {};

    const updated = await withTransaction(async (conn) => {
      // 1. Lock dispatch row FOR UPDATE
      const [rows] = await conn.execute(
        'SELECT * FROM taxi_dispatches WHERE id = ? FOR UPDATE',
        [dispatch_id]
      );

      if (rows.length === 0) {
        const err = new Error('Transfer dispatch not found.');
        err.statusCode = 404;
        throw err;
      }

      const dispatch = rows[0];

      // Prevent race conditions: duty must be ALLOCATED and either unassigned or assigned to this driver
      if (dispatch.ride_status !== 'ALLOCATED') {
        const err = new Error(`Duty is no longer available (Current status: ${dispatch.ride_status}).`);
        err.statusCode = 409;
        throw err;
      }

      if (dispatch.driver_id && String(dispatch.driver_id) !== String(driverId)) {
        const err = new Error('This duty has already been accepted by another chauffeur.');
        err.statusCode = 409;
        throw err;
      }

      // Open jobs can only be taken by drivers of the vendor the job was given to
      if (!dispatch.driver_id && (!drv.vendor_id || String(drv.vendor_id) !== String(dispatch.vendor_id))) {
        throw httpError(403, 'This job belongs to another taxi company.');
      }

      if (drv.status === 'offline') {
        throw httpError(400, 'You are offline. Go online to accept jobs.');
      }

      // The driver's active vehicle must be approved and big enough for this group
      const vehicle = await loadVehicle(conn, drv.active_vehicle_id);
      const mismatch = getVehicleMismatchReason(vehicle, dispatch);
      if (mismatch) {
        throw httpError(400, mismatch);
      }

      // The driver must not already have a trip at the same time
      const conflict = await findDriverScheduleConflict(conn, driverId, dispatch.id);
      if (conflict) {
        throw httpError(409, `You already have trip ${conflict.id} at that time.`);
      }

      // 2. Assign driver and vehicle and transition to DISPATCHED
      await conn.execute(
        `UPDATE taxi_dispatches
         SET driver_id = ?, vehicle_id = ?, vehicle_model = ?, vehicle_plate = ?, ride_status = 'DISPATCHED', updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [driverId, vehicle.id, `${vehicle.brand} ${vehicle.model}`, vehicle.plate_number, dispatch_id]
      );

      // 3. Keep legacy driver_assignments in sync
      await conn.execute(
        `INSERT INTO driver_assignments (id, booking_id, driver_id, pickup_time, status)
         VALUES (?, ?, ?, ?, 'ACCEPTED')
         ON DUPLICATE KEY UPDATE driver_id = VALUES(driver_id), status = 'ACCEPTED'`,
        [`da_${dispatch_id}`, dispatch.booking_id, driverId, dispatch.pickup_datetime]
      );

      // 4. Update driver status to on_trip
      await conn.execute("UPDATE drivers SET status = 'on_trip' WHERE id = ?", [driverId]);

      // 5. Log audit event
      await conn.execute(
        `INSERT INTO taxi_dispatch_events (
          id, dispatch_id, event_type, old_status, new_status, actor_type, actor_id, metadata_json
        ) VALUES (?, ?, 'DRIVER_ACCEPTED', 'ALLOCATED', 'DISPATCHED', 'DRIVER', ?, ?)`,
        [
          `evt_${Date.now()}_acc`,
          dispatch_id,
          driverId,
          JSON.stringify({ driver_name: drv.full_name, vehicle_id: vehicle.id, vehicle_plate: vehicle.plate_number })
        ]
      );

      return {
        ...dispatch,
        driver_id: driverId,
        driver_name: drv.full_name,
        vehicle_model: `${vehicle.brand} ${vehicle.model}`,
        vehicle_plate: vehicle.plate_number,
        ride_status: 'DISPATCHED'
      };
    });

    // Notify the customer's tracking room, the vendor and admin via Socket.IO
    broadcastEvent(`dispatch_${dispatch_id}`, 'DUTY_ACCEPTED', {
      dispatch_id,
      driver_id: driverId,
      driver_name: drv.full_name,
      vehicle_model: updated.vehicle_model,
      vehicle_plate: updated.vehicle_plate,
      ride_status: 'DISPATCHED'
    });
    const acceptedSummary = { dispatch_id, driver_id: driverId, driver_name: drv.full_name, ride_status: 'DISPATCHED' };
    broadcastEvent(`vendor_${updated.vendor_id}`, 'CAB_DRIVER_ASSIGNED', acceptedSummary);
    broadcastEvent('admin', 'CAB_DRIVER_ASSIGNED', { ...acceptedSummary, vendor_id: updated.vendor_id });

    // Tell the customer who is coming by SMS, WhatsApp and email (runs in the background)
    queueRideNotification(dispatch_id, RIDE_EVENTS.DRIVER_ASSIGNED);

    res.json({
      success: true,
      message: 'Duty accepted successfully. Chauffeur is en route.',
      data: {
        dispatch_id,
        ride_status: 'DISPATCHED',
        pickup_address: updated.pickup_address,
        dropoff_address: updated.dropoff_address,
        pickup_datetime: updated.pickup_datetime
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/driver/reject-duty
 * Chauffeur declines duty offer
 */
export async function rejectDuty(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const driverId = await resolveDriverId(req.user);
    if (!driverId) {
      return res.status(403).json({ success: false, error: 'Driver profile required.' });
    }

    const { dispatch_id, reason = 'Chauffeur unavailable' } = req.body;
    if (!dispatch_id) {
      return res.status(400).json({ success: false, error: 'dispatch_id is required.' });
    }

    // Log decline event
    await query(
      `INSERT INTO taxi_dispatch_events (
        id, dispatch_id, event_type, old_status, new_status, actor_type, actor_id, metadata_json
      ) VALUES (?, ?, 'DRIVER_REJECTED', 'ALLOCATED', 'ALLOCATED', 'DRIVER', ?, ?)`,
      [`evt_${Date.now()}_rej`, dispatch_id, driverId, JSON.stringify({ reason })]
    );

    res.json({
      success: true,
      message: 'Duty declined.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/driver/update-status
 * Transition duty state: ARRIVED -> ON_TRIP (OTP verified) -> COMPLETED
 */
export async function updateDutyStatus(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const driverId = await resolveDriverId(req.user);
    if (!driverId) {
      return res.status(403).json({ success: false, error: 'Driver profile required.' });
    }

    const { dispatch_id, status, toll_fee_thb = 0, notes = '' } = req.body;
    const ride_otp = req.body.ride_otp || req.body.otp;
    if (!dispatch_id || !status) {
      return res.status(400).json({ success: false, error: 'dispatch_id and status are required.' });
    }

    // Lookup dispatch and enforce driver ownership
    const dispatches = await query('SELECT * FROM taxi_dispatches WHERE id = ? LIMIT 1', [dispatch_id]);
    if (dispatches.length === 0) {
      return res.status(404).json({ success: false, error: 'Transfer dispatch not found.' });
    }

    const dispatch = dispatches[0];

    // Enforce driver ownership
    if (String(dispatch.driver_id) !== String(driverId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You are not assigned to this transfer duty.'
      });
    }

    const currentStatus = dispatch.ride_status;

    // State Transition: DISPATCHED -> ARRIVED
    if (status === 'ARRIVED') {
      if (currentStatus !== 'DISPATCHED') {
        return res.status(400).json({
          success: false,
          error: `Invalid status transition from ${currentStatus} to ARRIVED.`
        });
      }

      await query(
        `UPDATE taxi_dispatches SET ride_status = 'ARRIVED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [dispatch_id]
      );

      await query(
        `INSERT INTO taxi_dispatch_events (
          id, dispatch_id, event_type, old_status, new_status, actor_type, actor_id, metadata_json
        ) VALUES (?, ?, 'DRIVER_ARRIVED', 'DISPATCHED', 'ARRIVED', 'DRIVER', ?, ?)`,
        [`evt_${Date.now()}_arr`, dispatch_id, driverId, JSON.stringify({ notes })]
      );

      broadcastEvent(`dispatch_${dispatch_id}`, 'DRIVER_ARRIVED', {
        dispatch_id,
        ride_status: 'ARRIVED',
        message: 'Your chauffeur has arrived at the pickup location.'
      });

      return res.json({
        success: true,
        message: 'Chauffeur arrival recorded. Awaiting passenger 4-digit OTP.',
        ride_status: 'ARRIVED'
      });
    }

    // State Transition: ARRIVED -> ON_TRIP (Requires OTP Verification)
    if (status === 'ON_TRIP' || status === 'START_TRIP') {
      if (currentStatus !== 'ARRIVED') {
        return res.status(400).json({
          success: false,
          error: `Trip can only start after chauffeur has marked arrival (Current: ${currentStatus}).`
        });
      }

      // Mandatory 4-digit Ride OTP verification
      if (!ride_otp || String(ride_otp).trim().length !== 4) {
        return res.status(400).json({
          success: false,
          error: 'A valid 4-digit passenger Ride OTP is required to start the trip.'
        });
      }

      // Check max attempts
      if (dispatch.otp_attempts >= 5) {
        return res.status(400).json({
          success: false,
          error: 'Maximum OTP verification attempts exceeded. Please contact dispatch support.'
        });
      }

      // Verify OTP hash
      const inputHash = hashOtp(String(ride_otp).trim());
      if (inputHash !== dispatch.ride_otp_hash) {
        await query('UPDATE taxi_dispatches SET otp_attempts = otp_attempts + 1 WHERE id = ?', [dispatch_id]);
        return res.status(400).json({
          success: false,
          error: 'Incorrect Ride OTP. Please confirm the 4-digit code displayed on the passenger screen.'
        });
      }

      // OTP Verified successfully! Start trip
      await query(
        `UPDATE taxi_dispatches 
         SET ride_status = 'ON_TRIP', otp_verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [dispatch_id]
      );

      await query(
        `INSERT INTO taxi_dispatch_events (
          id, dispatch_id, event_type, old_status, new_status, actor_type, actor_id, metadata_json
        ) VALUES (?, ?, 'TRIP_STARTED', 'ARRIVED', 'ON_TRIP', 'DRIVER', ?, ?)`,
        [`evt_${Date.now()}_start`, dispatch_id, driverId, JSON.stringify({ otp_verified: true })]
      );

      broadcastEvent(`dispatch_${dispatch_id}`, 'TRIP_STARTED', {
        dispatch_id,
        ride_status: 'ON_TRIP',
        message: 'Journey in progress. Chauffeur is driving to destination.'
      });

      return res.json({
        success: true,
        message: 'Ride OTP verified! Journey is now in progress.',
        ride_status: 'ON_TRIP'
      });
    }

    // State Transition: ON_TRIP -> COMPLETED
    if (status === 'COMPLETED') {
      if (currentStatus !== 'ON_TRIP') {
        return res.status(400).json({
          success: false,
          error: `Cannot complete a trip that has not started (Current: ${currentStatus}).`
        });
      }

      const toll = parseFloat(toll_fee_thb) || 0.00;
      const finalTotalTHB = parseFloat(dispatch.total_fare_thb) + toll;

      await withTransaction(async (conn) => {
        await conn.execute(
          `UPDATE taxi_dispatches 
           SET ride_status = 'COMPLETED', toll_fee_thb = ?, total_fare_thb = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [toll, finalTotalTHB, dispatch_id]
        );

        await conn.execute(
          `UPDATE bookings SET booking_status = 'Completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [dispatch.booking_id]
        );

        await conn.execute(
          `UPDATE driver_assignments SET status = 'COMPLETED' WHERE booking_id = ?`,
          [dispatch.booking_id]
        );

        // Reset driver status to available
        await conn.execute("UPDATE drivers SET status = 'available' WHERE id = ?", [driverId]);

        await conn.execute(
          `INSERT INTO taxi_dispatch_events (
            id, dispatch_id, event_type, old_status, new_status, actor_type, actor_id, metadata_json
          ) VALUES (?, ?, 'TRIP_COMPLETED', 'ON_TRIP', 'COMPLETED', 'DRIVER', ?, ?)`,
          [`evt_${Date.now()}_cmp`, dispatch_id, driverId, JSON.stringify({ toll_fee_thb: toll, final_total_thb: finalTotalTHB })]
        );
      });

      broadcastEvent(`dispatch_${dispatch_id}`, 'TRIP_COMPLETED', {
        dispatch_id,
        ride_status: 'COMPLETED',
        total_fare_thb: finalTotalTHB,
        message: 'You have safely arrived at your destination.'
      });

      return res.json({
        success: true,
        message: 'Trip completed successfully.',
        ride_status: 'COMPLETED',
        total_fare_thb: finalTotalTHB
      });
    }

    return res.status(400).json({ success: false, error: `Unsupported target status: ${status}.` });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/driver/location
 * Live GPS telemetry ping from driver application
 */
export async function updateDriverLocation(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const driverId = await resolveDriverId(req.user);
    if (!driverId) {
      return res.status(403).json({ success: false, error: 'Driver profile required.' });
    }

    const { latitude, longitude, heading = null, speed = null, dispatch_id = null } = req.body;
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, error: 'latitude and longitude are required.' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return res.status(400).json({ success: false, error: 'latitude and longitude must be valid coordinates.' });
    }
    const locationText = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

    // 1. Record location in taxi_driver_locations
    const locId = `loc_${Date.now()}_${Math.floor(Math.random() * 900 + 100)}`;
    await query(
      `INSERT INTO taxi_driver_locations (id, driver_id, dispatch_id, latitude, longitude, heading, speed)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [locId, driverId, dispatch_id || null, lat, lng, heading || null, speed || null]
    );

    // 2. Update drivers current_location string
    await query(
      `UPDATE drivers SET current_location = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [locationText, driverId]
    );

    // 3. Push the new position straight away to the admin monitor and the driver's own vendor
    const staffUpdate = {
      driver_id: driverId,
      dispatch_id: dispatch_id || null,
      location: locationText,
      latitude: lat,
      longitude: lng,
      heading,
      speed
    };
    broadcastEvent('admin', 'DRIVER_LOCATION_UPDATE', staffUpdate);
    const [driverRow] = await query('SELECT vendor_id FROM drivers WHERE id = ? LIMIT 1', [driverId]);
    if (driverRow?.vendor_id) {
      broadcastEvent(`vendor_${driverRow.vendor_id}`, 'DRIVER_LOCATION_UPDATE', staffUpdate);
    }

    // 4. Broadcast real-time GPS coordinate to the customer's tracking room
    if (dispatch_id) {
      broadcastEvent(`dispatch_${dispatch_id}`, 'DRIVER_LOCATION_UPDATE', {
        driver_id: driverId,
        latitude: lat,
        longitude: lng,
        heading,
        speed,
        timestamp: new Date()
      });
    }

    res.json({ success: true, recorded: true });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/driver/toggle-status
 * Toggle driver online / offline availability
 */
export async function toggleDutyStatus(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const driverId = await resolveDriverId(req.user);
    if (!driverId) {
      return res.status(403).json({ success: false, error: 'Driver profile required.' });
    }

    const { status } = req.body;
    const allowed = ['available', 'offline'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ success: false, error: 'Status must be "available" or "offline".' });
    }

    // If driver is currently on an active trip, prevent going offline
    const [active] = await query(
      "SELECT id FROM taxi_dispatches WHERE driver_id = ? AND ride_status IN ('DISPATCHED', 'ARRIVED', 'ON_TRIP') LIMIT 1",
      [driverId]
    );

    if (active && status === 'offline') {
      return res.status(400).json({
        success: false,
        error: 'Cannot go offline while on an active transfer trip.'
      });
    }

    await query('UPDATE drivers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, driverId]);

    res.json({
      success: true,
      status,
      message: status === 'available' ? 'You are now ONLINE and ready for duties.' : 'You are now OFFLINE.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/driver/summary
 * Aggregated dashboard metrics: earnings today, completed trips, upcoming transfers, current active duty
 */
export async function getDriverSummary(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const driverId = await resolveDriverId(req.user);
    if (!driverId) {
      return res.status(403).json({ success: false, error: 'Driver profile required.' });
    }

    // 1. Driver profile
    const drivers = await query(
      `SELECT d.id, d.full_name, d.phone, d.license_number, d.vehicle_model, d.vehicle_plate, d.status, d.current_location,
              u.email
       FROM drivers d
       LEFT JOIN users u ON d.user_id = u.id
       WHERE d.id = ? LIMIT 1`,
      [driverId]
    );
    const drv = drivers[0] || {};

    // 2. Today's earnings and completed trips today
    const [todayStats] = await query(
      `SELECT COALESCE(SUM(total_fare_thb), 0) as today_earnings_thb,
              COUNT(*) as today_completed_trips
       FROM taxi_dispatches
       WHERE driver_id = ? AND ride_status = 'COMPLETED' AND DATE(updated_at) = CURDATE()`,
      [driverId]
    );

    // 3. Lifetime stats
    const [lifetimeStats] = await query(
      `SELECT COALESCE(SUM(total_fare_thb), 0) as lifetime_earnings_thb,
              COUNT(*) as total_completed_trips
       FROM taxi_dispatches
       WHERE driver_id = ? AND ride_status = 'COMPLETED'`,
      [driverId]
    );

    // 4. Current active duty
    const activeDuties = await query(
      `SELECT d.*, b.customer_name, b.customer_phone, b.customer_email, b.customer_currency,
              b.customer_total_amount, b.payment_status as booking_payment_status,
              p.payment_method, p.payment_status as tx_payment_status
       FROM taxi_dispatches d
       JOIN bookings b ON d.booking_id = b.id
       LEFT JOIN taxi_payment_transactions p ON d.id = p.dispatch_id
       WHERE d.driver_id = ? AND d.ride_status IN ('DISPATCHED', 'ARRIVED', 'ON_TRIP')
       ORDER BY d.pickup_datetime ASC LIMIT 1`,
      [driverId]
    );

    let activeDuty = null;
    if (activeDuties.length > 0) {
      const { ride_otp_hash, ride_otp_encrypted, ...sanitized } = activeDuties[0];
      activeDuty = sanitized;
    }

    // 5. Upcoming transfers assigned to driver
    const upcomingTransfers = await query(
      `SELECT d.id, d.booking_id, d.transfer_type, d.pickup_address, d.dropoff_address,
              d.pickup_datetime, d.vehicle_category, d.total_fare_thb, d.ride_status,
              b.customer_name, b.customer_phone
       FROM taxi_dispatches d
       JOIN bookings b ON d.booking_id = b.id
       WHERE d.driver_id = ? AND d.ride_status IN ('ALLOCATED', 'DISPATCHED') AND d.id != ?
       ORDER BY d.pickup_datetime ASC LIMIT 5`,
      [driverId, activeDuty ? activeDuty.id : '']
    );

    res.json({
      success: true,
      data: {
        driver: {
          id: drv.id,
          name: drv.full_name || 'Somchai Jaidee',
          phone: drv.phone,
          vehicle_model: drv.vehicle_model || 'Toyota Camry VIP',
          vehicle_plate: drv.vehicle_plate || '1กข 4589',
          status: drv.status || 'available',
          current_location: drv.current_location,
          rating: 4.95
        },
        metrics: {
          today_earnings_thb: parseFloat(todayStats?.today_earnings_thb || 0),
          today_completed_trips: parseInt(todayStats?.today_completed_trips || 0, 10),
          total_completed_trips: parseInt(lifetimeStats?.total_completed_trips || 0, 10),
          lifetime_earnings_thb: parseFloat(lifetimeStats?.lifetime_earnings_thb || 0)
        },
        active_duty: activeDuty,
        upcoming_transfers: upcomingTransfers
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/driver/trips
 * Complete driver trip history (completed, in-progress, and cancelled)
 */
export async function getDriverTripHistory(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const driverId = await resolveDriverId(req.user);
    if (!driverId) {
      return res.status(403).json({ success: false, error: 'Driver profile required.' });
    }

    const trips = await query(
      `SELECT d.id, d.booking_id, d.transfer_type, d.pickup_address, d.dropoff_address,
              d.pickup_datetime, d.vehicle_category, d.vehicle_model, d.vehicle_plate,
              d.distance_km, d.estimated_minutes, d.total_fare_thb, d.toll_fee_thb,
              d.ride_status, d.cancellation_reason, d.created_at, d.updated_at,
              b.customer_name, b.customer_phone, b.customer_currency,
              p.payment_method, p.payment_status as tx_payment_status
       FROM taxi_dispatches d
       JOIN bookings b ON d.booking_id = b.id
       LEFT JOIN taxi_payment_transactions p ON d.id = p.dispatch_id
       WHERE d.driver_id = ?
       ORDER BY d.created_at DESC LIMIT 50`,
      [driverId]
    );

    res.json({
      success: true,
      data: trips
    });
  } catch (err) {
    next(err);
  }
}

