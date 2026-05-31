/**
 * Alpha Vantage adapter — public API.
 *
 * Unique value in this stack (not covered by Yahoo/FRED/EIA/Finnhub):
 *   - NEWS_SENTIMENT: structured per-article sentiment with ticker relevance scores
 *   - Non-energy commodities: wheat, corn, copper, coffee, cotton, sugar, aluminum
 *   - TOP_GAINERS_LOSERS: daily US equity market movers
 *   - EARNINGS_CALENDAR: forward 3/6-month earnings schedule (CSV, 6K+ rows)
 *
 * Free tier is 25 req/day. Use sparingly and cache results where possible.
 */

export { AlphaVantageClient, AlphaVantageError } from "./client.mjs";

// ── Market movers ──────────────────────────────────────────────────────────

/**
 * Top gainers, top losers, and most actively traded US tickers for the day.
 */
export function getTopGainersLosers(client) {
  return client.get({ function: "TOP_GAINERS_LOSERS" });
}

/**
 * Real-time market status for major global exchanges (open/closed).
 */
export function getMarketStatus(client) {
  return client.get({ function: "MARKET_STATUS" });
}

// ── News & sentiment ───────────────────────────────────────────────────────

/**
 * News articles with structured sentiment scores.
 * Returns per-article overall sentiment plus per-ticker relevance and sentiment.
 *
 * @param {Object} [opts]
 * @param {string} [opts.tickers]   Comma-separated tickers, e.g. "NVDA,PLTR"
 * @param {string} [opts.topics]    Topic filter: blockchain, earnings, ipo, mergers,
 *                                  financial_markets, economy_macro, economy_fiscal,
 *                                  economy_monetary, finance, technology, life_sciences,
 *                                  manufacturing, real_estate, retail_wholesale, energy_transportation
 * @param {string} [opts.timeFrom]  YYYYMMDDTHHMM format
 * @param {string} [opts.timeTo]    YYYYMMDDTHHMM format
 * @param {string} [opts.sort]      LATEST | EARLIEST | RELEVANCE (default LATEST)
 * @param {number} [opts.limit]     Max articles 1–1000 (default 50)
 */
export function getNewsSentiment(client, opts = {}) {
  return client.get({
    function: "NEWS_SENTIMENT",
    tickers: opts.tickers,
    topics: opts.topics,
    time_from: opts.timeFrom,
    time_to: opts.timeTo,
    sort: opts.sort,
    limit: opts.limit ?? 50,
  });
}

// ── Earnings ───────────────────────────────────────────────────────────────

/**
 * Forward earnings calendar as a parsed array.
 * Returns upcoming earnings for the next 3 or 6 months.
 *
 * @param {Object} [opts]
 * @param {string} [opts.symbol]   Filter to a single ticker
 * @param {string} [opts.horizon]  "3month" (default) | "6month" | "12month"
 */
export async function getEarningsCalendar(client, opts = {}) {
  const csv = await client.get(
    { function: "EARNINGS_CALENDAR", symbol: opts.symbol, horizon: opts.horizon ?? "3month" },
    "csv",
  );
  return parseCsv(csv);
}

// ── Stock data ─────────────────────────────────────────────────────────────

/**
 * Latest quote for a symbol.
 * @param {string} symbol
 */
export async function getQuote(client, symbol) {
  const d = await client.get({ function: "GLOBAL_QUOTE", symbol });
  return d["Global Quote"] ?? d;
}

/**
 * Symbol search — resolves names/keywords to ticker symbols.
 * @param {string} keywords
 */
export async function searchSymbol(client, keywords) {
  const d = await client.get({ function: "SYMBOL_SEARCH", keywords });
  return d.bestMatches ?? d;
}

/**
 * Daily OHLCV for a symbol (last 100 trading days by default).
 * @param {string} symbol
 * @param {Object} [opts]
 * @param {string} [opts.outputSize]  "compact" (100 days, default) | "full" (20+ years)
 * @param {string} [opts.dataType]    "json" (default) | "csv"
 */
