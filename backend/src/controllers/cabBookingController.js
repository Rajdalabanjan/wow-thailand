// ========================================================================
// WOW THAILAND: Cab & Airport Transfer Booking Controller
// Transactional dispatch creation, cryptographic 4-digit OTP & cancellation
// ========================================================================

import crypto from 'crypto';
import { query, withTransaction } from '../config/db.js';
import { calculateFare, estimateAllTiers } from '../services/cabPricingService.js';
import { createCurrencySnapshot } from '../services/currencyService.js';
import {
  parseGroupSize,
  pickVehicleCategory,
  findVendorForRide,
  findEligibleDriverIds
} from '../services/cabMatchingService.js';
import { isBookingOwnerOrStaff, resolveDriverId, resolveVendorId } from '../utils/identityResolver.js';
import { hashOtp, encryptOtp } from '../utils/cryptoHelper.js';
import { generateBookingId } from '../utils/bookingIds.js';
import { broadcastEvent } from '../server.js';
import {
  queueRideNotification,
  getCustomerUpdateChannels,
  getConfiguredChannels,
  RIDE_EVENTS
} from '../services/rideNotificationService.js';

// Paid extras are priced on the server so the customer and driver always see the same total
const CHILD_SEAT_FEE_THB = 200;

function readGroupSize(b) {
  return parseGroupSize(
    b.passenger_count ?? b.passengerCount ?? b.pax ?? b.passengers,
    b.luggage_count ?? b.luggageCount ?? b.luggage ?? b.bags
  );
}

function wantsChildSeat(b) {
  const v = b.child_seat ?? b.childSeat ?? b.extras?.child_seat ?? b.extras?.childSeat;
  return v === true || v === 'true' || v === 1 || v === '1';
}

/**
 * POST /api/v1/cabs/estimate
 * Get fare estimates across all vehicle tiers, plus the one vehicle the system
 * will actually send for this group size (`recommended`).
 */
