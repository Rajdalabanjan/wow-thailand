const path = require('path');
const mysql = require(path.resolve(__dirname, '../backend/node_modules/mysql2/promise'));
const bcrypt = require(path.resolve(__dirname, '../backend/node_modules/bcryptjs'));
require(path.resolve(__dirname, '../backend/node_modules/dotenv')).config({ path: path.resolve(__dirname, '../backend/.env') });

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'wow_thailand'
  });

  const hash = await bcrypt.hash('admin@2026', 10);

  // Update existing users to have valid bcrypt hash for admin@2026
  await conn.query(
    "UPDATE users SET password_hash = ? WHERE username IN ('superadmin', 'admin', 'hotel_vendor', 'subadmin', 'partner_a', 'somchai_transfers', 'cabs_operator') OR email IN ('superadmin@wowthailand.com', 'admin@wowthailand.com', 'driver@gmail.com')",
    [hash]
  );

  // Ensure 'vendor' exists
  await conn.query(
    "INSERT INTO users (id, username, email, password_hash, role, phone, created_at) VALUES ('usr-vendor-default', 'vendor', 'vendor@wowthailand.com', ?, 'transfer_vendor', '+66 81 234 5678', NOW()) ON DUPLICATE KEY UPDATE password_hash = ?, role = 'transfer_vendor'",
    [hash, hash]
  );

  // Ensure 'flight_vendor' exists
  await conn.query(
    "INSERT INTO users (id, username, email, password_hash, role, phone, created_at) VALUES ('usr-vendor-flight', 'flight_vendor', 'flight_vendor@wowthailand.com', ?, 'flight_vendor', '+66 81 234 5679', NOW()) ON DUPLICATE KEY UPDATE password_hash = ?, role = 'flight_vendor'",
    [hash, hash]
  );

  // Ensure 'rahul_subadmin' exists
  await conn.query(
    "INSERT INTO users (id, username, email, password_hash, role, phone, created_at) VALUES ('usr-subadmin-rahul', 'rahul_subadmin', 'rahul_subadmin@wowthailand.com', ?, 'subadmin', '+66 85 123 4567', NOW()) ON DUPLICATE KEY UPDATE password_hash = ?, role = 'subadmin'",
    [hash, hash]
  );

  console.log('Database demo users successfully updated with admin@2026 hash!');
  await conn.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
