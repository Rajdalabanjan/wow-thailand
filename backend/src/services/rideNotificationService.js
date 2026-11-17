// ========================================================================
// WOW THAILAND: Customer Ride Notifications (SMS, WhatsApp, Email)
// Tells the customer when their cab is booked and when a driver is assigned.
//
// SMS and WhatsApp are sent through Twilio's REST API (no SDK needed).
// Email reuses the Gmail SMTP transporter from emailService.js.
// A channel that is not configured is skipped, and a failed channel never
// breaks the booking or the driver assignment. Each send is recorded in
// taxi_dispatch_events (event_type CUSTOMER_NOTIFIED) so admins can audit it.
//
// .env settings (see .env.example):
//   RIDE_NOTIFICATIONS_ENABLED=true                 master switch: nothing is sent without it
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN           required for SMS + WhatsApp
//   TWILIO_SMS_FROM or TWILIO_MESSAGING_SERVICE_SID required for SMS
//   TWILIO_WHATSAPP_FROM                            required for WhatsApp (e.g. whatsapp:+14155238886)
//   TWILIO_WHATSAPP_TEMPLATE_BOOKED                 optional approved template (Content SID)
//   TWILIO_WHATSAPP_TEMPLATE_DRIVER_ASSIGNED        optional approved template (Content SID)
//   PUBLIC_APP_URL                                  site address used in tracking links
// ========================================================================

import { query } from '../config/db.js';
import { decryptOtp } from '../utils/cryptoHelper.js';
import { getEmailTransporter } from './emailService.js';

export const RIDE_EVENTS = Object.freeze({
  BOOKED: 'BOOKED',
  DRIVER_ASSIGNED: 'DRIVER_ASSIGNED'
});

const TWILIO_TIMEOUT_MS = 10000;
const DEFAULT_COUNTRY_CODE = '66'; // Thailand, used only for local numbers like 0812345678
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const isTestEnv = () => process.env.NODE_ENV === 'test';

/**
 * Master switch. Messages reach real people, so they are only sent when
 * RIDE_NOTIFICATIONS_ENABLED=true is set explicitly (never by default, never in tests).
 */
export function notificationsEnabled() {
  return /^(1|true|yes|on)$/i.test(String(process.env.RIDE_NOTIFICATIONS_ENABLED || '').trim());
}

// Reserved domains (RFC 2606 / 6761) used for test data: never emailed
const RESERVED_EMAIL_DOMAIN = /@(?:[^@]+\.)?(?:example\.(?:com|net|org)|[^@]+\.(?:test|example|invalid|localhost))$/i;

// ------------------------------------------------------------------------
// Formatting helpers
// ------------------------------------------------------------------------

/**
 * Normalise a phone number to E.164 ("+66812345678"), or null if unusable.
 * Accepts the booking format "+66 081 234 5678": the leading 0 of the national
 * part is dropped, as Thai (and most) numbers require after the country code.
 */
