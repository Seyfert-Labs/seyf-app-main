import { AppError } from "@/lib/seyf/api-error";

/**
 * Maps an Etherfuse HTTP error status code to a structured AppError.
 *
 * The raw providerMessage is stored in AppError.message for server-side
 * logging only — it is never forwarded to the client in response bodies.
 */
export function mapEtherfuseHttpError(
  status: number,
  providerMessage: string,
): AppError {
  // Status inválido (p. ej. 0) — no caer en el fallback generic_error silencioso
  if (!Number.isFinite(status) || status < 100 || status > 599) {
    return new AppError("provider_unavailable", {
      statusCode: 502,
      retryable: true,
      message: `HTTP status inválido (${String(status)}): ${providerMessage}`,
    });
  }

  // 429 — rate limited, retryable
  if (status === 429) {
    return new AppError("provider_unavailable", {
      statusCode: 429,
      retryable: true,
      message: providerMessage,
    });
  }

  // 502, 503 — bad gateway / service unavailable, retryable
  if (status === 502 || status === 503) {
    return new AppError("provider_unavailable", {
      statusCode: 502,
      retryable: true,
      message: providerMessage,
    });
  }

  // 504 — gateway timeout, retryable
  if (status === 504) {
    return new AppError("provider_unavailable", {
      statusCode: 504,
      retryable: true,
      message: providerMessage,
    });
  }

  // Other 5xx — not retryable
  if (status >= 500 && status <= 599) {
    return new AppError("provider_unavailable", {
      statusCode: 502,
      retryable: false,
      message: providerMessage,
    });
  }

  // 4xx (excluding 429, handled above) — client error, not retryable
  if (status >= 400 && status <= 499) {
    return new AppError("provider_rejected", {
      statusCode: 400,
      retryable: false,
      message: providerMessage,
    });
  }

  // Fallback for unexpected status codes
  return new AppError("generic_error", {
    statusCode: 500,
    retryable: false,
    message: providerMessage,
  });
}

/**
 * Maps a network-level error (e.g. fetch failure, abort) to a structured AppError.
 *
 * AbortError signals a request timeout → 504 provider_unavailable.
 * All other network errors → 502 provider_unavailable.
 */
export function mapEtherfuseNetworkError(cause: unknown): AppError {
  if (cause instanceof Error && cause.name === "AbortError") {
    return new AppError("provider_unavailable", {
      statusCode: 504,
      message: "Request timed out",
    });
  }

  return new AppError("provider_unavailable", {
    statusCode: 502,
  });
}
