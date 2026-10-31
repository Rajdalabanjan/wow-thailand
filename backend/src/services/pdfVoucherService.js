import PDFDocument from 'pdfkit';

/**
 * Generate a professional A4 PDF buffer for the booking voucher
 */
export async function generateVoucherPdfBuffer(booking, voucherCode) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `WOW THAILAND Booking Voucher - ${booking.id || 'TH-BKG'}`,
          Author: 'WOW THAILAND Platform'
        }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      const bkgId = booking.id || booking.booking_id || 'WOW-BK';
      const guestName = (booking.customer_name || booking.name || 'Valued Guest').toUpperCase();
      const phone = booking.customer_phone || booking.phone || 'N/A';
      const email = booking.customer_email || booking.email || 'N/A';
      const itemName = booking.item_name || booking.package_name || booking.hotel_name || booking.vehicle_name || 'Thailand Travel Reservation';
      const serviceType = booking.package_type || booking.type || 'Hotel & Resort Accommodation';
      const startDate = booking.start_date || booking.pickup_date || booking.check_in_date || 'N/A';
      const endDate = booking.end_date || booking.drop_date || booking.check_out_date || startDate;
      const guests = booking.total_members || booking.guests || 1;
      const paymentMode = booking.payment_method || 'Pay at Hotel';
      const totalAmount = Number(booking.total_amount || booking.total_paid || booking.customer_total_amount || 0).toLocaleString('en-US');
      const amountPaid = Number(booking.amount_paid || 0).toLocaleString('en-US');
      const currency = booking.customer_currency || 'THB';
      const balanceDue = Number(booking.remaining_due_amount || booking.remaining_amount || (Number(booking.total_amount || 0) - Number(booking.amount_paid || 0))).toLocaleString('en-US');

      // Top Orange Accent Bar
      doc.rect(40, 40, 515, 6).fill('#FF6B35');

      // Header Section
      doc.fontSize(22).font('Helvetica-Bold').fillColor('#070F1E').text('WOW THAILAND', 40, 55);
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#FF6B35').text('MOBILITY, HOTELS & SIGNATURE EXPERIENCES', 40, 80);
      doc.fontSize(8).font('Helvetica').fillColor('#64748B').text('Official Travel & Reservation Confirmation Voucher', 40, 93);

      // Top-right Booking PNR & Status
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#070F1E').text('BOOKING VOUCHER', 320, 55, { align: 'right', width: 235 });
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#FF6B35').text(`#${bkgId}`, 320, 72, { align: 'right', width: 235 });
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#16A34A').text('STATUS: CONFIRMED', 320, 88, { align: 'right', width: 235 });
      doc.fontSize(8).font('Helvetica').fillColor('#64748B').text(`Date: ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`, 320, 100, { align: 'right', width: 235 });

      // Divider Line
      doc.moveTo(40, 115).lineTo(555, 115).strokeColor('#CBD5E1').lineWidth(1).stroke();

      // Section: Guest Details
      doc.rect(40, 125, 515, 20).fill('#F1F5F9');
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#070F1E').text('CUSTOMER & GUEST DETAILS', 48, 130);

      doc.rect(40, 145, 515, 45).strokeColor('#E2E8F0').lineWidth(1).stroke();
      doc.fontSize(8).font('Helvetica').fillColor('#64748B').text('Lead Guest Name:', 48, 153);
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#070F1E').text(guestName, 48, 165);

      doc.fontSize(8).font('Helvetica').fillColor('#64748B').text('Contact Number:', 220, 153);
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#070F1E').text(phone, 220, 165);

      doc.fontSize(8).font('Helvetica').fillColor('#64748B').text('Email Address:', 380, 153);
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#070F1E').text(email, 380, 165);

      // Section: Reservation Details
      doc.rect(40, 202, 515, 20).fill('#F1F5F9');
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#070F1E').text('RESERVATION DETAILS', 48, 207);

      doc.rect(40, 222, 515, 95).strokeColor('#E2E8F0').lineWidth(1).stroke();
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#070F1E').text(itemName, 48, 232, { width: 495 });
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#FF6B35').text(`CATEGORY: ${serviceType.toUpperCase()}`, 48, 252);

      // Schedule Box
      doc.fontSize(8).font('Helvetica').fillColor('#64748B').text('Check-in / Start Schedule:', 48, 270);
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#070F1E').text(startDate, 48, 282);

      doc.fontSize(8).font('Helvetica').fillColor('#64748B').text('Check-out / End Schedule:', 220, 270);
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#070F1E').text(endDate, 220, 282);

      doc.fontSize(8).font('Helvetica').fillColor('#64748B').text('Guests & Capacity:', 380, 270);
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#070F1E').text(`${guests} Guest(s)`, 380, 282);

      // Section: Payment & Billing Statement
      doc.rect(40, 329, 515, 20).fill('#F1F5F9');
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#070F1E').text('PAYMENT & BILLING STATEMENT', 48, 334);

      doc.rect(40, 349, 515, 80).strokeColor('#E2E8F0').lineWidth(1).stroke();
      doc.fontSize(9).font('Helvetica').fillColor('#475569').text('Total Booking Fare:', 48, 360);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#070F1E').text(`${currency} ${totalAmount}`, 380, 359, { align: 'right', width: 165 });

      doc.fontSize(9).font('Helvetica').fillColor('#475569').text('Amount Paid:', 48, 377);
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#16A34A').text(`${currency} ${amountPaid}`, 380, 376, { align: 'right', width: 165 });

      doc.fontSize(9).font('Helvetica').fillColor('#475569').text('Payment Method / Mode:', 48, 394);
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#070F1E').text(paymentMode, 380, 393, { align: 'right', width: 165 });

      doc.moveTo(48, 411).lineTo(545, 411).strokeColor('#F1F5F9').lineWidth(1).stroke();
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#DC2626').text('Balance Due on Arrival / Handover:', 48, 416);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#DC2626').text(`${currency} ${balanceDue}`, 380, 415, { align: 'right', width: 165 });

      // Important Instructions & Notes
      doc.rect(40, 442, 515, 60).fill('#FEF3C7').strokeColor('#FDE68A').lineWidth(1).stroke();
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#B45309').text('IMPORTANT INSTRUCTIONS & CHECK-IN NOTES', 48, 449);
      doc.fontSize(7.5).font('Helvetica').fillColor('#92400E')
        .text('• Government-issued photo ID (Passport / Aadhaar / National ID) is mandatory for all staying guests upon check-in.', 48, 463)
        .text('• Standard hotel check-in starts from 14:00 hrs. Early check-in is subject to room availability upon arrival.', 48, 474)
        .text('• For flight delays, route coordination or 24/7 concierge assistance, contact the Thailand Operations Desk.', 48, 485);

      // Terms & Conditions
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#475569').text('STANDARD TERMS & CONDITIONS', 40, 515);
      doc.fontSize(7).font('Helvetica').fillColor('#64748B')
        .text('1. Identification: Valid passport or official photo ID is mandatory at property check-in or vehicle handover.', 40, 527)
        .text('2. Timings: Room check-out times must be adhered to; extensions require prior property management approval.', 40, 538)
        .text('3. Refunds & Cancellation: Cancellations and refunds are governed strictly by the property policy selected at checkout.', 40, 549)
        .text('4. Official Document: This electronic reservation voucher is generated by the WOW THAILAND platform and verified with partner systems.', 40, 560);

      // Footer
      doc.rect(40, 770, 515, 1).fill('#E2E8F0');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#070F1E').text('WOW THAILAND Travel Solutions • Official Platform Voucher', 40, 778);
      doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text('24/7 Operations Desk: +91 98765 43210  |  Email: support@wowthailand.com  |  Web: www.wowthailand.com', 40, 790);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

