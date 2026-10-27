// ========================================================================
// WOW THAILAND: Database Migration Runner
// Safely connects to MySQL, creates database if not exists, and runs migrations.
// ========================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from '../backend/node_modules/mysql2/promise.js';
import dotenv from '../backend/node_modules/dotenv/lib/main.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'wow_thailand',
  multipleStatements: true
};

async function runMigrations() {
  console.log(`Connecting to MySQL at ${config.host}:${config.port} as '${config.user}'...`);

  // 1. Initial connection without database to create database if not exists
  let connection;
  try {
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      multipleStatements: true
    });
  } catch (err) {
    console.error('❌ Failed to connect to MySQL server. Please verify your .env credentials:');
    console.error(err.message);
    process.exit(1);
  }

  try {
    console.log(`Ensuring target database '${config.database}' exists...`);
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await connection.changeUser({ database: config.database });

    // 2. Read migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    console.log(`Found ${files.length} migration file(s). Running...`);
    for (const file of files) {
      console.log(`  Applying migration: ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await connection.query(sql);
      console.log(`  ✅ ${file} applied successfully.`);
    }

    console.log(`\n🎉 All migrations completed successfully on database '${config.database}'.`);
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

runMigrations();
