// Finds the account a password-reset request is for.
import { query } from '../config/db.js';

const digitsOf = (value) => String(value || '').replace(/\D/g, '');

// Looks like a phone number: digits with optional + ( ) - . and spaces
const PHONE_LIKE = /^\+?[\d\s().-]+$/;

/**
 * Does the stored phone number match what the person typed?
 * Numbers are stored formatted with the country code ("+66 81 234 5678"), while people
 * type them in many ways: "0812345678", "812345678", "+66812345678", "66 81 234 5678".
 */
function phoneMatches(storedPhone, typedDigits, typedLocal) {
  const stored = String(storedPhone || '').trim();
  const storedDigits = digitsOf(stored);
  if (!storedDigits) return false;

  // The full number including the country code
  if (storedDigits === typedDigits) return true;

  // "+CC rest": compare the national part with the local number typed (trunk 0 removed)
  const spaced = stored.match(/^\+(\d{1,3})\s+(.+)$/);
  if (spaced) {
    return digitsOf(spaced[2]).replace(/^0+/, '') === typedLocal;
  }

  // "+66812345678" with no spaces: the local number plus a 1-3 digit country code
  if (stored.startsWith('+')) {
    const extra = storedDigits.length - typedLocal.length;
    return extra >= 1 && extra <= 3 && storedDigits.endsWith(typedLocal);
  }
  return false;
}

/**
 * Returns { account, loginId } for the one account matching the identifier, or null.
 * - Username, email or phone typed exactly as stored: matched as before.
 * - Otherwise a phone number typed in another common format is matched on its digits.
 *   If that matches more than one account, nothing is matched (never guess an account).
 * loginId is what the person can sign in with afterwards (the sign-in form looks up
 * username, email or the phone number exactly as stored).
 */
export async function findAccountForReset(identifier) {
  const id = String(identifier || '').trim();
  if (!id) return null;

  const [exact] = await query(
    'SELECT id, username, email, phone FROM users WHERE username = ? OR email = ? OR phone = ? LIMIT 1',
    [id, id, id]
  );
  if (exact) return { account: exact, loginId: id };

  if (!PHONE_LIKE.test(id)) return null;
  const typedDigits = digitsOf(id);
  const typedLocal = typedDigits.replace(/^0+/, '');
  if (typedLocal.length < 8 || typedDigits.length > 15) return null;

  // Narrow down in SQL by the last 8 digits, then check each candidate precisely
  const tail = typedLocal.slice(-8);
  const candidates = await query(
    `SELECT id, username, email, phone FROM users
     WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', ''), '(', ''), ')', ''), '.', '') LIKE ?`,
    [`%${tail}`]
  );
  const matches = candidates.filter((row) => phoneMatches(row.phone, typedDigits, typedLocal));
  if (matches.length !== 1) return null;
  return { account: matches[0], loginId: matches[0].phone };
}
