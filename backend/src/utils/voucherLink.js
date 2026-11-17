// ========================================================================
// WOW THAILAND: Shareable voucher links
// /voucher?id=<booking>&vk=<key> opens that one voucher without signing in, so the link
// in the confirmation email / WhatsApp works. The key is an HMAC of the booking id, so
// a booking id alone (which is guessable) is not enough.
// ========================================================================

import crypto from 'crypto';
import { ACTIVE_JWT_SECRET } from '../middleware/auth.js';

export function voucherAccessKey(bookingId) {
  return crypto
    .createHmac('sha256', ACTIVE_JWT_SECRET)
    .update(`voucher:${bookingId}`)
    .digest('base64url')
    .slice(0, 22);
}

export function hasVoucherAccess(bookingId, key) {
  if (!bookingId || typeof key !== 'string' || key.length === 0) return false;
  const expected = Buffer.from(voucherAccessKey(String(bookingId)));
  const given = Buffer.from(key);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}
