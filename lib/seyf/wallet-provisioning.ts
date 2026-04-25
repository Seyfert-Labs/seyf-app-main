import { isWalletActive, provisionWalletForUser } from '@/lib/seyf/pollar-wallet-provision'
import {
  getUserWalletByUserId,
  insertProvisioningWalletRow,
  updateUserWalletFromProvisionResult,
} from '@/lib/seyf/user-wallets'

export async function triggerWalletProvisioningForUser(userId: string): Promise<void> {
  await insertProvisioningWalletRow(userId)
  const provisioned = await provisionWalletForUser(userId)
  const row = await updateUserWalletFromProvisionResult(userId, provisioned)

  if (provisioned.status === 'active') {
    console.info('[seyf][wallet-provisioning] wallet_active', {
      userId,
      status: row.status,
    })
    return
  }

  console.error('[seyf][wallet-provisioning] wallet_error', {
    userId,
    status: row.status,
  })
}

export async function assertWalletActiveForUser(userId: string): Promise<void> {
  const row = await getUserWalletByUserId(userId)
  if (isWalletActive(row)) return
  throw new Error(
    'Wallet provisioning is still pending. The first deposit cannot proceed until provisioning completes.',
  )
}
