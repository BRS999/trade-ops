/**
 * Massive ETF data — analytics, constituents, fund flows, profiles.
 *
 * Endpoint docs: https://massive.com/docs/rest/etf
 *
 * Key endpoints:
 *   GET /etf-global/v1/analytics    — quantitative analytics (risk, reward, grades)
 *   GET /etf-global/v1/constituents — ETF holdings / constituents
 *   GET /etf-global/v1/fund-flows   — fund flow data (inflows/outflows)
 *   GET /etf-global/v1/profiles     — ETF profiles (expense ratio, AUM, etc.)
 *
 * Plan notes: ETF analytics, constituents, fund flows, and profiles are
 * entitlement-gated on the current account.
 */

// ── ETF Analytics ─────────────────────────────────────────────────────────────

/**
 * @typedef {Object} EtfAnalytics
 * @property {string|null} ticker           composite ticker, e.g. "SPY"
 * @property {string|null} name             ETF name
 * @property {string|null} processed_date   YYYY-MM-DD of analysis
 * @property {string|null} effective_date   YYYY-MM-DD the analysis is effective
 * @property {number|null} risk_total_score  overall risk score (0-100)
 * @property {number|null} reward_score      reward score (0-100)
 * @property {number|null} quant_total_score quantitative total score
 * @property {string|null} quant_grade        "A+" through "F"
 * @property {number|null} quant_composite_technical
 * @property {number|null} quant_composite_sentiment
 * @property {number|null} quant_composite_behavioral
 * @property {number|null} quant_composite_fundamental
 * @property {number|null} quant_composite_global
 * @property {number|null} quant_composite_quality
 */

/**
 * Fetch quantitative analytics for ETFs.
 *
 * Provides risk scores, reward scores, and quantitative grades
 * based on technical, sentiment, behavioral, fundamental, global,
 * and quality factors.
 *
 * GET /etf-global/v1/analytics
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {Object} [opts]
 * @param {string}  [opts.ticker]          composite ticker, e.g. "SPY"
 * @param {string}  [opts.from]            processed_date.gte
 * @param {string}  [opts.to]              processed_date.lte
 * @param {number}  [opts.limit=100]
 * @param {string}  [opts.sort]            e.g. "-processed_date"
 * @returns {Promise<EtfAnalytics[]>}
 */
export async function getEtfAnalytics(client, opts = {}) {
  const { ticker, from, to, limit = 100, sort } = opts;
  const params = { limit: String(limit) };
  if (ticker) params.composite_ticker = ticker.toUpperCase();
  if (from) params["processed_date.gte"] = from;
  if (to) params["processed_date.lte"] = to;
  if (sort) params.sort = sort;

  const rows = await client.getAll("/etf-global/v1/analytics", params);
  return rows.map(_parseEtfAnalytics).filter(Boolean);
}

/**
 * Fetch latest analytics for a single ETF.
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {string} ticker  e.g. "SPY", "QQQ"
 * @returns {Promise<EtfAnalytics|null>}
 */
export async function getEtfAnalyticsLatest(client, ticker) {
  const rows = await getEtfAnalytics(client, {
    ticker,
    sort: "-processed_date",
    limit: 1,
  });
  return rows[0] ?? null;
}

// ── ETF Constituents ─────────────────────────────────────────────────────────

/**
 * @typedef {Object} EtfConstituent
 * @property {string|null} etf_ticker       composite ticker, e.g. "SPY"
 * @property {string|null} holding_ticker   constituent ticker, e.g. "AAPL"
 * @property {string|null} holding_name     company name
 * @property {number|null} weight           portfolio weight (0-1)
 * @property {number|null} shares           number of shares held
 * @property {number|null} market_value     market value of holding ($)
 * @property {string|null} sector
 */

