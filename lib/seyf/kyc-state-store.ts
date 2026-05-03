import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import type { EtherfuseKycSnapshot, EtherfuseKycStatus } from '@/lib/etherfuse/kyc'

type KycStateRow = {
  customerId: string
  walletPublicKey: string
  status: EtherfuseKycStatus
  approvedAt: string | null
  currentRejectionReason: string | null
  updatedAt: string
  lastEventId: string | null
}

type KycStateStore = {
  rows: KycStateRow[]
}

function kycStorePath() {
  return path.join(process.cwd(), 'data', 'seyf-kyc-state.json')
}

async function loadStore(): Promise<KycStateStore> {
  try {
    const raw = await readFile(kycStorePath(), 'utf-8')
    const parsed = JSON.parse(raw) as KycStateStore
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.rows)) {
      return { rows: [] }
    }
    return parsed
  } catch {
    return { rows: [] }
  }
}

async function saveStore(store: KycStateStore): Promise<void> {
  await mkdir(path.dirname(kycStorePath()), { recursive: true })
  await writeFile(kycStorePath(), JSON.stringify(store, null, 2), 'utf-8')
}

function rowToSnapshot(row: KycStateRow): EtherfuseKycSnapshot {
  return {
    customerId: row.customerId,
    walletPublicKey: row.walletPublicKey,
    status: row.status,
    approvedAt: row.approvedAt,
    currentRejectionReason: row.currentRejectionReason,
    verifiedProfile: null,
    documentsCount: 0,
    selfiesCount: 0,
  }
}

export async function getStoredKycSnapshot(
  customerId: string,
  walletPublicKey: string,
): Promise<EtherfuseKycSnapshot | null> {
  const store = await loadStore()
  const found = store.rows.find(
    (row) => row.customerId === customerId && row.walletPublicKey === walletPublicKey,
  )
  return found ? rowToSnapshot(found) : null
}

export async function upsertStoredKycSnapshot(params: {
  customerId: string
  walletPublicKey: string
  status: EtherfuseKycStatus
  approvedAt?: string | null
  currentRejectionReason?: string | null
  eventId?: string | null
  eventTimestamp?: string | null
}): Promise<{ updated: boolean }> {
  const store = await loadStore()
  const idx = store.rows.findIndex(
    (row) => row.customerId === params.customerId && row.walletPublicKey === params.walletPublicKey,
  )
  const eventId = params.eventId ?? null
  const hasExplicitTimestamp = Boolean(params.eventTimestamp)
  const incomingTs = hasExplicitTimestamp ? new Date(params.eventTimestamp as string).getTime() : Date.now()

  if (idx >= 0) {
    const current = store.rows[idx]
    const samePayload =
      current.status === params.status &&
      current.approvedAt === (params.approvedAt ?? null) &&
      current.currentRejectionReason === (params.currentRejectionReason ?? null)
    if (!eventId && samePayload) {
      return { updated: false }
    }
    if (eventId && current.lastEventId === eventId) return { updated: false }
    const currentTs = new Date(current.updatedAt).getTime()
    if (Number.isFinite(currentTs) && Number.isFinite(incomingTs) && incomingTs < currentTs) {
      return { updated: false }
    }
    const effectiveTs =
      hasExplicitTimestamp && Number.isFinite(incomingTs) ? incomingTs : currentTs || Date.now()
    store.rows[idx] = {
      ...current,
      status: params.status,
      approvedAt: params.approvedAt ?? null,
      currentRejectionReason: params.currentRejectionReason ?? null,
      updatedAt: new Date(effectiveTs).toISOString(),
      lastEventId: eventId,
    }
    await saveStore(store)
    return { updated: true }
  }

  store.rows.unshift({
    customerId: params.customerId,
    walletPublicKey: params.walletPublicKey,
    status: params.status,
    approvedAt: params.approvedAt ?? null,
    currentRejectionReason: params.currentRejectionReason ?? null,
    updatedAt: new Date(incomingTs).toISOString(),
    lastEventId: eventId,
  })
  await saveStore(store)
  return { updated: true }
}

export async function listStoredKycRows(limit = 200): Promise<
  Array<{
    customerId: string
    walletPublicKey: string
    status: EtherfuseKycStatus
    approvedAt: string | null
    currentRejectionReason: string | null
    updatedAt: string
  }>
> {
  const store = await loadStore()
  return store.rows.slice(0, Math.max(1, limit)).map((row) => ({
    customerId: row.customerId,
    walletPublicKey: row.walletPublicKey,
    status: row.status,
    approvedAt: row.approvedAt,
    currentRejectionReason: row.currentRejectionReason,
    updatedAt: row.updatedAt,
  }))
}
