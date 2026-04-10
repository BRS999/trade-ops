/**
 * Massive quotes — snapshot and previous-day bar.
 *
 * getSnapshot(client, ticker)  → real-time/delayed price + change + volume
 * getPrevDay(client, ticker)   → previous session OHLCV
 */

/**
 * @typedef {Object} Snapshot
 * @property {string} ticker
 * @property {number|null} price         Last trade price
 * @property {number|null} change_pct    % change from prev close
 * @property {number|null} volume        Today's volume
 * @property {number|null} vwap          Today's VWAP
 * @property {number|null} prev_close
 * @property {number|null} day_high
 * @property {number|null} day_low
 * @property {number|null} day_open
 */

/**
 * @typedef {Object} PrevDayBar
 * @property {string} ticker
 * @property {number|null} open
 * @property {number|null} high
 * @property {number|null} low
 * @property {number|null} close
 * @property {number|null} volume
 * @property {number|null} vwap
 * @property {number}      timestamp     Unix ms (start of bar)
 */

/**
 * Fetch a real-time (or 15-min delayed) snapshot for a single US equity ticker.
 *
 * Massive endpoint:
 *   GET /v2/snapshot/locale/us/markets/stocks/tickers/{stocksTicker}
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {string} ticker
 * @returns {Promise<Snapshot>}
 */
export async function getSnapshot(client, ticker) {
  const upper = ticker.toUpperCase();
  const data = await client.get(
    `/v2/snapshot/locale/us/markets/stocks/tickers/${upper}`
  );

  const snap = data.ticker ?? {};
  const day = snap.day ?? {};
  const prevDay = snap.prevDay ?? {};
  const lastTrade = snap.lastTrade ?? {};

  return {
    ticker: upper,
    price: lastTrade.p ?? day.c ?? null,
    change_pct: snap.todaysChangePerc ?? null,
    volume: day.v ?? null,
    vwap: day.vw ?? null,
    prev_close: prevDay.c ?? null,
    day_high: day.h ?? null,
    day_low: day.l ?? null,
    day_open: day.o ?? null,
  };
}

/**
 * Fetch multiple snapshots in one request (up to ~50 tickers, comma-separated).
 *
 * Massive endpoint:
 *   GET /v2/snapshot/locale/us/markets/stocks/tickers?tickers=AAPL,NVDA,...
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {string[]} tickers
 * @returns {Promise<Snapshot[]>}
 */
export async function getSnapshots(client, tickers) {
  if (tickers.length === 0) return [];

  const upper = tickers.map((t) => t.toUpperCase());
  const data = await client.get(
    `/v2/snapshot/locale/us/markets/stocks/tickers`,
    { tickers: upper.join(",") }
  );

  const list = data.tickers ?? [];
  return list.map((snap) => {
    const day = snap.day ?? {};
    const prevDay = snap.prevDay ?? {};
    const lastTrade = snap.lastTrade ?? {};
    return {
      ticker: snap.ticker,
      price: lastTrade.p ?? day.c ?? null,
      change_pct: snap.todaysChangePerc ?? null,
      volume: day.v ?? null,
      vwap: day.vw ?? null,
      prev_close: prevDay.c ?? null,
      day_high: day.h ?? null,
      day_low: day.l ?? null,
      day_open: day.o ?? null,
    };
  });
}

/**
 * Fetch the previous trading session's OHLCV bar.
 *
 * Massive endpoint:
 *   GET /v2/aggs/ticker/{stocksTicker}/prev
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {string} ticker
 * @returns {Promise<PrevDayBar>}
 */
export async function getPrevDay(client, ticker) {
  const upper = ticker.toUpperCase();
  const data = await client.get(`/v2/aggs/ticker/${upper}/prev`);

  const bar = (data.results ?? [])[0] ?? {};

  return {
    ticker: upper,
    open: bar.o ?? null,
    high: bar.h ?? null,
    low: bar.l ?? null,
    close: bar.c ?? null,
    volume: bar.v ?? null,
    vwap: bar.vw ?? null,
    timestamp: bar.t ?? null,
  };
}
