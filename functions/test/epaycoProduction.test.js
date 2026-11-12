'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createPaymentHandlers } = require('../paymentHandlers');
const { makeEpaycoSignature } = require('../paymentSecurity');

const CONFIG = {
  EPAYCO_CUSTOMER_ID: 'unit-test-customer',
  EPAYCO_P_KEY: 'unit-test-pkey',
  EPAYCO_API_PUBLIC_KEY: 'unit-test-api-public',
  EPAYCO_API_PRIVATE_KEY: 'unit-test-api-private',
  EPAYCO_CONFIRMATION_URL: 'https://production-functions.example/epaycoWebhook',
};
const SESSION_ID = 'abcdef1234567890abcdef12';

function createHarness({ config = {}, loginOk = true, sessionOk = true } = {}) {
  const parameters = { ...CONFIG, ...config };
  const documents = { users: { 'authenticated-user': { email: 'buyer@example.test' } } };
  let nextId = 0;
  let detailResult;
  let detailLookupCalls = 0;
  let lastDetailLookup;
  const declaredParameters = [];
  const apiRequests = [];

  const parameter = (name, options = {}) => {
    declaredParameters.push(name);
    return { value: () => parameters[name] ?? options.default ?? '' };
  };
  const firestore = { FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' } };
  const admin = {
    firestore,
    auth: () => ({
      verifyIdToken: async (token) => {
        if (token !== 'valid-token') throw new Error('invalid token');
        return { uid: 'authenticated-user', email: 'token@example.test' };
      },
    }),
  };
  const db = {
    collection(name) {
      documents[name] ||= {};
      return {
        doc(id) {
          const documentId = id || String(++nextId).padStart(20, '0');
          return {
            id: documentId,
            _collection: name,
            async create(value) {
              if (documents[name][documentId] !== undefined) throw new Error('already exists');
              documents[name][documentId] = value;
            },
            async get() {
              const value = documents[name][documentId];
              return { id: documentId, exists: value !== undefined, data: () => value };
            },
            async update(value) {
              documents[name][documentId] = { ...documents[name][documentId], ...value };
            },
          };
        },
      };
    },
    async runTransaction(callback) {
      const writes = [];
      const transaction = {
        async get(ref) {
          assert.equal(writes.length, 0, 'Firestore transaction reads must precede writes');
          const value = documents[ref._collection]?.[ref.id];
          return { exists: value !== undefined, data: () => value };
        },
        create(ref, value) {
          writes.push(() => {
            documents[ref._collection] ||= {};
            if (documents[ref._collection][ref.id] !== undefined) throw new Error('already exists');
            documents[ref._collection][ref.id] = value;
          });
        },
        update(ref, value) {
          writes.push(() => {
            documents[ref._collection][ref.id] = { ...documents[ref._collection][ref.id], ...value };
          });
        },
      };
      const result = await callback(transaction);
      writes.forEach((write) => write());
      return result;
    },
  };
  const functions = { https: { onRequest: (handler) => handler }, runWith: () => functions };
  const fetchImpl = async (url, options = {}) => {
    apiRequests.push({ url, options });
    if (url === 'https://apify.epayco.co/login') {
      return {
        ok: loginOk,
        status: loginOk ? 200 : 401,
        json: async () => loginOk ? { token: 'unit-test-access-token' } : {},
      };
    }
    if (url === 'https://apify.epayco.co/payment/session/create') {
      return {
        ok: sessionOk,
        status: sessionOk ? 200 : 502,
        json: async () => sessionOk ? { success: true, data: { sessionId: SESSION_ID } } : {},
      };
    }
    return { ok: false, status: 404, json: async () => null };
  };
  const handlers = createPaymentHandlers({
    functions,
    admin,
    db,
    defineString: parameter,
    defineSecret: parameter,
    fetchImpl,
    epaycoTransactionDetailImpl: async (lookup) => {
      detailLookupCalls += 1;
      lastDetailLookup = lookup;
      return detailResult;
    },
  });
  return {
    handlers,
    documents,
    declaredParameters,
    apiRequests,
    setDetail(value) { detailResult = value; },
    getDetailLookupCalls() { return detailLookupCalls; },
    getLastDetailLookup() { return lastDetailLookup; },
  };
}

function createResponse() {
  return {
    statusCode: 200,
    payload: undefined,
    headers: {},
    set(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.payload = value; return this; },
    send(value) { this.payload = value; return this; },
  };
}

async function invoke(handler, req) {
  const res = createResponse();
  await handler(req, res);
  return res;
}

function detailFor(order, { testFlag, amount = order.amount, reference = 'ref-123' } = {}) {
  const log = {
    x_ref_payco: reference,
    x_transaction_id: 'tx-456',
    x_amount: amount,
    x_currency_code: order.currency,
    x_extra1: order.orderId,
    x_cod_response: '1',
    x_response: 'Aceptada',
  };
  if (testFlag !== undefined) log.x_test_request = testFlag;
  return {
    ok: true,
    status: 200,
    json: {
      success: true,
      data: {
        referencePayco: reference,
        amount,
        status: 'Aceptada',
        currency: order.currency,
        response: 'Aprobada',
        log,
        extras: { extra1: order.orderId },
      },
    },
  };
}

function callbackFor(order) {
  const callback = {
    x_ref_payco: 'ref-123',
    x_transaction_id: 'tx-456',
    x_amount: String(order.amount),
    x_currency_code: order.currency,
    x_extra1: order.orderId,
  };
  callback.x_signature = makeEpaycoSignature(CONFIG.EPAYCO_CUSTOMER_ID, CONFIG.EPAYCO_P_KEY, callback);
  return { method: 'POST', body: callback, headers: {} };
}

async function createOrder(harness) {
  const response = await invoke(harness.handlers.createEpaycoOrder, {
    method: 'POST',
    body: { planId: 'pro_1_month' },
    headers: { authorization: 'Bearer valid-token', origin: 'https://app.example.test' },
  });
  assert.equal(response.statusCode, 201);
  return response.payload;
}

test('production ePayco creates a server-side v2 session without sandbox mode or client credentials', async () => {
  const harness = createHarness();
  const order = await createOrder(harness);
  const sessionRequest = harness.apiRequests.find(({ url }) => url.endsWith('/payment/session/create'));
  const payload = JSON.parse(sessionRequest.options.body);

  assert.equal(harness.declaredParameters.includes('EPAYCO_TEST_MODE'), false);
  assert.equal(payload.checkout_version, '2');
  assert.equal(payload.amount, 19900);
  assert.equal(payload.currency, 'COP');
  assert.equal(payload.invoice, order.orderId);
  assert.equal(payload.extras.extra1, order.orderId);
  assert.equal(payload.confirmation, CONFIG.EPAYCO_CONFIRMATION_URL);
  assert.equal(payload.response, 'https://app.example.test/payment/response');
  assert.equal(payload.billing.email, 'buyer@example.test');
  assert.equal(order.sessionId, SESSION_ID);
  assert.equal(harness.documents.epayco_orders[order.orderId].schemaVersion, 2);
  assert.equal(harness.documents.epayco_orders[order.orderId].checkoutVersion, 2);
  assert.equal(harness.documents.epayco_orders[order.orderId].checkoutSessionId, SESSION_ID);
  assert.equal('testMode' in harness.documents.epayco_orders[order.orderId], false);
  assert.equal(JSON.stringify(order).includes(CONFIG.EPAYCO_API_PRIVATE_KEY), false);
  assert.equal(JSON.stringify(payload).includes(CONFIG.EPAYCO_API_PRIVATE_KEY), false);
});

test('production ePayco does not create an order when APIFY cannot authenticate', async () => {
  const harness = createHarness({ loginOk: false });
  const response = await invoke(harness.handlers.createEpaycoOrder, {
    method: 'POST',
    body: { planId: 'pro_1_month' },
    headers: { authorization: 'Bearer valid-token' },
  });
  assert.equal(response.statusCode, 502);
  assert.equal(Object.keys(harness.documents.epayco_orders || {}).length, 0);
});

test('production webhook grants Pro only after signed callback and authenticated live APIFY detail', async () => {
  const harness = createHarness();
  const order = await createOrder(harness);
  harness.setDetail(detailFor(order));
  const callback = callbackFor(order);
  const response = await invoke(harness.handlers.epaycoWebhook, callback);

  assert.equal(response.statusCode, 200);
  assert.equal(response.payload, 'OK');
  assert.equal(harness.getDetailLookupCalls(), 1);
  assert.deepEqual(harness.getLastDetailLookup(), {
    accessToken: 'unit-test-access-token',
    referencePayco: 'ref-123',
  });
  assert.equal(harness.documents.users['authenticated-user'].isPro, true);
  assert.equal(harness.documents.epayco_orders[order.orderId].status, 'paid');
  assert.equal('testMode' in harness.documents.epayco_orders[order.orderId], false);
  const transaction = Object.values(harness.documents.epayco_transactions)[0];
  assert.equal(transaction.status, 'success');
  assert.equal('isTest' in transaction, false);
  const expiry = harness.documents.users['authenticated-user'].proExpiresAt;
  assert.equal((await invoke(harness.handlers.epaycoWebhook, callback)).payload, 'Already processed');
  assert.equal(harness.documents.users['authenticated-user'].proExpiresAt, expiry);
});

test('production webhook rejects a provider detail explicitly marked as a test', async () => {
  const harness = createHarness();
  const order = await createOrder(harness);
  harness.setDetail(detailFor(order, { testFlag: 'TRUE' }));
  const response = await invoke(harness.handlers.epaycoWebhook, callbackFor(order));

  assert.equal(response.statusCode, 400);
  assert.equal(response.payload, 'Test transactions are not accepted');
  assert.equal(harness.documents.epayco_orders[order.orderId].status, 'pending');
  assert.equal(harness.documents.users['authenticated-user'].isPro, undefined);
});

test('production webhook rejects mismatched or unverifiable provider amounts and legacy pending orders', async () => {
  const badAmountHarness = createHarness();
  const badAmountOrder = await createOrder(badAmountHarness);
  badAmountHarness.setDetail(detailFor(badAmountOrder, { amount: '19900.001' }));
  const invalidDetail = await invoke(badAmountHarness.handlers.epaycoWebhook, callbackFor(badAmountOrder));
  assert.equal(invalidDetail.statusCode, 400);
  assert.equal(badAmountHarness.documents.users['authenticated-user'].isPro, undefined);
  assert.equal(badAmountHarness.documents.epayco_orders[badAmountOrder.orderId].status, 'pending');

  const legacyHarness = createHarness();
  const legacyOrder = await createOrder(legacyHarness);
  legacyHarness.documents.epayco_orders[legacyOrder.orderId].schemaVersion = 1;
  legacyHarness.documents.epayco_orders[legacyOrder.orderId].checkoutVersion = undefined;
  legacyHarness.setDetail(detailFor(legacyOrder));
  const legacyResponse = await invoke(legacyHarness.handlers.epaycoWebhook, callbackFor(legacyOrder));
  assert.equal(legacyResponse.statusCode, 400);
  assert.equal(legacyHarness.documents.users['authenticated-user'].isPro, undefined);
  assert.equal(legacyHarness.documents.epayco_orders[legacyOrder.orderId].status, 'pending');
});

test('production webhook checks callback signature before making an APIFY lookup', async () => {
  const harness = createHarness();
  const order = await createOrder(harness);
  harness.setDetail(detailFor(order));
  const callback = callbackFor(order);
  callback.body.x_transaction_id = 'tampered-transaction';
  const response = await invoke(harness.handlers.epaycoWebhook, callback);

  assert.equal(response.statusCode, 401);
  assert.equal(harness.getDetailLookupCalls(), 0);
  assert.equal(harness.documents.users['authenticated-user'].isPro, undefined);
});
