/**
 * EIA adapter — public API.
 *
 * Primary use cases:
 *   - WTI and Brent crude oil spot prices (daily)
 *   - Weekly Petroleum Status Report: crude oil inventory change
 *   - Weekly Natural Gas Storage Report: working gas in storage
 *   - U.S. crude oil production (monthly)
 *
 * The weekly crude and nat gas reports are major market-moving events:
 *   - Crude inventory: released every Wednesday ~10:30am ET
 *   - Nat gas storage: released every Thursday ~10:30am ET
 *
 * Known series IDs:
 *   RWTC             WTI Cushing spot price ($/bbl, daily)
 *   RBRTE            Europe Brent spot price ($/bbl, daily)
 *   WCESTUS1         U.S. crude stocks excl. SPR (thousand bbl, weekly)
 *   WCSSTUS1         U.S. crude in SPR (thousand bbl, weekly)
 *   WCRSTUS1         U.S. crude stocks total incl. SPR (thousand bbl, weekly)
 *   NW2_EPG0_SWO_R48_BCF  Lower 48 nat gas working storage (BCF, weekly)
 */

export { EiaClient, EiaError } from "./client.mjs";

// ── Petroleum prices ───────────────────────────────────────────────────────

/**
 * WTI Cushing crude oil spot price (daily, $/barrel).
 *
 * @param {Object} [opts]
 * @param {number} [opts.limit]  Number of days (default 10)
 * @param {string} [opts.start]  YYYY-MM-DD
 * @param {string} [opts.end]    YYYY-MM-DD
 */
export function getWtiPrice(client, opts = {}) {
  return client.series("petroleum/pri/spt/data", "RWTC", {
    frequency: "daily",
    limit: opts.limit ?? 10,
    start: opts.start,
    end: opts.end,
  });
}

/**
 * Brent crude oil spot price (daily, $/barrel).
 *
 * @param {Object} [opts]
 * @param {number} [opts.limit]  Number of days (default 10)
 */
export function getBrentPrice(client, opts = {}) {
  return client.series("petroleum/pri/spt/data", "RBRTE", {
    frequency: "daily",
    limit: opts.limit ?? 10,
    start: opts.start,
    end: opts.end,
  });
}

/**
 * WTI and Brent spot prices together (daily).
 *
 * @param {Object} [opts]
 * @param {number} [opts.limit]  Number of rows per series (default 5)
 */
export async function getCrudeSpotPrices(client, opts = {}) {
  const limit = opts.limit ?? 5;
  const [wti, brent] = await Promise.all([
    getWtiPrice(client, { limit }),
    getBrentPrice(client, { limit }),
  ]);
  return { wti, brent };
}

// ── Petroleum stocks (weekly inventory) ───────────────────────────────────

/**
 * U.S. crude oil ending stocks excluding SPR (weekly, thousand barrels).
 * This is the headline number from the Weekly Petroleum Status Report.
 *
 * @param {Object} [opts]
 * @param {number} [opts.limit]  Number of weeks (default 8)
 */
export function getCrudeStocks(client, opts = {}) {
  return client.series("petroleum/stoc/wstk/data", "WCESTUS1", {
    frequency: "weekly",
    limit: opts.limit ?? 8,
    start: opts.start,
    end: opts.end,
  });
}

/**
 * U.S. crude oil in the Strategic Petroleum Reserve (weekly, thousand barrels).
 */
export function getSprStocks(client, opts = {}) {
  return client.series("petroleum/stoc/wstk/data", "WCSSTUS1", {
    frequency: "weekly",
    limit: opts.limit ?? 8,
  });
}

// ── Natural gas storage ────────────────────────────────────────────────────

/**
 * Lower 48 states weekly natural gas working underground storage (BCF).
 * Released every Thursday at ~10:30am ET.
 *
 * @param {Object} [opts]
 * @param {number} [opts.limit]  Number of weeks (default 8)
 */
export function getNatGasStorage(client, opts = {}) {
  return client.series("natural-gas/stor/wkly/data", "NW2_EPG0_SWO_R48_BCF", {
    frequency: "weekly",
    limit: opts.limit ?? 8,
    start: opts.start,
    end: opts.end,
  });
}

// ── Crude production ───────────────────────────────────────────────────────

/**
 * U.S. field production of crude oil (monthly, thousand barrels per day).
 *
 * @param {Object} [opts]
 * @param {number} [opts.limit]  Number of months (default 6)
 */
export async function getCrudeProduction(client, opts = {}) {
  const rows = await client.series("petroleum/crd/crpdn/data", "MCRFPUS2", {
    frequency: "monthly",
    limit: opts.limit ?? 6,
  });

  // Fall back to summing PADD-level series if national total is unavailable
  if (rows.length > 0) return rows;

  return client.series("petroleum/crd/crpdn/data", "WCRFPUS2", {
    frequency: "weekly",
    limit: opts.limit ?? 6,
  });
}

// ── Snapshot ───────────────────────────────────────────────────────────────

/**
 * Energy market snapshot: latest WTI/Brent prices, crude inventory,
 * nat gas storage, and week-over-week inventory change.
 */
export async function getEnergySnapshot(client) {
  const [wti, brent, crudeStocks, natGas] = await Promise.all([
    getWtiPrice(client, { limit: 2 }),
    getBrentPrice(client, { limit: 2 }),
    getCrudeStocks(client, { limit: 4 }),
    getNatGasStorage(client, { limit: 4 }),
  ]);

  const latestWti = wti[0];
  const latestBrent = brent[0];

  const crude0 = crudeStocks[0];
  const crude1 = crudeStocks[1];
  const crudeChange = crude0 && crude1
    ? Number(crude0.value) - Number(crude1.value)
    : null;

  const ng0 = natGas[0];
  const ng1 = natGas[1];
  const ngChange = ng0 && ng1
    ? Number(ng0.value) - Number(ng1.value)
    : null;

  return {
    as_of: new Date().toISOString(),
    crude_oil: {
      wti_price_usd: latestWti ? { date: latestWti.period, value: Number(latestWti.value) } : null,
      brent_price_usd: latestBrent ? { date: latestBrent.period, value: Number(latestBrent.value) } : null,
      wti_brent_spread: latestWti && latestBrent
        ? Number(latestBrent.value) - Number(latestWti.value)
        : null,
    },
    weekly_inventory: {
      crude_stocks_ex_spr_mbbl: crude0
        ? { date: crude0.period, value: Number(crude0.value) }
        : null,
      crude_stocks_change_mbbl: crudeChange,
      crude_stocks_history: crudeStocks.map((r) => ({
        date: r.period,
        value: Number(r.value),
      })),
    },
    natural_gas: {
      storage_bcf: ng0
        ? { date: ng0.period, value: Number(ng0.value) }
        : null,
      storage_change_bcf: ngChange,
      storage_history: natGas.map((r) => ({
        date: r.period,
        value: Number(r.value),
      })),
    },
  };
}
