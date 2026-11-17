// ========================================================================
// WOW THAILAND: B2B Partner Portal service
// Partner profiles, server-side B2B pricing, prepaid wallet ledger,
// booking life-cycle hooks (refund / commission), notifications & audit log.
//
// Money rules
//   COMMISSION mode : the agent pays the retail price from the wallet; the
//                     commission is credited to the wallet when the trip is
//                     marked Completed.
//   NET mode        : the agent pays the discounted net price from the wallet
//                     and keeps whatever markup they charge their customer.
//   Cancelling a B2B booking refunds what was taken from the wallet.
//   Wallet top-ups are requests; they count only after an admin confirms the
//   payment was received.
// ========================================================================

import crypto from 'crypto';
import { query, withTransaction } from '../config/db.js';
import { createBookingTransaction } from './bookingService.js';

export const B2B_ROLES = ['b2b_agent', 'b2b', 'agent'];
export const isB2BRole = role => B2B_ROLES.includes(String(role || '').toLowerCase());

export class B2BError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

const MODES = ['COMMISSION', 'NON_COMMISSION'];
const DEFAULT_RATE = 10;
const MAX_PENDING_TOPUPS = 5;
const MAX_TOPUP = 1000000;

const round = n => Math.round(Number(n) || 0);
const money = n => Math.round((Number(n) || 0) * 100) / 100;
const newId = prefix => `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
const clean = (v, max = 255) => (v === undefined || v === null ? null : String(v).trim().slice(0, max) || null);
const formatTHB = n => `฿${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
// "YYYY-MM-DD" (or "YYYY-MM") from a DATE/TIMESTAMP that mysql2 may return as a Date
const dayOf = v => (v instanceof Date ? v.toISOString() : String(v || '')).slice(0, 10);

// ------------------------------------------------------------------------
// Schema: created on first use. Only adds new tables; nothing existing changes.
// ------------------------------------------------------------------------
const TABLE_OPTIONS = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS b2b_partners (
    user_id VARCHAR(50) NOT NULL PRIMARY KEY,
    company_name VARCHAR(200) NULL,
    business_type VARCHAR(80) NULL,
    contact_name VARCHAR(150) NULL,
    contact_email VARCHAR(150) NULL,
    contact_phone VARCHAR(40) NULL,
    website VARCHAR(255) NULL,
    address VARCHAR(500) NULL,
    city VARCHAR(100) NULL,
    state VARCHAR(100) NULL,
    country VARCHAR(100) NULL,
    pincode VARCHAR(20) NULL,
    gst_number VARCHAR(50) NULL,
    logo_url VARCHAR(1000) NULL,
    initial_mode VARCHAR(20) NOT NULL DEFAULT 'COMMISSION',
    allow_commission TINYINT(1) NOT NULL DEFAULT 0,
    allow_non_commission TINYINT(1) NOT NULL DEFAULT 0,
    default_commission_rate DECIMAL(5,2) NULL,
    default_net_discount_rate DECIMAL(5,2) NULL,
    credit_limit DECIMAL(12,2) NOT NULL DEFAULT 0,
    wallet_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    application_status VARCHAR(20) NOT NULL DEFAULT 'approved',
    rejection_reason VARCHAR(500) NULL,
    approved_at DATETIME NULL,
    approved_by VARCHAR(50) NULL,
    requested_mode VARCHAR(20) NULL,
    mode_request_status VARCHAR(20) NULL,
    mode_requested_at DATETIME NULL,
    mode_request_note VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ${TABLE_OPTIONS}`,
  `CREATE TABLE IF NOT EXISTS b2b_wallet_transactions (
    id VARCHAR(60) NOT NULL PRIMARY KEY,
    partner_id VARCHAR(50) NOT NULL,
    transaction_type VARCHAR(30) NOT NULL,
    flow_type VARCHAR(10) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    balance_before DECIMAL(12,2) NULL,
    balance_after DECIMAL(12,2) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    booking_id VARCHAR(50) NULL,
    payment_method VARCHAR(60) NULL,
    payment_gateway_ref VARCHAR(120) NULL,
    description VARCHAR(500) NULL,
    idempotency_key VARCHAR(160) NULL,
    created_by VARCHAR(50) NULL,
    reviewed_by VARCHAR(50) NULL,
    reviewed_at DATETIME NULL,
    review_note VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_b2b_tx_idempotency (idempotency_key),
    UNIQUE KEY uq_b2b_tx_booking_type (booking_id, transaction_type),
    KEY idx_b2b_tx_partner (partner_id, created_at)
  ) ${TABLE_OPTIONS}`,
  `CREATE TABLE IF NOT EXISTS b2b_booking_meta (
    booking_id VARCHAR(50) NOT NULL PRIMARY KEY,
    partner_id VARCHAR(50) NOT NULL,
    b2b_mode VARCHAR(20) NOT NULL,
    service_type VARCHAR(30) NOT NULL,
    retail_amount DECIMAL(12,2) NOT NULL,
    commission_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    net_discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    net_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    wallet_debit DECIMAL(12,2) NOT NULL DEFAULT 0,
    markup_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    commission_status VARCHAR(20) NOT NULL DEFAULT 'NONE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_b2b_meta_partner (partner_id, b2b_mode)
  ) ${TABLE_OPTIONS}`,
  `CREATE TABLE IF NOT EXISTS b2b_pricing_rules (
    id VARCHAR(60) NOT NULL PRIMARY KEY,
    partner_id VARCHAR(50) NOT NULL DEFAULT 'all',
    service_type VARCHAR(30) NOT NULL DEFAULT 'all',
    commission_percent DECIMAL(5,2) NOT NULL DEFAULT 10,
    net_discount_percent DECIMAL(5,2) NOT NULL DEFAULT 10,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    notes VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_b2b_rule_lookup (partner_id, service_type, is_active)
  ) ${TABLE_OPTIONS}`,
  `CREATE TABLE IF NOT EXISTS b2b_notifications (
    id VARCHAR(60) NOT NULL PRIMARY KEY,
    partner_id VARCHAR(50) NOT NULL,
    type VARCHAR(40) NULL,
    title VARCHAR(200) NULL,
    message VARCHAR(1000) NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_b2b_notifications (partner_id, is_read, created_at)
  ) ${TABLE_OPTIONS}`,
  `CREATE TABLE IF NOT EXISTS b2b_audit_log (
    id VARCHAR(60) NOT NULL PRIMARY KEY,
    partner_id VARCHAR(50) NULL,
    action VARCHAR(60) NOT NULL,
    reason VARCHAR(1000) NULL,
    booking_id VARCHAR(50) NULL,
    actor_id VARCHAR(50) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_b2b_audit (partner_id, created_at)
  ) ${TABLE_OPTIONS}`
];

let schemaReady = null;
export function ensureB2BSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      for (const sql of SCHEMA) await query(sql);
    })().catch(err => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

// ------------------------------------------------------------------------
// Notifications & audit log (never block the main action)
// ------------------------------------------------------------------------
export async function notify(partnerId, type, title, message) {
  try {
    await query(
      'INSERT INTO b2b_notifications (id, partner_id, type, title, message) VALUES (?, ?, ?, ?, ?)',
      [newId('ntf'), partnerId, clean(type, 40), clean(title, 200), clean(message, 1000)]
    );
  } catch (err) {
    console.warn('[B2B] notification not saved:', err.message);
  }
}

export async function audit(partnerId, action, reason, { bookingId = null, actorId = null } = {}) {
  try {
    await query(
      'INSERT INTO b2b_audit_log (id, partner_id, action, reason, booking_id, actor_id) VALUES (?, ?, ?, ?, ?, ?)',
      [newId('aud'), partnerId, clean(action, 60), clean(reason, 1000), bookingId, actorId]
    );
  } catch (err) {
    console.warn('[B2B] audit entry not saved:', err.message);
  }
}

// ------------------------------------------------------------------------
// Partner profiles
// ------------------------------------------------------------------------
async function loadUser(userId) {
  const rows = await query(
    'SELECT id, username, email, phone, role, status, created_at FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  return rows[0] || null;
}

/** Partners created before this module existed get a profile on first use. */
async function ensurePartnerRow(user) {
  const rows = await query('SELECT * FROM b2b_partners WHERE user_id = ? LIMIT 1', [user.id]);
  if (rows[0]) return rows[0];
  const active = user.status === 'active';
  await query(
    `INSERT IGNORE INTO b2b_partners
      (user_id, company_name, contact_email, contact_phone, initial_mode, allow_commission, allow_non_commission,
       application_status, approved_at)
     VALUES (?, ?, ?, ?, 'COMMISSION', ?, ?, ?, ?)`,
    [user.id, user.username, user.email, user.phone, active ? 1 : 0, active ? 1 : 0,
      active ? 'approved' : 'pending', active ? new Date() : null]
  );
  return (await query('SELECT * FROM b2b_partners WHERE user_id = ? LIMIT 1', [user.id]))[0];
}

/** "hotel" | "vehicle" | "package": the categories pricing rules are set for. */
export function ruleCategory(serviceType) {
  const s = String(serviceType || '').toLowerCase();
  if (s.includes('hotel') || s.includes('stay') || s.includes('room')) return 'hotel';
  if (/(cab|car|vehicle|transfer|taxi|bike|chauffeur)/.test(s)) return 'vehicle';
  return 'package';
}

async function resolveRates(partnerRow, serviceType) {
  const category = serviceType ? ruleCategory(serviceType) : 'all';
  const rules = await query(
    `SELECT * FROM b2b_pricing_rules
     WHERE is_active = 1 AND partner_id IN (?, 'all') AND service_type IN (?, 'all')`,
    [partnerRow.user_id, category]
  );
  const rule = (p, s) => rules.find(r => r.partner_id === p && r.service_type === s);
  // Partner-specific rules, then the partner's own terms, then global rules, then 10%
  const order = [rule(partnerRow.user_id, category), rule(partnerRow.user_id, 'all')];
  const pick = (field, partnerDefault) => {
    for (const r of order) if (r && r[field] !== null && r[field] !== undefined) return Number(r[field]);
    if (partnerDefault !== null && partnerDefault !== undefined) return Number(partnerDefault);
    for (const r of [rule('all', category), rule('all', 'all')]) {
      if (r && r[field] !== null && r[field] !== undefined) return Number(r[field]);
    }
    return DEFAULT_RATE;
  };
  const clamp = n => Math.min(50, Math.max(0, n));
  return {
    commission: clamp(pick('commission_percent', partnerRow.default_commission_rate)),
    net: clamp(pick('net_discount_percent', partnerRow.default_net_discount_rate))
  };
}

function partnerStatus(user, row) {
  if (row?.application_status === 'rejected') return 'rejected';
  return user.status || 'pending';
}

async function formatPartner(user, row) {
  const rates = await resolveRates(row, null);
  // Per-service rates (pricing rules can differ for hotels, vehicles and packages)
  const serviceRates = {};
  for (const category of ['hotel', 'vehicle', 'package']) serviceRates[category] = await resolveRates(row, category);
  return {
    service_rates: serviceRates,
    id: user.id,
    username: user.username,
    role: user.role,
    email: user.email,
    phone: user.phone,
    status: partnerStatus(user, row),
    name: row.contact_name || row.company_name || user.username,
    company_name: row.company_name || user.username,
    business_type: row.business_type,
    contact_name: row.contact_name,
    contact_email: row.contact_email,
    contact_phone: row.contact_phone,
    website: row.website,
    address: row.address,
    city: row.city,
    state: row.state,
    country: row.country,
    pincode: row.pincode,
    gst_number: row.gst_number,
    logo_url: row.logo_url,
    initial_mode: row.initial_mode,
    allow_commission: Number(row.allow_commission) ? 1 : 0,
    allow_non_commission: Number(row.allow_non_commission) ? 1 : 0,
    default_commission_rate: rates.commission,
    default_net_discount_rate: rates.net,
    credit_limit: Number(row.credit_limit || 0),
    wallet_balance: Number(row.wallet_balance || 0),
    requested_mode: row.requested_mode,
    mode_request_status: row.mode_request_status,
    mode_requested_at: row.mode_requested_at,
    rejection_reason: row.rejection_reason,
    approved_at: row.approved_at,
    created_at: user.created_at
  };
}

/** Full partner profile, or null when the user is not a B2B partner. */
export async function getPartner(userId) {
  await ensureB2BSchema();
  const user = await loadUser(userId);
  if (!user || !isB2BRole(user.role)) return null;
  return formatPartner(user, await ensurePartnerRow(user));
}

/** The partner behind a request: themselves, or (for staff) the one they name. */
export async function requireActivePartner(userId) {
  const partner = await getPartner(userId);
  if (!partner) throw new B2BError(404, 'B2B partner account not found.');
  if (partner.status === 'pending') {
    throw new B2BError(403, 'Your B2B application is still under review. You can make bookings after WOW THAILAND approves it.');
  }
  if (partner.status !== 'active') {
    throw new B2BError(403, 'Your B2B account is not active. Please contact WOW THAILAND support.');
  }
  return partner;
}

/** Login gate for B2B accounts: message for pending / rejected applications, else null. */
export async function loginBlockReason(user) {
  if (!isB2BRole(user.role)) return null;
  await ensureB2BSchema();
  const row = await ensurePartnerRow(user);
  if (row.application_status === 'rejected') {
    return `Your B2B application was not approved${row.rejection_reason ? `: ${row.rejection_reason}` : '.'} Please contact WOW THAILAND support.`;
  }
  if (user.status === 'pending' || row.application_status === 'pending') {
    return 'Your B2B application is still under review. You can sign in once WOW THAILAND approves it.';
  }
  return null;
}

export async function listPartners() {
  await ensureB2BSchema();
  const users = await query(
    `SELECT id, username, email, phone, role, status, created_at FROM users
     WHERE role IN ('b2b_agent', 'b2b', 'agent') ORDER BY created_at DESC`
  );
  const out = [];
  for (const user of users) out.push(await formatPartner(user, await ensurePartnerRow(user)));
  return out;
}

const PROFILE_FIELDS = {
  company_name: 200, business_type: 80, contact_name: 150, contact_email: 150, contact_phone: 40,
  website: 255, address: 500, city: 100, state: 100, country: 100, pincode: 20, gst_number: 50, logo_url: 1000
};

function profileValues(input) {
  const values = {};
  for (const [field, max] of Object.entries(PROFILE_FIELDS)) {
    if (input[field] !== undefined) values[field] = clean(input[field], max);
  }
  return values;
}

async function updatePartnerRow(userId, values) {
  const fields = Object.keys(values);
  if (fields.length === 0) return;
  await query(
    `UPDATE b2b_partners SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE user_id = ?`,
    [...fields.map(f => values[f]), userId]
  );
}

async function assertLoginFree({ username, email, phone }, exceptUserId = null) {
  const checks = [['username', username], ['email', email], ['phone', phone]].filter(([, v]) => v);
  for (const [column, value] of checks) {
    const rows = await query(`SELECT id FROM users WHERE ${column} = ? LIMIT 1`, [value]);
    if (rows[0] && rows[0].id !== exceptUserId) {
      throw new B2BError(409, `That ${column === 'phone' ? 'phone number' : column} is already registered. Please use another one or sign in.`);
    }
  }
}

/** Public sign-up: the account waits for admin approval before it can sign in. */
export async function registerPartner(input, bcrypt) {
  await ensureB2BSchema();
  const username = clean(input.username, 100)?.toLowerCase();
  const email = clean(input.email, 150)?.toLowerCase();
  const phone = clean(input.phone || input.contact_phone, 30);
  const password = String(input.password || '');
  const company = clean(input.company_name, 200);
  if (!company || !email || !username || !phone) {
    throw new B2BError(400, 'Company name, email, phone and username are required.');
  }
  if (!/^[a-z0-9._-]{3,50}$/.test(username)) {
    throw new B2BError(400, 'Username must be 3-50 characters: letters, numbers, dot, dash or underscore.');
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new B2BError(400, 'Please enter a valid email address.');
  if (password.length < 6) throw new B2BError(400, 'Password must be at least 6 characters.');
  await assertLoginFree({ username, email, phone });

  const userId = `usr-b2b-${Date.now().toString(36)}${crypto.randomBytes(2).toString('hex')}`;
  const mode = MODES.includes(String(input.initial_mode).toUpperCase()) ? String(input.initial_mode).toUpperCase() : 'COMMISSION';
  const passwordHash = await bcrypt.hash(password, 10);
  await withTransaction(async conn => {
    await conn.execute(
      `INSERT INTO users (id, username, email, password_hash, role, phone, status) VALUES (?, ?, ?, ?, 'b2b_agent', ?, 'pending')`,
      [userId, username, email, passwordHash, phone]
    );
    const values = profileValues(input);
    const fields = Object.keys(values);
    await conn.execute(
      `INSERT INTO b2b_partners (user_id, initial_mode, application_status${fields.map(f => `, ${f}`).join('')})
       VALUES (?, ?, 'pending'${fields.map(() => ', ?').join('')})`,
      [userId, mode, ...fields.map(f => values[f])]
    );
  });
  await notify('admin', 'partner_application', 'New B2B partner application',
    `${company} (${email}) applied for a B2B account (${mode === 'COMMISSION' ? 'Commission' : 'Net wholesale'} mode).`);
  await audit(userId, 'APPLICATION_SUBMITTED', `${company} applied for ${mode} mode`);
  return { partner_id: userId, status: 'pending' };
}

/** Admin creates or edits a partner from Customer Management. */
export async function savePartnerByAdmin(input, admin, bcrypt) {
  await ensureB2BSchema();
  const status = ['active', 'pending', 'suspended'].includes(input.status) ? input.status : 'active';
  const rate = v => (v === '' || v === undefined || v === null ? null : Math.min(50, Math.max(0, Number(v) || 0)));
  const flags = {
    allow_commission: Number(input.allow_commission) ? 1 : 0,
    allow_non_commission: Number(input.allow_non_commission) ? 1 : 0,
    default_commission_rate: rate(input.default_commission_rate),
    default_net_discount_rate: rate(input.default_net_discount_rate)
  };
  if (input.credit_limit !== undefined) flags.credit_limit = Math.max(0, money(input.credit_limit));
  const profile = { ...profileValues(input) };
  if (input.name !== undefined && profile.contact_name === undefined) profile.contact_name = clean(input.name, 150);

  if (input.id) {
    const user = await loadUser(input.id);
    if (!user || !isB2BRole(user.role)) throw new B2BError(404, 'B2B partner not found.');
    await ensurePartnerRow(user);
    const email = clean(input.email, 150)?.toLowerCase();
    const phone = clean(input.phone, 30);
    await assertLoginFree({ email, phone }, user.id);
    if (email || phone) {
      await query('UPDATE users SET email = COALESCE(?, email), phone = COALESCE(?, phone) WHERE id = ?', [email || null, phone || null, user.id]);
    }
    if (input.password) await query('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(String(input.password), 10), user.id]);
    await query('UPDATE users SET status = ? WHERE id = ?', [status, user.id]);
    await updatePartnerRow(user.id, {
      ...profile, ...flags,
      application_status: status === 'active' ? 'approved' : (status === 'pending' ? 'pending' : 'approved')
    });
    await audit(user.id, 'PROFILE_UPDATED_BY_ADMIN', 'Partner details updated by admin', { actorId: admin.id });
    return getPartner(user.id);
  }

  const company = clean(input.company_name, 200);
  const email = clean(input.email, 150)?.toLowerCase();
  const phone = clean(input.phone, 30);
  const username = (clean(input.username, 100) || (email || '').split('@')[0] || '').toLowerCase().replace(/[^a-z0-9._-]/g, '');
  if (!company || !phone) throw new B2BError(400, 'Company name and phone are required.');
  if (!username || username.length < 3) throw new B2BError(400, 'A username (3+ characters) or email is required.');
  const password = String(input.password || '');
  if (password.length < 6) throw new B2BError(400, 'Set a password of at least 6 characters for the partner login.');
  await assertLoginFree({ username, email, phone });
  const userId = `usr-b2b-${Date.now().toString(36)}${crypto.randomBytes(2).toString('hex')}`;
  const passwordHash = await bcrypt.hash(password, 10);
  await withTransaction(async conn => {
    await conn.execute(
      `INSERT INTO users (id, username, email, password_hash, role, phone, status) VALUES (?, ?, ?, ?, 'b2b_agent', ?, ?)`,
      [userId, username, email, passwordHash, phone, status]
    );
    const values = {
      ...profile, ...flags,
      initial_mode: flags.allow_commission || !flags.allow_non_commission ? 'COMMISSION' : 'NON_COMMISSION',
      application_status: status === 'pending' ? 'pending' : 'approved'
    };
    const fields = Object.keys(values);
    await conn.execute(
      `INSERT INTO b2b_partners (user_id, approved_at, approved_by${fields.map(f => `, ${f}`).join('')})
       VALUES (?, ?, ?${fields.map(() => ', ?').join('')})`,
      [userId, status === 'pending' ? null : new Date(), status === 'pending' ? null : admin.id, ...fields.map(f => values[f])]
    );
  });
  await audit(userId, 'PARTNER_CREATED_BY_ADMIN', `${company} created by admin`, { actorId: admin.id });
  return getPartner(userId);
}

/** Partner edits their own company profile. */
export async function updateOwnProfile(userId, input) {
  const partner = await getPartner(userId);
  if (!partner) throw new B2BError(404, 'B2B partner account not found.');
  const email = clean(input.email, 150)?.toLowerCase();
  const phone = clean(input.phone, 30);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new B2BError(400, 'Please enter a valid email address.');
  await assertLoginFree({ email, phone }, userId);
  if (email || phone) {
    await query('UPDATE users SET email = COALESCE(?, email), phone = COALESCE(?, phone) WHERE id = ?', [email || null, phone || null, userId]);
  }
  const values = profileValues({
    company_name: input.company_name,
    contact_name: input.name ?? input.contact_name,
    address: input.address,
    gst_number: input.gst_number,
    logo_url: input.logo_url,
    website: input.website,
    city: input.city
  });
  if (values.company_name === null) delete values.company_name; // a company name cannot be blanked
  await updatePartnerRow(userId, values);
  await audit(userId, 'PROFILE_UPDATED', 'Company profile updated by partner', { actorId: userId });
  return getPartner(userId);
}

// ------------------------------------------------------------------------
// Admin decisions: applications, modes, status
// ------------------------------------------------------------------------
export async function approvePartner(partnerId, admin) {
  const partner = await getPartner(partnerId);
  if (!partner) throw new B2BError(404, 'B2B partner not found.');
  const enable = partner.initial_mode === 'NON_COMMISSION' ? { allow_non_commission: 1 } : { allow_commission: 1 };
  await query("UPDATE users SET status = 'active' WHERE id = ?", [partnerId]);
  await updatePartnerRow(partnerId, {
    ...enable, application_status: 'approved', rejection_reason: null, approved_at: new Date(), approved_by: admin.id
  });
  await notify(partnerId, 'application_approved', 'B2B account approved',
    'Welcome to WOW THAILAND B2B! Your account is approved. Add funds to your Agent Wallet to start booking.');
  await audit(partnerId, 'APPLICATION_APPROVED', `Approved with ${partner.initial_mode} mode`, { actorId: admin.id });
  return getPartner(partnerId);
}

export async function rejectPartner(partnerId, reason, admin) {
  const partner = await getPartner(partnerId);
  if (!partner) throw new B2BError(404, 'B2B partner not found.');
  await query("UPDATE users SET status = 'suspended' WHERE id = ?", [partnerId]);
  await updatePartnerRow(partnerId, { application_status: 'rejected', rejection_reason: clean(reason, 500) });
  await notify(partnerId, 'application_rejected', 'B2B application not approved', clean(reason, 900) || 'Please contact WOW THAILAND support.');
  await audit(partnerId, 'APPLICATION_REJECTED', reason || 'Rejected', { actorId: admin.id });
  return getPartner(partnerId);
}

/** Admin status dropdown: active / pending / suspended / rejected. */
export async function setPartnerStatus(partnerId, status, admin) {
  const partner = await getPartner(partnerId);
  if (!partner) return null; // not a B2B partner: caller handles plain users
  if (status === 'rejected') return rejectPartner(partnerId, 'Rejected by admin', admin);
  if (status === 'active' && partner.status !== 'active' && partner.status !== 'suspended') {
    return approvePartner(partnerId, admin);
  }
  await query('UPDATE users SET status = ? WHERE id = ?', [status, partnerId]);
  await updatePartnerRow(partnerId, {
    application_status: status === 'pending' ? 'pending' : 'approved',
    ...(status === 'active' ? { rejection_reason: null } : {})
  });
  await audit(partnerId, 'STATUS_CHANGED', `Status set to ${status}`, { actorId: admin.id });
  return getPartner(partnerId);
}

export async function requestMode(partnerId, requestedMode, note) {
  const partner = await requireActivePartner(partnerId);
  const mode = String(requestedMode || '').toUpperCase();
  if (!MODES.includes(mode)) throw new B2BError(400, 'Requested mode must be COMMISSION or NON_COMMISSION.');
  if ((mode === 'COMMISSION' && partner.allow_commission) || (mode === 'NON_COMMISSION' && partner.allow_non_commission)) {
    throw new B2BError(400, 'This mode is already enabled on your account.');
  }
  if (partner.mode_request_status === 'PENDING') throw new B2BError(409, 'You already have a mode request waiting for approval.');
  await updatePartnerRow(partnerId, {
    requested_mode: mode, mode_request_status: 'PENDING', mode_requested_at: new Date(), mode_request_note: clean(note, 500)
  });
  await notify('admin', 'mode_request', 'B2B mode change request',
    `${partner.company_name} asked to enable ${mode === 'COMMISSION' ? 'Commission' : 'Net wholesale'} mode.`);
  await audit(partnerId, 'MODE_REQUESTED', mode, { actorId: partnerId });
  return getPartner(partnerId);
}

export async function listModeRequests() {
  const partners = await listPartners();
  return partners
    .filter(p => p.mode_request_status === 'PENDING')
    .map(p => ({
      ...p,
      commission_percent: p.default_commission_rate,
      net_discount_percent: p.default_net_discount_rate,
      service_type: 'all',
      notes: null
    }));
}

export async function reviewModeRequest(partnerId, approve, reason, admin) {
  const partner = await getPartner(partnerId);
  if (!partner) throw new B2BError(404, 'B2B partner not found.');
  if (partner.mode_request_status !== 'PENDING') throw new B2BError(409, 'There is no pending mode request for this partner.');
  const mode = partner.requested_mode;
  if (approve) {
    await updatePartnerRow(partnerId, {
      ...(mode === 'COMMISSION' ? { allow_commission: 1 } : { allow_non_commission: 1 }),
      mode_request_status: 'APPROVED'
    });
    await notify(partnerId, 'mode_approved', 'Mode request approved',
      `${mode === 'COMMISSION' ? 'Commission' : 'Net wholesale'} mode is now enabled on your account.`);
  } else {
    await updatePartnerRow(partnerId, { mode_request_status: 'REJECTED', mode_request_note: clean(reason, 500) });
    await notify(partnerId, 'mode_rejected', 'Mode request not approved', clean(reason, 900) || 'Please contact WOW THAILAND support.');
  }
  await audit(partnerId, approve ? 'MODE_APPROVED' : 'MODE_REJECTED', reason || mode, { actorId: admin.id });
  return getPartner(partnerId);
}

// ------------------------------------------------------------------------
// Pricing rules (admin)
// ------------------------------------------------------------------------
export async function listPricingRules() {
  await ensureB2BSchema();
  return query(
    `SELECT r.*, COALESCE(p.company_name, u.username) AS company_name
     FROM b2b_pricing_rules r
     LEFT JOIN b2b_partners p ON p.user_id = r.partner_id
     LEFT JOIN users u ON u.id = r.partner_id
     ORDER BY r.partner_id = 'all' DESC, r.created_at DESC`
  );
}

export async function savePricingRule(input, admin) {
  await ensureB2BSchema();
  const partnerId = clean(input.partner_id, 50) || 'all';
  const service = ['all', 'hotel', 'vehicle', 'package'].includes(input.service_type) ? input.service_type : 'all';
  const pct = v => Math.min(50, Math.max(0, Number(v) || 0));
  if (partnerId !== 'all' && !(await getPartner(partnerId))) throw new B2BError(404, 'B2B partner not found.');
  const values = [partnerId, service, pct(input.commission_percent), pct(input.net_discount_percent),
    Number(input.is_active) === 0 || input.is_active === false ? 0 : 1, clean(input.notes, 500)];
  let id = clean(input.id, 60);
  if (id && (await query('SELECT id FROM b2b_pricing_rules WHERE id = ?', [id])).length) {
    await query(
      `UPDATE b2b_pricing_rules SET partner_id = ?, service_type = ?, commission_percent = ?, net_discount_percent = ?,
       is_active = ?, notes = ? WHERE id = ?`, [...values, id]);
  } else {
    id = newId('rule');
    await query(
      `INSERT INTO b2b_pricing_rules (partner_id, service_type, commission_percent, net_discount_percent, is_active, notes, id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [...values, id]);
  }
  await audit(partnerId === 'all' ? null : partnerId, 'PRICING_RULE_SAVED',
    `${service}: commission ${values[2]}%, net discount ${values[3]}%`, { actorId: admin.id });
  return (await query('SELECT * FROM b2b_pricing_rules WHERE id = ?', [id]))[0];
}

