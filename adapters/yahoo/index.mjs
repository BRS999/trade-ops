/**
 * Yahoo Finance adapter — public API.
 *
 * Usage:
 *
 *   import { YahooClient, enrichWatchlist } from './adapters/yahoo/index.mjs';
 *
 *   const client = new YahooClient();   // no API key needed
 *   const enriched = await enrichWatchlist(client, watchlist);
 *
 * enrichWatchlist() accepts the shape from watchlists/active.json and decorates
 * each equity and crypto entry with a live market quote. Prediction market
 * entries are returned unchanged (Yahoo doesn't cover them).
 *
 * Symbol mapping for watchlist entries:
 *   equity      → symbol as-is (NVDA, META)
 *   crypto      → yahoo_symbol if present, else symbol + "-USD" (CRYPTO:SOLUSD → SOL-USD)
 *   futures     → yahoo_symbol if present (CME_MINI:MES1! → MES=F), else skipped
 *   prediction  → skipped
 */

export { YahooClient, YahooError } from "./client.mjs";
export { getQuote, getCryptoQuote, getQuotes, getBars } from "./quotes.mjs";

import { getQuote, getCryptoQuote } from "./quotes.mjs";

/**
 * Map a watchlist entry symbol to a Yahoo Finance symbol.
 *
 * @param {Object} entry
 * @returns {string|null}
 */
function toYahooSymbol(entry) {
  // Use explicit yahoo_symbol if provided — covers futures and cross-platform symbols
  if (entry.yahoo_symbol) return entry.yahoo_symbol.toUpperCase();
  if (entry.asset_class === "equity") return entry.symbol.toUpperCase();
  // Crypto fallback: strip exchange prefix (CRYPTO:BTCUSD → BTC-USD)
  if (entry.asset_class === "crypto") {
    const base = entry.symbol.includes(":") ? entry.symbol.split(":")[1] : entry.symbol;
    return base.replace(/USD$/, "-USD").toUpperCase();
  }
  return null;
}

/**
 * Enrich an active watchlist with live quotes from Yahoo Finance.
 *
 * @param {import('./client.mjs').YahooClient} client
 * @param {Object} watchlist   Parsed contents of watchlists/active.json
 * @returns {Promise<Object[]>}
 */
export async function enrichWatchlist(client, watchlist) {
  const entries = watchlist.entries ?? [];
  const enriched = [];

  for (const entry of entries) {
    const yahooSymbol = toYahooSymbol(entry);

    if (!yahooSymbol) {
      enriched.push({ ...entry, market: null });
      continue;
    }

    const fetchQuote = entry.asset_class === "crypto" ? getCryptoQuote : getQuote;
    const quote = await fetchQuote(client, yahooSymbol).catch(() => null);
    enriched.push({ ...entry, market: quote });
  }

  return enriched;
}
