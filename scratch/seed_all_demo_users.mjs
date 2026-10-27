import mysql from '../backend/node_modules/mysql2/promise.js';
import dotenv from '../backend/node_modules/dotenv/lib/main.js';
import bcrypt from '../backend/node_modules/bcryptjs/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'wow_thailand'
};

async function run() {
  console.log('Connecting to DB...');
  const conn = await mysql.createConnection(config);

  const hashAdmin2026 = await bcrypt.hash('admin@2026', 10);
  const hashSuperadmin = await bcrypt.hash('superadmin', 10);

  const demoUsers = [
    {
      id: 'usr-superadmin',
      username: 'superadmin',
      email: 'superadmin@wowthailand.com',
      role: 'superadmin',
      password_hash: hashAdmin2026,
      phone: '+66 80 000 0001'
    },
    {
      id: 'usr-admin-01',
      username: 'admin',
      email: 'admin@wowthailand.com',
      role: 'admin',
      password_hash: hashAdmin2026,
      phone: '+66 81 234 5678'
    },
    {
      id: 'usr-vendor-phuket',
      username: 'phuket_resorts',
      email: 'phuket@resorts.co.th',
      role: 'hotel_vendor',
      password_hash: hashAdmin2026,
      phone: '+66 82 345 6789'
    },
    {
      id: 'usr-vendor-cabs',
      username: 'cabs_operator',
      email: 'cabs@wowthailand.com',
      role: 'transfer_vendor',
      password_hash: hashAdmin2026,
      phone: '+66 89 777 8899'
    },
    {
      id: 'usr-vendor-tours',
      username: 'tours_operator',
      email: 'tours@wowthailand.com',
      role: 'tour_vendor',
      password_hash: hashAdmin2026,
      phone: '+66 89 666 5544'
    },
    {
      id: 'usr-subadmin',
      username: 'subadmin',
      email: 'subadmin@tripgalileo.com',
      role: 'subadmin',
      password_hash: hashAdmin2026,
      phone: '+66 85 123 4567'
    },
    {
      id: 'usr-b2b-01',
      username: 'partner_a',
      email: 'partner_a@wowthailand.com',
      role: 'b2b_agent',
      password_hash: hashAdmin2026,
      phone: '+66 86 987 6543'
    },
    {
      id: 'usr-driver-somchai',
      username: 'somchai_transfers',
      email: 'driver@gmail.com',
      role: 'driver',
      password_hash: hashAdmin2026,
      phone: '+66 83 456 7890'
    }
  ];

  console.log('Upserting demo users...');
  for (const u of demoUsers) {
    await conn.query(
      `INSERT INTO users (id, username, email, password_hash, role, phone, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')
       ON DUPLICATE KEY UPDATE
         password_hash = VALUES(password_hash),
         role = VALUES(role),
         email = VALUES(email),
         status = 'active'`,
      [u.id, u.username, u.email, u.password_hash, u.role, u.phone]
    );
    console.log(`  ✓ ${u.username} (${u.role}) -> password: admin@2026`);
  }

  // Also ensure superadmin also works if user types 'superadmin' as password!
  // In authController, we can support password === 'superadmin' for superadmin or hash both.
  
  // Ensure vendors entries exist
  const vendors = [
    { id: 'vnd-phuket-01', user_id: 'usr-vendor-phuket', name: 'Andaman Luxury Hotels Group', phone: '+66 82 345 6789' },
    { id: 'vnd-cabs-01', user_id: 'usr-vendor-cabs', name: 'Siam VIP Cab & Transfers Co.', phone: '+66 89 777 8899' },
    { id: 'vnd-tours-01', user_id: 'usr-vendor-tours', name: 'Phuket Islands Tour & Adventures', phone: '+66 89 666 5544' }
  ];

  for (const v of vendors) {
    await conn.query(
      `INSERT INTO vendors (id, user_id, business_name, contact_person, contact_phone, commission_rate, verification_status)
       VALUES (?, ?, ?, 'Operations Manager', ?, 10.00, 'verified')
       ON DUPLICATE KEY UPDATE verification_status = 'verified'`,
      [v.id, v.user_id, v.name, v.phone]
    );

    await conn.query(
      `INSERT INTO vendor_wallets (id, vendor_id, balance_thb, minimum_balance_thb)
       VALUES (?, ?, 10000.00, 1000.00)
       ON DUPLICATE KEY UPDATE balance_thb = 10000.00`,
      [`wal-${v.id}`, v.id]
    );
    console.log(`  ✓ Vendor verified: ${v.name}`);
  }

  // Verify accounts by testing bcrypt
  console.log('\n--- VERIFYING LOGIN WITH BCRYPT ---');
  const [users] = await conn.query('SELECT username, email, role, password_hash FROM users');
  for (const u of users) {
    const ok = await bcrypt.compare('admin@2026', u.password_hash);
    console.log(`${u.username.padEnd(20)} [${u.role.padEnd(16)}]: password "admin@2026" => ${ok ? '✅ SUCCESS' : '❌ FAILED'}`);
  }

  await conn.end();
  console.log('\nAll demo users successfully initialized!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
