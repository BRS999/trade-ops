/**
 * Hyperliquid public info API client.
 *
 * No API key required for the market-data endpoints covered here.
 */

try { process.loadEnvFile(); } catch {}

const DEFAULT_BASE_URL = "https://api.hyperliquid.xyz";
const DEFAULT_TIMEOUT_MS = 15_000;

export class HyperliquidClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl ?? process.env.HYPERLIQUID_BASE_URL ?? DEFAULT_BASE_URL;
    this.timeoutMs = options.timeoutMs ?? Number(process.env.HYPERLIQUID_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  }

  async info(body) {
    const url = new URL("info", ensureTrailingSlash(this.baseUrl));
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    const text = await response.text();
    const parsed = parseJson(text);

    if (!response.ok) {
      throw new HyperliquidError(response.status, response.statusText, "info", parsed ?? text);
    }

    return parsed ?? { raw: text };
  }
}

export class HyperliquidError extends Error {
  constructor(status, statusText, path, body) {
    super(`Hyperliquid API error ${status ?? ""} ${statusText} on ${path}`);
    this.name = "HyperliquidError";
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
