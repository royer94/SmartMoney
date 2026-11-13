import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFinancialInsights } from './financialInsights.ts';
import type { Goal, Transaction } from '../types.ts';

const baseNow = new Date('2026-11-15T12:00:00-05:00'); // 15 of 30 days -> 2x projection

test('buildFinancialInsights analyzes expenses even without income in current month', () => {
  const txs: Transaction[] = [
    {
      id: '1',
      userId: 'u1',
      amount: 150000,
      category: 'Café',
      description: 'Café diario',
      type: 'expense',
      inputMode: 'text',
      timestamp: '2026-11-10T10:00:00-05:00',
    },
    {
      id: '2',
      userId: 'u1',
      amount: 50000,
      category: 'Suscripciones',
      description: 'Streaming',
      type: 'expense',
      inputMode: 'text',
      isRecurring: true,
      timestamp: '2026-11-05T10:00:00-05:00',
    },
  ];

  const result = buildFinancialInsights(txs, [], 'COP', baseNow);

  assert.equal(result.hasData, true);
  assert.match(result.markdown, /aún sin ingresos registrados este mes/);
  assert.match(result.markdown, /Proyección de gasto a fin de mes/);
  assert.match(result.markdown, /Suscripciones y recurrentes/);
  assert.match(result.markdown, /Café/);
});

test('buildFinancialInsights detects category excesses, recurring share, previous month comparison, and budget', () => {
  const txs: Transaction[] = [
    {
      id: '1',
      userId: 'u1',
      amount: 2000,
      category: 'Salario',
      description: 'Nómina',
      type: 'income',
      inputMode: 'text',
      timestamp: '2026-11-01T10:00:00-05:00',
    },
    {
      id: '2',
      userId: 'u1',
      amount: 200,
      category: 'Café',
      description: 'Cafetería',
      type: 'expense',
      inputMode: 'text',
      timestamp: '2026-11-08T10:00:00-05:00',
    },
    {
      id: '3',
      userId: 'u1',
      amount: 120,
      category: 'Suscripciones',
      description: 'SaaS',
      type: 'expense',
      inputMode: 'text',
      isRecurring: true,
      timestamp: '2026-11-03T10:00:00-05:00',
    },
    {
      id: '4',
      userId: 'u1',
      amount: 500,
      category: 'Comida',
      description: 'Mercado octubre',
      type: 'expense',
      inputMode: 'text',
      timestamp: '2026-10-12T10:00:00-05:00',
    },
  ];

  const goals: Goal[] = [
    {
      id: 'g1',
      userId: 'u1',
      name: 'Presupuesto Noviembre',
      category: 'Todas',
      targetAmount: 1000,
      currentAmount: 320,
      month: 11,
      year: 2026,
    },
  ];

  const result = buildFinancialInsights(txs, goals, 'USD', baseNow);

  assert.equal(result.hasData, true);
  assert.equal(result.alertCount, 2); // Café (10% > 5%) + Suscripciones (6% > 5%)
  assert.match(result.headline, /Ahorro: 84%/);
  assert.match(result.markdown, /Café/);
  assert.match(result.markdown, /Suscripciones/);
  assert.match(result.markdown, /Comparativa mensual/);
  assert.match(result.markdown, /Presupuesto/);
  assert.match(result.promptSummary, /Moneda: USD/);
});
