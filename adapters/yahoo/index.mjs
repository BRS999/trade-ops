/**
 * Yahoo Finance adapter — public API.
 *
 * @deprecated Yahoo's unofficial API frequently returns 429 Too Many Requests,
 * especially during market hours. Prefer the Alpaca adapter for reliable quotes:
 *
 *   import { getQuote, getCryptoQuote, getQuotes } from '../alpaca/index.mjs';
 *
 * This adapter is kept for cases where Alpaca doesn't cover the symbol
 * (e.g. indices like ^GSPC, forex like EURUSD=X, or futures like GC=F).
 *
 * Usage:
 *
 *   import { YahooClient, enrichWatchlist } from './adapters/yahoo/index.mjs';
 *
 *   const client = new YahooClient();
 *   const enriched = await enrichWatchlist(client, watchlist);
 *
 * Symbol mapping for watchlist entries:
 *   equity      → symbol as-is (NVDA, META)
 *   crypto      → yahoo_symbol if present, else symbol + "-USD" (CRYPTO:SOLUSD → SOL-USD)
 *   futures     → yahoo_symbol if present (CME_MINI:MES1! → MES=F), else skipped
 *   prediction  → skipped
 */

export { YahooClient, YahooError } from "./client.mjs";
export { getQuote, getCryptoQuote, getQuotes, getBars } from "./quotes.mjs";
export { getExpiries, getChain, getAtmSnapshot } from "./options.mjs";

