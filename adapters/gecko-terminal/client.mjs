/**
 * GeckoTerminal REST API client.
 *
 * No API key required. Free public API.
 * Base URL: https://api.geckoterminal.com/api/v2
 * Docs: https://www.geckoterminal.com/dex-api
 *
 * Covers on-chain DEX data: pools, tokens, OHLCV, trades across 100+ networks.
 * Relevant networks for this stack: solana, ethereum, base, arbitrum
 */

const BASE_URL = "https://api.geckoterminal.com/api/v2";
const DEFAULT_REQUESTS_PER_MINUTE = 25;

export class GeckoTerminalClient {
  constructor(options = {}) {
    this.requestsPerMinute =
      options.requestsPerMinute ?? DEFAULT_REQUESTS_PER_MINUTE;
    this._queue = [];
  }

  async _waitForRateLimit() {
    const now = Date.now();
    const windowMs = 60_000;
    this._queue = this._queue.filter((t) => now - t < windowMs);

    if (this._queue.length >= this.requestsPerMinute) {
      const oldest = this._queue[0];
      const waitMs = windowMs - (now - oldest) + 10;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return this._waitForRateLimit();
    }

    this._queue.push(Date.now());
  }

  async get(path, params = {}) {
    await this._waitForRateLimit();

    const url = new URL(`${BASE_URL}/${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json;version=20230302" },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new GeckoTerminalError(response.status, response.statusText, path, body);
    }

    return response.json();
  }
}

export class GeckoTerminalError extends Error {
  constructor(status, statusText, path, body) {
    super(`GeckoTerminal error ${status ?? ""} ${statusText} on ${path}`);
    this.name = "GeckoTerminalError";
    this.status = status;
    this.path = path;
    this.body = body;
  }
}
