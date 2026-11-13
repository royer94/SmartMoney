// functions/notifications.js
const { applyCors } = require('./cors');

const DEFAULT_ONESIGNAL_APP_ID = '17df480f-051d-4435-ae54-903ef143d099';
const DEFAULT_TIMEZONE = 'America/Bogota';
const DEFAULT_APP_URL = 'https://www.smartmoneyai.click';

const MONTH_NAMES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const DAILY_REMINDER_VARIANTS = [
  {
    title: '🌙 ¿Ya registraste tus gastos hoy?',
    message: 'Tómate 10 segundos para anotar o dictar tus movimientos del día en SmartMoney.',
  },
  {
    title: '💸 Cierra tu día con claridad',
    message: '¿Tuviste algún gasto hoy? Regístralo rápido por voz o texto antes de dormir.',
  },
  {
    title: '📝 Mantén tu racha financiera',
    message: 'Anota los gastos de hoy en SmartMoney y mantén tu presupuesto bajo control.',
  },
];

function formatMoneyCOP(amount) {
  const rounded = Math.round(Number(amount) || 0);
  return `$${rounded.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

function toJsDate(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (ts instanceof Date) return ts;
  if (typeof ts.seconds === 'number') return new Date(ts.seconds * 1000);
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getLocalTimeParts(date, timeZone = DEFAULT_TIMEZONE) {
  const safeTz = typeof timeZone === 'string' && timeZone.trim() ? timeZone.trim() : DEFAULT_TIMEZONE;
  let formatter;
  try {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: safeTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      hourCycle: 'h23',
    });
  } catch {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: DEFAULT_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      hourCycle: 'h23',
    });
  }

  const parts = formatter.formatToParts(date);
  const map = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }

  const year = Number(map.year);
  const month = Number(map.month);
  const day = Number(map.day);
  const hour = Number(map.hour) % 24;
  const weekday = map.weekday; // 'Sun', 'Mon', ...
  const dateKey = `${map.year}-${map.month}-${map.day}`;
  const monthKey = `${map.year}-${map.month}`;

  // ISO-like week identifier using local date
  const utcDay = new Date(Date.UTC(year, month - 1, day));
  const dayNum = utcDay.getUTCDay() || 7;
  utcDay.setUTCDate(utcDay.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utcDay.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((utcDay - yearStart) / 86400000 + 1) / 7);
  const weekKey = `${utcDay.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;

  return { year, month, day, hour, weekday, dateKey, monthKey, weekKey };
}

function pickDailyReminderCopy(dateKey) {
  const numericSeed = Number(String(dateKey).replace(/\D/g, '')) || 0;
  return DAILY_REMINDER_VARIANTS[numericSeed % DAILY_REMINDER_VARIANTS.length];
}

function evaluateUserNotifications({ userId, userData, transactions, now = new Date() }) {
  if (!userData || userData.pushEnabled !== true) {
    return { notifications: [], updates: {} };
  }

  const prefs = userData.notificationPrefs || {};
  const tz = userData.timezone || DEFAULT_TIMEZONE;
  const local = getLocalTimeParts(now, tz);
  const notifications = [];
  const updates = {};

  const dailyHour =
    Number.isInteger(prefs.dailyReminderHour) && prefs.dailyReminderHour >= 0 && prefs.dailyReminderHour <= 23
      ? prefs.dailyReminderHour
      : 20;

  // 1. Recordatorio diario al final del día (solo si no registró nada hoy)
  if (prefs.dailyReminder !== false && local.hour === dailyHour && userData.lastDailyPushDate !== local.dateKey) {
    const loggedToday = transactions.some((tx) => {
      if (tx.deleted) return false;
      const txDate = toJsDate(tx.timestamp);
      if (!txDate) return false;
      return getLocalTimeParts(txDate, tz).dateKey === local.dateKey;
    });

    if (!loggedToday) {
      const copy = pickDailyReminderCopy(local.dateKey);
      notifications.push({
        kind: 'daily_reminder',
        title: copy.title,
        message: copy.message,
        data: { type: 'daily_reminder', userId },
      });
      updates.lastDailyPushDate = local.dateKey;
    }
  }

  // 2. Resumen semanal (domingos a las 10:00 AM hora local)
  if (
    prefs.weeklySummary !== false &&
    local.weekday === 'Sun' &&
    local.hour === 10 &&
    userData.lastWeeklyPushWeek !== local.weekKey
  ) {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    let weekExpenses = 0;
    let weekIncome = 0;
    let count = 0;

    for (const tx of transactions) {
      if (tx.deleted) continue;
      const txDate = toJsDate(tx.timestamp);
      if (!txDate || txDate < sevenDaysAgo || txDate > now) continue;
      count += 1;
      if (tx.type === 'expense') weekExpenses += Number(tx.amount) || 0;
      if (tx.type === 'income') weekIncome += Number(tx.amount) || 0;
    }

    notifications.push({
      kind: 'weekly_summary',
      title: '📊 Tu resumen semanal en SmartMoney',
      message:
        count > 0
          ? `Esta semana registraste ${formatMoneyCOP(weekExpenses)} en gastos y ${formatMoneyCOP(weekIncome)} en ingresos (${count} movimientos).`
          : 'No registraste movimientos esta semana. Ponte al día en 1 minuto en SmartMoney.',
      data: { type: 'weekly_summary', userId },
    });
    updates.lastWeeklyPushWeek = local.weekKey;
  }

  // 3. Cierre mensual (día 1 de cada mes a las 9:00 AM hora local)
  if (
    prefs.monthlySummary !== false &&
    local.day === 1 &&
    local.hour === 9 &&
    userData.lastMonthlyPushMonth !== local.monthKey
  ) {
    const prevMonth = local.month === 1 ? 12 : local.month - 1;
    const prevYear = local.month === 1 ? local.year - 1 : local.year;
    const prevMonthKey = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    const prevMonthName = MONTH_NAMES_ES[prevMonth - 1];

    let monthExpenses = 0;
    let monthIncome = 0;
    for (const tx of transactions) {
      if (tx.deleted) continue;
      const txDate = toJsDate(tx.timestamp);
      if (!txDate) continue;
      if (getLocalTimeParts(txDate, tz).monthKey === prevMonthKey) {
        if (tx.type === 'expense') monthExpenses += Number(tx.amount) || 0;
        if (tx.type === 'income') monthIncome += Number(tx.amount) || 0;
      }
    }

    const balance = monthIncome - monthExpenses;
    notifications.push({
      kind: 'monthly_summary',
      title: `📅 Cierre de ${prevMonthName}`,
      message: `Ingresos: ${formatMoneyCOP(monthIncome)} · Gastos: ${formatMoneyCOP(monthExpenses)} · Balance: ${formatMoneyCOP(balance)}.`,
      data: { type: 'monthly_summary', userId },
    });
    updates.lastMonthlyPushMonth = local.monthKey;
  }

  // 4. Alerta de cobro recurrente próximo (9:00 AM hora local, ~29-31 días después del último cobro)
  if (prefs.recurringAlerts !== false && local.hour === 9 && userData.lastRecurringPushDate !== local.dateKey) {
    const recurringExpenses = transactions.filter((tx) => !tx.deleted && tx.type === 'expense' && tx.isRecurring);
    const dueCandidate = recurringExpenses.find((tx) => {
      const txDate = toJsDate(tx.timestamp);
      if (!txDate) return false;
      const diffDays = (now.getTime() - txDate.getTime()) / 86400000;
      if (diffDays < 29 || diffDays > 31) return false;

      // Verificar si ya se registró uno parecido en los últimos 20 días
      const descNorm = String(tx.description || '').toLowerCase().trim().slice(0, 8);
      const alreadyLoggedRecently = recurringExpenses.some((other) => {
        const otherDate = toJsDate(other.timestamp);
        if (!otherDate) return false;
        const ageDays = (now.getTime() - otherDate.getTime()) / 86400000;
        return ageDays < 20 && String(other.description || '').toLowerCase().trim().slice(0, 8) === descNorm;
      });
      return !alreadyLoggedRecently;
    });

    if (dueCandidate) {
      notifications.push({
        kind: 'recurring_alert',
        title: '🔔 Posible cobro recurrente hoy',
        message: `Tu suscripción "${dueCandidate.description}" (${formatMoneyCOP(dueCandidate.amount)}) suele cobrarse por estas fechas.`,
        data: { type: 'recurring_alert', userId },
      });
      updates.lastRecurringPushDate = local.dateKey;
    }
  }

  return { notifications, updates };
}

async function sendOneSignalPush({
  appId = DEFAULT_ONESIGNAL_APP_ID,
  restApiKey,
  externalUserIds,
  title,
  message,
  url = DEFAULT_APP_URL,
  data = {},
}) {
  if (!restApiKey) {
    throw new Error('ONESIGNAL_REST_API_KEY no configurada en el servidor');
  }
  if (!Array.isArray(externalUserIds) || externalUserIds.length === 0) {
    return { skipped: true };
  }

  const response = await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${restApiKey}`,
    },
    body: JSON.stringify({
      app_id: appId,
      target_channel: 'push',
      include_aliases: {
        external_id: externalUserIds,
      },
      headings: { es: title, en: title },
      contents: { es: message, en: message },
      url,
      data,
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errMsg = Array.isArray(result.errors) ? result.errors.join(', ') : result.error || `HTTP ${response.status}`;
    throw new Error(`OneSignal API error: ${errMsg}`);
  }
  return result;
}

function createNotificationHandlers({ functions, admin, db, defineSecret }) {
  const oneSignalRestApiKey = defineSecret('ONESIGNAL_REST_API_KEY');
  const appId = process.env.ONESIGNAL_APP_ID || DEFAULT_ONESIGNAL_APP_ID;

  const dispatchScheduledNotifications = functions
    .runWith({ secrets: [oneSignalRestApiKey] })
    .pubsub.schedule('0 * * * *')
    .timeZone('UTC')
    .onRun(async () => {
      const restApiKey = oneSignalRestApiKey.value() || process.env.ONESIGNAL_REST_API_KEY;
      if (!restApiKey) {
        console.warn('[OneSignal] ONESIGNAL_REST_API_KEY no configurada; omitiendo envío programado.');
        return null;
      }

      const now = new Date();
      const lookbackDate = new Date(now.getTime() - 45 * 86400000);
      const usersSnap = await db.collection('users').where('pushEnabled', '==', true).get();

      let sentCount = 0;
      for (const userDoc of usersSnap.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data() || {};

        const txSnap = await db
          .collection('transactions')
          .where('userId', '==', userId)
          .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(lookbackDate))
          .get();

        const transactions = txSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const { notifications, updates } = evaluateUserNotifications({
          userId,
          userData,
          transactions,
          now,
        });

        for (const notif of notifications) {
          try {
            await sendOneSignalPush({
              appId,
              restApiKey,
              externalUserIds: [userId],
              title: notif.title,
              message: notif.message,
              data: notif.data,
            });
            sentCount += 1;
          } catch (err) {
            console.error(`[OneSignal] Error enviando ${notif.kind} a ${userId}:`, err.message);
          }
        }

        if (Object.keys(updates).length > 0) {
          await userDoc.ref.update(updates).catch((err) => {
            console.error(`[OneSignal] Error actualizando estado push de ${userId}:`, err.message);
          });
        }
      }

      console.log(`[OneSignal] Ciclo completado. Usuarios revisados: ${usersSnap.size}, notificaciones enviadas: ${sentCount}`);
      return null;
    });

  const sendTestPush = functions
    .runWith({ secrets: [oneSignalRestApiKey] })
    .https.onRequest(async (req, res) => {
      applyCors(req, res, 'POST, OPTIONS');

      if (req.method === 'OPTIONS') {
        return res.status(204).send('');
      }
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
      }

      try {
        const authHeader = req.headers.authorization || '';
        if (!authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'No autorizado' });
        }
        const idToken = authHeader.slice(7).trim();
        const decodedToken = await admin.auth().verifyIdToken(idToken);

        const restApiKey = oneSignalRestApiKey.value() || process.env.ONESIGNAL_REST_API_KEY;
        if (!restApiKey) {
          return res.status(503).json({ error: 'ONESIGNAL_REST_API_KEY no configurada en el servidor' });
        }

        const result = await sendOneSignalPush({
          appId,
          restApiKey,
          externalUserIds: [decodedToken.uid],
          title: '🔔 ¡Notificaciones activas en SmartMoney!',
          message: 'Todo listo. Te avisaremos al final del día si te falta registrar algún gasto.',
          data: { type: 'test_push', userId: decodedToken.uid },
        });

        return res.status(200).json({ ok: true, id: result.id || null });
      } catch (error) {
        console.error('[OneSignal] Error en sendTestPush:', error);
        return res.status(500).json({ error: error.message || 'Error enviando notificación de prueba' });
      }
    });

  return { dispatchScheduledNotifications, sendTestPush };
}

module.exports = {
  DEFAULT_ONESIGNAL_APP_ID,
  formatMoneyCOP,
  getLocalTimeParts,
  pickDailyReminderCopy,
  evaluateUserNotifications,
  sendOneSignalPush,
  createNotificationHandlers,
};
