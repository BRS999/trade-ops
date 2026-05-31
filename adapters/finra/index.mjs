/**
 * FINRA adapter — daily short sale volume.
 *
 * Short volume % measures what fraction of a symbol's daily volume was
 * short sales. Persistently high short volume (>50%) alongside price
 * weakness suggests active short pressure. A spike after a downtrend
 * can signal capitulation or exhaustion.
 *
 * This is NOT short interest (open positions / float %). That data is
 * published bi-monthly and has no clean free API endpoint.
 *
 * No API key required.
 */

export { FinraClient, FinraError } from "./client.mjs";

/**
 * Short volume for a single symbol.
 *
 * @param {FinraClient} client
 * @param {string} symbol
 * @param {string} [date]  YYYY-MM-DD, defaults to most recent available
 */
export async function getShortVolume(client, symbol, date) {
  const { date: fileDate, rows } = await client.getRows(date);
  const sym = symbol.toUpperCase();
  const row = rows.find(r => r.symbol === sym);
  if (!row) throw new Error(`Symbol ${sym} not found in FINRA file for ${fileDate}`);
  return row;
}

/**
 * Short volume for a list of symbols, sorted by short_pct descending.
 *
 * @param {FinraClient} client
 * @param {string[]} symbols
 * @param {string} [date]
 */
export async function getShortVolumeMulti(client, symbols, date) {
  const { date: fileDate, rows } = await client.getRows(date);
  const set = new Set(symbols.map(s => s.toUpperCase()));
  const found = rows
    .filter(r => set.has(r.symbol))
    .sort((a, b) => (b.short_pct ?? 0) - (a.short_pct ?? 0));
  return { date: fileDate, results: found };
}


/**
 * Top N symbols by short volume % across the entire FINRA file.
 * Useful for finding names under unusual pressure outside the watchlist.
 *
 * @param {FinraClient} client
 * @param {number} [n=25]
 * @param {Object} [opts]
 * @param {number} [opts.minVolume=100000]  filter out illiquid names
 * @param {string} [opts.date]
 */
export async function getTopShortVolume(client, n = 25, opts = {}) {
  const { minVolume = 100000, date } = opts;
  const { date: fileDate, rows } = await client.getRows(date);
  const top = rows
    .filter(r => r.total_volume >= minVolume && r.short_pct !== null)
    .sort((a, b) => b.short_pct - a.short_pct)
    .slice(0, n);
  return { date: fileDate, results: top };
}
