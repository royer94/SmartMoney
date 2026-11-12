'use strict';

const https = require('node:https');
const { exactAmountsMatch, normalizedCurrency } = require('./paymentSecurity');

const TRANSACTION_DETAIL_URL = 'https://apify.epayco.co/transaction/detail';
const MAX_RESPONSE_BYTES = 1024 * 1024;
const APPROVED_DETAIL_STATUSES = new Set(['aceptada', 'accepted', 'approved']);
const APPROVED_DETAIL_RESPONSES = new Set(['aprobada', 'accepted', 'approved']);

function getEpaycoTransactionDetail({ accessToken, referencePayco, timeoutMs = 10000, httpsClient = https }) {
  if (!accessToken || !referencePayco) {
    return Promise.reject(new Error('ePayco transaction detail credentials are incomplete'));
  }

  const requestBody = Buffer.from(JSON.stringify({
    filter: { referencePayco: String(referencePayco) },
  }));

  return new Promise((resolve, reject) => {
    let settled = false;
    let receivedBytes = 0;
    const chunks = [];
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    const request = httpsClient.request(TRANSACTION_DETAIL_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Content-Length': requestBody.length,
        Authorization: `Bearer ${accessToken}`,
      },
    }, (response) => {
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        receivedBytes += Buffer.byteLength(chunk);
        if (receivedBytes > MAX_RESPONSE_BYTES) {
          request.destroy(new Error('ePayco transaction detail response is too large'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('error', fail);
      response.on('aborted', () => fail(new Error('ePayco transaction detail response was interrupted')));
      response.on('end', () => {
        if (settled) return;
        let json = null;
        try {
          json = JSON.parse(chunks.join(''));
        } catch {
          // An invalid or empty response remains unverified and is rejected by the caller.
        }
        settled = true;
        const status = Number(response.statusCode || 0);
        resolve({ ok: status >= 200 && status < 300, status, json });
      });
    });

    request.on('error', fail);
    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error('ePayco transaction detail request timed out'));
    });
    request.end(requestBody);
  });
}

function normalizeEpaycoTransactionDetail(response) {
  if (!response?.ok || response.status < 200 || response.status >= 300 || response.json?.success !== true) return null;

  const detail = response.json.data;
  const log = detail?.log;
  const extras = detail?.extras;
  if (!detail || typeof detail !== 'object' || !log || typeof log !== 'object' || !extras || typeof extras !== 'object') return null;

  const reference = String(log.x_ref_payco ?? '').trim();
  const detailReference = String(detail.referencePayco ?? '').trim();
  const transactionId = String(log.x_transaction_id ?? '').trim();
  const logOrderId = String(log.x_extra1 ?? '').trim();
  const extraOrderId = String(extras.extra1 ?? '').trim();
  const logCurrency = normalizedCurrency(log.x_currency_code);
  const detailCurrency = normalizedCurrency(detail.currency);
  const logResponse = String(log.x_response ?? '').trim().toLowerCase();
  const detailStatus = String(detail.status ?? '').trim().toLowerCase();
  const detailResponse = String(detail.response ?? '').trim().toLowerCase();

  if (
    !reference || reference !== detailReference || !transactionId ||
    !exactAmountsMatch(log.x_amount, detail.amount) ||
    !logCurrency || logCurrency !== detailCurrency ||
    !logOrderId || logOrderId !== extraOrderId ||
    !logResponse || !detailStatus || logResponse !== detailStatus || !detailResponse
  ) return null;

  return {
    ...log,
    x_ref_payco: reference,
    x_transaction_id: transactionId,
    x_extra1: extraOrderId,
    providerStatus: detail.status,
    providerResponse: detail.response,
  };
}

function isApprovedEpaycoDetail(transaction) {
  if (!transaction) return false;
  const status = String(transaction.providerStatus ?? '').trim().toLowerCase();
  const response = String(transaction.providerResponse ?? '').trim().toLowerCase();
  return APPROVED_DETAIL_STATUSES.has(status) && APPROVED_DETAIL_RESPONSES.has(response);
}

module.exports = {
  getEpaycoTransactionDetail,
  isApprovedEpaycoDetail,
  normalizeEpaycoTransactionDetail,
};
