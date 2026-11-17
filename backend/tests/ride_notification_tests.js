// ========================================================================
// WOW THAILAND: Customer Ride Notification Tests (SMS, WhatsApp, Email)
// Twilio is never called for real: global fetch is replaced with a stub.
// ========================================================================

import { query, default as pool } from '../src/config/db.js';
import { runCabMigrations } from '../src/config/migrate_cabs.js';
import { encryptOtp } from '../src/utils/cryptoHelper.js';
import {
  RIDE_EVENTS,
  toE164,
  formatPickupTime,
  buildRideMessages,
  sendSms,
  sendWhatsApp,
  sendEmail,
  getCustomerUpdateChannels,
  notifyCustomerAboutRide
} from '../src/services/rideNotificationService.js';

process.env.NODE_ENV = 'test';

const TWILIO_KEYS = [
  'RIDE_NOTIFICATIONS_ENABLED', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_SMS_FROM', 'TWILIO_MESSAGING_SERVICE_SID',
  'TWILIO_WHATSAPP_FROM', 'TWILIO_WHATSAPP_TEMPLATE_BOOKED', 'TWILIO_WHATSAPP_TEMPLATE_DRIVER_ASSIGNED', 'PUBLIC_APP_URL'
];
const savedEnv = Object.fromEntries(TWILIO_KEYS.map(k => [k, process.env[k]]));
const realFetch = globalThis.fetch;

