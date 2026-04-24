# Códigos de Error — Seyf API

Todas las respuestas de error de la API comparten una sola forma:

```json
{
  "error": {
    "code": "<SeyfErrorCode>",
    "message_es": "<texto que ve el usuario>",
    "retryable": true | false
  }
}
```

`retryable: true` significa que el cliente puede ofrecer un botón de reintento. `retryable: false` significa que el error es definitivo y reintentar no va a ayudar.

---

## Referencia de códigos

| Código | HTTP | `retryable` | `message_es` | Cuándo ocurre |
|---|---|---|---|---|
| `spei_timeout` | 504 | `true` | Tu transferencia SPEI sigue en proceso. Puede tardar hasta el siguiente día hábil. | Una transferencia SPEI o liquidación on-chain superó el tiempo de espera esperado. |
| `deploy_failed` | 500 | `false` | Algo salió mal. Estamos en ello. | Una operación on-chain (compra de Stablebond, desembolso de adelanto) falló. El saldo del usuario no se ve afectado. |
| `provider_unavailable` | 502 | `true` | El proveedor no está disponible en este momento. Intenta en unos minutos. | Etherfuse u Horizon devolvió un error no-2xx que no es un error del cliente. También se usa para conflicto 409 (orden pendiente) con `retryable: false`. |
| `generic_error` | 500 | `false` | Algo salió mal. Estamos en ello. | Catch-all para errores inesperados no cubiertos por los códigos anteriores. |

---

## Política de mensaje para errores 500

Todos los códigos que mapean a HTTP 500 devuelven el mismo `message_es`: **"Algo salió mal. Estamos en ello."**
Esto es requerido por el PRD §2.8 (US-13, CA-02 y CA-05) para evitar exponer detalles internos al usuario final.

---

## Logging en el servidor

Cada llamada a `toErrorResponse` emite una línea de `console.error` con:
- Un tag `[seyf/<contexto-de-ruta>]` que identifica la ruta de origen.
- El mensaje de error interno (nunca se envía al cliente).

Para errores originados en Etherfuse la línea dice `[seyf/<contexto>] provider error: <mensaje extraído>`.
Para instancias de `AppError`: `[seyf/<contexto>] <code> <mensaje interno>`.

---

## Fuente

Los códigos y valores por defecto están definidos en [`lib/seyf/api-error.ts`](../lib/seyf/api-error.ts).
Para agregar un código nuevo, extender `SeyfErrorCode` y agregar una entrada en las tres tablas de lookup:
`MESSAGE_ES`, `DEFAULT_STATUS` y `DEFAULT_RETRYABLE`.
