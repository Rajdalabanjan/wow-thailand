// ========================================================================
// WOW THAILAND: Cab & Airport Transfer Pricing Service
// Server-side authoritative fare calculations in THB
// Supports fixed airport routes and distance-based tier pricing
// ========================================================================

import { query } from '../config/db.js';
import { createCurrencySnapshot, convertFromTHB } from './currencyService.js';

/**
 * Approximate distance between two coordinates in kilometers (Haversine formula)
 */
export function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  // Multiply by road curvature factor (~1.25)
  return Math.round(d * 1.25 * 10) / 10;
}

/**
 * Find matching fixed route from transfer_routes if locations match
 */
export async function matchFixedRoute(pickupName, dropoffName, routeId = null) {
  if (routeId) {
    const routes = await query('SELECT * FROM transfer_routes WHERE id = ? LIMIT 1', [routeId]);
    if (routes.length > 0) return routes[0];
  }

  if (!pickupName || !dropoffName) return null;
  const pLower = pickupName.toLowerCase();
  const dLower = dropoffName.toLowerCase();

  const allRoutes = await query('SELECT * FROM transfer_routes');
  for (const r of allRoutes) {
    const orig = (r.origin_name || '').toLowerCase();
    const dest = (r.destination_name || '').toLowerCase();
    if (
      (pLower.includes(orig) || orig.includes(pLower) || (pLower.includes('bkk') && orig.includes('suvarnabhumi')) || (pLower.includes('dmk') && orig.includes('don mueang')) || (pLower.includes('hkt') && orig.includes('phuket'))) &&
      (dLower.includes(dest) || dest.includes(dLower) || (dLower.includes('bangkok') && dest.includes('bangkok')) || (dLower.includes('pattaya') && dest.includes('pattaya')) || (dLower.includes('patong') && dest.includes('patong')))
    ) {
      return r;
    }
  }

  return null;
}

/**
 * Calculate authoritative fare for a vehicle category
 */
export async function calculateFare({
  routeId = null,
  pickupAddress = '',
  dropoffAddress = '',
  pickupLat = null,
  pickupLng = null,
  dropoffLat = null,
  dropoffLng = null,
  distanceKm = null,
  vehicleCategory = 'SEDAN',
  targetCurrency = 'THB'
}) {
  const normCategory = (vehicleCategory || 'SEDAN').toUpperCase();
  const allowedCategories = ['SEDAN', 'SUV', 'VIP_VAN'];
  if (!allowedCategories.includes(normCategory)) {
    const err = new Error(`Invalid vehicle category: ${vehicleCategory}. Must be one of ${allowedCategories.join(', ')}.`);
    err.statusCode = 400;
    throw err;
  }

  // 1. Check for fixed route pricing first
  const fixedRoute = await matchFixedRoute(pickupAddress, dropoffAddress, routeId);
  if (fixedRoute) {
    const fixedPricing = await query(
      'SELECT * FROM transfer_vehicle_pricing WHERE route_id = ? AND vehicle_category = ? LIMIT 1',
      [fixedRoute.id, normCategory]
    );

    if (fixedPricing.length > 0) {
      const fp = fixedPricing[0];
      const fareTHB = parseFloat(fp.fare_thb);
      const snapshot = createCurrencySnapshot(fareTHB, targetCurrency);

      return {
        pricing_model: 'FIXED_ROUTE',
        route_id: fixedRoute.id,
        route_name: fixedRoute.route_name,
        estimated_minutes: fixedRoute.estimated_minutes || 45,
        distance_km: distanceKm || 30.0,
        vehicle_category: normCategory,
        model_name: fp.model_name,
        max_passengers: fp.max_passengers,
        max_luggage: fp.max_luggage,
        base_fare_thb: fareTHB,
        toll_fee_thb: 0.00,
        total_fare_thb: fareTHB,
        currency_snapshot: snapshot
      };
    }
  }

  // 2. Fall back to distance-based pricing using transfer_tier_pricing
  const tiers = await query('SELECT * FROM transfer_tier_pricing WHERE vehicle_category = ? LIMIT 1', [normCategory]);
  if (tiers.length === 0) {
    const err = new Error(`Pricing tier not configured for category: ${normCategory}`);
    err.statusCode = 500;
    throw err;
  }

  const tier = tiers[0];
  let calculatedDistance = parseFloat(distanceKm);
  if (!calculatedDistance || calculatedDistance <= 0) {
    if (pickupLat && pickupLng && dropoffLat && dropoffLng) {
      calculatedDistance = calculateHaversineDistanceKm(
        parseFloat(pickupLat),
        parseFloat(pickupLng),
        parseFloat(dropoffLat),
        parseFloat(dropoffLng)
      );
    }
  }

  // If still no distance, default to average city transfer (25 km)
  if (!calculatedDistance || calculatedDistance <= 0) {
    calculatedDistance = 25.0;
  }

  const baseFare = parseFloat(tier.base_fare_thb);
  const perKmRate = parseFloat(tier.per_km_rate_thb);
  const minFare = parseFloat(tier.minimum_fare_thb);

  const rawFare = baseFare + (calculatedDistance * perKmRate);
  const totalFareTHB = Math.max(minFare, Math.round(rawFare));
  const estimatedMinutes = Math.max(15, Math.round(calculatedDistance * 1.8));

  const snapshot = createCurrencySnapshot(totalFareTHB, targetCurrency);

  return {
    pricing_model: 'DISTANCE_BASED',
    route_id: null,
    route_name: `${pickupAddress || 'Pickup'} ➔ ${dropoffAddress || 'Destination'}`,
    estimated_minutes: estimatedMinutes,
    distance_km: calculatedDistance,
    vehicle_category: normCategory,
    model_name: tier.display_name,
    max_passengers: tier.max_passengers,
    max_luggage: tier.max_luggage,
    base_fare_thb: totalFareTHB,
    toll_fee_thb: 0.00,
    total_fare_thb: totalFareTHB,
    currency_snapshot: snapshot
  };
}

/**
 * Estimate fares for all available categories
 */
export async function estimateAllTiers(params) {
  const categories = ['SEDAN', 'SUV', 'VIP_VAN'];
  const estimates = [];

  for (const cat of categories) {
    const est = await calculateFare({ ...params, vehicleCategory: cat });
    estimates.push(est);
  }

  return estimates;
}

