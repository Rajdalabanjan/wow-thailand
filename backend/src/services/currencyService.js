// ========================================================================
// WOW THAILAND: Currency Conversion & Snapshot Service
// Authoritative Base Currency: THB (Thai Baht)
// ========================================================================

// Baseline fallback exchange rates: 1 THB in target currencies
const BASELINE_RATES = {
  THB: 1.0,
  INR: 2.45,  // 1 THB ≈ 2.45 INR
  USD: 0.029  // 1 THB ≈ 0.029 USD
};

let cachedRates = { ...BASELINE_RATES };
let lastFetched = Date.now();
const CACHE_TTL_MS = 3600 * 1000; // 1 hour

/**
 * Get current exchange rate from THB to target currency
 */
export function getExchangeRate(targetCurrency = 'THB') {
  const code = (targetCurrency || 'THB').toUpperCase();
  return cachedRates[code] || 1.0;
}

/**
 * Convert base THB amount to customer display currency with half-up rounding
 */
export function convertFromTHB(amountTHB, targetCurrency = 'THB') {
  const rate = getExchangeRate(targetCurrency);
  const num = parseFloat(amountTHB) || 0;
  return Math.round(num * rate * 100) / 100;
}

/**
 * Generate an immutable currency snapshot for a booking record
 */
export function createCurrencySnapshot(baseAmountTHB, targetCurrency = 'THB') {
  const code = (targetCurrency || 'THB').toUpperCase();
  const rate = getExchangeRate(code);
  const customerAmount = convertFromTHB(baseAmountTHB, code);

  return {
    base_amount_thb: parseFloat(baseAmountTHB) || 0.00,
    customer_currency: code,
    exchange_rate_applied: rate,
    customer_total_amount: customerAmount
  };
}
