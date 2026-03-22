const DEFAULT_SANDBOX_BASE = "https://api.sand.etherfuse.com";

export type EtherfuseConfig = {
  baseUrl: string;
  apiKey: string;
};

/**
 * Configuración del cliente Etherfuse (solo servidor: rutas API, Server Actions, etc.).
 * La clave va en Authorization sin prefijo Bearer.
 */
export function getEtherfuseConfig(): EtherfuseConfig {
  const raw = process.env.ETHERFUSE_API_BASE_URL?.trim();
  const baseUrl = (raw && raw.length > 0 ? raw : DEFAULT_SANDBOX_BASE).replace(
    /\/$/,
    "",
  );
  const apiKey = process.env.ETHERFUSE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "ETHERFUSE_API_KEY no está definida. Copia .env.example a .env.local y pega tu API key de sandbox.",
    );
  }
  return { baseUrl, apiKey };
}

export function getEtherfuseBaseUrl(): string {
  const raw = process.env.ETHERFUSE_API_BASE_URL?.trim();
  return (raw && raw.length > 0 ? raw : DEFAULT_SANDBOX_BASE).replace(/\/$/, "");
}