// ------------------------------------------------------------------------
// Server-side B2B pricing
// ------------------------------------------------------------------------
const intIn = (v, min, max, fallback) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

function nightsBetween(start, end) {
  const a = Date.parse(`${start}T00:00:00Z`);
  const b = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 1;
  return Math.max(1, Math.round((b - a) / 86400000));
}

function serviceKind(serviceType) {
  const s = String(serviceType || '').toLowerCase();
  if (s.includes('hotel') || s.includes('stay') || s.includes('room')) return 'hotel';
  if (/(cab|car|vehicle|transfer|taxi|chauffeur)/.test(s)) return 'cab';
  if (/(tour|package|holiday|trip)/.test(s)) return 'tour';
  return 'activity';
}

async function findPricedItem(kind, itemId) {
  if (kind === 'hotel') {
    const hotel = (await query('SELECT id, name, vendor_id, city, area, is_published FROM hotels WHERE id = ? LIMIT 1', [itemId]))[0];
    return hotel ? { kind, hotel } : null;
  }
  if (kind === 'cab') {
    const row = (await query(
      `SELECT p.id, p.model_name, p.vehicle_category, p.fare_thb, r.route_name
       FROM transfer_vehicle_pricing p LEFT JOIN transfer_routes r ON r.id = p.route_id WHERE p.id = ? LIMIT 1`, [itemId]))[0];
    return row ? { kind, unit: Number(row.fare_thb), name: `${row.model_name}${row.route_name ? ` · ${row.route_name}` : ''}`, row } : null;
  }
  if (kind === 'tour') {
    const row = (await query('SELECT id, title, price_adult_thb FROM tours WHERE id = ? LIMIT 1', [itemId]))[0];
    return row ? { kind, unit: Number(row.price_adult_thb), name: row.title, row } : null;
  }
  const row = (await query(
    'SELECT id, title, price_thb FROM activities WHERE id = ? AND (is_active = 1 OR is_active IS NULL) LIMIT 1', [itemId]))[0];
  return row ? { kind: 'activity', unit: Number(row.price_thb), name: row.title, row } : null;
}

