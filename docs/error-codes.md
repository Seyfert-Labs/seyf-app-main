# Error Codes — Seyf API

All API error responses share a single shape:

```json
{
  "error": {
    "code": "<SeyfErrorCode>",
    "message_es": "<string shown to the user>",
    "retryable": true | false
  }
}
```

`retryable: true` means the client may offer a retry button. `retryable: false` means the error is definitive and a retry is unlikely to help.

---

## Code Reference

| Code | HTTP Status | `retryable` | `message_es` | When it fires |
|---|---|---|---|---|
| `spei_timeout` | 504 | `true` | Tu transferencia SPEI sigue en proceso. Puede tardar hasta el siguiente día hábil. | A SPEI transfer or on-chain settlement exceeded the expected wait window. |
| `deploy_failed` | 500 | `false` | Algo salió mal. Estamos en ello. | An on-chain operation (Stablebond purchase, advance disbursement) failed to execute. The user's balance is not affected. |
| `provider_unavailable` | 502 | `true` | El proveedor no está disponible en este momento. Intenta en unos minutos. | Etherfuse or Horizon returned a non-2xx response that is not a client error. Also used for 409 conflict (pending order) with `retryable: false` override. |
| `generic_error` | 500 | `false` | Algo salió mal. Estamos en ello. | Catch-all for unexpected errors not covered by the codes above. |

---

## 500-class message policy

All codes that map to HTTP 500 return the same `message_es`: **"Algo salió mal. Estamos en ello."**
This is required by PRD §2.8 (US-13, CA-02 and CA-05) to avoid surfacing internal details to end users.

---

## Server-side logging

Every call to `toErrorResponse` emits a `console.error` line with:
- A `[seyf/<route-context>]` tag identifying the originating route.
- The internal error message (never forwarded to the client).

For Etherfuse-originated errors the log line reads `[seyf/<context>] provider error: <extracted message>`.
For AppError instances: `[seyf/<context>] <code> <internal message>`.

---

## Source

Codes and defaults are defined in [`lib/seyf/api-error.ts`](../lib/seyf/api-error.ts).
To add a new code, extend `SeyfErrorCode` and add an entry to all three lookup tables:
`MESSAGE_ES`, `DEFAULT_STATUS`, and `DEFAULT_RETRYABLE`.
