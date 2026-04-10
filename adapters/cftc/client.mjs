/**
 * CFTC Socrata API client.
 *
 * The CFTC publishes Commitment of Traders data via a free public Socrata API.
 * No API key required.
 *
 * COT reports are released every Friday at 3:30pm ET for the prior Tuesday's data.
 *
 * Datasets used:
 *   Legacy COT — Financials:   https://publicreporting.cftc.gov/resource/gpe5-46if.json
 *   Legacy COT — Commodities:  https://publicreporting.cftc.gov/resource/6dca-aqww.json
 */

const BASE_FINANCIAL = "https://publicreporting.cftc.gov/resource/gpe5-46if.json";
const BASE_COMMODITY = "https://publicreporting.cftc.gov/resource/6dca-aqww.json";
const TIMEOUT_MS = Number(process.env.CFTC_TIMEOUT_MS ?? 20000);

export class CftcError extends Error {
  constructor(status, message, url) {
    super(`CFTC API error ${status ?? ""} ${message} — ${url}`);
    this.name = "CftcError";
    this.status = status;
    this.url = url;
  }
}

export class CftcClient {
  async get(dataset, params = {}) {
    const base = dataset === "financial" ? BASE_FINANCIAL : BASE_COMMODITY;

    // Build query string manually — URLSearchParams percent-encodes '$' as '%24'
    // but the Socrata SoQL API requires literal '$' in parameter names ($where, $order, $limit).
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&")
      .replace(/%24/g, "$"); // restore '$' for Socrata SoQL params

    const url = `${base}?${qs}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new CftcError(response.status, response.statusText, url);
    }

    return response.json();
  }
}
