/**
 * Massive REST API base client.
 *
 * Handles authentication, base URL, rate limiting, and error normalisation.
 * All other Massive modules import this and call client.get(path, params).
 *
 * Environment variable: MASSIVE_API_KEY
 *
 * Rate limits: overridable via options.requestsPerMinute (default: 5).
 */

try { process.loadEnvFile(); } catch {}

const BASE_URL = "https://api.massive.com";
const DEFAULT_REQUESTS_PER_MINUTE = 5;

export class MassiveClient {
  constructor(options = {}) {
    this.apiKey =
      options.apiKey ?? process.env.MASSIVE_API_KEY ?? null;

    if (!this.apiKey) {
      throw new Error(
        "Massive API key not found. Set MASSIVE_API_KEY environment variable."
      );
    }

    // Rate limiter: sliding window queue
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

    // Prune timestamps older than the window
    this._queue = this._queue.filter((t) => now - t < windowMs);

    if (this._queue.length >= this.requestsPerMinute) {
      // Wait until the oldest request in the window expires
      const oldest = this._queue[0];
      const waitMs = windowMs - (now - oldest) + 10;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return this._waitForRateLimit(); // re-check after waiting
    }

    this._queue.push(Date.now());
  }

  // ---------------------------------------------------------------------------
  // Core request
  // ---------------------------------------------------------------------------

  async get(path, params = {}) {
    await this._waitForRateLimit();

    const url = new URL(path, BASE_URL);
    url.searchParams.set("apiKey", this.apiKey);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new MassiveError(response.status, response.statusText, path, body);
    }

    const data = await response.json();

    // Massive wraps most responses in { status, results, ... }
    // Surface a clean error if the API returns status: ERROR
    if (data.status === "ERROR") {
      throw new MassiveError(null, data.error ?? "API error", path, JSON.stringify(data));
    }

    return data;
  }

  // Convenience: paginate through all results using next_url
  async getAll(path, params = {}) {
    const results = [];
    let data = await this.get(path, params);
    if (data.results) results.push(...data.results);

    while (data.next_url) {
      // next_url is a full URL — strip the base and re-request via our client
      const next = new URL(data.next_url);
      const nextPath = next.pathname + next.search;
      data = await this.get(nextPath, {});
      if (data.results) results.push(...data.results);
    }

    return results;
  }
}

export class MassiveError extends Error {
  constructor(status, statusText, path, body) {
    super(`Massive API error ${status ?? ""} ${statusText} on ${path}`);
    this.name = "MassiveError";
    this.status = status;
    this.path = path;
    this.body = body;
  }
}
