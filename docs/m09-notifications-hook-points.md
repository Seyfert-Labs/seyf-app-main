# M09 SMS notification hook points

This repo now exposes two integration points for lifecycle notifications:

1. `notifyUser(userId, event, data)` in `lib/seyf/notifications/notify.ts`
   Use this directly from server-side jobs, webhooks, or route handlers when the app already has a `userId`.

2. `POST /api/seyf/internal/notify`
   Use this when a background worker or another internal service needs a small authenticated HTTP hook. In production it expects `x-seyf-internal-secret` to match `SEYF_INTERNAL_NOTIFY_SECRET`.

Current MVP hook:

- `app/api/seyf/invest/route.ts`
  When a new mock auto-invest run is created, the route fires `deposit_deployed` asynchronously so SMS failures never block the deposit flow.

Suggested next hooks when those flows land on the server:

- Advance settlement job -> `advance_confirmed`
- Offramp success/failure webhook -> `withdrawal_completed` / `withdrawal_failed`
- KYC state transition job or webhook -> `kyc_approved` / `kyc_rejected`