export function toE164(rawPhone) {
  const raw = String(rawPhone || '').trim();
  if (!raw) return null;

  let digits;
  if (raw.startsWith('+')) {
    const [countryPart, ...nationalParts] = raw.slice(1).trim().split(/\s+/);
    const country = countryPart.replace(/\D/g, '');
    const national = nationalParts.join('').replace(/\D/g, '').replace(/^0+/, '');
    digits = nationalParts.length > 0 ? country + national : country;
  } else {
    const plain = raw.replace(/\D/g, '');
    if (plain.startsWith('00')) digits = plain.slice(2);
    else if (plain.startsWith('0')) digits = DEFAULT_COUNTRY_CODE + plain.slice(1);
    else digits = plain;
  }

  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

/**
 * "20 Nov 2026, 09:00".
 * pickup_datetime is stored as plain local (Thai) wall-clock time and the DB pool
 * reads it as UTC, so the UTC getters return exactly the time the customer booked.
 */
export function formatPickupTime(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(`${String(value).replace(' ', 'T')}Z`);
  if (Number.isNaN(d.getTime())) return String(value);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function trackingLink(dispatchId) {
  const base = (
    process.env.PUBLIC_APP_URL ||
    process.env.CLIENT_ORIGIN ||
    (process.env.CORS_ORIGIN || '').split(',')[0] ||
    'http://localhost:5173'
  ).trim().replace(/\/+$/, '');
  return `${base}/cabs?ride=${encodeURIComponent(dispatchId)}`;
}

function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ------------------------------------------------------------------------
// Message content
// ------------------------------------------------------------------------

/**
 * Build the SMS, WhatsApp and email content for a ride event.
 * `ride` is the row from loadRideContext() plus `otp`.
 */
export function buildRideMessages(event, ride, { reassigned = false } = {}) {
  const link = trackingLink(ride.id);
  const pickup = formatPickupTime(ride.pickup_datetime);
  const codeSentence = ride.otp ? `Start code ${ride.otp} - give it to your driver.` : '';
  const firstName = String(ride.customer_name || '').trim().split(/\s+/)[0] || 'there';

  if (event === RIDE_EVENTS.BOOKED) {
    const sms = [
      `WOW Thailand: Booking ${ride.booking_id} confirmed.`,
      `Pickup ${pickup} at ${ride.pickup_address}.`,
      codeSentence,
      'We will message you when your driver is assigned.',
      `Track: ${link}`
    ].filter(Boolean).join(' ');

    const whatsapp = [
      `Hi ${firstName}, your WOW Thailand ride is booked ✅`,
      '',
      `Booking: ${ride.booking_id}`,
      `Pickup: ${pickup}`,
      `From: ${ride.pickup_address}`,
      `To: ${ride.dropoff_address}`,
      ride.otp ? `Start code: *${ride.otp}* (give it to your driver)` : null,
      '',
      "We'll message you again as soon as a driver is assigned.",
      `Track your ride: ${link}`
    ].filter(line => line !== null).join('\n');

    const rows = [
      ['Booking', ride.booking_id],
      ['Pickup time', pickup],
      ['From', ride.pickup_address],
      ['To', ride.dropoff_address],
      ['Group', `${ride.passenger_count} passengers · ${ride.luggage_count} bags`],
      ride.otp ? ['Start code', ride.otp] : null
    ].filter(Boolean);

    return {
      sms,
      whatsapp,
      emailSubject: `Your WOW Thailand ride is booked — ${ride.booking_id}`,
      emailHeading: 'Your ride is booked',
      emailIntro: "We'll email you again as soon as a driver is assigned. Give the start code to your driver when you meet.",
      emailRows: rows,
      link,
      // Variable order for the approved WhatsApp template (TWILIO_WHATSAPP_TEMPLATE_BOOKED)
      templateVariables: {
        1: firstName,
        2: ride.booking_id,
        3: pickup,
        4: ride.pickup_address,
        5: ride.otp || '-',
        6: link
      }
    };
  }

  if (event === RIDE_EVENTS.DRIVER_ASSIGNED) {
    const car = [ride.vehicle_color, ride.vehicle_brand, ride.vehicle_model].filter(Boolean).join(' ') || 'your car';
    const plate = ride.vehicle_plate || 'to be confirmed';
    const opener = reassigned ? 'Your driver has changed.' : 'Your driver is assigned.';

    const sms = [
      `WOW Thailand: ${opener} ${ride.driver_name} (${ride.driver_phone}).`,
      `Car: ${car}, plate ${plate}.`,
      `Pickup ${pickup}.`,
      codeSentence,
      `Track: ${link}`
    ].filter(Boolean).join(' ');

    const whatsapp = [
      `Hi ${firstName}, ${reassigned ? 'your driver has changed 🔄' : 'your driver is assigned 🚕'}`,
      '',
      `Driver: ${ride.driver_name}`,
      `Phone: ${ride.driver_phone}`,
      `Car: ${car}`,
      `Plate: ${plate}`,
      `Pickup: ${pickup}`,
      ride.otp ? `Start code: *${ride.otp}*` : null,
      '',
      `Track your ride: ${link}`
    ].filter(line => line !== null).join('\n');

    const rows = [
      ['Driver', ride.driver_name],
      ['Driver phone', ride.driver_phone],
      ['Car', car],
      ['Number plate', plate],
      ['Pickup time', pickup],
      ['From', ride.pickup_address],
      ride.otp ? ['Start code', ride.otp] : null
    ].filter(Boolean);

    return {
      sms,
      whatsapp,
      emailSubject: `${reassigned ? 'Driver changed' : 'Driver assigned'}: ${ride.driver_name} — ${ride.booking_id}`,
      emailHeading: reassigned ? 'Your driver has changed' : 'Your driver is assigned',
      emailIntro: 'Look for this car and number plate at pickup. Give the start code to your driver when you meet.',
      emailRows: rows,
      link,
      // Variable order for the approved WhatsApp template (TWILIO_WHATSAPP_TEMPLATE_DRIVER_ASSIGNED)
      templateVariables: {
        1: ride.driver_name,
        2: ride.driver_phone,
        3: car,
        4: plate,
        5: pickup,
        6: link
      }
    };
  }

  throw new Error(`Unknown ride notification event: ${event}`);
}

function renderEmailHtml(messages) {
  const rows = messages.emailRows.map(([label, value]) => `
        <tr>
          <td style="padding:6px 12px 6px 0;color:#64748B;font-size:13px;white-space:nowrap;">${escapeHtml(label)}</td>
          <td style="padding:6px 0;color:#0F172A;font-size:14px;font-weight:600;">${escapeHtml(value)}</td>
        </tr>`).join('');

  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#F8FAFC;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
    <div style="background:#0B132B;color:#D4AF37;padding:16px 20px;font-weight:bold;font-size:16px;">WOW THAILAND Cabs</div>
    <div style="padding:20px;">
      <h2 style="margin:0 0 8px;color:#0F172A;font-size:20px;">${escapeHtml(messages.emailHeading)}</h2>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;">${escapeHtml(messages.emailIntro)}</p>
      <table role="presentation" style="border-collapse:collapse;width:100%;">${rows}
      </table>
      <p style="margin:20px 0 0;">
        <a href="${escapeHtml(messages.link)}" style="display:inline-block;background:#0B132B;color:#D4AF37;text-decoration:none;font-weight:bold;padding:10px 18px;border-radius:8px;">Track your ride</a>
      </p>
    </div>
  </div>
</body></html>`;
}

function renderEmailText(messages) {
  return [
    messages.emailHeading,
    '',
    messages.emailIntro,
    '',
    ...messages.emailRows.map(([label, value]) => `${label}: ${value}`),
    '',
    `Track your ride: ${messages.link}`
  ].join('\n');
}

// ------------------------------------------------------------------------
// Channels
// ------------------------------------------------------------------------

const skipped = reason => ({ status: 'skipped', reason });

function twilioConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
}

async function twilioSend(params) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(TWILIO_TIMEOUT_MS)
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Twilio ${res.status}${body.code ? ` (code ${body.code})` : ''}: ${body.message || 'request failed'}`);
  }
  return body.sid;
}