export async function estimateFare(req, res, next) {
  try {
    const b = req.body || {};
    const pickup_address = b.pickup_address || b.pickupAddress || b.pickup;
    const dropoff_address = b.dropoff_address || b.dropoffAddress || b.dropoff;
    const distance_km = b.distance_km || b.distanceKm;
    const target_currency = b.target_currency || b.customer_currency || b.currency || 'THB';
    const { passengers, luggage } = readGroupSize(b);

    const estimates = await estimateAllTiers({
      pickupAddress: pickup_address,
      dropoffAddress: dropoff_address,
      pickupLat: b.pickup_lat || b.pickupLat,
      pickupLng: b.pickup_lng || b.pickupLng,
      dropoffLat: b.dropoff_lat || b.dropoffLat,
      dropoffLng: b.dropoff_lng || b.dropoffLng,
      distanceKm: distance_km,
      routeId: b.route_id || b.routeId,
      targetCurrency: target_currency
    });

    const mappedTiers = estimates.map(t => ({
      tier: t.vehicle_category,
      name: t.model_name,
      models: t.vehicle_category === 'VIP_VAN' ? 'Toyota Commuter VIP 9-Seater or similar' : t.vehicle_category === 'SUV' ? 'Toyota Fortuner, Isuzu MU-X or similar' : 'Toyota Camry, Corolla Altis or similar',
      maxPax: t.max_passengers,
      maxLuggage: t.max_luggage,
      fareThb: t.total_fare_thb,
      displayFare: t.currency_snapshot?.customer_total_amount || t.total_fare_thb,
      currency: t.currency_snapshot?.customer_currency || 'THB',
      symbol: (t.currency_snapshot?.customer_currency === 'INR' ? '₹' : (t.currency_snapshot?.customer_currency === 'USD' ? '$' : '฿')),
      breakdown: {
        baseFareThb: t.base_fare_thb || 0,
        distanceFareThb: (t.total_fare_thb || 0) - (t.base_fare_thb || 0),
        perKmRateThb: t.vehicle_category === 'VIP_VAN' ? 35 : (t.vehicle_category === 'SUV' ? 25 : 15),
        tollEstimateThb: t.toll_fee_thb || 0
      }
    }));

    // Match the group to a vehicle category and check a vendor can serve it
    let recommended = null;
    let availabilityMessage = '';
    try {
      const matchedTier = await pickVehicleCategory(passengers, luggage);
      const vendor = await findVendorForRide({ category: matchedTier.vehicle_category, passengers, luggage });
      const tierQuote = mappedTiers.find(t => t.tier === matchedTier.vehicle_category);
      recommended = {
        ...tierQuote,
        maxPax: matchedTier.max_passengers,
        maxLuggage: matchedTier.max_luggage,
        available: Boolean(vendor)
      };
      if (!vendor) {
        availabilityMessage = `No vehicle for ${passengers} passengers and ${luggage} bags is available right now.`;
      }
    } catch (matchErr) {
      if (matchErr.statusCode !== 400) throw matchErr;
      availabilityMessage = matchErr.message;
    }

    res.json({
      success: true,
      data: estimates,
      tiers: mappedTiers,
      recommended,
      passengerCount: passengers,
      luggageCount: luggage,
      vehicleAvailable: Boolean(recommended?.available),
      availabilityMessage,
      childSeatFeeThb: CHILD_SEAT_FEE_THB,
      // Channels this server will use for booking & driver updates (empty when switched off)
      updateChannels: getConfiguredChannels(),
      distanceKm: estimates[0]?.distance_km || 25,
      durationMin: estimates[0]?.estimated_minutes || 45
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/cabs/book
 * Create a new cab/transfer booking with 4-digit ride OTP
 */
export async function createCabBooking(req, res, next) {
  try {
    const b = req.body || {};
    const customer_name = b.customer_name || b.customerName;
    const customer_phone = b.customer_phone || b.customerPhone;
    const customer_email = b.customer_email || b.customerEmail;
    const pickup_address = b.pickup_address || b.pickupAddress || b.pickup;
    const dropoff_address = b.dropoff_address || b.dropoffAddress || b.dropoff;
    const pickup_lat = b.pickup_lat || b.pickupLat;
    const pickup_lng = b.pickup_lng || b.pickupLng;
    const dropoff_lat = b.dropoff_lat || b.dropoffLat;
    const dropoff_lng = b.dropoff_lng || b.dropoffLng;
    const pickup_datetime = b.pickup_datetime || b.pickupDatetime;
    const pickup_date = b.pickup_date || b.pickupDate || b.travelDate;
    const pickup_time = b.pickup_time || b.pickupTime || b.travelTime;
    const transfer_type = b.transfer_type || b.transferType || 'POINT_TO_POINT';
    // The customer only tells us how many people and bags; any vehicle_category/tier
    // sent by the client is ignored and the system picks the vehicle below.
    const { passengers, luggage } = readGroupSize(b);
    const childSeat = wantsChildSeat(b);
    const rawPayment = b.payment_method || b.paymentMethod || 'CASH';
    const payment_method = (rawPayment === 'CASH' || rawPayment === 'Cash') ? 'CASH_TO_DRIVER' : rawPayment;
    const special_requests = b.special_requests || b.specialRequests || b.notes || '';
    const idempotency_key = b.idempotency_key || b.idempotencyKey || '';
    const customer_currency = b.customer_currency || b.customerCurrency || b.currency || 'THB';
    const route_id = b.route_id || b.routeId || null;

    // 1. Mandatory Validations
    if (!pickup_address || !dropoff_address) {
      return res.status(400).json({ success: false, error: 'Pickup and drop-off locations are required.' });
    }
    const cleanName = (customer_name || req.user?.username || '').trim();
    const cleanPhone = (customer_phone || req.user?.phone || '').trim();
    if (!cleanName || !cleanPhone) {
      return res.status(400).json({ success: false, error: 'Customer name and phone number are required.' });
    }

    // Determine pickup datetime
    let finalPickupDatetime = pickup_datetime;
    if (!finalPickupDatetime && pickup_date) {
      finalPickupDatetime = `${pickup_date} ${pickup_time || '10:00:00'}`;
    }
    if (!finalPickupDatetime) {
      return res.status(400).json({ success: false, error: 'Pickup date and time are required.' });
    }

    // 2. Check Idempotency Key
    const cleanIdempotency = (idempotency_key || '').trim();
    if (cleanIdempotency) {
      const existing = await query('SELECT * FROM taxi_dispatches WHERE idempotency_key = ? LIMIT 1', [cleanIdempotency]);
      if (existing.length > 0) {
        return res.json({
          success: true,
          idempotent: true,
          message: 'Booking retrieved via idempotency key.',
          dispatch: existing[0],
          dispatch_id: existing[0].id,
          booking_id: existing[0].booking_id
        });
      }
    }

    // 3. Pick the vehicle category from the group size (smallest that fits)
    const matchedTier = await pickVehicleCategory(passengers, luggage);
    const vehicle_category = matchedTier.vehicle_category;

    // 4. Pick the vendor (taxi owner) that has an approved vehicle that fits
    const vendor = await findVendorForRide({ category: vehicle_category, passengers, luggage });
    if (!vendor) {
      return res.status(409).json({
        success: false,
        error: `Sorry, no vehicle for ${passengers} passengers and ${luggage} bags is available right now. Please try again later or contact our helpline.`
      });
    }
    const vendorId = vendor.vendor_id;

    // 5. Authoritative Server-Side Fare Calculation
    const fareDetails = await calculateFare({
      routeId: route_id,
      pickupAddress: pickup_address,
      dropoffAddress: dropoff_address,
      pickupLat: pickup_lat,
      pickupLng: pickup_lng,
      dropoffLat: dropoff_lat,
      dropoffLng: dropoff_lng,
      vehicleCategory: vehicle_category,
      targetCurrency: customer_currency
    });

    const extrasTHB = childSeat ? CHILD_SEAT_FEE_THB : 0;
    const rideFareTHB = fareDetails.total_fare_thb;
    const totalFareTHB = rideFareTHB + extrasTHB;
    const baseFareTHB = fareDetails.base_fare_thb;
    const tollFeeTHB = fareDetails.toll_fee_thb || 0.00;
    const platformFeeTHB = Math.round(totalFareTHB * 0.10 * 100) / 100; // 10% platform fee
    const currencySnapshot = extrasTHB > 0
      ? createCurrencySnapshot(totalFareTHB, customer_currency)
      : fareDetails.currency_snapshot;

    const requestNotes = [special_requests || `Cab Transfer: ${fareDetails.route_name}`];
    if (childSeat) requestNotes.push(`Child safety seat (+฿${CHILD_SEAT_FEE_THB})`);
    const finalSpecialRequests = requestNotes.filter(Boolean).join(' | ');

    // 6. Cryptographically Generate 4-digit Ride OTP
    const plainOtp = String(crypto.randomInt(1000, 10000));
    const hashedOtp = hashOtp(plainOtp);

    // Calculate OTP expiry (pickup time + 4 hours)
    const pickupDateObj = new Date(finalPickupDatetime);
    const otpExpiresAt = isNaN(pickupDateObj.getTime())
      ? new Date(Date.now() + 24 * 3600 * 1000)
      : new Date(pickupDateObj.getTime() + 4 * 3600 * 1000);

    // 7. Execute Atomic MySQL Transaction
    const result = await withTransaction(async (conn) => {
      // Generate IDs
      const randTag = Math.floor(Math.random() * 9000 + 1000);
      const bookingId = await generateBookingId(conn);
      const dispatchId = `dsp_${Date.now()}_${randTag}`;
      const itemId = `itm_${Date.now()}_${randTag}`;
      const paymentTxId = `ptx_${Date.now()}_${randTag}`;

      let validUserId = null;
      if (req.user?.id) {
        const [u] = await conn.execute('SELECT id FROM users WHERE id = ? LIMIT 1', [req.user.id]);
        if (u.length > 0) validUserId = req.user.id;
      }

      // Insert into bookings table
      await conn.execute(
        `INSERT INTO bookings (
          id, idempotency_key, user_id, customer_name, customer_phone, customer_email,
          start_date, end_date, vendor_id, base_amount_thb, platform_fee_thb,
          customer_currency, exchange_rate_applied, customer_total_amount,
          payment_status, payment_verification_status, wallet_deduction_status, booking_status, special_requests
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'Unverified', 'Pending', 'Confirmed', ?)`,
        [
          bookingId,
          cleanIdempotency ? `bkg_${cleanIdempotency}` : null,
          validUserId,
          cleanName,
          cleanPhone,
          customer_email || '',
          finalPickupDatetime.slice(0, 10),
          finalPickupDatetime.slice(0, 10),
          vendorId, // Vendor chosen by the matching service
          baseFareTHB + extrasTHB,
          platformFeeTHB,
          currencySnapshot.customer_currency,
          currencySnapshot.exchange_rate_applied,
          currencySnapshot.customer_total_amount,
          finalSpecialRequests
        ]
      );

      // Insert into booking_items table
      await conn.execute(
        `INSERT INTO booking_items (
          id, booking_id, item_type, reference_id, unit_price_thb, quantity, subtotal_thb, details_json
        ) VALUES (?, ?, 'TRANSFER', ?, ?, 1, ?, ?)`,
        [
          itemId,
          bookingId,
          fareDetails.route_id || `trf-${vehicle_category.toLowerCase()}`,
          totalFareTHB,
          totalFareTHB,
          JSON.stringify({
            transfer_type,
            pickup_address,
            dropoff_address,
            vehicle_category,
            model_name: fareDetails.model_name,
            passenger_count: passengers,
            luggage_count: luggage,
            ride_fare_thb: rideFareTHB,
            extras: childSeat ? { child_seat_thb: CHILD_SEAT_FEE_THB } : {},
            distance_km: fareDetails.distance_km,
            estimated_minutes: fareDetails.estimated_minutes
          })
        ]
      );

      // Insert into taxi_dispatches table
      const encryptedOtp = encryptOtp(plainOtp);
      await conn.execute(
        `INSERT INTO taxi_dispatches (
          id, booking_id, driver_id, vendor_id, route_id, transfer_type,
          pickup_address, dropoff_address, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
          pickup_datetime, passenger_count, luggage_count, vehicle_category, vehicle_model,
          distance_km, estimated_minutes, base_fare_thb, toll_fee_thb, total_fare_thb,
          ride_status, ride_otp_hash, ride_otp_encrypted, otp_expires_at, idempotency_key
        ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ALLOCATED', ?, ?, ?, ?)`,
        [
          dispatchId,
          bookingId,
          vendorId,
          fareDetails.route_id || null,
          transfer_type,
          pickup_address,
          dropoff_address,
          pickup_lat || null,
          pickup_lng || null,
          dropoff_lat || null,
          dropoff_lng || null,
          finalPickupDatetime,
          passengers,
          luggage,
          vehicle_category,
          fareDetails.model_name,
          fareDetails.distance_km,
          fareDetails.estimated_minutes,
          baseFareTHB,
          tollFeeTHB,
          totalFareTHB,
          hashedOtp,
          encryptedOtp,
          otpExpiresAt,
          cleanIdempotency || null
        ]
      );

      // Log creation event in taxi_dispatch_events
      await conn.execute(
        `INSERT INTO taxi_dispatch_events (
          id, dispatch_id, event_type, old_status, new_status, actor_type, actor_id, metadata_json
        ) VALUES (?, ?, 'CREATED', NULL, 'ALLOCATED', 'CUSTOMER', ?, ?)`,
        [
          `evt_${Date.now()}_${randTag}`,
          dispatchId,
          validUserId || cleanPhone,
          JSON.stringify({ fare_thb: totalFareTHB, vehicle_category, transfer_type })
        ]
      );

      // Insert pending payment transaction
      await conn.execute(
        `INSERT INTO taxi_payment_transactions (
          id, dispatch_id, booking_id, amount_thb, payment_method, payment_status, idempotency_key
        ) VALUES (?, ?, ?, ?, ?, 'PENDING', ?)`,
        [
          paymentTxId,
          dispatchId,
          bookingId,
          totalFareTHB,
          payment_method,
          cleanIdempotency ? `ptx_${cleanIdempotency}` : null
        ]
      );

      return {
        booking_id: bookingId,
        dispatch_id: dispatchId,
        total_fare_thb: totalFareTHB,
        currency_snapshot: currencySnapshot,
        ride_status: 'ALLOCATED',
        pickup_address,
        dropoff_address,
        pickup_datetime: finalPickupDatetime,
        passenger_count: passengers,
        luggage_count: luggage,
        vehicle_category,
        model_name: fareDetails.model_name,
        // The plaintext 4-digit ride OTP is sent ONCE to the booking owner
        ride_otp: plainOtp,
        estimated_minutes: fareDetails.estimated_minutes
      };
    });

    // Notify the chosen vendor, admin, and only the drivers whose vehicle fits
    const jobSummary = {
      dispatch_id: result.dispatch_id,
      booking_id: result.booking_id,
      ride_status: 'ALLOCATED',
      pickup_address: result.pickup_address,
      dropoff_address: result.dropoff_address,
      pickup_datetime: result.pickup_datetime,
      passenger_count: passengers,
      luggage_count: luggage,
      vehicle_category: result.vehicle_category,
      total_fare_thb: result.total_fare_thb
    };
    broadcastEvent(`vendor_${vendorId}`, 'NEW_CAB_BOOKING', jobSummary);
    broadcastEvent('admin', 'DISPATCH_CREATED', { ...jobSummary, vendor_id: vendorId });
    try {
      const driverIds = await findEligibleDriverIds(vendorId, {
        passenger_count: passengers,
        luggage_count: luggage,
        vehicle_category
      });
      for (const driverId of driverIds) {
        broadcastEvent(`driver_${driverId}`, 'NEW_DUTY_AVAILABLE', jobSummary);
      }
    } catch (notifyErr) {
      // The booking is already saved; drivers still see it in their offer list
      console.warn('[CabBooking] Driver notification failed:', notifyErr.message);
    }

    // Tell the customer by SMS, WhatsApp and email (runs in the background)
    queueRideNotification(result.dispatch_id, RIDE_EVENTS.BOOKED, { rideOtp: result.ride_otp });

    res.status(201).json({
      success: true,
      message: 'Cab transfer booking created successfully.',
      data: result,
      bookingId: result.booking_id,
      bookingReference: result.booking_reference || result.booking_id,
      dispatchId: result.dispatch_id,
      rideOtp: result.ride_otp,
      vehicleCategory: result.vehicle_category,
      vehicleName: result.model_name,
      passengerCount: passengers,
      luggageCount: luggage,
      // Channels that will carry booking & driver updates to this customer
      updatesVia: getCustomerUpdateChannels(cleanPhone, customer_email),
      fareThb: result.total_fare_thb,
      displayFare: result.currency_snapshot?.customer_total_amount || result.total_fare_thb
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/cabs/history
 * List customer ride dispatches
 */
export async function getCabHistory(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { phone, email } = req.query;
    let sql = `
      SELECT d.*, b.customer_name, b.customer_phone, b.customer_email, b.payment_status,
             drv.full_name as driver_name, drv.phone as driver_phone, drv.vehicle_model as driver_vehicle_model, drv.vehicle_plate as driver_vehicle_plate
      FROM taxi_dispatches d
      JOIN bookings b ON d.booking_id = b.id
      LEFT JOIN drivers drv ON d.driver_id = drv.id
    `;
    const params = [];

    if (req.user.role === 'customer') {
      sql += ' WHERE (b.user_id = ? OR b.customer_phone = ? OR b.customer_email = ?)';
      params.push(req.user.id, req.user.phone || '', req.user.email || '');
    } else if (['admin', 'superadmin'].includes(req.user.role)) {
      if (phone) {
        sql += ' WHERE b.customer_phone = ?';
        params.push(phone);
      }
    } else {
      const resolvedVendor = await resolveVendorId(req.user);
      if (resolvedVendor) {
        sql += ' WHERE d.vendor_id = ?';
        params.push(resolvedVendor);
      }
    }

    sql += ' ORDER BY d.created_at DESC LIMIT 50';

    const dispatches = await query(sql, params);
    // Never expose ride_otp_hash in lists
    const sanitized = dispatches.map(d => {
      const { ride_otp_hash, ...rest } = d;
      return rest;
    });

    res.json({ success: true, data: sanitized });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/cabs/cancel
 * Cancel transfer ride with mandatory reason
 */
export async function cancelCabBooking(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { dispatch_id, booking_id, reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, error: 'A cancellation reason is required.' });
    }

    const targetId = dispatch_id || booking_id;
    if (!targetId) {
      return res.status(400).json({ success: false, error: 'dispatch_id or booking_id is required.' });
    }

    // Lookup dispatch
    const dispatches = await query(
      `SELECT d.*, b.user_id as bkg_user_id, b.customer_phone, b.customer_email 
       FROM taxi_dispatches d
       JOIN bookings b ON d.booking_id = b.id
       WHERE d.id = ? OR d.booking_id = ? LIMIT 1`,
      [targetId, targetId]
    );

    if (dispatches.length === 0) {
      return res.status(404).json({ success: false, error: 'Transfer dispatch not found.' });
    }

    const dispatch = dispatches[0];

    // Ownership check
    const isOwnerOrStaff = await isBookingOwnerOrStaff(
      { id: dispatch.booking_id, user_id: dispatch.bkg_user_id, customer_phone: dispatch.customer_phone, customer_email: dispatch.customer_email, vendor_id: dispatch.vendor_id },
      req.user
    );
    const resolvedDriver = await resolveDriverId(req.user);
    const isAssignedDriver = resolvedDriver && String(resolvedDriver) === String(dispatch.driver_id);

    if (!isOwnerOrStaff && !isAssignedDriver) {
      return res.status(403).json({ success: false, error: 'Access denied: You are not authorized to cancel this dispatch.' });
    }

    // State machine check: cannot cancel ON_TRIP, COMPLETED, or already CANCELLED
    if (['ON_TRIP', 'COMPLETED'].includes(dispatch.ride_status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel a ride that is already ${dispatch.ride_status}.`
      });
    }

    if (dispatch.ride_status === 'CANCELLED') {
      return res.status(400).json({ success: false, error: 'This ride has already been cancelled.' });
    }

    // Execute cancellation
    await withTransaction(async (conn) => {
      await conn.execute(
        `UPDATE taxi_dispatches 
         SET ride_status = 'CANCELLED', cancellation_reason = ?, cancelled_by = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [reason.trim(), req.user.id || req.user.username, dispatch.id]
      );

      await conn.execute(
        `UPDATE bookings SET booking_status = 'Cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [dispatch.booking_id]
      );

      await conn.execute(
        `INSERT INTO taxi_dispatch_events (
          id, dispatch_id, event_type, old_status, new_status, actor_type, actor_id, metadata_json
        ) VALUES (?, ?, 'CANCELLED', ?, 'CANCELLED', ?, ?, ?)`,
        [
          `evt_${Date.now()}_cancel`,
          dispatch.id,
          dispatch.ride_status,
          req.user.role ? req.user.role.toUpperCase() : 'USER',
          req.user.id,
          JSON.stringify({ reason: reason.trim() })
        ]
      );
    });

    // Notify room
    broadcastEvent(`dispatch_${dispatch.id}`, 'TRIP_CANCELLED', {
      dispatch_id: dispatch.id,
      reason: reason.trim(),
      cancelled_by: req.user.role
    });

    res.json({
      success: true,
      message: 'Transfer dispatch has been cancelled.',
      ride_status: 'CANCELLED'
    });
  } catch (err) {
    next(err);
  }
}
