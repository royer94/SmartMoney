'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { applyCors } = require('../cors');

function createMockRes() {
  const headers = {};
  return {
    headers,
    set(name, value) {
      headers[name] = value;
    },
  };
}

test('applyCors allows production and local origins and sets Vary: Origin', () => {
  const res = createMockRes();
  applyCors({ headers: { origin: 'https://www.smartmoneyai.click' } }, res, 'POST, OPTIONS');
  assert.equal(res.headers['Access-Control-Allow-Origin'], 'https://www.smartmoneyai.click');
  assert.equal(res.headers['Vary'], 'Origin');
  assert.equal(res.headers['Access-Control-Allow-Methods'], 'POST, OPTIONS');
});

test('applyCors omits Access-Control-Allow-Origin for untrusted origins', () => {
  const res = createMockRes();
  applyCors({ headers: { origin: 'https://evil.example' } }, res, 'POST, OPTIONS');
  assert.equal(res.headers['Access-Control-Allow-Origin'], undefined);
  assert.equal(res.headers['Access-Control-Allow-Methods'], 'POST, OPTIONS');
});

test('applyCors respects ALLOWED_ORIGINS environment override', () => {
  const prev = process.env.ALLOWED_ORIGINS;
  process.env.ALLOWED_ORIGINS = 'https://staging.smartmoneyai.click';
  try {
    const res = createMockRes();
    applyCors({ headers: { origin: 'https://staging.smartmoneyai.click' } }, res, 'POST, OPTIONS');
    assert.equal(res.headers['Access-Control-Allow-Origin'], 'https://staging.smartmoneyai.click');
  } finally {
    if (prev === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = prev;
  }
});
