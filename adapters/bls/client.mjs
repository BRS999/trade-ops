/**
 * Bureau of Labor Statistics public data API client.
 *
 * No key required for basic public API usage. A registration key can be set via
 * BLS_API_KEY for higher limits.
 */

try { process.loadEnvFile(); } catch {}

const DEFAULT_BASE_URL = "https://api.bls.gov/publicAPI/v2";
const DEFAULT_TIMEOUT_MS = 15_000;

export class BlsClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl ?? process.env.BLS_BASE_URL ?? DEFAULT_BASE_URL;
    this.apiKey = options.apiKey ?? process.env.BLS_API_KEY;
    this.timeoutMs = options.timeoutMs ?? Number(process.env.BLS_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  }

  async post(path, body = {}) {
    const url = new URL(path, ensureTrailingSlash(this.baseUrl));
    const payload = { ...body };
    if (this.apiKey && payload.registrationkey == null) payload.registrationkey = this.apiKey;

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    const text = await response.text();
    const parsed = parseJson(text);

    if (!response.ok || parsed?.status === "REQUEST_FAILED") {
      throw new BlsError(response.status, response.statusText, path, parsed ?? text);
    }

    return parsed ?? { raw: text };
  }
}

export class BlsError extends Error {
  constructor(status, statusText, path, body) {
    super(`BLS API error ${status ?? ""} ${statusText} on ${path}`);
    this.name = "BlsError";
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
