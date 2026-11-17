// ========================================================================
// WOW THAILAND: Database Migration Runner for Cab & Airport Transfers
// Executes idempotent DDL statements safely
// ========================================================================

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, default as pool } from './db.js';
import { runFleetMigrations } from './migrate_fleet.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runCabMigrations() {
  console.log('🚀 Running Cab & Transfer Database Migrations...');
  const sqlPath = path.join(__dirname, 'cab_migrations.sql');
  const sql = readFileSync(sqlPath, 'utf8');

  // Strip single-line comments (-- ...) and split statements by semicolon
  const cleanSql = sql.replace(/--.*$/gm, '');
  const statements = cleanSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const stmt of statements) {
    try {
      await query(stmt);
    } catch (err) {
      // Ignore if table or index already exists
      if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_DUP_KEYNAME') {
        continue;
      }
      console.error('❌ Migration statement failed:', stmt.slice(0, 100), '\nError:', err.message);
      throw err;
    }
  }

  // Ensure ride_otp_encrypted column exists in taxi_dispatches
  const cols = await query(`
    SELECT COLUMN_NAME FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'taxi_dispatches' AND COLUMN_NAME = 'ride_otp_encrypted'
  `);
  if (cols.length === 0) {
    await query(`ALTER TABLE taxi_dispatches ADD COLUMN ride_otp_encrypted VARCHAR(255) DEFAULT NULL AFTER ride_otp_hash`);
    console.log('✓ Added column ride_otp_encrypted to taxi_dispatches');
  }

  // Ensure vendor_id column exists in drivers for multi-tenant vendor fleet management
  const driverVendorCols = await query(`
    SELECT COLUMN_NAME FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'drivers' AND COLUMN_NAME = 'vendor_id'
  `);
  if (driverVendorCols.length === 0) {
    await query(`ALTER TABLE drivers ADD COLUMN vendor_id VARCHAR(50) DEFAULT NULL, ADD INDEX idx_drivers_vendor (vendor_id)`);
    console.log('✓ Added column vendor_id to drivers');
  }

  // Associate test chauffeur drv-bkk-01 with cab vendor vnd-bangkok-cabs if unassigned
  await query(`UPDATE drivers SET vendor_id = 'vnd-bangkok-cabs' WHERE id = 'drv-bkk-01'`);

  // Run Fleet & Vehicle Assignment migrations
  await runFleetMigrations();

  console.log('✅ Cab & Transfer Database Migrations completed successfully.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCabMigrations()
    .then(() => pool.end())
    .catch((err) => {
      console.error('🔥 Migration fatal error:', err);
      process.exit(1);
    });
}
