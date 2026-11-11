const crypto = require('crypto');

const EPAYCO_PLANS = Object.freeze({
  pro_1_month: Object.freeze({ months: 1, amount: 19900, currency: 'COP', label: '1 Mes' }),
  pro_3_months: Object.freeze({ months: 3, amount: 56700, currency: 'COP', label: '3 Meses' }),
  pro_6_months: Object.freeze({ months: 6, amount: 101400, currency: 'COP', label: '6 Meses' }),
  pro_12_months: Object.freeze({ months: 12, amount: 166800, currency: 'COP', label: '1 Año' }),
});

function constantTimeEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function amountInCents(value) {
  const amount = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function amountsMatch(actual, expected) {
  const actualCents = amountInCents(actual);
  const expectedCents = amountInCents(expected);
  return actualCents !== null && expectedCents !== null && actualCents === expectedCents;
}

function normalizedCurrency(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function makeEpaycoSignature(customerId, pKey, transaction) {
  const signatureString = [
    customerId,
    pKey,
    transaction.x_ref_payco,
    transaction.x_transaction_id,
    transaction.x_amount,
    transaction.x_currency_code,
  ].join('^');
  return crypto.createHash('sha256').update(signatureString).digest('hex');
}

function epaycoValidationMatches(order, callback, providerData) {
  if (!order || !callback || !providerData) return false;

  const providerReference = providerData.x_ref_payco ?? providerData.ref_payco;
  const providerTransactionId = providerData.x_transaction_id ?? providerData.transaction_id;
  const providerAmount = providerData.x_amount ?? providerData.amount;
  const providerCurrency = providerData.x_currency_code ?? providerData.currency;
  const providerOrderId = providerData.x_extra1 ?? providerData.extra1;

  return Boolean(
    String(callback.x_ref_payco || '') &&
    String(callback.x_transaction_id || '') &&
    String(providerReference || '') === String(callback.x_ref_payco) &&
    String(providerTransactionId || '') === String(callback.x_transaction_id) &&
    amountsMatch(providerAmount, order.amount) &&
    amountsMatch(callback.x_amount, order.amount) &&
    normalizedCurrency(providerCurrency) === order.currency &&
    normalizedCurrency(callback.x_currency_code) === order.currency &&
    String(providerOrderId || '') === String(order.id) &&
    String(callback.x_extra1 || '') === String(order.id)
  );
}

function isEpaycoApproved(transaction) {
  if (!transaction) return false;
  return String(transaction.x_cod_response ?? '') === '1' ||
    String(transaction.x_response ?? '').trim().toLowerCase() === 'aceptada';
}

function parseHotmartPlanConfig(rawConfig) {
  if (typeof rawConfig !== 'string' || !rawConfig.trim()) return {};

  let source;
  try {
    source = JSON.parse(rawConfig);
  } catch {
    return {};
  }

  if (!source || typeof source !== 'object' || Array.isArray(source)) return {};

  const plans = {};
  for (const [planId, plan] of Object.entries(source)) {
    if (!/^[a-zA-Z0-9_-]{1,40}$/.test(planId) || !plan || typeof plan !== 'object') continue;
    const months = Number(plan.months);
    const amount = Number(plan.amount);
    const currency = normalizedCurrency(plan.currency);
    const productId = String(plan.productId || '').trim();
    const offerCode = String(plan.offerCode || '').trim();
    const checkoutUrl = String(plan.checkoutUrl || '').trim();

    let parsedUrl;
    try {
      parsedUrl = new URL(checkoutUrl);
    } catch {
      continue;
    }

    if (
      ![1, 3, 6, 12].includes(months) ||
      !Number.isFinite(amount) || amount <= 0 ||
      !/^[A-Z]{3}$/.test(currency) ||
      !productId || !offerCode ||
      parsedUrl.protocol !== 'https:' ||
      parsedUrl.hostname !== 'pay.hotmart.com' ||
      parsedUrl.username || parsedUrl.password
    ) continue;

    plans[planId] = Object.freeze({ months, amount, currency, productId, offerCode, checkoutUrl });
  }

  return plans;
}

function hotmartPurchaseMatches(plan, product, purchase) {
  if (!plan || !product || !purchase) return false;
  const actualProductIds = [product.id, product.ucode]
    .filter((value) => value !== undefined && value !== null)
    .map(String);
  const actualOfferCode = String(purchase.offer?.code || '');

  return (
    actualProductIds.includes(plan.productId) &&
    actualOfferCode === plan.offerCode &&
    String(purchase.status || '').toUpperCase() === 'APPROVED' &&
    amountsMatch(purchase.price?.value, plan.amount) &&
    normalizedCurrency(purchase.price?.currency_value) === plan.currency
  );
}

function hashIdentifier(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

module.exports = {
  EPAYCO_PLANS,
  amountInCents,
  amountsMatch,
  constantTimeEqual,
  epaycoValidationMatches,
  hashIdentifier,
  hotmartPurchaseMatches,
  isEpaycoApproved,
  makeEpaycoSignature,
  normalizedCurrency,
  parseHotmartPlanConfig,
};
