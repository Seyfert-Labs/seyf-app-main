export type ProvisionResult = {
  pollarWalletId: string
  stellarPublicKey: string
  status: 'provisioning' | 'active' | 'error'
}

type PollarWalletResponse = Record<string, unknown>

type AdminAlertPayload = {
  event: 'pollar_wallet_provision_failed'
  userId: string
  error: string
  timestamp: string
}

const RETRY_BACKOFF_MS = [500, 1000, 2000] as const

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function getPollarApiKeyOrThrow(): string {
  const apiKey = process.env.POLLAR_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('POLLAR_API_KEY is required to provision wallets.')
  }
  return apiKey
}

function getPollarApiBaseUrl(): string {
  const base = process.env.POLLAR_API_BASE_URL?.trim() || 'https://api.pollar.xyz'
  return base.endsWith('/') ? base.slice(0, -1) : base
}

function extractPollarWalletId(payload: PollarWalletResponse): string | null {
  const direct =
    payload.walletId ??
    payload.wallet_id ??
    payload.pollarWalletId ??
    payload.pollar_wallet_id ??
    payload.id
  if (typeof direct === 'string' && direct.trim()) return direct.trim()

  const data = payload.data
  if (data && typeof data === 'object') {
    const nested = data as Record<string, unknown>
    const value =
      nested.walletId ??
      nested.wallet_id ??
      nested.pollarWalletId ??
      nested.pollar_wallet_id ??
      nested.id
    if (typeof value === 'string' && value.trim()) return value.trim()
  }

  return null
}

function extractStellarPublicKey(payload: PollarWalletResponse): string | null {
  const direct =
    payload.stellarPublicKey ??
    payload.stellar_public_key ??
    payload.publicKey ??
    payload.public_key ??
    payload.stellarAddress ??
    payload.stellar_address
  if (typeof direct === 'string' && direct.trim()) return direct.trim()

  const data = payload.data
  if (data && typeof data === 'object') {
    const nested = data as Record<string, unknown>
    const value =
      nested.stellarPublicKey ??
      nested.stellar_public_key ??
      nested.publicKey ??
      nested.public_key ??
      nested.stellarAddress ??
      nested.stellar_address
    if (typeof value === 'string' && value.trim()) return value.trim()
  }

  return null
}

async function sendAdminAlert(payload: AdminAlertPayload): Promise<void> {
  console.error(JSON.stringify(payload))

  const webhook = process.env.ADMIN_ALERT_WEBHOOK_URL?.trim()
  if (!webhook) return

  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    // Do not mask original provisioning failure.
  }
}

async function createPollarWallet(userId: string, apiKey: string): Promise<ProvisionResult> {
  const network = process.env.STELLAR_NETWORK ?? 'testnet'
  const baseUrl = getPollarApiBaseUrl()

  const response = await fetch(`${baseUrl}/wallets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      external_id: userId,
      network,
      custody: 'embedded',
    }),
  })

  const text = await response.text()
  if (!response.ok) {
    throw new Error(`Pollar wallet provisioning failed (${response.status}): ${text.slice(0, 300)}`)
  }

  let parsed: PollarWalletResponse
  try {
    parsed = text ? (JSON.parse(text) as PollarWalletResponse) : {}
  } catch {
    throw new Error('Pollar wallet provisioning returned invalid JSON.')
  }

  const pollarWalletId = extractPollarWalletId(parsed)
  const stellarPublicKey = extractStellarPublicKey(parsed)
  if (!pollarWalletId || !stellarPublicKey) {
    throw new Error('Pollar wallet provisioning response is missing wallet identifiers.')
  }

  return {
    pollarWalletId,
    stellarPublicKey,
    status: 'active',
  }
}

export async function provisionWalletForUser(userId: string): Promise<ProvisionResult> {
  const apiKey = getPollarApiKeyOrThrow()

  try {
    return await createPollarWallet(userId, apiKey)
  } catch (firstError) {
    let lastError = firstError

    for (const delayMs of RETRY_BACKOFF_MS) {
      await sleep(delayMs)
      try {
        return await createPollarWallet(userId, apiKey)
      } catch (retryError) {
        lastError = retryError
      }
    }

    const alertPayload: AdminAlertPayload = {
      event: 'pollar_wallet_provision_failed',
      userId,
      error: lastError instanceof Error ? lastError.message : String(lastError),
      timestamp: new Date().toISOString(),
    }
    await sendAdminAlert(alertPayload)

    return {
      pollarWalletId: '',
      stellarPublicKey: '',
      status: 'error',
    }
  }
}

export function isWalletActive(row: { status: string } | null | undefined): boolean {
  return row?.status === 'active'
}
