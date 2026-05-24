/**
 * Deribit public API client.
 *
 * No API key required for public market-data endpoints.
 */

try { process.loadEnvFile(); } catch {}

const DEFAULT_BASE_URL = "https://www.deribit.com/api/v2";
const DEFAULT_TIMEOUT_MS = 15_000;

export class DeribitClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl ?? process.env.DERIBIT_BASE_URL ?? DEFAULT_BASE_URL;
    this.timeoutMs = options.timeoutMs ?? Number(process.env.DERIBIT_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
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

    if (!response.ok || body?.error) {
      throw new DeribitError(response.status, response.statusText, path, body?.error ?? body ?? text);
    }

    return body?.result ?? body ?? { raw: text };
  }
}

export class DeribitError extends Error {
  constructor(status, statusText, path, body) {
    super(`Deribit API error ${status ?? ""} ${statusText} on ${path}`);
    this.name = "DeribitError";
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
