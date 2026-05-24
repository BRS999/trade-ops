/**
 * U.S. Treasury FiscalData API client.
 *
 * No API key required.
 */

try { process.loadEnvFile(); } catch {}

const DEFAULT_BASE_URL = "https://api.fiscaldata.treasury.gov/services/api/fiscal_service";
const DEFAULT_TRANSPARENCY_BASE_URL = "https://www.transparency.treasury.gov/services/api/fiscal_service";
const DEFAULT_TIMEOUT_MS = 15_000;

export class FiscalDataClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl ?? process.env.FISCALDATA_BASE_URL ?? DEFAULT_BASE_URL;
    this.transparencyBaseUrl = options.transparencyBaseUrl ?? process.env.FISCALDATA_TRANSPARENCY_BASE_URL ?? DEFAULT_TRANSPARENCY_BASE_URL;
    this.timeoutMs = options.timeoutMs ?? Number(process.env.FISCALDATA_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  }

  async get(path, params = {}) {
    return this.getFrom(this.baseUrl, path, params);
  }

  async getTransparency(path, params = {}) {
    return this.getFrom(this.transparencyBaseUrl, path, params);
  }

  async getFrom(baseUrl, path, params = {}) {
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
      throw new FiscalDataError(response.status, response.statusText, path, body ?? text);
    }

    return body ?? { raw: text };
  }
}

export class FiscalDataError extends Error {
  constructor(status, statusText, path, body) {
    super(`FiscalData API error ${status ?? ""} ${statusText} on ${path}`);
    this.name = "FiscalDataError";
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
