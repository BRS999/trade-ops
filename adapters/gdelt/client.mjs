/**
 * GDELT Project public API client.
 *
 * Uses the free DOC 2.0 API at api.gdeltproject.org — no API key required.
 * GDELT asks callers to limit requests to one every 5 seconds.
 *
 * Expect ~10–20s server time per call. Sequential workflows (e.g. snapshot)
 * therefore take roughly: N * (5s spacing + ~15s response).
 *
 * Docs: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
 */

import https from "node:https";

try { process.loadEnvFile(); } catch {}

const DEFAULT_BASE_URL = "https://api.gdeltproject.org/api/v2";
const DEFAULT_TIMEOUT_MS = 90_000;
const MIN_REQUEST_INTERVAL_MS = Number(process.env.GDELT_MIN_INTERVAL_MS ?? 5_000);

/** Earliest timestamp (ms) when the next request may start. */
let nextAllowedAt = 0;

export class GdeltError extends Error {
  constructor(message, status, path, body) {
    super(message);
    this.name = "GdeltError";
    this.status = status;
    this.path = path;
    this.body = body;
  }
}

export class GdeltClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl ?? process.env.GDELT_BASE_URL ?? DEFAULT_BASE_URL;
    this.timeoutMs = options.timeoutMs ?? Number(process.env.GDELT_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
    this.minIntervalMs = options.minIntervalMs ?? MIN_REQUEST_INTERVAL_MS;
    this.debug = options.debug ?? process.env.GDELT_DEBUG === "1";
  }

  /** Query the DOC 2.0 API (`/doc/doc`). */
  async doc(params = {}) {
    return this.get("doc/doc", params);
  }

  async get(path, params = {}) {
    const url = buildUrl(this.baseUrl, path, params);
    return requestWithRetry(url, this);
  }
}

async function requestWithRetry(url, client, attempt = 0) {
  await waitForSlot(client.minIntervalMs);

  const started = Date.now();
  let response;
  let text;

  try {
    ({ response, text } = await httpsGet(url, client.timeoutMs));
  } catch (error) {
    markSlot(client.minIntervalMs * (attempt + 2));
    logTiming(client, url, started, { attempt, error: error instanceof Error ? error.message : String(error) });

    if (attempt < 2) {
      return requestWithRetry(url, client, attempt + 1);
    }

    throw new GdeltError(
      `GDELT fetch failed for ${url.pathname}: ${error instanceof Error ? error.message : String(error)}`,
      null,
      url.pathname,
      null,
    );
  }

  markSlot(client.minIntervalMs);
  logTiming(client, url, started, { attempt, status: response.status, bytes: text.length });

  if (response.status === 429 || text.startsWith("Please limit requests")) {
    if (attempt < 2) {
      return requestWithRetry(url, client, attempt + 1);
    }
    throw new GdeltError(text.trim() || `GDELT rate limited (${response.status})`, 429, url.pathname, text);
  }

  if (response.status < 200 || response.status >= 300) {
    throw new GdeltError(
      `GDELT ${response.status}${text ? `: ${truncate(text)}` : ""}`,
      response.status,
      url.pathname,
      text,
    );
  }

  const parsed = parseJson(text);
  if (parsed == null) {
    throw new GdeltError(`GDELT returned non-JSON response on ${url.pathname}`, response.status, url.pathname, text);
  }

  return parsed;
}

async function waitForSlot(minIntervalMs) {
  const waitMs = nextAllowedAt - Date.now();
  if (waitMs > 0) {
    await delay(waitMs);
  }
}

function markSlot(minIntervalMs) {
  nextAllowedAt = Date.now() + minIntervalMs;
}

function logTiming(client, url, started, meta) {
  if (!client.debug) return;
  const timing = { path: url.pathname, elapsed_ms: Date.now() - started, ...meta };
  console.error(`[gdelt] ${JSON.stringify(timing)}`);
}

function buildUrl(baseUrl, path, params) {
  const url = new URL(path.replace(/^\//, ""), ensureTrailingSlash(baseUrl));
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

function httpsGet(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      req.destroy(new Error(`GDELT request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const req = https.get(
      url,
      { headers: { accept: "application/json", "user-agent": "trade-ops-gdelt/1.0" } },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          clearTimeout(timer);
          resolve({
            response: { status: res.statusCode ?? 0 },
            text: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );

    req.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function truncate(text, max = 240) {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max)}…`;
}
