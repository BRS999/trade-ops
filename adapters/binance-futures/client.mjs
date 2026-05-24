/**
 * Binance USD-M Futures public market-data client.
 *
 * No API key required for the endpoints covered here.
 */

try { process.loadEnvFile(); } catch {}

const DEFAULT_BASE_URL = "https://fapi.binance.com";
const DEFAULT_TIMEOUT_MS = 15_000;

export class BinanceFuturesClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl ?? process.env.BINANCE_FUTURES_BASE_URL ?? DEFAULT_BASE_URL;
    this.timeoutMs = options.timeoutMs ?? Number(process.env.BINANCE_FUTURES_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
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
      throw new BinanceFuturesError(response.status, response.statusText, path, body ?? text);
    }

    return body ?? { raw: text };
  }
}

export class BinanceFuturesError extends Error {
  constructor(status, statusText, path, body) {
    super(`Binance futures API error ${status ?? ""} ${statusText} on ${path}`);
    this.name = "BinanceFuturesError";
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
