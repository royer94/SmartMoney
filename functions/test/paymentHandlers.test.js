const test = require('node:test');
const assert = require('node:assert/strict');
const { createPaymentHandlers } = require('../paymentHandlers');
const { hashIdentifier } = require('../paymentSecurity');

function createHarness({ config = {}, users = {}, fetchImpl = async (url) => {
  if (url === 'https://apify.epayco.co/login') {
    return { ok: true, status: 200, json: async () => ({ token: 'unit-test-apify-token' }) };
  }
  if (url === 'https://apify.epayco.co/payment/session/create') {
    return { ok: true, status: 200, json: async () => ({ success: true, data: { sessionId: 'abcdef1234567890abcdef12' } }) };
  }
  return { ok: false, status: 404, json: async () => null };
} } = {}) {
  const documents = { users: { ...users } };
  let nextId = 0;
  const parameter = (name, options = {}) => ({ value: () => config[name] ?? options.default ?? '' });

  const firestore = {
    FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
    Timestamp: { fromDate: (date) => ({ toDate: () => date }) },
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
          const documentId = id || String(++nextId).padStart(20, '0');
          return {
            id: documentId,
            _collection: name,
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
  db.runTransaction = async (callback) => {
    const writes = [];
    const transaction = {
      async get(ref) { assert.equal(writes.length, 0, 'Firestore transactions must read before writing'); const value = documents[ref._collection]?.[ref.id]; return { exists: value !== undefined, data: () => value }; },
      create(ref, value) { writes.push(() => { documents[ref._collection] ||= {}; if (documents[ref._collection][ref.id] !== undefined) throw new Error('already exists'); documents[ref._collection][ref.id] = value; }); },
      update(ref, value) { writes.push(() => { documents[ref._collection][ref.id] = { ...documents[ref._collection][ref.id], ...value }; }); },
    };
    const result = await callback(transaction); writes.forEach((write) => write()); return result;
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
    fetchImpl,
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
    config: {
      EPAYCO_CUSTOMER_ID: 'customer',
      EPAYCO_P_KEY: 'private',
      EPAYCO_API_PUBLIC_KEY: 'api-public-key',
      EPAYCO_API_PRIVATE_KEY: 'api-private-key',
      EPAYCO_CONFIRMATION_URL: 'https://functions.example/epaycoWebhook',
    },
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

const monthlyConfig = { pro_1_month_usd: { months: 1, amount: 5.99, currency: 'USD', productId: '7758152', offerCode: 'wr2xnvzt', checkoutUrl: 'https://pay.hotmart.com/O105879229W?off=wr2xnvzt' } };
const initialSessionId = 'ABCDEFGHIJKLMNOPQRST';
function hotmartHarness() {
  const harness = createHarness({ config: { HOTMART_HOTTOK: 'secret', HOTMART_PLAN_CONFIG: JSON.stringify(monthlyConfig) }, users: { owner: {}, other: {} } });
  harness.documents.hotmart_sessions = { [initialSessionId]: { schemaVersion: 2, userId: 'owner', planId: 'pro_1_month_usd', months: 1, amount: 5.99, currency: 'USD', productId: '7758152', offerCode: 'wr2xnvzt', status: 'pending', expiresAt: { toDate: () => new Date(Date.now() + 60000) } } };
  return harness;
}
function hmEvent(transactionId, opts = {}) {
  const xcod = opts.xcod === undefined ? initialSessionId : opts.xcod;
  return request('POST', { id: `event-${transactionId}`, event: opts.event || 'PURCHASE_APPROVED', data: { purchase: { transaction: transactionId, status: opts.status || 'APPROVED', origin: xcod ? { xcod } : {}, offer: { code: opts.offer || 'wr2xnvzt' }, price: { value: opts.amount ?? 5.99, currency_value: opts.currency || 'USD' } }, product: { id: opts.productId || '7758152' }, subscription: { subscriber: { code: opts.subscriber || 'sub-1' }, status: 'ACTIVE' } } }, { 'x-hotmart-hottok': opts.token || 'secret' });
}
async function invoke(handler, req) { const res = createResponse(); await handler(req, res); return res; }
test('Hotmart first purchase binds subscriber and grants configured plan', async () => {
  const { handlers, documents } = hotmartHarness(); const res = await invoke(handlers.hotmartWebhook, hmEvent('first'));
  assert.equal(res.payload, 'OK'); const binding = documents.hotmart_subscriptions[hashIdentifier('7758152:sub-1')];
  assert.equal(binding.userId, 'owner'); assert.equal(binding.planId, 'pro_1_month_usd'); assert.equal(documents.hotmart_sessions[initialSessionId].status, 'paid');
});
test('Hotmart renewal needs no xcod or live session and duplicate transaction is idempotent', async () => {
  const { handlers, documents } = hotmartHarness(); await invoke(handlers.hotmartWebhook, hmEvent('first'));
  documents.hotmart_sessions[initialSessionId].expiresAt = { toDate: () => new Date(0) };
  const renewal = hmEvent('renewal', { xcod: '' }); assert.equal((await invoke(handlers.hotmartWebhook, renewal)).payload, 'OK');
  const expiry = documents.users.owner.proExpiresAt; assert.equal((await invoke(handlers.hotmartWebhook, renewal)).payload, 'Already processed');
  assert.equal(documents.users.owner.proExpiresAt, expiry); assert.equal(Object.keys(documents.hotmart_transactions).length, 2);
});
test('Hotmart initial transaction is idempotent', async () => {
  const { handlers, documents } = hotmartHarness(); const req = hmEvent('first'); await invoke(handlers.hotmartWebhook, req); const expiry = documents.users.owner.proExpiresAt;
  assert.equal((await invoke(handlers.hotmartWebhook, req)).payload, 'Already processed'); assert.equal(documents.users.owner.proExpiresAt, expiry);
});
test('Hotmart unknown subscriber cannot bind without initial session', async () => {
  const { handlers, documents } = hotmartHarness(); assert.notEqual((await invoke(handlers.hotmartWebhook, hmEvent('unknown', { xcod: '', subscriber: 'unknown' }))).payload, 'OK');
  assert.equal(Object.keys(documents.hotmart_subscriptions || {}).length, 0);
});
test('Hotmart rejects invalid HOTTOK, product, offer, amount and currency', async () => {
  const { handlers, documents } = hotmartHarness();
  for (const [i, opts] of [{ token: 'bad' }, { productId: 'wrong' }, { offer: 'wrong' }, { amount: 8 }, { currency: 'EUR' }].entries()) assert.notEqual((await invoke(handlers.hotmartWebhook, hmEvent(`bad-${i}`, opts))).payload, 'OK');
  assert.equal(documents.users.owner.proExpiresAt, undefined); assert.equal(Object.keys(documents.hotmart_subscriptions || {}).length, 0);
});
test('Hotmart non-approved events and payment statuses do not grant access', async () => {
  const { handlers, documents } = hotmartHarness(); await invoke(handlers.hotmartWebhook, hmEvent('cancel', { event: 'PURCHASE_CANCELED' })); await invoke(handlers.hotmartWebhook, hmEvent('pending', { status: 'PENDING' }));
  assert.equal(documents.users.owner.proExpiresAt, undefined); assert.equal(Object.keys(documents.hotmart_subscriptions || {}).length, 0);
});
test('Hotmart binding cannot be reassociated with another user', async () => {
  const { handlers, documents } = hotmartHarness();
  await invoke(handlers.hotmartWebhook, hmEvent('first'));
  const expiry = documents.users.owner.proExpiresAt;
  documents.hotmart_sessions.ZYXWVUTSRQPONMLKJIHG = { ...documents.hotmart_sessions[initialSessionId], userId: 'other', status: 'pending' };
  assert.notEqual((await invoke(handlers.hotmartWebhook, hmEvent('attempt', { xcod: 'ZYXWVUTSRQPONMLKJIHG' }))).payload, 'OK');
  assert.equal(documents.hotmart_subscriptions[hashIdentifier('7758152:sub-1')].userId, 'owner');
  assert.equal(documents.users.owner.proExpiresAt, expiry);
  assert.equal(documents.users.other.proExpiresAt, undefined);
  assert.equal(Object.keys(documents.hotmart_transactions).length, 1);
});

test('Hotmart renewal rejects changed offer, product, price, currency or HOTTOK without extending access', async () => {
  const { handlers, documents } = hotmartHarness();
  await invoke(handlers.hotmartWebhook, hmEvent('first'));
  const expiry = documents.users.owner.proExpiresAt;
  const invalidCases = [{ token: 'bad' }, { productId: 'wrong' }, { offer: 'wrong' }, { amount: 8 }, { currency: 'EUR' }];
  for (const [index, opts] of invalidCases.entries()) {
    assert.notEqual((await invoke(handlers.hotmartWebhook, hmEvent(`invalid-renewal-${index}`, { ...opts, xcod: '' }))).payload, 'OK');
  }
  assert.equal(documents.users.owner.proExpiresAt, expiry);
  assert.equal(Object.keys(documents.hotmart_transactions).length, 1);
});

test('Hotmart first purchase requires a pending unexpired session with the authorized terms', async () => {
  for (const changes of [
    { status: 'paid' },
    { expiresAt: { toDate: () => new Date(0) } },
    { planId: 'pro_3_months' },
    { months: 12 },
    { amount: 1 },
    { currency: 'COP' },
  ]) {
    const { handlers, documents } = hotmartHarness();
    Object.assign(documents.hotmart_sessions[initialSessionId], changes);
    assert.notEqual((await invoke(handlers.hotmartWebhook, hmEvent('invalid-first'))).payload, 'OK');
    assert.equal(documents.users.owner.proExpiresAt, undefined);
    assert.equal(Object.keys(documents.hotmart_subscriptions || {}).length, 0);
    assert.equal(Object.keys(documents.hotmart_transactions || {}).length, 0);
  }
});

test('Hotmart cannot grant an initial or renewal payment without the stable subscriber code', async () => {
  const { handlers, documents } = hotmartHarness();
  const missingInitial = hmEvent('missing-initial');
  delete missingInitial.body.data.subscription;
  assert.notEqual((await invoke(handlers.hotmartWebhook, missingInitial)).payload, 'OK');
  assert.equal(documents.users.owner.proExpiresAt, undefined);
  await invoke(handlers.hotmartWebhook, hmEvent('first'));
  const expiry = documents.users.owner.proExpiresAt;
  const missingRenewal = hmEvent('missing-renewal', { xcod: '' });
  delete missingRenewal.body.data.subscription.subscriber.code;
  assert.notEqual((await invoke(handlers.hotmartWebhook, missingRenewal)).payload, 'OK');
  assert.equal(documents.users.owner.proExpiresAt, expiry);
  assert.equal(Object.keys(documents.hotmart_transactions).length, 1);
});

test('Hotmart renewal may retain the old paid expired xcod and adds exactly one configured month', async () => {
  const { handlers, documents } = hotmartHarness();
  await invoke(handlers.hotmartWebhook, hmEvent('first'));
  const expected = new Date(documents.users.owner.proExpiresAt);
  expected.setMonth(expected.getMonth() + 1);
  documents.hotmart_sessions[initialSessionId].expiresAt = { toDate: () => new Date(0) };
  assert.equal((await invoke(handlers.hotmartWebhook, hmEvent('renewal-with-original-xcod'))).payload, 'OK');
  assert.equal(documents.users.owner.proExpiresAt, expected.toISOString());
  assert.equal(documents.users.owner.lastPaymentAmount, 5.99);
  assert.equal(documents.users.owner.lastPaymentMonths, 1);
  assert.equal(documents.hotmart_subscriptions[hashIdentifier('7758152:sub-1')].subscriberCode, undefined);
});

test('Hotmart canceled, delayed and unapproved renewals preserve only the already-paid access', async () => {
  const { handlers, documents } = hotmartHarness();
  await invoke(handlers.hotmartWebhook, hmEvent('first'));
  const expiry = documents.users.owner.proExpiresAt;
  for (const [index, opts] of [
    { event: 'PURCHASE_CANCELED' },
    { event: 'PURCHASE_DELAYED' },
    { status: 'WAITING_PAYMENT' },
  ].entries()) {
    await invoke(handlers.hotmartWebhook, hmEvent(`not-approved-${index}`, { ...opts, xcod: '' }));
  }
  assert.equal(documents.users.owner.proExpiresAt, expiry);
  assert.equal(Object.keys(documents.hotmart_transactions).length, 1);
});

test('Hotmart session uses the Firebase identity and returns only the authorized monthly checkout', async () => {
  const { handlers, documents } = createHarness({
    config: { HOTMART_HOTTOK: 'secret', HOTMART_PLAN_CONFIG: JSON.stringify(monthlyConfig) },
    users: { 'authenticated-user': {} },
  });
  const response = await invoke(handlers.createHotmartSession, request('POST', {
    planId: 'pro_1_month_usd', userId: 'victim', months: 120, amount: 0.01,
  }, { authorization: 'Bearer valid-token' }));
  assert.equal(response.statusCode, 201);
  assert.match(response.payload.sessionId, /^[A-Za-z0-9]{20}$/);
  const checkout = new URL(response.payload.url);
  assert.equal(checkout.origin + checkout.pathname, 'https://pay.hotmart.com/O105879229W');
  assert.equal(checkout.searchParams.get('off'), 'wr2xnvzt');
  assert.equal(checkout.searchParams.get('xcod'), response.payload.sessionId);
  const session = documents.hotmart_sessions[response.payload.sessionId];
  assert.equal(session.userId, 'authenticated-user');
  assert.equal(session.months, 1);
  assert.equal(session.amount, 5.99);
  assert.equal(session.currency, 'USD');
  assert.equal(session.productId, '7758152');
  assert.equal(session.offerCode, 'wr2xnvzt');
});

test('Hotmart rejects unauthenticated sessions and every unconfigured plan', async () => {
  const { handlers, documents } = createHarness({
    config: { HOTMART_HOTTOK: 'secret', HOTMART_PLAN_CONFIG: JSON.stringify(monthlyConfig) },
    users: { 'authenticated-user': {} },
  });
  assert.equal((await invoke(handlers.createHotmartSession, request('POST', { planId: 'pro_1_month_usd' }))).statusCode, 401);
  assert.equal((await invoke(handlers.createHotmartSession, request('POST', { planId: 'pro_3_months' }, { authorization: 'Bearer valid-token' }))).statusCode, 400);
  assert.equal(Object.keys(documents.hotmart_sessions || {}).length, 0);
});

test('Hotmart remains fail-closed if no authorized plan is configured', async () => {
  const { handlers, documents } = createHarness({
    config: { HOTMART_HOTTOK: 'secret', HOTMART_PLAN_CONFIG: '{}' },
    users: { 'authenticated-user': {} },
  });
  assert.equal((await invoke(handlers.createHotmartSession, request('POST', { planId: 'pro_1_month_usd' }, { authorization: 'Bearer valid-token' }))).statusCode, 503);
  assert.equal((await invoke(handlers.hotmartWebhook, hmEvent('not-configured'))).statusCode, 503);
  assert.equal(Object.keys(documents.hotmart_transactions || {}).length, 0);
});
