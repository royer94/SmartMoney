const test = require('node:test');
const assert = require('node:assert/strict');
const { createPaymentHandlers } = require('../paymentHandlers');

function createHarness({ config = {}, users = {} } = {}) {
  const documents = { users: { ...users } };
  let nextId = 0;
  const parameter = (name, options = {}) => ({ value: () => config[name] ?? options.default ?? '' });

  const firestore = {
    FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
    Timestamp: { fromDate: (date) => date },
  };
  const admin = {
    firestore,
    auth: () => ({
      verifyIdToken: async (token) => {
        if (token !== 'valid-token') throw new Error('invalid token');
        return { uid: 'authenticated-user' };
      },
    }),
  };
  const db = {
    collection(name) {
      documents[name] ||= {};
      return {
        doc(id) {
          const documentId = id || `generated-${++nextId}`;
          return {
            id: documentId,
            async create(value) {
              if (documents[name][documentId]) throw new Error('already exists');
              documents[name][documentId] = value;
            },
            async get() {
              const value = documents[name][documentId];
              return { exists: value !== undefined, data: () => value };
            },
            async update(value) {
              documents[name][documentId] = { ...documents[name][documentId], ...value };
            },
          };
        },
      };
    },
  };
  const functions = {
    https: { onRequest: (handler) => handler },
    runWith: () => functions,
  };
  const handlers = createPaymentHandlers({
    functions,
    admin,
    db,
    defineString: parameter,
    defineSecret: (name) => parameter(name),
  });

  return { handlers, documents };
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

function request(method, body = {}, headers = {}) {
  return { method, body, headers };
}

test('ePayco order requires a Firebase ID token and ignores client-supplied UID/months', async () => {
  const { handlers, documents } = createHarness({
    config: { EPAYCO_CUSTOMER_ID: 'customer', EPAYCO_P_KEY: 'private' },
    users: { 'authenticated-user': { email: 'owner@example.test' } },
  });

  const unauthenticated = createResponse();
  await handlers.createEpaycoOrder(request('POST', {
    planId: 'pro_1_month',
    userId: 'victim-user',
    months: 120,
  }), unauthenticated);
  assert.equal(unauthenticated.statusCode, 401);
  assert.equal(Object.keys(documents.epayco_orders || {}).length, 0);

  const authenticated = createResponse();
  await handlers.createEpaycoOrder(request('POST', {
    planId: 'pro_3_months',
    userId: 'victim-user',
    months: 120,
  }, { authorization: 'Bearer valid-token' }), authenticated);

  assert.equal(authenticated.statusCode, 201);
  assert.equal(authenticated.payload.amount, 56700);
  assert.equal(authenticated.payload.planId, 'pro_3_months');
  const [order] = Object.values(documents.epayco_orders);
  assert.equal(order.userId, 'authenticated-user');
  assert.equal(order.months, 3);
  assert.equal(order.amount, 56700);
});

test('ePayco order fails closed when provider credentials are missing', async () => {
  const { handlers, documents } = createHarness({
    users: { 'authenticated-user': { email: 'owner@example.test' } },
  });
  const response = createResponse();

  await handlers.createEpaycoOrder(request('POST', { planId: 'pro_1_month' }, {
    authorization: 'Bearer valid-token',
  }), response);

  assert.equal(response.statusCode, 503);
  assert.equal(Object.keys(documents.epayco_orders || {}).length, 0);
});

test('Hotmart webhook does not accept a Hottok supplied in the request body', async () => {
  const { handlers } = createHarness({
    config: {
      HOTMART_HOTTOK: 'configured-secret',
      HOTMART_PLAN_CONFIG: JSON.stringify({
        monthly: {
          months: 1,
          amount: 5.99,
          currency: 'USD',
          productId: 'product-1',
          offerCode: 'offer-1',
          checkoutUrl: 'https://pay.hotmart.com/product-1',
        },
      }),
    },
  });
  const response = createResponse();

  await handlers.hotmartWebhook(request('POST', {
    hottok: 'configured-secret',
    event: 'PURCHASE_APPROVED',
    data: {},
  }), response);

  assert.equal(response.statusCode, 401);
  assert.equal(response.payload, 'Invalid Hottok');
});

test('Hotmart session cannot be created through the legacy public GET route', async () => {
  const { handlers } = createHarness({
    config: { HOTMART_HOTTOK: 'configured-secret' },
    users: { 'victim-user': { email: 'victim@example.test' } },
  });
  const response = createResponse();

  await handlers.createHotmartSession({
    method: 'GET',
    query: { userId: 'victim-user', months: '120' },
    headers: {},
  }, response);

  assert.equal(response.statusCode, 405);
});
