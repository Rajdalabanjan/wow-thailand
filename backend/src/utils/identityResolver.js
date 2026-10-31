// ========================================================================
// WOW THAILAND: Identity & Ownership Resolver Utility
// Authoritative server-side identity resolution for Vendors, Drivers & Customers
// ========================================================================

import { query } from '../config/db.js';

const ADMIN_ROLES = new Set(['admin', 'superadmin', 'subadmin', 'sub_admin', 'super_admin']);

/**
 * Resolve the authoritative vendor_id for an authenticated user.
 * Returns null if the user is an admin (unrestricted).
 * Returns the vendor record ID if user is a vendor.
 */
export async function resolveVendorId(user) {
  if (!user) return null;
  if (ADMIN_ROLES.has(user.role)) return null;

  try {
    const rows = await query(
      'SELECT id FROM vendors WHERE user_id = ? OR id = ? LIMIT 1',
      [user.id, user.id]
    );
    if (rows.length > 0) {
      return rows[0].id;
    }
  } catch (err) {
    console.warn('[IdentityResolver] Failed to resolve vendor id:', err.message);
  }

  return user.id;
}

/**
 * Resolve the authoritative driver_id for an authenticated user.
 * Returns null if the user is an admin.
 * Returns the drivers record ID if user is a driver.
 */
export async function resolveDriverId(user) {
  if (!user) return null;
  if (ADMIN_ROLES.has(user.role)) return null;

  try {
    const rows = await query(
      'SELECT id FROM drivers WHERE user_id = ? OR id = ? LIMIT 1',
      [user.id, user.id]
    );
    if (rows.length > 0) {
      return rows[0].id;
    }
  } catch (err) {
    console.warn('[IdentityResolver] Failed to resolve driver id:', err.message);
  }

  return user.id;
}

/**
 * Verify whether an authenticated user is authorized to access or modify a booking.
 * Admins: unrestricted.
 * Vendors: booking.vendor_id must match the resolved vendor ID.
 * Customers: booking must belong to the customer (matching user_id, phone, or email).
 */
export async function isBookingOwnerOrStaff(booking, user) {
  if (!user || !booking) return false;
  if (ADMIN_ROLES.has(user.role)) return true;

  if (user.role === 'customer') {
    if (user.id && booking.user_id && String(booking.user_id) === String(user.id)) {
      return true;
    }

    const cleanUserPhone = String(user.phone || '').replace(/\D/g, '');
    const cleanBkgPhone = String(booking.customer_phone || '').replace(/\D/g, '');
    if (cleanUserPhone && cleanBkgPhone && cleanUserPhone.slice(-8) === cleanBkgPhone.slice(-8)) {
      return true;
    }

    const userEmail = String(user.email || '').trim().toLowerCase();
    const bkgEmail = String(booking.customer_email || '').trim().toLowerCase();
    if (userEmail && bkgEmail && userEmail === bkgEmail) {
      return true;
    }

    return false;
  }

  // Partner / Vendor Roles
  const vendorId = await resolveVendorId(user);
  if (vendorId && booking.vendor_id && String(booking.vendor_id) === String(vendorId)) {
    return true;
  }

  // Driver role check
  if (user.role === 'driver') {
    const driverId = await resolveDriverId(user);
    if (driverId) {
      const assignments = await query(
        'SELECT id FROM driver_assignments WHERE booking_id = ? AND driver_id = ? LIMIT 1',
        [booking.id, driverId]
      );
      if (assignments.length > 0) return true;
    }
  }

  return false;
}

/**
 * Check if an authenticated customer is attempting to query another customer's data.
 */
export function verifyCustomerSelfAccess(user, requestedPhone, requestedEmail) {
  if (!user) return false;
  if (ADMIN_ROLES.has(user.role)) return true;

  if (user.role !== 'customer') {
    // Staff/partners have their own role checks
    return true;
  }

  const cleanUserPhone = String(user.phone || '').replace(/\D/g, '');
  if (requestedPhone) {
    const cleanReqPhone = String(requestedPhone).replace(/\D/g, '');
    if (cleanUserPhone && cleanReqPhone && cleanUserPhone.slice(-8) !== cleanReqPhone.slice(-8)) {
      return false;
    }
  }

  const userEmail = String(user.email || '').trim().toLowerCase();
  if (requestedEmail) {
    const reqEmail = String(requestedEmail).trim().toLowerCase();
    if (userEmail && reqEmail && userEmail !== reqEmail) {
      return false;
    }
  }

  return true;
}

