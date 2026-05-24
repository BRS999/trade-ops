/**
 * RugCheck HTTP client.
 *
 * Public report endpoints often work without authentication. Set
 * RUGCHECK_API_KEY or RUGCHECK_JWT when authenticated access is needed.
 * Base URL overridable via RUGCHECK_BASE_URL.
 */

const BASE_URL = process.env.RUGCHECK_BASE_URL ?? "https://api.rugcheck.xyz/v1";
const TIMEOUT_MS = Number(process.env.RUGCHECK_TIMEOUT_MS ?? 15000);

export class RugCheckError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "RugCheckError";
    this.status = status;
  }
}

export class RugCheckClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl ?? BASE_URL;
    this.apiKey = options.apiKey ?? process.env.RUGCHECK_API_KEY ?? null;
    this.jwt = options.jwt ?? process.env.RUGCHECK_JWT ?? null;
    this.timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
  }

  async get(path, params = {}) {
    return this.request("GET", path, { params });
  }

  async post(path, body = {}, params = {}) {
    return this.request("POST", path, { body, params });
  }

  async request(method, path, { params = {}, body } = {}) {
    const url = new URL(stripLeadingSlash(path), ensureTrailingSlash(this.baseUrl));
    for (const [key, value] of Object.entries(params)) {
      if (value != null && value !== "") url.searchParams.set(key, String(value));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers = {
        Accept: "application/json",
        ...this.authHeaders(),
      };

      if (body !== undefined) {
        headers["Content-Type"] = "application/json";
      }

      const response = await fetch(url.toString(), {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const responseBody = await response.text().catch(() => "");
        throw new RugCheckError(
          `RugCheck error ${response.status} ${response.statusText} on ${path}${responseBody ? `: ${responseBody}` : ""}`,
          response.status,
        );
      }

      const responseBody = await response.text();
      try {
        return JSON.parse(responseBody);
      } catch {
        return responseBody;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  authHeaders() {
    if (this.jwt) {
      return { Authorization: `Bearer ${this.jwt}` };
    }
    if (this.apiKey) {
      return { Authorization: `Bearer ${this.apiKey}`, "X-API-KEY": this.apiKey };
    }
    return {};
  }
}

function ensureTrailingSlash(value) {
  return String(value).endsWith("/") ? value : `${value}/`;
}

function stripLeadingSlash(value) {
  return String(value).replace(/^\/+/, "");
}
