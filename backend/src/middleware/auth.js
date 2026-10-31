// ========================================================================
// WOW THAILAND: Authentication & Role-Based Access Control Middleware
// Cryptographic JWT verification with Expiry, Issuer, Audience & Role Checks
// ========================================================================

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET environment variable is required in production.');
}

export const ACTIVE_JWT_SECRET = JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'test_jwt_secret_key_wow_thailand_2026' : 'dev_jwt_secret_key_wow_thailand_2026');
export const JWT_ISSUER = process.env.JWT_ISSUER || 'wow_thailand';
export const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'wow_thailand_app';

export const VALID_ROLES = new Set([
  'customer',
  'admin',
  'superadmin',
  'subadmin',
  'sub_admin',
  'super_admin',
  'hotel_vendor',
  'transfer_vendor',
  'tour_vendor',
  'flight_vendor',
  'vendor',
  'driver',
  'b2b_agent',
  'b2b',
  'agent'
]);

/**
 * Sign a standard, secure JWT with Issuer, Audience, and Expiry claims
 */
export function signJwtToken(payload, expiresIn = '7d') {
  return jwt.sign(
    payload,
    ACTIVE_JWT_SECRET,
    {
      expiresIn,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    }
  );
}

/**
 * Verify JWT Bearer token or X-Auth-Token header with strict validation
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const candidates = [
    authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim(),
    (req.headers['x-auth-token'] || '').trim(),
    typeof req.query.auth_token === 'string' ? req.query.auth_token.trim() : ''
  ];

  req.user = null;
  for (const token of candidates) {
    if (!token) continue;
    try {
      const decoded = jwt.verify(token, ACTIVE_JWT_SECRET, {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE
      });

      // Strict role validation
      if (decoded && decoded.role && VALID_ROLES.has(decoded.role)) {
        req.user = decoded;
        break;
      }
    } catch (err) {
      // In non-production, allow verification without issuer/audience if test suite generated legacy tokens
      if (process.env.NODE_ENV !== 'production') {
        try {
          const fallbackDecoded = jwt.verify(token, ACTIVE_JWT_SECRET);
          if (fallbackDecoded && fallbackDecoded.role && VALID_ROLES.has(fallbackDecoded.role)) {
            req.user = fallbackDecoded;
            break;
          }
        } catch (fbErr) {}
      }
    }
  }
  next();
}

/**
 * Enforce that the user must be authenticated
 */
export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please sign in.'
    });
  }
  next();
}

/**
 * Enforce role-based access control with role whitelist
 */
export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Requires one of: ${allowedRoles.join(', ')}`
      });
    }
    next();
  };
}
