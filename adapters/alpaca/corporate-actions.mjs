/**
 * Alpaca corporate actions — splits, dividends, mergers, spin-offs.
 *
 * Useful for knowing about upcoming events that affect position sizing
 * and stop/target prices (e.g. a 2:1 split halves the share price).
 *
 * Endpoint: GET /v1beta1/corporate-actions
 */

/**
 * @param {import('./client.mjs').AlpacaClient} client
 * @param {string|string[]} symbols
 * @param {Object} [opts]
 * @param {string} [opts.start]   ISO date
 * @param {string} [opts.end]     ISO date
 * @param {'cash_dividends'|'stock_dividends'|'stock_splits'|'mergers_and_acquisitions'|'name_changes'|'worthless_removals'} [opts.types]
 * @returns {Promise<Object>}
 */
export async function getCorporateActions(client, symbols, opts = {}) {
  const syms = Array.isArray(symbols) ? symbols.join(",") : symbols;
  const params = { symbols: syms };
  if (opts.start) params.since = opts.start;
  if (opts.end)   params.until = opts.end;
  if (opts.types) params.types = opts.types;

  const data = await client.request("GET", "/v1beta1/corporate-actions", { params, base: "data" });
  return data?.corporate_actions ?? {};
}
