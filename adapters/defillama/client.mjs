/**
 * DeFiLlama public API client.
 *
 * No API key required for the endpoints covered here.
 */

try { process.loadEnvFile(); } catch {}

const DEFAULT_BASE_URL = "https://api.llama.fi";
const DEFAULT_COINS_BASE_URL = "https://coins.llama.fi";
const DEFAULT_STABLECOINS_BASE_URL = "https://stablecoins.llama.fi";
const DEFAULT_YIELDS_BASE_URL = "https://yields.llama.fi";
const DEFAULT_TIMEOUT_MS = 15_000;

export class DefiLlamaClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl ?? process.env.DEFILLAMA_BASE_URL ?? DEFAULT_BASE_URL;
    this.coinsBaseUrl = options.coinsBaseUrl ?? process.env.DEFILLAMA_COINS_BASE_URL ?? DEFAULT_COINS_BASE_URL;
    this.stablecoinsBaseUrl = options.stablecoinsBaseUrl ?? process.env.DEFILLAMA_STABLECOINS_BASE_URL ?? DEFAULT_STABLECOINS_BASE_URL;
    this.yieldsBaseUrl = options.yieldsBaseUrl ?? process.env.DEFILLAMA_YIELDS_BASE_URL ?? DEFAULT_YIELDS_BASE_URL;
    this.timeoutMs = options.timeoutMs ?? Number(process.env.DEFILLAMA_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  }

  llama(path, params = {}) {
    return this.get(this.baseUrl, path, params);
  }

  coins(path, params = {}) {
    return this.get(this.coinsBaseUrl, path, params);
  }

  stablecoins(path, params = {}) {
    return this.get(this.stablecoinsBaseUrl, path, params);
  }

  yields(path, params = {}) {
    return this.get(this.yieldsBaseUrl, path, params);
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
      throw new DefiLlamaError(response.status, response.statusText, path, body ?? text);
    }

    return body ?? { raw: text };
  }
}

export class DefiLlamaError extends Error {
  constructor(status, statusText, path, body) {
    super(`DeFiLlama API error ${status ?? ""} ${statusText} on ${path}`);
    this.name = "DefiLlamaError";
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