export async function sendSms(to, text) {
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const from = process.env.TWILIO_SMS_FROM;
  if (!twilioConfigured() || (!messagingServiceSid && !from)) return skipped('SMS not configured');

  const params = { To: to, Body: text };
  if (messagingServiceSid) params.MessagingServiceSid = messagingServiceSid;
  else params.From = from;
  return { status: 'sent', id: await twilioSend(params) };
}

export async function sendWhatsApp(to, text, templateSid, templateVariables) {
  const rawFrom = process.env.TWILIO_WHATSAPP_FROM;
  if (!twilioConfigured() || !rawFrom) return skipped('WhatsApp not configured');

  const params = {
    From: rawFrom.startsWith('whatsapp:') ? rawFrom : `whatsapp:${rawFrom}`,
    To: `whatsapp:${to}`
  };
  // WhatsApp only allows free text inside a 24h chat window (or in the Twilio sandbox).
  // Business-initiated messages in production need an approved template.
  if (templateSid) {
    params.ContentSid = templateSid;
    params.ContentVariables = JSON.stringify(templateVariables || {});
  } else {
    params.Body = text;
  }
  return { status: 'sent', id: await twilioSend(params) };
}

export async function sendEmail(to, subject, html, text) {
  const address = String(to || '').trim();
  if (!address.includes('@') || address.toLowerCase() === 'guest@wowthailand.com') return skipped('no customer email');
  if (RESERVED_EMAIL_DOMAIN.test(address)) return skipped('reserved test address');
  const mailer = getEmailTransporter();
  if (!mailer) return skipped('email not configured');

  const info = await mailer.sendMail({
    from: process.env.EMAIL_FROM || `WOW THAILAND <${process.env.SMTP_USER}>`,
    to: address,
    subject,
    html,
    text
  });
  return { status: 'sent', id: info.messageId };
}

/**
 * Which channels can reach this customer with the current configuration.
 * Lets the website say truthfully where updates will arrive.
 */
export function getCustomerUpdateChannels(phone, email) {
  const hasPhone = Boolean(toE164(phone));
  const address = String(email || '').trim();
  const hasEmail = address.includes('@') && address.toLowerCase() !== 'guest@wowthailand.com' && !RESERVED_EMAIL_DOMAIN.test(address);
  return getConfiguredChannels().filter(channel => (channel === 'email' ? hasEmail : hasPhone));
}

/**
 * Channels switched on and configured on this server, regardless of customer.
 */
export function getConfiguredChannels() {
  if (!notificationsEnabled()) return [];
  const channels = [];
  if (twilioConfigured() && (process.env.TWILIO_MESSAGING_SERVICE_SID || process.env.TWILIO_SMS_FROM)) channels.push('sms');
  if (twilioConfigured() && process.env.TWILIO_WHATSAPP_FROM) channels.push('whatsapp');
  if (getEmailTransporter()) channels.push('email');
  return channels;
}

