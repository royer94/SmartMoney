// services/paymentService.ts

const PAYMENT_FUNCTIONS_BASE_URL = 'https://us-central1-gen-lang-client-0987361888.cloudfunctions.net';

export interface EpaycoOrder {
  orderId: string;
  sessionId: string;
  planId: string;
  amount: number;
  currency: 'COP';
  label: string;
}

export const createEpaycoOrder = async (planId: string, idToken: string): Promise<EpaycoOrder> => {
  const response = await fetch(`${PAYMENT_FUNCTIONS_BASE_URL}/createEpaycoOrder`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ planId }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || 'No se pudo crear la orden ePayco');
  }
  if (
    typeof result.orderId !== 'string' || !/^[A-Za-z0-9]{20}$/.test(result.orderId) ||
    typeof result.sessionId !== 'string' || !/^[A-Za-z0-9]{20,64}$/.test(result.sessionId) ||
    typeof result.planId !== 'string' || !Number.isFinite(result.amount) ||
    result.currency !== 'COP' || typeof result.label !== 'string'
  ) {
    throw new Error('La sesión de checkout ePayco recibida no es válida');
  }
  return result as EpaycoOrder;
};

export const openEpaycoCheckout = (data: { sessionId: string }) => {
  if (typeof data.sessionId !== 'string' || !/^[A-Za-z0-9]{20,64}$/.test(data.sessionId)) {
    throw new Error('La sesión de checkout ePayco no es válida');
  }
  const epayco = (window as any).ePayco;
  if (!epayco?.checkout?.configure) {
    throw new Error('El checkout de ePayco no está disponible');
  }

  const checkout = epayco.checkout.configure({
    sessionId: data.sessionId,
    type: 'standard',
  });
  if (!checkout?.open) throw new Error('El checkout de ePayco no está disponible');
  checkout.open();
};

// Solo esta oferta Hotmart está autorizada; el servidor determina sus condiciones.
export const HOTMART_MONTHLY_PLAN = {
  id: 'pro_1_month_usd',
  months: 1,
  amount: 5.99,
  currency: 'USD',
} as const;

export interface HotmartSession {
  url: string;
  sessionId: string;
  expiresAt: string;
}

export const createHotmartSession = async (idToken: string): Promise<HotmartSession> => {
  const response = await fetch(`${PAYMENT_FUNCTIONS_BASE_URL}/createHotmartSession`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ planId: HOTMART_MONTHLY_PLAN.id }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || 'No se pudo crear la sesión Hotmart');
  }
  if (
    typeof result.url !== 'string' ||
    typeof result.sessionId !== 'string' || !/^[A-Za-z0-9]{20}$/.test(result.sessionId) ||
    typeof result.expiresAt !== 'string' ||
    !Number.isFinite(Date.parse(result.expiresAt)) || Date.parse(result.expiresAt) <= Date.now()
  ) {
    throw new Error('La sesión Hotmart recibida no es válida');
  }
  const checkoutUrl = new URL(result.url);
  if (
    checkoutUrl.origin !== 'https://pay.hotmart.com' ||
    checkoutUrl.pathname !== '/O105879229W' ||
    checkoutUrl.username || checkoutUrl.password ||
    checkoutUrl.searchParams.get('off') !== 'wr2xnvzt' ||
    checkoutUrl.searchParams.get('xcod') !== result.sessionId
  ) {
    throw new Error('El checkout recibido no coincide con la oferta mensual autorizada');
  }
  return { url: checkoutUrl.toString(), sessionId: result.sessionId, expiresAt: result.expiresAt };
};
