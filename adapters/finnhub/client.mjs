/**
 * Finnhub adapter — real-time quotes, insider flow, congressional trading,
 * earnings calendar, news sentiment, and analyst estimates.
 *
 * Requires FINNHUB_API_KEY. Free tier: 60 calls/min.
 * Get a free key at https://finnhub.io
 */

import pkg from "finnhub";

try { process.loadEnvFile(); } catch {}

const { DefaultApi } = pkg;

export class FinnhubError extends Error {
  constructor(message) {
    super(message);
    this.name = "FinnhubError";
  }
}

export class FinnhubClient {
  constructor() {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) throw new FinnhubError("FINNHUB_API_KEY is not set");
    this._api = new DefaultApi(apiKey);
  }

  /** Promisify any Finnhub callback method. */
  call(method, ...args) {
    return new Promise((resolve, reject) => {
      this._api[method](...args, (err, data) => {
        if (err) reject(new FinnhubError(err?.message ?? (typeof err === "object" ? JSON.stringify(err) : String(err))));
        else resolve(data);
      });
    });
  }
}
