const test = require('node:test');
const assert = require('node:assert/strict');
const {
  EPAYCO_PLANS,
  constantTimeEqual,
  exactAmountsMatch,
  epaycoValidationMatches,
  hotmartPurchaseMatches,
  isEpaycoTestTransaction,
  isEpaycoApproved,
  makeEpaycoSignature,
  parseHotmartPlanConfig,
} = require('../paymentSecurity');

test('ePayco plan catalog contains only server-approved prices and durations', () => {
  assert.deepEqual(Object.values(EPAYCO_PLANS).map(({ months, amount, currency }) => [months, amount, currency]), [
    [1, 19900, 'COP'],
    [3, 56700, 'COP'],
    [6, 101400, 'COP'],
    [12, 166800, 'COP'],
  ]);
});

test('ePayco signature is checked without accepting a changed signed field', () => {
  const transaction = {
    x_ref_payco: 'ref-123',
    x_transaction_id: 'tx-456',
    x_amount: '19900',
    x_currency_code: 'COP',
  };
  const signature = makeEpaycoSignature('customer', 'private-key', transaction);
  assert.equal(constantTimeEqual(signature, signature), true);
  assert.equal(constantTimeEqual(signature, makeEpaycoSignature('customer', 'private-key', {
    ...transaction,
    x_amount: '1',
  })), false);
  assert.equal(constantTimeEqual(signature, 'short'), false);
});

test('ePayco validation result must match the callback and server-created order', () => {
  const order = { id: 'server-order-1', amount: 19900, currency: 'COP' };
  const callback = {
    x_ref_payco: 'ref-123',
    x_transaction_id: 'tx-456',
    x_amount: '19900.00',
    x_currency_code: 'cop',
    x_extra1: 'server-order-1',
  };
  const providerData = {
    x_ref_payco: 'ref-123',
    x_transaction_id: 'tx-456',
    x_amount: '19900',
    x_currency_code: 'COP',
    x_extra1: 'server-order-1',
  };

  assert.equal(epaycoValidationMatches(order, callback, providerData), true);
  assert.equal(epaycoValidationMatches(order, callback, { ...providerData, x_extra1: 'another-order' }), false);
  assert.equal(epaycoValidationMatches(order, callback, { ...providerData, x_amount: '20000' }), false);
  assert.equal(epaycoValidationMatches(order, callback, { ...providerData, x_transaction_id: 'other-tx' }), false);
  assert.equal(epaycoValidationMatches(order, { ...callback, x_currency_code: 'USD' }, providerData), false);
});

test('ePayco production comparisons are exact and test detection is opt-in', () => {
  assert.equal(exactAmountsMatch('019900.000', 19900), true);
  assert.equal(exactAmountsMatch('19900.001', 19900), false);
  assert.equal(exactAmountsMatch('1e4', 10000), false);
  assert.equal(isEpaycoTestTransaction({ x_test_request: ' TRUE ' }), true);
  assert.equal(isEpaycoTestTransaction({ x_test_request: 'FALSE' }), false);
  assert.equal(isEpaycoTestTransaction({}), false);
});

test('only an explicitly approved ePayco transaction can grant access', () => {
  assert.equal(isEpaycoApproved({ x_cod_response: '1' }), true);
  assert.equal(isEpaycoApproved({ x_response: 'Aceptada' }), true);
  assert.equal(isEpaycoApproved({ x_response: 'Pendiente', x_cod_response: '2' }), false);
  assert.equal(isEpaycoApproved({}), false);
});

test('Hotmart plan config rejects malformed or non-HTTPS/non-Hotmart checkout entries', () => {
  assert.deepEqual(parseHotmartPlanConfig('not-json'), {});
  assert.deepEqual(parseHotmartPlanConfig(JSON.stringify({ bad: {
    months: 2,
    amount: 10,
    currency: 'USD',
    productId: 'p-1',
    offerCode: 'offer-1',
    checkoutUrl: 'https://pay.hotmart.com/p-1',
  } })), {});
  assert.deepEqual(parseHotmartPlanConfig(JSON.stringify({ monthly: {
    months: 1,
    amount: 10,
    currency: 'USD',
    productId: 'p-1',
    offerCode: 'offer-1',
    checkoutUrl: 'https://evil.example/p-1',
  } })), {});
});

test('Hotmart grants require the configured product, offer, approved status, amount and currency', () => {
  const plans = parseHotmartPlanConfig(JSON.stringify({ pro_1_month: {
    months: 1,
    amount: 5.99,
    currency: 'USD',
    productId: 'O105879229W',
    offerCode: 'OFFER-1',
    checkoutUrl: 'https://pay.hotmart.com/O105879229W',
  } }));
  const plan = plans.pro_1_month;
  const product = { id: 'O105879229W' };
  const purchase = {
    status: 'APPROVED',
    offer: { code: 'OFFER-1' },
    price: { value: 5.99, currency_value: 'USD' },
  };

  assert.ok(plan);
  assert.equal(hotmartPurchaseMatches(plan, product, purchase), true);
  assert.equal(hotmartPurchaseMatches(plan, { id: 'wrong-product' }, purchase), false);
  assert.equal(hotmartPurchaseMatches(plan, product, { ...purchase, offer: { code: 'wrong-offer' } }), false);
  assert.equal(hotmartPurchaseMatches(plan, product, { ...purchase, price: { value: 99, currency_value: 'USD' } }), false);
  assert.equal(hotmartPurchaseMatches(plan, product, { ...purchase, price: { value: 5.99, currency_value: 'EUR' } }), false);
  assert.equal(hotmartPurchaseMatches(plan, product, { ...purchase, status: 'WAITING_PAYMENT' }), false);
});
