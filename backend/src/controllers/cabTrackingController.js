// ========================================================================
// WOW THAILAND: Cab Live Ride Tracking Controller
// Authoritative telemetry, journey timeline, and secure 4-digit ride OTP
// ========================================================================

import { query } from '../config/db.js';
import { isBookingOwnerOrStaff } from '../utils/identityResolver.js';
import { decryptOtp } from '../utils/cryptoHelper.js';

/**
 * GET /api/v1/cabs/track/:id
 * Retrieve live tracking data for a transfer dispatch
 */
export async function getTrackingDetails(req, res, next) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Dispatch ID or Booking ID is required.' });
    }

    // 1. Fetch dispatch record
    const dispatches = await query(
      `SELECT d.*, 
              b.customer_name, b.customer_phone, b.customer_email, b.customer_currency,
              b.customer_total_amount, b.payment_status as booking_payment_status,
              b.user_id as bkg_user_id, b.id as booking_reference
       FROM taxi_dispatches d
       JOIN bookings b ON d.booking_id = b.id
       WHERE d.id = ? OR d.booking_id = ? LIMIT 1`,
      [id, id]
    );

    if (dispatches.length === 0) {
      return res.status(404).json({ success: false, error: 'Transfer ride not found.' });
    }

    const dispatch = dispatches[0];

    // 2. Fetch driver information if assigned
    let driverData = null;
    let latestLocation = null;

    if (dispatch.driver_id) {
      const drivers = await query(
        `SELECT d.id, d.full_name, d.phone, d.license_number, d.vehicle_model, d.vehicle_plate, d.status, d.current_location,
                u.email as driver_email
         FROM drivers d
         LEFT JOIN users u ON d.user_id = u.id
         WHERE d.id = ? LIMIT 1`,
        [dispatch.driver_id]
      );

      if (drivers.length > 0) {
        const drv = drivers[0];
        // Colour helps the customer spot the car at pickup
        const vehicles = dispatch.vehicle_id
          ? await query('SELECT color FROM cab_vehicles WHERE id = ? LIMIT 1', [dispatch.vehicle_id])
          : [];
        driverData = {
          id: drv.id,
          name: drv.full_name || 'Verified Chauffeur',
          phone: drv.phone,
          license_number: drv.license_number,
          vehicle_model: dispatch.vehicle_model || drv.vehicle_model,
          vehicle_plate: dispatch.vehicle_plate || drv.vehicle_plate,
          vehicle_color: vehicles[0]?.color || null,
          rating: 5.0,
          total_trips: 0,
          photo: null,
          status: drv.status
        };

        // The driver's real GPS position, only while they are on the way or on the trip.
        // Tracking links can be shared, so the driver's position is not shown before
        // they set off for this ride or after it has ended.
        const LIVE_STATUSES = ['DISPATCHED', 'ARRIVED', 'ON_TRIP'];
        if (LIVE_STATUSES.includes(String(dispatch.ride_status || '').toUpperCase())) {
          const locations = await query(
            `SELECT latitude, longitude, heading, speed, recorded_at,
                    TIMESTAMPDIFF(SECOND, recorded_at, NOW()) AS age_sec
             FROM taxi_driver_locations
             WHERE driver_id = ?
             ORDER BY recorded_at DESC LIMIT 1`,
            [drv.id]
          );

          if (locations.length > 0) {
            latestLocation = {
              latitude: parseFloat(locations[0].latitude),
              longitude: parseFloat(locations[0].longitude),
              heading: parseFloat(locations[0].heading) || 0,
              speed: parseFloat(locations[0].speed) || 0,
              recorded_at: locations[0].recorded_at,
              // Seconds since this position arrived (worked out by the database, so no timezone mix-ups)
              age_sec: Math.max(0, Number(locations[0].age_sec) || 0)
            };
          }
        }
        // No GPS from the driver yet: latestLocation stays null (never a made-up position)
      }
    }

    // 3. Fetch dispatch events timeline
    const events = await query(
      `SELECT event_type, old_status, new_status, actor_type, created_at, metadata_json
       FROM taxi_dispatch_events
       WHERE dispatch_id = ?
       ORDER BY created_at ASC`,
      [dispatch.id]
    );

    // 4. Fetch payment details
    const payments = await query(
      `SELECT payment_method, payment_status, amount_thb, verified_at
       FROM taxi_payment_transactions
       WHERE dispatch_id = ?
       ORDER BY created_at DESC LIMIT 1`,
      [dispatch.id]
    );

    const paymentInfo = payments.length > 0 ? payments[0] : {
      payment_method: 'CASH_TO_DRIVER',
      payment_status: dispatch.booking_payment_status || 'PENDING',
      amount_thb: dispatch.total_fare_thb
    };

    // 5. Secure Ride OTP Ownership Verification
    // Only the authenticated customer owner or authorized staff can view the 4-digit ride OTP
    let rideOtp = null;
    let otpInstruction = null;
    let isOwner = false;

    if (req.user) {
      isOwner = await isBookingOwnerOrStaff(
        {
          id: dispatch.booking_id,
          user_id: dispatch.bkg_user_id,
          customer_phone: dispatch.customer_phone,
          customer_email: dispatch.customer_email,
          vendor_id: dispatch.vendor_id
        },
        req.user
      );

      if (isOwner) {
        // Decrypt the stored OTP
        const decrypted = decryptOtp(dispatch.ride_otp_encrypted);
        if (decrypted) {
          rideOtp = decrypted;
          otpInstruction = 'Your chauffeur is ready. Share this code when you meet your driver.';
        }
      }
    }

    // Assemble response
    res.json({
      success: true,
      data: {
        dispatch_id: dispatch.id,
        booking_id: dispatch.booking_id,
        ride_status: dispatch.ride_status,
        transfer_type: dispatch.transfer_type,
        pickup_address: dispatch.pickup_address,
        dropoff_address: dispatch.dropoff_address,
        pickup_lat: dispatch.pickup_lat ? parseFloat(dispatch.pickup_lat) : null,
        pickup_lng: dispatch.pickup_lng ? parseFloat(dispatch.pickup_lng) : null,
        dropoff_lat: dispatch.dropoff_lat ? parseFloat(dispatch.dropoff_lat) : null,
        dropoff_lng: dispatch.dropoff_lng ? parseFloat(dispatch.dropoff_lng) : null,
        pickup_datetime: dispatch.pickup_datetime,
        passenger_count: dispatch.passenger_count,
        luggage_count: dispatch.luggage_count,
        vehicle_category: dispatch.vehicle_category,
        vehicle_model: dispatch.vehicle_model,
        vehicle_plate: dispatch.vehicle_plate,
        distance_km: parseFloat(dispatch.distance_km),
        estimated_minutes: dispatch.estimated_minutes,
        total_fare_thb: parseFloat(dispatch.total_fare_thb),
        // Tracking links are shareable, so the customer's own details are only
        // returned to the booking owner or staff
        customer: isOwner
          ? {
              name: dispatch.customer_name,
              phone: dispatch.customer_phone,
              currency: dispatch.customer_currency,
              total_amount: parseFloat(dispatch.customer_total_amount)
            }
          : null,
        driver: driverData,
        driver_location: latestLocation,
        timeline: events,
        payment: paymentInfo,
        ride_otp: rideOtp,
        otp_instruction: otpInstruction,
        cancellation_reason: dispatch.cancellation_reason,
        created_at: dispatch.created_at,
        updated_at: dispatch.updated_at
      }
    });
  } catch (err) {
    next(err);
  }
}

