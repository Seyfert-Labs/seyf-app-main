import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import type { ProvisionResult } from '@/lib/seyf/pollar-wallet-provision'

export type UserWalletStatus = 'provisioning' | 'active' | 'error'

export type UserWalletRow = {
  id: string
  userId: string
  pollarWalletId: string | null
  stellarPublicKey: string | null
  status: UserWalletStatus
  createdAt: string
  updatedAt: string
}

type UserWalletStore = {
  rows: UserWalletRow[]
}

function userWalletsPath() {
  return path.join(process.cwd(), 'data', 'seyf-user-wallets.json')
}

async function loadUserWallets(): Promise<UserWalletStore> {
  try {
    const raw = await readFile(userWalletsPath(), 'utf-8')
    const parsed = JSON.parse(raw) as UserWalletStore
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.rows)) {
      return { rows: [] }
    }
    return parsed
  } catch {
    return { rows: [] }
  }
}

async function saveUserWallets(store: UserWalletStore): Promise<void> {
  await mkdir(path.dirname(userWalletsPath()), { recursive: true })
  await writeFile(userWalletsPath(), JSON.stringify(store, null, 2), 'utf-8')
}

export async function getUserWalletByUserId(userId: string): Promise<UserWalletRow | null> {
  const store = await loadUserWallets()
  const found = store.rows.find((row) => row.userId === userId)
  return found ?? null
}

/**
 * Idempotente: equivalente a INSERT ... ON CONFLICT (user_id) DO NOTHING.
 */
export async function insertProvisioningWalletRow(userId: string): Promise<UserWalletRow> {
  const store = await loadUserWallets()
  const existing = store.rows.find((row) => row.userId === userId)
  if (existing) return existing

  const now = new Date().toISOString()
  const row: UserWalletRow = {
    id: randomUUID(),
    userId,
    pollarWalletId: null,
    stellarPublicKey: null,
    status: 'provisioning',
    createdAt: now,
    updatedAt: now,
  }
  store.rows.unshift(row)
  await saveUserWallets(store)
  return row
}

export async function updateUserWalletFromProvisionResult(
  userId: string,
  result: ProvisionResult,
): Promise<UserWalletRow> {
  const store = await loadUserWallets()
  const now = new Date().toISOString()
  const index = store.rows.findIndex((row) => row.userId === userId)

  if (index === -1) {
    const created: UserWalletRow = {
      id: randomUUID(),
      userId,
      pollarWalletId: result.pollarWalletId || null,
      stellarPublicKey: result.stellarPublicKey || null,
      status: result.status,
      createdAt: now,
      updatedAt: now,
    }
    store.rows.unshift(created)
    await saveUserWallets(store)
    return created
  }

  const current = store.rows[index]
  const next: UserWalletRow = {
    ...current,
    pollarWalletId: result.pollarWalletId || null,
    stellarPublicKey: result.stellarPublicKey || null,
    status: result.status,
    updatedAt: now,
  }
  store.rows[index] = next
  await saveUserWallets(store)
  return next
}
