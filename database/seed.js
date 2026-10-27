// ========================================================================
// WOW THAILAND: Database Seeder Runner
// Seeds baseline Thailand catalog (Hotels, Transfers, Tours, 90-day Availability)
// ========================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from '../backend/node_modules/mysql2/promise.js';
import dotenv from '../backend/node_modules/dotenv/lib/main.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'wow_thailand',
  multipleStatements: true
};

async function runSeeds() {
  console.log(`Connecting to database '${config.database}' at ${config.host}:${config.port}...`);

  let connection;
  try {
    connection = await mysql.createConnection(config);
  } catch (err) {
    console.error('❌ Failed to connect to MySQL database:', err.message);
    process.exit(1);
  }

  try {
    const seedsDir = path.join(__dirname, 'seeds');
    const files = fs.readdirSync(seedsDir).filter(f => f.endsWith('.sql')).sort();

    console.log(`Found ${files.length} seed file(s). Seeding...`);
    for (const file of files) {
      console.log(`  Applying seed: ${file}...`);
      const sql = fs.readFileSync(path.join(seedsDir, file), 'utf8');
      await connection.query(sql);
      console.log(`  ✅ ${file} applied successfully.`);
    }

    // Programmatically populate rolling 90 days of room availability for each room type
    console.log('  Generating rolling 90-day room availability for all hotel room types...');
    const [roomTypes] = await connection.query('SELECT id, total_rooms, base_price_thb FROM hotel_room_types');
    const today = new Date();
    let count = 0;

    for (const rt of roomTypes) {
      for (let i = 0; i < 90; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().slice(0, 10);
        await connection.query(
          `INSERT IGNORE INTO hotel_room_availability (room_type_id, calendar_date, available_rooms, price_override_thb, is_blackout)
           VALUES (?, ?, ?, ?, 0)`,
          [rt.id, dateStr, rt.total_rooms || 10, rt.base_price_thb]
        );
        count++;
      }
    }
    console.log(`  ✅ ${count} room availability calendar slots initialized.`);

    console.log(`\n🎉 Baseline Thailand data seeded successfully into '${config.database}'.`);
  } catch (err) {
    console.error('❌ Seeder error:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

runSeeds();
