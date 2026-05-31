/**
 * Alpha Vantage adapter — public API.
 *
 * Free tier: 25 requests/day, 5 requests/minute.
 * Premium plans available at alphavantage.co/premium for higher limits.
 *
 * Environment variable: ALPHAVANTAGE_API_KEY
 * Get a free key at: https://www.alphavantage.co/support/#api-key
 *
 * ⚠ 25 req/day is tight. The most unique endpoints in this stack are:
 *   - NEWS_SENTIMENT (structured sentiment per ticker/topic)
 *   - Non-energy commodities (wheat, corn, copper, coffee, etc.)
 *   - TOP_GAINERS_LOSERS (daily US equity movers)
 *   - EARNINGS_CALENDAR (forward-looking earnings schedule)
 *   Prioritize those over endpoints already covered by Yahoo/FRED/EIA.
 */

try { process.loadEnvFile(); } catch {}

export class AlphaVantageError extends Error {
  constructor(message, info) {
    super(message);
    this.name = "AlphaVantageError";
    this.info = info;
  }
}

export class AlphaVantageClient {
  constructor() {
    const apiKey = process.env.ALPHAVANTAGE_API_KEY;
    if (!apiKey) throw new AlphaVantageError("ALPHAVANTAGE_API_KEY is not set");
    this.apiKey = apiKey;
    this.baseUrl = "https://www.alphavantage.co/query";
  }

  async get(params, format = "json") {
    const url = new URL(this.baseUrl);
    url.searchParams.set("apikey", this.apiKey);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }

    const res = await fetch(url.toString());
    if (!res.ok) throw new AlphaVantageError(`Alpha Vantage HTTP ${res.status}`);

    if (format === "csv") return res.text();

    const json = await res.json();

    const note = json["Information"] || json["Note"] || json["Error Message"];
    if (note) {
      if (note.includes("25 requests") || note.includes("API call frequency")) {
        throw new AlphaVantageError("Rate limit reached (25 req/day on free tier). Try again tomorrow or upgrade.", note);
      }
      if (note.toLowerCase().includes("premium") || note.toLowerCase().includes("standard plan")) {
        throw new AlphaVantageError("Endpoint requires a premium plan.", note);
      }
      throw new AlphaVantageError(note);
    }

    return json;
  }
}
