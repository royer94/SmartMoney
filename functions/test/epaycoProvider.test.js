'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const {
  getEpaycoTransactionDetail,
  isApprovedEpaycoDetail,
  normalizeEpaycoTransactionDetail,
} = require('../epaycoProvider');

function detailResponse(overrides = {}) {
  const data = {
    referencePayco: 'ref-123',
    amount: 19900,
    status: 'Aceptada',
    currency: 'COP',
    response: 'Aprobada',
    log: {
      x_ref_payco: 'ref-123',
      x_response: 'Aceptada',
      x_cod_response: 1,
      x_amount: 19900,
      x_transaction_id: 'tx-456',
      x_test_request: 'FALSE',
      x_currency_code: 'COP',
      x_extra1: 'abcdefghijklmnopqrst',
    },
    extras: { extra1: 'abcdefghijklmnopqrst' },
    ...overrides,
  };
  return { ok: true, status: 200, json: { success: true, data } };
}

test('APIFY detail uses the documented filter and Bearer authorization', async () => {
  let captured;
  const fakeHttps = {
    request(url, options, onResponse) {
      captured = { url, options };
      const req = new EventEmitter();
      req.setTimeout = (timeout, callback) => { captured.timeout = timeout; captured.onTimeout = callback; };
      req.destroy = (error) => req.emit('error', error);
      req.end = (body) => {
        captured.body = JSON.parse(body.toString());
        const response = new EventEmitter();
        response.statusCode = 200;
        response.setEncoding = (encoding) => { captured.encoding = encoding; };
        onResponse(response);
        queueMicrotask(() => {
          response.emit('data', JSON.stringify({ success: true }));
          response.emit('end');
        });
      };
      return req;
    },
  };

  const result = await getEpaycoTransactionDetail({
    accessToken: 'unit-test-bearer-token',
    referencePayco: 'ref-123',
    timeoutMs: 4321,
    httpsClient: fakeHttps,
  });

  assert.equal(captured.url, 'https://apify.epayco.co/transaction/detail');
  assert.equal(captured.options.method, 'GET');
  assert.equal(captured.options.headers.Authorization, 'Bearer unit-test-bearer-token');
  assert.equal(captured.body.filter.referencePayco, 'ref-123');
  assert.equal(captured.timeout, 4321);
  assert.equal(result.ok, true);
  assert.deepEqual(result.json, { success: true });
});

test('APIFY normalization binds reference, transaction, exact amount, currency and order', () => {
  const normalized = normalizeEpaycoTransactionDetail(detailResponse());
  assert.equal(normalized.x_ref_payco, 'ref-123');
  assert.equal(normalized.x_transaction_id, 'tx-456');
  assert.equal(normalized.x_amount, 19900);
  assert.equal(normalized.x_currency_code, 'COP');
  assert.equal(normalized.x_extra1, 'abcdefghijklmnopqrst');
  assert.equal(normalized.providerStatus, 'Aceptada');
  assert.equal(normalized.providerResponse, 'Aprobada');
  assert.equal(isApprovedEpaycoDetail(normalized), true);

  for (const change of [
    { referencePayco: 'other-ref' },
    { amount: '19900.001' },
    { currency: 'USD' },
    { status: 'Rechazada', response: 'Rechazada' },
    { extras: { extra1: 'other-order' } },
  ]) {
    assert.equal(normalizeEpaycoTransactionDetail(detailResponse(change)), null);
  }
  assert.equal(normalizeEpaycoTransactionDetail({ ok: false, status: 503, json: { success: true, data: {} } }), null);
  assert.equal(normalizeEpaycoTransactionDetail({ ok: true, status: 200, json: { success: false, data: {} } }), null);
});

test('provider approval requires both an accepted status and approved response', () => {
  const rejected = normalizeEpaycoTransactionDetail(detailResponse({
    status: 'Rechazada',
    response: 'Rechazada',
    log: {
      x_ref_payco: 'ref-123', x_response: 'Rechazada', x_cod_response: 2,
      x_amount: 19900, x_transaction_id: 'tx-456', x_test_request: 'FALSE',
      x_currency_code: 'COP', x_extra1: 'abcdefghijklmnopqrst',
    },
  }));
  assert.ok(rejected);
  assert.equal(isApprovedEpaycoDetail(rejected), false);
});
