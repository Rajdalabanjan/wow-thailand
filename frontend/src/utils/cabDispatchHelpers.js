// ========================================================================
// Shared helpers for the vendor and admin cab dispatch screens
// ========================================================================

const CATEGORY_RANK = { SEDAN: 1, SUV: 2, VIP_VAN: 3 };

export const CATEGORY_LABEL = { SEDAN: 'Sedan', SUV: 'SUV', VIP_VAN: 'VIP Van' };

// How often the dispatch screens re-check for new bookings
export const DISPATCH_POLL_MS = 10000;

/**
 * "4 passengers · 3 bags"
 */
export function groupSizeLabel(dispatch) {
  const pax = Number(dispatch?.passenger_count) || 1;
  const bags = Number(dispatch?.luggage_count) || 0;
  return `${pax} ${pax === 1 ? 'passenger' : 'passengers'} · ${bags} ${bags === 1 ? 'bag' : 'bags'}`;
}

/**
 * Why a driver's active vehicle cannot take this ride, or null if it can.
 * Mirrors getVehicleMismatchReason() in backend/src/services/cabMatchingService.js;
 * the backend still enforces it, this only lets the screen warn early.
 * Returns null (unknown) when the driver row has no vehicle details.
 */
export function driverFitProblem(driver, dispatch) {
  if (!driver || !('active_vehicle_category' in driver)) return null;
  if (!driver.active_vehicle_id || !driver.active_vehicle_category) return 'no active vehicle';
  if (driver.active_vehicle_status && driver.active_vehicle_status !== 'APPROVED') return 'vehicle not approved';
  if (driver.active_vehicle_available === 0 || driver.active_vehicle_maintenance === 1) return 'vehicle unavailable';

  const pax = Number(dispatch?.passenger_count) || 1;
  const bags = Number(dispatch?.luggage_count) || 0;
  if (Number(driver.active_vehicle_seats) < pax) return `only ${driver.active_vehicle_seats} seats`;
  if (Number(driver.active_vehicle_bags) < bags) return `only ${driver.active_vehicle_bags} bags`;

  const required = String(dispatch?.vehicle_category || 'SEDAN').toUpperCase();
  if ((CATEGORY_RANK[driver.active_vehicle_category] || 0) < (CATEGORY_RANK[required] || 1)) {
    return `${CATEGORY_LABEL[driver.active_vehicle_category] || driver.active_vehicle_category} is smaller than ${CATEGORY_LABEL[required] || required}`;
  }
  return null;
}

/**
 * Open (unassigned) jobs in `dispatches` whose id is not in `seenIds`.
 */
export function findNewOpenJobs(seenIds, dispatches) {
  return dispatches.filter(d => d.ride_status === 'ALLOCATED' && !d.driver_id && !seenIds.has(d.id));
}
