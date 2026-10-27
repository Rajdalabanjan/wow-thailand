// ========================================================================
// WOW THAILAND: Wallet & Settlement Controller
// ========================================================================

import { query, withTransaction } from '../config/db.js';

export async function getVendorWallet(req, res, next) {
  try {
    const vendorId = req.params.vendorId || req.query.vendor_id || 'vnd-phuket-01';
    const wallets = await query('SELECT * FROM vendor_wallets WHERE vendor_id = ?', [vendorId]);

    if (wallets.length === 0) {
      return res.json({
        success: true,
        data: { vendor_id: vendorId, balance_thb: 0.00, transactions: [] }
      });
    }

    const wallet = wallets[0];
    const transactions = await query(
      'SELECT * FROM wallet_transactions WHERE wallet_id = ? ORDER BY created_at DESC LIMIT 20',
      [wallet.id]
    );

    res.json({
      success: true,
      data: {
        ...wallet,
        transactions
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function topUpWallet(req, res, next) {
  try {
    const { vendor_id, amount_thb } = req.body;
    const amount = parseFloat(amount_thb);
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Positive amount is required.' });
    }

    const result = await withTransaction(async (conn) => {
      let [wallets] = await conn.execute(
        'SELECT * FROM vendor_wallets WHERE vendor_id = ? FOR UPDATE',
        [vendor_id]
      );

      if (wallets.length === 0) {
        const wid = `wal_${Date.now()}`;
        await conn.execute(
          'INSERT INTO vendor_wallets (id, vendor_id, balance_thb, hold_amount_thb) VALUES (?, ?, 0, 0)',
          [wid, vendor_id]
        );
        [wallets] = await conn.execute('SELECT * FROM vendor_wallets WHERE id = ? FOR UPDATE', [wid]);
      }

      const wallet = wallets[0];
      const balanceBefore = parseFloat(wallet.balance_thb || 0);
      const balanceAfter = Math.round((balanceBefore + amount) * 100) / 100;

      await conn.execute(
        'UPDATE vendor_wallets SET balance_thb = ?, negative_booking_count = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [balanceAfter, wallet.id]
      );

      const txnId = `txn_${Date.now()}_topup`;
      await conn.execute(
        `INSERT INTO wallet_transactions (
          id, wallet_id, vendor_id, amount_thb, type, reference_id, 
          balance_before_thb, balance_after_thb, status, description, admin_id
        ) VALUES (?, ?, ?, ?, 'credit', 'manual_topup', ?, ?, 'Completed', 'Manual Wallet Top Up', 'admin')`,
        [txnId, wallet.id, vendor_id, amount, balanceBefore, balanceAfter]
      );

      return { success: true, balance_before: balanceBefore, balance_after: balanceAfter };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}
