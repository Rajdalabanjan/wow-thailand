// ========================================================================
// WOW THAILAND: B2B Partner Portal requests (compat /api.php router)
// A partner only ever sees and changes their own account; admins manage all
// partners. Everyone else is refused.
// ========================================================================

import bcrypt from 'bcryptjs';
import * as b2b from '../services/b2bService.js';
import { addPortalFields } from '../services/customerBookingView.js';
import { restoreBookingInventory } from '../services/bookingService.js';
import { isLocalRequest, clientIp, retryAfter, noteAttempt, tooManyAttempts } from '../utils/loginGuard.js';

const ADMIN_ROLES = ['admin', 'superadmin', 'subadmin', 'sub_admin', 'super_admin'];

export const B2B_RESOURCES = new Set([
  'b2b_dashboard', 'b2b_bookings', 'b2b_customers', 'b2b_reports', 'b2b_wallet', 'b2b_pricing_preview',
  'b2b_notifications', 'admin_b2b_notifications', 'b2b_partners', 'b2b_mode_requests',
  'b2b_all_wallet_transactions', 'b2b_pricing_rules', 'b2b_audit_logs'
]);

export const B2B_ACTIONS = new Set([
  'b2b_register', 'b2b_book', 'b2b_wallet_recharge', 'b2b_cancel_booking', 'b2b_update_booking_markup',
  'b2b_update_profile', 'b2b_request_mode', 'b2b_mark_notification_read', 'b2b_clear_notifications',
  // admin
  'b2b_admin_adjust_wallet', 'b2b_approve_wallet_recharge', 'b2b_reject_wallet_recharge',
  'b2b_approve_partner', 'b2b_reject_partner', 'b2b_approve_mode_request', 'b2b_reject_mode_request',
  'save_b2b_partner', 'save_b2b_pricing_rule'
]);

/** Admin-only B2B resources and actions (also listed in the router's access policy). */
export const B2B_ADMIN_RESOURCES = ['admin_b2b_notifications', 'b2b_partners', 'b2b_mode_requests',
  'b2b_all_wallet_transactions', 'b2b_pricing_rules', 'b2b_audit_logs'];
export const B2B_ADMIN_ACTIONS = ['b2b_admin_adjust_wallet', 'b2b_approve_wallet_recharge', 'b2b_reject_wallet_recharge',
  'b2b_approve_partner', 'b2b_reject_partner', 'b2b_approve_mode_request', 'b2b_reject_mode_request',
  'save_b2b_partner', 'save_b2b_pricing_rule'];

const fail = (status, message) => { throw new b2b.B2BError(status, message); };

