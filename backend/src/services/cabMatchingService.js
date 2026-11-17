// ========================================================================
// WOW THAILAND: Cab Matching Service
// The customer never picks a vehicle. This service decides:
//   1. which vehicle category fits the group (passengers + bags)
//   2. which vendor (taxi owner) has an approved vehicle that fits
//   3. which of that vendor's drivers can take the job
//   4. whether a driver is already busy at that time
// ========================================================================

import { query } from '../config/db.js';

export const CATEGORY_RANK = { SEDAN: 1, SUV: 2, VIP_VAN: 3 };
const CATEGORY_ORDER = ['SEDAN', 'SUV', 'VIP_VAN'];

// Buffer added after each trip before the driver can start another one
const TURNAROUND_MINUTES = 30;

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * Categories that can serve a ride of the given category (same size or bigger).
 */
export function categoriesAtLeast(category) {
  const minRank = CATEGORY_RANK[String(category || 'SEDAN').toUpperCase()] || 1;
  return CATEGORY_ORDER.filter(c => CATEGORY_RANK[c] >= minRank);
}

/**
 * Ride categories a vehicle of the given category can serve (same size or smaller).
 */
export function categoriesServedBy(vehicleCategory) {
  const rank = CATEGORY_RANK[String(vehicleCategory || '').toUpperCase()] || 0;
  return CATEGORY_ORDER.filter(c => CATEGORY_RANK[c] <= rank);
}

/**
 * Validate the group size sent by the customer.
 * Missing values default to 1 passenger / 0 bags; explicit bad values are rejected.
 */
export function parseGroupSize(rawPassengers, rawLuggage) {
  const isMissing = v => v === undefined || v === null || v === '';

  const passengers = isMissing(rawPassengers) ? 1 : Number(rawPassengers);
  if (!Number.isInteger(passengers) || passengers < 1) {
    throw httpError(400, 'Number of passengers must be a whole number of at least 1.');
  }

  const luggage = isMissing(rawLuggage) ? 0 : Number(rawLuggage);
  if (!Number.isInteger(luggage) || luggage < 0) {
    throw httpError(400, 'Number of bags must be a whole number of 0 or more.');
  }

  return { passengers, luggage };
}

/**
 * Pick the smallest vehicle category whose limits fit the group.
 * transfer_tier_pricing is the single source of truth for these limits.
 */
export async function pickVehicleCategory(passengers, luggage) {
  const tiers = await query(
    'SELECT vehicle_category, display_name, max_passengers, max_luggage FROM transfer_tier_pricing WHERE is_active = 1'
  );
  if (tiers.length === 0) {
    throw httpError(500, 'No vehicle categories are configured.');
  }

  tiers.sort((a, b) => (CATEGORY_RANK[a.vehicle_category] || 99) - (CATEGORY_RANK[b.vehicle_category] || 99));

  const fit = tiers.find(t => passengers <= t.max_passengers && luggage <= t.max_luggage);
  if (!fit) {
    const largest = tiers[tiers.length - 1];
    throw httpError(
      400,
      `${passengers} passengers with ${luggage} bags exceeds our largest vehicle ` +
      `(${largest.display_name}: up to ${largest.max_passengers} passengers and ${largest.max_luggage} bags). ` +
      'Please split your group into two bookings.'
    );
  }

  return fit;
}

/**
 * Can this vehicle carry this ride right now?
 */
export function vehicleFitsRide(vehicle, ride) {
  return !getVehicleMismatchReason(vehicle, ride);
}

/**
 * Human-readable reason why a vehicle cannot take a ride, or null if it can.
 */
export function getVehicleMismatchReason(vehicle, ride) {
  if (!vehicle) {
    return 'This driver has no active vehicle. The vendor must assign an approved vehicle and the driver must select it in the Driver Portal.';
  }
  const label = `${vehicle.brand || ''} ${vehicle.model || ''} (${vehicle.plate_number || vehicle.id})`.trim();

  if (vehicle.verification_status !== 'APPROVED') {
    return `Vehicle ${label} is not approved by admin yet.`;
  }
  if (!vehicle.is_available || vehicle.is_maintenance) {
    return `Vehicle ${label} is marked unavailable or under maintenance.`;
  }

  const passengers = Number(ride.passenger_count) || 1;
  const luggage = Number(ride.luggage_count) || 0;
  if (Number(vehicle.seating_capacity) < passengers) {
    return `Vehicle ${label} seats ${vehicle.seating_capacity}, but this ride has ${passengers} passengers.`;
  }
  if (Number(vehicle.luggage_capacity) < luggage) {
    return `Vehicle ${label} holds ${vehicle.luggage_capacity} bags, but this ride has ${luggage} bags.`;
  }

  const required = String(ride.vehicle_category || 'SEDAN').toUpperCase();
  if ((CATEGORY_RANK[vehicle.category] || 0) < (CATEGORY_RANK[required] || 1)) {
    return `Vehicle ${label} is a ${vehicle.category}, but this ride was booked as ${required}.`;
  }

  return null;
}

