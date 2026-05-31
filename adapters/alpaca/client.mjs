/**
 * Alpaca Trading API client.
 *
 * Defaults to paper trading. Pass { live: true } or set ALPACA_LIVE=true to
 * switch to live. Live mode requires explicit opt-in — never default to it.
 *
 * Requires ALPACA_API_KEY and ALPACA_API_SECRET in .env.
 * Get keys at https://alpaca.markets (separate key pairs for paper vs live).
 *
 * Paper:  https://paper-api.alpaca.markets/v2
 * Live:   https://api.alpaca.markets/v2
 * Data:   https://data.alpaca.markets/v2
 */

try { process.loadEnvFile(); } catch {}

const PAPER_URL = "https://paper-api.alpaca.markets/v2";
const LIVE_URL  = "https://api.alpaca.markets/v2";
const DATA_URL  = "https://data.alpaca.markets/v2";
const TIMEOUT_MS = Number(process.env.ALPACA_TIMEOUT_MS ?? 15000);

export class AlpacaError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "AlpacaError";
    this.status = status;
  }
}

export class AlpacaClient {
  constructor(opts = {}) {
    const key    = process.env.ALPACA_API_KEY    ?? process.env.APCA_API_KEY_ID;
    const secret = process.env.ALPACA_API_SECRET ?? process.env.ALPACA_SECRET_KEY ?? process.env.APCA_API_SECRET_KEY;
    if (!key || !secret) {
      throw new AlpacaError("ALPACA_API_KEY and ALPACA_API_SECRET are required");
    }
    this._key    = key;
    this._secret = secret;
    this._live   = opts.live ?? (process.env.ALPACA_LIVE === "true");
    this._base   = this._live ? LIVE_URL : PAPER_URL;
  }

  get isLive() { return this._live; }
  get mode()   { return this._live ? "live" : "paper"; }

  _headers() {
    return {
      "APCA-API-KEY-ID":     this._key,
      "APCA-API-SECRET-KEY": this._secret,
      "Content-Type":        "application/json",
      "Accept":              "application/json",
    };
  }

  async request(method, path, { params, body, base } = {}) {
    const root = base === "data" ? DATA_URL : this._base;
    const url  = new URL(path, root + "/");

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response;
    try {
      response = await fetch(url.toString(), {
        method,
        headers: this._headers(),
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 204) return null;

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const msg = data?.message ?? data?.error ?? response.statusText;
      throw new AlpacaError(`Alpaca ${response.status}: ${msg}`, response.status);
    }

    return data;
  }

  get(path, params)   { return this.request("GET",    path, { params }); }
  post(path, body)    { return this.request("POST",   path, { body }); }
  patch(path, body)   { return this.request("PATCH",  path, { body }); }
  delete(path, params){ return this.request("DELETE", path, { params }); }
}