/** Handles a B2B portal request. Returns false when the request is not a B2B one. */
export async function handleB2BRequest(req, res, resource, action) {
  if (!B2B_RESOURCES.has(resource) && !B2B_ACTIONS.has(action)) return false;
  const body = req.body || {};
  const q = req.query || {};

  try {
    await b2b.ensureB2BSchema();

    // Public: apply for a partner account (waits for admin approval)
    if (action === 'b2b_register') {
      const limits = isLocalRequest(req) ? [] : [{ key: `b2b-register:ip:${clientIp(req)}`, max: 5 }];
      const wait = retryAfter(limits);
      if (wait) return tooManyAttempts(res, wait);
      noteAttempt(limits);
      const result = await b2b.registerPartner(body, bcrypt);
      return res.json({
        success: true,
        ...result,
        message: 'Application received. WOW THAILAND will review it and email you once your B2B account is approved.'
      });
    }

    const user = req.user;
    if (!user) return res.status(401).json({ success: false, error: 'Please sign in to the B2B portal.' });
    const admin = ADMIN_ROLES.includes(user.role);
    const partnerSelf = b2b.isB2BRole(user.role);
    if (!admin && !partnerSelf) {
      return res.status(403).json({ success: false, error: 'The B2B portal is for WOW THAILAND travel partners only.' });
    }
    const adminOnly = () => { if (!admin) fail(403, 'Only WOW THAILAND admins can do this.'); };
    const partnerOnly = () => { if (!partnerSelf) fail(403, 'This is done from the partner\'s own B2B portal.'); };
    // A partner is always themselves; an admin names the partner
    const partnerId = () => {
      if (partnerSelf) return user.id;
      const id = q.b2b_partner_id || q.partner_id || body.b2b_partner_id || body.partner_id;
      if (!id || id === 'all') fail(400, 'Please choose a B2B partner.');
      return String(id);
    };

    // ---------------- Read ----------------
    if (resource === 'b2b_dashboard') return res.json(await b2b.dashboardFor(partnerId(), addPortalFields));

    if (resource === 'b2b_bookings') {
      const who = partnerSelf ? user.id : (q.b2b_partner_id && q.b2b_partner_id !== '' ? String(q.b2b_partner_id) : 'all');
      return res.json(await b2b.listPartnerBookings(who, {
        mode: q.mode, status: q.status, search: q.search, addPortalFields
      }));
    }

    if (resource === 'b2b_customers') return res.json(await b2b.customersFor(partnerId(), q.search));
    if (resource === 'b2b_reports') return res.json(await b2b.reportsFor(partnerId(), addPortalFields));
    if (resource === 'b2b_wallet') return res.json(await b2b.getWallet(partnerId()));

    if (resource === 'b2b_pricing_preview') {
      return res.json({ success: true, pricing: await b2b.pricingPreview(partnerId(), q) });
    }

    if (resource === 'b2b_notifications') {
      return res.json(await b2b.listNotifications(partnerSelf ? user.id : (q.b2b_partner_id || 'admin')));
    }
    if (resource === 'admin_b2b_notifications') {
      adminOnly();
      return res.json(await b2b.listNotifications('admin'));
    }

    if (resource === 'b2b_partners') { adminOnly(); return res.json(await b2b.listPartners()); }
    if (resource === 'b2b_mode_requests') { adminOnly(); return res.json(await b2b.listModeRequests()); }
    if (resource === 'b2b_all_wallet_transactions') { adminOnly(); return res.json(await b2b.listAllWalletTransactions()); }
    if (resource === 'b2b_pricing_rules') { adminOnly(); return res.json(await b2b.listPricingRules()); }
    if (resource === 'b2b_audit_logs') { adminOnly(); return res.json(await b2b.listAuditLog(q.b2b_partner_id || '')); }

    // ---------------- Partner actions ----------------
    if (action === 'b2b_book') {
      const result = await b2b.createB2BBooking(partnerId(), body);
      return res.json(result);
    }

    if (action === 'b2b_wallet_recharge') {
      partnerOnly();
      return res.json(await b2b.requestTopUp(user.id, body));
    }

    if (action === 'b2b_cancel_booking') {
      if (!body.booking_id) fail(400, 'Booking ID is required.');
      return res.json(await b2b.cancelB2BBooking(String(body.booking_id), body.reason, user, restoreBookingInventory));
    }

    if (action === 'b2b_update_booking_markup') {
      partnerOnly();
      if (!body.booking_id) fail(400, 'Booking ID is required.');
      return res.json(await b2b.setBookingMarkup(user.id, String(body.booking_id), body.b2b_markup_amount));
    }

    if (action === 'b2b_update_profile') {
      const partner = await b2b.updateOwnProfile(partnerId(), body);
      return res.json({ success: true, partner, message: 'Company profile updated.' });
    }

    if (action === 'b2b_request_mode') {
      partnerOnly();
      const partner = await b2b.requestMode(user.id, body.requested_mode, body.note);
      return res.json({ success: true, partner, message: 'Mode request sent to WOW THAILAND for approval.' });
    }

    if (action === 'b2b_mark_notification_read') {
      const owner = partnerSelf ? user.id : 'admin';
      return res.json(await b2b.markNotificationsRead(owner, body.id, Number(body.all) === 1 || body.all === true));
    }
    if (action === 'b2b_clear_notifications') {
      return res.json(await b2b.clearNotifications(partnerSelf ? user.id : 'admin'));
    }

    // ---------------- Admin actions ----------------
    adminOnly();
    if (action === 'b2b_admin_adjust_wallet') return res.json(await b2b.adjustWallet(body, user));
    if (action === 'b2b_approve_wallet_recharge' || action === 'b2b_reject_wallet_recharge') {
      const id = body.transaction_id || body.id;
      if (!id) fail(400, 'Top-up request ID is required.');
      return res.json(await b2b.reviewTopUp(String(id), action === 'b2b_approve_wallet_recharge', body.note || body.reason, user));
    }
    if (action === 'b2b_approve_partner') {
      return res.json({ success: true, partner: await b2b.approvePartner(String(body.partner_id || ''), user) });
    }
    if (action === 'b2b_reject_partner') {
      return res.json({ success: true, partner: await b2b.rejectPartner(String(body.partner_id || ''), body.reason, user) });
    }
    if (action === 'b2b_approve_mode_request' || action === 'b2b_reject_mode_request') {
      const approve = action === 'b2b_approve_mode_request';
      return res.json({ success: true, partner: await b2b.reviewModeRequest(String(body.partner_id || ''), approve, body.reason, user) });
    }
    if (action === 'save_b2b_partner') {
      return res.json({ success: true, partner: await b2b.savePartnerByAdmin(body, user, bcrypt) });
    }
    if (action === 'save_b2b_pricing_rule') {
      return res.json({ success: true, rule: await b2b.savePricingRule(body, user) });
    }

    return res.status(400).json({ success: false, error: 'Unknown B2B request.' });
  } catch (err) {
    if (err instanceof b2b.B2BError || (err.statusCode && err.statusCode < 500)) {
      return res.status(err.statusCode || 400).json({ success: false, error: err.message, code: err.code });
    }
    throw err;
  }
}