let passed = 0;
function check(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ PASS: ${message}`);
  passed++;
}

// Captures Twilio requests and answers like Twilio would
let twilioCalls = [];
let twilioResponse = { status: 201, body: { sid: 'SM_test_123' } };
function stubTwilio() {
  twilioCalls = [];
  globalThis.fetch = async (url, init) => {
    twilioCalls.push({ url: String(url), headers: init.headers, params: Object.fromEntries(new URLSearchParams(init.body)) });
    return new Response(JSON.stringify(twilioResponse.body), { status: twilioResponse.status, headers: { 'Content-Type': 'application/json' } });
  };
}

function configureTwilio({ withTemplates = false, enabled = true } = {}) {
  for (const k of TWILIO_KEYS) delete process.env[k];
  if (enabled) process.env.RIDE_NOTIFICATIONS_ENABLED = 'true';
  process.env.TWILIO_ACCOUNT_SID = 'ACtest000';
  process.env.TWILIO_AUTH_TOKEN = 'token000';
  process.env.TWILIO_SMS_FROM = '+15005550006';
  process.env.TWILIO_WHATSAPP_FROM = '+14155238886';
  process.env.PUBLIC_APP_URL = 'https://wowthailand.example/';
  if (withTemplates) {
    process.env.TWILIO_WHATSAPP_TEMPLATE_BOOKED = 'HXbooked';
    process.env.TWILIO_WHATSAPP_TEMPLATE_DRIVER_ASSIGNED = 'HXassigned';
  }
}

async function run() {
  console.log('\n============================================================');
  console.log('📱 WOW THAILAND: CUSTOMER RIDE NOTIFICATION TESTS');
  console.log('============================================================\n');

  await runCabMigrations();

  // ----------------------------------------------------------------
  console.log('--- 1. Phone numbers & pickup time formatting ---');
  check(toE164('+66 081 234 5678') === '+66812345678', 'Booking format "+66 081 234 5678" -> +66812345678 (leading 0 dropped)');
  check(toE164('+66 812345678') === '+66812345678', '"+66 812345678" -> +66812345678');
  check(toE164('+66812345678') === '+66812345678', 'Already-E.164 number is kept');
  check(toE164('+1 (555) 123-4567') === '+15551234567', 'US number with punctuation cleaned');
  check(toE164('0812345678') === '+66812345678', 'Local Thai number gets +66');
  check(toE164('abc') === null && toE164('') === null, 'Unusable numbers return null');
  check(formatPickupTime('2026-11-20 09:05:00') === '20 Nov 2026, 09:05', 'Pickup string keeps the booked wall-clock time');
  check(formatPickupTime(new Date('2026-11-20T09:05:00.000Z')) === '20 Nov 2026, 09:05', 'Pickup Date (as read from MySQL) keeps the booked time');

  // ----------------------------------------------------------------
  console.log('\n--- 2. Message content ---');
  configureTwilio();
  const sampleRide = {
    id: 'dsp_sample', booking_id: 'TH-BKG-1', pickup_datetime: '2026-11-20 09:00:00',
    pickup_address: 'Suvarnabhumi Airport (BKK)', dropoff_address: 'Sukhumvit Soi 11',
    passenger_count: 4, luggage_count: 3, customer_name: 'Ananda Test', otp: '4821',
    driver_name: 'Somchai Jaidee', driver_phone: '+66 83 456 7890',
    vehicle_color: 'Attitude Black', vehicle_brand: 'Toyota', vehicle_model: 'Fortuner', vehicle_plate: '2ขค 9988'
  };
  const booked = buildRideMessages(RIDE_EVENTS.BOOKED, sampleRide);
  check(booked.sms.includes('TH-BKG-1') && booked.sms.includes('20 Nov 2026, 09:00') && booked.sms.includes('4821'), 'Booked SMS has booking ref, pickup time and start code');
  check(booked.sms.includes('https://wowthailand.example/cabs?ride=dsp_sample'), 'Booked SMS has the tracking link (trailing slash trimmed)');
  check(booked.whatsapp.startsWith('Hi Ananda') && booked.whatsapp.includes('*4821*'), 'Booked WhatsApp greets by first name and highlights the code');

  const assigned = buildRideMessages(RIDE_EVENTS.DRIVER_ASSIGNED, sampleRide);
  check(
    assigned.sms.includes('Somchai Jaidee') && assigned.sms.includes('+66 83 456 7890') &&
    assigned.sms.includes('Attitude Black Toyota Fortuner') && assigned.sms.includes('2ขค 9988'),
    'Driver SMS has driver name, phone, car colour + model and plate'
  );
  check(assigned.templateVariables[1] === 'Somchai Jaidee' && assigned.templateVariables[4] === '2ขค 9988', 'Template variables follow the documented order');
  const changed = buildRideMessages(RIDE_EVENTS.DRIVER_ASSIGNED, sampleRide, { reassigned: true });
  check(changed.sms.includes('Your driver has changed'), 'Reassignment says the driver has changed');
  const noCode = buildRideMessages(RIDE_EVENTS.BOOKED, { ...sampleRide, otp: null });
  check(!noCode.sms.includes('Start code') && !noCode.whatsapp.includes('Start code'), 'Missing start code is left out cleanly');

  // ----------------------------------------------------------------
  console.log('\n--- 3. Twilio requests ---');
  for (const k of TWILIO_KEYS) delete process.env[k];
  stubTwilio();
  const notConfigured = await sendSms('+66812345678', 'hello');
  check(notConfigured.status === 'skipped' && twilioCalls.length === 0, 'SMS is skipped (no request) when Twilio is not configured');

  configureTwilio();
  stubTwilio();
  const smsResult = await sendSms('+66812345678', 'hello sms');
  const smsCall = twilioCalls[0];
  check(smsResult.status === 'sent' && smsResult.id === 'SM_test_123', 'SMS reports sent with the Twilio message id');
  check(smsCall.url === 'https://api.twilio.com/2010-04-01/Accounts/ACtest000/Messages.json', 'SMS posts to the account Messages endpoint');
  check(smsCall.headers.Authorization === `Basic ${Buffer.from('ACtest000:token000').toString('base64')}`, 'SMS uses Basic auth with SID and token');
  check(smsCall.params.To === '+66812345678' && smsCall.params.From === '+15005550006' && smsCall.params.Body === 'hello sms', 'SMS sends To, From and Body');

  process.env.TWILIO_MESSAGING_SERVICE_SID = 'MGservice';
  stubTwilio();
  await sendSms('+66812345678', 'via service');
  check(twilioCalls[0].params.MessagingServiceSid === 'MGservice' && !twilioCalls[0].params.From, 'Messaging Service SID is used instead of From when set');
  delete process.env.TWILIO_MESSAGING_SERVICE_SID;

  stubTwilio();
  await sendWhatsApp('+66812345678', 'hello wa');
  check(
    twilioCalls[0].params.From === 'whatsapp:+14155238886' && twilioCalls[0].params.To === 'whatsapp:+66812345678' && twilioCalls[0].params.Body === 'hello wa',
    'WhatsApp adds the whatsapp: prefix and sends free text without a template'
  );

  stubTwilio();
  await sendWhatsApp('+66812345678', 'ignored', 'HXassigned', { 1: 'Somchai' });
  check(
    twilioCalls[0].params.ContentSid === 'HXassigned' && twilioCalls[0].params.ContentVariables === '{"1":"Somchai"}' && !twilioCalls[0].params.Body,
    'WhatsApp uses the approved template and its variables when configured'
  );

  // ----------------------------------------------------------------
  console.log('\n--- 4. End-to-end for a saved ride ---');
  const stamp = Date.now();
  const bookingId = `bkg_notify_${stamp}`;
  const dispatchId = `dsp_notify_${stamp}`;
  await query(
    `INSERT INTO bookings (id, user_id, customer_name, customer_phone, customer_email, start_date, end_date, vendor_id, base_amount_thb, customer_total_amount, payment_status, booking_status)
     VALUES (?, NULL, 'Ananda Test', '+66 081 234 5678', '', '2026-11-20', '2026-11-20', 'vnd-bangkok-cabs', 1250.00, 1250.00, 'PENDING', 'Confirmed')`,
    [bookingId]
  );
  await query(
    `INSERT INTO taxi_dispatches (id, booking_id, driver_id, vehicle_id, vendor_id, pickup_address, dropoff_address, pickup_datetime,
       passenger_count, luggage_count, vehicle_category, vehicle_plate, total_fare_thb, ride_status, ride_otp_encrypted)
     VALUES (?, ?, 'drv-bkk-01', 'veh-fortuner-01', 'vnd-bangkok-cabs', 'Suvarnabhumi Airport (BKK)', 'Sukhumvit Soi 11',
       '2026-11-20 09:00:00', 4, 3, 'SUV', '2ขค 9988', 1250.00, 'DISPATCHED', ?)`,
    [dispatchId, bookingId, encryptOtp('4821')]
  );

  try {
    // Master switch off (the default): nothing is sent even with Twilio fully configured
    configureTwilio({ withTemplates: true, enabled: false });
    stubTwilio();
    const disabled = await notifyCustomerAboutRide(dispatchId, RIDE_EVENTS.DRIVER_ASSIGNED);
    check(disabled === null && twilioCalls.length === 0, 'Nothing is sent unless RIDE_NOTIFICATIONS_ENABLED=true');
    check(getCustomerUpdateChannels('+66 812345678', 'real@gmail.com').length === 0, 'Website promises no channels while notifications are off');

    configureTwilio({ withTemplates: true });
    check(getCustomerUpdateChannels('+66 812345678', '').join(',') === 'sms,whatsapp', 'Website lists SMS and WhatsApp once enabled and configured');
    const reserved = await sendEmail('pim@example.com', 'subject', '<p>x</p>', 'x');
    check(reserved.status === 'skipped' && reserved.reason === 'reserved test address', 'Reserved test domains (example.com) are never emailed');

    stubTwilio();
    const results = await notifyCustomerAboutRide(dispatchId, RIDE_EVENTS.DRIVER_ASSIGNED);
    check(results.sms.status === 'sent' && results.whatsapp.status === 'sent', 'SMS and WhatsApp sent for a driver assignment');
    check(results.email.status === 'skipped', 'Email skipped when the customer gave no email');
    const sms = twilioCalls.find(c => !String(c.params.To).startsWith('whatsapp:'));
    const wa = twilioCalls.find(c => String(c.params.To).startsWith('whatsapp:'));
    check(sms.params.To === '+66812345678', 'Customer phone from the booking normalised for Twilio');
    check(sms.params.Body.includes('Somchai Jaidee') && sms.params.Body.includes('Toyota') && sms.params.Body.includes('2ขค 9988'), 'SMS uses the real driver and the vehicle on the dispatch');
    check(sms.params.Body.includes('4821'), 'Start code decrypted from the dispatch and included');
    const vars = JSON.parse(wa.params.ContentVariables);
    check(wa.params.ContentSid === 'HXassigned' && vars['1'] === 'Somchai Jaidee', 'WhatsApp template filled with the driver details');

    const [logged] = await query("SELECT metadata_json FROM taxi_dispatch_events WHERE dispatch_id = ? AND event_type = 'CUSTOMER_NOTIFIED' ORDER BY created_at DESC LIMIT 1", [dispatchId]);
    const meta = typeof logged?.metadata_json === 'string' ? JSON.parse(logged.metadata_json) : logged?.metadata_json;
    check(meta?.event === 'DRIVER_ASSIGNED' && meta?.sms?.status === 'sent', 'Notification outcome recorded in the dispatch event log');

    // Twilio rejects the message -> reported as failed, nothing thrown
    twilioResponse = { status: 400, body: { code: 21211, message: "The 'To' number is not a valid phone number." } };
    stubTwilio();
    const failed = await notifyCustomerAboutRide(dispatchId, RIDE_EVENTS.BOOKED);
    check(failed.sms.status === 'failed' && failed.sms.error.includes('21211'), 'Twilio errors are reported as failed with the Twilio code');
    twilioResponse = { status: 201, body: { sid: 'SM_test_123' } };

    // A ride without a driver gets no "driver assigned" message
    await query('UPDATE taxi_dispatches SET driver_id = NULL WHERE id = ?', [dispatchId]);
    stubTwilio();
    const none = await notifyCustomerAboutRide(dispatchId, RIDE_EVENTS.DRIVER_ASSIGNED);
    check(none === null && twilioCalls.length === 0, 'No driver message is sent while no driver is assigned');
  } finally {
    await query('DELETE FROM taxi_dispatches WHERE id = ?', [dispatchId]);
    await query('DELETE FROM bookings WHERE id = ?', [bookingId]);
  }

  console.log('\n============================================================');
  console.log(`RIDE NOTIFICATION TESTS FINISHED: ${passed} PASSED, 0 FAILED`);
  console.log('============================================================\n');
}

run()
  .then(async () => {
    globalThis.fetch = realFetch;
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    await pool.end();
    process.exit(0);
  })
  .catch(async err => {
    console.error('\n❌ Ride notification tests failed:', err.message);
    globalThis.fetch = realFetch;
    await pool.end().catch(() => {});
    process.exit(1);
  });
