// ========================================================================
// WOW THAILAND: Sign-in protection
// Slows down password / code guessing and recognises requests made on this
// computer, where the development-only shortcuts (shared demo passwords,
// test reset code) are allowed.
// ========================================================================

const WINDOW_MS = 15 * 60 * 1000; // failures are counted over 15 minutes
const LOCK_MS = 15 * 60 * 1000;   // and a limit that is hit blocks for 15 minutes
const MAX_TRACKED = 100000;

const attempts = new Map(); // key -> { count, firstAt, lockedUntil }

function isLoopback(address) {
  const a = String(address || '').trim().replace(/^\[|\]$/g, '');
  return a === '::1' || a === 'localhost' || a.startsWith('127.') || a.startsWith('::ffff:127.');
}

/**
 * True only for a request made on this computer: the connection comes from loopback and every
 * proxy hop in between (the Vite dev server forwards with X-Forwarded-For) reports loopback too.
 * Always false when NODE_ENV=production.
 */
export function isLocalRequest(req) {
  if (process.env.NODE_ENV === 'production') return false;
  if (!isLoopback(req.socket?.remoteAddress)) return false;
  if (req.headers.forwarded) return false;
  const hops = [req.headers['x-forwarded-for'], req.headers['x-real-ip']]
    .filter(Boolean)
    .join(',')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  return hops.every(isLoopback);
}

/** The caller's address. Forwarded headers are believed only when they come from a proxy on this machine. */
export function clientIp(req) {
  const socketIp = req.socket?.remoteAddress || 'unknown';
  if (!isLoopback(socketIp)) return socketIp;
  // The nearest proxy appends the real client last, so earlier (client-supplied) entries are ignored
  const hops = String(req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean);
  return hops.length ? hops[hops.length - 1] : (req.headers['x-real-ip'] || socketIp);
}

/** Shared demo passwords and the test reset code work only on this computer, and only while enabled in .env. */
export function devShortcutsAllowed(req) {
  return process.env.ALLOW_DEMO_PASSWORDS === 'true' && isLocalRequest(req);
}

function current(key, now) {
  const entry = attempts.get(key);
  if (entry && entry.lockedUntil <= now && now - entry.firstAt > WINDOW_MS) {
    attempts.delete(key);
    return null;
  }
  return entry || null;
}

/** Seconds the caller must wait before trying again (0 = allowed now). */
export function retryAfter(limits) {
  const now = Date.now();
  let wait = 0;
  for (const { key } of limits) {
    const entry = current(key, now);
    if (entry && entry.lockedUntil > now) {
      wait = Math.max(wait, Math.ceil((entry.lockedUntil - now) / 1000));
    }
  }
  return wait;
}

/** Counts one attempt against every limit; a limit that reaches its maximum locks for 15 minutes. */
export function noteAttempt(limits) {
  const now = Date.now();
  if (attempts.size > MAX_TRACKED) pruneExpired(now);
  for (const { key, max } of limits) {
    let entry = current(key, now);
    if (!entry) {
      entry = { count: 0, firstAt: now, lockedUntil: 0 };
      attempts.set(key, entry);
    }
    entry.count += 1;
    if (entry.count >= max) {
      entry.lockedUntil = now + LOCK_MS;
      entry.count = 0;
      entry.firstAt = now;
    }
  }
}

export function clearAttempts(limits) {
  for (const { key } of limits) attempts.delete(key);
}

/** 429 body with a human-readable wait time. */
export function tooManyAttempts(res, seconds) {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  res.set('Retry-After', String(seconds));
  return res.status(429).json({
    success: false,
    error: `Too many attempts. For your security, please wait ${minutes} minute${minutes === 1 ? '' : 's'} and try again.`,
    retry_after: seconds
  });
}

/**
 * Sign-in limits: 5 wrong passwords per account from one address, 20 per address overall,
 * and 50 per account from all addresses together (stops spread-out guessing).
 */
export function loginLimits(req, identifier) {
  const ip = clientIp(req);
  const id = String(identifier || '').trim().toLowerCase();
  return [
    { key: `login:acct-ip:${id}|${ip}`, max: 5 },
    { key: `login:ip:${ip}`, max: 20 },
    { key: `login:acct:${id}`, max: 50 }
  ];
}

function pruneExpired(now) {
  for (const [key, entry] of attempts) {
    if (entry.lockedUntil <= now && now - entry.firstAt > WINDOW_MS) attempts.delete(key);
  }
  if (attempts.size > MAX_TRACKED) attempts.clear();
}

setInterval(() => pruneExpired(Date.now()), 10 * 60 * 1000).unref();
