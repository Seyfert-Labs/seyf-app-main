import { NextResponse } from "next/server";
import { extractEtherfuseErrorMessage } from "@/lib/etherfuse/client";

export type SeyfErrorCode =
  | "spei_timeout"
  | "deploy_failed"
  | "provider_unavailable"
  | "generic_error";

// User-facing copy (español neutro mexicano, PRD §3.1 / §2.8 US-13).
const MESSAGE_ES: Record<SeyfErrorCode, string> = {
  spei_timeout:
    "Tu transferencia SPEI sigue en proceso. Puede tardar hasta el siguiente día hábil.",
  deploy_failed: "Algo salió mal. Estamos en ello.",
  provider_unavailable:
    "El proveedor no está disponible en este momento. Intenta en unos minutos.",
  generic_error: "Algo salió mal. Estamos en ello.",
};

const DEFAULT_STATUS: Record<SeyfErrorCode, number> = {
  spei_timeout: 504,
  deploy_failed: 500,
  provider_unavailable: 502,
  generic_error: 500,
};

const DEFAULT_RETRYABLE: Record<SeyfErrorCode, boolean> = {
  spei_timeout: true,
  deploy_failed: false,
  provider_unavailable: true,
  generic_error: false,
};

export class AppError extends Error {
  readonly code: SeyfErrorCode;
  readonly statusCode: number;
  readonly retryable: boolean;

  constructor(
    code: SeyfErrorCode,
    opts?: {
      statusCode?: number;
      retryable?: boolean;
      /** Internal message for server-side logs (not sent to the client). */
      message?: string;
    },
  ) {
    super(opts?.message ?? MESSAGE_ES[code]);
    this.name = "AppError";
    this.code = code;
    this.statusCode = opts?.statusCode ?? DEFAULT_STATUS[code];
    this.retryable = opts?.retryable ?? DEFAULT_RETRYABLE[code];
  }
}

export type SeyfErrorBody = {
  error: {
    code: SeyfErrorCode;
    message_es: string;
    retryable: boolean;
  };
};

function isEtherfuseError(e: unknown): e is Error {
  return e instanceof Error && e.message.startsWith("Etherfuse ");
}

/**
 * Central catch handler for route handlers.
 * - AppError            → uses stored code / statusCode / retryable
 * - Etherfuse errors    → extractEtherfuseErrorMessage for the server log,
 *                         returns provider_unavailable (502) to the client
 * - anything else       → generic_error (500)
 *
 * Pass `context` matching the existing `[route/path]` log convention
 * (e.g. "quote/onramp"). Internal detail never leaves the server.
 */
export function toErrorResponse(
  e: unknown,
  context?: string,
): NextResponse<SeyfErrorBody> {
  const tag = context ? `[seyf/${context}]` : "[seyf]";

  if (e instanceof AppError) {
    console.error(tag, e.code, e.message);
    return NextResponse.json(
      {
        error: {
          code: e.code,
          message_es: MESSAGE_ES[e.code],
          retryable: e.retryable,
        },
      },
      { status: e.statusCode },
    );
  }

  if (isEtherfuseError(e)) {
    // passing null as json falls through to the fallbackText branch, trimming and capping length.
    const internal = extractEtherfuseErrorMessage(null, e.message);
    console.error(`${tag} provider error:`, internal);
    return NextResponse.json(
      {
        error: {
          code: "provider_unavailable",
          message_es: MESSAGE_ES.provider_unavailable,
          retryable: DEFAULT_RETRYABLE.provider_unavailable,
        },
      },
      { status: DEFAULT_STATUS.provider_unavailable },
    );
  }

  const internal = toErrorMessage(e, "unknown error");
  console.error(tag, internal);
  return NextResponse.json(
    {
      error: {
        code: "generic_error",
        message_es: MESSAGE_ES.generic_error,
        retryable: DEFAULT_RETRYABLE.generic_error,
      },
    },
    { status: DEFAULT_STATUS.generic_error },
  );
}

export function toErrorMessage(e: unknown, fallback = "Error desconocido"): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string" && e.trim()) return e.trim();
  return fallback;
}
