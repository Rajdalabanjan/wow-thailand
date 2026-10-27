// ========================================================================
// WOW THAILAND: Transfer & Fleet Controller (Airport Pick & Drop)
// ========================================================================

import { query } from '../config/db.js';

export async function getTransferRoutes(req, res, next) {
  try {
    const routes = await query('SELECT * FROM transfer_routes ORDER BY route_name ASC');
    const pricing = await query('SELECT * FROM transfer_vehicle_pricing');

    const mapped = routes.map(r => ({
      ...r,
      vehicles: pricing.filter(p => p.route_id === r.id)
    }));

    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
}

export async function getVehiclesList(req, res, next) {
  try {
    const pricing = await query(`
      SELECT p.*, r.route_name, r.origin_name, r.destination_name 
      FROM transfer_vehicle_pricing p
      JOIN transfer_routes r ON p.route_id = r.id
    `);
    res.json({ success: true, data: pricing });
  } catch (err) {
    next(err);
  }
}
