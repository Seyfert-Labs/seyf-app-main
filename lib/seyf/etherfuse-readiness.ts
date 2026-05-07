import { fetchRampableAssetsForWallet } from '@/lib/etherfuse/ramp-api'
import { fetchEtherfuseKycStatus } from '@/lib/etherfuse/kyc'
import { etherfuseFetch, etherfuseReadBody } from '@/lib/etherfuse/client'
import { resolveMvpPartnerCryptoWalletId } from '@/lib/etherfuse/partner-accounts'
import { getStoredAgreementsStatus } from '@/lib/seyf/agreements-state-store'
import { isPublicStellarTestnet } from '@/lib/seyf/stellar-wallet-network'

type BankAccountRow = {
  bankAccountId?: string
  id?: string
  status?: string
  compliant?: boolean
  deletedAt?: string | null
}

function isBankRowActiveAndCompliant(row: BankAccountRow): boolean {
  if (row.deletedAt != null) return false
  const status = (row.status ?? '').toLowerCase()
  if (status === 'active') {
    // Sandbox: a veces `compliant` llega tarde; en mainnet exigimos explícitamente compliant.
    if (isPublicStellarTestnet()) return row.compliant !== false
    return row.compliant === true
  }
  // En sandbox/testnet, Etherfuse puede quedarse en awaitingDepositVerification aunque la cuenta ya exista.
  if (isPublicStellarTestnet() && status === 'awaitingdepositverification') {
    return row.compliant !== false
  }
  return false
}

/**
 * Prefiere el UUID de sesión si esa cuenta está activa; si no, cualquier cuenta activa+compliant del cliente.
 * Así recuperamos el estado tras borrar/recrear CLABE en Etherfuse (cookie con id viejo).
 */
function pickEffectiveBankAccountRow(
  items: BankAccountRow[],
  preferredBankAccountId: string,
): { row: BankAccountRow | null; id: string | null } {
  const preferred = items.find((x) => pickBankAccountId(x) === preferredBankAccountId)
  if (preferred && isBankRowActiveAndCompliant(preferred)) {
    return { row: preferred, id: pickBankAccountId(preferred) }
  }
  const fallback = items.find((x) => isBankRowActiveAndCompliant(x))
  if (fallback) {
    return { row: fallback, id: pickBankAccountId(fallback) }
  }
  if (preferred) {
    return { row: preferred, id: pickBankAccountId(preferred) }
  }
  return { row: null, id: null }
}

function mergeBankAccountRows(
  customerItems: BankAccountRow[],
  orgItems: BankAccountRow[],
): BankAccountRow[] {
  const byId = new Map<string, BankAccountRow>()
  for (const x of customerItems) {
    const id = pickBankAccountId(x)
    if (id) byId.set(id, x)
  }
  for (const x of orgItems) {
    const id = pickBankAccountId(x)
    if (id && !byId.has(id)) byId.set(id, x)
  }
  return [...byId.values()]
}

export type EtherfuseReadinessInput = {
  customerId: string
  publicKey: string
  bankAccountId: string
  source?: 'cookie' | 'mvp_env'
}

export type EtherfuseReadinessResult = {
  contextReady: boolean
  contextSource: 'cookie' | 'mvp_env'
  customerId: string
  publicKey: string
  bankAccountId: string
  cryptoWalletId: string | null
  walletRegistered: boolean
  kycStatus: string | null
  kycApproved: boolean
  documentsUploaded: boolean
  agreementsAccepted: boolean
  bankAccountReady: boolean
  /** Cuenta bancaria Etherfuse que cumple checks (puede diferir del UUID en cookie). */
  effectiveBankAccountId: string | null
  trustlineReady: boolean
  webhookConfigured: boolean
  onrampEnabled: boolean
  reasons: string[]
}

function pickBankAccountId(row: BankAccountRow): string | null {
  const id = row.bankAccountId ?? row.id
  return typeof id === 'string' && id.trim() ? id.trim() : null
}

/**
 * Alinea el UUID de cuenta bancaria con una fila activa+compliant en Etherfuse.
 * Evita onramps con IDs obsoletos en Redis/cookie (síntoma típico: "Proxy account not found").
 */
export async function resolveEffectiveBankAccountIdForOnramp(params: {
  customerId: string
  preferredBankAccountId: string
}): Promise<string> {
  const { customerId, preferredBankAccountId } = params
  try {
    const customerRes = await etherfuseFetch(
      `/ramp/customer/${encodeURIComponent(customerId)}/bank-accounts`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageSize: 30, pageNumber: 0 }),
      },
    )
    const { json: customerJson } = await etherfuseReadBody<{ items?: BankAccountRow[] }>(
      customerRes,
    )
    const customerItems = customerRes.ok ? customerJson?.items ?? [] : []

    const orgRes = await etherfuseFetch('/ramp/bank-accounts', { method: 'GET' })
    const { json: orgJson } = await etherfuseReadBody<{ items?: BankAccountRow[] }>(orgRes)
    const orgItems = orgRes.ok ? orgJson?.items ?? [] : []

    const merged = mergeBankAccountRows(customerItems, orgItems)
    const picked = pickEffectiveBankAccountRow(merged, preferredBankAccountId)
    if (picked.id && picked.row && isBankRowActiveAndCompliant(picked.row)) {
      return picked.id
    }
    const anyActive = merged.find((x) => isBankRowActiveAndCompliant(x))
    const fid = anyActive ? pickBankAccountId(anyActive) : null
    if (fid) return fid
  } catch (e) {
    if (e instanceof Error) {
      console.warn('[etherfuse-readiness] resolveEffectiveBankAccountIdForOnramp:', e.message)
    }
  }
  return preferredBankAccountId
}

