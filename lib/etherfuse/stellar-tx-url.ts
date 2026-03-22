/**
 * Enlace a Stellar Expert según `NEXT_PUBLIC_STELLAR_NETWORK` (testnet por defecto).
 */
export function stellarTxExplorerUrl(signature: string | null | undefined): string | null {
  const s = typeof signature === "string" ? signature.trim() : "";
  if (!s) return null;
  const isMain =
    typeof process.env.NEXT_PUBLIC_STELLAR_NETWORK === "string" &&
    ["public", "mainnet"].includes(
      process.env.NEXT_PUBLIC_STELLAR_NETWORK.toLowerCase(),
    );
  const base = isMain
    ? "https://stellar.expert/explorer/public/tx/"
    : "https://stellar.expert/explorer/testnet/tx/";
  return `${base}${encodeURIComponent(s)}`;
}
