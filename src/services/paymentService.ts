// services/paymentService.ts

export const EPAYCO_CONFIG = {
  PUBLIC_KEY: import.meta.env.VITE_EPAYCO_PUBLIC_KEY || 'ee434316d860d703cf445f1b14a515ea',
  TEST_MODE: true
};

export interface EpaycoResponse {
  x_response: string;
  x_cod_response: number;
  x_extra1: string; // userId
  x_extra2: string; // months
  x_transaction_id: string;
  x_ref_payco: string;
  x_amount: string;
  x_currency_code: string;
  x_signature: string;
}

// ✅ Función para abrir el checkout de ePayco (con webhook)
export const openEpaycoCheckout = (data: {
  amount: number;
  name: string;
  description: string;
  userId: string;
  months: number;
  email: string;
}) => {
  const handler = (window as any).ePayco.checkout.configure({
    key: EPAYCO_CONFIG.PUBLIC_KEY,
    test: EPAYCO_CONFIG.TEST_MODE
  });

  // ✅ URL del webhook (backend)
  const webhookUrl = import.meta.env.VITE_EPAYCO_WEBHOOK_URL || `${window.location.origin}/api/epayco/webhook`;
  
  // ✅ URL de respuesta (frontend - donde se redirige al usuario)
  const responseUrl = `${window.location.origin}/payment/response`;

  const paymentData = {
    // Datos básicos del pago
    name: data.name,
    description: data.description,
    currency: "cop",
    amount: data.amount.toString(),
    tax_base: "0",
    tax: "0",
    country: "co",
    lang: "es",
    external: "false",
    
    // Datos adicionales (se reciben en el webhook)
    extra1: data.userId,
    extra2: data.months.toString(),
    
    // URLs de respuesta y confirmación (webhook)
    response: responseUrl,
    confirmation: webhookUrl,
    method_confirmation: "POST",
    
    // Datos de facturación (opcionales pero requeridos por ePayco)
    name_billing: "",
    address_billing: "",
    type_doc_billing: "cc",
    mobile_billing: "",
    number_doc_billing: "",
    email_billing: data.email
  };

  handler.open(paymentData);
};

// ✅ Función para verificar transacción (fallback, aunque el webhook es el principal)
export const verifyEpaycoTransaction = async (ref_payco: string): Promise<EpaycoResponse | null> => {
  try {
    const response = await fetch(`https://secure.epayco.co/validation/v1/reference/${ref_payco}`);
    const result = await response.json();
    if (result.success && result.data) {
      return result.data;
    }
    return null;
  } catch (error) {
    console.error("Error verifying payment:", error);
    return null;
  }
};
