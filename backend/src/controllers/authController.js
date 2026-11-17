// ========================================================================
// WOW THAILAND: Authentication Controller (bcrypt + JWT)
// ========================================================================

import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { signJwtToken } from '../middleware/auth.js';
import { isB2BRole, loginBlockReason, getPartner } from '../services/b2bService.js';
import {
  isLocalRequest, devShortcutsAllowed, loginLimits, retryAfter, noteAttempt, clearAttempts, tooManyAttempts
} from '../utils/loginGuard.js';

// Compared against when the account does not exist, so a wrong username takes as long as a wrong password
const NO_SUCH_USER_HASH = bcrypt.hashSync('no-such-account-placeholder', 10);

export async function login(req, res, next, { b2bOnly = false } = {}) {
  try {
    const { username, email, phone, password } = req.body;
    const identifier = (username || email || phone || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: 'Identifier and password are required.' });
    }

    // Guessing protection for sign-ins from other computers
    const limits = isLocalRequest(req) ? [] : loginLimits(req, identifier);
    const wait = retryAfter(limits);
    if (wait) {
      return tooManyAttempts(res, wait);
    }

    const users = await query(
      'SELECT * FROM users WHERE username = ? OR email = ? OR phone = ? LIMIT 1',
      [identifier, identifier, identifier]
    );

    if (users.length === 0) {
      await bcrypt.compare(String(password), NO_SUCH_USER_HASH);
      noteAttempt(limits);
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    const user = users[0];
    const isBcryptMatch = Boolean(user.password_hash) && await bcrypt.compare(String(password), user.password_hash);
    // Shared demo passwords open any account, so they are accepted only on this computer
    // (and only while ALLOW_DEMO_PASSWORDS=true). Each account's own password works everywhere.
    const isDevMatch = devShortcutsAllowed(req) && [
      'admin@2026', 'admin@123', 'cabs@123', 'resort@123', 'partner@123',
      'superadmin@123', 'superadmin123', 'superadmin@2026', 'superadmin',
      'admin', 'vendor', 'hotel_vendor', 'flight_vendor', 'TestPassword123!',
      'Vendor@Thai2026', 'Hotel@Thai2026', 'Flight@Thai2026', 'Partner@Thai2026', 'Driver@Thai2026',
      'Vendor@Goa2026', 'Hotel@Goa2026', 'Flight@Goa2026', 'Partner@Goa2026', 'Driver@2004'
    ].includes(password);

    if (!isBcryptMatch && !isDevMatch) {
      noteAttempt(limits);
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }
    // Correct password: forget this address's failed tries for this account
    clearAttempts(limits.slice(0, 1));

    // The B2B portal's sign-in is for partner accounts only
    if (b2bOnly && !isB2BRole(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'This sign-in is for B2B travel partners. Please use the main WOW THAILAND login.'
      });
    }

    // B2B applications waiting for approval, or not approved
    const b2bBlock = await loginBlockReason(user);
    if (b2bBlock) {
      return res.status(403).json({ success: false, error: b2bBlock, status: user.status === 'pending' ? 'pending' : 'rejected' });
    }

    // Suspended accounts (e.g. a chauffeur removed from a vendor's roster) cannot sign in
    if (user.status === 'suspended') {
      return res.status(403).json({ success: false, error: 'This account is suspended. Please contact WOW THAILAND support.' });
    }

    const token = signJwtToken(
      { id: user.id, username: user.username, role: user.role, phone: user.phone, email: user.email },
      '7d'
    );

    // Sanitize user output (omit password_hash)
    const { password_hash, ...safeUser } = user;
    // B2B partners also get their company profile, booking modes, rates and wallet balance
    const partner = isB2BRole(user.role) ? await getPartner(user.id) : null;

    res.json({
      success: true,
      token,
      user: partner ? { ...safeUser, ...partner } : safeUser
    });
  } catch (err) {
    next(err);
  }
}
