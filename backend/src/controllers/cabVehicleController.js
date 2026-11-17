// ========================================================================
// WOW THAILAND: Cab Fleet Vehicle Management Controller
// Handles vehicle registration, documents, vendor fleet CRUD, admin verification,
// and driver-vehicle assignment relations.
// ========================================================================

import crypto from 'crypto';
import { query, withTransaction } from '../config/db.js';
import { resolveVendorId, resolveDriverId } from '../utils/identityResolver.js';

const ADMIN_ROLES = new Set(['admin', 'superadmin', 'subadmin', 'sub_admin', 'super_admin']);
const VENDOR_ROLES = new Set(['transfer_vendor', 'cab_vendor', 'vendor', 'vehicle_vendor', 'hotel_vendor']);

/**
 * GET /api/v1/vendor/fleet-vehicles
 * Retrieve vendor's registered cab vehicles with driver assignment info
 */
export async function getVendorVehicles(req, res, next) {
  try {
    if (!req.user || (!ADMIN_ROLES.has(req.user.role) && !VENDOR_ROLES.has(req.user.role))) {
      return res.status(403).json({ success: false, error: 'Staff or Vendor authorization required.' });
    }

    let targetVendorId = null;
    if (ADMIN_ROLES.has(req.user.role)) {
      targetVendorId = req.query.vendor_id || null;
    } else {
      targetVendorId = await resolveVendorId(req.user);
      if (!targetVendorId) {
        return res.status(403).json({ success: false, error: 'Vendor profile not found for this account.' });
      }
    }

    let sql = `
      SELECT v.*, vnd.business_name as vendor_business_name,
             (
               SELECT JSON_ARRAYAGG(
                 JSON_OBJECT(
                   'driver_id', d.id,
                   'driver_name', d.full_name,
                   'driver_phone', d.phone,
                   'is_active', dva.is_active
                 )
               )
               FROM driver_vehicle_assignments dva
               JOIN drivers d ON dva.driver_id = d.id
               WHERE dva.vehicle_id = v.id
             ) as assigned_drivers
      FROM cab_vehicles v
      JOIN vendors vnd ON v.vendor_id = vnd.id
    `;
    const params = [];

    if (targetVendorId) {
      sql += ` WHERE v.vendor_id = ?`;
      params.push(targetVendorId);
    }

    sql += ` ORDER BY v.created_at DESC`;

    const vehicles = await query(sql, params);

    // Format assigned drivers
    const formatted = vehicles.map(v => {
      let driversList = [];
      if (v.assigned_drivers) {
        try {
          driversList = typeof v.assigned_drivers === 'string' ? JSON.parse(v.assigned_drivers) : v.assigned_drivers;
          if (!Array.isArray(driversList)) driversList = [];
        } catch (e) {
          driversList = [];
        }
      }
      return {
        ...v,
        assigned_drivers: driversList
      };
    });

    res.json({
      success: true,
      data: formatted,
      count: formatted.length
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/vendor/fleet-vehicles
 * Register a new cab transfer vehicle with document URLs & capacities
 */
export async function createVendorVehicle(req, res, next) {
  try {
    if (!req.user || (!ADMIN_ROLES.has(req.user.role) && !VENDOR_ROLES.has(req.user.role))) {
      return res.status(403).json({ success: false, error: 'Staff or Vendor authorization required.' });
    }

    let targetVendorId = null;
    if (ADMIN_ROLES.has(req.user.role)) {
      targetVendorId = req.body.vendor_id || 'vnd-bangkok-cabs';
    } else {
      targetVendorId = await resolveVendorId(req.user);
      if (!targetVendorId) {
        return res.status(403).json({ success: false, error: 'Vendor profile not found for this account.' });
      }
    }

    const {
      brand,
      model,
      plate_number,
      color,
      category = 'SEDAN',
      seating_capacity,
      luggage_capacity,
      photo_url,
      registration_doc_url,
      insurance_doc_url,
      permit_doc_url
    } = req.body;

    if (!brand || !model || !plate_number || !color) {
      return res.status(400).json({
        success: false,
        error: 'Brand, model, Thai plate number, and color are mandatory.'
      });
    }

    const validCategories = ['SEDAN', 'SUV', 'VIP_VAN'];
    const normCategory = String(category).toUpperCase();
    if (!validCategories.includes(normCategory)) {
      return res.status(400).json({
        success: false,
        error: `Category must be one of: ${validCategories.join(', ')}`
      });
    }

    // Default capacities based on vehicle category if not explicitly provided
    let seats = seating_capacity ? parseInt(seating_capacity, 10) : (normCategory === 'VIP_VAN' ? 10 : (normCategory === 'SUV' ? 6 : 4));
    let luggage = luggage_capacity ? parseInt(luggage_capacity, 10) : (normCategory === 'VIP_VAN' ? 8 : (normCategory === 'SUV' ? 4 : 2));

    if (seats < 1 || seats > 30) {
      return res.status(400).json({ success: false, error: 'Seating capacity must be between 1 and 30 passengers.' });
    }

    // Check duplicate plate number
    const existing = await query('SELECT id FROM cab_vehicles WHERE plate_number = ? LIMIT 1', [plate_number.trim()]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: `A vehicle with plate number "${plate_number.trim()}" is already registered.`
      });
    }

    const vehicleId = `veh_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    await query(
      `INSERT INTO cab_vehicles (
        id, vendor_id, brand, model, plate_number, color, category,
        seating_capacity, luggage_capacity, photo_url,
        registration_doc_url, insurance_doc_url, permit_doc_url,
        verification_status, is_available
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', 1)`,
      [
        vehicleId,
        targetVendorId,
        brand.trim(),
        model.trim(),
        plate_number.trim(),
        color.trim(),
        normCategory,
        seats,
        luggage,
        photo_url || null,
        registration_doc_url || null,
        insurance_doc_url || null,
        permit_doc_url || null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Vehicle registered successfully and submitted for Admin verification.',
      data: {
        id: vehicleId,
        vendor_id: targetVendorId,
        brand: brand.trim(),
        model: model.trim(),
        plate_number: plate_number.trim(),
        color: color.trim(),
        category: normCategory,
        seating_capacity: seats,
        luggage_capacity: luggage,
        verification_status: 'PENDING_APPROVAL',
        is_available: 1
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/vendor/fleet-vehicles/:id
 * Update vehicle details or toggle availability/maintenance
 */
export async function updateVendorVehicle(req, res, next) {
  try {
    if (!req.user || (!ADMIN_ROLES.has(req.user.role) && !VENDOR_ROLES.has(req.user.role))) {
      return res.status(403).json({ success: false, error: 'Staff or Vendor authorization required.' });
    }

    const { id } = req.params;
    const existing = await query('SELECT * FROM cab_vehicles WHERE id = ? LIMIT 1', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Vehicle not found.' });
    }
    const veh = existing[0];

    // Ownership check for vendors
    if (!ADMIN_ROLES.has(req.user.role)) {
      const resolvedVendor = await resolveVendorId(req.user);
      if (veh.vendor_id && String(veh.vendor_id) !== String(resolvedVendor)) {
        return res.status(403).json({ success: false, error: 'Access denied: You cannot modify another vendor\'s fleet vehicle.' });
      }
    }

    const {
      brand,
      model,
      plate_number,
      color,
      category,
      seating_capacity,
      luggage_capacity,
      photo_url,
      registration_doc_url,
      insurance_doc_url,
      permit_doc_url,
      is_available,
      is_maintenance
    } = req.body;

    const newBrand = brand !== undefined ? brand.trim() : veh.brand;
    const newModel = model !== undefined ? model.trim() : veh.model;
    const newPlate = plate_number !== undefined ? plate_number.trim() : veh.plate_number;
    const newColor = color !== undefined ? color.trim() : veh.color;
    const newCat = category !== undefined ? String(category).toUpperCase() : veh.category;
    const newSeats = seating_capacity !== undefined ? parseInt(seating_capacity, 10) : veh.seating_capacity;
    const newLuggage = luggage_capacity !== undefined ? parseInt(luggage_capacity, 10) : veh.luggage_capacity;
    const newPhoto = photo_url !== undefined ? photo_url : veh.photo_url;
    const newRegDoc = registration_doc_url !== undefined ? registration_doc_url : veh.registration_doc_url;
    const newInsDoc = insurance_doc_url !== undefined ? insurance_doc_url : veh.insurance_doc_url;
    const newPermitDoc = permit_doc_url !== undefined ? permit_doc_url : veh.permit_doc_url;
    const newAvail = is_available !== undefined ? (is_available ? 1 : 0) : veh.is_available;
    const newMaint = is_maintenance !== undefined ? (is_maintenance ? 1 : 0) : veh.is_maintenance;

    // Check duplicate plate if changed
    if (newPlate !== veh.plate_number) {
      const dup = await query('SELECT id FROM cab_vehicles WHERE plate_number = ? AND id != ? LIMIT 1', [newPlate, id]);
      if (dup.length > 0) {
        return res.status(409).json({ success: false, error: `Plate number "${newPlate}" is already in use.` });
      }
    }

    await query(
      `UPDATE cab_vehicles SET
        brand = ?, model = ?, plate_number = ?, color = ?, category = ?,
        seating_capacity = ?, luggage_capacity = ?, photo_url = ?,
        registration_doc_url = ?, insurance_doc_url = ?, permit_doc_url = ?,
        is_available = ?, is_maintenance = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        newBrand, newModel, newPlate, newColor, newCat,
        newSeats, newLuggage, newPhoto,
        newRegDoc, newInsDoc, newPermitDoc,
        newAvail, newMaint, id
      ]
    );

    res.json({
      success: true,
      message: 'Fleet vehicle updated successfully.',
      data: {
        id,
        brand: newBrand,
        model: newModel,
        plate_number: newPlate,
        color: newColor,
        category: newCat,
        seating_capacity: newSeats,
        luggage_capacity: newLuggage,
        is_available: newAvail,
        is_maintenance: newMaint,
        verification_status: veh.verification_status
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/vendor/fleet-vehicles/:id
 * Remove vehicle from vendor fleet if not on an active trip
 */
export async function deleteVendorVehicle(req, res, next) {
  try {
    if (!req.user || (!ADMIN_ROLES.has(req.user.role) && !VENDOR_ROLES.has(req.user.role))) {
      return res.status(403).json({ success: false, error: 'Staff or Vendor authorization required.' });
    }

    const { id } = req.params;
    const existing = await query('SELECT * FROM cab_vehicles WHERE id = ? LIMIT 1', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Vehicle not found.' });
    }
    const veh = existing[0];

    // Ownership check for vendors
    if (!ADMIN_ROLES.has(req.user.role)) {
      const resolvedVendor = await resolveVendorId(req.user);
      if (veh.vendor_id && String(veh.vendor_id) !== String(resolvedVendor)) {
        return res.status(403).json({ success: false, error: 'Access denied: You cannot delete another vendor\'s fleet vehicle.' });
      }
    }

    // Check if vehicle has any active trips
    const activeTrips = await query(
      `SELECT id FROM taxi_dispatches 
       WHERE vehicle_id = ? AND ride_status IN ('ALLOCATED', 'DISPATCHED', 'ARRIVED', 'ON_TRIP') LIMIT 1`,
      [id]
    );
    if (activeTrips.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete vehicle while it is assigned to an active trip.'
      });
    }

    await query('DELETE FROM cab_vehicles WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Vehicle removed from fleet successfully.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/vendor/fleet-vehicles/assign
 * Assign an approved vehicle to a driver
 */
export async function assignVehicleToDriver(req, res, next) {
  try {
    if (!req.user || (!ADMIN_ROLES.has(req.user.role) && !VENDOR_ROLES.has(req.user.role))) {
      return res.status(403).json({ success: false, error: 'Staff or Vendor authorization required.' });
    }

    const { vehicle_id, driver_id } = req.body;
    if (!vehicle_id || !driver_id) {
      return res.status(400).json({ success: false, error: 'Both vehicle_id and driver_id are required.' });
    }

    // 1. Verify vehicle exists and is APPROVED
    const vehicles = await query('SELECT * FROM cab_vehicles WHERE id = ? LIMIT 1', [vehicle_id]);
    if (vehicles.length === 0) {
      return res.status(404).json({ success: false, error: 'Vehicle not found.' });
    }
    const veh = vehicles[0];

    if (veh.verification_status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        error: `Cannot assign vehicle with status "${veh.verification_status}". Vehicles must be APPROVED by Admin before assignment.`
      });
    }

    if (veh.is_maintenance) {
      return res.status(400).json({
        success: false,
        error: 'Cannot assign a vehicle currently marked for maintenance.'
      });
    }

    // 2. Verify driver exists
    const drivers = await query('SELECT * FROM drivers WHERE id = ? LIMIT 1', [driver_id]);
    if (drivers.length === 0) {
      return res.status(404).json({ success: false, error: 'Chauffeur not found.' });
    }
    const drv = drivers[0];

    // Ownership check for vendors
    let vendorId = veh.vendor_id;
    if (!ADMIN_ROLES.has(req.user.role)) {
      const resolvedVendor = await resolveVendorId(req.user);
      if (String(veh.vendor_id) !== String(resolvedVendor) || (drv.vendor_id && String(drv.vendor_id) !== String(resolvedVendor))) {
        return res.status(403).json({ success: false, error: 'Access denied: Both vehicle and driver must belong to your fleet.' });
      }
      vendorId = resolvedVendor;
    }

    const assignmentId = `dva_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;

    await withTransaction(async (conn) => {
      // Insert or update assignment
      await conn.execute(
        `INSERT INTO driver_vehicle_assignments (id, vendor_id, driver_id, vehicle_id, is_active)
         VALUES (?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE is_active = 1, updated_at = CURRENT_TIMESTAMP`,
        [assignmentId, vendorId, driver_id, vehicle_id]
      );

      // Set as driver's active vehicle and sync model & plate
      await conn.execute(
        `UPDATE drivers 
         SET active_vehicle_id = ?, vehicle_model = ?, vehicle_plate = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [vehicle_id, `${veh.brand} ${veh.model}`, veh.plate_number, driver_id]
      );
    });

    res.json({
      success: true,
      message: `Chauffeur "${drv.full_name}" assigned to vehicle "${veh.brand} ${veh.model} (${veh.plate_number})".`,
      data: {
        driver_id,
        vehicle_id,
        vehicle_model: `${veh.brand} ${veh.model}`,
        vehicle_plate: veh.plate_number,
        category: veh.category,
        seating_capacity: veh.seating_capacity
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/vendor/fleet-vehicles/unassign
 * Unassign vehicle from driver
 */
export async function unassignVehicleFromDriver(req, res, next) {
  try {
    if (!req.user || (!ADMIN_ROLES.has(req.user.role) && !VENDOR_ROLES.has(req.user.role))) {
      return res.status(403).json({ success: false, error: 'Staff or Vendor authorization required.' });
    }

    const { vehicle_id, driver_id } = req.body;
    if (!vehicle_id || !driver_id) {
      return res.status(400).json({ success: false, error: 'Both vehicle_id and driver_id are required.' });
    }

    await withTransaction(async (conn) => {
      await conn.execute(
        'DELETE FROM driver_vehicle_assignments WHERE vehicle_id = ? AND driver_id = ?',
        [vehicle_id, driver_id]
      );

      // If this was the driver's active vehicle, unset it
      await conn.execute(
        'UPDATE drivers SET active_vehicle_id = NULL WHERE id = ? AND active_vehicle_id = ?',
        [driver_id, vehicle_id]
      );
    });

    res.json({
      success: true,
      message: 'Vehicle successfully unassigned from chauffeur.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/admin/fleet-vehicles
 * Admin/Super Admin global fleet inspection across all vendors
 */
export async function getAdminFleetVehicles(req, res, next) {
  try {
    if (!req.user || !ADMIN_ROLES.has(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Staff or Admin privileges required.' });
    }

    const { status, vendor_id } = req.query;
    let sql = `
      SELECT v.*, vnd.business_name as vendor_business_name, vnd.contact_phone as vendor_phone,
             (
               SELECT JSON_ARRAYAGG(
                 JSON_OBJECT(
                   'driver_id', d.id,
                   'driver_name', d.full_name,
                   'driver_phone', d.phone,
                   'is_active', dva.is_active
                 )
               )
               FROM driver_vehicle_assignments dva
               JOIN drivers d ON dva.driver_id = d.id
               WHERE dva.vehicle_id = v.id
             ) as assigned_drivers
      FROM cab_vehicles v
      JOIN vendors vnd ON v.vendor_id = vnd.id
    `;
    const params = [];
    const conditions = [];

    if (status) {
      conditions.push('v.verification_status = ?');
      params.push(status);
    }
    if (vendor_id) {
      conditions.push('v.vendor_id = ?');
      params.push(vendor_id);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY v.created_at DESC';

    const vehicles = await query(sql, params);

    const formatted = vehicles.map(v => {
      let driversList = [];
      if (v.assigned_drivers) {
        try {
          driversList = typeof v.assigned_drivers === 'string' ? JSON.parse(v.assigned_drivers) : v.assigned_drivers;
          if (!Array.isArray(driversList)) driversList = [];
        } catch (e) {
          driversList = [];
        }
      }
      return {
        ...v,
        assigned_drivers: driversList
      };
    });

    res.json({
      success: true,
      data: formatted,
      count: formatted.length
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/admin/fleet-vehicles/:id/verify
 * Admin verifies vehicle details and documents
 */
export async function verifyAdminFleetVehicle(req, res, next) {
  try {
    if (!req.user || !ADMIN_ROLES.has(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Staff or Admin privileges required.' });
    }

    const { id } = req.params;
    const { status, rejection_reason } = req.body;

    const allowed = ['APPROVED', 'REJECTED', 'PENDING_APPROVAL'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, error: `Status must be one of: ${allowed.join(', ')}` });
    }

    const vehicles = await query('SELECT * FROM cab_vehicles WHERE id = ? LIMIT 1', [id]);
    if (vehicles.length === 0) {
      return res.status(404).json({ success: false, error: 'Vehicle not found.' });
    }

    await query(
      `UPDATE cab_vehicles 
       SET verification_status = ?, rejection_reason = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, status === 'REJECTED' ? (rejection_reason || 'Documents incomplete or invalid') : null, id]
    );

    res.json({
      success: true,
      message: `Vehicle ${id} verification status updated to ${status}.`,
      data: {
        id,
        verification_status: status,
        rejection_reason: status === 'REJECTED' ? rejection_reason : null
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/driver/select-vehicle
 * Chauffeur selects their active vehicle for shift before going online
 */
export async function selectActiveVehicle(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const driverId = await resolveDriverId(req.user);
    if (!driverId) {
      return res.status(403).json({ success: false, error: 'Chauffeur account required.' });
    }

    const { vehicle_id } = req.body;
    if (!vehicle_id) {
      return res.status(400).json({ success: false, error: 'vehicle_id is required.' });
    }

    // 1. Check vehicle exists and is APPROVED
    const vehicles = await query('SELECT * FROM cab_vehicles WHERE id = ? LIMIT 1', [vehicle_id]);
    if (vehicles.length === 0) {
      return res.status(404).json({ success: false, error: 'Vehicle not found.' });
    }
    const veh = vehicles[0];

    if (veh.verification_status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        error: 'Cannot select this vehicle: It has not been approved by WOW THAILAND Admin.'
      });
    }

    if (veh.is_maintenance || !veh.is_available) {
      return res.status(400).json({
        success: false,
        error: 'Cannot select this vehicle: It is currently marked unavailable or under maintenance.'
      });
    }

    // 2. Check assignment to driver
    const assignments = await query(
      'SELECT * FROM driver_vehicle_assignments WHERE driver_id = ? AND vehicle_id = ? LIMIT 1',
      [driverId, vehicle_id]
    );
    if (assignments.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Chauffeur is not assigned to this vehicle in vendor roster.'
      });
    }

    // 3. Check if vehicle is already actively in use by another driver on an ongoing trip
    const activeTrips = await query(
      `SELECT d.id, d.driver_id, d.ride_status 
       FROM taxi_dispatches d 
       WHERE d.vehicle_id = ? AND d.driver_id != ? AND d.ride_status IN ('ALLOCATED', 'DISPATCHED', 'ARRIVED', 'ON_TRIP') 
       LIMIT 1`,
      [vehicle_id, driverId]
    );
    if (activeTrips.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'This vehicle is currently assigned to another chauffeur with an active ongoing trip.'
      });
    }

    await withTransaction(async (conn) => {
      // Set this assignment as active and deactivate other assignments for this driver
      await conn.execute('UPDATE driver_vehicle_assignments SET is_active = 0 WHERE driver_id = ?', [driverId]);
      await conn.execute('UPDATE driver_vehicle_assignments SET is_active = 1 WHERE driver_id = ? AND vehicle_id = ?', [driverId, vehicle_id]);

      // Set active_vehicle_id on driver row and sync model and plate
      await conn.execute(
        `UPDATE drivers 
         SET active_vehicle_id = ?, vehicle_model = ?, vehicle_plate = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [vehicle_id, `${veh.brand} ${veh.model}`, veh.plate_number, driverId]
      );
    });

    res.json({
      success: true,
      message: `Active vehicle set to ${veh.brand} ${veh.model} (${veh.plate_number}).`,
      data: {
        driver_id: driverId,
        vehicle_id: veh.id,
        vehicle_model: `${veh.brand} ${veh.model}`,
        vehicle_plate: veh.plate_number,
        category: veh.category,
        seating_capacity: veh.seating_capacity,
        luggage_capacity: veh.luggage_capacity
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/driver/assigned-vehicles
 * Returns all approved vehicles assigned to the logged-in chauffeur
 */
export async function getDriverVehicles(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const driverId = await resolveDriverId(req.user);
    if (!driverId) {
      return res.status(403).json({ success: false, error: 'Chauffeur account required.' });
    }

    const vehicles = await query(
      `SELECT v.*, dva.is_active,
              (d.active_vehicle_id = v.id) as is_current_selection
       FROM driver_vehicle_assignments dva
       JOIN cab_vehicles v ON dva.vehicle_id = v.id
       JOIN drivers d ON dva.driver_id = d.id
       WHERE dva.driver_id = ? AND v.verification_status = 'APPROVED'
       ORDER BY dva.is_active DESC, v.created_at DESC`,
      [driverId]
    );

    res.json({
      success: true,
      data: vehicles
    });
  } catch (err) {
    next(err);
  }
}

