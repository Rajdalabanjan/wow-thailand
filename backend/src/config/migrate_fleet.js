// ========================================================================
// Migration: Cab Fleet Vehicles & Driver-Vehicle Assignments
// ========================================================================

import { query, default as pool } from './db.js';

export async function runFleetMigrations() {
  console.log('🚀 Running Cab Fleet & Vehicle Assignment Migrations...');

  // 1. Create cab_vehicles table
  await query(`
    CREATE TABLE IF NOT EXISTS cab_vehicles (
      id VARCHAR(50) PRIMARY KEY,
      vendor_id VARCHAR(50) NOT NULL,
      brand VARCHAR(100) NOT NULL,
      model VARCHAR(100) NOT NULL,
      plate_number VARCHAR(50) NOT NULL UNIQUE,
      color VARCHAR(50) NOT NULL,
      category ENUM('SEDAN', 'SUV', 'VIP_VAN') NOT NULL DEFAULT 'SEDAN',
      seating_capacity INT NOT NULL DEFAULT 4,
      luggage_capacity INT NOT NULL DEFAULT 2,
      photo_url VARCHAR(255) DEFAULT NULL,
      registration_doc_url VARCHAR(255) DEFAULT NULL,
      insurance_doc_url VARCHAR(255) DEFAULT NULL,
      permit_doc_url VARCHAR(255) DEFAULT NULL,
      verification_status ENUM('PENDING_APPROVAL', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING_APPROVAL',
      rejection_reason VARCHAR(255) DEFAULT NULL,
      is_available TINYINT(1) NOT NULL DEFAULT 1,
      is_maintenance TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_cab_vehicles_vendor (vendor_id),
      INDEX idx_cab_vehicles_status (verification_status),
      INDEX idx_cab_vehicles_category (category),
      CONSTRAINT fk_cab_vehicles_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('✓ cab_vehicles table ensured');

  // 2. Create driver_vehicle_assignments table
  await query(`
    CREATE TABLE IF NOT EXISTS driver_vehicle_assignments (
      id VARCHAR(50) PRIMARY KEY,
      vendor_id VARCHAR(50) NOT NULL,
      driver_id VARCHAR(50) NOT NULL,
      vehicle_id VARCHAR(50) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 0,
      assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_dva_driver (driver_id),
      INDEX idx_dva_vehicle (vehicle_id),
      INDEX idx_dva_vendor (vendor_id),
      CONSTRAINT fk_dva_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
      CONSTRAINT fk_dva_vehicle FOREIGN KEY (vehicle_id) REFERENCES cab_vehicles(id) ON DELETE CASCADE,
      CONSTRAINT fk_dva_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
      UNIQUE KEY uniq_driver_vehicle (driver_id, vehicle_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('✓ driver_vehicle_assignments table ensured');

  // 3. Add active_vehicle_id column to drivers if not exists
  const driverActiveCols = await query(`
    SELECT COLUMN_NAME FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'drivers' AND COLUMN_NAME = 'active_vehicle_id'
  `);
  if (driverActiveCols.length === 0) {
    await query(`
      ALTER TABLE drivers 
      ADD COLUMN active_vehicle_id VARCHAR(50) DEFAULT NULL,
      ADD INDEX idx_drivers_active_vehicle (active_vehicle_id),
      ADD CONSTRAINT fk_drivers_active_veh FOREIGN KEY (active_vehicle_id) REFERENCES cab_vehicles(id) ON DELETE SET NULL
    `);
    console.log('✓ Added column active_vehicle_id to drivers');
  }

  // 4. Add vehicle_id column to taxi_dispatches if not exists
  const dispatchVehCols = await query(`
    SELECT COLUMN_NAME FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'taxi_dispatches' AND COLUMN_NAME = 'vehicle_id'
  `);
  if (dispatchVehCols.length === 0) {
    await query(`
      ALTER TABLE taxi_dispatches 
      ADD COLUMN vehicle_id VARCHAR(50) DEFAULT NULL AFTER driver_id,
      ADD INDEX idx_dispatches_vehicle (vehicle_id),
      ADD CONSTRAINT fk_dispatches_vehicle FOREIGN KEY (vehicle_id) REFERENCES cab_vehicles(id) ON DELETE SET NULL
    `);
    console.log('✓ Added column vehicle_id to taxi_dispatches');
  }

  // 5. Seed initial verified fleet vehicles for existing cab vendor vnd-bangkok-cabs
  const existingVehicles = await query('SELECT id FROM cab_vehicles LIMIT 1');
  if (existingVehicles.length === 0) {
    await query(`
      INSERT INTO cab_vehicles (
        id, vendor_id, brand, model, plate_number, color, category, seating_capacity, luggage_capacity,
        photo_url, registration_doc_url, insurance_doc_url, permit_doc_url, verification_status, is_available
      ) VALUES
      (
        'veh-camry-01', 'vnd-bangkok-cabs', 'Toyota', 'Camry 2.5 HEV Premium', '1กข 4589', 'Pearl White',
        'SEDAN', 4, 2,
        'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=800&q=80',
        'https://wowthailand.com/docs/reg_1kx4589.pdf', 'https://wowthailand.com/docs/ins_1kx4589.pdf', 'https://wowthailand.com/docs/dlt_1kx4589.pdf',
        'APPROVED', 1
      ),
      (
        'veh-fortuner-01', 'vnd-bangkok-cabs', 'Toyota', 'Fortuner Legender 2.8 4WD', '2ขค 9988', 'Attitude Black',
        'SUV', 6, 4,
        'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
        'https://wowthailand.com/docs/reg_2xk9988.pdf', 'https://wowthailand.com/docs/ins_2xk9988.pdf', 'https://wowthailand.com/docs/dlt_2xk9988.pdf',
        'APPROVED', 1
      ),
      (
        'veh-commuter-01', 'vnd-bangkok-cabs', 'Toyota', 'Commuter VIP 9-Seater', '3งจ 7711', 'Silver Metallic',
        'VIP_VAN', 10, 8,
        'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
        'https://wowthailand.com/docs/reg_3gj7711.pdf', 'https://wowthailand.com/docs/ins_3gj7711.pdf', 'https://wowthailand.com/docs/dlt_3gj7711.pdf',
        'APPROVED', 1
      )
    `);
    console.log('✓ Seeded initial approved fleet vehicles for vnd-bangkok-cabs');

    // Assign veh-commuter-01 to drv-bkk-01 and set active
    await query(`
      INSERT INTO driver_vehicle_assignments (id, vendor_id, driver_id, vehicle_id, is_active)
      VALUES ('dva-bkk-01', 'vnd-bangkok-cabs', 'drv-bkk-01', 'veh-commuter-01', 1)
      ON DUPLICATE KEY UPDATE is_active = 1
    `);
    await query(`UPDATE drivers SET active_vehicle_id = 'veh-commuter-01' WHERE id = 'drv-bkk-01'`);
    console.log('✓ Assigned veh-commuter-01 as active vehicle for drv-bkk-01');
  }

  console.log('✅ Cab Fleet & Vehicle Assignment Migrations completed successfully.');
}

if (process.argv[1] && process.argv[1].endsWith('migrate_fleet.js')) {
  runFleetMigrations()
    .then(() => pool.end())
    .catch((err) => {
      console.error('🔥 Fleet migration error:', err);
      process.exit(1);
    });
}
