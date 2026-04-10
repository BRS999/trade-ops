/**
 * Fear & Greed Index adapter (alternative.me).
 *
 * No API key required. Free public endpoint.
 * Updated once daily around midnight UTC.
 *
 * Scale: 0–100
 *   0–24   Extreme Fear
 *   25–44  Fear
 *   45–55  Neutral
 *   56–74  Greed
 *   75–100 Extreme Greed
 *
 * This measures crypto market sentiment derived from:
 *   - Volatility (25%)
 *   - Market momentum/volume (25%)
 *   - Social media (15%)
 *   - Surveys (15%)
 *   - Bitcoin dominance (10%)
 *   - Google Trends (10%)
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