export async function computeEtherfuseReadiness(
  ctx: EtherfuseReadinessInput,
): Promise<EtherfuseReadinessResult> {
  const reasons: string[] = []

  let walletRegistered = false
  let cryptoWalletId: string | null = null
  try {
    cryptoWalletId = await resolveMvpPartnerCryptoWalletId(ctx.publicKey)
    walletRegistered = Boolean(cryptoWalletId)
  } catch (e) {
    if (e instanceof Error) {
      console.warn('[etherfuse-readiness] wallet registration:', e.message)
    }
    reasons.push('Tu cuenta aún no está lista para depósitos. Revisa identidad o espera unos minutos.')
  }

  let kycApproved = false
  let kycStatus: string | null = null
  let documentsUploaded = false
  try {
    const kyc = await fetchEtherfuseKycStatus(ctx.customerId, ctx.publicKey)
    if (kyc.ok) {
      kycStatus = kyc.data.status
      kycApproved =
        kyc.data.status === 'approved' || kyc.data.status === 'approved_chain_deploying'
      documentsUploaded = kyc.data.documentsCount > 0 && kyc.data.selfiesCount > 0
    } else {
      reasons.push('No encontramos tu verificación de identidad para esta cuenta.')
    }
  } catch (e) {
    if (e instanceof Error) {
      console.warn('[etherfuse-readiness] KYC check:', e.message)
    }
    reasons.push('No pudimos consultar tu identidad. Intenta de nuevo en un momento.')
  }
  if (!kycApproved) {
    reasons.push('Tu identidad aún no está aprobada.')
  }
  if (!documentsUploaded) {
    reasons.push('Faltan documentos de identificación y selfie.')
  }

  let bankAccountReady = false
  let effectiveBankAccountId: string | null = ctx.bankAccountId
  try {
    const customerRes = await etherfuseFetch(
      `/ramp/customer/${encodeURIComponent(ctx.customerId)}/bank-accounts`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageSize: 30, pageNumber: 0 }),
      },
    )
    const { json: customerJson } = await etherfuseReadBody<{ items?: BankAccountRow[] }>(
      customerRes,
    )
    const customerItems = customerRes.ok ? customerJson?.items ?? [] : []

    const orgRes = await etherfuseFetch('/ramp/bank-accounts', { method: 'GET' })
    const { json } = await etherfuseReadBody<{ items?: BankAccountRow[] }>(orgRes)
    const orgItems = orgRes.ok ? json?.items ?? [] : []

    const merged = mergeBankAccountRows(customerItems, orgItems)
    const picked = pickEffectiveBankAccountRow(merged, ctx.bankAccountId)
    if (picked.row && isBankRowActiveAndCompliant(picked.row)) {
      bankAccountReady = true
      if (picked.id) effectiveBankAccountId = picked.id
    } else {
      bankAccountReady = false
    }
  } catch (e) {
    if (e instanceof Error) {
      console.warn('[etherfuse-readiness] bank account:', e.message)
    }
    reasons.push('No pudimos comprobar tu cuenta bancaria. Intenta más tarde.')
  }
  if (!bankAccountReady) {
    reasons.push('Tu cuenta bancaria aún no está lista para movimientos.')
  }

  const agreementsStatus = await getStoredAgreementsStatus(ctx.customerId, ctx.publicKey)
  const agreementsAcceptedRaw = agreementsStatus?.accepted === true
  // En testnet no bloqueamos por estado local de acuerdos (puede perderse por resets).
  const agreementsAccepted = agreementsAcceptedRaw || isPublicStellarTestnet()
  if (!agreementsAccepted) {
    reasons.push('Falta aceptar los acuerdos legales.')
  }

  let trustlineReady = false
  try {
    const { assets } = await fetchRampableAssetsForWallet({
      walletPublicKey: ctx.publicKey,
    })
    trustlineReady = assets.some((a) => (a.symbol ?? '').toUpperCase() === 'CETES')
  } catch (e) {
    if (e instanceof Error) {
      console.warn('[etherfuse-readiness] assets/trustline:', e.message)
    }
    reasons.push('No pudimos comprobar tu saldo de inversión. Intenta más tarde.')
  }
  if (!trustlineReady) {
    reasons.push('Falta completar la configuración de tu cuenta para invertir (desde Identidad).')
  }

  const isProduction = process.env.NODE_ENV === 'production'
  const webhookConfigured = Boolean(process.env.ETHERFUSE_WEBHOOK_SECRET?.trim())
  if (isProduction && !webhookConfigured) {
    console.warn('[etherfuse-readiness] production without ETHERFUSE_WEBHOOK_SECRET')
    reasons.push('El servicio de depósitos no está disponible en este momento. Prueba más tarde.')
  }

  const onrampEnabled =
    walletRegistered &&
    kycApproved &&
    documentsUploaded &&
    agreementsAccepted &&
    bankAccountReady &&
    trustlineReady &&
    (!isProduction || webhookConfigured)

  return {
    contextReady: true,
    contextSource: ctx.source ?? 'cookie',
    customerId: ctx.customerId,
    publicKey: ctx.publicKey,
    bankAccountId: ctx.bankAccountId,
    cryptoWalletId,
    walletRegistered,
    kycStatus,
    kycApproved,
    documentsUploaded,
    agreementsAccepted,
    bankAccountReady,
    effectiveBankAccountId,
    trustlineReady,
    webhookConfigured,
    onrampEnabled,
    reasons,
  }
}
