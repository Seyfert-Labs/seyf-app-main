# Códigos de error API Seyf

## Criterios de aceptación (#37) — estado

| Criterio | Estado |
|----------|--------|
| Todas las rutas API devuelven `{ error: { code, message_es, retryable } }` | Cumplido en `app/api/seyf/**` y `app/api/webhooks/etherfuse` vía `lib/seyf/api-error.ts`. |
| Códigos `spei_timeout`, `deploy_failed`, `advance_limit_exceeded`, `kyc_pending`, `insufficient_balance`, `provider_unavailable` | Definidos en `SEYF_API_ERROR_CODES` y tabla abajo; más códigos auxiliares (`validation_error`, `unauthorized`, etc.). |
| Error boundary global con pantalla amable | `app/error.tsx`, `app/global-error.tsx`, `app/(app)/error.tsx` + `components/errors/app-error-fallback.tsx`. |
| Sin mensajes crudos de Stellar / Etherfuse / Pollar en UI | Las rutas usan `seyfErrorFromUnknown` (solo log en servidor). Clientes que llaman a esas APIs usan `getSeyfErrorDisplayMessage` / `extractSeyfApiError` (p. ej. depósito, ramp dev, PoC, movimiento, prueba MXN-CETES). |
| `retryable` en JSON | El campo guía **un reintento automático** en cliente (`fetchWithSeyfRetryOnce` en `read-client-api-error.ts`) en llamadas a `/api/seyf/**`. Los boundaries (`error.tsx` / `global-error.tsx`) ofrecen además **«Intentar de nuevo»** secundario (`reset` de Next.js), sin sustituir «Ir al inicio». |
| 500 genérico «Algo salió mal. Estamos en ello.» sin stack en JSON | `seyfInternalError()` en `api-error.ts`. |
| Documentación en `/docs/error-codes.md` | Este archivo. |

Todas las rutas bajo `/api/seyf/**` y webhooks relacionados deben devolver errores con esta forma:

```json
{
  "error": {
    "code": "<código>",
    "message_es": "<texto seguro en español>",
    "retryable": true | false
  }
}
```

Los clientes **no** deben mostrar `Error.message` crudo de Stellar, Etherfuse ni Pollar: solo `message_es` (y opcionalmente `code` para lógica).

## Códigos

| Código | `retryable` típico | Uso |
|--------|-------------------|-----|
| `spei_timeout` | `true` | SPEI / transferencia tardó demasiado o timeout de red. |
| `deploy_failed` | `true` | Fallo al ejecutar contrato / transacción en Stellar (mensaje al usuario genérico). |
| `advance_limit_exceeded` | `false` | Adelanto fuera de límites de negocio. |
| `kyc_pending` | `false` | Identidad pendiente o incompleta. |
| `insufficient_balance` | `false` | Saldo insuficiente (XLM, MXNe, etc.). |
| `provider_unavailable` | `true` | Proveedor (Etherfuse, Horizon, etc.) no disponible o error 5xx upstream. |
| `validation_error` | `false` | Cuerpo o parámetros inválidos (Zod, reglas de negocio). |
| `unauthorized` | `false` | Falta sesión, cookie o contexto (p. ej. rampa sin identidad). |
| `forbidden` | `false` | Acción no permitida en este entorno (feature flag, producción). |
| `not_found` | `false` | Recurso inexistente. |
| `conflict` | `false` | Estado incompatible (p. ej. orden pendiente). |
| `internal_error` | `false` | Error interno no clasificado; mensaje genérico, sin stack en JSON. |
| `bad_json` | `false` | Cuerpo no es JSON válido. |

## HTTP

- **4xx**: errores de cliente / negocio; suelen ser `retryable: false` salvo políticas explícitas.
- **5xx**: servidor o upstream; `internal_error` usa mensaje fijo en español sin filtrar detalles técnicos.
- **502 / 503 / 504**: a menudo mapean a `provider_unavailable` o `spei_timeout` con `retryable: true` cuando aplica.

## UI

- **`message_es`**: mostrar como texto informativo (toast, banner o mensaje bajo el campo); tono profesional, sin listas de botones.
- **`retryable`**: un segundo `fetch` tras ~450 ms si el servidor devolvió error Seyf con `retryable: true`; en formularios y banners que ya usan `getSeyfErrorDisplayMessage`, las peticiones van con `fetchWithSeyfRetryOnce`. En pantallas de error de segmento, «Intentar de nuevo» re-ejecuta el árbol de React del segmento.

## Referencias

- Issue: Global Error Handling & User-Facing Error Messages (#37)
- PRD §2.8 US-12
