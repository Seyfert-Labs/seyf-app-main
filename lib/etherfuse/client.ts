import { getEtherfuseConfig } from "./config.ts";

export const ETHERFUSE_DEFAULT_TIMEOUT_MS = 10_000;
export const ETHERFUSE_MAX_RETRIES = 3;

export type EtherfuseFetchOptions = Omit<RequestInit, "headers"> & {
  headers?: HeadersInit;
  /** Override the default 10 000 ms request timeout. */
  timeoutMs?: number;
  /**
   * Opt-in retry for non-idempotent writes.
   * Default: false for POST/PUT/PATCH/DELETE; GET is always retryable.
   */
  retryable?: boolean;
};

/** Retryable HTTP status codes. */
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

/** HTTP methods that are non-idempotent by default. */
const NON_IDEMPOTENT_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Hardened fetch wrapper:
 * - Injects Authorization header from getEtherfuseConfig()
 * - Enforces timeout via AbortController (per-request)
 * - Retries idempotent GETs (and explicit retryable writes) on 429/502/503/504
 *   with exponential backoff: 200 * 2^attempt ms
 * - Maps all failures to AppError via mapEtherfuseHttpError / mapEtherfuseNetworkError
 */
export async function etherfuseFetch(
  path: string,
  init: EtherfuseFetchOptions = {},
): Promise<Response> {
  const { baseUrl, apiKey } = getEtherfuseConfig();
  const url = path.startsWith("http")
    ? path
    : `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;

  const timeoutMs = init.timeoutMs ?? ETHERFUSE_DEFAULT_TIMEOUT_MS;
  const method = (init.method ?? "GET").toUpperCase();
  const isNonIdempotent = NON_IDEMPOTENT_METHODS.has(method);
  const shouldRetry = init.retryable === true || !isNonIdempotent;

  const maxAttempts = shouldRetry ? ETHERFUSE_MAX_RETRIES + 1 : 1;

  let lastStatus: number | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Backoff before retry attempts (not before the first attempt)
    if (attempt > 0) {
      await sleep(200 * 2 ** (attempt - 1));
    }

    // Per-request AbortController for timeout
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers = new Headers(init.headers);
      if (!headers.has("Authorization")) {
        headers.set("Authorization", apiKey);
      }
      if (!headers.has("Accept")) {
        headers.set("Accept", "application/json");
      }

      const res = await fetch(url, {
        ...init,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timerId);

      if (!res.ok) {
        lastStatus = res.status;

        // Only retry on retryable statuses when retrying is allowed
        if (
          shouldRetry &&
          RETRYABLE_STATUSES.has(res.status) &&
          attempt < maxAttempts - 1
        ) {
          continue;
        }

        // Read body for error message
        let rawMessage = "";
        try {
          rawMessage = await res.text();
        } catch {
          // ignore body read errors
        }

        throw mapEtherfuseHttpError(res.status, rawMessage);
      }

      return res;
    } catch (err) {
      clearTimeout(timerId);

      // If it's already an AppError (from mapEtherfuseHttpError above), rethrow
      if (err instanceof AppError) {
        // If retries are exhausted or not applicable, rethrow
        if (!shouldRetry || attempt >= maxAttempts - 1) {
          throw err;
        }
        // Only continue retrying if the status is retryable
        if (lastStatus !== undefined && RETRYABLE_STATUSES.has(lastStatus)) {
          continue;
        }
        throw err;
      }

      // Network/abort error
      const isAbort =
        err instanceof Error &&
        (err.name === "AbortError" ||
          (err instanceof DOMException && err.name === "AbortError"));

      if (isAbort) {
        // Timeout — throw immediately, no retry
        throw mapEtherfuseNetworkError(err);
      }

      // Other network error — retry if allowed
      if (shouldRetry && attempt < maxAttempts - 1) {
        continue;
      }

      throw mapEtherfuseNetworkError(err);
    }
  }

  // All retries exhausted
  throw new AppError("provider_unavailable", {
    message: `All ${ETHERFUSE_MAX_RETRIES} retries exhausted. Last status: ${lastStatus ?? "unknown"}`,
  });
}

/**
 * Reads the response body once. Etherfuse sometimes responds with plain text or HTML on errors;
 * avoids res.json() throwing on non-JSON bodies.
 */
export async function etherfuseReadBody<T = unknown>(
  res: Response,
): Promise<{ json: T | null; text: string }> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) return { json: null, text: "" };
  try {
    return { json: JSON.parse(trimmed) as T, text };
  } catch {
    return { json: null, text };
  }
}

/**
 * Readable message from Etherfuse JSON error bodies (OpenAPI uses `error`; sometimes other fields).
 */
export function extractEtherfuseErrorMessage(
  json: unknown,
  fallbackText: string,
  maxLen = 800,
): string {
  if (json && typeof json === "object") {
    const o = json as Record<string, unknown>;
    const err = o.error;
    if (typeof err === "string" && err.trim()) return err.trim();
    if (Array.isArray(err) && err.length > 0 && typeof err[0] === "string") {
      return err.filter((x) => typeof x === "string").join("; ");
    }
    const msg = o.message;
    if (typeof msg === "string" && msg.trim()) return msg.trim();
    const detail = o.detail;
    if (typeof detail === "string" && detail.trim()) return detail.trim();
  }
  const t = fallbackText.trim();
  return t.length > 0 ? t.slice(0, maxLen) : "Error desconocido de Etherfuse";
}

/** Verifies the API key against GET /ramp/me (sandbox or prod per ETHERFUSE_API_BASE_URL). */
export async function verifyEtherfuseApiKey(): Promise<{
  ok: true;
  organization: { id: string; displayName: string; approvedAt: string | null };
}> {
  const res = await etherfuseFetch("/ramp/me", { method: "GET" });
  const { json, text } = await etherfuseReadBody<{
    id: string;
    displayName: string;
    approvedAt: string | null;
  }>(res);
  if (!res.ok) {
    const msg = extractEtherfuseErrorMessage(json, text, 500);
    throw new Error(`Etherfuse /ramp/me falló (${res.status}): ${msg}`);
  }
  if (!json || typeof json !== "object") {
    throw new Error(
      `Etherfuse /ramp/me: respuesta no JSON (${res.status}): ${text.slice(0, 500)}`,
    );
  }
  return { ok: true as const, organization: json };
}
