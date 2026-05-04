import { z } from 'zod'
import { NextResponse } from 'next/server'
import { toErrorResponse, AppError } from '@/lib/seyf/api-error'
import { fetchEtherfuseKycStatus } from '@/lib/etherfuse/kyc'
import {
  getEtherfuseOnboardingSession,
  saveEtherfuseOnboardingSession,
} from '@/lib/etherfuse/onboarding-session'
import { createCustomerBankAccount, type BankAccountRegistration } from '@/lib/etherfuse/bank-accounts'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const bodySchema = z.object({
  kind: z.enum(['personal', 'business']),
  account: z.record(z.string(), z.unknown()),
  skipAutoApproval: z.boolean().optional(),
  label: z.string().optional(),
  bankAccountId: z.string().uuid().optional(),
})

function toRegistration(
  parsed: z.infer<typeof bodySchema>,
): BankAccountRegistration {
  if (parsed.kind === 'personal') {
    return {
      kind: 'personal',
      account: parsed.account as BankAccountRegistration['account'] & Record<string, unknown>,
    } as BankAccountRegistration
  }
  return {
    kind: 'business',
    account: parsed.account as BankAccountRegistration['account'] & Record<string, unknown>,
  } as BankAccountRegistration
}

export async function POST(req: Request) {
  try {
    const session = await getEtherfuseOnboardingSession()
    if (!session?.customerId) {
      throw new AppError('validation_error', {
        statusCode: 401,
        retryable: false,
        message:
          'No Etherfuse session found. Start onboarding in /identidad to bind customerId first.',
      })
    }
    if (!session.publicKey) {
      throw new AppError('validation_error', {
        statusCode: 401,
        retryable: false,
        message:
          'No Etherfuse wallet context found. Complete /identidad first to bind your public key.',
      })
    }

    const kyc = await fetchEtherfuseKycStatus(session.customerId, session.publicKey)
    if (!kyc.ok) {
      throw new AppError('validation_error', {
        statusCode: 409,
        retryable: false,
        message:
          'Primero envía tu formulario de identidad KYC para crear la cuenta CLABE.',
      })
    }

    const st = kyc.data.status
    if (st !== 'approved' && st !== 'approved_chain_deploying') {
      const msg =
        st === 'proposed'
          ? 'Tu KYC sigue en revisión. Cuando Etherfuse apruebe tu identidad, podrás registrar tu CLABE.'
          : st === 'rejected'
            ? 'Tu verificación fue rechazada. Actualiza tu información de identidad antes de registrar una cuenta bancaria.'
            : 'Tu identidad aún no está lista para vincular CLABE. Completa o espera la verificación en Identidad.'
      throw new AppError('validation_error', {
        statusCode: 409,
        retryable: false,
        message: msg,
      })
    }

    const raw = (await req.json().catch(() => null)) as unknown
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      throw new AppError('validation_error', {
        statusCode: 400,
        retryable: false,
        message: `Invalid payload for bank account creation: ${parsed.error.message}`,
      })
    }

    const registration = toRegistration(parsed.data)
    const bankAccount = await createCustomerBankAccount(session.customerId, {
      registration,
      skipAutoApproval: parsed.data.skipAutoApproval,
      label: parsed.data.label,
      bankAccountId: parsed.data.bankAccountId,
    })
    await saveEtherfuseOnboardingSession({
      customerId: session.customerId,
      bankAccountId: bankAccount.bankAccountId,
      publicKey: session.publicKey,
    })

    return NextResponse.json(
      {
        ok: true,
        customerId: session.customerId,
        bankAccount,
      },
      {
        status: 201,
        headers: { 'Cache-Control': 'no-store' },
      },
    )
  } catch (e) {
    return toErrorResponse(e, 'etherfuse/bank-account')
  }
}

