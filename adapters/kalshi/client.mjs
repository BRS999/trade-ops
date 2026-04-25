/**
 * Kalshi read-only REST API client.
 *
 * Environment variable: KALSHI_BASE_URL
 * Default base URL: https://api.elections.kalshi.com/trade-api/v2
 *
 * This adapter intentionally covers public/read endpoints only. Keep order
 * placement, cancellation, and account mutations out of this client unless the
 * repo adds an explicit execution adapter with approval boundaries.
 */

try { process.loadEnvFile(); } catch {}

const DEFAULT_BASE_URL = "https://api.elections.kalshi.com/trade-api/v2";
const DEFAULT_REQUESTS_PER_MINUTE = 30;
const USER_AGENT = "trade-ops-kalshi-reader/1.0";

export class KalshiClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl ?? process.env.KALSHI_BASE_URL ?? DEFAULT_BASE_URL;
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

    const url = new URL(path, ensureTrailingSlash(this.baseUrl));
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        accept: "application/json",
        "user-agent": USER_AGENT,
      },
    });

    const text = await response.text();
    const body = parseJson(text);

    if (!response.ok) {
      throw new KalshiError(
        response.status,
        response.statusText,
        path,
        body ?? text,
      );
    }

    return body ?? { raw: text };
  }
}

export class KalshiError extends Error {
  constructor(status, statusText, path, body) {
    super(`Kalshi API error ${status ?? ""} ${statusText} on ${path}`);
    this.name = "KalshiError";
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
