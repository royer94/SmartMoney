# Configuración segura de pagos

## ePayco

El navegador solo puede solicitar uno de los cuatro planes definidos en `functions/paymentSecurity.js`. `createEpaycoOrder` requiere un Firebase ID token y guarda UID, plan, precio, moneda y duración en una orden pendiente. El checkout recibe el ID de esa orden en `extra1`; el webhook valida la firma, consulta la referencia en ePayco y coteja el resultado autenticado con la orden. La activación y la marca de transacción se escriben en una transacción de Firestore, de modo que notificaciones repetidas no extiendan Pro de nuevo.

Configura `EPAYCO_CUSTOMER_ID` como parámetro de Functions y `EPAYCO_P_KEY` como secreto de Functions. El checkout apunta al endpoint HTTPS `epaycoWebhook` del proyecto configurado en el código. No despliegues pagos reales sin validar el flujo completo en el sandbox de ePayco.

## Hotmart

El webhook ahora exige el encabezado `X-HOTMART-HOTTOK`; no procesa el valor enviado en el cuerpo ni continúa si falta el secreto. La creación de sesión requiere POST con `Authorization: Bearer <Firebase ID token>`, y el UID siempre se obtiene del token. La concesión solo ocurre si la sesión pendiente, el producto, la oferta, el estado `APPROVED`, el importe y la moneda coinciden, con idempotencia atómica por transacción.

Antes de habilitar Hotmart, configura:

- `HOTMART_HOTTOK` como secreto de Functions.
- `HOTMART_PLAN_CONFIG` como parámetro JSON, con una entrada por plan autorizado. Cada entrada debe llevar `months` (solo 1, 3, 6 o 12), `amount`, `currency` ISO 4217, `productId` (igual a `product.id` o `product.ucode` del webhook), `offerCode` (igual a `purchase.offer.code`) y el `checkoutUrl` HTTPS real de `pay.hotmart.com` para esa oferta.

Ejemplo de **estructura**, no de valores para copiar o desplegar:

```json
{
  "plan_id_confirmado": {
    "months": 1,
    "amount": 0,
    "currency": "USD",
    "productId": "ID_REAL_DEL_PRODUCTO",
    "offerCode": "CODIGO_REAL_DE_OFERTA",
    "checkoutUrl": "https://pay.hotmart.com/URL_REAL_DE_LA_OFERTA"
  }
}
```

Reemplaza cada valor por los datos reales de la cuenta y comprueba que `purchase.price` del webhook use exactamente ese importe y moneda. Si el checkout incluye descuentos o precios distintos, no se concederá acceso hasta que el catálogo/configuración los represente de forma explícita. No uses un nombre de producto o una URL fija como sustituto de la validación.

Hotmart permanece temporalmente deshabilitado en la interfaz porque el repositorio no contiene los códigos de producto/oferta ni los precios reales para verificar. Tras completar la configuración y validar una compra de prueba, el método de Hotmart requiere una habilitación intencional en la UI.

## Alcance de las pruebas

Ejecuta `cd functions && npm test` para comprobar validación de firmas, correlación con órdenes, montos/monedas, productos/ofertas y estados. Estas pruebas no sustituyen una compra de sandbox ni una prueba de webhook desde cada proveedor. Este cambio no despliega Functions ni modifica secretos o configuración de producción.
