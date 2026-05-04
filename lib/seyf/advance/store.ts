import { randomUUID } from 'node:crypto'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

export type AdvanceStatus = 'pending' | 'completed' | 'failed' | 'liquidated'

export type AdvanceRecord = {
  id: string
  user_id: string
  cycle_id: string
  amount_mxn: number
  fee_mxn: number
  net_mxn: number
  status: AdvanceStatus
  stellar_tx_hash: string | null
  years: number
  rate_percent: number
  principal_mxn_snapshot: number
  due_at: string
  liquidated_at: string | null
  liquidation_fee_mxn: number | null
  created_at: string
}

type AdvanceStore = {
  advances: AdvanceRecord[]
}

const DATA_DIR = path.join(process.cwd(), 'data')
const STORE_PATH = path.join(DATA_DIR, 'seyf-advances.json')

async function ensureDir() {
  await mkdir(DATA_DIR, { recursive: true })
}

async function loadStore(): Promise<AdvanceStore> {
  try {
    const raw = await readFile(STORE_PATH, 'utf-8')
    return JSON.parse(raw) as AdvanceStore
  } catch {
    return { advances: [] }
  }
}

async function saveStore(store: AdvanceStore) {
  await ensureDir()
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8')
}

export async function createAdvanceRecord(record: Omit<AdvanceRecord, 'id' | 'created_at' | 'status' | 'stellar_tx_hash'>): Promise<AdvanceRecord> {
  const store = await loadStore()
  const newRecord: AdvanceRecord = {
    ...record,
    id: randomUUID(),
    status: 'pending',
    stellar_tx_hash: null,
    liquidated_at: null,
    liquidation_fee_mxn: null,
    created_at: new Date().toISOString(),
  }
  store.advances.push(newRecord)
  await saveStore(store)
  return newRecord
}

export async function updateAdvanceRecord(id: string, updates: Partial<AdvanceRecord>): Promise<AdvanceRecord | null> {
  const store = await loadStore()
  const idx = store.advances.findIndex((a) => a.id === id)
  if (idx === -1) return null
  store.advances[idx] = { ...store.advances[idx], ...updates }
  await saveStore(store)
  return store.advances[idx]
}

export async function getAdvanceByCycle(userId: string, cycleId: string): Promise<AdvanceRecord | null> {
  const store = await loadStore()
  return store.advances.find((a) => a.user_id === userId && a.cycle_id === cycleId && a.status === 'completed') || null
}

export async function listUserAdvances(userId: string): Promise<AdvanceRecord[]> {
  const store = await loadStore()
  return store.advances.filter((a) => a.user_id === userId).sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
}

export async function getAdvanceById(userId: string, advanceId: string): Promise<AdvanceRecord | null> {
  const store = await loadStore()
  return store.advances.find((a) => a.user_id === userId && a.id === advanceId) || null
}