async function safely(send) {
  try {
    return await send();
  } catch (err) {
    return { status: 'failed', error: err.message };
  }
}

// ------------------------------------------------------------------------
// Orchestration
// ------------------------------------------------------------------------

async function loadRideContext(dispatchId) {
  const rows = await query(
    `SELECT d.id, d.booking_id, d.ride_status, d.pickup_address, d.dropoff_address, d.pickup_datetime,
            d.passenger_count, d.luggage_count, d.vehicle_category, d.ride_otp_encrypted,
            d.vehicle_plate AS dispatch_vehicle_plate,
            b.customer_name, b.customer_phone, b.customer_email,
            drv.full_name AS driver_name, drv.phone AS driver_phone,
            v.brand AS vehicle_brand, v.model AS vehicle_model, v.color AS vehicle_color, v.plate_number AS vehicle_plate
     FROM taxi_dispatches d
     JOIN bookings b ON b.id = d.booking_id
     LEFT JOIN drivers drv ON drv.id = d.driver_id
     LEFT JOIN cab_vehicles v ON v.id = d.vehicle_id
     WHERE d.id = ?
     LIMIT 1`,
    [dispatchId]
  );
  const ride = rows[0];
  if (!ride) return null;
  ride.vehicle_plate = ride.vehicle_plate || ride.dispatch_vehicle_plate;
  return ride;
}

async function recordNotification(ride, event, results) {
  const attempted = Object.values(results).some(r => r.status !== 'skipped');
  if (!attempted) return;
  try {
    await query(
      `INSERT INTO taxi_dispatch_events (
        id, dispatch_id, event_type, old_status, new_status, actor_type, actor_id, metadata_json
      ) VALUES (?, ?, 'CUSTOMER_NOTIFIED', NULL, ?, 'SYSTEM', NULL, ?)`,
      [
        `evt_${Date.now()}_ntf_${Math.floor(Math.random() * 9000 + 1000)}`,
        ride.id,
        ride.ride_status,
        JSON.stringify({ event, ...results })
      ]
    );
  } catch (err) {
    // The ride was deleted while messages were being sent; nothing left to log against
    if (err.code === 'ER_NO_REFERENCED_ROW_2') return;
    throw err;
  }
}

/**
 * Send SMS, WhatsApp and email to the customer for a ride event.
 * Returns { sms, whatsapp, email } with status 'sent' | 'skipped' | 'failed' each.
 * options.rideOtp: plain start code (otherwise decrypted from the dispatch)
 * options.reassigned: true when a different driver replaced the previous one
 */
export async function notifyCustomerAboutRide(dispatchId, event, options = {}) {
  if (!notificationsEnabled()) return null;
  const ride = await loadRideContext(dispatchId);
  if (!ride) return null;
  if (event === RIDE_EVENTS.DRIVER_ASSIGNED && !ride.driver_name) return null;

  ride.otp = options.rideOtp || decryptOtp(ride.ride_otp_encrypted) || null;
  const messages = buildRideMessages(event, ride, options);
  const phone = toE164(ride.customer_phone);
  const templateSid = event === RIDE_EVENTS.BOOKED
    ? process.env.TWILIO_WHATSAPP_TEMPLATE_BOOKED
    : process.env.TWILIO_WHATSAPP_TEMPLATE_DRIVER_ASSIGNED;

  const [sms, whatsapp, email] = await Promise.all([
    phone ? safely(() => sendSms(phone, messages.sms)) : skipped('no valid customer phone'),
    phone ? safely(() => sendWhatsApp(phone, messages.whatsapp, templateSid, messages.templateVariables)) : skipped('no valid customer phone'),
    safely(() => sendEmail(ride.customer_email, messages.emailSubject, renderEmailHtml(messages), renderEmailText(messages)))
  ]);
  const results = { sms, whatsapp, email };

  await recordNotification(ride, event, results);

  if (!isTestEnv()) {
    const summary = Object.entries(results).map(([ch, r]) => `${ch}=${r.status}${r.error ? ` (${r.error})` : ''}`).join(', ');
    console.log(`[RideNotify] ${event} for ${ride.id} -> ${summary}`);
  }
  return results;
}

/**
 * Fire-and-forget version for controllers: never throws and never delays the API response.
 */
export function queueRideNotification(dispatchId, event, options = {}) {
  notifyCustomerAboutRide(dispatchId, event, options).catch(err => {
    if (!isTestEnv()) console.warn(`[RideNotify] ${event} for ${dispatchId} failed:`, err.message);
  });
}
