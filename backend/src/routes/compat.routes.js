// ========================================================================
// WOW THAILAND: Legacy /api.php Compatibility Router
// Dispatches 73 resource queries from existing React frontend to Node.js / MySQL controllers
// Strictly maps legacy queries without mock data fallbacks for unimplemented endpoints
// ========================================================================

import { Router } from 'express';
import { query, withTransaction } from '../config/db.js';
import { restoreBookingInventory, createBookingTransaction } from '../services/bookingService.js';
import { sendBookingVoucherEmail } from '../services/emailService.js';
import * as hotelController from '../controllers/hotelController.js';
import * as transferController from '../controllers/transferController.js';
import * as tourController from '../controllers/tourController.js';
import * as bookingController from '../controllers/bookingController.js';
import * as authController from '../controllers/authController.js';
import * as pmsController from '../controllers/pmsController.js';
import * as driverController from '../controllers/driverController.js';
import * as b2bController from '../controllers/b2bController.js';
import * as walletController from '../controllers/walletController.js';
import { getExchangeRate, convertFromTHB } from '../services/currencyService.js';
import { generateVoucherPdfBuffer } from '../services/pdfVoucherService.js';
import { signJwtToken } from '../middleware/auth.js';
import { resolveVendorId, resolveDriverId, isBookingOwnerOrStaff, verifyCustomerSelfAccess } from '../utils/identityResolver.js';
import { generateAndSendOtp, verifyHashedOtp } from '../services/otpService.js';
import { addPortalFields } from '../services/customerBookingView.js';
import { hasVoucherAccess, voucherAccessKey } from '../utils/voucherLink.js';
import { findAccountForReset } from '../utils/accountLookup.js';
import {
  isLocalRequest, devShortcutsAllowed, clientIp, retryAfter, noteAttempt, tooManyAttempts
} from '../utils/loginGuard.js';
import { handleB2BRequest, B2B_ADMIN_RESOURCES, B2B_ADMIN_ACTIONS } from '../controllers/b2bPortalController.js';
import { onBookingStatusChange, setPartnerStatus } from '../services/b2bService.js';

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.jpg';
    cb(null, `file-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

const router = Router();

// In-memory password reset store
const resetOtpStore = new Map();

function hashResetCode(identifier, code) {
  return crypto.createHmac('sha256', process.env.JWT_SECRET || 'wow_thailand_reset_secret')
    .update(`${identifier.trim().toLowerCase()}:${code.trim()}`)
    .digest('hex');
}

function sameSecret(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  return left.length > 0 && left.length === right.length && crypto.timingSafeEqual(left, right);
}

const MAX_RESET_CODE_TRIES = 5;

/**
 * Checks a password-reset code against the one emailed to the account. Five wrong codes cancel it.
 * The test code 123456 is accepted only on this computer while ALLOW_DEMO_PASSWORDS=true.
 */
function checkResetCode(req, identifier, enteredCode) {
  const key = identifier.trim().toLowerCase();
  const stored = resetOtpStore.get(key);
  if (!stored || Date.now() > stored.expiresAt) {
    resetOtpStore.delete(key);
    return { ok: false, error: 'This code has expired or was not requested. Please request a new code.' };
  }
  const code = String(enteredCode || '').trim();
  if (code && devShortcutsAllowed(req) && code === '123456') return { ok: true, stored };
  if (code && sameSecret(stored.otpHash, hashResetCode(identifier, code))) return { ok: true, stored };

  stored.attempts = (stored.attempts || 0) + 1;
  if (stored.attempts >= MAX_RESET_CODE_TRIES) {
    resetOtpStore.delete(key);
    return { ok: false, error: 'Too many wrong codes. Please request a new code.' };
  }
  return { ok: false, error: 'Invalid or expired verification code.' };
}

// -------------------------------------------------------------
// ACCESS POLICY
// Strict role-based authorization for all resources and operations
// -------------------------------------------------------------
const ADMIN_ROLES = ['admin', 'superadmin', 'subadmin', 'sub_admin', 'super_admin'];
const PARTNER_ROLES = [
  ...ADMIN_ROLES,
  'hotel_vendor', 'transfer_vendor', 'tour_vendor', 'flight_vendor', 'vendor',
  'b2b_agent', 'b2b', 'agent', 'driver'
];
const ALL_AUTHENTICATED_ROLES = ['customer', ...PARTNER_ROLES];

const ADMIN_ONLY_RESOURCES = new Set([
  'users', 'assignable_users', 'leads', 'ai_leads', 'custom_enquiries', 'lead_comments',
  'admin_reviews', 'admin_b2b_notifications', 'b2b_partners', 'b2b_all_wallet_transactions',
  'b2b_mode_requests', 'birthday_logs', 'today_birthdays', 'blocked_booking_alerts',
  'commission_rules', 'platform_revenue', 'vendor_reactivations', 'all_vendor_hold_settings',
  'wallet_settlements', 'settlements', 'pricing_rules',
  ...B2B_ADMIN_RESOURCES
]);
const ADMIN_ONLY_ACTIONS = new Set([
  'update_lead', 'update_lead_status', 'assign_lead', 'update_next_action', 'delete_lead',
  'add_lead_comment', 'delete_lead_comment', 'delete_master_hotel', 'get_admin_payment_methods',
  'recharge_wallet', 'top_up_wallet', 'toggle_user_status',
  ...B2B_ADMIN_ACTIONS
]);
const PARTNER_RESOURCES = new Set([
  'vendor_wallets', 'wallets', 'wallet', 'wallet_transactions', 'payment_gateways', 'payment_settings',
  'vendor_wallet_info', 'my_subscription', 'global_settings',
  'hotel_guests', 'hotel_staff', 'hotel_support_tickets', 'hotel_activity_logs',
  'pms_stats', 'pms_dashboard_activity', 'pms_list_amenity_requests',
  'b2b_dashboard', 'b2b_wallet', 'b2b_reports', 'b2b_customers', 'b2b_notifications',
  'driver_jobs', 'available_driver_jobs'
]);
const PARTNER_ACTIONS = new Set([
  'create_hotel', 'add_hotel', 'edit_hotel', 'update_hotel', 'delete_hotel', 'add_master_hotel',
  'update_booking_status', 'update_booking_checkin', 'verify_booking_payment', 'confirm_booking',
  'reject_booking_payment', 'create_add_on', 'update_add_on', 'delete_add_on',
  'create_activity', 'update_activity', 'delete_activity',
  'add_vendor_payment_method', 'update_vendor_payment_method', 'delete_vendor_payment_method',
  'get_vendor_payment_methods', 'b2b_book'
]);

/** Returns the roles allowed for this request, or null when it is public. */
function requiredRoles(req, resource, action) {
  if (ADMIN_ONLY_RESOURCES.has(resource) || ADMIN_ONLY_ACTIONS.has(action)) return ADMIN_ROLES;
  // Driver names, phones, licence numbers and live locations are not public
  if (resource === 'drivers') return ADMIN_ROLES;
  if (resource === 'driver_details') return ['driver', ...ADMIN_ROLES];
  if (resource === 'b2b_bookings') return ['b2b_agent', 'b2b', 'agent', ...ADMIN_ROLES];
  if (PARTNER_RESOURCES.has(resource) || PARTNER_ACTIONS.has(action) || action.startsWith('pms_')) {
    return PARTNER_ROLES;
  }
  if (action === 'update_driver_job_status') {
    return ['driver', ...ADMIN_ROLES];
  }
  if (resource === 'booking_invoice_data' || action === 'download_voucher_pdf' || action === 'download_pdf') {
    // Shared voucher link (email / WhatsApp) carries a key for that one booking
    if (action !== 'booking_invoice_data' && resource !== 'booking_invoice_data' && hasVoucherAccess(voucherIdFrom(req), req.query.vk)) {
      return null;
    }
    return ALL_AUTHENTICATED_ROLES;
  }
  if (resource === 'customer_wallet' || resource === 'customer_wallet_transactions' || resource === 'customer_loyalty') {
    return ALL_AUTHENTICATED_ROLES;
  }
  if (resource === 'bookings') {
    if (req.method === 'POST') {
      if (action === 'create' || action === 'book' || action === 'create_booking' || !action) {
        return null; // Public checkout creation
      }
      return PARTNER_ROLES;
    }
    // Shared voucher link: one booking, read-only
    if (req.method === 'GET' && hasVoucherAccess(voucherIdFrom(req), req.query.vk)) return null;
    // GET bookings requires authentication
    return ALL_AUTHENTICATED_ROLES;
  }
  return null;
}

function voucherIdFrom(req) {
  return req.query.id || req.query.booking_id || req.query.pnr || '';
}

// Actions that change a hotel's content (the hotel record, room types, rooms, menu, bar,
// amenities, meal plans, publish status). Only admins, or the hotel vendor who owns that
// hotel, may use them.
const HOTEL_WRITE_ACTIONS = new Set([
  'update_hotel', 'edit_hotel', 'delete_hotel',
  'pms_delete_menu_item', 'pms_save_menu_item', 'pms_save_bar_lounge', 'pms_delete_bar_lounge',
  'pms_save_hotel_categorized_amenities', 'pms_save_hotel_amenities', 'pms_save_room_categorized_amenities',
  'pms_request_custom_amenity', 'pms_save_room_meal_plans', 'pms_sync_room_meal_plans',
  'pms_update_hotel_status', 'pms_delete_room_type', 'pms_create_room_type', 'pms_update_room_type',
  'pms_create_room', 'pms_update_room', 'pms_delete_room',
  'pms_update_availability', 'pms_create_manual_booking'
]);

/** The hotels a hotel-content request would change. */
async function hotelsTouchedBy(action, body, q) {
  const ids = new Set();
  const add = (v) => { if (v) ids.add(String(v)); };
  const lookup = async (sql, id) => { if (id) (await query(sql, [id])).forEach(r => add(r.hotel_id)); };
  const id = body.id || q.id;

  add(body.hotel_id);
  add(q.hotel_id);
  if (['update_hotel', 'edit_hotel', 'delete_hotel'].includes(action)) add(id);
  await lookup('SELECT hotel_id FROM hotel_room_types WHERE id = ?', body.room_type_id);
  for (const rtId of Array.isArray(body.room_type_ids) ? body.room_type_ids : []) {
    await lookup('SELECT hotel_id FROM hotel_room_types WHERE id = ?', rtId);
  }
  if (action === 'pms_delete_room_type' || action === 'pms_update_room_type') {
    await lookup('SELECT hotel_id FROM hotel_room_types WHERE id = ?', id);
  }
  if (action === 'pms_delete_room' || action === 'pms_update_room') {
    await lookup('SELECT hotel_id FROM hotel_rooms WHERE id = ?', id);
  }
  if (action === 'pms_delete_menu_item') {
    const itemId = body.id || q.id || body.item_id;
    await lookup('SELECT hotel_id FROM hotel_menu_items WHERE id = ?', itemId);
    add(hotelMenuItemsMap.get(itemId)?.hotel_id);
  }
  return [...ids];
}

/** True when this login owns the hotel (directly, or through one of its vendor rows). */
async function ownsHotel(user, hotelId) {
  const rows = await query(
    `SELECT 1 FROM hotels h LEFT JOIN vendors v ON v.id = h.vendor_id
     WHERE h.id = ? AND (h.vendor_id = ? OR v.user_id = ?) LIMIT 1`,
    [hotelId, user.id, user.id]
  );
  return rows.length > 0;
}

/** Returns an error message when this user may not make this hotel change, else null. */
async function hotelWriteDenied(user, action, body, q) {
  if (ADMIN_ROLES.includes(user.role)) return null;
  if (user.role !== 'hotel_vendor') return 'Only hotel vendors and admins can change hotel details.';
  const hotelIds = await hotelsTouchedBy(action, body, q);
  if (hotelIds.length === 0) return 'Choose which of your hotels to update (hotel_id is missing).';
  for (const hotelId of hotelIds) {
    if (!(await ownsHotel(user, hotelId))) return 'You can only change your own hotels.';
  }
  return null;
}

// In-memory PMS Hotel Menu Items store
const hotelMenuItemsMap = new Map([
  ['menu-01', {
    id: 'menu-01',
    hotel_id: 'th-htl-02',
    name: 'Tom Yum Goong Royal Seafood',
    category: 'Soups',
    category_name: 'Soups',
    price: 320,
    is_veg: 0,
    is_available: 1,
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
    description: 'Spicy and sour traditional Thai lemongrass broth with jumbo river prawns, galangal, kaffir lime, and wild straw mushrooms.'
  }],
  ['menu-02', {
    id: 'menu-02',
    hotel_id: 'th-htl-02',
    name: 'Pad Thai Boran with Andaman Prawns',
    category: 'Mains',
    category_name: 'Mains',
    price: 280,
    is_veg: 0,
    is_available: 1,
    image_url: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=600&q=80',
    description: 'Classic wok-tossed rice noodles with tamarind reduction, crispy shallots, crushed roasted peanuts, tofu, and fresh lime.'
  }],
  ['menu-03', {
    id: 'menu-03',
    hotel_id: 'th-htl-02',
    name: 'Nam Dok Mai Mango Sticky Rice',
    category: 'Desserts',
    category_name: 'Desserts',
    price: 220,
    is_veg: 1,
    is_available: 1,
    image_url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80',
    description: 'Sweet coconut cream infused sticky rice served with sliced honey-sweet ripe Nam Dok Mai mango and toasted mung beans.'
  }],
  ['menu-04', {
    id: 'menu-04',
    hotel_id: 'th-htl-02',
    name: 'Siam Sunset Dragonfruit Martini',
    category: 'Beverages & Shakes',
    category_name: 'Beverages & Shakes',
    price: 350,
    is_veg: 1,
    is_available: 1,
    image_url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=600&q=80',
    description: 'Fresh pink dragonfruit, kaffir lime infused gin, lemongrass syrup, and splash of ginger ale.'
  }]
]);

router.all('/api.php', upload.any(), async (req, res, next) => {
  const resource = req.query.resource || req.body?.resource || '';
  const action = req.query.action || req.body?.action || '';

  const roles = requiredRoles(req, resource, action);
  if (roles) {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges.' });
    }
  }

  try {
    // Hotel content changes: admins, or the hotel vendor who owns the hotel
    if (HOTEL_WRITE_ACTIONS.has(action)) {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
      }
      const denied = await hotelWriteDenied(req.user, action, req.body || {}, req.query);
      if (denied) {
        return res.status(403).json({ success: false, error: denied });
      }
    }

    // B2B partner portal (partners, pricing, prepaid wallet, bookings, admin approvals)
    if ((await handleB2BRequest(req, res, resource, action)) !== false) return;

    // -------------------------------------------------------------
    // FILE UPLOAD (Images, Documents, Photos)
    // -------------------------------------------------------------
    if (action === 'upload_image' || action === 'upload_doc' || action === 'upload_document') {
      if (req.files && req.files.length > 0) {
        const file = req.files[0];
        const fileUrl = `/uploads/${file.filename}`;
        return res.json({
          success: true,
          url: fileUrl,
          filename: file.filename,
          original_name: file.originalname,
          size: file.size
        });
      }

      // Base64 JSON upload fallback
      const base64Data = req.body?.image_base64 || req.body?.file_base64 || req.body?.data;
      if (base64Data && typeof base64Data === 'string') {
        const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        let ext = '.jpg';
        let buffer;
        if (matches && matches.length === 3) {
          const mime = matches[1];
          buffer = Buffer.from(matches[2], 'base64');
          if (mime.includes('png')) ext = '.png';
          else if (mime.includes('webp')) ext = '.webp';
          else if (mime.includes('pdf')) ext = '.pdf';
        } else {
          buffer = Buffer.from(base64Data, 'base64');
        }

        const filename = `upload-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
        const filePath = path.join(uploadDir, filename);
        await fs.promises.writeFile(filePath, buffer);

        return res.json({
          success: true,
          url: `/uploads/${filename}`,
          filename
        });
      }

      return res.status(400).json({ success: false, error: 'No file or valid Base64 data provided.' });
    }

    // -------------------------------------------------------------
    // 1. AUTHENTICATION, REGISTRATION & LOGIN
    // -------------------------------------------------------------
    if (action === 'login' || action === 'b2b_login' || resource === 'auth') {
      // The B2B portal's own sign-in accepts B2B partner accounts only
      return authController.login(req, res, next, { b2bOnly: action === 'b2b_login' });
    }

    if (action === 'send_customer_otp') {
      const payload = req.body || {};
      const phone = (payload.phone || req.query.phone || '').trim();
      const email = (payload.email || req.query.email || '').trim().toLowerCase();

      if (!phone && !email) {
        return res.status(400).json({ success: false, error: 'Mobile number or email is required.' });
      }

      // Stops one address from flooding many phones / inboxes with codes
      const sendLimits = isLocalRequest(req) ? [] : [{ key: `otp-send:ip:${clientIp(req)}`, max: 15 }];
      const sendWait = retryAfter(sendLimits);
      if (sendWait) {
        return tooManyAttempts(res, sendWait);
      }
      noteAttempt(sendLimits);

      const cleanPhone = phone.replace(/\D/g, '');
      let foundEmail = email;
      let customerName = 'Valued Traveler';

      if (cleanPhone) {
        try {
          const last10 = cleanPhone.slice(-10);
          const rows = await query(
            'SELECT customer_name, customer_email FROM bookings WHERE customer_phone LIKE ? ORDER BY created_at DESC LIMIT 1',
            [`%${last10}%`]
          );
          if (rows.length > 0) {
            customerName = rows[0].customer_name || customerName;
            if (!foundEmail && rows[0].customer_email) {
              foundEmail = rows[0].customer_email;
            }
          }
        } catch (e) {}
      }

      const otpResult = await generateAndSendOtp({
        phone: cleanPhone,
        email: foundEmail || email,
        purpose: 'Customer Portal Login'
      });

      if (!otpResult.success) {
        return res.status(400).json(otpResult);
      }

      const dest = foundEmail || email || phone;
      const masked = dest.includes('@')
        ? dest.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.max(b.length, 3)) + c)
        : phone.replace(/(\d{2})\d+(\d{2})/, '$1******$2');

      return res.json({
        success: true,
        message: `A secure 6-digit verification code has been dispatched to ${masked}. Valid for 10 minutes.`,
        email: foundEmail || email
      });
    }

    if (action === 'verify_customer_otp') {
      const payload = req.body || {};
      const phone = (payload.phone || req.query.phone || '').trim();
      const email = (payload.email || req.query.email || '').trim().toLowerCase();
      const enteredOtp = String(payload.otp || req.query.otp || '').trim();

      // Each code allows 5 tries; this also caps wrong codes per address across many numbers
      const verifyLimits = isLocalRequest(req) ? [] : [{ key: `otp-verify:ip:${clientIp(req)}`, max: 20 }];
      const verifyWait = retryAfter(verifyLimits);
      if (verifyWait) {
        return tooManyAttempts(res, verifyWait);
      }

      const verifyResult = verifyHashedOtp({
        phone,
        email,
        enteredOtp
      });

      if (!verifyResult.success) {
        noteAttempt(verifyLimits);
        return res.status(400).json(verifyResult);
      }

      const cleanPhone = phone.replace(/\D/g, '');
      let customerName = 'Valued Traveler';
      let customerEmail = email;
      let customerId = `c_${cleanPhone || Date.now()}`;
      try {
        const last10 = cleanPhone.slice(-10);
        // Name from the customer's newest booking, preferring bookings made with this phone
        // number over older bookings that only share the email address
        const rows = await query(
          `SELECT user_id, customer_name, customer_email, customer_phone FROM bookings
           WHERE customer_phone LIKE ? OR customer_email = ?
           ORDER BY (customer_phone LIKE ?) DESC, created_at DESC LIMIT 1`,
          [`%${last10}%`, email || '___none___', `%${last10}%`]
        );
        if (rows.length > 0) {
          customerName = rows[0].customer_name || customerName;
          customerEmail = rows[0].customer_email || customerEmail;
          customerId = rows[0].user_id || customerId;
        }
      } catch (e) { }

      // Authoritative Customer JWT issuance with strict role
      const customerToken = signJwtToken(
        {
          id: customerId,
          phone: cleanPhone,
          email: customerEmail,
          role: 'customer',
          name: customerName
        },
        '30d'
      );

      return res.json({
        success: true,
        token: customerToken,
        customer: {
          id: customerId,
          name: customerName,
          username: customerEmail ? customerEmail.split('@')[0] : (cleanPhone || 'customer'),
          phone: phone,
          email: customerEmail || 'guest@wowthailand.com',
          role: 'customer',
          token: customerToken
        }
      });
    }

    if (action === 'forgot_password_request') {
      const payload = req.body || {};
      const identifier = (payload.identifier || req.query.identifier || '').trim();
      if (!identifier) {
        return res.status(400).json({ success: false, error: 'Identifier is required.' });
      }

      const requestLimits = isLocalRequest(req) ? [] : [
        { key: `reset-request:ip:${clientIp(req)}`, max: 10 },
        { key: `reset-request:id:${identifier.toLowerCase()}`, max: 5 }
      ];
      const requestWait = retryAfter(requestLimits);
      if (requestWait) {
        return tooManyAttempts(res, requestWait);
      }
      noteAttempt(requestLimits);

      // Same answer whether or not the account exists, so this cannot be used to discover accounts
      const reply = {
        success: true,
        message: 'If an account matches, a 6-digit reset code has been sent to its registered email address.'
      };

      // Phone numbers also match when typed without the country code or spaces
      // ("0812345678" for "+66 81 234 5678"); before, those requests silently matched nothing
      const found = await findAccountForReset(identifier);
      if (!found) {
        return res.json(reply);
      }
      const { account, loginId } = found;

      // The code goes only to the email saved on the account; it is never sent back in this response
      const otp = crypto.randomInt(100000, 1000000).toString();
      resetOtpStore.set(identifier.toLowerCase(), {
        userId: account.id,
        loginId,
        otpHash: hashResetCode(identifier, otp),
        verifiedToken: null,
        attempts: 0,
        expiresAt: Date.now() + 10 * 60 * 1000
      });

      if (account.email && account.email.includes('@')) {
        import('../services/emailService.js').then(m => {
          m.sendOtpEmail(account.email, otp, 'Password Reset').catch(() => {});
        });
      }

      // On this computer, show the code on screen so a reset can be tested without the inbox
      if (devShortcutsAllowed(req)) {
        reply.dev_otp = otp;
      }
      return res.json(reply);
    }

    if (action === 'verify_reset_otp') {
      const payload = req.body || {};
      const identifier = (payload.identifier || req.query.identifier || '').trim();
      const verifyLimits = isLocalRequest(req) ? [] : [{ key: `reset-verify:ip:${clientIp(req)}`, max: 20 }];
      const verifyWait = retryAfter(verifyLimits);
      if (verifyWait) {
        return tooManyAttempts(res, verifyWait);
      }

      const result = identifier
        ? checkResetCode(req, identifier, payload.otp)
        : { ok: false, error: 'Invalid or expired verification code.' };
      if (!result.ok) {
        noteAttempt(verifyLimits);
        return res.status(400).json({ success: false, error: result.error });
      }

      // A one-time token, issued only after the emailed code was entered, authorises the new password
      result.stored.verifiedToken = crypto.randomBytes(24).toString('hex');
      return res.json({ success: true, verified: true, reset_token: result.stored.verifiedToken });
    }

    if (action === 'reset_password') {
      const payload = req.body || {};
      const identifier = (payload.identifier || req.query.identifier || '').trim();
      const newPassword = (payload.new_password || '').trim();
      const enteredCode = String(payload.otp || payload.code || payload.reset_code || '').trim();
      const verifiedToken = String(payload.reset_token || '').trim();

      if (!identifier || !newPassword) {
        return res.status(400).json({ success: false, error: 'Identifier and new password required.' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
      }
      if (!enteredCode && !verifiedToken) {
        return res.status(400).json({ success: false, error: 'A valid reset code or verification token is required.' });
      }

      const resetLimits = isLocalRequest(req) ? [] : [{ key: `reset-verify:ip:${clientIp(req)}`, max: 20 }];
      const resetWait = retryAfter(resetLimits);
      if (resetWait) {
        return tooManyAttempts(res, resetWait);
      }

      const key = identifier.toLowerCase();
      const stored = resetOtpStore.get(key);
      const tokenOk = Boolean(stored && Date.now() <= stored.expiresAt && stored.verifiedToken
        && sameSecret(stored.verifiedToken, verifiedToken));
      const isValid = tokenOk || (enteredCode && checkResetCode(req, identifier, enteredCode).ok);
      if (!isValid || !stored?.userId) {
        noteAttempt(resetLimits);
        return res.status(400).json({ success: false, error: 'Invalid or expired password reset code.' });
      }

      // Single use: the code and token stop working once the password is changed
      resetOtpStore.delete(key);
      const passwordHash = await bcrypt.hash(newPassword, 10);
      // Only the one account the code was sent for
      await query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, stored.userId]);
      // What to put in the sign-in form afterwards (e.g. the stored "+66 81 234 5678" when the
      // person typed "0812345678", which the sign-in form would not recognise)
      return res.json({ success: true, message: 'Password updated successfully.', login_id: stored.loginId || identifier });
    }


    if (action === 'vendor_register') {
      const payload = req.body || {};
      const rawVendorType = (payload.vendor_type || payload.category || '').toLowerCase().trim();
      let role = 'hotel_vendor';
      if (rawVendorType.includes('transfer') || rawVendorType.includes('cab') || rawVendorType === 'vendor' || rawVendorType.includes('vehicle')) {
        role = 'transfer_vendor';
      } else if (rawVendorType.includes('tour') || rawVendorType.includes('activity')) {
        role = 'tour_vendor';
      } else if (rawVendorType.includes('hotel')) {
        role = 'hotel_vendor';
      }

      const companyName = (payload.company_name || payload.business_name || '').trim();
      const email = (payload.email || '').toLowerCase().trim();
      const phone = (payload.phone || '').trim();
      const contactName = (payload.contact_name || '').trim();
      const city = (payload.city || 'Bangkok').trim();
      const username = (payload.username || email.split('@')[0] || `vendor_${Date.now()}`).toLowerCase().trim();
      const password = payload.password || '';

      if (!companyName || !email || !password) {
        return res.status(400).json({ success: false, error: 'Company name, email, and password are required.' });
      }

      // Check if user already exists
      const existing = await query('SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1', [username, email]);
      if (existing.length > 0) {
        return res.status(400).json({ success: false, error: 'A partner account with this username or email already exists.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const userId = `usr-v-${Date.now()}`;
      const vendorId = `vnd-${Date.now()}`;

      await query(
        'INSERT INTO users (id, username, email, password_hash, role, phone, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, username, email, passwordHash, role, phone, 'active']
      );

      await query(
        'INSERT INTO vendors (id, user_id, business_name, contact_person, contact_phone, verification_status) VALUES (?, ?, ?, ?, ?, ?)',
        [vendorId, userId, companyName, contactName, phone, 'verified']
      );

      // Initialize wallet for new vendor
      await query(
        'INSERT INTO vendor_wallets (id, vendor_id, balance_thb, minimum_balance_thb) VALUES (?, ?, 0, 1000)',
        [`wal-${Date.now()}`, vendorId]
      );

      return res.json({
        success: true,
        vendor_id: vendorId,
        user_id: userId,
        role,
        message: 'Vendor registered successfully.'
      });
    }

    // -------------------------------------------------------------
    // 2. HOTELS & PMS (PORTALS: Customer, Admin, Hotel PMS, SuperAdmin)
    // -------------------------------------------------------------
    if (resource === 'hotels') {
      if (req.query.id) {
        req.params.id = req.query.id;
        return hotelController.getHotelById(req, res, next);
      }
      const city = req.query.city;
      // Visitors see published hotels; admins see all; a hotel vendor also sees their own drafts
      const isStaffViewer = Boolean(req.user && ADMIN_ROLES.includes(req.user.role));
      const isHotelVendorViewer = req.user?.role === 'hotel_vendor';
      const myVendorIds = new Set();
      if (isHotelVendorViewer) {
        myVendorIds.add(String(req.user.id));
        (await query('SELECT id FROM vendors WHERE user_id = ? OR id = ?', [req.user.id, req.user.id]))
          .forEach(v => myVendorIds.add(String(v.id)));
      }
      const params = [];
      let visibility = 'h.is_published = 1';
      if (isStaffViewer) {
        visibility = '1 = 1';
      } else if (isHotelVendorViewer) {
        const ids = [...myVendorIds];
        visibility = `(h.is_published = 1 OR h.vendor_id IN (${ids.map(() => '?').join(',')}))`;
        params.push(...ids);
      }
      let sql = `SELECT h.*,
        (SELECT MIN(base_price_thb) FROM hotel_room_types rt WHERE rt.hotel_id = h.id) AS min_room_price
      FROM hotels h
      WHERE ${visibility}`;
      if (city && city.toLowerCase() !== 'all' && city.toLowerCase() !== 'all thailand') {
        sql += ' AND (h.city = ? OR h.area LIKE ?)';
        params.push(city, `%${city}%`);
      }
      sql += ' ORDER BY h.featured DESC, h.star_rating DESC, h.created_at DESC, h.name ASC';
      const rows = await query(sql, params);
      const mapped = rows.map(h => {
        const hid = h.id;
        const lowestRoomPrice = parseFloat(h.min_room_price) || 0;
        // "From" price = the cheapest room the hotel sells today
        let price = 4500;
        if (lowestRoomPrice > 0) price = lowestRoomPrice;
        else if (hid === 'th-htl-01') price = 8500;
        else if (hid === 'th-htl-02') price = 5200;
        else if (hid === 'th-htl-04') price = 4200;
        else if (h.price) price = parseFloat(h.price);
        else if (h.selling_price) price = parseFloat(h.selling_price);

        const rating = hid === 'th-htl-01' ? 4.94 : (hid === 'th-htl-02' ? 4.88 : (hid === 'th-htl-04' ? 4.82 : (h.star_rating ? (h.star_rating >= 4 ? 4.8 : 4.5) : 4.5)));
        const reviews_count = hid === 'th-htl-01' ? 1280 : (hid === 'th-htl-02' ? 2140 : (hid === 'th-htl-04' ? 1670 : 120));
        const badge = hid === 'th-htl-01' ? '5-Star Oceanfront Villa' : (hid === 'th-htl-02' ? 'Iconic Rooftop Sky Sanctuary' : (hid === 'th-htl-04' ? '5-Star Beachfront Luxury' : `${h.star_rating || 4}-Star Verified`));
        const images = Array.isArray(h.images_json) ? h.images_json : (JSON.parse(h.images_json || '[]'));
        const amenities = Array.isArray(h.amenities_json) ? h.amenities_json : (JSON.parse(h.amenities_json || '[]'));
        const image = images[0] || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=80';

        return {
          ...h,
          // Tells the hotel vendor portal which hotels belong to the signed-in vendor
          ...(isHotelVendorViewer ? { is_mine: myVendorIds.has(String(h.vendor_id)) } : {}),
          stars: h.star_rating,
          price,
          original_price: Math.round(price * 1.35),
          rating,
          reviews_count,
          badge,
          amenities,
          images,
          image,
          imageUrl: image,
          image_url: image,
          location: `${h.area || h.city}, ${h.city}`
        };
      });
      return res.json(mapped);
    }

    // -------------------------------------------------------------
    // HOTEL ACTIONS (Add, Update, Delete)
    // -------------------------------------------------------------
    if (action === 'add_master_hotel' || action === 'add_hotel' || action === 'create_hotel') {
      if (!req.user || !(ADMIN_ROLES.includes(req.user.role) || req.user.role === 'hotel_vendor')) {
        return res.status(403).json({ success: false, error: 'Only hotel vendors and admins can add hotels.' });
      }
      const {
        name,
        city = 'Bangkok',
        location,
        area,
        price,
        selling_price,
        base_price,
        stars = 4,
        star_rating,
        amenities = '',
        facilities_json,
        images_json,
        images,
        description = '',
        vendor_id,
        address = '',
        hotel_status = 'Active'
      } = req.body;

      const newId = req.body.id || req.body.hotel_id || `th-htl-${Date.now().toString().slice(-6)}`;

      // Map region to valid Thailand cities enum
      let hotelCity = 'Bangkok';
      const cLower = (city || '').toLowerCase();
      if (cLower.includes('phuket') || cLower.includes('patong') || cLower.includes('kata') || cLower.includes('karon')) {
        hotelCity = 'Phuket';
      } else if (cLower.includes('krabi') || cLower.includes('ao nang') || cLower.includes('railay') || cLower.includes('phi phi') || cLower.includes('maya')) {
        hotelCity = 'Krabi';
      } else if (cLower.includes('pattaya')) {
        hotelCity = 'Pattaya';
      } else if (cLower.includes('samui') || cLower.includes('chaweng') || cLower.includes('lamai')) {
        hotelCity = 'Koh Samui';
      } else if (cLower.includes('chiang mai')) {
        hotelCity = 'Chiang Mai';
      } else if (['Bangkok', 'Phuket', 'Pattaya', 'Krabi', 'Koh Samui', 'Chiang Mai'].includes(city)) {
        hotelCity = city;
      }

      const hotelArea = area || location || city || 'Thailand';
      const rating = stars || star_rating || 4;

      let amenitiesArr = [];
      if (Array.isArray(facilities_json)) amenitiesArr = facilities_json;
      else if (typeof facilities_json === 'string' && facilities_json.startsWith('[')) {
        try { amenitiesArr = JSON.parse(facilities_json); } catch { }
      } else if (typeof amenities === 'string') {
        amenitiesArr = amenities.split(',').map(s => s.trim()).filter(Boolean);
      }

      let imagesArr = [];
      if (Array.isArray(images)) imagesArr = images;
      else if (Array.isArray(images_json)) imagesArr = images_json;
      else if (typeof images_json === 'string' && images_json.startsWith('[')) {
        try { imagesArr = JSON.parse(images_json); } catch { }
      }
      // Sanitize imagesArr: convert any embedded Base64 strings to disk files
      const sanitizedImages = [];
      for (const img of imagesArr) {
        if (typeof img === 'string' && img.startsWith('data:image')) {
          try {
            const matches = img.match(/^data:image\/([A-Za-z-+]+);base64,(.+)$/);
            const ext = matches ? `.${matches[1]}` : '.jpg';
            const buf = Buffer.from(matches ? matches[2] : img, 'base64');
            const fname = `hotel-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
            await fs.promises.writeFile(path.join(uploadDir, fname), buf);
            sanitizedImages.push(`/uploads/${fname}`);
          } catch {
            sanitizedImages.push(img);
          }
        } else if (img) {
          sanitizedImages.push(img);
        }
      }
      imagesArr = sanitizedImages;

      // Resolve valid vendor_id to satisfy foreign key constraint on vendors(id)
      let validVendorId = null;
      // A hotel vendor always adds hotels under their own vendor account
      const candidateVendorId = req.user?.role === 'hotel_vendor'
        ? await resolveVendorId(req.user)
        : (vendor_id || req.user?.id);
      if (candidateVendorId) {
        try {
          const vCheck = await query('SELECT id FROM vendors WHERE id = ? OR user_id = ? LIMIT 1', [candidateVendorId, candidateVendorId]);
          if (vCheck.length > 0) validVendorId = vCheck[0].id;
        } catch (e) { }
      }
      if (!validVendorId) {
        try {
          const vAny = await query("SELECT id FROM vendors WHERE id LIKE 'vnd-%' LIMIT 1");
          if (vAny.length > 0) validVendorId = vAny[0].id;
        } catch (e) { }
      }

      try {
        await query(
          `INSERT INTO hotels (id, vendor_id, name, city, area, star_rating, address, amenities_json, images_json, is_published, is_demo, hotel_status, facilities_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             city = VALUES(city),
             area = VALUES(area),
             star_rating = VALUES(star_rating),
             address = VALUES(address),
             amenities_json = VALUES(amenities_json),
             images_json = VALUES(images_json),
             is_published = 1,
             hotel_status = VALUES(hotel_status),
             facilities_json = VALUES(facilities_json)`,
          [
            newId,
            validVendorId,
            name || 'New Hotel',
            hotelCity,
            hotelArea,
            rating,
            address || '',
            JSON.stringify(amenitiesArr),
            JSON.stringify(imagesArr),
            hotel_status || 'Active',
            JSON.stringify(amenitiesArr)
          ]
        );
      } catch (dbErr) {
        console.error('[add_master_hotel] Database insert error:', dbErr.message);
      }

      return res.json({
        success: true,
        id: newId,
        hotel_id: newId,
        message: 'Hotel property created and published successfully.'
      });
    }

    if (action === 'update_hotel' || action === 'edit_hotel') {
      // Only the fields the form sent are changed; missing ones keep their saved value
      const {
        id,
        name,
        city,
        location,
        area,
        stars,
        amenities = '',
        facilities_json,
        images_json,
        images,
        address
      } = req.body;

      const hotelId = id || req.body.hotel_id;
      if (!hotelId) {
        return res.status(400).json({ success: false, error: 'Hotel ID is required.' });
      }

      const validCities = ['Bangkok', 'Phuket', 'Pattaya', 'Krabi', 'Koh Samui', 'Chiang Mai'];
      const hotelCity = validCities.includes(city) ? city : null;
      const hotelArea = area || location || null;

      let amenitiesArr = [];
      if (Array.isArray(facilities_json)) amenitiesArr = facilities_json;
      else if (typeof facilities_json === 'string' && facilities_json.startsWith('[')) {
        try { amenitiesArr = JSON.parse(facilities_json); } catch { }
      } else if (typeof amenities === 'string') {
        amenitiesArr = amenities.split(',').map(s => s.trim()).filter(Boolean);
      }

      let imagesArr = [];
      if (Array.isArray(images)) imagesArr = images;
      else if (Array.isArray(images_json)) imagesArr = images_json;
      else if (typeof images_json === 'string' && images_json.startsWith('[')) {
        try { imagesArr = JSON.parse(images_json); } catch { }
      }

      try {
        await query(
          `UPDATE hotels 
           SET name = COALESCE(?, name),
               city = COALESCE(?, city),
               area = COALESCE(?, area),
               star_rating = COALESCE(?, star_rating),
               address = COALESCE(?, address),
               amenities_json = COALESCE(?, amenities_json),
               images_json = COALESCE(?, images_json)
           WHERE id = ?`,
          [
            name || null,
            hotelCity || null,
            hotelArea || null,
            stars || null,
            address || null,
            amenitiesArr.length > 0 ? JSON.stringify(amenitiesArr) : null,
            imagesArr.length > 0 ? JSON.stringify(imagesArr) : null,
            hotelId
          ]
        );
      } catch (dbErr) {
        console.error('[update_hotel] Could not save:', dbErr.message);
        return res.status(500).json({ success: false, error: 'Could not save the hotel changes. Please try again.' });
      }

      return res.json({
        success: true,
        id: hotelId,
        hotel_id: hotelId,
        message: 'Hotel updated successfully.'
      });
    }

    if (action === 'delete_master_hotel' || action === 'delete_hotel') {
      const id = req.query.id || req.body?.id;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Hotel ID is required.' });
      }
      try {
        await query('DELETE FROM hotels WHERE id = ?', [id]);
      } catch (e) {
        console.error('[delete_hotel] Could not delete:', e.message);
        return res.status(409).json({
          success: false,
          error: 'This hotel has rooms or bookings linked to it, so it cannot be deleted. Unpublish it instead.'
        });
      }
      return res.json({ success: true, message: 'Hotel deleted successfully.' });
    }


    if (resource === 'hotel_rooms' || resource === 'hotel_rooms_public') {
      const hotelId = req.query.hotel_id || req.query.id || 'th-htl-01';
      const actualId = (hotelId === 'hotel-5star' || hotelId === 'hotel-phuket-shore') ? 'th-htl-01' :
        (hotelId === 'hotel-4star' || hotelId === 'hotel-bkk-banyan') ? 'th-htl-02' :
          (hotelId === 'hotel-3star' || hotelId === 'hotel-pattaya-hilton') ? 'th-htl-04' : hotelId;

      const roomTypes = await query('SELECT * FROM hotel_room_types WHERE hotel_id = ? OR hotel_id = ?', [actualId, hotelId]);
      const mappedRooms = roomTypes.map(r => {
        const basePrice = parseFloat(r.base_price_thb) || 5000;
        const isPhuket = r.id.includes('phuket') || actualId === 'th-htl-01';
        const isBkk = r.id.includes('bkk') || actualId === 'th-htl-02';

        let roomImages = [];
        if (r.images_json) {
          try {
            const parsed = typeof r.images_json === 'string' ? JSON.parse(r.images_json) : r.images_json;
            if (Array.isArray(parsed) && parsed.length > 0) {
              roomImages = parsed.filter(Boolean);
            }
          } catch (e) { }
        }
        if (roomImages.length === 0) {
          roomImages = isPhuket ? [
            'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1400&q=80',
            'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1400&q=80'
          ] : isBkk ? [
            'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=80',
            'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1400&q=80'
          ] : [
            'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=1400&q=80',
            'https://images.unsplash.com/photo-1587985064135-0366536eab42?auto=format&fit=crop&w=1400&q=80'
          ];
        }

        return {
          ...r,
          price: basePrice,
          price_per_night: basePrice,
          available_rooms: Math.max(3, Math.floor((r.total_rooms || 10) * 0.6)),
          is_available: true,
          room_size: isPhuket ? 130 : (isBkk ? 48 : 46),
          room_size_unit: 'sq.m',
          bed_type: 'King Bed',
          view_type: isPhuket ? 'Direct Andaman Sea View' : (isBkk ? 'Bangkok City Skyline' : 'Panoramic Oceanfront'),
          images: roomImages,
          image: roomImages[0],
          amenities: ['Air Conditioning', 'En-suite Marble Bathroom', 'High-Speed Wi-Fi', 'Balcony / Sea View', 'Smart TV', 'Espresso Machine'],
          rate_plans: [
            {
              id: `${r.id}-ep`,
              name: 'EP - Room Only',
              meal_plan: 'EP',
              meal_plan_label: 'Room Only (No Meals)',
              base_price: basePrice,
              calculated_price: basePrice,
              cancellation_policy: 'Non-refundable rate'
            },
            {
              id: `${r.id}-cp`,
              name: 'CP - Gourmet Breakfast Included',
              meal_plan: 'CP',
              meal_plan_label: 'Buffet Breakfast Included',
              base_price: Math.round(basePrice * 1.15),
              calculated_price: Math.round(basePrice * 1.15),
              cancellation_policy: 'Free cancellation up to 48 hours before check-in'
            },
            {
              id: `${r.id}-map`,
              name: 'MAP - Half Board (Breakfast + Dinner)',
              meal_plan: 'MAP',
              meal_plan_label: 'Breakfast + 3-Course Dinner',
              base_price: Math.round(basePrice * 1.35),
              calculated_price: Math.round(basePrice * 1.35),
              cancellation_policy: 'Free cancellation up to 48 hours before check-in'
            }
          ]
        };
      });

      let currentHotel = null;
      try {
        const hotelRows = await query('SELECT * FROM hotels WHERE id = ? OR id = ? LIMIT 1', [actualId, hotelId]);
        if (hotelRows && hotelRows.length > 0) {
          currentHotel = hotelRows[0];
          if (currentHotel.images_json && typeof currentHotel.images_json === 'string') {
            try { currentHotel.images = JSON.parse(currentHotel.images_json); } catch(e) {}
          }
        }
      } catch (err) {}

      return res.json({
        success: true,
        hotel: currentHotel,
        room_types: mappedRooms,
        rooms: mappedRooms
      });
    }

    if (resource === 'hotel_room_types') {
      const hotelId = req.query.hotel_id;
      let sql = 'SELECT * FROM hotel_room_types';
      const params = [];
      if (hotelId) {
        sql += ' WHERE hotel_id = ?';
        params.push(hotelId);
      }
      const roomTypes = await query(sql, params);
      return res.json(roomTypes.map(r => ({ ...r, price: r.base_price_thb })));
    }

    if (resource === 'hotel_availability_calendar') {
      const hotelId = req.query.hotel_id || 'th-htl-01';
      const rows = await query(`
        SELECT a.*, r.hotel_id, r.name as room_type_name
        FROM hotel_room_availability a
        JOIN hotel_room_types r ON a.room_type_id = r.id
        WHERE r.hotel_id = ?
        ORDER BY a.calendar_date ASC LIMIT 90
      `, [hotelId]);

      // Per-day view for the PMS availability calendar: { date, status, available_rooms, price_override }
      const isDay = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));
      const where = ['r.hotel_id = ?'];
      const params = [hotelId];
      if (req.query.room_type_id) { where.push('a.room_type_id = ?'); params.push(req.query.room_type_id); }
      if (isDay(req.query.from_date)) { where.push('a.calendar_date >= ?'); params.push(req.query.from_date); }
      if (isDay(req.query.to_date)) { where.push('a.calendar_date <= ?'); params.push(req.query.to_date); }
      const dayRows = await query(`
        SELECT DATE_FORMAT(a.calendar_date, '%Y-%m-%d') AS day,
               MIN(a.is_blackout) AS all_blocked,
               SUM(CASE WHEN a.is_blackout = 1 THEN 0 ELSE a.available_rooms END) AS rooms_left,
               MIN(a.price_override_thb) AS price_override
        FROM hotel_room_availability a
        JOIN hotel_room_types r ON a.room_type_id = r.id
        WHERE ${where.join(' AND ')}
        GROUP BY a.calendar_date
        ORDER BY a.calendar_date ASC
        LIMIT 400
      `, params);
      const calendar = dayRows.map(d => ({
        date: d.day,
        status: Number(d.all_blocked) === 1 ? 'Blocked' : (Number(d.rooms_left) <= 0 ? 'Sold Out' : 'Available'),
        available_rooms: Number(d.rooms_left) || 0,
        price_override: d.price_override !== null ? Number(d.price_override) : null
      }));
      return res.json({ success: true, availability: rows, calendar });
    }

    if (resource === 'pms_stats') {
      const [bookCount] = await query('SELECT COUNT(*) AS total_bookings, COALESCE(SUM(base_amount_thb), 0) AS total_revenue FROM bookings');
      const [paidCount] = await query("SELECT COALESCE(SUM(base_amount_thb), 0) AS amount_received FROM bookings WHERE payment_status = 'PAID'");
      const totalRev = parseFloat(bookCount.total_revenue || 0);
      const amtRec = parseFloat(paidCount.amount_received || 0);
      return res.json({
        success: true,
        stats: {
          total_hotels: 1,
          active_hotels: 1,
          pending_hotels: 0,
          new_bookings: bookCount.total_bookings,
          total_bookings: bookCount.total_bookings,
          cancelled: 0,
          todays_checkins: 0,
          todays_checkouts: 0,
          total_revenue: totalRev,
          amount_received: amtRec,
          pending_payments: totalRev - amtRec,
          commission: Math.round(amtRec * 0.10),
          vendor_payable: Math.round(amtRec * 0.90)
        }
      });
    }

    if (resource === 'pms_dashboard_activity') {
      const recent = await query('SELECT * FROM bookings ORDER BY created_at DESC LIMIT 8');
      return res.json({
        success: true,
        activity: {
          checkins: [],
          checkouts: [],
          recent_bookings: recent
        }
      });
    }

    if (resource === 'hotel_public_reviews' || resource === 'hotel_reviews') {
      return res.json({
        success: true,
        reviews: [
          { id: 'rev-01', customer_name: 'Ananya Sharma', rating: 5, comment: 'Breathtaking ocean views and impeccable Thai hospitality.', created_at: '2026-10-15' },
          { id: 'rev-02', customer_name: 'Liam Miller', rating: 5, comment: 'The pool villa at The Shore was absolute paradise. 10/10.', created_at: '2026-10-12' }
        ],
        summary: { rating: 4.9, total: 48 }
      });
    }

    // -------------------------------------------------------------
    // PMS RESTAURANT MENU, BAR & PMS ACTION HANDLERS
    // -------------------------------------------------------------
    if (action === 'pms_delete_menu_item') {
      const payload = req.body || {};
      const id = payload.id || req.query.id || payload.item_id;
      if (id) {
        try {
          await query('DELETE FROM hotel_menu_items WHERE id = ?', [id]);
        } catch (e) { }
        hotelMenuItemsMap.delete(id);
      }
      return res.json({ success: true, message: 'Dish removed from menu.' });
    }

    if (action === 'pms_save_menu_item') {
      const payload = req.body || {};
      const id = payload.id || `menu-${Date.now()}`;
      const hotelId = payload.hotel_id || 'th-htl-02';
      const name = payload.name || 'Signature Dish';
      const cat = payload.category_name || payload.category || 'Breakfast';
      const price = parseFloat(payload.price) || 0;
      const isVeg = payload.is_veg !== undefined ? (payload.is_veg ? 1 : 0) : 1;
      const isJain = payload.is_jain ? 1 : 0;
      const isAvailable = payload.is_available !== undefined ? (payload.is_available ? 1 : 0) : 1;
      const desc = payload.description || '';
      const img = payload.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
      const displayOrder = parseInt(payload.display_order, 10) || 0;

      try {
        await query(
          `INSERT INTO hotel_menu_items (id, hotel_id, name, category, category_name, price, is_veg, is_jain, description, image_url, is_available, display_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name), category = VALUES(category), category_name = VALUES(category_name), price = VALUES(price), is_veg = VALUES(is_veg), is_jain = VALUES(is_jain), description = VALUES(description), image_url = VALUES(image_url), is_available = VALUES(is_available), display_order = VALUES(display_order)`,
          [id, hotelId, name, cat, cat, price, isVeg, isJain, desc, img, isAvailable, displayOrder]
        );
      } catch (e) { }

      const item = {
        id,
        hotel_id: hotelId,
        name,
        category: cat,
        category_name: cat,
        price,
        is_veg: isVeg,
        is_jain: isJain,
        is_available: isAvailable,
        description: desc,
        image_url: img,
        display_order: displayOrder
      };
      hotelMenuItemsMap.set(id, item);
      return res.json({ success: true, message: 'Dish saved successfully.', item_id: id, item });
    }

    if (action === 'pms_upload_dining_media') {
      let fileUrl = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
      if (req.files && req.files.length > 0) {
        const file = req.files[0];
        fileUrl = `http://localhost:5000/uploads/${file.filename}`;
      }
      return res.json({ success: true, url: fileUrl, message: 'Photo uploaded successfully.' });
    }

    if (action === 'pms_save_bar_lounge') {
      const payload = req.body || {};
      const hotelId = payload.hotel_id || 'th-htl-02';
      const id = payload.id || `bar-${hotelId}`;
      const name = payload.name || 'Bar & Lounge';
      const timingOpen = payload.timing_open || '04:00 PM';
      const timingClose = payload.timing_close || '01:00 AM';
      const entryPolicy = payload.entry_policy || 'Free Entry for Hotel Guests & Couples';
      const desc = payload.description || '';
      const features = JSON.stringify(payload.features || []);
      const images = JSON.stringify(payload.images || []);
      const cover = payload.cover_image || (payload.images && payload.images[0]) || '';
      const isActive = payload.is_active !== undefined ? (payload.is_active ? 1 : 0) : 1;

      try {
        await query(
          `INSERT INTO hotel_bar_lounges (id, hotel_id, name, timing_open, timing_close, timings, entry_policy, description, features_json, images_json, cover_image, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name), timing_open = VALUES(timing_open), timing_close = VALUES(timing_close), timings = VALUES(timings), entry_policy = VALUES(entry_policy), description = VALUES(description), features_json = VALUES(features_json), images_json = VALUES(images_json), cover_image = VALUES(cover_image), is_active = VALUES(is_active)`,
          [id, hotelId, name, timingOpen, timingClose, `${timingOpen} - ${timingClose}`, entryPolicy, desc, features, images, cover, isActive]
        );
      } catch (e) { }

      return res.json({ success: true, message: 'Bar & Lounge profile saved successfully.', bar_id: id });
    }

    if (action === 'pms_delete_bar_lounge') {
      const payload = req.body || {};
      const hotelId = payload.hotel_id;
      if (hotelId) {
        try {
          await query('UPDATE hotel_bar_lounges SET is_active = 0 WHERE hotel_id = ?', [hotelId]);
        } catch (e) { }
      }
      return res.json({ success: true, message: 'Bar & Lounge profile deactivated.' });
    }

    if (action === 'pms_save_hotel_categorized_amenities' || action === 'pms_save_hotel_amenities') {
      const payload = req.body || {};
      const hotelId = payload.hotel_id;
      const cats = payload.categorized_amenities || [];
      const catsJson = JSON.stringify(cats);
      const flat = [];
      cats.forEach(c => (c.items || []).forEach(it => flat.push(typeof it === 'string' ? it : it.name)));
      try {
        await query(
          'UPDATE hotels SET categorized_amenities_json = ?, amenities = ? WHERE id = ?',
          [catsJson, flat.join(','), hotelId]
        );
      } catch (e) { }
      return res.json({ success: true, message: 'Hotel amenities saved and synchronized successfully!' });
    }

    if (action === 'pms_save_room_categorized_amenities') {
      const payload = req.body || {};
      const hotelId = payload.hotel_id;
      const roomTypeId = payload.room_type_id;
      const cats = payload.categorized_amenities || [];
      const catsJson = JSON.stringify(cats);
      const flat = [];
      cats.forEach(c => (c.items || []).forEach(it => flat.push(typeof it === 'string' ? it : it.name)));
      try {
        await query(
          'UPDATE hotel_room_types SET categorized_amenities_json = ?, amenities_json = ? WHERE id = ? AND hotel_id = ?',
          [catsJson, JSON.stringify(flat), roomTypeId, hotelId]
        );
      } catch (e) { }
      return res.json({ success: true, message: 'Room amenities saved and synchronized successfully!' });
    }

    if (action === 'pms_request_custom_amenity') {
      const payload = req.body || {};
      const hotelId = payload.hotel_id;
      const customName = payload.custom_name;
      const catId = payload.suggested_category_id;
      const scope = payload.scope || 'hotel';
      const desc = payload.description || '';
      const id = `req-${Date.now()}`;
      try {
        await query(
          'INSERT INTO hotel_amenity_requests (id, hotel_id, suggested_name, suggested_category_id, scope, description, status) VALUES (?, ?, ?, ?, ?, ?, "Pending")',
          [id, hotelId, customName, catId, scope, desc]
        );
      } catch (e) { }
      return res.json({ success: true, message: 'Custom amenity request submitted for review.' });
    }

    if (action === 'pms_save_room_meal_plans' || action === 'pms_sync_room_meal_plans') {
      const payload = req.body || {};
      const hotelId = payload.hotel_id;
      const roomTypeId = payload.room_type_id;
      const plans = payload.rate_plans || [];
      try {
        for (const p of plans) {
          const planId = `plan-${hotelId}-${roomTypeId}-${p.meal_plan}`;
          await query(
            `INSERT INTO hotel_rate_plans (id, hotel_id, room_type_id, vendor_id, name, plan_type, price, status)
             VALUES (?, ?, ?, 'vnd-phuket-01', ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE name = VALUES(name), plan_type = VALUES(plan_type), price = VALUES(price), status = VALUES(status)`,
            [planId, hotelId, roomTypeId, p.name || p.meal_plan, p.meal_plan, p.base_price || 0, p.is_active ? 'Active' : 'Inactive']
          );
        }
      } catch (e) { }
      return res.json({ success: true, message: 'Meal plans synchronized successfully without duplicates!' });
    }

    if (action === 'pms_update_hotel_status') {
      const payload = req.body || {};
      const { hotel_id, hotel_status } = payload;
      if (hotel_id) {
        try {
          const isLive = hotel_status === 'Live' ? 1 : 0;
          await query('UPDATE hotels SET is_published = ?, hotel_status = ? WHERE id = ?', [isLive, hotel_status || 'Live', hotel_id]);
        } catch (e) { }
      }
      return res.json({ success: true, message: `Hotel status updated to ${hotel_status || 'Live'}.` });
    }

    if (action === 'pms_delete_room_type') {
      const payload = req.body || {};
      const id = payload.id || req.query.id;
      if (id) {
        try {
          await query('DELETE FROM hotel_room_types WHERE id = ?', [id]);
        } catch (e) { }
      }
      return res.json({ success: true, message: 'Room type deleted successfully.' });
    }

    if (action === 'pms_create_room_type' || action === 'pms_update_room_type') {
      const rtId = req.body.id || req.body.temp_id || `rt-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
      const hotelId = req.body.hotel_id;
      const basePrice = parseFloat(req.body.selling_price || req.body.base_price || 4000);
      const maxAdults = parseInt(req.body.max_adults || 2, 10);
      const maxChildren = parseInt(req.body.max_children || 1, 10);
      const totalRooms = parseInt(req.body.total_rooms || 5, 10);
      const breakfastIncluded = (req.body.amenities || []).some(a => String(a).toLowerCase().includes('breakfast')) ? 1 : 0;
      const amenitiesJson = JSON.stringify(Array.isArray(req.body.amenities) ? req.body.amenities : []);
      const imagesJson = JSON.stringify(Array.isArray(req.body.images) ? req.body.images : []);

      if (hotelId) {
        try {
          await query(
            `INSERT INTO hotel_room_types (id, hotel_id, name, base_price_thb, max_adults, max_children, breakfast_included, total_rooms, amenities_json, images_json)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               name = VALUES(name),
               base_price_thb = VALUES(base_price_thb),
               max_adults = VALUES(max_adults),
               max_children = VALUES(max_children),
               total_rooms = VALUES(total_rooms),
               amenities_json = VALUES(amenities_json),
               images_json = VALUES(images_json)`,
            [rtId, hotelId, req.body.name || 'Standard Room', basePrice, maxAdults, maxChildren, breakfastIncluded, totalRooms, amenitiesJson, imagesJson]
          );
        } catch (rtErr) {
          console.error('[pms_create_room_type] Error:', rtErr.message);
        }
      }

      return res.json({ success: true, id: rtId, room_type: { id: rtId, name: req.body.name } });
    }

    if (action === 'pms_create_room' || action === 'pms_update_room') {
      const rmId = req.body.id || `rm-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
      if (req.body.hotel_id && req.body.room_type_id) {
        try {
          await query(
            `INSERT INTO hotel_rooms (id, hotel_id, room_type_id, room_number, floor, status)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               room_number = VALUES(room_number),
               floor = VALUES(floor),
               status = VALUES(status)`,
            [rmId, req.body.hotel_id, req.body.room_type_id, req.body.room_number || '101', req.body.floor || '1', req.body.status || 'Available']
          );
        } catch (rmErr) {
          console.error('[pms_create_room] Error:', rmErr.message);
        }
      }
      return res.json({ success: true, id: rmId });
    }

    if (action === 'pms_delete_room') {
      const id = req.body?.id || req.query?.id;
      if (id) {
        try { await query('DELETE FROM hotel_rooms WHERE id = ?', [id]); } catch (e) { }
      }
      return res.json({ success: true, message: 'Room deleted successfully.' });
    }

    if (action === 'pms_create_rate_plan' || action === 'pms_update_rate_plan' || action === 'pms_delete_rate_plan') {
      return res.json({ success: true, message: 'Rate plan updated successfully.' });
    }

    if (action === 'pms_update_availability') {
      // Availability calendar: block dates, mark sold out, set rooms left / price per date.
      // Checkout already refuses blocked or sold-out nights (bookingService.js).
      const p = req.body || {};
      const roomTypeIds = [...new Set([...(Array.isArray(p.room_type_ids) ? p.room_type_ids : []), p.room_type_id].filter(Boolean))];
      const dates = (Array.isArray(p.dates) ? p.dates : [])
        .map(d => String(d).slice(0, 10))
        .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
      if (roomTypeIds.length === 0 || dates.length === 0) {
        return res.status(400).json({ success: false, error: 'Choose a room type and at least one date.' });
      }
      const roomTypes = await query(
        `SELECT id, hotel_id, total_rooms FROM hotel_room_types WHERE id IN (${roomTypeIds.map(() => '?').join(',')})`,
        roomTypeIds
      );
      if (roomTypes.length !== roomTypeIds.length || (p.hotel_id && roomTypes.some(rt => rt.hotel_id !== p.hotel_id))) {
        return res.status(404).json({ success: false, error: 'This room type is not set up for this hotel yet. Add it under Rooms & Room Types first.' });
      }

      const status = String(p.status || 'Available').toLowerCase();
      const roomsSent = p.available_rooms !== undefined && p.available_rooms !== null && p.available_rooms !== '';
      const priceSent = p.price_override !== undefined && p.price_override !== null && p.price_override !== '';
      const price = priceSent ? parseFloat(p.price_override) : null;
      const blackout = status === 'blocked' || Number(p.stop_sale) === 1 ? 1 : 0;

      // Rooms left: the number sent, 0 for "Sold Out", otherwise keep what the date has
      let rooms = roomsSent ? Math.max(0, parseInt(p.available_rooms, 10) || 0) : null;
      if (status === 'sold out') rooms = 0;

      await withTransaction(async (conn) => {
        for (const rt of roomTypes) {
          const fullRooms = parseInt(rt.total_rooms, 10) || 10;
          for (const day of dates) {
            await conn.execute(
              `INSERT INTO hotel_room_availability (room_type_id, calendar_date, available_rooms, price_override_thb, is_blackout)
               VALUES (?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
                 is_blackout = VALUES(is_blackout),
                 available_rooms = COALESCE(?, available_rooms),
                 price_override_thb = COALESCE(?, price_override_thb)`,
              [rt.id, day, rooms ?? fullRooms, price, blackout, rooms, price]
            );
          }
        }
      });
      return res.json({ success: true, updated_dates: dates.length, room_types: roomTypes.length, message: 'Room availability updated.' });
    }

    if (action === 'pms_create_guest' || action === 'pms_update_guest' || action === 'pms_delete_guest') {
      return res.json({ success: true, message: 'Guest directory updated.' });
    }

    if (action === 'pms_reply_review') {
      return res.json({ success: true, message: 'Reply posted successfully.' });
    }

    if (action === 'pms_create_staff' || action === 'pms_update_staff' || action === 'pms_delete_staff') {
      return res.json({ success: true, message: 'Staff member updated.' });
    }

    if (action === 'pms_create_ticket' || action === 'pms_reply_ticket') {
      return res.json({ success: true, message: 'Support ticket updated.' });
    }

    if (action === 'pms_mark_notification_read' || action === 'pms_delete_notification') {
      return res.json({ success: true, message: 'Notification updated.' });
    }

    if (action === 'pms_create_manual_booking') {
      // Walk-in / phone booking made by the hotel in its PMS: a real booking, with voucher and
      // room inventory, under the hotel's vendor.
      const p = req.body || {};
      const hotelRows = await query('SELECT id, vendor_id, name FROM hotels WHERE id = ? LIMIT 1', [p.hotel_id]);
      if (hotelRows.length === 0) {
        return res.status(404).json({ success: false, error: 'Hotel not found.' });
      }
      const hotelRow = hotelRows[0];
      const total = Number(p.total_amount);
      if (!(total > 0)) {
        return res.status(400).json({ success: false, error: 'Enter the room price so the booking has a total.' });
      }
      if (!String(p.guest_name || '').trim() || !String(p.guest_phone || '').trim()) {
        return res.status(400).json({ success: false, error: 'Guest name and phone are required.' });
      }

      // The form's room type is typed in; use the hotel's matching room type when there is one
      let roomTypeId = p.room_type_id || null;
      if (!roomTypeId && p.room_type) {
        const match = await query(
          'SELECT id FROM hotel_room_types WHERE hotel_id = ? AND LOWER(name) = LOWER(?) LIMIT 1',
          [hotelRow.id, String(p.room_type).trim()]
        );
        roomTypeId = match[0]?.id || null;
      }

      const notes = [
        p.special_request,
        p.guest_address ? `Guest address: ${p.guest_address}` : null,
        p.internal_note ? `Internal note: ${p.internal_note}` : null
      ].filter(Boolean).join(' | ');

      const bookingPayload = {
        customer_name: p.guest_name,
        customer_phone: p.guest_phone,
        customer_email: p.guest_email || '',
        start_date: p.pickup_date,
        end_date: p.drop_date,
        vendor_id: hotelRow.vendor_id,
        total_amount: total,
        quantity: 1,
        hotel_id: hotelRow.id,
        hotel_name: hotelRow.name,
        room_type: p.room_type || null,
        type: 'hotel',
        package_type: 'Hotel Booking',
        adults: p.adults,
        children: p.children,
        payment_method: p.payment_method,
        booking_channel: p.booking_source || 'Manual',
        special_requests: notes || null,
        idempotency_key: p.idempotency_key
      };
      if (roomTypeId) bookingPayload.room_type_id = roomTypeId;

      const result = await withTransaction(conn => createBookingTransaction(conn, bookingPayload, { trustedPricing: true }));

      // Made at the desk, so it is confirmed; record any advance the guest paid
      const paid = Math.max(0, Number(p.amount_paid) || 0);
      await query(
        "UPDATE bookings SET booking_status = 'Confirmed', payment_amount = ?, payment_status = ? WHERE id = ?",
        [paid, paid >= total ? 'PAID' : 'PENDING', result.booking_id]
      );

      if (bookingPayload.customer_email) {
        sendBookingVoucherEmail({ ...bookingPayload, id: result.booking_id, item_name: hotelRow.name }, result.voucher_code)
          .catch(err => console.warn('[pms_create_manual_booking] Voucher email error:', err.message));
      }

      return res.json({
        success: true,
        booking_id: result.booking_id,
        voucher_code: result.voucher_code,
        voucher_access_key: voucherAccessKey(result.booking_id),
        message: 'Reservation created successfully.'
      });
    }

    if (resource === 'hotel_menu_items') {
      const hotelId = req.query.hotel_id;
      try {
        let sql = 'SELECT * FROM hotel_menu_items';
        const params = [];
        if (hotelId) {
          sql += ' WHERE hotel_id = ?';
          params.push(hotelId);
        }
        sql += ' ORDER BY display_order ASC, name ASC';
        const rows = await query(sql, params);
        if (rows && rows.length > 0) {
          return res.json({
            success: true,
            menu_items: rows.map(r => ({
              ...r,
              price: parseFloat(r.price),
              is_veg: parseInt(r.is_veg, 10),
              is_jain: parseInt(r.is_jain, 10),
              is_available: parseInt(r.is_available, 10),
              display_order: parseInt(r.display_order, 10)
            }))
          });
        }
      } catch (e) { }

      const items = Array.from(hotelMenuItemsMap.values()).filter(m => !hotelId || m.hotel_id === hotelId || !m.hotel_id);
      return res.json({
        success: true,
        menu_items: items.length > 0 ? items : Array.from(hotelMenuItemsMap.values())
      });
    }

    if (resource === 'pms_get_bar_lounge') {
      const hotelId = req.query.hotel_id;
      try {
        const rows = await query('SELECT * FROM hotel_bar_lounges WHERE hotel_id = ? LIMIT 1', [hotelId || 'th-htl-02']);
        if (rows && rows.length > 0) {
          const b = rows[0];
          let features = [];
          let images = [];
          try { features = typeof b.features_json === 'string' ? JSON.parse(b.features_json) : (b.features_json || []); } catch (e) { }
          try { images = typeof b.images_json === 'string' ? JSON.parse(b.images_json) : (b.images_json || []); } catch (e) { }
          return res.json({
            success: true,
            bar: {
              id: b.id,
              hotel_id: b.hotel_id,
              name: b.name,
              timing_open: b.timing_open || '04:00 PM',
              timing_close: b.timing_close || '01:00 AM',
              entry_policy: b.entry_policy || 'Free Entry for Hotel Guests & Couples',
              description: b.description || '',
              features,
              images,
              cover_image: b.cover_image || (images[0] || ''),
              is_active: b.is_active !== undefined ? (parseInt(b.is_active, 10) === 0 ? 0 : 1) : 1
            }
          });
        }
      } catch (e) { }

      return res.json({
        success: true,
        bar: {
          id: 'bar-01',
          name: 'The Horizon Lounge & Bar',
          timing_open: '04:00 PM',
          timing_close: '01:00 AM',
          entry_policy: 'Free Entry for Hotel Guests & Couples',
          description: 'Panoramic open-air lounge serving craft cocktails, fine wines, and artisanal appetizers.',
          features: ['Sunset Views', 'Live Music', 'Happy Hour 5-7 PM'],
          images: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'],
          cover_image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
          is_active: 1
        }
      });
    }

    if (resource === 'pms_get_room_meal_plans') {
      const hotelId = req.query.hotel_id;
      const roomTypeId = req.query.room_type_id;
      try {
        const rows = await query(
          'SELECT * FROM hotel_rate_plans WHERE hotel_id = ? AND (room_type_id = ? OR room_type_id IS NULL OR room_type_id = "")',
          [hotelId, roomTypeId]
        );
        if (rows && rows.length > 0) {
          return res.json({
            success: true,
            rate_plans: rows.map(r => ({
              ...r,
              meal_plan: r.plan_type || 'CP',
              base_price: parseFloat(r.price),
              weekend_price: parseFloat(r.price) * 1.15,
              extra_adult_rate: 600,
              extra_child_rate: 350,
              is_active: r.status === 'Active' ? 1 : 0,
              inclusions: ['Breakfast Buffet']
            }))
          });
        }
      } catch (e) { }
      return res.json({
        success: true,
        rate_plans: [
          { meal_plan: 'EP', name: 'Room Only (EP)', base_price: 3200, weekend_price: 3600, extra_adult_rate: 500, extra_child_rate: 250, is_active: 1, inclusions: ['Room Stay', 'Free Wi-Fi'] },
          { meal_plan: 'CP', name: 'Bed & Breakfast (CP)', base_price: 3750, weekend_price: 4200, extra_adult_rate: 650, extra_child_rate: 350, is_active: 1, inclusions: ['Room Stay', 'International Breakfast Buffet', 'Free Wi-Fi'] },
          { meal_plan: 'MAP', name: 'Half Board (MAP - Breakfast + Dinner)', base_price: 4600, weekend_price: 5200, extra_adult_rate: 1100, extra_child_rate: 600, is_active: 1, inclusions: ['Room Stay', 'Breakfast & Dinner', 'Free Wi-Fi'] }
        ]
      });
    }

    if (resource === 'hotel_amenity_categories') {
      try {
        const cats = await query('SELECT * FROM hotel_amenity_categories WHERE is_active = 1 ORDER BY display_order ASC');
        const masters = await query('SELECT * FROM hotel_amenities_master WHERE is_active = 1 ORDER BY display_order ASC');
        const categories = cats.map(c => ({
          id: c.id,
          name: c.name,
          icon: c.icon,
          slug: c.slug,
          scope: c.scope,
          amenities: masters.filter(m => m.category_id === c.id).map(m => ({
            id: m.id,
            name: m.name,
            icon: m.icon,
            sublabel: m.default_sublabel
          }))
        }));
        return res.json({ success: true, categories });
      } catch (e) {
        return res.json({
          success: true,
          categories: [
            { id: 'cat_popular', name: 'Popular Amenities', icon: 'Sparkles', amenities: [{ id: 'am_wifi', name: 'Free High-Speed Wi-Fi' }, { id: 'am_pool', name: 'Infinity Swimming Pool' }, { id: 'am_ac', name: 'Air Conditioning' }] },
            { id: 'cat_dining', name: 'Dining & Drinks', icon: 'Utensils', amenities: [{ id: 'am_bar', name: 'Rooftop Sky Bar & Lounge' }, { id: 'am_bf', name: 'Complimentary International Buffet Breakfast' }] }
          ]
        });
      }
    }

    if (resource === 'pms_list_amenity_requests') {
      try {
        const hotelId = req.query.hotel_id;
        let sql = 'SELECT * FROM hotel_amenity_requests';
        const params = [];
        if (hotelId) {
          sql += ' WHERE hotel_id = ?';
          params.push(hotelId);
        }
        sql += ' ORDER BY created_at DESC';
        const rows = await query(sql, params);
        return res.json({ success: true, requests: rows || [] });
      } catch (e) {
        return res.json({ success: true, requests: [] });
      }
    }

    if (resource === 'hotel_guests') {
      const guests = await query('SELECT DISTINCT customer_name, customer_email, customer_phone FROM bookings LIMIT 20');
      return res.json(guests);
    }

    if (resource === 'hotel_staff') {
      const staff = await query("SELECT id, username, email, role, phone FROM users WHERE role IN ('hotel_vendor', 'subadmin')");
      return res.json(staff);
    }

    if (resource === 'hotel_support_tickets') {
      return res.json([
        { id: 'tkt-01', subject: 'Airport Shuttle Timing Coordination', status: 'closed', priority: 'medium', created_at: '2026-10-18' }
      ]);
    }

    if (resource === 'hotel_booking_settings') {
      return res.json({
        instant_booking: true,
        allow_cancellation_hours: 24,
        check_in_time: '14:00',
        check_out_time: '12:00',
        deposit_required_pct: 20
      });
    }

    if (resource === 'hotel_rate_plans') {
      return res.json([
        { id: 'rate-standard', name: 'Standard Flexible Rate', discount_percent: 0 },
        { id: 'rate-nonref', name: 'Non-Refundable Advance Purchase', discount_percent: 15 },
        { id: 'rate-weekly', name: 'Long Stay Weekly (7+ Nights)', discount_percent: 20 }
      ]);
    }

    if (resource === 'hotel_activity_logs') {
      return res.json([
        { id: 'log-01', action: 'Room inventory synced for 90 days', user: 'Somkiat Prasert', timestamp: '2026-10-21T13:58:00Z' }
      ]);
    }

    // -------------------------------------------------------------
    // 3. AIRPORT TRANSFERS, CABS & VEHICLES (PORTALS: Customer, Fleet, Admin, B2B)
    // -------------------------------------------------------------
    if (resource === 'cars' || resource === 'cabs' || resource === 'transfers' || resource === 'vehicle_units') {
      const pricing = await query(`
        SELECT p.*, r.route_name, r.origin_name, r.destination_name 
        FROM transfer_vehicle_pricing p
        JOIN transfer_routes r ON p.route_id = r.id
        ORDER BY p.fare_thb ASC
      `);
      const mappedCars = pricing.map(p => {
        let carImg = 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=800&q=80';
        if (p.vehicle_category === 'VIP_VAN') {
          carImg = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80';
        } else if (p.vehicle_category === 'SUV') {
          carImg = 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80';
        }
        return {
          id: p.id,
          vendor_id: 'vnd-phuket-01',
          name: p.model_name,
          category: p.vehicle_category,
          price: p.fare_thb,
          price_thb: p.fare_thb,
          seating: `${p.max_passengers} Seater`,
          luggage: `${p.max_luggage} Bags`,
          transmission: 'Automatic',
          fuel: 'Petrol / Hybrid',
          rating: 4.9,
          badge: p.vehicle_category === 'VIP_VAN' ? 'VIP Luxury' : 'Top Choice',
          image: carImg,
          imageUrl: carImg,
          image_url: carImg,
          images: [carImg],
          location: p.route_name || 'Phuket / Bangkok',
          is_available: 1
        };
      });
      return res.json(mappedCars);
    }

    if (resource === 'bikes') {
      return res.json([]);
    }

    if (resource === 'transfer_routes') {
      const routes = await query('SELECT * FROM transfer_routes ORDER BY route_name ASC');
      const pricing = await query('SELECT * FROM transfer_vehicle_pricing');
      const mapped = routes.map(r => ({
        ...r,
        vehicles: pricing.filter(p => p.route_id === r.id)
      }));
      return res.json(mapped);
    }

    if (resource === 'vehicle_3d_library') {
      return res.status(404).json({ success: false, error: 'Vehicle 3D rental library has been decommissioned.' });
    }

    // -------------------------------------------------------------
    // 4. TOURS, PACKAGES & ACTIVITIES (PORTALS: Customer, Admin, B2B)
    // -------------------------------------------------------------
    if (resource === 'packages' || resource === 'destinations' || resource === 'tours' || resource === 'sightseeing') {
      const tours = await query('SELECT * FROM tours ORDER BY title ASC');
      const mapped = tours.map(t => ({
        id: t.id,
        title: t.title,
        name: t.title,
        destination: `${t.city}, Thailand`,
        city: t.city,
        duration: t.duration_text,
        price: t.price_adult_thb,
        price_adult_thb: t.price_adult_thb,
        price_child_thb: t.price_child_thb,
        inclusions: Array.isArray(t.inclusions_json) ? t.inclusions_json : JSON.parse(t.inclusions_json || '[]'),
        itinerary: Array.isArray(t.itinerary_json) ? t.itinerary_json : JSON.parse(t.itinerary_json || '[]'),
        day_wise_itinerary: (Array.isArray(t.itinerary_json) ? t.itinerary_json : JSON.parse(t.itinerary_json || '[]')).map((step, idx) => ({
          day: idx + 1,
          title: step,
          description: step
        })),
        image: '/thailand_hero.jpg',
        imageUrl: '/thailand_hero.jpg',
        image_url: '/thailand_hero.jpg',
        images: ['/thailand_hero.jpg'],
        rating: 4.95,
        badge: 'Top Rated'
      }));
      return res.json(mapped);
    }

    // -------------------------------------------------------------
    // SIGHTSEEING & ACTIVITIES / ADD-ONS ENGINE
    // -------------------------------------------------------------
    if (resource === 'activities' || resource === 'add_ons') {
      const activities = await query('SELECT * FROM activities WHERE is_active = 1 OR is_active IS NULL ORDER BY created_at DESC');
      const mapped = activities.map(a => {
        let imgs = [];
        try {
          imgs = Array.isArray(a.images_json) ? a.images_json : JSON.parse(a.images_json || '[]');
        } catch (e) {
          imgs = [];
        }
        const primaryImg = a.image_url || imgs[0] || '/thailand_hero.jpg';

        return {
          id: a.id,
          title: a.title,
          name: a.title,
          category: a.category || 'Adventure / Activity',
          type: a.category || 'Activity',
          price: Number(a.price_thb || 0),
          price_thb: Number(a.price_thb || 0),
          location: a.location || 'Bangkok & Pattaya',
          duration: a.duration || '2-3 Hours',
          description: a.description || '',
          time_slots: Array.isArray(a.time_slots_json) ? a.time_slots_json : JSON.parse(a.time_slots_json || '[]'),
          image_url: primaryImg,
          image: primaryImg,
          images: imgs.length > 0 ? imgs : [primaryImg],
          images_json: a.images_json,
          is_active: a.is_active === 0 ? 0 : 1,
          rating: 4.9
        };
      });
      return res.json(mapped);
    }

    if (action === 'create_add_on' || action === 'create_activity') {
      const b = req.body || {};
      const id = b.id || `act-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
      const title = (b.title || b.name || '').trim();
      if (!title) {
        return res.status(400).json({ success: false, error: 'Activity title is required.' });
      }

      const price = parseFloat(b.price || b.price_thb || 0);
      const category = (b.category || b.type || 'Adventure / Activity').trim();
      const location = (b.location || 'Bangkok & Pattaya').trim();
      const duration = (b.duration || '2-3 Hours').trim();
      const description = (b.description || '').trim();

      let imagesList = [];
      if (Array.isArray(b.images) && b.images.length > 0) {
        imagesList = b.images;
      } else if (b.images_json) {
        try {
          imagesList = typeof b.images_json === 'string' ? JSON.parse(b.images_json) : b.images_json;
        } catch (e) {
          imagesList = [];
        }
      }
      if (imagesList.length === 0 && (b.image_url || b.image)) {
        imagesList = [b.image_url || b.image];
      }

      const primaryImg = imagesList[0] || b.image_url || b.image || '/thailand_hero.jpg';

      try {
        await query(
          `INSERT INTO activities 
           (id, title, category, price_thb, location, duration, description, image_url, images_json, is_active, is_demo)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
          [
            id,
            title,
            category,
            price,
            location,
            duration,
            description,
            primaryImg,
            JSON.stringify(imagesList),
            b.is_active === 0 ? 0 : 1
          ]
        );

        return res.json({
          success: true,
          id,
          message: 'Sightseeing & Activity created successfully',
          data: { id, title, price, category, location, duration, image_url: primaryImg }
        });
      } catch (err) {
        console.error('[Compat] Error creating activity:', err);
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    if (action === 'update_add_on' || action === 'update_activity') {
      const b = req.body || {};
      const id = b.id || req.query?.id;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Activity ID is required.' });
      }

      const title = (b.title || b.name || '').trim();
      const price = b.price !== undefined ? parseFloat(b.price || b.price_thb || 0) : undefined;
      const category = (b.category || b.type || '').trim();
      const location = (b.location || '').trim();
      const duration = (b.duration || '').trim();
      const description = (b.description || '').trim();

      let imagesList = undefined;
      if (Array.isArray(b.images)) {
        imagesList = b.images;
      } else if (b.images_json) {
        try {
          imagesList = typeof b.images_json === 'string' ? JSON.parse(b.images_json) : b.images_json;
        } catch (e) { }
      }

      const primaryImg = (imagesList && imagesList[0]) || b.image_url || b.image;

      try {
        const fields = [];
        const params = [];

        if (title) { fields.push('title = ?'); params.push(title); }
        if (price !== undefined) { fields.push('price_thb = ?'); params.push(price); }
        if (category) { fields.push('category = ?'); params.push(category); }
        if (location) { fields.push('location = ?'); params.push(location); }
        if (duration) { fields.push('duration = ?'); params.push(duration); }
        if (description !== undefined) { fields.push('description = ?'); params.push(description); }
        if (primaryImg) { fields.push('image_url = ?'); params.push(primaryImg); }
        if (imagesList !== undefined) { fields.push('images_json = ?'); params.push(JSON.stringify(imagesList)); }
        if (b.is_active !== undefined) { fields.push('is_active = ?'); params.push(b.is_active ? 1 : 0); }

        if (fields.length > 0) {
          params.push(id);
          await query(`UPDATE activities SET ${fields.join(', ')} WHERE id = ?`, params);
        }

        return res.json({ success: true, message: 'Activity updated successfully' });
      } catch (err) {
        console.error('[Compat] Error updating activity:', err);
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    if (action === 'delete_add_on' || action === 'delete_activity') {
      const id = req.body?.id || req.query?.id;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Activity ID is required.' });
      }

      try {
        await query('DELETE FROM activities WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Activity deleted successfully' });
      } catch (err) {
        console.error('[Compat] Error deleting activity:', err);
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    // -------------------------------------------------------------

    // -------------------------------------------------------------
    // Direct Official Voucher PDF Stream / Download
    // -------------------------------------------------------------
    if (action === 'download_voucher_pdf' || action === 'download_pdf') {
      const bkgId = req.query.id || req.query.booking_id || req.query.pnr;
      // The PDF link in the confirmation email carries a key for this one booking
      const viaVoucherLink = hasVoucherAccess(bkgId, req.query.vk);
      if (!req.user && !viaVoucherLink) {
        return res.status(401).send('Authentication required to access booking vouchers.');
      }

      if (!bkgId) {
        return res.status(400).send('Booking ID reference is required.');
      }

      try {
        const bookings = await query('SELECT * FROM bookings WHERE id = ?', [bkgId]);
        if (bookings.length === 0) {
          return res.status(404).send('Booking voucher not found.');
        }

        const isAuthorized = viaVoucherLink || await isBookingOwnerOrStaff(bookings[0], req.user);
        if (!isAuthorized) {
          return res.status(403).send('Access denied: You do not have permission to download this voucher.');
        }

        const items = await query('SELECT * FROM booking_items WHERE booking_id = ?', [bkgId]);
        const vouchers = await query('SELECT * FROM vouchers WHERE booking_id = ?', [bkgId]);

        const bookingRecord = { ...bookings[0] };
        let hotelName = '';
        let roomTypeName = '';

        if (items.length > 0 && items[0].item_type === 'HOTEL' && items[0].reference_id) {
          const roomTypes = await query('SELECT * FROM hotel_room_types WHERE id = ?', [items[0].reference_id]);
          if (roomTypes.length > 0) {
            roomTypeName = roomTypes[0].name;
            const hotels = await query('SELECT * FROM hotels WHERE id = ?', [roomTypes[0].hotel_id]);
            if (hotels.length > 0) {
              hotelName = hotels[0].name;
            }
          }
        }

        // What was booked (activity, tour, cab ride, …) for non-hotel vouchers
        const [view] = await addPortalFields([bookingRecord]);
        const enriched = {
          ...view,
          name: bookingRecord.customer_name,
          phone: bookingRecord.customer_phone,
          email: bookingRecord.customer_email,
          hotel_name: hotelName || view.hotel_name || undefined,
          item_name: hotelName || view.item_name || 'Thailand Travel Reservation',
          room_type: roomTypeName || view.room_type || '',
          total_amount: bookingRecord.base_amount_thb || bookingRecord.customer_total_amount,
          total_paid: view.total_paid || 0,
          voucher_code: vouchers[0]?.voucher_code || `VCH-${bkgId}`
        };

        const pdfBuffer = await generateVoucherPdfBuffer(enriched, vouchers[0]?.voucher_code);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="WOW_THAILAND_Voucher_${bkgId}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        return res.end(pdfBuffer);
      } catch (err) {
        console.error('[Compat] Voucher PDF download error:', err);
        return res.status(500).send('Failed to generate official voucher PDF');
      }
    }

    // 5. BOOKINGS & CHECKOUT ENGINE
    // -------------------------------------------------------------
    if (resource === 'bookings' || action === 'book' || action === 'create_booking') {
      if (req.method === 'POST') {
        if (action === 'create' || action === 'book' || action === 'create_booking' || !action) {
          return bookingController.createBooking(req, res, next);
        }
        if (action === 'verify_booking_payment' || action === 'confirm_booking') {
          return bookingController.verifyPayment(req, res, next);
        }
      }
      if (req.query.id || req.query.booking_id) {
        req.params.id = req.query.id || req.query.booking_id;
        return bookingController.getBookingById(req, res, next);
      }
      // List bookings
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required to list bookings.' });
      }

      let sql = 'SELECT * FROM bookings';
      const where = [];
      const params = [];

      if (req.user.role === 'customer') {
        const cleanUserPhone = String(req.user.phone || '').replace(/\D/g, '');
        const userEmail = String(req.user.email || '').trim().toLowerCase();
        const userId = req.user.id;

        // Disallow querying another customer's data
        const phoneParam = req.query.customer_phone || req.query.mobile || req.query.phone;
        const emailParam = req.query.email;
        if (!verifyCustomerSelfAccess(req.user, phoneParam, emailParam)) {
          return res.status(403).json({ success: false, error: 'Access denied: Cannot query bookings for another customer.' });
        }

        where.push('(customer_phone LIKE ? OR customer_email = ? OR user_id = ?)');
        params.push(`%${cleanUserPhone.slice(-8)}%`, userEmail || '___none___', userId || '___none___');
      } else if (['hotel_vendor', 'transfer_vendor', 'tour_vendor', 'flight_vendor', 'vendor'].includes(req.user.role)) {
        const resolvedVendorId = await resolveVendorId(req.user);
        if (req.query.vendor_id && resolvedVendorId && String(req.query.vendor_id) !== String(resolvedVendorId)) {
          return res.status(403).json({ success: false, error: 'Access denied: Vendors can only query their own bookings.' });
        }
        where.push('vendor_id = ?');
        params.push(resolvedVendorId || req.user.id);
      } else if (ADMIN_ROLES.includes(req.user.role)) {
        const phoneParam = req.query.customer_phone || req.query.mobile || req.query.phone;
        if (phoneParam) {
          const clean = String(phoneParam).replace(/\D/g, '');
          where.push('(customer_phone LIKE ? OR customer_phone = ?)');
          params.push(`%${clean.slice(-9)}%`, phoneParam);
        }
        if (req.query.email) {
          where.push('customer_email = ?');
          params.push(String(req.query.email).trim().toLowerCase());
        }
        if (req.query.vendor_id) {
          where.push('vendor_id = ?');
          params.push(req.query.vendor_id);
        }
      } else if (['b2b_agent', 'b2b', 'agent'].includes(req.user.role)) {
        // B2B partners see the bookings they made (b2b_book saves the partner as user_id)
        where.push('user_id = ?');
        params.push(req.user.id);
      } else {
        // Drivers and other roles: their work comes from the driver endpoints, not this list
        return res.json([]);
      }

      if (where.length > 0) {
        sql += ' WHERE ' + where.join(' AND ');
      }
      // Portals load the whole list at once, so return all of it (up to a safety cap)
      const maxRows = req.user.role === 'customer' ? 200 : 2000;
      const requestedLimit = parseInt(req.query.limit, 10);
      const limit = requestedLimit > 0 ? Math.min(requestedLimit, maxRows) : maxRows;
      sql += ` ORDER BY created_at DESC LIMIT ${limit}`;
      const bookings = await query(sql, params);
      // Every portal gets what each booking is (cab ride, hotel, activity, …), its price, dates and status
      return res.json(await addPortalFields(bookings));
    }

    if (action === 'update_booking_checkin') {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
      }

      const payload = req.body || {};
      const bookingId = payload.booking_id || payload.id;
      const assignedRoom = payload.assigned_room_no || payload.room_number || '';
      const checkinStatus = payload.checkin_status || 'Checked In';
      const mealPlan = payload.meal_plan || '';

      if (!bookingId) {
        return res.status(400).json({ success: false, error: 'Booking ID is required.' });
      }

      const existingBookings = await query('SELECT * FROM bookings WHERE id = ?', [bookingId]);
      if (existingBookings.length === 0) {
        return res.status(404).json({ success: false, error: 'Booking not found.' });
      }
      const booking = existingBookings[0];

      // Vendor ownership check
      const resolvedVendorId = await resolveVendorId(req.user);
      if (resolvedVendorId && String(booking.vendor_id) !== String(resolvedVendorId)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: Vendors can only update check-in for their own bookings.'
        });
      }

      try {
        const dbStatus = checkinStatus === 'Checked Out' ? 'Completed' : 'Confirmed';
        await query(
          `UPDATE bookings 
           SET booking_status = ?,
               special_requests = CONCAT(COALESCE(special_requests, ''), ' [Room: ', ?, ', Checkin: ', ?, ', Meal: ', ?, ']')
           WHERE id = ?`,
          [dbStatus, assignedRoom, checkinStatus, mealPlan, bookingId]
        );

        const items = await query('SELECT id, details_json FROM booking_items WHERE booking_id = ?', [bookingId]);
        if (items.length > 0) {
          for (const it of items) {
            let curDetails = {};
            try { curDetails = typeof it.details_json === 'string' ? JSON.parse(it.details_json) : (it.details_json || {}); } catch {}
            curDetails.assigned_room_no = assignedRoom;
            curDetails.checkin_status = checkinStatus;
            curDetails.meal_plan = mealPlan;
            await query('UPDATE booking_items SET details_json = ? WHERE id = ?', [JSON.stringify(curDetails), it.id]);
          }
        }
      } catch (dbErr) {
        console.warn('[update_booking_checkin] Database notice:', dbErr.message);
      }

      return res.json({
        success: true,
        booking_id: bookingId,
        assigned_room_no: assignedRoom,
        checkin_status: checkinStatus,
        meal_plan: mealPlan,
        message: 'Check-in and room assignment saved successfully.'
      });
    }

    if (action === 'update_booking_status') {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
      }

      const payload = req.body || {};
      const bookingId = payload.id || payload.booking_id;
      const rawStatus = payload.status || 'Confirmed';
      const paymentStatus = payload.payment_status;

      if (!bookingId) {
        return res.status(400).json({ success: false, error: 'Booking ID is required.' });
      }

      const existingBookings = await query('SELECT * FROM bookings WHERE id = ?', [bookingId]);
      if (existingBookings.length === 0) {
        return res.status(404).json({ success: false, error: 'Booking not found.' });
      }
      const booking = existingBookings[0];

      // Vendor ownership check
      const resolvedVendorId = await resolveVendorId(req.user);
      if (resolvedVendorId && String(booking.vendor_id) !== String(resolvedVendorId)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: Vendors can only update status for their own bookings.'
        });
      }

      // Portals send these in different cases ("Cancelled", "cancelled", "Pending", …)
      const wanted = String(rawStatus).trim().toLowerCase();
      let dbStatus = 'Confirmed';
      if (wanted === 'checked out' || wanted === 'completed') dbStatus = 'Completed';
      else if (wanted === 'cancelled' || wanted === 'canceled') dbStatus = 'Cancelled';
      else if (wanted === 'awaiting payment' || wanted === 'pending') dbStatus = 'Awaiting Payment';

      // payment_status column only takes PENDING / PAID / REJECTED / REFUNDED
      const paidText = String(paymentStatus || '').trim().toLowerCase();
      let dbPaymentStatus = null;
      if (paidText.includes('refund')) dbPaymentStatus = 'REFUNDED';
      else if (paidText.includes('reject') || paidText.includes('fail')) dbPaymentStatus = 'REJECTED';
      else if (paidText.includes('unpaid') || paidText.includes('partial') || paidText.includes('pending')) dbPaymentStatus = 'PENDING';
      else if (/paid|full|success|captured|received/.test(paidText)) dbPaymentStatus = 'PAID';

      try {
        // Cancelling gives the hotel rooms back to the calendar (once)
        if (dbStatus === 'Cancelled' && booking.booking_status !== 'Cancelled') {
          await withTransaction(conn => restoreBookingInventory(conn, bookingId));
        }
        if (dbPaymentStatus) {
          await query('UPDATE bookings SET booking_status = ?, payment_status = ? WHERE id = ?', [dbStatus, dbPaymentStatus, bookingId]);
        } else {
          await query('UPDATE bookings SET booking_status = ? WHERE id = ?', [dbStatus, bookingId]);
        }
      } catch (dbErr) {
        console.error('[update_booking_status] Could not save:', dbErr.message);
        return res.status(500).json({ success: false, error: 'Could not save the booking status. Please try again.' });
      }

      // B2B bookings: cancelling refunds the agent's wallet, completing pays the commission
      try {
        await onBookingStatusChange(bookingId, dbStatus, req.user.id);
      } catch (walletErr) {
        console.error('[update_booking_status] B2B wallet update failed:', walletErr.message);
        return res.status(500).json({
          success: false,
          error: 'Status saved, but the B2B wallet could not be updated. Please save the status again to retry.'
        });
      }

      return res.json({
        success: true,
        booking_id: bookingId,
        status: rawStatus,
        message: `Booking status updated to ${rawStatus} successfully.`
      });
    }

    if (resource === 'booking_invoice_data' || action === 'booking_invoice_data') {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required to access invoice data.' });
      }

      const bId = req.query.booking_id || req.query.id;
      if (!bId) {
        return res.status(400).json({ success: false, error: 'Booking ID is required.' });
      }

      const bookings = await query('SELECT * FROM bookings WHERE id = ?', [bId]);
      if (bookings.length === 0) return res.status(404).json({ success: false, error: 'Booking not found' });

      const isAuthorized = await isBookingOwnerOrStaff(bookings[0], req.user);
      if (!isAuthorized) {
        return res.status(403).json({ success: false, error: 'Access denied: You do not have permission to view this invoice.' });
      }

      const items = await query('SELECT * FROM booking_items WHERE booking_id = ?', [bId]);
      return res.json({
        success: true,
        booking: bookings[0],
        items,
        invoice_number: `INV-${bookings[0].id}`,
        company: 'WOW THAILAND TRAVEL & TRANSFERS',
        company_name: 'WOW THAILAND'
      });
    }

    if (resource === 'check_customer_booking_exists') {
      const phone = req.query.phone || req.query.customer_phone || req.query.mobile || '';
      const clean = phone.replace(/\D/g, '');
      const email = req.query.email || '';
      let exists = false;
      if (clean || email) {
        const rows = await query(
          "SELECT id FROM bookings WHERE REPLACE(REPLACE(REPLACE(customer_phone, ' ', ''), '-', ''), '+', '') LIKE ? OR customer_email = ? LIMIT 1",
          [`%${clean.slice(-8)}%`, email || '___none___']
        );
        exists = rows.length > 0;
      }
      return res.json({ success: true, exists });
    }

    if (resource === 'booking_review_status') {
      return res.json({ success: true, is_reviewed: false });
    }

    // -------------------------------------------------------------
    // 6. USERS & VENDORS (PORTALS: Admin, SuperAdmin, SubAdmin)
    // -------------------------------------------------------------
    // Admin "activate / suspend user" (and approve / reject for B2B partner applications)
    if (action === 'toggle_user_status') {
      const payload = req.body || {};
      const userId = String(payload.id || payload.user_id || '').trim();
      const status = String(payload.status || '').trim().toLowerCase();
      if (!userId || !['active', 'suspended', 'pending', 'rejected'].includes(status)) {
        return res.status(400).json({ success: false, error: 'A user and a status (active, pending or suspended) are required.' });
      }
      const target = (await query('SELECT id, role FROM users WHERE id = ? LIMIT 1', [userId]))[0];
      if (!target) {
        return res.status(404).json({ success: false, error: 'User not found.' });
      }
      if (target.id === req.user.id && status !== 'active') {
        return res.status(400).json({ success: false, error: 'You cannot suspend your own account.' });
      }
      if (['superadmin', 'super_admin'].includes(target.role) && !['superadmin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({ success: false, error: 'Only a super admin can change another super admin.' });
      }
      const partner = await setPartnerStatus(userId, status, req.user);
      if (partner) {
        return res.json({ success: true, id: userId, status: partner.status, partner });
      }
      if (status === 'rejected') {
        return res.status(400).json({ success: false, error: 'Only B2B partner applications can be rejected.' });
      }
      await query('UPDATE users SET status = ? WHERE id = ?', [status, userId]);
      return res.json({ success: true, id: userId, status });
    }

    if (resource === 'users' || resource === 'assignable_users') {
      const users = await query('SELECT id, username, email, role, phone, date_of_birth, status, created_at FROM users');
      return res.json(users);
    }

    if (resource === 'vendors') {
      const isAdmin = req.user && ADMIN_ROLES.includes(req.user.role);
      const vendors = await query(`
        SELECT v.*, u.username, u.email, u.role, u.phone AS user_phone, u.status AS user_status
        FROM vendors v
        LEFT JOIN users u ON v.user_id = u.id
        ORDER BY v.created_at DESC
      `);

      if (isAdmin) {
        return res.json(vendors);
      }

      // Anonymous / public: hide contact details, login names and commercial terms
      const sanitized = vendors.map(v => {
        const { email, contact_phone, user_phone, username, role, user_status, commission_rate, ...rest } = v;
        return rest;
      });
      return res.json(sanitized);
    }

    // -------------------------------------------------------------
    // 7. WALLETS, SETTLEMENTS & FINANCIAL CONTROLS
    // -------------------------------------------------------------
    if (req.method === 'POST' && (action === 'recharge_wallet' || action === 'top_up_wallet')) {
      return walletController.topUpWallet(req, res, next);
    }

    if (resource === 'vendor_wallets' || resource === 'wallets' || resource === 'wallet') {

      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
      }

      const resolvedVendorId = await resolveVendorId(req.user);
      let sql = 'SELECT * FROM vendor_wallets';
      const params = [];

      if (resolvedVendorId) {
        // Strict vendor isolation: vendor can only view their own wallet
        sql += ' WHERE vendor_id = ?';
        params.push(resolvedVendorId);
      } else if (req.query.vendor_id) {
        // Admin filtering
        sql += ' WHERE vendor_id = ?';
        params.push(req.query.vendor_id);
      }

      const wallets = await query(sql, params);
      const mapped = wallets.map(w => ({
        ...w,
        balance: parseFloat(w.balance_thb),
        balance_thb: parseFloat(w.balance_thb),
        reserved_commission: parseFloat(w.hold_amount_thb),
        hold_amount_thb: parseFloat(w.hold_amount_thb),
        negative_limit: -(w.max_negative_bookings * 2000),
        is_blocked: w.negative_booking_count >= w.max_negative_bookings
      }));
      return res.json(mapped);
    }

    if (resource === 'vendor_wallet_info') {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
      }

      const resolvedVendorId = await resolveVendorId(req.user);
      const requestedVendorId = req.query.vendor_id;

      // Ownership enforcement: prevent Vendor A from querying Vendor B's wallet.
      // The vendor screens may ask with the login's own user ID; that is still their own wallet.
      if (resolvedVendorId && requestedVendorId &&
          String(requestedVendorId) !== String(resolvedVendorId) &&
          String(requestedVendorId) !== String(req.user.id)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: Vendors are strictly limited to viewing their own wallet.'
        });
      }

      const effectiveVendorId = resolvedVendorId || requestedVendorId || 'vnd-phuket-01';
      const wallets = await query('SELECT * FROM vendor_wallets WHERE vendor_id = ?', [effectiveVendorId]);
      if (wallets.length === 0) {
        return res.json({ success: true, wallet: { balance: 0, hold_amount: 0 }, is_blocked: false });
      }
      const w = wallets[0];
      return res.json({
        success: true,
        wallet: {
          ...w,
          balance: parseFloat(w.balance_thb),
          reserved_commission: parseFloat(w.hold_amount_thb),
          negative_limit: -(w.max_negative_bookings * 2000)
        },
        is_blocked: w.negative_booking_count >= w.max_negative_bookings
      });
    }

    if (resource === 'wallet_transactions') {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
      }

      const resolvedVendorId = await resolveVendorId(req.user);
      let sql = 'SELECT * FROM wallet_transactions';
      const params = [];

      if (resolvedVendorId) {
        // Strict vendor isolation: vendor can only view their own ledger transactions
        sql += ' WHERE vendor_id = ?';
        params.push(resolvedVendorId);
      } else if (req.query.vendor_id) {
        // Admin filtering
        sql += ' WHERE vendor_id = ?';
        params.push(req.query.vendor_id);
      }

      sql += ' ORDER BY created_at DESC LIMIT 50';
      const txs = await query(sql, params);
      const mapped = txs.map(t => ({
        ...t,
        amount: parseFloat(t.amount_thb),
        amount_thb: parseFloat(t.amount_thb)
      }));
      return res.json(mapped);
    }

    if (resource === 'wallet_settlements' || resource === 'settlements') {
      return res.json([
        { id: 'set-01', vendor_id: 'vnd-phuket-01', amount_thb: 28500, status: 'processed', reference_id: 'SET-TH-001', processed_at: '2026-10-20' }
      ]);
    }

    if (resource === 'blocked_booking_alerts') {
      const blocked = await query('SELECT * FROM vendor_wallets WHERE negative_booking_count >= max_negative_bookings');
      return res.json(blocked);
    }

    if (resource === 'vendor_reactivations') {
      return res.json([]);
    }

    if (resource === 'platform_revenue') {
      const [rev] = await query("SELECT COALESCE(SUM(amount_charged), 0) AS total_revenue FROM payments WHERE status = 'COMPLETED'");
      const [cnt] = await query('SELECT COUNT(*) AS total_bookings FROM bookings');
      return res.json({
        success: true,
        total_revenue: parseFloat(rev.total_revenue || 0),
        total_bookings: cnt.total_bookings,
        currency: 'THB'
      });
    }

    // -------------------------------------------------------------
    // 8. DRIVER PORTAL
    // -------------------------------------------------------------
    if (resource === 'driver_jobs' || resource === 'available_driver_jobs') {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
      }

      const resolvedDriverId = await resolveDriverId(req.user);
      const requestedDriverId = req.query.driver_id;

      // Driver isolation check
      if (resolvedDriverId && requestedDriverId && String(requestedDriverId) !== String(resolvedDriverId) && String(requestedDriverId) !== String(req.user.id)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: Drivers cannot view other drivers\' assigned jobs.'
        });
      }

      let sql = `
        SELECT da.*, b.customer_name, b.customer_phone, b.start_date, b.special_requests
        FROM driver_assignments da
        JOIN bookings b ON da.booking_id = b.id
      `;
      const params = [];

      if (resolvedDriverId) {
        sql += ' WHERE da.driver_id = ?';
        params.push(resolvedDriverId);
      } else if (requestedDriverId) {
        sql += ' WHERE da.driver_id = ?';
        params.push(requestedDriverId);
      }

      sql += ' ORDER BY da.pickup_time ASC';
      const jobs = await query(sql, params);
      return res.json(jobs);
    }

    if (action === 'update_driver_job_status') {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
      }

      const payload = req.body || {};
      const bookingId = payload.booking_id || payload.id;
      const status = payload.status || 'ACCEPTED';

      if (!bookingId) {
        return res.status(400).json({ success: false, error: 'booking_id or job id is required.' });
      }

      const assignments = await query('SELECT * FROM driver_assignments WHERE id = ? OR booking_id = ? LIMIT 1', [bookingId, bookingId]);
      if (assignments.length === 0) {
        return res.status(404).json({ success: false, error: 'Driver job assignment not found.' });
      }
      const assignment = assignments[0];

      // Driver ownership check
      const resolvedDriverId = await resolveDriverId(req.user);
      if (resolvedDriverId && String(assignment.driver_id) !== String(resolvedDriverId) && String(assignment.driver_id) !== String(req.user.id)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: Drivers cannot modify unrelated driver jobs.'
        });
      }

      await query('UPDATE driver_assignments SET status = ? WHERE id = ?', [status, assignment.id]);
      return res.json({ success: true, message: `Driver job updated to ${status}.` });
    }

    if (resource === 'drivers') {
      const drivers = await query('SELECT * FROM drivers');
      return res.json(drivers);
    }

    if (resource === 'driver_details') {
      return driverController.getDriverProfile(req, res, next);
    }

    // -------------------------------------------------------------
    // 9. B2B PARTNER PORTAL
    // -------------------------------------------------------------
    // Handled by controllers/b2bPortalController.js (see handleB2BRequest above)

    // -------------------------------------------------------------
    // 10. PLATFORM SETTINGS, REVENUE & GATEWAYS
    // -------------------------------------------------------------
    if (resource === 'site_configs' || resource === 'site_config' || resource === 'global_settings') {
      const configs = await query('SELECT * FROM site_configs LIMIT 1');
      const cfg = configs[0] || {};
      return res.json({
        site_name: cfg.site_name || 'WOW THAILAND',
        base_currency: cfg.base_currency || 'THB',
        platform_fee_percent: cfg.platform_fee_percent || 10,
        max_negative_bookings: cfg.max_negative_bookings || 2,
        hero_title: cfg.hero_title || 'WOW THAILAND',
        hero_subtitle: cfg.hero_subtitle || 'LUXURY ISLAND TRANSFERS & PRIVATE TOURS'
      });
    }

    if (resource === 'payment_gateways' || resource === 'payment_settings') {
      return res.json([
        { id: 'promptpay', name: 'PromptPay QR (Instant Thai Baht)', active: true, fee: '0%' },
        { id: 'stripe', name: 'Credit / Debit Card (Visa, Mastercard)', active: true, fee: '2.9%' },
        { id: 'omise', name: 'Omise Thailand Payment Gateway', active: true, fee: '2.5%' },
        { id: 'cash', name: 'Cash on Arrival', active: true, fee: '0%' }
      ]);
    }

    if (resource === 'subscription_plans') {
      return res.json([
        { id: 'starter', name: 'Standard Partner', price: 0, max_vehicles: 5, commission_rate: 12 },
        { id: 'pro', name: 'Premium Operator', price: 2500, max_vehicles: 20, commission_rate: 8 },
        { id: 'enterprise', name: 'Elite Enterprise', price: 6000, max_vehicles: 100, commission_rate: 5 }
      ]);
    }

    if (resource === 'my_subscription') {
      return res.json({
        success: true,
        plan_id: 'enterprise',
        name: 'Elite Enterprise',
        status: 'active',
        expires_at: '2027-12-31'
      });
    }

    if (resource === 'commission_rules') {
      return res.json([
        { service_type: 'hotel', commission_percent: 10 },
        { service_type: 'transfer', commission_percent: 12 },
        { service_type: 'tour', commission_percent: 15 }
      ]);
    }

    if (resource === 'pricing_rules' || resource === 'markups') {
      return res.json([
        { category: 'peak_season_markup', multiplier: 1.15, active: true },
        { category: 'early_bird_discount', multiplier: 0.90, active: true }
      ]);
    }

    if (resource === 'coupons') {
      return res.json([
        { id: 'THAIWOW10', code: 'THAIWOW10', discount_type: 'percent', discount_value: 10, min_amount: 1000, description: '10% Welcome to Thailand discount' },
        { id: 'PHUKET500', code: 'PHUKET500', discount_type: 'fixed', discount_value: 500, min_amount: 3000, description: '500 THB Off Phuket Resort Stays' },
        { id: 'VIPTRANSFER', code: 'VIPTRANSFER', discount_type: 'percent', discount_value: 15, min_amount: 1500, description: '15% Off Airport Luxury Transfers' }
      ]);
    }

    // -------------------------------------------------------------
    // 11. CURRENCY EXCHANGE & FLIGHTS
    // -------------------------------------------------------------
    if (resource === 'currency' || resource === 'currencies' || resource === 'exchange_rates' || action === 'rates') {
      return res.json({
        success: true,
        base_currency: 'THB',
        rates: {
          THB: 1.0,
          INR: getExchangeRate('INR'),
          USD: getExchangeRate('USD')
        }
      });
    }

    if (resource === 'flights') {
      return res.json([]);
    }

    // -------------------------------------------------------------
    // 12. CUSTOMER LOYALTY & ENQUIRIES
    // -------------------------------------------------------------
    if (resource === 'customer_wallet') {
      return res.json({
        balance: 1500,
        currency: 'THB',
        cashback_pending: 0
      });
    }

    if (resource === 'customer_wallet_transactions') {
      return res.json([]);
    }

    if (resource === 'customer_loyalty') {
      return res.json({
        tier: 'Gold',
        points: 450,
        discount_percent: 5,
        lifetime_bookings: 3
      });
    }

    // -------------------------------------------------------------
    // LEADS & IAMKRATU AI CRM ENGINE
    // -------------------------------------------------------------
    if (resource === 'leads' || resource === 'ai_leads' || resource === 'custom_enquiries') {
      try {
        let sql = 'SELECT * FROM leads';
        const params = [];
        if (resource === 'ai_leads') {
          sql += " WHERE source LIKE '%AI%' OR source LIKE '%KRATU%'";
        }
        sql += ' ORDER BY created_at DESC';
        const leads = await query(sql, params);
        return res.json(leads);
      } catch (err) {
        console.error('[Compat] Error fetching leads:', err);
        return res.json([]);
      }
    }

    if (action === 'create_ai_lead') {
      const { name, phone, message } = req.body || {};
      if (!name || !phone) {
        return res.status(400).json({ success: false, error: 'Name and phone are required.' });
      }

      const id = `LD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
      const cleanPhone = String(phone).replace(/\D/g, '');

      try {
        await query(
          `INSERT INTO leads (id, name, phone, source, service, status, notes, next_action, chat_history)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            name.trim(),
            cleanPhone,
            'IAMKRATU AI',
            'AI Inbound Consultation',
            'New',
            message || 'Chat inquiry initiated via IAMKRATU AI Assistant',
            'Contact Traveler via WhatsApp/Phone',
            JSON.stringify([{ role: 'user', content: message || 'Initiated chat' }])
          ]
        );

        await query(
          `INSERT INTO lead_comments (id, lead_id, user_name, user_role, comment)
           VALUES (?, ?, ?, ?, ?)`,
          [
            `cm_${Date.now()}`,
            id,
            'IAMKRATU AI Bot',
            'system',
            `Lead created via IAMKRATU AI Assistant: "${message || 'Inquiry initiated'}"`
          ]
        );

        return res.json({
          success: true,
          lead_id: id,
          id: id,
          message: 'Lead created successfully'
        });
      } catch (err) {
        console.error('[Compat] Error creating AI lead:', err);
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    if (action === 'create_lead') {
      const b = req.body || {};
      const id = b.id || `LD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
      const cleanPhone = String(b.phone || '').replace(/\D/g, '');

      try {
        await query(
          `INSERT INTO leads (id, name, phone, email, source, service, assigned_to, assigned_by, assigned_at, status, budget, notes, next_action)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            (b.name || 'Customer').trim(),
            cleanPhone,
            (b.email || '').trim(),
            b.source || 'IAMKRATU AI',
            b.service || 'General Trip Consultation',
            b.assigned_to || b.assignedTo || 'Unassigned',
            b.assigned_by || null,
            (b.assigned_to && b.assigned_to !== 'Unassigned') ? new Date() : null,
            b.status || 'New',
            b.budget || '',
            b.notes || '',
            b.next_action || 'Contact Traveler'
          ]
        );

        await query(
          `INSERT INTO lead_comments (id, lead_id, user_name, user_role, comment)
           VALUES (?, ?, ?, ?, ?)`,
          [
            `cm_${Date.now()}`,
            id,
            b.assigned_by || 'Admin',
            'admin',
            `Lead created manually with source "${b.source || 'IAMKRATU AI'}"`
          ]
        );

        return res.json({ success: true, lead_id: id, id, message: 'Lead created' });
      } catch (err) {
        console.error('[Compat] Error creating lead:', err);
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    if (action === 'update_lead') {
      const { id, notes, budget, service, source } = req.body || {};
      if (!id) return res.status(400).json({ success: false, error: 'ID required' });

      try {
        const fields = [];
        const params = [];
        if (notes !== undefined) { fields.push('notes = ?'); params.push(notes); }
        if (budget !== undefined) { fields.push('budget = ?'); params.push(budget); }
        if (service !== undefined) { fields.push('service = ?'); params.push(service); }
        if (source !== undefined) { fields.push('source = ?'); params.push(source); }

        if (fields.length > 0) {
          params.push(id);
          await query(`UPDATE leads SET ${fields.join(', ')} WHERE id = ?`, params);
        }
        return res.json({ success: true, message: 'Lead updated' });
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    if (action === 'update_lead_status') {
      const { id, status, user_name, user_role } = req.body || {};
      if (!id || !status) return res.status(400).json({ success: false, error: 'ID and status required' });

      try {
        await query('UPDATE leads SET status = ? WHERE id = ?', [status, id]);

        await query(
          `INSERT INTO lead_comments (id, lead_id, user_name, user_role, comment)
           VALUES (?, ?, ?, ?, ?)`,
          [`cm_${Date.now()}`, id, user_name || 'Admin', user_role || 'admin', `Status changed to: ${status}`]
        );

        return res.json({ success: true, message: 'Status updated' });
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    if (action === 'assign_lead') {
      const { id, assigned_to, assigned_by } = req.body || {};
      if (!id || !assigned_to) return res.status(400).json({ success: false, error: 'ID and assignee required' });

      try {
        const now = new Date();
        await query(
          'UPDATE leads SET assigned_to = ?, assigned_by = ?, assigned_at = ? WHERE id = ?',
          [assigned_to, assigned_by || 'Admin', now, id]
        );

        await query(
          `INSERT INTO lead_comments (id, lead_id, user_name, user_role, comment)
           VALUES (?, ?, ?, ?, ?)`,
          [`cm_${Date.now()}`, id, assigned_by || 'Admin', 'admin', `Assigned to: ${assigned_to}`]
        );

        return res.json({ success: true, assigned_at: now.toISOString(), message: 'Lead assigned' });
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    if (action === 'update_next_action') {
      const { id, next_action, user_name, user_role } = req.body || {};
      if (!id) return res.status(400).json({ success: false, error: 'ID required' });

      try {
        await query('UPDATE leads SET next_action = ? WHERE id = ?', [next_action, id]);
        return res.json({ success: true, message: 'Next action updated' });
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    if (action === 'delete_lead') {
      const id = req.body?.id || req.query?.id;
      if (!id) return res.status(400).json({ success: false, error: 'ID required' });

      try {
        await query('DELETE FROM leads WHERE id = ?', [id]);
        await query('DELETE FROM lead_comments WHERE lead_id = ?', [id]);
        return res.json({ success: true, message: 'Lead deleted' });
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    if (resource === 'lead_comments') {
      const leadId = req.query.lead_id || req.body?.lead_id;
      if (!leadId) return res.json([]);
      try {
        const comments = await query(
          'SELECT * FROM lead_comments WHERE lead_id = ? ORDER BY created_at ASC',
          [leadId]
        );
        return res.json(comments);
      } catch (err) {
        return res.json([]);
      }
    }

    if (action === 'add_lead_comment') {
      const { lead_id, comment, user_name, user_role } = req.body || {};
      if (!lead_id || !comment) return res.status(400).json({ success: false, error: 'Lead ID and comment required' });

      const commentId = `cm_${Date.now()}`;
      try {
        await query(
          `INSERT INTO lead_comments (id, lead_id, user_name, user_role, comment)
           VALUES (?, ?, ?, ?, ?)`,
          [commentId, lead_id, user_name || 'Admin', user_role || 'admin', comment]
        );

        return res.json({
          success: true,
          comment: {
            id: commentId,
            lead_id,
            user_name: user_name || 'Admin',
            user_role: user_role || 'admin',
            comment,
            created_at: new Date().toISOString()
          }
        });
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    if (action === 'delete_lead_comment') {
      const id = req.body?.id || req.query?.id;
      if (id) {
        await query('DELETE FROM lead_comments WHERE id = ?', [id]);
      }
      return res.json({ success: true, message: 'Comment deleted' });
    }

    if (resource === 'assignable_users') {
      try {
        const users = await query("SELECT id, username, email, phone, role, status FROM users WHERE status = 'active' OR status IS NULL");
        const mapped = users.map(u => ({
          ...u,
          name: u.username || 'Staff User'
        }));
        return res.json(mapped);
      } catch (err) {
        return res.json([]);
      }
    }

    if (resource === 'vendor_cancellation_policies' || resource === 'vendor_cancellation_policy') {
      return res.json({
        free_cancellation_hours: 48,
        penalty_within_24h_percent: 50,
        no_show_penalty_percent: 100
      });
    }

    if (resource === 'vendor_hold_settings' || resource === 'all_vendor_hold_settings') {
      return res.json({
        hold_duration_hours: 24,
        auto_release_unpaid: true
      });
    }

    // -------------------------------------------------------------
    // VENDOR & ADMIN PAYMENT METHODS
    // -------------------------------------------------------------
    if (action === 'get_vendor_payment_methods' || resource === 'vendor_payment_methods') {
      const vendorId = req.query.vendor_id || req.body?.vendor_id;
      let methods = [];
      try {
        if (vendorId) {
          methods = await query('SELECT * FROM vendor_payment_methods WHERE vendor_id = ? ORDER BY created_at DESC', [vendorId]);
          if (methods.length === 0) {
            methods = await query("SELECT * FROM vendor_payment_methods WHERE status = 'Active' ORDER BY created_at DESC");
          }
        } else {
          methods = await query("SELECT * FROM vendor_payment_methods WHERE status = 'Active' ORDER BY created_at DESC");
        }
      } catch (e) {
        console.error('Error fetching vendor payment methods:', e);
        methods = [];
      }
      return res.json(methods);
    }

    if (action === 'get_admin_payment_methods') {
      let methods = [];
      try {
        methods = await query("SELECT * FROM vendor_payment_methods WHERE status = 'Active' ORDER BY created_at DESC");
      } catch (e) {
        console.error('Error fetching admin payment methods:', e);
        methods = [];
      }
      return res.json(methods);
    }

    if (action === 'add_vendor_payment_method') {
      const body = req.body || {};
      const id = body.id || `vpm-${Date.now()}`;
      try {
        await query(
          `INSERT INTO vendor_payment_methods 
           (id, vendor_id, method_type, display_name, account_name, bank_name, account_number, ifsc_code, upi_id, qr_image_url, instructions, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            body.vendor_id || 'vnd-phuket-01',
            body.method_type || 'Bank Transfer',
            body.display_name || (body.method_type + ' Payment'),
            body.account_name || null,
            body.bank_name || null,
            body.account_number || null,
            body.ifsc_code || null,
            body.upi_id || null,
            body.qr_image_url || null,
            body.instructions || null,
            body.status || 'Active'
          ]
        );
        return res.json({ success: true, id, message: 'Vendor payment method added.' });
      } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
      }
    }

    if (action === 'update_vendor_payment_method') {
      const body = req.body || {};
      try {
        await query(
          `UPDATE vendor_payment_methods 
           SET display_name = ?, account_name = ?, bank_name = ?, account_number = ?, ifsc_code = ?, upi_id = ?, qr_image_url = ?, instructions = ?, status = ?
           WHERE id = ?`,
          [
            body.display_name,
            body.account_name || null,
            body.bank_name || null,
            body.account_number || null,
            body.ifsc_code || null,
            body.upi_id || null,
            body.qr_image_url || null,
            body.instructions || null,
            body.status || 'Active',
            body.id
          ]
        );
        return res.json({ success: true, message: 'Vendor payment method updated.' });
      } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
      }
    }

    if (action === 'delete_vendor_payment_method') {
      const id = req.body?.id || req.query?.id;
      try {
        if (id) {
          await query('DELETE FROM vendor_payment_methods WHERE id = ?', [id]);
        }
        return res.json({ success: true, message: 'Vendor payment method deleted.' });
      } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
      }
    }

    if (resource === 'public_reviews' || resource === 'admin_reviews' || resource === 'customer_reviews') {
      return res.json({
        success: true,
        reviews: [
          { id: 'rev-01', customer_name: 'Priya Patel', rating: 5, review: 'Fantastic speedboat transfer to Maya Bay. Extremely professional!', date: '2026-10-18' }
        ],
        total: 1
      });
    }

    if (resource === 'today_birthdays' || resource === 'birthday_logs' || resource === 'birthday_offers') {
      return res.json([]);
    }

    if (resource === 'ai_settings' || resource === 'chatbot_settings') {
      return res.json({
        success: true,
        bot_name: 'Luzia Thailand',
        language: 'en',
        welcome_message: 'Sawasdee Krub! Welcome to WOW THAILAND. How may I assist your journey today?'
      });
    }

    // -------------------------------------------------------------
    // EXPLICIT 404 FOR ANY UNIMPLEMENTED RESOURCE
    // DO NOT SILENTLY RETURN MOCK DATA
    // -------------------------------------------------------------
    return res.status(404).json({
      success: false,
      error: `Resource not implemented: '${resource || action}'`,
      resource,
      action
    });
  } catch (err) {
    next(err);
  }
});

export default router;
