// ========================================================================
// WOW THAILAND: Cab & Transfer Payment Controller
// Robust reconciliation for Cash to Driver, PromptPay QR, & Cards
// ========================================================================

import { query, withTransaction } from '../config/db.js';
import { resolveDriverId } from '../utils/identityResolver.js';
import { broadcastEvent } from '../server.js';

const ADMIN_ROLES = new Set(['admin', 'superadmin', 'super_admin']);

/**
 * POST /api/v1/cabs/payment/record-cash
 * Chauffeur records cash collected from passenger
 */
export async function recordCashPayment(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const driverId = await resolveDriverId(req.user);
    if (!driverId && !ADMIN_ROLES.has(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Driver or Admin authorization required.' });
    }

    const { dispatch_id, amount_collected_thb } = req.body;
    if (!dispatch_id) {
      return res.status(400).json({ success: false, error: 'dispatch_id is required.' });
    }

    // Lookup dispatch
    const dispatches = await query('SELECT * FROM taxi_dispatches WHERE id = ? LIMIT 1', [dispatch_id]);
    if (dispatches.length === 0) {
      return res.status(404).json({ success: false, error: 'Transfer dispatch not found.' });
    }

    const dispatch = dispatches[0];

    // Ownership check if driver
    if (driverId && String(dispatch.driver_id) !== String(driverId) && !ADMIN_ROLES.has(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Access denied: You are not assigned to this duty.' });
    }

    const amount = parseFloat(amount_collected_thb || dispatch.total_fare_thb);
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Valid collected amount is required.' });
    }

    const result = await withTransaction(async (conn) => {
      // 1. Update or Insert taxi_payment_transactions
      const [existing] = await conn.execute(
        'SELECT * FROM taxi_payment_transactions WHERE dispatch_id = ? LIMIT 1',
        [dispatch_id]
      );

      const txId = existing.length > 0 ? existing[0].id : `ptx_${Date.now()}_cash`;

      if (existing.length > 0) {
        await conn.execute(
          `UPDATE taxi_payment_transactions 
           SET amount_thb = ?, payment_method = 'CASH_TO_DRIVER', payment_status = 'PAID',
               collected_by_driver_id = ?, verified_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [amount, driverId || null, txId]
        );
      } else {
        await conn.execute(
          `INSERT INTO taxi_payment_transactions (
            id, dispatch_id, booking_id, amount_thb, payment_method, payment_status, collected_by_driver_id, verified_at
          ) VALUES (?, ?, ?, ?, 'CASH_TO_DRIVER', 'PAID', ?, CURRENT_TIMESTAMP)`,
          [txId, dispatch_id, dispatch.booking_id, amount, driverId || null]
        );
      }

      // 2. Update bookings payment status
      await conn.execute(
        `UPDATE bookings 
         SET payment_status = 'PAID', payment_verification_status = 'Verified', updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [dispatch.booking_id]
      );

      // 3. Insert into payments table for financial audit
      const paymentAuditId = `pay_${Date.now()}_cash`;
      await conn.execute(
        `INSERT INTO payments (
          id, booking_id, payment_method, gateway_reference, amount_charged, currency, status, verified_by_user_id, verified_at
        ) VALUES (?, ?, 'CASH_ON_ARRIVAL', ?, ?, 'THB', 'SUCCESS', ?, CURRENT_TIMESTAMP)`,
        [paymentAuditId, dispatch.booking_id, `CASH_COLLECTED_BY_${driverId || 'ADMIN'}`, amount, req.user.id]
      );

      return {
        dispatch_id,
        booking_id: dispatch.booking_id,
        amount_thb: amount,
        payment_status: 'PAID',
        payment_method: 'CASH_TO_DRIVER'
      };
    });

    broadcastEvent(`dispatch_${dispatch_id}`, 'PAYMENT_RECEIVED', {
      dispatch_id,
      amount_thb: amount,
      payment_method: 'CASH_TO_DRIVER',
      payment_status: 'PAID'
    });

    res.json({
      success: true,
      message: 'Cash payment successfully recorded and verified.',
      data: result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/cabs/payment/verify-gateway
 * Verify PromptPay QR or Card payment
 */
export async function verifyGatewayPayment(req, res, next) {
  try {
    const { dispatch_id, booking_id, payment_method = 'PROMPTPAY_QR', gateway_ref } = req.body;
    const targetId = dispatch_id || booking_id;

    if (!targetId) {
      return res.status(400).json({ success: false, error: 'dispatch_id or booking_id is required.' });
    }

    if (!gateway_ref || !gateway_ref.trim()) {
      return res.status(400).json({ success: false, error: 'Payment gateway reference is required.' });
    }

    const dispatches = await query(
      `SELECT * FROM taxi_dispatches WHERE id = ? OR booking_id = ? LIMIT 1`,
      [targetId, targetId]
    );

    if (dispatches.length === 0) {
      return res.status(404).json({ success: false, error: 'Transfer dispatch not found.' });
    }

    const dispatch = dispatches[0];

    const result = await withTransaction(async (conn) => {
      const [existing] = await conn.execute(
        'SELECT * FROM taxi_payment_transactions WHERE dispatch_id = ? LIMIT 1',
        [dispatch.id]
      );

      const txId = existing.length > 0 ? existing[0].id : `ptx_${Date.now()}_gateway`;
      const normMethod = payment_method === 'CARD' ? 'CARD' : 'PROMPTPAY_QR';

      if (existing.length > 0) {
        await conn.execute(
          `UPDATE taxi_payment_transactions 
           SET payment_method = ?, payment_status = 'PAID', gateway_ref = ?, verified_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [normMethod, gateway_ref.trim(), txId]
        );
      } else {
        await conn.execute(
          `INSERT INTO taxi_payment_transactions (
            id, dispatch_id, booking_id, amount_thb, payment_method, payment_status, gateway_ref, verified_at
          ) VALUES (?, ?, ?, ?, ?, 'PAID', ?, CURRENT_TIMESTAMP)`,
          [txId, dispatch.id, dispatch.booking_id, dispatch.total_fare_thb, normMethod, gateway_ref.trim()]
        );
      }

      await conn.execute(
        `UPDATE bookings 
         SET payment_status = 'PAID', payment_verification_status = 'Verified', updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [dispatch.booking_id]
      );

      return {
        dispatch_id: dispatch.id,
        booking_id: dispatch.booking_id,
        payment_status: 'PAID',
        payment_method: normMethod,
        gateway_ref: gateway_ref.trim()
      };
    });

    broadcastEvent(`dispatch_${dispatch.id}`, 'PAYMENT_RECEIVED', {
      dispatch_id: dispatch.id,
      amount_thb: dispatch.total_fare_thb,
      payment_method: result.payment_method,
      payment_status: 'PAID'
    });

    res.json({
      success: true,
      message: 'Payment verified successfully.',
      data: result
    });
  } catch (err) {
    next(err);
  }
}