/**
 * Fetch ETF holdings/constituents.
 *
 * GET /etf-global/v1/constituents
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {Object} [opts]
 * @param {string}  [opts.ticker]   composite ticker, e.g. "SPY"
 * @param {number}  [opts.limit=500]
 * @param {string}  [opts.sort]     e.g. "-weight" for top holdings first
 * @returns {Promise<EtfConstituent[]>}
 */
export async function getEtfConstituents(client, opts = {}) {
  const { ticker, limit = 500, sort } = opts;
  const params = { limit: String(limit) };
  if (ticker) params.composite_ticker = ticker.toUpperCase();
  if (sort) params.sort = sort;

  const rows = await client.getAll("/etf-global/v1/constituents", params);
  return rows.map(_parseEtfConstituent).filter(Boolean);
}

/**
 * Fetch top N holdings of an ETF.
 *
 * Convenience wrapper with preset limit.
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {string} ticker   e.g. "SPY"
 * @param {number} [topN=10]  number of top holdings to return
 * @returns {Promise<EtfConstituent[]>}
 */
export async function getEtfTopHoldings(client, ticker, topN = 10) {
  return getEtfConstituents(client, { ticker, limit: topN, sort: "-weight" });
}

// ── Fund Flows ───────────────────────────────────────────────────────────────

/**
 * @typedef {Object} FundFlow
 * @property {string|null} ticker           composite ticker, e.g. "SPY"
 * @property {string|null} date             YYYY-MM-DD
 * @property {number|null} inflow           inflow amount ($)
 * @property {number|null} outflow          outflow amount ($)
 * @property {number|null} net_flow         net flow = inflow - outflow ($)
 * @property {number|null} aum              assets under management ($)
 */

/**
 * Fetch ETF fund flow data (inflows/outflows).
 *
 * Large net inflows can indicate institutional buying interest.
 * Large net outflows can indicate distribution.
 *
 * GET /etf-global/v1/fund-flows
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {Object} [opts]
 * @param {string}  [opts.ticker]   composite ticker, e.g. "SPY"
 * @param {string}  [opts.from]     date.gte
 * @param {string}  [opts.to]       date.lte
 * @param {number}  [opts.limit=100]
 * @param {string}  [opts.sort]     e.g. "-date"
 * @returns {Promise<FundFlow[]>}
 */
export async function getEtfFundFlows(client, opts = {}) {
  const { ticker, from, to, limit = 100, sort } = opts;
  const params = { limit: String(limit) };
  if (ticker) params.composite_ticker = ticker.toUpperCase();
  if (from) params["date.gte"] = from;
  if (to) params["date.lte"] = to;
  if (sort) params.sort = sort;

  const rows = await client.getAll("/etf-global/v1/fund-flows", params);
  return rows.map(_parseFundFlow).filter(Boolean);
}

// ── ETF Profiles ─────────────────────────────────────────────────────────────

/**
 * @typedef {Object} EtfProfile
 * @property {string|null} ticker            composite ticker
 * @property {string|null} name              ETF name
 * @property {string|null} issuer            e.g. "State Street", "Invesco"
 * @property {string|null} asset_class       e.g. "Equity", "Fixed Income"
 * @property {string|null} focus             e.g. "Large Cap", "Total Market"
 * @property {number|null} expense_ratio     annual expense ratio (0-1)
 * @property {number|null} aum               assets under management ($)
 * @property {number|null} avg_daily_volume  30-day average daily volume
 * @property {number|null} inception_date    YYYY-MM-DD
 * @property {string|null} benchmark         tracking benchmark
 * @property {string|null} exchange          listing exchange
 */

/**
 * Fetch ETF profile data.
 *
 * Expense ratio, AUM, volume, issuer, benchmark, and other metadata.
 *
 * GET /etf-global/v1/profiles
 *
 * Massive returns this as a single object per ticker — wrapped in array.
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {string} ticker  e.g. "SPY"
 * @returns {Promise<EtfProfile>}
 */
