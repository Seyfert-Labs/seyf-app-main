import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'

type WelcomeBonusRow = {
  customerId: string
  orderId: string
  amountMxn: number
  claimedAt: string
}

type WelcomeBonusStore = {
  rows: WelcomeBonusRow[]
}

function storePath() {
  return path.join(process.cwd(), 'data', 'seyf-welcome-bonus.json')
}

async function loadStore(): Promise<WelcomeBonusStore> {
  try {
    const raw = await readFile(storePath(), 'utf-8')
    const parsed = JSON.parse(raw) as WelcomeBonusStore
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.rows)) {
      return { rows: [] }
    }
    return parsed
  } catch {
    return { rows: [] }
  }
}

async function saveStore(store: WelcomeBonusStore): Promise<void> {
  await mkdir(path.dirname(storePath()), { recursive: true })
  await writeFile(storePath(), JSON.stringify(store, null, 2), 'utf-8')
}

export async function getWelcomeBonusClaimByCustomerId(customerId: string): Promise<WelcomeBonusRow | null> {
  const store = await loadStore()
  return store.rows.find((x) => x.customerId === customerId) ?? null
}

export async function upsertWelcomeBonusClaim(params: {
  customerId: string
  orderId: string
  amountMxn: number
}): Promise<void> {
  const store = await loadStore()
  const idx = store.rows.findIndex((x) => x.customerId === params.customerId)
  const row: WelcomeBonusRow = {
    customerId: params.customerId,
    orderId: params.orderId,
    amountMxn: params.amountMxn,
    claimedAt: new Date().toISOString(),
  }
  if (idx >= 0) {
    store.rows[idx] = row
  } else {
    store.rows.unshift(row)
  }
  await saveStore(store)
}