/**
 * Choose the vendor (taxi owner) for a new ride.
 * A vendor qualifies if it owns at least one approved, available vehicle that fits.
 * Preference order:
 *   1. vendors with at least one online driver already driving a fitting vehicle
 *   2. vendors with fewer unassigned jobs waiting (spreads work between vendors)
 *   3. vendors with more fitting vehicles
 * Returns null when no vendor can serve the ride.
 */
export async function findVendorForRide({ category, passengers, luggage }) {
  const cats = categoriesAtLeast(category);
  const placeholders = cats.map(() => '?').join(', ');

  const rows = await query(
    `SELECT v.vendor_id,
            COUNT(DISTINCT v.id) AS fitting_vehicles,
            COUNT(DISTINCT CASE WHEN d.status = 'available' THEN d.id END) AS online_drivers,
            (SELECT COUNT(*) FROM taxi_dispatches td
              WHERE td.vendor_id = v.vendor_id AND td.ride_status = 'ALLOCATED' AND td.driver_id IS NULL) AS waiting_jobs
     FROM cab_vehicles v
     JOIN vendors vnd ON vnd.id = v.vendor_id AND vnd.verification_status = 'verified'
     LEFT JOIN drivers d ON d.active_vehicle_id = v.id AND d.vendor_id = v.vendor_id
     WHERE v.verification_status = 'APPROVED'
       AND v.is_available = 1
       AND v.is_maintenance = 0
       AND v.seating_capacity >= ?
       AND v.luggage_capacity >= ?
       AND v.category IN (${placeholders})
     GROUP BY v.vendor_id
     ORDER BY (online_drivers > 0) DESC, waiting_jobs ASC, fitting_vehicles DESC, v.vendor_id ASC
     LIMIT 1`,
    [passengers, luggage, ...cats]
  );

  return rows[0] || null;
}

/**
 * IDs of a vendor's online drivers whose active vehicle fits the ride.
 * Used to notify only the drivers who can actually take the job.
 */
export async function findEligibleDriverIds(vendorId, ride) {
  if (!vendorId) return [];
  const cats = categoriesAtLeast(ride.vehicle_category);
  const placeholders = cats.map(() => '?').join(', ');

  const rows = await query(
    `SELECT d.id
     FROM drivers d
     JOIN cab_vehicles v ON v.id = d.active_vehicle_id
     WHERE d.vendor_id = ?
       AND d.status <> 'offline'
       AND v.verification_status = 'APPROVED'
       AND v.is_available = 1
       AND v.is_maintenance = 0
       AND v.seating_capacity >= ?
       AND v.luggage_capacity >= ?
       AND v.category IN (${placeholders})`,
    [vendorId, Number(ride.passenger_count) || 1, Number(ride.luggage_count) || 0, ...cats]
  );

  return rows.map(r => r.id);
}

/**
 * Find another trip of this driver that overlaps the time window of dispatch `dispatchId`.
 * Each trip blocks [pickup, pickup + estimated_minutes + turnaround).
 * The comparison is done entirely in SQL so it does not depend on the JS/MySQL timezone setup.
 * `executor` is either the pooled `query` helper or a transaction connection.
 * Returns the conflicting dispatch row or null.
 */
export async function findDriverScheduleConflict(executor, driverId, dispatchId) {
  const sql =
    `SELECT o.id, o.pickup_datetime, o.ride_status
     FROM taxi_dispatches o
     JOIN taxi_dispatches r ON r.id = ?
     WHERE o.driver_id = ?
       AND o.id <> r.id
       AND o.ride_status IN ('DISPATCHED', 'ARRIVED', 'ON_TRIP')
       AND o.pickup_datetime < DATE_ADD(r.pickup_datetime, INTERVAL (r.estimated_minutes + ${TURNAROUND_MINUTES}) MINUTE)
       AND DATE_ADD(o.pickup_datetime, INTERVAL (o.estimated_minutes + ${TURNAROUND_MINUTES}) MINUTE) > r.pickup_datetime
     LIMIT 1`;
  const params = [dispatchId, driverId];

  if (typeof executor === 'function') {
    const rows = await executor(sql, params);
    return rows[0] || null;
  }
  const [rows] = await executor.execute(sql, params);
  return rows[0] || null;
}

/**
 * Load a vehicle row by id (or null).
 */
export async function loadVehicle(executor, vehicleId) {
  if (!vehicleId) return null;
  const sql = 'SELECT * FROM cab_vehicles WHERE id = ? LIMIT 1';
  if (typeof executor === 'function') {
    const rows = await executor(sql, [vehicleId]);
    return rows[0] || null;
  }
  const [rows] = await executor.execute(sql, [vehicleId]);
  return rows[0] || null;
}
