import { acceptAllEtherfuseAgreements } from "@/lib/etherfuse/agreements";
import { extractOrderIdFromCreateOrderResponse } from "@/lib/etherfuse/order-create-response";
import { generateOnboardingPresignedUrlResolving409 } from "@/lib/etherfuse/onboarding";
import {
  createMxOnrampOrderStellarResilient,
  createMxOnrampQuote,
  fetchRampableAssetsForWallet,
  pickOnrampTargetIdentifier,
} from "@/lib/etherfuse/ramp-api";
import { quoteIdFromEtherfusePayload } from "@/lib/etherfuse/quote-id";
import { resolveMvpPartnerCryptoWalletId } from "@/lib/etherfuse/partner-accounts";
import {
  isRecoverableRegisterWalletConflict,
  registerOrganizationWallet,
} from "@/lib/etherfuse/wallets";
import { AppError } from "@/lib/seyf/api-error";
import { upsertStoredAgreementsAccepted } from "@/lib/seyf/agreements-state-store";
import { assertEtherfuseKycApproved } from "@/lib/seyf/etherfuse-kyc-guard";
import type { EtherfuseRampContext } from "@/lib/seyf/etherfuse-ramp-context";
import { resolveEffectiveBankAccountIdForOnramp } from "@/lib/seyf/etherfuse-readiness";
import { saveStoredOnboardingSession } from "@/lib/seyf/onboarding-session-store";
import { acquireOnrampLock, releaseOnrampLock } from "@/lib/seyf/redis-guards";

async function ensureAgreementsForWallet(ctx: {
  customerId: string;
  bankAccountId: string;
  publicKey: string;
}): Promise<void> {
  const resolved = await generateOnboardingPresignedUrlResolving409({
    customerId: ctx.customerId,
    bankAccountId: ctx.bankAccountId,
    publicKey: ctx.publicKey,
  });
  await acceptAllEtherfuseAgreements({
    presignedUrl: resolved.presignedUrl,
  });
  await upsertStoredAgreementsAccepted({
    customerId: resolved.customerId,
    walletPublicKey: ctx.publicKey,
  });
}

export type SpeiDepositPrepareConflict = { ok: false; conflict: true };

export type SpeiDepositPrepareOk = {
  ok: true;
  quote: unknown;
  order: unknown;
  orderId: string | null;
  targetAssetUsed: string;
  contextSource: EtherfuseRampContext["source"];
};

export type SpeiDepositPrepareResult = SpeiDepositPrepareOk | SpeiDepositPrepareConflict;

/**
 * Cotización + orden onramp en el mismo proceso servidor (mismo customer, mismo quoteId).
 * Así se evita desalinear contexto entre dos requests del cliente (causaba 400 en order/onramp).
 */
export async function prepareSpeiDepositQuoteAndOrder(params: {
  ctx: EtherfuseRampContext;
  sourceAmount: string;
  targetAsset: string | null;
}): Promise<SpeiDepositPrepareResult> {
  const { ctx, sourceAmount, targetAsset } = params;

  await assertEtherfuseKycApproved({
    customerId: ctx.customerId,
    publicKey: ctx.publicKey,
  });

  const { assets } = await fetchRampableAssetsForWallet({
    walletPublicKey: ctx.publicKey,
  });
  const target = pickOnrampTargetIdentifier(assets, targetAsset);
  if (!target) {
    throw new AppError("validation_error", {
      statusCode: 422,
      messageEs:
        "No hay activo destino. Deja vacío el campo «Activo» avanzado o revisa CETES en Etherfuse.",
    });
  }

  const quote = await createMxOnrampQuote({
    customerId: ctx.customerId,
    sourceAmount,
    targetAssetIdentifier: target,
  });
  const quoteId = quoteIdFromEtherfusePayload(quote);
  if (!quoteId) {
    throw new AppError("validation_error", {
      messageEs: "Etherfuse no devolvió quoteId en la cotización. Intenta de nuevo.",
    });
  }

  const locked = await acquireOnrampLock(ctx.customerId);
  if (!locked) return { ok: false, conflict: true };

  try {
    let bankAccountId = ctx.bankAccountId;
    const effectiveBank = await resolveEffectiveBankAccountIdForOnramp({
      customerId: ctx.customerId,
      preferredBankAccountId: ctx.bankAccountId,
    });
    if (effectiveBank !== ctx.bankAccountId) {
      bankAccountId = effectiveBank;
      await saveStoredOnboardingSession({
        customerId: ctx.customerId,
        bankAccountId,
        walletPublicKey: ctx.publicKey,
      });
    }

    try {
      await registerOrganizationWallet({
        publicKey: ctx.publicKey,
        blockchain: "stellar",
        claimOwnership: true,
      });
    } catch (e) {
      if (!isRecoverableRegisterWalletConflict(e)) throw e;
    }

    const buildOrder = async () => {
      const cryptoWalletId = await resolveMvpPartnerCryptoWalletId(ctx.publicKey);
      return createMxOnrampOrderStellarResilient({
        bankAccountId,
        quoteId,
        publicKey: ctx.publicKey,
        cryptoWalletId,
      });
    };

    let order: unknown;
    try {
      order = await buildOrder();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes("terms and conditions")) {
        await ensureAgreementsForWallet({
          customerId: ctx.customerId,
          bankAccountId,
          publicKey: ctx.publicKey,
        });
        order = await buildOrder();
      } else {
        throw e;
      }
    }

    const orderId = extractOrderIdFromCreateOrderResponse(order);
    return {
      ok: true,
      quote,
      order,
      orderId,
      targetAssetUsed: target,
      contextSource: ctx.source,
    };
  } finally {
    await releaseOnrampLock(ctx.customerId);
  }
}
