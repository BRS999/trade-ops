/**
 * U.S. Energy Information Administration (EIA) adapter — public read API.
 *
 * Covers petroleum spot prices (WTI/Brent), weekly crude oil inventory,
 * weekly natural gas storage, and U.S. crude oil production.
 *
 * Environment variable: EIA_API_KEY
 * Free registration: https://www.eia.gov/opendata/
 *
 * API v2 base: https://api.eia.gov/v2/
 * Auth: ?api_key=KEY query parameter
 */

try { process.loadEnvFile(); } catch {}

export class EiaError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "EiaError";
    this.status = status;
  }
}

export class EiaClient {
  constructor() {
    const apiKey = process.env.EIA_API_KEY;
    if (!apiKey) throw new EiaError("EIA_API_KEY is not set");
    this.apiKey = apiKey;
    this.baseUrl = "https://api.eia.gov/v2";
  }

  async get(route, params = {}) {
    const url = new URL(`${this.baseUrl}/${route}`);
    url.searchParams.set("api_key", this.apiKey);

    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) {
        v.forEach((item) => url.searchParams.append(k, item));
      } else {
        url.searchParams.set(k, String(v));
      }
    }

    const res = await fetch(url.toString());
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new EiaError(`EIA ${res.status}${body ? ": " + body : ""}`, res.status);
    }

    const json = await res.json();
    if (json.error) throw new EiaError(`EIA error: ${json.error}`);
    return json;
  }

  /** Fetch /data for a route, filtered to specific series IDs, sorted newest first. */
  async series(route, seriesIds, options = {}) {
    const { frequency, limit = 10, start, end } = options;
    const params = {
      "data[]": "value",
      "sort[0][column]": "period",
      "sort[0][direction]": "desc",
      length: limit,
    };
    if (frequency) params.frequency = frequency;
    if (start) params.start = start;
    if (end) params.end = end;

    const ids = Array.isArray(seriesIds) ? seriesIds : [seriesIds];
    const urlParams = new URLSearchParams();
    urlParams.set("api_key", this.apiKey);
    urlParams.set("data[]", "value");
    urlParams.set("sort[0][column]", "period");
    urlParams.set("sort[0][direction]", "desc");
    urlParams.set("length", String(limit));
    if (frequency) urlParams.set("frequency", frequency);
    if (start) urlParams.set("start", start);
    if (end) urlParams.set("end", end);
    ids.forEach((id) => urlParams.append("facets[series][]", id));

    const url = `${this.baseUrl}/${route}?${urlParams.toString()}`;
    const res = await fetch(url);
    if (!res.ok) throw new EiaError(`EIA ${res.status}`, res.status);
    const json = await res.json();
    if (json.error) throw new EiaError(`EIA error: ${json.error}`);
    return json.response?.data ?? [];
  }
}
