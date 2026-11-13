'use strict';

const DEFAULT_ALLOWED_ORIGINS = [
  'https://www.smartmoneyai.click',
  'https://smartmoneyai.click',
  'https://gen-lang-client-0987361888.web.app',
  'https://gen-lang-client-0987361888.firebaseapp.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

function getAllowedOrigins() {
  const extra = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...extra]);
}

function applyCors(req, res, methods, headers = 'Content-Type, Authorization') {
  const origin = String(req?.headers?.origin || '').trim();
  if (origin && getAllowedOrigins().has(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
  }
  res.set('Access-Control-Allow-Methods', methods);
  res.set('Access-Control-Allow-Headers', headers);
}

module.exports = { applyCors, DEFAULT_ALLOWED_ORIGINS };
