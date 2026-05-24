/**
 * Polymarket public data clients.
 *
 * Gamma covers market/event discovery. CLOB covers order-book style data.
 * No API key is required for the read endpoints used here.
 */

try { process.loadEnvFile(); } catch {}

const DEFAULT_GAMMA_BASE_URL = "https://gamma-api.polymarket.com";
const DEFAULT_CLOB_BASE_URL = "https://clob.polymarket.com";
const DEFAULT_TIMEOUT_MS = 15_000;

export class PolymarketClient {
  constructor(options = {}) {
    this.gammaBaseUrl = options.gammaBaseUrl ?? process.env.POLYMARKET_GAMMA_BASE_URL ?? DEFAULT_GAMMA_BASE_URL;
    this.clobBaseUrl = options.clobBaseUrl ?? process.env.POLYMARKET_CLOB_BASE_URL ?? DEFAULT_CLOB_BASE_URL;
    this.timeoutMs = options.timeoutMs ?? Number(process.env.POLYMARKET_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  }

  gamma(path, params = {}) {
    return this.get(this.gammaBaseUrl, path, params);
  }

  clob(path, params = {}) {
    return this.get(this.clobBaseUrl, path, params);
  }

  async get(baseUrl, path, params = {}) {
    const url = new URL(path, ensureTrailingSlash(baseUrl));
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url.toString(), {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    const text = await response.text();
    const body = parseJson(text);

    if (!response.ok) {
      throw new PolymarketError(response.status, response.statusText, path, body ?? text);
    }

    return body ?? { raw: text };
  }
}

export class PolymarketError extends Error {
  constructor(status, statusText, path, body) {
    super(`Polymarket API error ${status ?? ""} ${statusText} on ${path}`);
    this.name = "PolymarketError";
    this.status = status;
    this.path = path;
    this.body = body;
  }
}

function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
