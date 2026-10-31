// ========================================================================
// WOW THAILAND: Authentication Controller (bcrypt + JWT)
// ========================================================================

import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { signJwtToken } from '../middleware/auth.js';

export async function login(req, res, next) {
  try {
    const { username, email, phone, password } = req.body;
    const identifier = (username || email || phone || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: 'Identifier and password are required.' });
    }

    const users = await query(
      'SELECT * FROM users WHERE username = ? OR email = ? OR phone = ? LIMIT 1',
      [identifier, identifier, identifier]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    const user = users[0];
    const isBcryptMatch = await bcrypt.compare(password, user.password_hash);
    // Shared demo passwords are for local development only; never enable in production.
    const isDevMatch = process.env.ALLOW_DEMO_PASSWORDS === 'true' && [
      'admin@2026', 'admin@123', 'cabs@123', 'resort@123', 'partner@123',
      'superadmin@123', 'admin', 'vendor', 'hotel_vendor', 'TestPassword123!'
    ].includes(password);

    if (!isBcryptMatch && !isDevMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    const token = signJwtToken(
      { id: user.id, username: user.username, role: user.role, phone: user.phone, email: user.email },
      '7d'
    );

    // Sanitize user output (omit password_hash)
    const { password_hash, ...safeUser } = user;

    res.json({
      success: true,
      token,
      user: safeUser
    });
  } catch (err) {
    next(err);
  }
}
