/**
 * Fear & Greed Index adapter.
 *
 * Two indices:
 *
 * CRYPTO (alternative.me) — no API key, updated daily
 *   Scale: 0–100, derived from volatility, momentum, social, surveys, BTC dominance, trends
 *   getCurrent(), getHistory(days)
 *
 * EQUITY (CNN) — no API key, updated daily
 *   Scale: 0–100 composite + 7 sub-indicators including put/call options
 *   Sub-indicators: market momentum, price strength, price breadth,
 *     put/call options, VIX, junk bond demand, safe haven demand
 *   getEquitySentiment(), getEquitySnapshot()
 */

const BASE_URL = "https://api.alternative.me/fng";

/**
 * @typedef {Object} FearGreedEntry
 * @property {number} value                  0–100
 * @property {string} classification         e.g. "Extreme Fear"
 * @property {string} date                   YYYY-MM-DD
 * @property {number} timestamp              Unix seconds
 */

/**
 * Fetch the current Fear & Greed index value.
 *
 * @returns {Promise<FearGreedEntry>}
 */
export async function getCurrent() {
  const data = await fetchFng(1);
  return parseEntry(data[0]);
}

/**
 * Fetch the last N days of Fear & Greed values.
 *
 * @param {number} [days=7]
 * @returns {Promise<FearGreedEntry[]>}
 */
export async function getHistory(days = 7) {
  const data = await fetchFng(days);
  return data.map(parseEntry);
}

async function fetchFng(limit) {
  const url = `${BASE_URL}/?limit=${limit}&format=json`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });

  if (!response.ok) {
    throw new Error(`Fear & Greed API error ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  return json.data ?? [];
}

function parseEntry(raw) {
  const ts = Number(raw.timestamp);
  const date = new Date(ts * 1000).toISOString().slice(0, 10);
  return {
    value: Number(raw.value),
    classification: raw.value_classification ?? null,
    date,
    timestamp: ts,
  };
}

// ── Equity F&G (CNN) ──────────────────────────────────────────────────────

const CNN_URL = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata";
const CNN_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Referer": "https://edition.cnn.com/markets/fear-and-greed",
  "Origin": "https://edition.cnn.com",
};

async function fetchCnn() {
  const response = await fetch(CNN_URL, { headers: CNN_HEADERS });
  if (!response.ok) {
    throw new Error(`CNN F&G error ${response.status} ${response.statusText}`);
  }
  return response.json();
}

function parseSubIndicator(raw) {
  if (!raw) return null;
  const latest = raw.data?.[raw.data.length - 1];
  return {
    score: raw.score,
    rating: raw.rating,
    value: latest?.y ?? null,
    updated: raw.timestamp ? new Date(raw.timestamp).toISOString() : null,
  };
}

/**
 * Current CNN equity Fear & Greed composite score plus week/month/year comparisons.
 */
export async function getEquitySentiment() {
  const d = await fetchCnn();
  const fg = d.fear_and_greed;
  return {
    score: fg.score,
    rating: fg.rating,
    previous_close: fg.previous_close,
    previous_1_week: fg.previous_1_week,
    previous_1_month: fg.previous_1_month,
    previous_1_year: fg.previous_1_year,
    updated: fg.timestamp,
  };
}

/**
 * Full equity sentiment snapshot: composite score + all 7 sub-indicators.
 *
 * Sub-indicators (each scored 0–100):
 *   put_call       — put/call options ratio (low = greed / complacency)
 *   vix            — market volatility vs 50-day MA
 *   momentum       — S&P 500 vs 125-day MA
 *   price_strength — 52-week highs vs lows on NYSE
 *   price_breadth  — McClellan Volume Summation Index
 *   junk_bonds     — yield spread between junk and investment-grade bonds
 *   safe_haven     — relative returns of stocks vs Treasuries
 */
export async function getEquitySnapshot() {
  const d = await fetchCnn();
  return {
    composite: {
      score: d.fear_and_greed.score,
      rating: d.fear_and_greed.rating,
      updated: d.fear_and_greed.timestamp,
    },
    put_call: parseSubIndicator(d.put_call_options),
    vix: parseSubIndicator(d.market_volatility_vix),
    momentum: parseSubIndicator(d.market_momentum_sp500),
    price_strength: parseSubIndicator(d.stock_price_strength),
    price_breadth: parseSubIndicator(d.stock_price_breadth),
    junk_bonds: parseSubIndicator(d.junk_bond_demand),
    safe_haven: parseSubIndicator(d.safe_haven_demand),
  };
}
