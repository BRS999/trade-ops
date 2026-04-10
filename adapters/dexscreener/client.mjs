/**
 * DexScreener HTTP client.
 *
 * No API key required — public endpoints only.
 * Base URL overridable via DEXSCREENER_BASE_URL env var.
 */

const BASE_URL = process.env.DEXSCREENER_BASE_URL ?? "https://api.dexscreener.com";
const TIMEOUT_MS = Number(process.env.DEXSCREENER_TIMEOUT_MS ?? 15000);

export class DexScreenerError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "DexScreenerError";
    this.status = status;
  }
}

export class DexScreenerClient {
  async get(path, params = {}) {
    const url = new URL(path, BASE_URL);
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== "") url.searchParams.set(k, String(v));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(url.toString(), { signal: controller.signal });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new DexScreenerError(
          `DexScreener error ${res.status} ${res.statusText} on ${path}${body ? `: ${body}` : ""}`,
          res.status
        );
      }
      return res.json();
    } finally {
      clearTimeout(timeout);
    }
  }
}
