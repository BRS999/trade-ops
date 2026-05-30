/**
 * Binance market-data clients — USD-M Futures and Spot.
 *
 * No API key required for any endpoints covered here.
 *
 * Spot uses data-api.binance.vision (official market-data mirror, no geo-restriction).
 * Futures uses fapi.binance.com.
 * Both return HTTP 451 from restricted regions on the main api.binance.com domain —
 * use the mirror URL for spot and Hyperliquid as fallback for derivatives context.
 */

try { process.loadEnvFile(); } catch {}

const DEFAULT_BASE_URL = "https://fapi.binance.com";
const DEFAULT_SPOT_BASE_URL = "https://data-api.binance.vision";
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

export class BinanceSpotClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl ?? process.env.BINANCE_SPOT_BASE_URL ?? DEFAULT_SPOT_BASE_URL;
    this.timeoutMs = options.timeoutMs ?? Number(process.env.BINANCE_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
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
