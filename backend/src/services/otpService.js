// ========================================================================
// WOW THAILAND: Cryptographic OTP Verification Service
// Secure one-time password generation, hashing, rate limiting & delivery
// ========================================================================

import crypto from 'crypto';
import { sendOtpEmail } from './emailService.js';

// In-memory store: Map<identifierKey, OtpRecord>
const otpStore = new Map();

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_VERIFY_ATTEMPTS = 3;
const COOLDOWN_MS = 20 * 1000; // 20 seconds cooldown between send requests

function getSecret() {
  return process.env.JWT_SECRET || 'wow_thailand_secure_otp_pepper_2026';
}

/**
 * Hash an OTP string using HMAC-SHA256 with the system secret
 */
function hashOtp(identifier, otp) {
  return crypto.createHmac('sha256', getSecret())
    .update(`${identifier.trim().toLowerCase()}:${otp.trim()}`)
    .digest('hex');
}

/**
 * Clean phone or email identifier into a standardized lookup key
 */
export function normalizeIdentifier(phone, email) {
  const cleanPhone = String(phone || '').replace(/\D/g, '');
  if (cleanPhone.length >= 8) {
    return `phone:${cleanPhone.slice(-10)}`;
  }
  if (email && String(email).includes('@')) {
    return `email:${String(email).trim().toLowerCase()}`;
  }
  return null;
}

/**
 * Cryptographically generate, hash, and store a 6-digit OTP
 * Dispatches via email if email is provided
 */
export async function generateAndSendOtp({ phone, email, purpose = 'Login' }) {
  const key = normalizeIdentifier(phone, email);
  if (!key) {
    return { success: false, error: 'A valid phone number or email is required.' };
  }

  // Check rate limit / cooldown
  const existing = otpStore.get(key);
  if (existing && Date.now() - existing.createdAt < COOLDOWN_MS) {
    const waitSec = Math.ceil((COOLDOWN_MS - (Date.now() - existing.createdAt)) / 1000);
    return { success: false, error: `Please wait ${waitSec} seconds before requesting a new code.` };
  }

  // Cryptographically secure 6-digit random code (100000 - 999999)
  const plainOtp = crypto.randomInt(100000, 1000000).toString();
  const hashed = hashOtp(key, plainOtp);

  // Store hashed record
  otpStore.set(key, {
    hash: hashed,
    expiresAt: Date.now() + OTP_EXPIRY_MS,
    createdAt: Date.now(),
    attempts: 0,
    maxAttempts: MAX_VERIFY_ATTEMPTS
  });

  // Secondary key indexing (e.g. if both phone and email were supplied)
  if (email && key.startsWith('phone:')) {
    const emailKey = `email:${String(email).trim().toLowerCase()}`;
    otpStore.set(emailKey, otpStore.get(key));
  }

  // Production delivery via configured email transporter
  if (email && email.includes('@')) {
    sendOtpEmail(email, plainOtp, purpose).catch(err => {
      console.warn('[OTP Service] Background email delivery notice:', err.message);
    });
  }

  // In development / testing only, log delivery notice without leaking in production
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[OTP Service] [DEV] Generated 6-digit OTP for ${key} (expires in 10m)`);
  }

  return {
    success: true,
    message: 'Verification code generated and dispatched securely.',
    expires_in_seconds: Math.floor(OTP_EXPIRY_MS / 1000)
  };
}

/**
 * Verify an entered OTP against the stored cryptographic hash
 * Deletes on success or on exceeding max attempts (single-use enforcement)
 */
export function verifyHashedOtp({ phone, email, enteredOtp }) {
  const key = normalizeIdentifier(phone, email);
  if (!key) {
    return { success: false, error: 'Identifier is required for verification.' };
  }

  const cleanOtp = String(enteredOtp || '').trim();
  if (!cleanOtp || cleanOtp.length !== 6) {
    return { success: false, error: 'Invalid verification code format (6 digits required).' };
  }

  const record = otpStore.get(key);
  if (!record) {
    return { success: false, error: 'No active verification code found or code has expired. Please request a new code.' };
  }

  // Check expiration
  if (Date.now() > record.expiresAt) {
    otpStore.delete(key);
    return { success: false, error: 'Verification code has expired. Please request a new code.' };
  }

  // Check attempt limit
  if (record.attempts >= record.maxAttempts) {
    otpStore.delete(key);
    return { success: false, error: 'Maximum verification attempts exceeded. Please request a new code.' };
  }

  // Compute HMAC of entered code
  const candidateHash = hashOtp(key, cleanOtp);

  // Timing-safe comparison of SHA-256 HMAC strings
  const recordBuffer = Buffer.from(record.hash, 'utf8');
  const candidateBuffer = Buffer.from(candidateHash, 'utf8');

  let isMatch = false;
  if (recordBuffer.length === candidateBuffer.length) {
    isMatch = crypto.timingSafeEqual(recordBuffer, candidateBuffer);
  }

  if (!isMatch) {
    record.attempts += 1;
    const remaining = record.maxAttempts - record.attempts;
    if (remaining <= 0) {
      otpStore.delete(key);
      return { success: false, error: 'Too many incorrect attempts. Code invalidated. Please request a new code.' };
    }
    return { success: false, error: `Incorrect verification code. ${remaining} attempt(s) remaining.` };
  }

  // Code verified! Immediately delete to prevent replay attacks
  otpStore.delete(key);
  if (email) {
    otpStore.delete(`email:${String(email).trim().toLowerCase()}`);
  }

  return { success: true };
}

/**
 * Testing helper: Get active OTP for automated regression testing in test mode only
 */
export function __getTestOtpForRegression(phone, email) {
  if (process.env.NODE_ENV === 'production') return null;
  // This helper is strictly for automated local test harnesses where SMTP is mocked
  // Return the record existence check
  const key = normalizeIdentifier(phone, email);
  return otpStore.get(key);
}

/**
 * Testing helper to set known hash in test suites
 */
export function __setTestOtpForRegression(phone, email, testCode) {
  if (process.env.NODE_ENV === 'production') return;
  const key = normalizeIdentifier(phone, email);
  if (!key) return;
  otpStore.set(key, {
    hash: hashOtp(key, testCode),
    expiresAt: Date.now() + OTP_EXPIRY_MS,
    createdAt: Date.now(),
    attempts: 0,
    maxAttempts: MAX_VERIFY_ATTEMPTS
  });
}

