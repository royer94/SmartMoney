// services/paymentService.ts

const PAYMENT_FUNCTIONS_BASE_URL = 'https://us-central1-gen-lang-client-0987361888.cloudfunctions.net';

export const EPAYCO_CONFIG = {
  PUBLIC_KEY: import.meta.env.VITE_EPAYCO_PUBLIC_KEY || 'e489c30da23a3b0c82d37b7c3a0f578a',
  TEST_MODE: import.meta.env.VITE_EPAYCO_TEST === 'true',
};

export interface EpaycoOrder {
  orderId: string;
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
  return result as EpaycoOrder;
};

export const openEpaycoCheckout = (data: {
  orderId: string;
  amount: number;
  label: string;
  email: string;
}) => {
  const epayco = (window as any).ePayco;
  if (!epayco?.checkout?.configure) {
    throw new Error('El checkout de ePayco no está disponible');
  }

  const handler = epayco.checkout.configure({
    key: EPAYCO_CONFIG.PUBLIC_KEY,
    test: EPAYCO_CONFIG.TEST_MODE,
  });

  const webhookUrl = `${PAYMENT_FUNCTIONS_BASE_URL}/epaycoWebhook`;
  const responseUrl = `${window.location.origin}/payment/response`;

  handler.open({
    name: `SmartMoney Pro — ${data.label}`,
    description: `Plan Pro SmartMoney por ${data.label}`,
    currency: 'cop',
    amount: String(data.amount),
    tax_base: '0',
    tax: '0',
    country: 'co',
    lang: 'es',
    external: 'false',
    // Este valor identifica la orden pendiente creada en backend; no contiene UID ni meses.
    extra1: data.orderId,
    response: responseUrl,
    confirmation: webhookUrl,
    method_confirmation: 'POST',
    name_billing: '',
    address_billing: '',
    type_doc_billing: 'cc',
    mobile_billing: '',
    number_doc_billing: '',
    email_billing: data.email,
  });
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
