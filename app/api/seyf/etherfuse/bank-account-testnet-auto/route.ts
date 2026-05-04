import { z } from 'zod'
import { NextResponse } from 'next/server'
import { toErrorResponse, AppError } from '@/lib/seyf/api-error'
import { fetchEtherfuseKycStatus } from '@/lib/etherfuse/kyc'
import {
  getEtherfuseOnboardingSession,
  saveEtherfuseOnboardingSession,
} from '@/lib/etherfuse/onboarding-session'
import { createCustomerBankAccount } from '@/lib/etherfuse/bank-accounts'
import {
  getTestnetSyntheticClabe,
  isEtherfuseTestnetBankAutofillActive,
} from '@/lib/seyf/etherfuse-testnet-bank-autofill'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const bodySchema = z.object({
  firstName: z.string().min(1),
  paternalLastName: z.string().min(1),
  maternalLastName: z.string().min(1),
  birthDate: z.string().regex(/^\d{8}$/, 'birthDate debe ser YYYYMMDD'),
  curp: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{18}$/, 'CURP debe tener 18 caracteres'),
  rfc: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{13}$/, 'RFC de persona física debe tener 13 caracteres'),
})

/**
 * POST /api/seyf/etherfuse/bank-account-testnet-auto
 * Sandbox: completa el alta en Etherfuse con CLABE sintética del servidor (no la pide al usuario).
 */
export async function POST(req: Request) {
  try {
    if (!isEtherfuseTestnetBankAutofillActive()) {
      throw new AppError('validation_error', {
        statusCode: 403,
        retryable: false,
        message:
          'Alta automática de cuenta bancaria en testnet no disponible. Define SEYF_TESTNET_SYNTHETIC_CLABE (18 dígitos) o usa mainnet con CLABE real.',
      })
    }

    const session = await getEtherfuseOnboardingSession()
    if (!session?.customerId || !session.publicKey) {
      throw new AppError('validation_error', {
        statusCode: 401,
        retryable: false,
        message: 'Sin sesión Etherfuse. Completa el flujo en /identidad primero.',
      })
    }

    const kyc = await fetchEtherfuseKycStatus(session.customerId, session.publicKey)
    if (!kyc.ok) {
      throw new AppError('validation_error', {
        statusCode: 409,
        retryable: false,
        message: 'Primero envía tu identidad KYC para registrar la ficha bancaria.',
      })
    }

    const raw = (await req.json().catch(() => null)) as unknown
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      throw new AppError('validation_error', {
        statusCode: 400,
        retryable: false,
        message: `Datos inválidos: ${parsed.error.message}`,
      })
    }

    const clabe = getTestnetSyntheticClabe()
    const bankAccount = await createCustomerBankAccount(session.customerId, {
      registration: {
        kind: 'personal',
        account: {
          firstName: parsed.data.firstName.trim(),
          paternalLastName: parsed.data.paternalLastName.trim(),
          maternalLastName: parsed.data.maternalLastName.trim(),
          birthDate: parsed.data.birthDate,
          birthCountryIsoCode: 'MX',
          curp: parsed.data.curp.trim().toUpperCase(),
          rfc: parsed.data.rfc.trim().toUpperCase(),
          clabe,
        },
      },
      label: 'seyf-testnet-synthetic',
    })

    await saveEtherfuseOnboardingSession({
      customerId: session.customerId,
      bankAccountId: bankAccount.bankAccountId,
      publicKey: session.publicKey,
    })

    return NextResponse.json(
      {
        ok: true,
        testnetAutofill: true,
        customerId: session.customerId,
        bankAccount,
      },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (e) {
    return toErrorResponse(e, 'etherfuse/bank-account-testnet-auto')
  }
}
