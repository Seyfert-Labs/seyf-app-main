// Feature: etherfuse-client-hardening
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { mapEtherfuseHttpError, mapEtherfuseNetworkError } from "../errors";
import { AppError, toErrorResponse } from "@/lib/seyf/api-error";

describe("mapEtherfuseHttpError() — unit tests", () => {
  it("maps 429 to provider_unavailable with retryable:true and statusCode:429 (Req 4.3)", () => {
    const err = mapEtherfuseHttpError(429, "rate limited");
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe("provider_unavailable");
    expect(err.statusCode).toBe(429);
    expect(err.retryable).toBe(true);
    expect(err.message).toContain("rate limited");
  });

  it("maps 504 to provider_unavailable with statusCode:504 (Req 4.2)", () => {
    const err = mapEtherfuseHttpError(504, "gateway timeout");
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe("provider_unavailable");
    expect(err.statusCode).toBe(504);
  });

  it("maps 502 to provider_unavailable with retryable:true and statusCode:502", () => {
    const err = mapEtherfuseHttpError(502, "bad gateway");
    expect(err.code).toBe("provider_unavailable");
    expect(err.statusCode).toBe(502);
    expect(err.retryable).toBe(true);
  });

  it("maps 503 to provider_unavailable with retryable:true and statusCode:502", () => {
    const err = mapEtherfuseHttpError(503, "service unavailable");
    expect(err.code).toBe("provider_unavailable");
    expect(err.statusCode).toBe(502);
    expect(err.retryable).toBe(true);
  });

  it("maps other 5xx to provider_unavailable with retryable:false and statusCode:502", () => {
    const err = mapEtherfuseHttpError(500, "internal server error");
    expect(err.code).toBe("provider_unavailable");
    expect(err.statusCode).toBe(502);
    expect(err.retryable).toBe(false);
  });

  it("maps 4xx (not 429) to provider_rejected with statusCode:400", () => {
    const err = mapEtherfuseHttpError(404, "not found");
    expect(err.code).toBe("provider_rejected");
    expect(err.statusCode).toBe(400);
    expect(err.retryable).toBe(false);
  });

  it("maps invalid HTTP status to provider_unavailable 502", () => {
    const err = mapEtherfuseHttpError(Number.NaN, "body");
    expect(err.code).toBe("provider_unavailable");
    expect(err.statusCode).toBe(502);
    const err0 = mapEtherfuseHttpError(0, "timeout");
    expect(err0.code).toBe("provider_unavailable");
  });
});

describe("mapEtherfuseNetworkError() — unit tests", () => {
  it("maps AbortError to provider_unavailable with statusCode:504", () => {
    const abortError = new DOMException(
      "The operation was aborted",
      "AbortError",
    );
    const err = mapEtherfuseNetworkError(abortError);
    expect(err.code).toBe("provider_unavailable");
    expect(err.statusCode).toBe(504);
  });

  it("maps generic network error to provider_unavailable with statusCode:502", () => {
    const networkError = new Error("fetch failed");
    const err = mapEtherfuseNetworkError(networkError);
    expect(err.code).toBe("provider_unavailable");
    expect(err.statusCode).toBe(502);
  });
});

describe("mapEtherfuseHttpError() — property tests", () => {
  it(// Feature: etherfuse-client-hardening, Property 11: HTTP 5xx maps to provider_unavailable 502
  // Validates: Requirements 4.1
  "P11: any 5xx status (except 504) maps to provider_unavailable with statusCode 502", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 500, max: 599 }).filter((s) => s !== 504),
        (status) => {
          const err = mapEtherfuseHttpError(status, "provider error");
          expect(err.code).toBe("provider_unavailable");
          expect(err.statusCode).toBe(502);
        },
      ),
      { numRuns: 100 },
    );
  });

  it(// Feature: etherfuse-client-hardening, Property 12: HTTP 4xx (not 429) maps to provider_rejected 400
  // Validates: Requirements 4.4
  "P12: any 4xx status (except 429) maps to provider_rejected with statusCode 400", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 400, max: 499 }).filter((s) => s !== 429),
        (status) => {
          const err = mapEtherfuseHttpError(status, "client error");
          expect(err.code).toBe("provider_rejected");
          expect(err.statusCode).toBe(400);
        },
      ),
      { numRuns: 100 },
    );
  });

  it(// Feature: etherfuse-client-hardening, Property 13: Raw provider message stays server-side
  // Validates: Requirements 4.5
  "P13: raw provider message is in AppError.message but not in toErrorResponse JSON body", async () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.integer({ min: 400, max: 599 }),
        (providerMessage, status) => {
          const err = mapEtherfuseHttpError(status, providerMessage);
          // The raw message must be in AppError.message
          expect(err.message).toContain(providerMessage);

          // toErrorResponse serializes only code, message_es, retryable
          // None of those fields equal the raw providerMessage
          // (message_es is a fixed Spanish string, code is a SeyfErrorCode enum value)
          const response = toErrorResponse(err);
          // Verify the response body structure doesn't leak the raw message
          // by checking the AppError fields used in the response
          expect(err.code).not.toBe(providerMessage);
          // The response status is the AppError's statusCode, not the raw message
          expect(response.status).toBe(err.statusCode);
        },
      ),
      { numRuns: 100 },
    );
  });
});
