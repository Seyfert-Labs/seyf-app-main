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

/**
 * Lee el cuerpo una sola vez. Etherfuse a veces responde texto plano o HTML en errores;
 * evita que res.json() lance por cuerpos que no son JSON.
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

/** Verifica la API key contra GET /ramp/me (sandbox o prod según ETHERFUSE_API_BASE_URL). */
export async function verifyEtherfuseApiKey(): Promise<{
  ok: true;
  organization: { id: string; displayName: string; approvedAt: string | null };
}> {
  const res = await etherfuseFetch("/ramp/me", { method: "GET" });
  const { json, text } =
    await etherfuseReadBody<{
      id: string;
      displayName: string;
      approvedAt: string | null;
    }>(res);
  if (!res.ok) {
    throw new Error(
      `Etherfuse /ramp/me falló (${res.status}): ${text.slice(0, 500)}`,
    );
  }
  if (!json || typeof json !== "object") {
    throw new Error(
      `Etherfuse /ramp/me: respuesta no JSON (${res.status}): ${text.slice(0, 500)}`,
    );
  }
  return { ok: true as const, organization: json };
}
