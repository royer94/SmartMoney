const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateUserNotifications, getLocalTimeParts } = require('../notifications');

test('daily reminder triggers at 20:00 local when user has no transactions today', () => {
  // 2026-11-12 20:00 America/Bogota = 2026-11-13T01:00:00Z
  const now = new Date('2026-11-13T01:00:00.000Z');
  const { notifications, updates } = evaluateUserNotifications({
    userId: 'user-1',
    userData: { pushEnabled: true, timezone: 'America/Bogota' },
    transactions: [],
    now,
  });

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].kind, 'daily_reminder');
  assert.equal(updates.lastDailyPushDate, '2026-11-12');
});

test('daily reminder skips when user already logged a transaction today', () => {
  const now = new Date('2026-11-13T01:00:00.000Z'); // 20:00 Bogota on Nov 12
  const { notifications } = evaluateUserNotifications({
    userId: 'user-1',
    userData: { pushEnabled: true, timezone: 'America/Bogota' },
    transactions: [
      {
        type: 'expense',
        amount: 12000,
        description: 'Pan',
        timestamp: new Date('2026-11-12T15:00:00.000Z'), // 10:00 Bogota on Nov 12
      },
    ],
    now,
  });

  assert.equal(notifications.length, 0);
});

test('weekly summary triggers on Sunday at 10:00 local with 7-day totals', () => {
  // Sunday 2026-11-15 10:00 Bogota = 2026-11-15T15:00:00Z
  const now = new Date('2026-11-15T15:00:00.000Z');
  const { notifications, updates } = evaluateUserNotifications({
    userId: 'user-1',
    userData: { pushEnabled: true, timezone: 'America/Bogota' },
    transactions: [
      { type: 'expense', amount: 50000, description: 'Mercado', timestamp: new Date('2026-11-13T16:00:00.000Z') },
      { type: 'income', amount: 200000, description: 'Bono', timestamp: new Date('2026-11-14T16:00:00.000Z') },
    ],
    now,
  });

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].kind, 'weekly_summary');
  assert.match(notifications[0].message, /2 movimientos/);
  assert.ok(updates.lastWeeklyPushWeek);
});

test('monthly summary and recurring alert trigger at 09:00 on day 1 when applicable', () => {
  // 2026-12-01 09:00 Bogota = 2026-12-01T14:00:00Z
  const now = new Date('2026-12-01T14:00:00.000Z');
  const { notifications, updates } = evaluateUserNotifications({
    userId: 'user-1',
    userData: { pushEnabled: true, timezone: 'America/Bogota' },
    transactions: [
      {
        type: 'expense',
        amount: 38900,
        description: 'Netflix',
        isRecurring: true,
        timestamp: new Date('2026-11-01T14:00:00.000Z'), // 30 days ago
      },
      {
        type: 'income',
        amount: 3000000,
        description: 'Salario',
        timestamp: new Date('2026-11-15T14:00:00.000Z'),
      },
    ],
    now,
  });

  const kinds = notifications.map((n) => n.kind);
  assert.deepEqual(kinds, ['monthly_summary', 'recurring_alert']);
  assert.equal(updates.lastMonthlyPushMonth, '2026-12');
  assert.equal(updates.lastRecurringPushDate, '2026-12-01');
});

test('pushEnabled false disables all notifications and invalid timezone falls back safely', () => {
  const now = new Date('2026-11-13T01:00:00.000Z');
  const res = evaluateUserNotifications({
    userId: 'user-1',
    userData: { pushEnabled: false, timezone: 'Invalid/Zone' },
    transactions: [],
    now,
  });
  assert.equal(res.notifications.length, 0);
  const parts = getLocalTimeParts(now, 'Invalid/Zone');
  assert.equal(parts.dateKey, '2026-11-12');
});
