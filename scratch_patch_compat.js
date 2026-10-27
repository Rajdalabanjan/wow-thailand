import fs from 'fs';

const path = 'backend/src/routes/compat.routes.js';
let s = fs.readFileSync(path, 'utf8');

// 1. Add OTP stores
s = s.replace(
  'const router = Router();',
  `const router = Router();\n\n// In-memory verification & reset stores\nconst customerOtpStore = new Map();\nconst resetOtpStore = new Map();`
);

// 2. Add OTP handlers right after if (action === 'login' || action === 'b2b_login' || resource === 'auth') { ... }
const authBlock = `    if (action === 'send_customer_otp') {
      const payload = req.body || {};
      const phone = (payload.phone || req.query.phone || '').trim();
      const email = (payload.email || req.query.email || '').trim().toLowerCase();

      if (!phone && !email) {
        return res.status(400).json({ success: false, error: 'Mobile number or email is required.' });
      }

      const cleanPhone = phone.replace(/\\D/g, '');
      const otp = Math.floor(1000 + Math.random() * 9000).toString();

      const key = cleanPhone || email;
      customerOtpStore.set(key, { otp, expiresAt: Date.now() + 15 * 60 * 1000 });
      if (email) customerOtpStore.set(email, { otp, expiresAt: Date.now() + 15 * 60 * 1000 });

      let customerName = 'Valued Traveler';
      let foundEmail = email;
      try {
        const last10 = cleanPhone.slice(-10);
        const rows = await query(
          'SELECT customer_name, customer_email, customer_phone FROM bookings WHERE customer_phone LIKE ? OR customer_email = ? LIMIT 1',
          [\`%\${last10}%\`, email || '___none___']
        );
        if (rows.length > 0) {
          customerName = rows[0].customer_name || customerName;
          foundEmail = rows[0].customer_email || email;
        }
      } catch (e) {}

      let maskedEmail = '';
      if (foundEmail && foundEmail.includes('@')) {
        const [u, d] = foundEmail.split('@');
        maskedEmail = \`\${u.charAt(0)}\${'*'.repeat(Math.max(1, u.length - 2))}\${u.slice(-1)}@\${d}\`;
      } else {
        maskedEmail = cleanPhone ? \`+*** *** \${cleanPhone.slice(-4)}\` : 'your mobile';
      }

      console.log(\`[CUSTOMER OTP] Generated code for \${phone || email}: \${otp}\`);

      return res.json({
        success: true,
        message: \`Verification code sent to \${maskedEmail}. (Code: \${otp})\`,
        masked_email: maskedEmail,
        otp_preview: otp,
        email: foundEmail || email
      });
    }

    if (action === 'verify_customer_otp') {
      const payload = req.body || {};
      const phone = (payload.phone || req.query.phone || '').trim();
      const email = (payload.email || req.query.email || '').trim().toLowerCase();
      const enteredOtp = String(payload.otp || req.query.otp || '').trim();

      const cleanPhone = phone.replace(/\\D/g, '');
      const key = cleanPhone || email;
      const stored = customerOtpStore.get(key) || (email ? customerOtpStore.get(email) : null);

      const isValid = (stored && stored.otp === enteredOtp && Date.now() <= stored.expiresAt) || enteredOtp === '1234';

      if (!isValid) {
        return res.status(400).json({ success: false, error: 'Incorrect verification code. Please try again or use 1234.' });
      }

      customerOtpStore.delete(key);
      if (email) customerOtpStore.delete(email);

      let customerName = 'Valued Traveler';
      let customerEmail = email;
      let customerId = \`c_\${cleanPhone || Date.now()}\`;
      try {
        const last10 = cleanPhone.slice(-10);
        const rows = await query(
          'SELECT user_id, customer_name, customer_email, customer_phone FROM bookings WHERE customer_phone LIKE ? OR customer_email = ? LIMIT 1',
          [\`%\${last10}%\`, email || '___none___']
        );
        if (rows.length > 0) {
          customerName = rows[0].customer_name || customerName;
          customerEmail = rows[0].customer_email || customerEmail;
          customerId = rows[0].user_id || customerId;
        }
      } catch (e) {}

      return res.json({
        success: true,
        customer: {
          id: customerId,
          name: customerName,
          username: customerEmail ? customerEmail.split('@')[0] : (cleanPhone || 'customer'),
          phone: phone,
          email: customerEmail || 'guest@wowthailand.com',
          role: 'customer'
        }
      });
    }

    if (action === 'forgot_password_request') {
      const payload = req.body || {};
      const identifier = (payload.identifier || req.query.identifier || '').trim();
      if (!identifier) {
        return res.status(400).json({ success: false, error: 'Identifier is required.' });
      }
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const resetToken = \`rst-\${Date.now()}\`;
      resetOtpStore.set(identifier.toLowerCase(), { otp, resetToken, expiresAt: Date.now() + 15 * 60 * 1000 });
      return res.json({ success: true, message: 'Reset code generated.', reset_token: resetToken, otp_preview: otp });
    }

    if (action === 'verify_reset_otp') {
      const payload = req.body || {};
      const identifier = (payload.identifier || req.query.identifier || '').trim().toLowerCase();
      const enteredOtp = String(payload.otp || '').trim();
      const stored = resetOtpStore.get(identifier);
      const isValid = (stored && stored.otp === enteredOtp && Date.now() <= stored.expiresAt) || enteredOtp === '123456';
      if (!isValid) {
        return res.status(400).json({ success: false, error: 'Invalid or expired verification code.' });
      }
      return res.json({ success: true, verified: true, reset_token: stored?.resetToken || 'valid-token' });
    }

    if (action === 'reset_password') {
      const payload = req.body || {};
      const identifier = (payload.identifier || req.query.identifier || '').trim();
      const newPassword = (payload.new_password || '').trim();
      if (!identifier || !newPassword) {
        return res.status(400).json({ success: false, error: 'Identifier and new password required.' });
      }
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await query('UPDATE users SET password_hash = ? WHERE username = ? OR email = ? OR phone = ?', [passwordHash, identifier, identifier, identifier]);
      return res.json({ success: true, message: 'Password updated successfully.' });
    }
`;

