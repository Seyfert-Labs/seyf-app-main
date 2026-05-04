# Etherfuse Programmatic Go-Live Checklist

Este documento define el flujo objetivo de producción para Seyf:

1. Usuario crea cuenta en Seyf
2. Seyf provisiona wallet Stellar en Pollar
3. Seyf registra esa wallet del usuario en Etherfuse
4. Seyf ejecuta KYC programático (identidad + documentos)
5. KYC aprobado
6. Cuenta bancaria/CLABE activa y compliant
7. Onramp habilitado para pruebas (y luego producción)

---

## 0) Prerrequisitos de organización (una sola vez)

Antes de onboardear usuarios, la org en Etherfuse debe estar lista:

- API key válida y ambiente correcto (`ETHERFUSE_API_BASE_URL`)
- Wallet organizacional registrada (`POST /ramp/wallet`, ideal `claimOwnership: true`)
- Bank account organizacional activa/compliant
- Webhook configurado a `/api/webhooks/etherfuse`
- `ETHERFUSE_WEBHOOK_SECRET` configurado (producción)

Validar con:

- `GET /ramp/me`
- `GET /ramp/wallets`
- `GET /ramp/bank-accounts`

---

## 1) Alta de usuario y wallet (Pollar)

Estado esperado en Seyf:

- `user_wallet.status = active`
- `stellarPublicKey` disponible para el usuario autenticado

Referencia actual:

- `lib/seyf/pollar-wallet-provision.ts`
- `lib/seyf/wallet-provisioning.ts`
- `lib/seyf/use-seyf-wallet.ts`

Gate:

- Si la wallet no está activa, bloquear onramp y mostrar mensaje de provisioning.

---

## 2) Registro en Etherfuse (contexto de rampa por usuario)

Generar IDs en backend (UUID v4):

- `customerId` (definido por Seyf)
- `bankAccountId` (definido por Seyf)

Llamar:

- `POST /ramp/onboarding-url`
  - payload: `customerId`, `bankAccountId`, `publicKey`, `blockchain: stellar`

Persistir sesión segura:

- cookie `seyf_ef_onboarding` con:
  - `customerId`
  - `bankAccountId`
  - `publicKey`

Referencia actual:

- `app/api/seyf/kyc/submit/route.ts`
- `lib/etherfuse/onboarding.ts`
- `lib/etherfuse/onboarding-session.ts`

---

## 3) KYC programático: identidad + documentos

### 3.1 Identidad

- `POST /ramp/customer/{customerId}/kyc`
- Campos mínimos:
  - nombre
  - fecha nacimiento
  - dirección
  - tax IDs (CURP/RFC)
  - `pubkey`

Referencia actual:

- `lib/etherfuse/kyc.ts` (`submitEtherfuseKycIdentityData`)
- `app/api/seyf/kyc/submit/route.ts`

### 3.2 Documentos

- `POST /ramp/customer/{customerId}/kyc/documents`
- Enviar:
  - `documentType: "document"` (`id_front`, `id_back`)
  - `documentType: "selfie"` (`selfie`)
- Formato:
  - Data URL base64 (`jpeg/png`, máx 10MB)

Referencia actual:

- `lib/etherfuse/kyc.ts` (`uploadEtherfuseKycDocuments`)
- `app/api/seyf/kyc/documents/route.ts`
- `app/(app)/identidad/identidad-client.tsx`

---

## 4) Estado KYC y webhook

No depender solo del resultado inmediato del POST.

Fuente de verdad:

- `GET /ramp/customer/{customerId}/kyc/{pubkey}`
- webhook `kyc_updated`

Referencia actual:

- `app/api/seyf/kyc/status/route.ts`
- `app/api/webhooks/etherfuse/route.ts`
- `lib/seyf/kyc-state-store.ts`
- `app/(app)/dev/etherfuse-ops/page.tsx`

Gate:

- Habilitar onramp solo en `approved` o `approved_chain_deploying`

---

## 5) Trustline CETES y activos en wallet del usuario

Antes de crear orden onramp, la wallet del usuario debe aceptar CETES.

Recomendado:

- auto-attempt de trustline al aprobar KYC
- fallback manual con UI de recuperación

Referencia actual:

- `lib/seyf/stellar-trustline.ts`
- `app/api/seyf/stellar-trustline/cetes/route.ts`
- `lib/seyf/use-ensure-cetes-trustline.ts`
- `app/(app)/identidad/identidad-client.tsx`

Validar:

- `GET /ramp/assets?wallet=<pubkey>&blockchain=stellar&currency=mxn`
- debe incluir `CETES`

---

## 6) Cuenta bancaria/CLABE y compliance

Para operar órdenes:

- Bank account del contexto debe existir
- debe estar `status: active`
- debe estar `compliant: true`
- no debe estar soft-deleted

Recomendación de hardening:

- Validar bank account en cada `order/onramp` (o cache corto + refresh)
- si no cumple, retornar 409/422 con mensaje accionable

---

## 7) Gates para habilitar botón de onramp en UI

Mostrar "Generar datos de depósito" solo si se cumplen TODOS:

- wallet Pollar activa
- sesión onboarding Etherfuse presente
- KYC aprobado
- trustline CETES lista (o activo objetivo configurable)
- bank account activa/compliant

Si falta uno:

- bloquear botón
- mostrar estado exacto y CTA:
  - completar identidad
  - subir documentos
  - esperar aprobación
  - agregar trustline
  - corregir cuenta bancaria

---

## 8) Test plan mínimo (sandbox)

Caso feliz completo:

1. Usuario nuevo (wallet nueva)
2. Enviar identidad
3. Subir documentos
4. Ver `proposed` y luego `approved` por webhook/polling
5. Validar trustline/asset CETES
6. `quote/onramp` 200
7. `order/onramp` 200
8. Simulación sandbox `fiat_received`
9. Confirmar balance/movimientos en wallet del usuario

Casos de error obligatorios:

- documento >10MB
- tipo inválido (no jpg/png)
- KYC rejected
- bank account no compliant
- wallet sin trustline

---

## 9) Flags y seguridad para producción

- `SEYF_ALLOW_ETHERFUSE_RAMP=true`
- eliminar bypasses de desarrollo en rutas sensibles
- no usar `ETHERFUSE_MVP_*` en producción
- usar exclusivamente contexto por cookie de onboarding
- webhook firmado obligatorio (`ETHERFUSE_WEBHOOK_SECRET`)
- opcional: proteger `/api/seyf/etherfuse/ops/*` con `SEYF_ETHERFUSE_OPS_TOKEN`

---

## 10) Definición de Done (Production Ready)

El flujo está listo para producción cuando:

- onboarding programático de usuario nuevo funciona sin intervención manual
- KYC llega a `approved` con identidad + documentos
- trustline y assets están operativos en wallet del usuario
- onramp crea orden y acredita activo en esa misma wallet
- webhook `kyc_updated` actualiza estado en Seyf de forma consistente
- sin dependencia de fallback MVP ni wallets estáticas de desarrollo