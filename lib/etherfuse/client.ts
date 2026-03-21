import { getEtherfuseConfig } from "./config";

type EtherfuseFetchOptions = Omit<RequestInit, "headers"> & {
  headers?: HeadersInit;
};

/**
 * fetch a la API Etherfuse con Authorization = API key (sin Bearer).
 * @see https://docs.etherfuse.com/initial-setup
 */
export async function etherfuseFetch(
  path: string,
  init: EtherfuseFetchOptions = {},
): Promise<Response> {
  const { baseUrl, apiKey } = getEtherfuseConfig();
  const url = path.startsWith("http") ? path : `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
  const headers = new Headers(init.headers);
  if (!headers.has("Authorization")) {
    headers.set("Authorization", apiKey);
  }
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  return fetch(url, { ...init, headers });
}

/** Verifica la API key contra GET /ramp/me (sandbox o prod según ETHERFUSE_API_BASE_URL). */
export async function verifyEtherfuseApiKey(): Promise<{
  ok: true;
  organization: { id: string; displayName: string; approvedAt: string | null };
}> {
  const res = await etherfuseFetch("/ramp/me", { method: "GET" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Etherfuse /ramp/me falló (${res.status}): ${text.slice(0, 500)}`,
    );
  }
  const organization = (await res.json()) as {
    id: string;
    displayName: string;
    approvedAt: string | null;
  };
  return { ok: true as const, organization };
}
