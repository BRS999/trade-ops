/**
 * Financial Modeling Prep (FMP) REST API client.
 *
 * Environment variable: FMP_API_KEY
 * Free key: https://financialmodelingprep.com
 * Free tier: 250 calls/day
 *
 * Base URL: https://financialmodelingprep.com/stable
 */

try { process.loadEnvFile(); } catch {}

const BASE_URL = "https://financialmodelingprep.com/stable";
const DEFAULT_REQUESTS_PER_MINUTE = 10;

export class FmpClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey ?? process.env.FMP_API_KEY ?? null;

    if (!this.apiKey) {
      throw new Error(
        "FMP API key not found. Set FMP_API_KEY environment variable."
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
    url.searchParams.set("apikey", this.apiKey);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new FmpError(response.status, response.statusText, endpoint, body);
    }

    const data = await response.json();

    if (data?.["Error Message"]) {
      throw new FmpError(null, data["Error Message"], endpoint, JSON.stringify(data));
    }

    return data;
  }
}

export class FmpError extends Error {
  constructor(status, message, endpoint, body) {
    super(`FMP API error ${status ?? ""} ${message} on ${endpoint}`);
    this.name = "FmpError";
    this.status = status;
    this.endpoint = endpoint;
    this.body = body;
  }
}
