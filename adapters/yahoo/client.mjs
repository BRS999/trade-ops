/**
 * Yahoo Finance base client.
 *
 * No API key required. Uses the unofficial chart/v8 endpoint.
 * Rate limit: conservative default of 10 req/min to avoid blocks.
 *
 * Ticker conventions:
 *   Equities:  NVDA, META, TSLA
 *   Crypto:    BTC-USD, SOL-USD, ETH-USD
 *   Indices:   ^GSPC (S&P 500), ^NDX (Nasdaq 100), ^DJI (Dow)
 *   Forex:     EURUSD=X, GBPUSD=X
 *   Futures:   ES=F (S&P), NQ=F (Nasdaq), GC=F (Gold), CL=F (Oil)
 */

const BASE_URL = "https://query2.finance.yahoo.com";
const DEFAULT_REQUESTS_PER_MINUTE = 10;
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

export class YahooClient {
  constructor(options = {}) {
    this.requestsPerMinute =
      options.requestsPerMinute ?? DEFAULT_REQUESTS_PER_MINUTE;
    this._queue = [];
  }

  // ---------------------------------------------------------------------------
  // Rate limiter — sliding window over the last 60s
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Core request
  // ---------------------------------------------------------------------------

  async get(path, params = {}) {
    await this._waitForRateLimit();

    const url = new URL(path, BASE_URL);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new YahooError(response.status, response.statusText, path, body);
    }

    return response.json();
  }
}

export class YahooError extends Error {
  constructor(status, statusText, path, body) {
    super(`Yahoo Finance error ${status ?? ""} ${statusText} on ${path}`);
    this.name = "YahooError";
    this.status = status;
    this.path = path;
    this.body = body;
  }
}
