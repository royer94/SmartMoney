import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractTransactionDate,
  hasKeyword,
  palabrasANumero,
  parseLocalTransaction,
} from './nlpParser.ts';

test('parseLocalTransaction parses "Ayer gasté 10,000 pesos en pan" as 10000 in Supermercado with yesterday date', () => {
  const tx = parseLocalTransaction('Ayer gasté 10,000 pesos en pan');
  assert.ok(tx);
  assert.equal(tx.type, 'expense');
  assert.equal(tx.amount, 10000);
  assert.equal(tx.category, 'Supermercado');
  assert.ok(tx.timestamp);
});

test('parseLocalTransaction parses "Me pagaron veinticinco mil de un envío." as 25000 income and does not match "ron"', () => {
  const tx = parseLocalTransaction('Me pagaron veinticinco mil de un envío.');
  assert.ok(tx);
  assert.equal(tx.type, 'income');
  assert.equal(tx.amount, 25000);
  assert.notEqual(tx.category, 'Entretenimiento');
});

test('palabrasANumero handles veinti- numbers, centenas, and ignores trailing articles', () => {
  assert.equal(palabrasANumero('veinticinco mil'), 25000);
  assert.equal(palabrasANumero('doscientos cincuenta mil'), 250000);
  assert.equal(palabrasANumero('treinta y cinco mil de un cafe'), 35000);
});

test('hasKeyword matches whole words only and avoids substring false positives', () => {
  assert.equal(hasKeyword('ayer gaste 10 000 pesos en pan', 'pan'), true);
  assert.equal(hasKeyword('me pagaron veinticinco mil', 'ron'), false);
  assert.equal(hasKeyword('compre un pantalon', 'pan'), false);
});

test('extractTransactionDate resolves ayer, antier, and hace N dias', () => {
  const ref = new Date(2026, 10, 12, 15, 0, 0);
  const ayer = extractTransactionDate('ayer gaste 5000', ref);
  assert.ok(ayer);
  assert.equal(new Date(ayer).getDate(), 11);

  const antier = extractTransactionDate('antier pague internet', ref);
  assert.ok(antier);
  assert.equal(new Date(antier).getDate(), 10);

  const hace3 = extractTransactionDate('hace 3 dias compre cafe', ref);
  assert.ok(hace3);
  assert.equal(new Date(hace3).getDate(), 9);
});

test('parseLocalTransaction parses unformatted 5-digit amounts and explicit Spanish dates', () => {
  const res = parseLocalTransaction('Gasté 25737 en luz del 8 de noviembre');
  assert.ok(res);
  assert.equal(res.type, 'expense');
  assert.equal(res.amount, 25737);
  assert.equal(res.category, 'Servicios');
  assert.equal(res.description, 'Luz');
  assert.ok(res.timestamp);
  const d = new Date(res.timestamp);
  assert.equal(d.getMonth(), 10);
  assert.equal(d.getDate(), 8);

  const resDateFirst = parseLocalTransaction('el 8 de noviembre gasté 25737 en luz');
  assert.ok(resDateFirst);
  assert.equal(resDateFirst.amount, 25737);
  assert.equal(resDateFirst.category, 'Servicios');
});