export async function getDailyBars(client, symbol, opts = {}) {
  const d = await client.get({
    function: "TIME_SERIES_DAILY",
    symbol,
    outputsize: opts.outputSize ?? "compact",
    datatype: opts.dataType ?? "json",
  });
  const series = d["Time Series (Daily)"];
  if (!series) return d;
  return Object.entries(series).map(([date, v]) => ({
    date,
    open: Number(v["1. open"]),
    high: Number(v["2. high"]),
    low: Number(v["3. low"]),
    close: Number(v["4. close"]),
    volume: Number(v["5. volume"]),
  }));
}

// ── Commodities ────────────────────────────────────────────────────────────

const COMMODITY_FUNCTIONS = {
  wti: "WTI",
  brent: "BRENT",
  natural_gas: "NATURAL_GAS",
  copper: "COPPER",
  aluminum: "ALUMINUM",
  wheat: "WHEAT",
  corn: "CORN",
  cotton: "COTTON",
  sugar: "SUGAR",
  coffee: "COFFEE",
  all: "ALL_COMMODITIES",
};

/**
 * Price series for a commodity.
 *
 * @param {string} commodity  wti | brent | natural_gas | copper | aluminum |
 *                            wheat | corn | cotton | sugar | coffee | all
 * @param {Object} [opts]
 * @param {string} [opts.interval]  daily | weekly | monthly (default monthly)
 */
export async function getCommodity(client, commodity, opts = {}) {
  const fn = COMMODITY_FUNCTIONS[commodity.toLowerCase()];
  if (!fn) throw new Error(`Unknown commodity: ${commodity}. Use: ${Object.keys(COMMODITY_FUNCTIONS).join(", ")}`);
  const d = await client.get({ function: fn, interval: opts.interval ?? "monthly" });
  return {
    name: d.name,
    interval: d.interval,
    unit: d.unit,
    data: (d.data ?? []).slice(0, opts.limit ?? 24),
  };
}

/**
 * Snapshot of all major commodity prices (uses ALL_COMMODITIES endpoint).
 */
export function getCommoditiesSnapshot(client) {
  return getCommodity(client, "all", { interval: "monthly", limit: 12 });
}

// ── Economic indicators ────────────────────────────────────────────────────

const ECONOMIC_FUNCTIONS = {
  real_gdp: "REAL_GDP",
  real_gdp_per_capita: "REAL_GDP_PER_CAPITA",
  treasury_yield: "TREASURY_YIELD",
  federal_funds_rate: "FEDERAL_FUNDS_RATE",
  cpi: "CPI",
  inflation: "INFLATION",
  retail_sales: "RETAIL_SALES",
  durables: "DURABLES",
  unemployment: "UNEMPLOYMENT",
  nonfarm_payroll: "NONFARM_PAYROLL",
};

/**
 * Economic indicator time series.
 *
 * @param {string} indicator  real_gdp | real_gdp_per_capita | treasury_yield |
 *                            federal_funds_rate | cpi | inflation | retail_sales |
 *                            durables | unemployment | nonfarm_payroll
 * @param {Object} [opts]
 * @param {string} [opts.interval]  daily | weekly | monthly | quarterly | annual
 * @param {string} [opts.maturity]  For treasury_yield: 3month | 2year | 5year | 7year |
 *                                  10year (default) | 30year
 */
export async function getEconomicIndicator(client, indicator, opts = {}) {
  const fn = ECONOMIC_FUNCTIONS[indicator.toLowerCase()];
  if (!fn) throw new Error(`Unknown indicator: ${indicator}. Use: ${Object.keys(ECONOMIC_FUNCTIONS).join(", ")}`);
  const d = await client.get({
    function: fn,
    interval: opts.interval,
    maturity: opts.maturity,
  });
  return {
    name: d.name,
    interval: d.interval,
    unit: d.unit,
    data: (d.data ?? []).slice(0, opts.limit ?? 24),
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function parseCsv(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((h, i) => [h, values[i]?.trim() ?? ""]));
  });
}

export const COMMODITIES = Object.keys(COMMODITY_FUNCTIONS);
export const ECONOMIC_INDICATORS = Object.keys(ECONOMIC_FUNCTIONS);
