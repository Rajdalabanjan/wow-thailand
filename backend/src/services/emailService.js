import nodemailer from 'nodemailer';
import { generateVoucherPdfBuffer } from './pdfVoucherService.js';

// Create reusable transporter object using Gmail SMTP
let transporter = null;

export function getEmailTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass || user.includes('YOUR_GMAIL') || pass.includes('YOUR_16_LETTER')) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '465', 10),
      secure: process.env.SMTP_SECURE !== 'false',
      auth: {
        user: user.trim(),
        pass: pass.replace(/\s+/g, '') // remove spaces from 16-char password
      }
    });
  }

  return transporter;
}

/**
 * Generate luxury WOW THAILAND HTML Voucher Template
 */
export function generateVoucherEmailHtml({ booking, voucherCode, clientOrigin, apiOrigin }) {
  const bkgId = booking.id || booking.booking_id || 'WOW-BK';
  const customerName = booking.customer_name || booking.name || 'Valued Guest';
  const itemName = booking.item_name || booking.package_name || booking.hotel_name || booking.vehicle_name || 'Thailand Travel Reservation';
  const serviceType = booking.package_type || booking.type || 'Travel Reservation';
  const startDate = booking.start_date || booking.pickup_date || booking.check_in_date || 'N/A';
  const endDate = booking.end_date || booking.drop_date || booking.check_out_date || startDate;
  const guests = booking.total_members || booking.guests || 1;
  const totalAmount = Number(booking.total_amount || booking.total_paid || booking.customer_total_amount || 0).toLocaleString('en-US');
  const currency = booking.customer_currency || 'THB';
  const trackingUrl = `${clientOrigin || 'http://localhost:5173'}/voucher?id=${encodeURIComponent(bkgId)}`;
  const downloadPdfUrl = `${apiOrigin || 'http://localhost:5000'}/api.php?action=download_voucher_pdf&id=${encodeURIComponent(bkgId)}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WOW THAILAND Booking Voucher - #${bkgId}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
    .email-wrapper { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.35); }
    .email-header { background: linear-gradient(135deg, #070f1e 0%, #0d1b33 100%); padding: 32px 30px; text-align: center; border-bottom: 3px solid #ff9f1c; }
    .brand-logo { color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: 1px; margin: 0; text-transform: uppercase; }
    .brand-sub { color: #ff9f1c; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; }
    .badge-confirmed { display: inline-block; background: rgba(34, 197, 94, 0.15); border: 1px solid #22c55e; color: #15803d; font-size: 12px; font-weight: 800; padding: 6px 14px; border-radius: 20px; text-transform: uppercase; margin-top: 14px; letter-spacing: 1px; }
    .email-body { padding: 32px 30px; }
    .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
    .message { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .pdf-attachment-banner { background: #ecfdf5; border: 1.5px solid #10b981; border-radius: 10px; padding: 14px 18px; margin-bottom: 24px; text-align: center; }
    .pdf-attachment-title { color: #047857; font-weight: 800; font-size: 14px; margin-bottom: 3px; }
    .pdf-attachment-subtitle { color: #065f46; font-size: 12px; }
    .voucher-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 22px; margin-bottom: 24px; }
    .voucher-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #ff6b35; letter-spacing: 1.2px; margin-bottom: 12px; }
    .item-name { font-size: 19px; font-weight: 800; color: #0f172a; margin-bottom: 14px; line-height: 1.3; }
    .details-table { width: 100%; border-collapse: collapse; }
    .details-table td { padding: 8px 0; font-size: 13.5px; border-bottom: 1px solid #f1f5f9; }
    .details-table td.label { color: #64748b; font-weight: 600; width: 40%; }
    .details-table td.value { color: #0f172a; font-weight: 700; text-align: right; }
    .total-row td { border-bottom: none; padding-top: 14px; font-size: 16px; font-weight: 900; color: #0f172a; }
    .total-amount { color: #ff6b35; font-size: 18px; }
    .pnr-box { background: #070f1e; color: #ffffff; text-align: center; padding: 14px; border-radius: 8px; margin-bottom: 24px; }
    .pnr-label { font-size: 10px; text-transform: uppercase; color: #94a3b8; letter-spacing: 1.5px; margin-bottom: 4px; }
    .pnr-code { font-size: 20px; font-weight: 900; color: #ffb84d; letter-spacing: 2px; font-family: monospace; }
    .btn-action { display: block; text-align: center; background: linear-gradient(135deg, #ff6b35 0%, #ff9f1c 100%); color: #ffffff !important; text-decoration: none; padding: 14px 24px; font-size: 15px; font-weight: 800; border-radius: 30px; box-shadow: 0 4px 15px rgba(255, 107, 53, 0.4); margin-bottom: 24px; }
    .email-footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 30px; text-align: center; font-size: 12px; color: #64748b; line-height: 1.6; }
    .footer-support { font-weight: 700; color: #0f172a; margin-bottom: 4px; }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <!-- Header -->
    <div class="email-header">
      <div class="brand-logo">WOW THAILAND</div>
      <div class="brand-sub">Luxury Hotels, Signature Tours & Cabs</div>
      <div>
        <span class="badge-confirmed">✓ Booking Confirmed & Verified</span>
      </div>
    </div>

    <!-- Body -->
    <div class="email-body">
      <div class="greeting">Sawadee krub, ${customerName}! 🇹🇭</div>
      <div class="message">
        Thank you for booking with <strong>WOW THAILAND</strong>. Your official reservation voucher has been generated and confirmed in our verified partner system.
      </div>

      <!-- PDF Attachment Notice -->
      <div class="pdf-attachment-banner" style="background: #ecfdf5; border: 2px dashed #10b981; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px; text-align: center;">
        <div style="font-size: 26px; margin-bottom: 6px;">📎 📄</div>
        <div class="pdf-attachment-title" style="color: #065f46; font-weight: 800; font-size: 15px; margin-bottom: 4px;">
          OFFICIAL A4 VOUCHER PDF ATTACHED TO THIS EMAIL
        </div>
        <div class="pdf-attachment-subtitle" style="color: #047857; font-size: 13px; line-height: 1.5;">
          You can download <strong>WOW_THAILAND_Voucher_${bkgId}.pdf</strong> directly from the attachment at the bottom of this Gmail email, or click the orange button below to download the PDF instantly.
        </div>
      </div>

      <!-- PNR Box -->
      <div class="pnr-box">
        <div class="pnr-label">Official Booking Reference / PNR</div>
        <div class="pnr-code">${bkgId}</div>
      </div>

      <!-- Voucher Summary Card -->
      <div class="voucher-card">
        <div class="voucher-title">Reservation Voucher Details</div>
        <div class="item-name">${itemName}</div>
        <table class="details-table">
          <tr>
            <td class="label">Service Category</td>
            <td class="value">${serviceType}</td>
          </tr>
          <tr>
            <td class="label">Schedule / Dates</td>
            <td class="value">${startDate} ${endDate !== startDate ? 'to ' + endDate : ''}</td>
          </tr>
          <tr>
            <td class="label">Guest(s)</td>
            <td class="value">${guests} Guest${guests > 1 ? 's' : ''}</td>
          </tr>
          <tr>
            <td class="label">Voucher Code</td>
            <td class="value">${voucherCode || bkgId}</td>
          </tr>
          <tr class="total-row">
            <td class="label">Total Paid</td>
            <td class="value total-amount">฿${totalAmount} (${currency})</td>
          </tr>
        </table>
      </div>

      <!-- Direct PDF Download Action Button -->
      <a href="${downloadPdfUrl}" class="btn-action" style="font-size: 16px; font-weight: 900; letter-spacing: 0.5px; padding: 16px 28px; text-decoration: none; display: block; text-align: center; background: linear-gradient(135deg, #ff6b35 0%, #ff9f1c 100%); color: #ffffff !important; border-radius: 30px; box-shadow: 0 4px 15px rgba(255, 107, 53, 0.4); margin-bottom: 12px;">
        ⬇ DOWNLOAD OFFICIAL VOUCHER (PDF)
      </a>

      <!-- Secondary Web Browser View -->
      <div style="text-align: center; margin-bottom: 20px;">
        <a href="${trackingUrl}" style="color: #64748b; font-size: 13px; text-decoration: underline;">
          Or View Voucher Online in Web Browser →
        </a>
      </div>

      <div style="font-size: 12px; color: #64748b; line-height: 1.5; text-align: center;">
        Please present this voucher or your digital Booking ID (#${bkgId}) upon check-in or chauffeur pickup in Thailand.
      </div>
    </div>

    <!-- Footer -->
    <div class="email-footer">
      <div class="footer-support">WOW THAILAND Official Travel & Concierge Services</div>
      <div>24/7 Dedicated Traveler Hotline & WhatsApp Support</div>
      <div style="margin-top: 8px; color: #94a3b8; font-size: 11px;">
        © ${new Date().getFullYear()} WOW THAILAND Platform. All rights reserved.
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send official booking voucher email to customer
 */
export async function sendBookingVoucherEmail(booking, voucherCode = null) {
  const toEmail = (booking.customer_email || booking.email || '').trim();
  if (!toEmail || !toEmail.includes('@')) {
    console.warn('[EmailService] Skipped: No valid customer email found on booking.');
    return { success: false, reason: 'NO_CUSTOMER_EMAIL' };
  }

  const mailer = getEmailTransporter();
  if (!mailer) {
    console.warn('[EmailService] Skipped: Gmail credentials not configured in backend/.env yet.');
    return { success: false, reason: 'SMTP_NOT_CONFIGURED' };
  }

  const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
  const bkgId = booking.id || booking.booking_id || 'WOW-BK';
  const apiOrigin = process.env.API_BASE_URL || 'http://localhost:5000';
  const htmlContent = generateVoucherEmailHtml({ booking, voucherCode, clientOrigin, apiOrigin });

  // Generate official A4 PDF voucher attachment
  let attachments = [];
  try {
    const pdfBuffer = await generateVoucherPdfBuffer(booking, voucherCode);
    if (pdfBuffer && pdfBuffer.length > 0) {
      attachments.push({
        filename: `WOW_THAILAND_Voucher_${bkgId}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      });
      console.log(`[EmailService] ✓ Generated PDF voucher attachment (${pdfBuffer.length} bytes) for #${bkgId}`);
    }
  } catch (pdfErr) {
    console.warn(`[EmailService] Warning: Could not generate PDF attachment for #${bkgId}:`, pdfErr.message);
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || `WOW THAILAND <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `🇹🇭 Official Trip Voucher Confirmed: #${bkgId} — WOW THAILAND`,
    html: htmlContent,
    attachments: attachments
  };

  try {
    const info = await mailer.sendMail(mailOptions);
    console.log(`[EmailService] ✓ Voucher email successfully sent to ${toEmail} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EmailService] ✗ Failed to send voucher email to ${toEmail}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send secure 6-digit OTP verification code via Gmail SMTP
 */
export async function sendOtpEmail(toEmail, otp, purpose = 'Verification') {
  if (!toEmail || !toEmail.includes('@')) {
    return { success: false, reason: 'INVALID_EMAIL' };
  }

  const mailer = getEmailTransporter();
  if (!mailer) {
    console.warn('[EmailService] SMTP not configured; OTP email delivery skipped.');
    return { success: false, reason: 'SMTP_NOT_CONFIGURED' };
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
      <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #0d1b2a, #1b263b); padding: 28px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">WOW THAILAND</h1>
          <p style="color: #fb923c; margin: 4px 0 0; font-size: 13px; font-weight: 600; text-transform: uppercase;">Official Security Service</p>
        </div>
        <div style="padding: 32px 28px; text-align: center;">
          <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 12px;">${purpose} Code</h2>
          <p style="color: #64748b; font-size: 14px; margin: 0 0 24px; line-height: 1.5;">Use the one-time verification code below to securely access your account. This code is valid for <strong>10 minutes</strong>.</p>
          <div style="display: inline-block; background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 16px 36px; margin-bottom: 24px;">
            <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0f172a; font-family: monospace;">${otp}</span>
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.5;">Never share this code with anyone. WOW THAILAND employees will never ask for your verification code.</p>
        </div>
        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8;">
          © ${new Date().getFullYear()} WOW THAILAND Travel & Transfers. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_FROM || `WOW THAILAND Security <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `🔐 Your WOW THAILAND Verification Code: ${otp}`,
    html
  };

  try {
    const info = await mailer.sendMail(mailOptions);
    console.log(`[EmailService] ✓ OTP email successfully dispatched to ${toEmail}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EmailService] ✗ Failed to send OTP email to ${toEmail}:`, err.message);
    return { success: false, error: err.message };
  }
}


