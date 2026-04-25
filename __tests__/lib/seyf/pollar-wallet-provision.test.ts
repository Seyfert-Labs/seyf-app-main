import test from 'node:test'
import assert from 'node:assert/strict'
import { isWalletActive, provisionWalletForUser } from '../../../lib/seyf/pollar-wallet-provision'

type MockResponse = {
  ok: boolean
  status: number
  text: () => Promise<string>
}

function okJson(body: unknown): MockResponse {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  }
}

function failText(status = 500, body = 'boom'): MockResponse {
  return {
    ok: false,
    status,
    text: async () => body,
  }
}

function withMockedTimers() {
  const original = globalThis.setTimeout
  ;(globalThis as { setTimeout: typeof setTimeout }).setTimeout = ((fn: (...args: unknown[]) => void) => {
    fn()
    return 0 as unknown as ReturnType<typeof setTimeout>
  }) as typeof setTimeout
  return () => {
    ;(globalThis as { setTimeout: typeof setTimeout }).setTimeout = original
  }
}

test('returns status active + wallet data on first-attempt success', async () => {
  const originalFetch = globalThis.fetch
  const originalApiKey = process.env.POLLAR_API_KEY
  const originalBaseUrl = process.env.POLLAR_API_BASE_URL
  const originalNetwork = process.env.STELLAR_NETWORK
  process.env.POLLAR_API_KEY = 'secret_key'
  process.env.POLLAR_API_BASE_URL = 'https://pollar.example'
  process.env.STELLAR_NETWORK = 'testnet'

  globalThis.fetch = (async () =>
    okJson({
      id: 'wallet_1',
      stellar_public_key: 'GTESTPUBLICKEY123',
      private_key: 'never-should-be-returned',
    })) as unknown as typeof fetch

  try {
    const result = await provisionWalletForUser('user-1')
    assert.equal(result.status, 'active')
    assert.equal(result.pollarWalletId, 'wallet_1')
    assert.equal(result.stellarPublicKey, 'GTESTPUBLICKEY123')
    assert.equal('private_key' in (result as Record<string, unknown>), false)
    assert.equal('seed' in (result as Record<string, unknown>), false)
    assert.equal('mnemonic' in (result as Record<string, unknown>), false)
  } finally {
    globalThis.fetch = originalFetch
    process.env.POLLAR_API_KEY = originalApiKey
    process.env.POLLAR_API_BASE_URL = originalBaseUrl
    process.env.STELLAR_NETWORK = originalNetwork
  }
})

test('sends expected Authorization header and body payload', async () => {
  const originalFetch = globalThis.fetch
  const originalApiKey = process.env.POLLAR_API_KEY
  const originalBaseUrl = process.env.POLLAR_API_BASE_URL
  const originalNetwork = process.env.STELLAR_NETWORK
  process.env.POLLAR_API_KEY = 'api_k'
  process.env.POLLAR_API_BASE_URL = 'https://api.example'
  process.env.STELLAR_NETWORK = 'mainnet'

  let capturedInit: RequestInit | undefined
  let capturedUrl = ''
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedInit = init
    capturedUrl = String(input)
    return okJson({
      wallet_id: 'w_2',
      public_key: 'GPUBLIC2',
    })
  }) as unknown as typeof fetch

  try {
    await provisionWalletForUser('u-2')
    assert.equal(capturedUrl, 'https://api.example/wallets')
    assert.equal((capturedInit?.headers as Record<string, string>).Authorization, 'Bearer api_k')
    const body = JSON.parse(String(capturedInit?.body)) as Record<string, unknown>
    assert.equal(body.external_id, 'u-2')
    assert.equal(body.custody, 'embedded')
    assert.equal(body.network, 'mainnet')
  } finally {
    globalThis.fetch = originalFetch
    process.env.POLLAR_API_KEY = originalApiKey
    process.env.POLLAR_API_BASE_URL = originalBaseUrl
    process.env.STELLAR_NETWORK = originalNetwork
  }
})

test('retries on failure and succeeds on second attempt', async () => {
  const restoreTimers = withMockedTimers()
  const originalFetch = globalThis.fetch
  const originalApiKey = process.env.POLLAR_API_KEY
  process.env.POLLAR_API_KEY = 'retry_key'

  let attempts = 0
  globalThis.fetch = (async () => {
    attempts += 1
    if (attempts === 1) {
      return failText(503, 'temporary outage')
    }
    return okJson({
      pollarWalletId: 'wallet_retry',
      stellarPublicKey: 'GRETRYKEY',
    })
  }) as unknown as typeof fetch

  try {
    const result = await provisionWalletForUser('retry-user')
    assert.equal(result.status, 'active')
    assert.equal(result.pollarWalletId, 'wallet_retry')
    assert.equal(attempts, 2)
  } finally {
    restoreTimers()
    globalThis.fetch = originalFetch
    process.env.POLLAR_API_KEY = originalApiKey
  }
})

test('returns status error after all retries are exhausted', async () => {
  const restoreTimers = withMockedTimers()
  const originalFetch = globalThis.fetch
  const originalApiKey = process.env.POLLAR_API_KEY
  const originalWebhook = process.env.ADMIN_ALERT_WEBHOOK_URL
  process.env.POLLAR_API_KEY = 'retry_key'
  delete process.env.ADMIN_ALERT_WEBHOOK_URL

  let attempts = 0
  globalThis.fetch = (async () => {
    attempts += 1
    return failText(500, 'still down')
  }) as unknown as typeof fetch

  try {
    const result = await provisionWalletForUser('error-user')
    assert.equal(result.status, 'error')
    assert.equal(result.pollarWalletId, '')
    assert.equal(result.stellarPublicKey, '')
    assert.equal(attempts, 4)
  } finally {
    restoreTimers()
    globalThis.fetch = originalFetch
    process.env.POLLAR_API_KEY = originalApiKey
    process.env.ADMIN_ALERT_WEBHOOK_URL = originalWebhook
  }
})

test('throws if POLLAR_API_KEY is not set', async () => {
  const originalApiKey = process.env.POLLAR_API_KEY
  delete process.env.POLLAR_API_KEY

  try {
    await assert.rejects(
      provisionWalletForUser('no-key-user'),
      /POLLAR_API_KEY is required to provision wallets/,
    )
  } finally {
    process.env.POLLAR_API_KEY = originalApiKey
  }
})

test('isWalletActive returns true only for active status', () => {
  assert.equal(isWalletActive({ status: 'active' }), true)
  assert.equal(isWalletActive({ status: 'provisioning' }), false)
  assert.equal(isWalletActive({ status: 'error' }), false)
  assert.equal(isWalletActive(null), false)
  assert.equal(isWalletActive(undefined), false)
})
