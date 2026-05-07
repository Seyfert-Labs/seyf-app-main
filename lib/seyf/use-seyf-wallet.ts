'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePollar } from '@pollar/react'
import type { WalletBalanceState } from '@pollar/core'

import {
  isValidStellarPublicKey,
  normalizeStellarPublicKey,
} from '@/lib/etherfuse/stellar-public-key'

export type SeyfWalletSession = {
  stellarAddress: string
  publicKey: string
  contractId: string
  email?: string
  createdAt?: string
}

function stellarRowDisplay(b: {
  type: string
  code: string
  balance: string
  available: string
}): string {
  const avail = typeof b.available === 'string' ? b.available.trim() : ''
  const bal = typeof b.balance === 'string' ? b.balance.trim() : ''
  return avail !== '' ? avail : bal !== '' ? bal : '0'
}

function mapBalances(state: WalletBalanceState): {
  assetBalances: Array<{ code?: string; assetCode?: string; balance?: string }>
  xlmBalance: string | null
} {
  if (state.step !== 'loaded') {
    return { assetBalances: [], xlmBalance: null }
  }
  const rows = state.data.balances
  const assetBalances = rows.map((b) => {
    const isNative = b.type === 'native'
    const code = isNative ? 'XLM' : b.code
    return {
      code,
      assetCode: code,
      balance: stellarRowDisplay({
        type: b.type,
        code: b.code,
        balance: b.balance,
        available: b.available,
      }),
    }
  })
  const native = rows.find((x) => x.type === 'native')
  const byXlmCode = rows.find((x) => String(x.code).toUpperCase() === 'XLM')
  const xlmRow = native ?? byXlmCode
  const xlmBalance = xlmRow
    ? stellarRowDisplay({
        type: xlmRow.type,
        code: xlmRow.code,
        balance: xlmRow.balance,
        available: xlmRow.available,
      })
    : null
  return { assetBalances, xlmBalance }
}

/**
 * Capa sobre Pollar con la forma que usaba Accesly (`useAccesly`) para no reescribir toda la UI.
 */
export function useSeyfWallet() {
  const { isAuthenticated, walletAddress, walletBalance, refreshBalance, openLoginModal, logout, getClient } =
    usePollar()

  const getClientRef = useRef(getClient)
  getClientRef.current = getClient

  /** Pollar devuelve una función nueva cada render; si va en deps de useEffect → bucle infinito. */
  const refreshBalanceRef = useRef(refreshBalance)
  refreshBalanceRef.current = refreshBalance

  const [mounted, setMounted] = useState(false)
  const [sessionEmail, setSessionEmail] = useState<string | undefined>()
  const [createdAtIso, setCreatedAtIso] = useState<string | undefined>()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !walletAddress) {
      setSessionEmail(undefined)
      setCreatedAtIso(undefined)
      return
    }
    const auth = getClientRef.current().getAuthState()
    if (auth.step !== 'authenticated') return
    const s = auth.session
    const mail =
      s.data?.providers?.email?.address ??
      (typeof s.data?.mail === 'string' ? s.data.mail : undefined)
    setSessionEmail(mail)
    const ca = s.wallet?.createdAt
    setCreatedAtIso(ca != null ? new Date(ca).toISOString() : undefined)
  }, [isAuthenticated, walletAddress])

  useEffect(() => {
    if (isAuthenticated && walletAddress) {
      void Promise.resolve(refreshBalanceRef.current()).catch((e: unknown) => {
        console.warn('[SeyfWallet] refreshBalance (effect)', e)
      })
    }
  }, [isAuthenticated, walletAddress])

  const { assetBalances, xlmBalance } = useMemo(
    () => mapBalances(walletBalance),
    [walletBalance],
  )

  const wallet: SeyfWalletSession | null = useMemo(() => {
    if (!isAuthenticated || !walletAddress) return null
    return {
      stellarAddress: walletAddress,
      publicKey: walletAddress,
      contractId: '',
      email: sessionEmail,
      createdAt: createdAtIso,
    }
  }, [isAuthenticated, walletAddress, sessionEmail, createdAtIso])

  /** Solo StrKey G… válida para hints a Etherfuse (cinta Pollar). A veces `walletAddress` es otro id. */
  const etherfusePublicKeyHint = useMemo(() => {
    if (!wallet?.stellarAddress) return null
    const raw = wallet.stellarAddress.trim()
    if (isValidStellarPublicKey(raw)) return normalizeStellarPublicKey(raw)
    try {
      const auth = getClientRef.current().getAuthState()
      if (auth.step !== 'authenticated') return null
      const w = auth.session?.wallet as
        | { publicKey?: unknown; stellarPublicKey?: unknown }
        | undefined
      const pk =
        typeof w?.publicKey === 'string'
          ? w.publicKey
          : typeof w?.stellarPublicKey === 'string'
            ? w.stellarPublicKey
            : null
      if (pk && isValidStellarPublicKey(pk)) return normalizeStellarPublicKey(pk)
    } catch {
      return null
    }
    return null
  }, [wallet?.stellarAddress])

  /** Solo `loading`: si incluimos `idle`, el panel de cuenta se queda en skeleton hasta el primer fetch (y confunde con errores de API). */
  const balanceLoading =
    isAuthenticated && !!walletAddress && walletBalance.step === 'loading'

  const balanceError: string | null =
    walletBalance.step === 'error' ? walletBalance.message : null

  const loading = !mounted || balanceLoading

  const refresh = useCallback(() => {
    return Promise.resolve(refreshBalanceRef.current()).catch((e: unknown) => {
      console.warn('[SeyfWallet] refreshBalance', e)
    })
  }, [])

  return {
    wallet,
    etherfusePublicKeyHint,
    balance: xlmBalance,
    assetBalances,
    loading,
    creating: false,
    error: null as string | null,
    balanceError,
    disconnect: () => {
      void logout()
    },
    connect: () => openLoginModal(),
    refreshBalance: refresh,
    refreshWallet: refresh,
  }
}
