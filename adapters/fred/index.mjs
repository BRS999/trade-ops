/**
 * FRED adapter — public API.
 *
 * Usage:
 *   import { FredClient, getMacroSnapshot } from './adapters/fred/index.mjs';
 *   const client = new FredClient();  // reads FRED_API_KEY from env
 *   const macro = await getMacroSnapshot(client);
 *
 * Key series used in getMacroSnapshot():
 *
 *   DGS2      2-Year Treasury Yield
 *   DGS10     10-Year Treasury Yield
 *   DGS30     30-Year Treasury Yield
 *   T10Y2Y    10Y-2Y Yield Spread (curve)
 *   FEDFUNDS  Effective Federal Funds Rate
 *   CPIAUCSL  CPI (All Urban Consumers, SA)
 *   UNRATE    Unemployment Rate
 *   VIXCLS    CBOE Volatility Index (VIX)
 */

export { FredClient, FredError } from "./client.mjs";
export { getObservations, getLatest, getSeries } from "./series.mjs";
export { getEconomicCalendar } from "./calendar.mjs";

import { getLatest } from "./series.mjs";

const MACRO_SERIES = [
  { id: "DGS2",     label: "treasury_2y",    description: "2Y Treasury Yield" },
  { id: "DGS10",    label: "treasury_10y",   description: "10Y Treasury Yield" },
  { id: "T10Y2Y",   label: "yield_spread",   description: "10Y-2Y Yield Spread" },
  { id: "FEDFUNDS", label: "fed_funds_rate", description: "Fed Funds Rate" },
  { id: "CPIAUCSL", label: "cpi",            description: "CPI (SA)" },
  { id: "UNRATE",   label: "unemployment",   description: "Unemployment Rate" },
  { id: "VIXCLS",   label: "vix",            description: "VIX" },
];

/**
 * Fetch a macro context snapshot — the key rates, spreads, and risk indicators
 * relevant to equity and crypto trading decisions.
 *
 * Note: some series (CPIAUCSL, UNRATE) are monthly and lag by 1-2 months.
 * VIX (VIXCLS) and treasury yields are daily.
 *
 * @param {import('./client.mjs').FredClient} client
 * @returns {Promise<Object>} flat map of label → { date, value, description }
 *
 * @example
 * {
 *   treasury_2y:    { date: "2026-04-07", value: 3.85, description: "2Y Treasury Yield" },
 *   treasury_10y:   { date: "2026-04-07", value: 4.33, description: "10Y Treasury Yield" },
 *   yield_spread:   { date: "2026-04-07", value: 0.48, description: "10Y-2Y Yield Spread" },
 *   fed_funds_rate: { date: "2026-04-01", value: 4.33, description: "Fed Funds Rate" },
 *   cpi:            { date: "2026-02-01", value: 319.08, description: "CPI (SA)" },
 *   unemployment:   { date: "2026-02-01", value: 4.1,  description: "Unemployment Rate" },
 *   vix:            { date: "2026-04-07", value: 21.5, description: "VIX" },
 * }
 */
export async function getMacroSnapshot(client) {
  const snapshot = {};

  for (const series of MACRO_SERIES) {
    const obs = await getLatest(client, series.id).catch(() => null);
    snapshot[series.label] = obs
      ? { date: obs.date, value: obs.value, description: series.description }
      : { date: null, value: null, description: series.description };
  }

  return snapshot;
}
