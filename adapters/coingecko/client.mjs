/**
 * CoinGecko adapter — aggregated crypto market data.
 *
 * Covers prices, market caps, global stats, trending coins, and DeFi metrics
 * across all major CEX and DEX venues. Complements GeckoTerminal (which is
 * DEX/on-chain only) with the broader aggregated picture.
 *
 * Authentication:
 *   Set COINGECKO_API_KEY to a free Demo key (CG-...) from coingecko.com/en/api.
 *   Without a key the public endpoint works but is rate-limited to ~5 req/min
 *   and is less stable. Demo plan: 30 req/min, 10K calls/month — free.
 *
 *   To use a paid Pro key, also set COINGECKO_PLAN=pro. Pro keys use a different
 *   base URL and auth header.
 */

try { process.loadEnvFile(); } catch {}

export class CoinGeckoError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "CoinGeckoError";
    this.status = status;
  }
}

export class CoinGeckoClient {
  constructor() {
    this.apiKey = process.env.COIN_GECKO_API_KEY ?? process.env.COINGECKO_API_KEY ?? null;
    const pro = (process.env.COINGECKO_PLAN ?? "").toLowerCase() === "pro";
    this.baseUrl = pro
      ? "https://pro-api.coingecko.com/api/v3"
      : "https://api.coingecko.com/api/v3";
    this._authHeader = pro ? "x-cg-pro-api-key" : "x-cg-demo-api-key";
  }

  async get(path, params = {}) {
    const url = new URL(this.baseUrl + path);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }

    const headers = { Accept: "application/json" };
    if (this.apiKey) headers[this._authHeader] = this.apiKey;

    const res = await fetch(url.toString(), { headers });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new CoinGeckoError(
        `CoinGecko ${res.status}${body ? ": " + body : ""}`,
        res.status,
      );
    }

    return res.json();
  }
}
