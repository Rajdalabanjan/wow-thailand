// ========================================================================
// WOW THAILAND: Cryptographic Security Utility
// AES-256-GCM authenticated encryption & HMAC-SHA256 hashing
// ========================================================================

import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'wow_thailand_dev_secret_key_change_in_production';
const KEY = crypto.scryptSync(JWT_SECRET, 'wow_thailand_salt_cab_v1', 32);

/**
 * Hash a 4-digit ride OTP with HMAC-SHA256
 */
export function hashOtp(code) {
  return crypto.createHmac('sha256', KEY).update(String(code).trim()).digest('hex');
}

/**
 * Encrypt ride OTP with AES-256-GCM
 * Returns format: "iv:authTag:ciphertext"
 */
export function encryptOtp(code) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  let encrypted = cipher.update(String(code).trim(), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt ride OTP with AES-256-GCM
 */
export function decryptOtp(encryptedPayload) {
  if (!encryptedPayload || typeof encryptedPayload !== 'string') return null;
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) return null;

  try {
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const ciphertext = parts[2];

    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return null;
  }
}

