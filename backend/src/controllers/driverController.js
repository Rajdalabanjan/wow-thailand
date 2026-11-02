// ========================================================================
// WOW THAILAND: Driver Portal Controller (Airport Transfers)
// ========================================================================

import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../config/db.js';
import { resolveDriverId, resolveVendorId } from '../utils/identityResolver.js';

const ADMIN_ROLES = new Set(['admin', 'superadmin', 'subadmin', 'sub_admin', 'super_admin']);
const VENDOR_ROLES = new Set(['transfer_vendor', 'cab_vendor', 'vendor', 'vehicle_vendor', 'hotel_vendor']);

export async function getDriverJobs(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const resolvedDriverId = await resolveDriverId(req.user);
    const requestedDriverId = req.query.driver_id;

    // Driver ownership check
    if (resolvedDriverId && requestedDriverId && String(requestedDriverId) !== String(resolvedDriverId) && String(requestedDriverId) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Drivers cannot view other drivers\' assigned jobs.'
      });
    }

    const effectiveDriverId = resolvedDriverId || requestedDriverId || req.user.id;

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
      [effectiveDriverId]
    );

    res.json({ success: true, data: jobs });
  } catch (err) {
    next(err);
  }
}

export async function updateJobStatus(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['ASSIGNED', 'ACCEPTED', 'ON_WAY', 'COMPLETED', 'CANCELLED'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status.' });
    }

    // Verify assignment exists
    const assignments = await query('SELECT * FROM driver_assignments WHERE id = ?', [id]);
    if (assignments.length === 0) {
      return res.status(404).json({ success: false, error: 'Driver job not found.' });
    }
    const assignment = assignments[0];

    // Enforce driver ownership
    const resolvedDriverId = await resolveDriverId(req.user);
    if (resolvedDriverId && String(assignment.driver_id) !== String(resolvedDriverId) && String(assignment.driver_id) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Drivers cannot modify unrelated driver jobs.'
      });
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

/**
 * GET /api/v1/vendor/drivers
 * Vendor views only their own drivers; Admin views all drivers or filters by vendor_id
 */