export async function getEtfProfile(client, ticker) {
  const data = await client.get("/etf-global/v1/profiles", {
    composite_ticker: ticker.toUpperCase(),
  });
  const results = data.results ?? (Array.isArray(data) ? data : [data]);
  if (results.length === 0) {
    throw new Error(`Massive: ETF profile not found: ${ticker}`);
  }
  return _parseEtfProfile(results[0]);
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _parseEtfAnalytics(raw) {
  if (!raw) return null;
  return {
    ticker: raw.composite_ticker ?? raw.ticker ?? null,
    name: raw.name ?? null,
    processed_date: raw.processed_date ?? raw.processedDate ?? null,
    effective_date: raw.effective_date ?? raw.effectiveDate ?? null,
    risk_total_score: raw.risk_total_score ?? raw.riskTotalScore ?? null,
    reward_score: raw.reward_score ?? raw.rewardScore ?? null,
    quant_total_score: raw.quant_total_score ?? raw.quantTotalScore ?? null,
    quant_grade: raw.quant_grade ?? raw.quantGrade ?? null,
    quant_composite_technical: raw.quant_composite_technical ?? raw.quantCompositeTechnical ?? null,
    quant_composite_sentiment: raw.quant_composite_sentiment ?? raw.quantCompositeSentiment ?? null,
    quant_composite_behavioral: raw.quant_composite_behavioral ?? raw.quantCompositeBehavioral ?? null,
    quant_composite_fundamental: raw.quant_composite_fundamental ?? raw.quantCompositeFundamental ?? null,
    quant_composite_global: raw.quant_composite_global ?? raw.quantCompositeGlobal ?? null,
    quant_composite_quality: raw.quant_composite_quality ?? raw.quantCompositeQuality ?? null,
  };
}

function _parseEtfConstituent(raw) {
  if (!raw) return null;
  return {
    etf_ticker: raw.composite_ticker ?? raw.compositeTicker ?? null,
    holding_ticker: raw.ticker ?? raw.holding_ticker ?? raw.holdingTicker ?? null,
    holding_name: raw.name ?? raw.holding_name ?? raw.holdingName ?? null,
    weight: raw.weight ?? null,
    shares: raw.shares ?? raw.share_count ?? null,
    market_value: raw.market_value ?? raw.marketValue ?? null,
    sector: raw.sector ?? null,
  };
}

function _parseFundFlow(raw) {
  if (!raw) return null;
  const inflow = raw.inflow ?? raw.inflow_amount ?? null;
  const outflow = raw.outflow ?? raw.outflow_amount ?? null;
  return {
    ticker: raw.composite_ticker ?? raw.compositeTicker ?? raw.ticker ?? null,
    date: raw.date ?? null,
    inflow,
    outflow,
    net_flow: raw.net_flow ?? raw.netFlow ?? (
      inflow != null && outflow != null ? inflow - outflow : null
    ),
    aum: raw.aum ?? raw.assets_under_management ?? null,
  };
}

function _parseEtfProfile(raw) {
  if (!raw) return null;
  return {
    ticker: raw.composite_ticker ?? raw.compositeTicker ?? raw.ticker ?? null,
    name: raw.name ?? raw.full_name ?? null,
    issuer: raw.brand ?? raw.brand_name ?? raw.issuer ?? null,
    asset_class: raw.asset_class ?? raw.assetClass ?? null,
    focus: raw.focus ?? raw.category ?? null,
    expense_ratio: raw.expense_ratio ?? raw.expenseRatio ?? null,
    aum: raw.aum ?? raw.net_assets ?? null,
    avg_daily_volume: raw.avg_daily_volume ?? raw.avgDailyVolume ?? null,
    inception_date: raw.inception_date ?? raw.inceptionDate ?? null,
    benchmark: raw.benchmark ?? raw.index_tracked ?? null,
    exchange: raw.exchange ?? raw.primary_exchange ?? null,
  };
}
