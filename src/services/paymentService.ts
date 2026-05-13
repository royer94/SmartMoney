
export const EPAYCO_CONFIG = {
  PUBLIC_KEY: import.meta.env.VITE_EPAYCO_PUBLIC_KEY || 'ee434316d860d703cf445f1b14a515ea', // Placeholder test key
  TEST_MODE: true
};

export interface EpaycoResponse {
  x_response: string;
  x_cod_response: number;
  x_extra1: string; // Used for userId
  x_extra2: string; // Used for months
  x_transaction_id: string;
}

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

  const paymentData = {
    name: data.name,
    description: data.description,
    currency: "cop",
    amount: data.amount.toString(),
    tax_base: "0",
    tax: "0",
    country: "co",
    lang: "es",
    external: "false",
    extra1: data.userId, // Send userId for identification
    extra2: data.months.toString(), // Send duration
    confirmation: window.location.origin, // Confirmation webhook (optional)
    response: window.location.origin, // Redirect back here
    name_billing: "",
    address_billing: "",
    type_doc_billing: "cc",
    mobile_billing: "",
    number_doc_billing: "",
    email_billing: data.email
  };

  handler.open(paymentData);
};

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