export async function getVendorDrivers(req, res, next) {
  try {
    if (!req.user || (!ADMIN_ROLES.has(req.user.role) && !VENDOR_ROLES.has(req.user.role))) {
      return res.status(403).json({ success: false, error: 'Staff or Vendor authorization required.' });
    }

    let sql = 'SELECT * FROM drivers';
    const params = [];

    if (!ADMIN_ROLES.has(req.user.role)) {
      const resolvedVendor = await resolveVendorId(req.user);
      sql += ' WHERE vendor_id = ?';
      params.push(resolvedVendor || 'vnd-cabs-01');
    } else if (req.query.vendor_id) {
      sql += ' WHERE vendor_id = ?';
      params.push(req.query.vendor_id);
    }

    sql += ' ORDER BY created_at DESC';
    const drivers = await query(sql, params);

    res.json({
      success: true,
      data: drivers
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/vendor/drivers
 * Register a new chauffeur under the authenticated vendor's fleet
 */
export async function createVendorDriver(req, res, next) {
  try {
    if (!req.user || (!ADMIN_ROLES.has(req.user.role) && !VENDOR_ROLES.has(req.user.role))) {
      return res.status(403).json({ success: false, error: 'Staff or Vendor authorization required.' });
    }

    const { full_name, phone, license_number, vehicle_model, vehicle_plate, vendor_id: requestedVendorId } = req.body;
    if (!full_name || !phone || !license_number) {
      return res.status(400).json({ success: false, error: 'Chauffeur full_name, phone, and license_number are required.' });
    }

    let targetVendorId;
    if (ADMIN_ROLES.has(req.user.role)) {
      targetVendorId = requestedVendorId || 'vnd-cabs-01';
    } else {
      targetVendorId = await resolveVendorId(req.user);
    }

    const cleanPhone = phone.trim();
    const userId = `usr_drv_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const driverId = `drv_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const passwordHash = await bcrypt.hash('Driver@123', 10);
    const username = `drv_${cleanPhone.replace(/[^0-9]/g, '').slice(-8) || Date.now()}`;
    const email = `${username}@driver.wowthailand.com`;

    const result = await withTransaction(async (conn) => {
      // 1. Insert into users
      await conn.execute(
        `INSERT INTO users (id, username, email, phone, role, password_hash)
         VALUES (?, ?, ?, ?, 'driver', ?)`,
        [userId, username, email, cleanPhone, passwordHash]
      );

      // 2. Insert into drivers
      await conn.execute(
        `INSERT INTO drivers (
          id, user_id, full_name, phone, license_number, vehicle_model, vehicle_plate, status, vendor_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'available', ?)`,
        [driverId, userId, full_name.trim(), cleanPhone, license_number.trim(), vehicle_model ? vehicle_model.trim() : 'Toyota Camry VIP', vehicle_plate ? vehicle_plate.trim() : '1กข 0000', targetVendorId]
      );

      return {
        id: driverId,
        user_id: userId,
        full_name: full_name.trim(),
        phone: cleanPhone,
        license_number: license_number.trim(),
        vehicle_model: vehicle_model ? vehicle_model.trim() : 'Toyota Camry VIP',
        vehicle_plate: vehicle_plate ? vehicle_plate.trim() : '1กข 0000',
        status: 'available',
        vendor_id: targetVendorId
      };
    });

    res.status(201).json({
      success: true,
      message: 'Chauffeur successfully registered to vendor roster.',
      data: result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/vendor/drivers/:id
 * Update chauffeur details with vendor ownership check
 */
export async function updateVendorDriver(req, res, next) {
  try {
    if (!req.user || (!ADMIN_ROLES.has(req.user.role) && !VENDOR_ROLES.has(req.user.role))) {
      return res.status(403).json({ success: false, error: 'Staff or Vendor authorization required.' });
    }

    const { id } = req.params;
    const existing = await query('SELECT * FROM drivers WHERE id = ? LIMIT 1', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Driver not found.' });
    }
    const drv = existing[0];

    // Ownership check for vendors
    if (!ADMIN_ROLES.has(req.user.role)) {
      const resolvedVendor = await resolveVendorId(req.user);
      if (drv.vendor_id && String(drv.vendor_id) !== String(resolvedVendor)) {
        return res.status(403).json({ success: false, error: 'Access denied: You cannot modify another vendor\'s chauffeur.' });
      }
    }

    const { full_name, phone, license_number, vehicle_model, vehicle_plate, status } = req.body;
    const newName = full_name !== undefined ? full_name : drv.full_name;
    const newPhone = phone !== undefined ? phone : drv.phone;
    const newLicense = license_number !== undefined ? license_number : drv.license_number;
    const newModel = vehicle_model !== undefined ? vehicle_model : drv.vehicle_model;
    const newPlate = vehicle_plate !== undefined ? vehicle_plate : drv.vehicle_plate;
    const newStatus = status !== undefined ? status : drv.status;

    await query(
      `UPDATE drivers 
       SET full_name = ?, phone = ?, license_number = ?, vehicle_model = ?, vehicle_plate = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newName, newPhone, newLicense, newModel, newPlate, newStatus, id]
    );

    res.json({
      success: true,
      message: 'Chauffeur details updated successfully.',
      data: {
        id,
        full_name: newName,
        phone: newPhone,
        license_number: newLicense,
        vehicle_model: newModel,
        vehicle_plate: newPlate,
        status: newStatus
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/vendor/drivers/:id
 * Remove chauffeur from vendor roster
 */
export async function deleteVendorDriver(req, res, next) {
  try {
    if (!req.user || (!ADMIN_ROLES.has(req.user.role) && !VENDOR_ROLES.has(req.user.role))) {
      return res.status(403).json({ success: false, error: 'Staff or Vendor authorization required.' });
    }

    const { id } = req.params;
    const existing = await query('SELECT * FROM drivers WHERE id = ? LIMIT 1', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Driver not found.' });
    }
    const drv = existing[0];

    // Ownership check for vendors
    if (!ADMIN_ROLES.has(req.user.role)) {
      const resolvedVendor = await resolveVendorId(req.user);
      if (drv.vendor_id && String(drv.vendor_id) !== String(resolvedVendor)) {
        return res.status(403).json({ success: false, error: 'Access denied: You cannot remove another vendor\'s chauffeur.' });
      }
    }

    if (drv.status === 'on_trip') {
      return res.status(400).json({ success: false, error: 'Cannot remove a chauffeur while actively on a trip.' });
    }

    await query('DELETE FROM drivers WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Chauffeur successfully unlinked from roster.'
    });
  } catch (err) {
    next(err);
  }
}

