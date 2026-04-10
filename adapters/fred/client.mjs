/**
 * FRED (Federal Reserve Bank of St. Louis) REST API client.
 *
 * Environment variable: FRED_API_KEY
 * Free key: https://fred.stlouisfed.org/docs/api/api_key.html
 *
 * Rate limit: 120 req/min per key (conservative default: 30/min).
 */

try { process.loadEnvFile(); } catch {}

const BASE_URL = "https://api.stlouisfed.org/fred";
const DEFAULT_REQUESTS_PER_MINUTE = 30;

export class FredClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey ?? process.env.FRED_API_KEY ?? null;

    if (!this.apiKey) {
      throw new Error(
        "FRED API key not found. Set FRED_API_KEY environment variable."
      );
    }

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

  async get(endpoint, params = {}) {
    await this._waitForRateLimit();

    const url = new URL(`${BASE_URL}/${endpoint}`);
    url.searchParams.set("api_key", this.apiKey);
    url.searchParams.set("file_type", "json");

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new FredError(response.status, response.statusText, endpoint, body);
    }

    const data = await response.json();

    if (data.error_code) {
      throw new FredError(data.error_code, data.error_message, endpoint, JSON.stringify(data));
    }

    return data;
  }
}

export class FredError extends Error {
  constructor(status, message, endpoint, body) {
    super(`FRED API error ${status ?? ""} ${message} on ${endpoint}`);
    this.name = "FredError";
    this.status = status;
    this.endpoint = endpoint;
    this.body = body;
  }
}
