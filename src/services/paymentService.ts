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
