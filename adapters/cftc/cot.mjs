/**
 * CFTC Commitment of Traders (COT) data.
 *
 * getCOT(client, instrument)   → most recent COT snapshot for one instrument
 * getCOTSnapshot(client)       → all tracked instruments in one call
 *
 * COT reading guide:
 *   Non-commercial (large speculators) = hedge funds, CTAs, trend followers
 *   Commercial (hedgers)               = producers, end-users — "smart money" in commodities
 *
 *   Net position = longs - shorts
 *   Positive net = net long (bullish bias)
 *   Negative net = net short (bearish bias)
 *
 *   Key signal: when speculators are at extreme net long AND price starts turning,
 *   that's a crowded trade unwind — often accelerates the move down.
 */

/**
 * Instrument registry — maps a short name to its CFTC market name and dataset.
 * Market names must match the `market_and_exchange_names` field exactly.
 */
const INSTRUMENTS = {
  // ── Commodities ───────────────────────────────────────────────────────────
  gold:        { dataset: "commodity", market: "GOLD - COMMODITY EXCHANGE INC." },
  silver:      { dataset: "commodity", market: "SILVER - COMMODITY EXCHANGE INC." },
  copper:      { dataset: "commodity", market: "COPPER- #1 - COMMODITY EXCHANGE INC." },
  crude:       {
    dataset: "commodity",
    markets: [
      "WTI FINANCIAL CRUDE OIL - NEW YORK MERCANTILE EXCHANGE",
      "WTI-PHYSICAL - NEW YORK MERCANTILE EXCHANGE",
      "CRUDE OIL, LIGHT SWEET - NEW YORK MERCANTILE EXCHANGE",
    ],
  },
  natgas:      { dataset: "commodity", market: "NATURAL GAS (NYMEX) - NEW YORK MERCANTILE EXCHANGE" },
  soybeans:    { dataset: "commodity", market: "SOYBEANS - CHICAGO BOARD OF TRADE" },
  corn:        { dataset: "commodity", market: "CORN - CHICAGO BOARD OF TRADE" },
  wheat:       { dataset: "commodity", market: "WHEAT - CHICAGO BOARD OF TRADE" },
  coffee:      { dataset: "commodity", market: "COFFEE C - ICE FUTURES U.S." },

  // ── Financials ────────────────────────────────────────────────────────────
  spx:         { dataset: "financial", market: "E-MINI S&P 500 - CHICAGO MERCANTILE EXCHANGE" },
  ndx:         { dataset: "financial", market: "NASDAQ-100 Consolidated - CHICAGO MERCANTILE EXCHANGE" },
  eurusd:      { dataset: "financial", market: "EURO FX - CHICAGO MERCANTILE EXCHANGE" },
  usdjpy:      { dataset: "financial", market: "JAPANESE YEN - CHICAGO MERCANTILE EXCHANGE" },
  dxy:         { dataset: "financial", market: "U.S. DOLLAR INDEX - ICE FUTURES U.S." },
  bitcoin:     { dataset: "financial", market: "BITCOIN - CHICAGO MERCANTILE EXCHANGE" },
};

export const INSTRUMENT_KEYS = Object.keys(INSTRUMENTS);

/**
 * @typedef {Object} COTSnapshot
 * @property {string}      instrument     Short name (e.g. "gold")
 * @property {string}      market         Full CFTC market name
 * @property {string}      report_date    YYYY-MM-DD of the Tuesday data
 * @property {number}      spec_long      Non-commercial long contracts
 * @property {number}      spec_short     Non-commercial short contracts
 * @property {number}      spec_net       spec_long - spec_short
 * @property {number}      spec_net_chg   Change in net from prior week
 * @property {number}      comm_long      Commercial long contracts
 * @property {number}      comm_short     Commercial short contracts
 * @property {number}      comm_net       comm_long - comm_short
 * @property {number}      open_interest  Total open interest
 * @property {number}      spec_net_pct   spec_net as % of open interest (positioning extreme gauge)
 */

function parseRow(row, instrument, dataset) {
  const specLong = Number(
    dataset === "financial"
      ? row.lev_money_positions_long
      : row.noncomm_positions_long_all ?? 0,
  );
  const specShort = Number(
    dataset === "financial"
      ? row.lev_money_positions_short
      : row.noncomm_positions_short_all ?? 0,
  );
  const specNet   = specLong - specShort;
  const specChgL = Number(
    dataset === "financial"
      ? row.change_in_lev_money_long
      : row.change_in_noncomm_long_all ?? 0,
  );
  const specChgS = Number(
    dataset === "financial"
      ? row.change_in_lev_money_short
      : row.change_in_noncomm_short_all ?? 0,
  );
  const specNetChg = specChgL - specChgS;

  const commLong = Number(
    dataset === "financial"
      ? row.dealer_positions_long_all
      : row.comm_positions_long_all ?? 0,
  );
  const commShort = Number(
    dataset === "financial"
      ? row.dealer_positions_short_all
      : row.comm_positions_short_all ?? 0,
  );
  const commNet   = commLong - commShort;

  const oi = Number(row.open_interest_all ?? 0);
  const specNetPct = oi > 0 ? (specNet / oi) * 100 : null;

  // Date field is an ISO datetime string — take the date portion
  const reportDate = row.report_date_as_yyyy_mm_dd
    ? String(row.report_date_as_yyyy_mm_dd).split("T")[0]
    : null;

  return {
    instrument,
    market: row.market_and_exchange_names ?? null,
    report_date: reportDate,
    spec_long: specLong,
    spec_short: specShort,
    spec_net: specNet,
    spec_net_chg: specNetChg,
    comm_long: commLong,
    comm_short: commShort,
    comm_net: commNet,
    open_interest: oi,
    spec_net_pct: specNetPct !== null ? Math.round(specNetPct * 10) / 10 : null,
  };
}

/**
 * Fetch the most recent COT report for one instrument.
 *
 * @param {import('./client.mjs').CftcClient} client
 * @param {string} instrument  One of INSTRUMENT_KEYS
 * @returns {Promise<COTSnapshot>}
 */
export async function getCOT(client, instrument) {
  const key = instrument.toLowerCase();
  const def = INSTRUMENTS[key];
  if (!def) {
    throw new Error(`Unknown instrument: "${instrument}". Available: ${INSTRUMENT_KEYS.join(", ")}`);
  }

  const markets = def.markets ?? [def.market];

  for (const market of markets) {
    const rows = await client.get(def.dataset, {
      "$where": `market_and_exchange_names = '${market}'`,
      "$order": "report_date_as_yyyy_mm_dd DESC",
      "$limit": "1",
    });

    if (rows?.length) {
      return parseRow(rows[0], key, def.dataset);
    }
  }

  throw new Error(`No COT data found for: ${markets.join(" | ")}`);
}

/**
 * Fetch the most recent COT snapshot for all tracked instruments.
 * Runs sequential requests (Socrata free tier is rate-limited).
 *
 * @param {import('./client.mjs').CftcClient} client
 * @param {string[]} [instruments]  Subset of INSTRUMENT_KEYS (default: all)
 * @returns {Promise<COTSnapshot[]>}
 */
export async function getCOTSnapshot(client, instruments = INSTRUMENT_KEYS) {
  const results = [];
  for (const key of instruments) {
    const result = await getCOT(client, key).catch((e) => ({
      instrument: key,
      error: e.message,
    }));
    results.push(result);
  }
  return results;
}
