# Configuración segura de pagos

## ePayco

El navegador solo puede solicitar uno de los cuatro planes definidos en `functions/paymentSecurity.js`. `createEpaycoOrder` requiere un Firebase ID token y guarda UID, plan, precio, moneda y duración en una orden pendiente. El checkout recibe el ID de esa orden en `extra1`; el webhook valida la firma, consulta la referencia en ePayco y coteja el resultado autenticado con la orden. La activación y la marca de transacción se escriben en una transacción de Firestore, de modo que notificaciones repetidas no extiendan Pro de nuevo.

Configura `EPAYCO_CUSTOMER_ID` como parámetro de Functions y `EPAYCO_P_KEY` como secreto de Functions. El checkout apunta al endpoint HTTPS `epaycoWebhook` del proyecto configurado en el código. No despliegues pagos reales sin validar el flujo completo en el sandbox de ePayco.

## Hotmart: única oferta autorizada

La configuración `HOTMART_PLAN_CONFIG` del proyecto contiene únicamente `pro_1_month_usd`: acceso de 1 mes por USD 5.99, producto `7758152`, oferta `wr2xnvzt` y checkout `https://pay.hotmart.com/O105879229W?off=wr2xnvzt`. No están habilitados otros planes Hotmart. Los cuatro planes ePayco permanecen sin cambios.

El secreto `HOTMART_HOTTOK` no está en el repositorio. El webhook exige que coincida con el encabezado `X-HOTMART-HOTTOK`; no acepta el token enviado en el cuerpo ni continúa si falta el secreto. La configuración del proveedor debe enviar los eventos de compra aprobada, versión 2.0, a `https://us-central1-gen-lang-client-0987361888.cloudfunctions.net/hotmartWebhook`.

### Primera compra y renovaciones

La creación de sesión requiere POST con `Authorization: Bearer <Firebase ID token>`; el UID siempre proviene de Firebase, no del navegador ni del webhook. El navegador solicita solo el identificador del plan y el servidor determina precio, moneda, producto, oferta y duración. La interfaz valida el checkout recibido y redirige a la oferta autorizada con el `xcod` de la sesión.

La primera compra solo concede acceso si `PURCHASE_APPROVED`, el estado `APPROVED`, el producto, la oferta, el importe y la moneda coinciden con una sesión pendiente y vigente. En la misma transacción de Firestore se marca la sesión pagada, se registra la transacción y se vincula el usuario al hash del producto y de `subscription.subscriber.code`. No se permite transferir ese vínculo a otra cuenta.

Las siguientes compras aprobadas del suscriptor ya vinculado renuevan un mes sin requerir que el `xcod` original siga vigente o vuelva a enviarse. Cada `purchase.transaction` se aplica una sola vez. Se vuelven a comprobar el plan autorizado, producto, oferta, precio y moneda; un suscriptor desconocido no obtiene acceso sin una primera sesión válida. Los eventos no aprobados, cancelados o retrasados no amplían el acceso. El acceso ya pagado conserva su fecha `proExpiresAt`.

Hotmart documenta que el objeto `subscription` se envía tanto al contratar como al cobrar una recurrencia, y que `subscription.subscriber.code` identifica al suscriptor: [eventos de compra](https://developers.hotmart.com/docs/en/2.0.0/webhook/purchase-webhook/) y [webhooks para suscripciones](https://developers.hotmart.com/docs/en/tutorials/use-webhook-for-subscriptions/).

Las colecciones `hotmart_sessions`, `hotmart_subscriptions` y `hotmart_transactions` son solo de servidor por las reglas de denegación predeterminada. El webhook nunca asocia cuentas por el email ni por un UID recibido de Hotmart.

### Condiciones visibles

La interfaz ofrece únicamente USD 5.99/mes mediante Hotmart e informa de la renovación automática hasta que el cliente cancele en Hotmart. El total y los impuestos aplicables se confirman en ese checkout. Los descuentos, otros importes u otras monedas no conceden acceso con esta configuración.

## Alcance de las pruebas

Ejecuta `cd functions && npm test` para comprobar firmas, autenticación, primera compra, correlación con suscriptor, renovaciones, idempotencia, rechazo de datos incorrectos y estados. Ejecuta `npm run lint` y `npm run build` en la raíz para validar la interfaz. Estas pruebas no generan compras ni sustituyen una prueba de webhook desde el proveedor o una compra de sandbox. No es necesario leer ni cambiar los valores de los secretos para ejecutarlas.
