// ========================================================================
// WOW THAILAND: Controlled Vendor Negative-Wallet Service
// Enforces configurable overdraft thresholds and immutable ledger logging
// ========================================================================

import { randomUUID as uuidv4 } from 'crypto';

/**
 * Confirm booking and deduct platform fee from vendor wallet
 * Runs inside an active MySQL transaction
 */
export async function confirmBookingAndDeductPlatformFee(connection, bookingId, vendorId = null) {
  // 1. Fetch booking
  const [bookings] = await connection.execute(
    'SELECT * FROM bookings WHERE id = ? FOR UPDATE',
    [bookingId]
  );
  if (bookings.length === 0) {
    throw new Error(`Booking #${bookingId} not found.`);
  }
  const booking = bookings[0];

  // 2. Idempotency Check: if platform fee was already completed
  if (booking.wallet_deduction_status === 'Completed') {
    return {
      success: true,
      already_confirmed: true,
      message: `Booking #${bookingId} is already confirmed and platform fee was previously processed.`,
      booking_id: bookingId,
      platform_fee: parseFloat(booking.platform_fee_thb || 0),
      payment_status: 'PAID',
      wallet_deduction_status: 'Completed'
    };
  }

  // 3. Resolve Vendor ID
  const effectiveVendorId = vendorId || booking.vendor_id || 'vnd-default';

  // 4. Fetch or initialize Vendor Wallet
  let [wallets] = await connection.execute(
    'SELECT * FROM vendor_wallets WHERE vendor_id = ? FOR UPDATE',
    [effectiveVendorId]
  );

  if (wallets.length === 0) {
    const newWalletId = `wal_${Date.now()}_${Math.floor(Math.random() * 900 + 100)}`;
    await connection.execute(
      'INSERT INTO vendor_wallets (id, vendor_id, balance_thb, hold_amount_thb, minimum_balance_thb, negative_booking_count, max_negative_bookings) VALUES (?, ?, 0.00, 0.00, 1000.00, 0, 2)',
      [newWalletId, effectiveVendorId]
    );
    [wallets] = await connection.execute(
      'SELECT * FROM vendor_wallets WHERE id = ? FOR UPDATE',
      [newWalletId]
    );
  }

  const wallet = wallets[0];
  const currentBalance = parseFloat(wallet.balance_thb || 0.00);
  const negativeCount = parseInt(wallet.negative_booking_count || 0, 10);
  const maxNegativeBookings = parseInt(wallet.max_negative_bookings || 2, 10);

  // 5. Check Negative Booking Blocking Rule
  if (currentBalance < 0 && negativeCount >= maxNegativeBookings) {
    const error = new Error(
      `Wallet recharge required. Wallet balance is negative (฿${Math.abs(currentBalance).toFixed(2)}) and maximum negative bookings limit (${maxNegativeBookings}) has been reached.`
    );
    error.code = 'WALLET_BLOCKED';
    error.statusCode = 403;
    throw error;
  }

  // 6. Calculate Platform Fee (10% of base amount or configured fee)
  let platformFee = parseFloat(booking.platform_fee_thb || 0.00);
  if (platformFee <= 0) {
    const baseAmt = parseFloat(booking.base_amount_thb || 0.00);
    platformFee = Math.round(baseAmt * 0.10 * 100) / 100;
  }

  // 7. Compute resulting balance and negative count
  const balanceBefore = currentBalance;
  const balanceAfter = Math.round((balanceBefore - platformFee) * 100) / 100;
  let newNegativeCount = 0;

  if (balanceAfter < 0) {
    newNegativeCount = balanceBefore >= 0 ? 1 : negativeCount + 1;
  }

  // 8. Update Vendor Wallet
  await connection.execute(
    'UPDATE vendor_wallets SET balance_thb = ?, negative_booking_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [balanceAfter, newNegativeCount, wallet.id]
  );

  // 9. Record Immutable Audit Ledger Entry
  const txnId = `txn_${Date.now()}_${Math.floor(Math.random() * 900 + 100)}`;
  await connection.execute(
    `INSERT INTO wallet_transactions (
      id, wallet_id, vendor_id, amount_thb, type, reference_id, 
      balance_before_thb, balance_after_thb, status, description, admin_id
    ) VALUES (?, ?, ?, ?, 'debit', ?, ?, ?, 'Completed', ?, 'system')`,
    [
      txnId,
      wallet.id,
      effectiveVendorId,
      platformFee,
      bookingId,
      balanceBefore,
      balanceAfter,
      `Platform fee deducted for booking #${bookingId}`
    ]
  );

  // 10. Update Booking Status
  await connection.execute(
    `UPDATE bookings SET 
      payment_status = 'PAID',
      payment_verification_status = 'Verified',
      wallet_deduction_status = 'Completed',
      booking_status = 'Confirmed',
      platform_fee_thb = ?
    WHERE id = ?`,
    [platformFee, bookingId]
  );

  return {
    success: true,
    booking_id: bookingId,
    payment_status: 'PAID',
    platform_fee: platformFee,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    negative_booking_count: newNegativeCount,
    wallet_deduction_status: 'Completed'
  };
}