/**
 * The retail price (what the public website charges) for what the agent is booking,
 * worked out from the database. A higher price sent by the page (e.g. a meal plan) is
 * accepted; a lower one is not.
 */
export async function priceB2BItem(payload) {
  const ex = payload.extra_details || {};
  const itemId = clean(payload.item_id, 60);
  if (!itemId) throw new B2BError(400, 'Please choose a hotel, transfer or experience to book.');
  const hint = serviceKind(payload.service_type);
  let found = await findPricedItem(hint, itemId);
  for (const kind of ['activity', 'tour', 'cab', 'hotel']) {
    if (found) break;
    if (kind !== hint) found = await findPricedItem(kind, itemId);
  }
  if (!found) throw new B2BError(404, 'This item is no longer available. Please refresh the inventory and try again.');

  const startDate = String(payload.pickup_date || payload.start_date || payload.check_in_date || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) throw new B2BError(400, 'Please choose a valid travel date.');
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (startDate < yesterday) throw new B2BError(400, 'The travel date cannot be in the past.');

  if (found.kind === 'hotel') {
    const { hotel } = found;
    if (!Number(hotel.is_published)) throw new B2BError(404, 'This hotel is not available for booking right now.');
    let endDate = String(payload.drop_date || payload.end_date || payload.check_out_date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate <= startDate) {
      endDate = new Date(Date.parse(`${startDate}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
    }
    const nights = Math.min(60, nightsBetween(startDate, endDate));
    const rooms = intIn(ex.rooms ?? payload.rooms ?? payload.num_rooms, 1, 50, 1);
    const roomTypes = await query('SELECT id, name, base_price_thb FROM hotel_room_types WHERE hotel_id = ? ORDER BY base_price_thb ASC', [hotel.id]);
    if (roomTypes.length === 0) throw new B2BError(409, 'This hotel has no rooms set up yet.');
    const wanted = String(payload.room_type_id || ex.room_type_id || '').trim();
    const wantedName = String(ex.room_type || payload.room_type || '').trim().toLowerCase();
    const room = roomTypes.find(r => r.id === wanted)
      || roomTypes.find(r => wantedName && String(r.name).toLowerCase() === wantedName)
      || roomTypes[0];
    const unit = Math.max(Number(room.base_price_thb) || 0, Number(ex.room_price) || 0);
    return {
      kind: 'hotel',
      retail: round(unit * rooms * nights),
      unit,
      quantity: rooms * nights,
      rooms,
      nights,
      startDate,
      endDate,
      itemName: hotel.name,
      roomTypeId: room.id,
      roomTypeName: room.name,
      hotelId: hotel.id,
      vendorId: hotel.vendor_id || null,
      location: [hotel.area, hotel.city].filter(Boolean).join(', ')
    };
  }

  const qty = intIn(payload.qty ?? payload.guests ?? payload.days, 1, 100, 1);
  const unit = Math.max(found.unit || 0, 0);
  if (!unit) throw new B2BError(409, 'This item has no price set yet. Please contact WOW THAILAND.');
  const endDate = String(payload.drop_date || payload.end_date || startDate).slice(0, 10);
  return {
    kind: found.kind,
    retail: round(unit * qty),
    unit,
    quantity: qty,
    startDate,
    endDate: /^\d{4}-\d{2}-\d{2}$/.test(endDate) && endDate >= startDate ? endDate : startDate,
    itemName: found.name
  };
}

/** Commission mode: pay retail, earn commission later. Net mode: pay the discounted price. */
export function computeB2BPricing(retail, mode, rates, markupAmount = 0) {
  const markup = Math.max(0, round(markupAmount));
  const base = {
    b2b_mode: mode,
    vendor_base_price: retail,
    retail_amount: retail,
    wow_markup_type: 'percentage',
    wow_markup_value: 0,
    wow_markup_amount: 0,
    b2b_markup_amount: markup
  };
  if (mode === 'COMMISSION') {
    const commission = round(retail * rates.commission / 100);
    return {
      ...base,
      b2b_price: retail,
      customer_price: retail + markup,
      b2b_commission_percentage: rates.commission,
      b2b_commission_amount: commission,
      b2b_net_discount_percentage: 0,
      b2b_net_price: retail - commission,
      final_payable_amount: retail,
      wallet_debit: retail
    };
  }
  const net = retail - round(retail * rates.net / 100);
  return {
    ...base,
    b2b_price: net,
    customer_price: net + markup,
    b2b_commission_percentage: 0,
    b2b_commission_amount: 0,
    b2b_net_discount_percentage: rates.net,
    b2b_net_price: net,
    final_payable_amount: net,
    wallet_debit: net
  };
}

function markupFrom(payload, basePrice) {
  const value = Number(payload.b2b_markup_value || 0);
  if (!value || value < 0) return 0;
  return String(payload.b2b_markup_type).toLowerCase() === 'percentage' ? basePrice * Math.min(value, 200) / 100 : Math.min(value, 1000000);
}

export async function pricingPreview(partnerId, payload) {
  const partner = await requireActivePartner(partnerId);
  const mode = MODES.includes(String(payload.mode || payload.b2b_mode).toUpperCase())
    ? String(payload.mode || payload.b2b_mode).toUpperCase()
    : (partner.allow_commission ? 'COMMISSION' : 'NON_COMMISSION');
  const priced = await priceB2BItem({ ...payload, extra_details: { rooms: payload.qty, room_price: payload.room_price } });
  const row = (await query('SELECT * FROM b2b_partners WHERE user_id = ?', [partnerId]))[0];
  const rates = await resolveRates(row, priced.kind);
  const firstPass = computeB2BPricing(priced.retail, mode, rates, 0);
  return computeB2BPricing(priced.retail, mode, rates, markupFrom(payload, firstPass.b2b_price));
}

// ------------------------------------------------------------------------
// Wallet
// ------------------------------------------------------------------------
async function postWalletEntry(conn, { partnerId, type, flow, amount, bookingId = null, description, paymentMethod = null,
  reference = null, actorId = null, idempotencyKey = null, allowBelowCredit = false }) {
  const [[row]] = await conn.execute(
    'SELECT wallet_balance, credit_limit FROM b2b_partners WHERE user_id = ? FOR UPDATE', [partnerId]);
  if (!row) throw new B2BError(404, 'B2B partner not found.');
  const before = money(row.wallet_balance);
  const value = money(amount);
  const after = money(flow === 'CREDIT' ? before + value : before - value);
  if (flow === 'DEBIT' && !allowBelowCredit && after < -money(row.credit_limit)) {
    throw new B2BError(402, `Insufficient wallet balance. This needs ${formatTHB(value)} but only ${formatTHB(before + money(row.credit_limit))} is available. Please add funds in Agent Wallet.`);
  }
  const id = newId('btx');
  await conn.execute('UPDATE b2b_partners SET wallet_balance = ? WHERE user_id = ?', [after, partnerId]);
  await conn.execute(
    `INSERT INTO b2b_wallet_transactions
      (id, partner_id, transaction_type, flow_type, amount, balance_before, balance_after, status, booking_id,
       payment_method, payment_gateway_ref, description, idempotency_key, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?, ?, ?, ?)`,
    [id, partnerId, type, flow, value, before, after, bookingId, clean(paymentMethod, 60), clean(reference, 120),
      clean(description, 500), idempotencyKey, actorId]
  );
  return { id, before, after };
}

export async function getWallet(partnerId) {
  const partner = await getPartner(partnerId);
  if (!partner) throw new B2BError(404, 'B2B partner not found.');
  const transactions = await query(
    'SELECT * FROM b2b_wallet_transactions WHERE partner_id = ? ORDER BY created_at DESC, id DESC LIMIT 300', [partnerId]);
  const done = transactions.filter(t => t.status === 'COMPLETED');
  const sum = list => money(list.reduce((s, t) => s + Number(t.amount), 0));
  const pending = transactions.filter(t => t.status === 'PENDING' && t.transaction_type === 'RECHARGE');
  return {
    success: true,
    partner_id: partnerId,
    currency: 'THB',
    wallet_balance: partner.wallet_balance,
    credit_limit: partner.credit_limit,
    available_balance: money(partner.wallet_balance + partner.credit_limit),
    pending_topup_amount: sum(pending),
    pending_topups: pending.length,
    transactions: transactions.map(t => ({ ...t, amount: Number(t.amount) })),
    stats: {
      total_credited: sum(done.filter(t => t.flow_type === 'CREDIT' && t.transaction_type !== 'REFUND_CREDIT')),
      total_debited: sum(done.filter(t => t.flow_type === 'DEBIT')),
      total_refunded: sum(done.filter(t => t.transaction_type === 'REFUND_CREDIT'))
    }
  };
}

/** Agent tells us they paid; the balance changes only when an admin confirms it. */
export async function requestTopUp(partnerId, input) {
  const partner = await requireActivePartner(partnerId);
  const amount = money(input.amount);
  if (!(amount >= 100) || amount > MAX_TOPUP) {
    throw new B2BError(400, `Top-up amount must be between ฿100 and ${formatTHB(MAX_TOPUP)}.`);
  }
  const reference = clean(input.payment_gateway_ref || input.reference, 120);
  const pendingCount = (await query(
    "SELECT COUNT(*) AS n FROM b2b_wallet_transactions WHERE partner_id = ? AND transaction_type = 'RECHARGE' AND status = 'PENDING'",
    [partnerId]))[0].n;
  if (pendingCount >= MAX_PENDING_TOPUPS) {
    throw new B2BError(429, 'You already have several top-ups waiting for confirmation. Please wait until WOW THAILAND confirms them.');
  }
  const key = clean(input.idempotency_key, 100);
  const id = newId('btx');
  const message = `Top-up request for ${formatTHB(amount)} sent. Your balance updates as soon as WOW THAILAND confirms the payment.`;
  try {
    await query(
      `INSERT INTO b2b_wallet_transactions
        (id, partner_id, transaction_type, flow_type, amount, status, payment_method, payment_gateway_ref, description, idempotency_key, created_by)
       VALUES (?, ?, 'RECHARGE', 'CREDIT', ?, 'PENDING', ?, ?, ?, ?, ?)`,
      [id, partnerId, amount, clean(input.payment_method, 60) || 'Bank transfer', reference,
        `Top-up request${reference ? ` · ref ${reference}` : ''}`, key ? `topup:${partnerId}:${key}` : null, partnerId]
    );
  } catch (err) {
    if (err.code !== 'ER_DUP_ENTRY') throw err;
    // The same request arrived twice (double click / retry): already recorded
    return { success: true, status: 'PENDING', wallet_balance: partner.wallet_balance, message };
  }
  await notify('admin', 'wallet_topup', 'B2B wallet top-up to confirm',
    `${partner.company_name} reported a top-up of ${formatTHB(amount)} (${clean(input.payment_method, 60) || 'Bank transfer'}${reference ? `, ref ${reference}` : ''}).`);
  await audit(partnerId, 'TOPUP_REQUESTED', `${formatTHB(amount)} via ${input.payment_method || 'Bank transfer'}`, { actorId: partnerId });
  return {
    success: true,
    status: 'PENDING',
    request_id: id,
    wallet_balance: partner.wallet_balance,
    message
  };
}

export async function reviewTopUp(transactionId, approve, note, admin) {
  await ensureB2BSchema();
  const result = await withTransaction(async conn => {
    const [[tx]] = await conn.execute(
      "SELECT * FROM b2b_wallet_transactions WHERE id = ? AND transaction_type = 'RECHARGE' FOR UPDATE", [transactionId]);
    if (!tx) throw new B2BError(404, 'Top-up request not found.');
    if (tx.status !== 'PENDING') throw new B2BError(409, `This top-up was already ${String(tx.status).toLowerCase()}.`);
    if (!approve) {
      await conn.execute(
        "UPDATE b2b_wallet_transactions SET status = 'REJECTED', reviewed_by = ?, reviewed_at = NOW(), review_note = ? WHERE id = ?",
        [admin.id, clean(note, 500), transactionId]);
      return { tx, approved: false };
    }
    const [[row]] = await conn.execute('SELECT wallet_balance FROM b2b_partners WHERE user_id = ? FOR UPDATE', [tx.partner_id]);
    const before = money(row.wallet_balance);
    const after = money(before + Number(tx.amount));
    await conn.execute('UPDATE b2b_partners SET wallet_balance = ? WHERE user_id = ?', [after, tx.partner_id]);
    await conn.execute(
      `UPDATE b2b_wallet_transactions SET status = 'COMPLETED', balance_before = ?, balance_after = ?,
       reviewed_by = ?, reviewed_at = NOW(), review_note = ? WHERE id = ?`,
      [before, after, admin.id, clean(note, 500), transactionId]);
    return { tx, approved: true, after };
  });
  const amount = formatTHB(result.tx.amount);
  if (result.approved) {
    await notify(result.tx.partner_id, 'wallet_credited', 'Wallet top-up confirmed', `${amount} was added to your Agent Wallet.`);
  } else {
    await notify(result.tx.partner_id, 'wallet_topup_rejected', 'Wallet top-up not confirmed',
      `Your top-up of ${amount} could not be confirmed${note ? `: ${note}` : '.'}`);
  }
  await audit(result.tx.partner_id, result.approved ? 'TOPUP_CONFIRMED' : 'TOPUP_REJECTED', `${amount}${note ? ` · ${note}` : ''}`, { actorId: admin.id });
  return { success: true, new_balance: result.after, status: result.approved ? 'COMPLETED' : 'REJECTED' };
}

export async function adjustWallet(input, admin) {
  const partner = await getPartner(input.partner_id);
  if (!partner) throw new B2BError(404, 'B2B partner not found.');
  const amount = money(input.amount);
  const reason = clean(input.reason, 400);
  if (!(amount > 0) || amount > MAX_TOPUP) throw new B2BError(400, 'Enter an amount between ฿0.01 and ฿1,000,000.');
  if (!reason) throw new B2BError(400, 'A reason is required for wallet adjustments.');
  const flow = String(input.adjustment_type).toUpperCase() === 'DEBIT' ? 'DEBIT' : 'CREDIT';
  const entry = await withTransaction(conn => postWalletEntry(conn, {
    partnerId: partner.id, type: 'ADMIN_ADJUSTMENT', flow, amount, description: `Admin adjustment: ${reason}`, actorId: admin.id
  }));
  await notify(partner.id, 'wallet_adjusted', 'Wallet adjusted by WOW THAILAND',
    `${flow === 'CREDIT' ? 'Credit' : 'Debit'} of ${formatTHB(amount)}: ${reason}`);
  await audit(partner.id, 'WALLET_ADJUSTED', `${flow} ${formatTHB(amount)}: ${reason}`, { actorId: admin.id });
  return { success: true, new_balance: entry.after, transaction_id: entry.id };
}

export async function listAllWalletTransactions() {
  await ensureB2BSchema();
  const rows = await query(
    `SELECT t.*, COALESCE(p.company_name, u.username) AS company_name, COALESCE(p.contact_name, u.username) AS partner_name
     FROM b2b_wallet_transactions t
     LEFT JOIN b2b_partners p ON p.user_id = t.partner_id
     LEFT JOIN users u ON u.id = t.partner_id
     ORDER BY t.status = 'PENDING' DESC, t.created_at DESC LIMIT 1000`
  );
  return rows.map(t => ({ ...t, amount: Number(t.amount) }));
}

// ------------------------------------------------------------------------
// Bookings
// ------------------------------------------------------------------------
const VIEW_TYPE = { hotel: 'hotel', cab: 'car', activity: 'activity', tour: 'tour' };

export async function createB2BBooking(partnerId, payload) {
  const partner = await requireActivePartner(partnerId);
  const mode = String(payload.b2b_mode || '').toUpperCase();
  if (!MODES.includes(mode)) throw new B2BError(400, 'Booking mode must be COMMISSION or NON_COMMISSION.');
  if ((mode === 'COMMISSION' && !partner.allow_commission) || (mode === 'NON_COMMISSION' && !partner.allow_non_commission)) {
    throw new B2BError(403, `Your account is not enabled for ${mode === 'COMMISSION' ? 'Commission' : 'Net wholesale'} bookings. You can request it under Partner Profile & Modes.`);
  }
  const ex = payload.extra_details || {};
  const guestName = clean(payload.guest_name || payload.name, 150);
  const guestPhone = clean(payload.guest_phone || payload.phone, 30);
  if (!guestName || !guestPhone || guestPhone.replace(/\D/g, '').length < 7) {
    throw new B2BError(400, "Please enter the guest's name and a valid phone number.");
  }
  const priced = await priceB2BItem(payload);
  const row = (await query('SELECT * FROM b2b_partners WHERE user_id = ?', [partnerId]))[0];
  const rates = await resolveRates(row, priced.kind);
  const pricing = computeB2BPricing(priced.retail, mode, rates, 0);
  const guests = intIn(payload.guests ?? ex.guests ?? (priced.kind === 'hotel' ? 2 : priced.quantity), 1, 200, 1);
  const idempotency = clean(payload.idempotency_key, 100);

  const outcome = await withTransaction(async conn => {
    // Lock the wallet first so two bookings cannot spend the same money
    const [[wallet]] = await conn.execute(
      'SELECT wallet_balance, credit_limit FROM b2b_partners WHERE user_id = ? FOR UPDATE', [partnerId]);
    const available = money(wallet.wallet_balance) + money(wallet.credit_limit);
    if (pricing.wallet_debit > available) {
      throw new B2BError(402, `Insufficient wallet balance. This booking needs ${formatTHB(pricing.wallet_debit)} but your available balance is ${formatTHB(available)}. Please add funds in Agent Wallet.`);
    }

    const created = await createBookingTransaction(conn, {
      idempotency_key: idempotency ? `b2b:${partnerId}:${idempotency}` : undefined,
      user_id: partnerId,
      vendor_id: priced.vendorId || null,
      customer_name: guestName,
      customer_phone: guestPhone,
      customer_email: clean(payload.guest_email || payload.email, 150) || '',
      start_date: priced.startDate,
      end_date: priced.endDate,
      rooms: priced.rooms,
      quantity: priced.rooms,
      base_amount_thb: pricing.wallet_debit, // what WOW THAILAND receives
      special_requests: clean(ex.special_requests || payload.special_requests, 2000),
      type: VIEW_TYPE[priced.kind],
      item_id: payload.item_id,
      item_name: priced.itemName,
      hotel_id: priced.hotelId,
      hotel_name: priced.kind === 'hotel' ? priced.itemName : undefined,
      room_type: priced.roomTypeName,
      room_type_id: priced.roomTypeId,
      booking_days: priced.kind === 'hotel' ? priced.nights : priced.quantity,
      guests,
      total_members: guests,
      meal_plan: clean(ex.rate_plan, 100),
      payment_method: 'B2B Agent Wallet',
      booking_channel: 'B2B',
      source: `B2B ${mode === 'COMMISSION' ? 'Commission' : 'Net wholesale'}`
    }, { trustedPricing: true });

    if (created.idempotent) return { bookingId: created.booking_id, repeat: true };
    const bookingId = created.booking_id;

    await conn.execute(
      `UPDATE bookings SET booking_status = 'Confirmed', payment_status = 'PAID', payment_verification_status = 'Verified',
       wallet_deduction_status = 'Completed', payment_amount = ?, payment_currency = 'THB' WHERE id = ?`,
      [pricing.wallet_debit, bookingId]);
    await conn.execute(
      `INSERT INTO b2b_booking_meta
        (booking_id, partner_id, b2b_mode, service_type, retail_amount, commission_percent, commission_amount,
         net_discount_percent, net_price, wallet_debit, markup_amount, commission_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [bookingId, partnerId, mode, priced.kind, pricing.retail_amount, pricing.b2b_commission_percentage,
        pricing.b2b_commission_amount, pricing.b2b_net_discount_percentage, pricing.b2b_net_price, pricing.wallet_debit,
        mode === 'COMMISSION' && pricing.b2b_commission_amount > 0 ? 'ACCRUED' : 'NONE']);
    const entry = await postWalletEntry(conn, {
      partnerId, type: 'BOOKING_DEBIT', flow: 'DEBIT', amount: pricing.wallet_debit, bookingId,
      description: `Booking ${bookingId} · ${priced.itemName}`, paymentMethod: 'Agent Wallet', actorId: partnerId
    });
    return { bookingId, voucherCode: created.voucher_code, walletAfter: entry.after };
  });

  if (!outcome.repeat) {
    await notify(partnerId, 'booking_confirmed', 'Booking confirmed',
      `${outcome.bookingId} · ${priced.itemName} for ${guestName}. ${formatTHB(pricing.wallet_debit)} paid from your wallet.`);
    await notify('admin', 'b2b_booking', 'New B2B booking',
      `${partner.company_name} booked ${priced.itemName} (${outcome.bookingId}) · ${mode === 'COMMISSION' ? 'Commission' : 'Net'} · ${formatTHB(pricing.wallet_debit)}.`);
    await audit(partnerId, 'BOOKING_CREATED', `${priced.itemName} · ${formatTHB(pricing.wallet_debit)} (${mode})`,
      { bookingId: outcome.bookingId, actorId: partnerId });
  }
  const voucher = (await query('SELECT voucher_code FROM vouchers WHERE booking_id = ? LIMIT 1', [outcome.bookingId]))[0];
  const wallet = await getPartner(partnerId);
  return {
    success: true,
    booking_id: outcome.bookingId,
    voucher_code: voucher?.voucher_code || outcome.voucherCode,
    status: 'Confirmed',
    payment_status: 'PAID',
    message: outcome.repeat ? 'This booking was already created.' : 'B2B booking confirmed and paid from your Agent Wallet.',
    pricing_snapshot: pricing,
    wallet_balance: wallet.wallet_balance,
    data: { id: outcome.bookingId, status: 'Confirmed', total_amount: pricing.retail_amount }
  };
}

/**
 * Called after a booking's status changes. Cancelling a B2B booking refunds the wallet
 * (and takes back a commission already paid); completing a commission booking pays the
 * commission into the wallet. Safe to call more than once.
 */
export async function onBookingStatusChange(bookingId, newStatus, actorId = null) {
  await ensureB2BSchema();
  const meta = (await query('SELECT * FROM b2b_booking_meta WHERE booking_id = ?', [bookingId]))[0];
  if (!meta) return null;
  const status = String(newStatus || '').toLowerCase();

  if (status.startsWith('cancel')) {
    const result = await withTransaction(async conn => {
      const [[m]] = await conn.execute('SELECT * FROM b2b_booking_meta WHERE booking_id = ? FOR UPDATE', [bookingId]);
      const [txs] = await conn.execute('SELECT transaction_type, amount FROM b2b_wallet_transactions WHERE booking_id = ?', [bookingId]);
      const has = type => txs.find(t => t.transaction_type === type);
      let refunded = 0;
      const debit = has('BOOKING_DEBIT');
      if (debit && !has('REFUND_CREDIT')) {
        refunded = Number(debit.amount);
        await postWalletEntry(conn, {
          partnerId: m.partner_id, type: 'REFUND_CREDIT', flow: 'CREDIT', amount: refunded, bookingId,
          description: `Refund · booking ${bookingId} cancelled`, actorId
        });
      }
      const paidCommission = has('COMMISSION_CREDIT');
      if (paidCommission && !has('COMMISSION_REVERSAL')) {
        await postWalletEntry(conn, {
          partnerId: m.partner_id, type: 'COMMISSION_REVERSAL', flow: 'DEBIT', amount: Number(paidCommission.amount), bookingId,
          description: `Commission reversed · booking ${bookingId} cancelled`, actorId, allowBelowCredit: true
        });
      }
      await conn.execute("UPDATE b2b_booking_meta SET commission_status = IF(commission_status = 'NONE', 'NONE', 'VOID') WHERE booking_id = ?", [bookingId]);
      await conn.execute("UPDATE bookings SET payment_status = 'REFUNDED' WHERE id = ? AND payment_status = 'PAID'", [bookingId]);
      return { partnerId: m.partner_id, refunded };
    });
    if (result.refunded > 0) {
      await notify(result.partnerId, 'booking_refunded', 'Booking cancelled · wallet refunded',
        `${bookingId} was cancelled and ${formatTHB(result.refunded)} was returned to your Agent Wallet.`);
      await audit(result.partnerId, 'BOOKING_REFUNDED', `${formatTHB(result.refunded)} refunded`, { bookingId, actorId });
    }
    return result;
  }

  if (status.startsWith('complet') && meta.b2b_mode === 'COMMISSION' && meta.commission_status === 'ACCRUED') {
    const result = await withTransaction(async conn => {
      const [[m]] = await conn.execute('SELECT * FROM b2b_booking_meta WHERE booking_id = ? FOR UPDATE', [bookingId]);
      if (m.commission_status !== 'ACCRUED' || !(Number(m.commission_amount) > 0)) return null;
      await postWalletEntry(conn, {
        partnerId: m.partner_id, type: 'COMMISSION_CREDIT', flow: 'CREDIT', amount: Number(m.commission_amount), bookingId,
        description: `Commission · booking ${bookingId} completed`, actorId
      });
      await conn.execute("UPDATE b2b_booking_meta SET commission_status = 'CREDITED' WHERE booking_id = ?", [bookingId]);
      return { partnerId: m.partner_id, commission: Number(m.commission_amount) };
    });
    if (result) {
      await notify(result.partnerId, 'commission_credited', 'Commission credited',
        `${formatTHB(result.commission)} commission for ${bookingId} was added to your Agent Wallet.`);
      await audit(result.partnerId, 'COMMISSION_CREDITED', formatTHB(result.commission), { bookingId, actorId });
    }
    return result;
  }
  return null;
}

/** Agent sets the markup they charge their customer (shown on the customer invoice). */
export async function setBookingMarkup(partnerId, bookingId, amount) {
  await ensureB2BSchema();
  const meta = (await query('SELECT * FROM b2b_booking_meta WHERE booking_id = ? AND partner_id = ?', [bookingId, partnerId]))[0];
  if (!meta) throw new B2BError(404, 'Booking not found in your account.');
  const markup = Math.max(0, Math.min(1000000, round(amount)));
  await query('UPDATE b2b_booking_meta SET markup_amount = ? WHERE booking_id = ?', [markup, bookingId]);
  return { success: true, booking_id: bookingId, b2b_markup_amount: markup };
}

/** Bookings made by one partner ('all' for every partner), with their B2B figures. */
export async function listPartnerBookings(partnerId, { mode = '', status = 'all', search = '', addPortalFields }) {
  await ensureB2BSchema();
  const where = [];
  const params = [];
  if (partnerId === 'all') {
    where.push("b.user_id IN (SELECT id FROM users WHERE role IN ('b2b_agent', 'b2b', 'agent'))");
  } else {
    where.push('b.user_id = ?');
    params.push(partnerId);
  }
  const wantedMode = String(mode || '').toUpperCase();
  if (wantedMode === 'COMMISSION') where.push("(m.b2b_mode = 'COMMISSION' OR m.b2b_mode IS NULL)");
  else if (wantedMode === 'NON_COMMISSION') where.push("m.b2b_mode = 'NON_COMMISSION'");
  const st = String(status || 'all').toLowerCase();
  if (st !== 'all') {
    const map = { pending: 'Awaiting Payment', confirmed: 'Confirmed', cancelled: 'Cancelled', canceled: 'Cancelled', completed: 'Completed' };
    if (map[st]) {
      where.push('b.booking_status = ?');
      params.push(map[st]);
    }
  }
  const term = String(search || '').trim();
  if (term) {
    where.push('(b.id LIKE ? OR b.customer_name LIKE ? OR b.customer_phone LIKE ?)');
    params.push(`%${term}%`, `%${term}%`, `%${term}%`);
  }
  const rows = await query(
    `SELECT b.*, m.b2b_mode AS m_mode, m.service_type AS m_service, m.retail_amount AS m_retail,
            m.commission_percent AS m_comm_pct, m.commission_amount AS m_comm, m.net_discount_percent AS m_net_pct,
            m.net_price AS m_net, m.wallet_debit AS m_debit, m.markup_amount AS m_markup, m.commission_status AS m_comm_status,
            COALESCE(p.company_name, u.username) AS partner_company
     FROM bookings b
     LEFT JOIN b2b_booking_meta m ON m.booking_id = b.id
     LEFT JOIN b2b_partners p ON p.user_id = b.user_id
     LEFT JOIN users u ON u.id = b.user_id
     WHERE ${where.join(' AND ')}
     ORDER BY b.created_at DESC LIMIT 1000`,
    params
  );
  // Portal fields are built from the plain booking columns (without the joined B2B ones)
  const plain = rows.map(r => Object.fromEntries(
    Object.entries(r).filter(([key]) => !key.startsWith('m_') && key !== 'partner_company')));
  const view = await addPortalFields(plain);
  return view.map((b, i) => {
    const r = rows[i];
    const hasMeta = Boolean(r.m_mode);
    const retail = hasMeta ? Number(r.m_retail) : Number(r.base_amount_thb || 0);
    const markup = hasMeta ? Number(r.m_markup) : 0;
    const modeOf = r.m_mode || 'COMMISSION';
    const net = hasMeta ? Number(r.m_net) : retail;
    return {
      ...b,
      partner_id: r.user_id,
      company_name: r.partner_company,
      b2b_mode: modeOf,
      b2b_service_type: r.m_service || b.type,
      total_amount: retail,
      retail_amount: retail,
      b2b_price: modeOf === 'COMMISSION' ? retail : net,
      b2b_commission_percentage: hasMeta ? Number(r.m_comm_pct) : 0,
      b2b_commission_amount: hasMeta ? Number(r.m_comm) : 0,
      b2b_commission_status: hasMeta ? String(r.m_comm_status).toLowerCase() : 'none',
      b2b_net_discount_percentage: hasMeta ? Number(r.m_net_pct) : 0,
      b2b_net_price: net,
      b2b_markup_amount: markup,
      customer_price: (modeOf === 'COMMISSION' ? retail : net) + markup,
      wallet_debit: hasMeta ? Number(r.m_debit) : null,
      days: b.booking_days ? `${b.booking_days} ${r.m_service === 'hotel' ? 'Night' : 'Day'}${Number(b.booking_days) > 1 ? 's' : ''}` : undefined
    };
  });
}

export async function dashboardFor(partnerId, addPortalFields) {
  const partner = await getPartner(partnerId);
  if (!partner) throw new B2BError(404, 'B2B partner not found.');
  const bookings = await listPartnerBookings(partnerId, { addPortalFields });
  const live = bookings.filter(b => b.booking_status !== 'Cancelled');
  const today = new Date().toISOString().slice(0, 10);
  const sum = (list, f) => money(list.reduce((s, b) => s + Number(f(b) || 0), 0));
  return {
    success: true,
    partner,
    metrics: {
      partner_id: partner.id,
      company_name: partner.company_name,
      total_bookings: live.length,
      completed_bookings: live.filter(b => b.booking_status === 'Completed').length,
      upcoming_bookings: live.filter(b => b.booking_status !== 'Completed' && dayOf(b.start_date) >= today).length,
      total_commission_earned: sum(live.filter(b => b.b2b_commission_status === 'credited'), b => b.b2b_commission_amount),
      total_commission_pending: sum(live.filter(b => b.b2b_commission_status === 'accrued'), b => b.b2b_commission_amount),
      non_commission_bookings: live.filter(b => b.b2b_mode === 'NON_COMMISSION').length,
      total_sales_volume: sum(live, b => b.retail_amount),
      wallet_balance: partner.wallet_balance,
      recent_bookings: bookings.slice(0, 5)
    }
  };
}

export async function reportsFor(partnerId, addPortalFields) {
  const partner = await getPartner(partnerId);
  if (!partner) throw new B2BError(404, 'B2B partner not found.');
  const live = (await listPartnerBookings(partnerId, { addPortalFields })).filter(b => b.booking_status !== 'Cancelled');
  const sum = (list, f) => money(list.reduce((s, b) => s + Number(f(b) || 0), 0));
  const label = { hotel: 'Hotels & Resorts', cab: 'Cabs & Transfers', car: 'Cabs & Transfers', activity: 'Sightseeing & Activities', tour: 'Sightseeing & Activities', sightseeing: 'Sightseeing & Activities' };
  const groups = new Map();
  for (const b of live) {
    const key = label[b.b2b_service_type] || 'Other Services';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(b);
  }
  const months = new Map();
  for (const b of live) {
    const key = dayOf(b.created_at).slice(0, 7);
    if (!key) continue;
    if (!months.has(key)) months.set(key, []);
    months.get(key).push(b);
  }
  return {
    success: true,
    company_name: partner.company_name,
    summary: {
      total_bookings: live.length,
      total_sales_volume: sum(live, b => b.retail_amount),
      total_commission_earned: sum(live.filter(b => b.b2b_commission_status === 'credited'), b => b.b2b_commission_amount),
      total_commission_pending: sum(live.filter(b => b.b2b_commission_status === 'accrued'), b => b.b2b_commission_amount)
    },
    service_breakdown: [...groups].map(([service_category, list]) => ({
      service_category,
      booking_count: list.length,
      sales_volume: sum(list, b => b.retail_amount),
      commission_earned: sum(list.filter(b => b.b2b_commission_status === 'credited'), b => b.b2b_commission_amount)
    })),
    monthly_trends: [...months].sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([month, list]) => ({
      month_year: month,
      bookings_count: list.length,
      monthly_sales: sum(list, b => b.retail_amount),
      monthly_commission: sum(list, b => b.b2b_commission_amount)
    }))
  };
}

export async function customersFor(partnerId, search = '') {
  await ensureB2BSchema();
  const term = `%${String(search || '').trim()}%`;
  const rows = await query(
    `SELECT b.customer_name, b.customer_phone, b.customer_email, b.created_at, b.booking_status,
            COALESCE(m.retail_amount, b.base_amount_thb) AS amount, COALESCE(m.markup_amount, 0) AS markup
     FROM bookings b LEFT JOIN b2b_booking_meta m ON m.booking_id = b.id
     WHERE b.user_id = ? AND (b.customer_name LIKE ? OR b.customer_phone LIKE ? OR b.customer_email LIKE ?)
     ORDER BY b.created_at DESC LIMIT 2000`,
    [partnerId, term, term, term]
  );
  const guests = new Map();
  for (const r of rows) {
    const key = String(r.customer_phone || '').replace(/\D/g, '').slice(-9) || String(r.customer_email || r.customer_name).toLowerCase();
    if (!guests.has(key)) {
      guests.set(key, {
        id: `guest_${key}`,
        customer_name: r.customer_name,
        customer_phone: r.customer_phone,
        customer_email: r.customer_email,
        date_of_birth: null,
        total_bookings: 0,
        total_spent: 0,
        last_booking_date: r.created_at
      });
    }
    const g = guests.get(key);
    g.total_bookings += 1;
    if (r.booking_status !== 'Cancelled') g.total_spent = money(g.total_spent + Number(r.amount) + Number(r.markup));
  }
  return [...guests.values()];
}

// ------------------------------------------------------------------------
// Notifications & audit (read side)
// ------------------------------------------------------------------------
export async function listNotifications(ownerId) {
  await ensureB2BSchema();
  const notifications = await query(
    'SELECT * FROM b2b_notifications WHERE partner_id = ? ORDER BY created_at DESC LIMIT 100', [ownerId]);
  return {
    success: true,
    notifications: notifications.map(n => ({ ...n, is_read: Number(n.is_read) })),
    unread_count: notifications.filter(n => !Number(n.is_read)).length
  };
}

export async function markNotificationsRead(ownerId, id, all) {
  await ensureB2BSchema();
  if (all) await query('UPDATE b2b_notifications SET is_read = 1 WHERE partner_id = ?', [ownerId]);
  else await query('UPDATE b2b_notifications SET is_read = 1 WHERE partner_id = ? AND id = ?', [ownerId, id]);
  return { success: true };
}

export async function clearNotifications(ownerId) {
  await ensureB2BSchema();
  await query('DELETE FROM b2b_notifications WHERE partner_id = ?', [ownerId]);
  return { success: true };
}

export async function listAuditLog(partnerId = '') {
  await ensureB2BSchema();
  const rows = partnerId
    ? await query(
      `SELECT a.*, COALESCE(p.company_name, u.username) AS company_name FROM b2b_audit_log a
       LEFT JOIN b2b_partners p ON p.user_id = a.partner_id LEFT JOIN users u ON u.id = a.partner_id
       WHERE a.partner_id = ? ORDER BY a.created_at DESC LIMIT 500`, [partnerId])
    : await query(
      `SELECT a.*, COALESCE(p.company_name, u.username) AS company_name FROM b2b_audit_log a
       LEFT JOIN b2b_partners p ON p.user_id = a.partner_id LEFT JOIN users u ON u.id = a.partner_id
       ORDER BY a.created_at DESC LIMIT 500`);
  return rows.map(a => ({ ...a, message_text: a.reason, status: a.action }));
}

export async function cancelB2BBooking(bookingId, reason, actor, restoreBookingInventory) {
  await ensureB2BSchema();
  const booking = (await query('SELECT * FROM bookings WHERE id = ?', [bookingId]))[0];
  if (!booking) throw new B2BError(404, 'Booking not found.');
  const isStaff = !isB2BRole(actor.role);
  if (!isStaff && booking.user_id !== actor.id) throw new B2BError(403, 'You can only cancel your own bookings.');
  if (booking.booking_status === 'Cancelled') throw new B2BError(409, 'This booking is already cancelled.');
  if (booking.booking_status === 'Completed') throw new B2BError(409, 'A completed booking cannot be cancelled.');
  if (!isStaff) {
    const today = new Date().toISOString().slice(0, 10);
    const start = dayOf(booking.start_date);
    if (start && start < today) throw new B2BError(409, 'This trip has already started. Please contact WOW THAILAND to cancel it.');
  }
  await withTransaction(conn => restoreBookingInventory(conn, bookingId));
  const refund = await onBookingStatusChange(bookingId, 'Cancelled', actor.id);
  await audit(booking.user_id, 'BOOKING_CANCELLED', reason || 'Cancelled', { bookingId, actorId: actor.id });
  return {
    success: true,
    booking_id: bookingId,
    status: 'Cancelled',
    refunded_amount: refund?.refunded || 0,
    message: refund?.refunded ? `Booking cancelled. ${formatTHB(refund.refunded)} was returned to the Agent Wallet.` : 'Booking cancelled.'
  };
}