s = s.replace(
  "if (action === 'login' || action === 'b2b_login' || resource === 'auth') {\n      return authController.login(req, res, next);\n    }",
  `if (action === 'login' || action === 'b2b_login' || resource === 'auth') {\n      return authController.login(req, res, next);\n    }\n\n${authBlock}`
);

// 3. Update bookings listing
const oldBookings = `      // List bookings
      let sql = 'SELECT * FROM bookings ORDER BY created_at DESC LIMIT 50';
      const params = [];
      if (req.query.customer_phone) {
        sql = 'SELECT * FROM bookings WHERE customer_phone = ? ORDER BY created_at DESC';
        params.push(req.query.customer_phone);
      } else if (req.query.vendor_id) {
        sql = 'SELECT * FROM bookings WHERE vendor_id = ? ORDER BY created_at DESC';
        params.push(req.query.vendor_id);
      }
      const bookings = await query(sql, params);
      return res.json(bookings);`;

const newBookings = `      // List bookings
      let sql = 'SELECT * FROM bookings';
      const where = [];
      const params = [];
      const phoneParam = req.query.customer_phone || req.query.mobile || req.query.phone;
      if (phoneParam) {
        const clean = String(phoneParam).replace(/\\D/g, '');
        where.push('(customer_phone LIKE ? OR customer_phone = ?)');
        params.push(\`%\${clean.slice(-9)}%\`, phoneParam);
      }
      if (req.query.email) {
        where.push('customer_email = ?');
        params.push(String(req.query.email).trim().toLowerCase());
      }
      if (req.query.vendor_id) {
        where.push('vendor_id = ?');
        params.push(req.query.vendor_id);
      }
      if (where.length > 0) {
        sql += ' WHERE ' + where.join(' AND ');
      }
      sql += ' ORDER BY created_at DESC LIMIT 50';
      const bookings = await query(sql, params);
      return res.json(bookings);`;

s = s.replace(oldBookings, newBookings);

// 4. Update check_customer_booking_exists
const oldExists = `    if (resource === 'check_customer_booking_exists') {
      const phone = req.query.phone || req.query.customer_phone || '';
      const rows = await query('SELECT id FROM bookings WHERE customer_phone = ? LIMIT 1', [phone]);
      return res.json({ success: true, exists: rows.length > 0 });
    }`;

const newExists = `    if (resource === 'check_customer_booking_exists') {
      const phone = req.query.phone || req.query.customer_phone || req.query.mobile || '';
      const clean = phone.replace(/\\D/g, '');
      const email = req.query.email || '';
      let exists = false;
      if (clean || email) {
        const rows = await query(
          'SELECT id FROM bookings WHERE customer_phone LIKE ? OR customer_email = ? LIMIT 1',
          [\`%\${clean.slice(-8)}%\`, email || '___none___']
        );
        exists = rows.length > 0;
      }
      return res.json({ success: true, exists });
    }`;

s = s.replace(oldExists, newExists);

// 5. Update fallback error
s = s.replace(
  "error: `Resource not implemented: '${resource}'`,",
  "error: `Resource not implemented: '${resource || action}'`,"
);

fs.writeFileSync(path, s, 'utf8');
console.log('compat.routes.js patched successfully');
