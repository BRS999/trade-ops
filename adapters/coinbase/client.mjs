/**
 * Coinbase Advanced Trade public market-data client.
 *
 * No API key required for public market endpoints used here.
 */

try { process.loadEnvFile(); } catch {}

const DEFAULT_BASE_URL = "https://api.coinbase.com/api/v3/brokerage";
const DEFAULT_TIMEOUT_MS = 15_000;

export class CoinbaseClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl ?? process.env.COINBASE_BASE_URL ?? DEFAULT_BASE_URL;
    this.timeoutMs = options.timeoutMs ?? Number(process.env.COINBASE_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  }

  async get(path, params = {}) {
    const url = new URL(path, ensureTrailingSlash(this.baseUrl));
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
      throw new CoinbaseError(response.status, response.statusText, path, body ?? text);
    }

    return body ?? { raw: text };
  }
}

export class CoinbaseError extends Error {
  constructor(status, statusText, path, body) {
    super(`Coinbase API error ${status ?? ""} ${statusText} on ${path}`);
    this.name = "CoinbaseError";
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
