#!/usr/bin/env node
/**
 * Comprueba ETHERFUSE_API_KEY + ETHERFUSE_API_BASE_URL con GET /ramp/me.
 * Uso: npm run etherfuse:verify
 * Requiere .env.local (o variables ya exportadas en el shell).
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

const root = resolve(import.meta.dirname, "..");
loadEnvFile(resolve(root, ".env.local"));
loadEnvFile(resolve(root, ".env"));

const baseUrl = (
  process.env.ETHERFUSE_API_BASE_URL?.trim() || "https://api.sand.etherfuse.com"
).replace(/\/$/, "");
const apiKey = process.env.ETHERFUSE_API_KEY?.trim();

if (!apiKey) {
  console.error(
    "Falta ETHERFUSE_API_KEY. Copia .env.example a .env.local y pega tu clave de sandbox.",
  );
  process.exit(1);
}

const url = `${baseUrl}/ramp/me`;
const res = await fetch(url, {
  method: "GET",
  headers: {
    Authorization: apiKey,
    Accept: "application/json",
  },
});

const bodyText = await res.text();
if (!res.ok) {
  console.error(`Error ${res.status} en ${url}`);
  console.error(bodyText.slice(0, 800));
  process.exit(1);
}

let org;
try {
  org = JSON.parse(bodyText);
} catch {
  console.error("Respuesta no JSON:", bodyText.slice(0, 200));
  process.exit(1);
}

console.log("Etherfuse OK (sandbox/prod según ETHERFUSE_API_BASE_URL)");
console.log("  URL:", baseUrl);
console.log("  Organización:", org.displayName ?? org.id);
console.log("  id:", org.id);
if (org.approvedAt != null) console.log("  approvedAt:", org.approvedAt);
