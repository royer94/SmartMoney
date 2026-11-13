import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMonthComparison } from './monthComparison.ts';
import type { Transaction } from '../types';

test('buildMonthComparison compares month-to-date up to cutoff day and full month', () => {
  const ref = new Date(2026, 10, 12, 12, 0, 0); // 12 Nov 2026
  const transactions: Transaction[] = [
    { userId: 'u1', type: 'expense', amount: 50000, category: 'Comida', description: 'Almuerzo', inputMode: 'text', timestamp: new Date(2026, 10, 5) },
    { userId: 'u1', type: 'income', amount: 200000, category: 'Salario', description: 'Pago', inputMode: 'text', timestamp: new Date(2026, 10, 10) },
    // Octubre día 6 (entra en mtd y full)
    { userId: 'u1', type: 'expense', amount: 80000, category: 'Comida', description: 'Cena', inputMode: 'text', timestamp: new Date(2026, 9, 6) },
    // Octubre día 25 (solo entra en full, no en mtd)
    { userId: 'u1', type: 'expense', amount: 120000, category: 'Transporte', description: 'Gasolina', inputMode: 'text', timestamp: new Date(2026, 9, 25) },
  ];

  const mtd = buildMonthComparison(transactions, 'mtd', ref);
  assert.equal(mtd.cutoffDay, 12);
  assert.equal(mtd.expenses.current, 50000);
  assert.equal(mtd.expenses.previous, 80000);
  assert.equal(mtd.expenses.diff, -30000);
  assert.equal(mtd.expenses.percentChange, -37);
  assert.equal(mtd.income.current, 200000);
  assert.equal(mtd.income.previous, 0);
  assert.equal(mtd.topCategories[0].category, 'Comida');

  const full = buildMonthComparison(transactions, 'full', ref);
  assert.equal(full.expenses.previous, 200000);
  assert.equal(full.expenses.diff, -150000);
  assert.equal(full.topCategories.length, 2);
});

test('buildMonthComparison handles January -> December previous year rollover', () => {
  const ref = new Date(2026, 0, 15); // 15 Jan 2026
  const res = buildMonthComparison([], 'mtd', ref);
  assert.equal(res.currentMonthIndex, 0);
  assert.equal(res.previousMonthIndex, 11);
  assert.equal(res.previousYear, 2025);
});
