/**
 * Polymarket adapter — public read API.
 *
 * Primary use cases:
 *   - Active event-market discovery
 *   - Cross-checking Kalshi probability/liquidity views
 *   - Finding event repricing candidates for research memos
 */

export { PolymarketClient, PolymarketError } from "./client.mjs";

export function listMarkets(client, options = {}) {
  return client.gamma("markets", normalizeDiscoveryOptions(options));
}

export function listEvents(client, options = {}) {
  return client.gamma("events", normalizeDiscoveryOptions(options));
}

export function getMarket(client, id) {
  return client.gamma(`markets/${encodeURIComponent(requireValue(id, "market id"))}`);
}

export function getEvent(client, id) {
  return client.gamma(`events/${encodeURIComponent(requireValue(id, "event id"))}`);
}

export function publicSearch(client, options = {}) {
  return client.gamma("public-search", {
    q: requireValue(options.q ?? options.query, "query"),
    limit_per_type: options.limitPerType ?? options.limit_per_type ?? options.limit ?? 25,
    page: options.page,
    events_status: options.eventsStatus ?? options.events_status,
    events_tag: options.eventsTag ?? options.events_tag,
    keep_closed_markets: options.keepClosedMarkets ?? options.keep_closed_markets,
  });
}

export function getOrderBook(client, tokenId) {
  return client.clob("book", { token_id: requireValue(tokenId, "token id") });
}

export function getPriceHistory(client, tokenId, options = {}) {
  return client.clob("prices-history", {
    market: requireValue(tokenId, "token id"),
    startTs: options.startTs ?? options.start_ts,
    endTs: options.endTs ?? options.end_ts,
    interval: options.interval ?? "max",
    fidelity: options.fidelity ?? 1440,
  });
}

export function getPublicProfile(client, wallet) {
  return client.gamma("public-profile", { address: requireWallet(wallet) });
}

export function getLeaderboard(client, options = {}) {
  return client.data("v1/leaderboard", normalizeLeaderboardOptions(options));
}

export function getWalletActivity(client, wallet, options = {}) {
  return client.data("activity", {
    ...normalizeWalletFlowOptions(options),
    user: requireWallet(wallet),
    type: options.type,
    start: options.start,
    end: options.end,
    sortBy: options.sortBy,
    sortDirection: options.sortDirection,
  });
}

export function getWalletTrades(client, wallet, options = {}) {
  return client.data("trades", {
    ...normalizeWalletFlowOptions(options),
    user: requireWallet(wallet),
    takerOnly: options.takerOnly,
    filterType: options.filterType,
    filterAmount: options.filterAmount,
    side: options.side,
  });
}

export function getWalletPositions(client, wallet, options = {}) {
  return client.data("positions", {
    user: requireWallet(wallet),
    market: options.market,
    eventId: options.eventId,
    sizeThreshold: options.sizeThreshold,
    redeemable: options.redeemable,
    mergeable: options.mergeable,
    limit: options.limit ?? 100,
    offset: options.offset,
    sortBy: options.sortBy,
    sortDirection: options.sortDirection,
    title: options.title,
  });
}

export function getMarketPositions(client, conditionId, options = {}) {
  return client.data("v1/market-positions", {
    market: requireConditionId(conditionId),
    user: options.user,
    status: options.status,
    sortBy: options.sortBy,
    sortDirection: options.sortDirection,
    limit: options.limit ?? 50,
    offset: options.offset,
  });
}

export async function getWalletSummary(client, wallet, options = {}) {
  const days = Number(options.days ?? 90);
  const limit = Number(options.limit ?? 250);
  const user = requireWallet(wallet);
  const start = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000);

  const [profile, positions, activity] = await Promise.all([
    Promise.resolve(getPublicProfile(client, user)).catch((error) => ({ error: error.message })),
    Promise.resolve(getWalletPositions(client, user, {
      limit: Math.min(limit, 500),
      sortBy: "CURRENT",
      sortDirection: "DESC",
    })),
    Promise.resolve(getWalletActivity(client, user, {
      limit: Math.min(limit, 500),
      type: "TRADE",
      start,
      sortBy: "TIMESTAMP",
      sortDirection: "DESC",
    })),
  ]);

  return summarizeWallet(user, days, profile, array(positions), array(activity));
}

export async function getConsensusStudy(client, options = {}) {
  const query = options.query ?? "bitcoin";
  const marketLimit = Number(options.marketLimit ?? options.limit ?? 50);
  const pageSize = Math.min(Number(options.pageSize ?? 100), 500);
  const maxPages = Number(options.maxPages ?? 25);
  const horizons = normalizeHorizons(options.horizons ?? options.horizon ?? "168,24,1,0");
  const fidelity = Number(options.fidelity ?? 1440);
  const matchTerms = normalizeTerms(options.match ?? options.matches);
  const markets = await getClosedMarkets(client, { query, marketLimit, pageSize, maxPages, matchTerms });

  const observations = [];
  const marketSamples = [];
  const skipped = {
    non_binary: 0,
    unresolved: 0,
    missing_yes_token: 0,
    missing_history: 0,
    history_error: 0,
  };

  for (const market of markets) {
    const normalized = normalizeMarket(market);
    const resolutionTs = marketResolutionTs(market);
    if (!normalized.closed || (resolutionTs && resolutionTs > Date.now() / 1000)) {
      skipped.unresolved += 1;
      continue;
    }

    if (normalized.outcomes.length !== 2) {
      skipped.non_binary += 1;
      continue;
    }

    const outcome = inferYesOutcome(market, normalized);
    if (outcome == null) {
      skipped.unresolved += 1;
      continue;
    }

    const yesTokenId = normalized.clob_token_ids[0];
    if (!yesTokenId) {
      skipped.missing_yes_token += 1;
      continue;
    }

    let history;
    try {
      const response = await getPriceHistory(client, yesTokenId, { interval: "max", fidelity });
      history = array(response?.history).map(normalizePricePoint).filter((point) => point.t && point.p != null);
    } catch (error) {
      skipped.history_error += 1;
      marketSamples.push({
        question: normalized.question,
        slug: normalized.slug,
        condition_id: normalized.condition_id,
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    if (history.length === 0) {
      skipped.missing_history += 1;
      continue;
    }

    history.sort((a, b) => a.t - b.t);
    const sample = {
      question: normalized.question,
      slug: normalized.slug,
      condition_id: normalized.condition_id,
      family: classifyMarketFamily(normalized),
      yes_outcome: outcome,
      end_ts: resolutionTs,
      volume: normalized.volume,
      samples: {},
    };

    for (const horizonHours of horizons) {
      const point = sampleAtHorizon(history, resolutionTs, horizonHours);
      if (!point) continue;
      const label = horizonLabel(horizonHours);
      const observation = {
        horizon: label,
        family: classifyMarketFamily(normalized),
        probability: point.p,
        outcome,
        question: normalized.question,
        slug: normalized.slug,
        condition_id: normalized.condition_id,
        sampled_at: new Date(point.t * 1000).toISOString(),
      };
      observations.push(observation);
      sample.samples[label] = {
        probability: round(point.p),
        sampled_at: observation.sampled_at,
      };
    }

    marketSamples.push(sample);
  }

  const byHorizon = {};
  for (const horizon of [...new Set(observations.map((row) => row.horizon))]) {
    const rows = observations.filter((row) => row.horizon === horizon);
    byHorizon[horizon] = summarizeCalibration(rows);
  }
  const byFamily = {};
  for (const family of [...new Set(observations.map((row) => row.family))].sort()) {
    byFamily[family] = {};
    for (const horizon of [...new Set(observations.filter((row) => row.family === family).map((row) => row.horizon))]) {
      const rows = observations.filter((row) => row.family === family && row.horizon === horizon);
      byFamily[family][horizon] = summarizeCalibration(rows);
    }
  }

  return {
    as_of: new Date().toISOString(),
    source: "polymarket_gamma_clob",
    query,
    match_terms: matchTerms,
    requested_markets: marketLimit,
    max_pages: maxPages,
    fetched_markets: markets.length,
    resolved_markets_used: new Set(observations.map((row) => row.condition_id)).size,
    observation_count: observations.length,
    skipped,
    horizons: byHorizon,
    families: byFamily,
    market_samples: marketSamples.slice(0, Number(options.sampleLimit ?? 20)),
    caveats: [
      "This uses YES-token price history from public CLOB data and inferred closed-market outcomes.",
      "Naive payoff assumes a fill at the sampled probability and ignores bid/ask spread, fees, slippage, and market impact.",
      "BTC market families differ: up/down, threshold-touch, end-price buckets, and long-dated milestones should be studied separately before trading.",
      "Always read market resolution rules; crypto micro-markets can depend on oracle timing rather than exchange spot alone.",
    ],
  };
}

export async function getActiveMarketScan(client, options = {}) {
  const limit = options.limit ?? 100;
  const sort = options.sort ?? "volume24hr";
  const markets = await listMarkets(client, {
    active: true,
    closed: false,
    archived: false,
    limit,
    offset: options.offset,
    order: sort,
    ascending: false,
  });

  return summarizeMarkets(Array.isArray(markets) ? markets : markets.markets ?? []);
}

async function getClosedMarkets(client, { query, marketLimit, pageSize, maxPages, matchTerms }) {
  const markets = [];
  for (let pageIndex = 0; markets.length < marketLimit && pageIndex < maxPages; pageIndex += 1) {
    const results = await publicSearch(client, {
      q: query,
      limitPerType: Math.min(pageSize, 100),
      page: pageIndex + 1,
      eventsStatus: "closed",
      keepClosedMarkets: 1,
    });
    const searchedMarkets = flattenSearchMarkets(results)
      .filter((market) => market.closed)
      .filter((market) => marketMatches(market, matchTerms));
    markets.push(...searchedMarkets);
    if (searchedMarkets.length === 0 && pageIndex > 2) break;
  }

  if (markets.length >= marketLimit) return dedupeMarkets(markets).slice(0, marketLimit);

  for (let pageIndex = 0; markets.length < marketLimit && pageIndex < maxPages; pageIndex += 1) {
    const offset = pageIndex * pageSize;
    const page = await listMarkets(client, {
      q: query,
      closed: true,
      active: false,
      archived: false,
      limit: Math.min(pageSize, marketLimit - markets.length),
      offset,
      order: "endDate",
      ascending: false,
    });
    const rows = Array.isArray(page) ? page : page.markets ?? [];
    if (rows.length === 0) break;
    markets.push(...rows.filter((market) => market.closed).filter((market) => marketMatches(market, matchTerms)));
  }
  return dedupeMarkets(markets).slice(0, marketLimit);
}

function normalizeDiscoveryOptions(options) {
  return {
    limit: options.limit ?? 100,
    offset: options.offset,
    active: options.active,
    closed: options.closed,
    archived: options.archived,
    tag_id: options.tagId ?? options.tag_id,
    related_tags: options.relatedTags ?? options.related_tags,
    order: options.order,
    ascending: options.ascending,
    liquidity_num_min: options.liquidityMin ?? options.liquidity_num_min,
    volume_num_min: options.volumeMin ?? options.volume_num_min,
    volume_24hr_min: options.volume24hMin ?? options.volume_24hr_min,
    end_date_min: options.endDateMin ?? options.end_date_min,
    end_date_max: options.endDateMax ?? options.end_date_max,
    q: options.q,
  };
}

function normalizeLeaderboardOptions(options) {
  return {
    category: options.category ?? "OVERALL",
    timePeriod: options.period ?? options.timePeriod ?? "MONTH",
    orderBy: options.orderBy ?? "PNL",
    limit: options.limit ?? 25,
    offset: options.offset,
    user: options.user,
    userName: options.userName,
  };
}

function normalizeWalletFlowOptions(options) {
  return {
    limit: options.limit ?? 100,
    offset: options.offset,
    market: options.market,
    eventId: options.eventId,
  };
}

function summarizeWallet(wallet, days, profile, positions, activity) {
  const trades = activity.filter((row) => row.type === "TRADE");
  const buys = trades.filter((row) => row.side === "BUY");
  const sells = trades.filter((row) => row.side === "SELL");
  const currentValue = sum(positions, "currentValue");
  const initialValue = sum(positions, "initialValue");
  const cashPnl = sum(positions, "cashPnl");
  const realizedPnl = sum(positions, "realizedPnl");
  const usdcVolume = sum(trades, "usdcSize");
  const uniqueMarkets = new Set(trades.map((row) => row.conditionId).filter(Boolean));

  return {
    as_of: new Date().toISOString(),
    source: "polymarket_data_api",
    wallet,
    lookback_days: days,
    profile,
    open_positions: {
      count: positions.length,
      current_value: round(currentValue),
      initial_value: round(initialValue),
      cash_pnl: round(cashPnl),
      realized_pnl: round(realizedPnl),
      percent_pnl: initialValue > 0 ? round((cashPnl / initialValue) * 100) : null,
      top_by_current_value: positions.slice(0, 10).map(normalizePositionSummary),
    },
    recent_activity: {
      trade_count: trades.length,
      buy_count: buys.length,
      sell_count: sells.length,
      unique_market_count: uniqueMarkets.size,
      usdc_volume: round(usdcVolume),
      largest_trades: [...trades].sort((a, b) => number(b.usdcSize) - number(a.usdcSize)).slice(0, 10).map(normalizeTradeSummary),
      latest_trades: trades.slice(0, 10).map(normalizeTradeSummary),
    },
    caveats: [
      "Leaderboard PnL and open-position PnL can be dominated by large unresolved positions.",
      "A wallet can look skilled because of one large event; use market-level validation before copying behavior.",
      "This summary is research context only and does not produce a trade recommendation.",
    ],
  };
}

function summarizeMarkets(markets) {
  const rows = markets.map(normalizeMarket);
  return {
    as_of: new Date().toISOString(),
    source: "polymarket_gamma",
    scanned: rows.length,
    active_markets: rows.filter((row) => row.active).length,
    markets_with_volume: rows.filter((row) => row.volume > 0 || row.volume_24h > 0).length,
    total_volume: sum(rows, "volume"),
    total_volume_24h: sum(rows, "volume_24h"),
    total_liquidity: sum(rows, "liquidity"),
    top_by_volume_24h: [...rows].sort((a, b) => b.volume_24h - a.volume_24h).slice(0, 20),
    top_by_liquidity: [...rows].sort((a, b) => b.liquidity - a.liquidity).slice(0, 20),
  };
}

function normalizeMarket(market) {
  return {
    id: market.id ?? null,
    question: market.question ?? market.title ?? null,
    slug: market.slug ?? null,
    active: Boolean(market.active),
    closed: Boolean(market.closed),
    archived: Boolean(market.archived),
    volume: number(market.volumeNum ?? market.volume),
    volume_24h: number(market.volume24hr ?? market.volume24hrClob ?? market.volume_24hr),
    liquidity: number(market.liquidityNum ?? market.liquidity),
    end_date: market.endDate ?? market.end_date_iso ?? null,
    outcomes: parseJsonArray(market.outcomes),
    outcome_prices: parseJsonArray(market.outcomePrices),
    clob_token_ids: parseJsonArray(market.clobTokenIds),
    condition_id: market.conditionId ?? null,
  };
}

function classifyMarketFamily(market) {
  const text = `${market.question ?? ""} ${market.slug ?? ""}`.toLowerCase();
  if (/\b(up|down)\b/.test(text) && /\bbitcoin|btc\b/.test(text)) return "daily_up_down";
  if (/\babove\b|\bbelow\b/.test(text)) return "above_below_on_date";
  if (/\bdip\b|\bbelow\b/.test(text) && /\bin\b|\bby\b/.test(text)) return "dip_or_downside_touch";
  if (/\breach\b|\bhit\b|\btouch\b/.test(text)) return "reach_touch_by_date";
  return "other_btc";
}

function normalizePositionSummary(position) {
  return {
    title: position.title ?? null,
    outcome: position.outcome ?? null,
    condition_id: position.conditionId ?? null,
    asset: position.asset ?? null,
    size: number(position.size),
    avg_price: number(position.avgPrice),
    current_price: number(position.curPrice),
    current_value: round(position.currentValue),
    cash_pnl: round(position.cashPnl),
    percent_pnl: round(position.percentPnl),
    end_date: position.endDate ?? null,
  };
}

function normalizeTradeSummary(trade) {
  return {
    timestamp: trade.timestamp ?? null,
    side: trade.side ?? null,
    title: trade.title ?? null,
    outcome: trade.outcome ?? null,
    condition_id: trade.conditionId ?? null,
    asset: trade.asset ?? null,
    size: number(trade.size),
    price: number(trade.price),
    usdc_size: round(trade.usdcSize),
  };
}

function normalizePricePoint(point) {
  return {
    t: number(point.t),
    p: clampProbability(point.p),
  };
}

function inferYesOutcome(market, normalized = normalizeMarket(market)) {
  const resolution = String(
    market.resolution ?? market.resolvedOutcome ?? market.winningOutcome ?? market.winner ?? "",
  ).toLowerCase();
  if (resolution === "yes") return 1;
  if (resolution === "no") return 0;

  const prices = normalized.outcome_prices.map(Number);
  if (prices.length >= 2 && prices.every(Number.isFinite)) {
    if (prices[0] >= 0.9 && prices[0] > prices[1]) return 1;
    if (prices[1] >= 0.9 && prices[1] > prices[0]) return 0;
  }

  return null;
}

function marketResolutionTs(market) {
  return unixTimestamp(
    market.closedTime ??
    market.resolutionTime ??
    market.resolvedTime ??
    market.endDate ??
    market.end_date_iso,
  );
}

function sampleAtHorizon(history, resolutionTs, horizonHours) {
  if (!history.length) return null;
  const target = resolutionTs && horizonHours > 0 ? resolutionTs - horizonHours * 3600 : resolutionTs;
  if (!target) return history[history.length - 1];
  let candidate = null;
  for (const point of history) {
    if (point.t <= target) candidate = point;
    else break;
  }
  return candidate ?? history[0];
}

function summarizeCalibration(rows) {
  const count = rows.length;
  const bucketed = new Map();
  let brierTotal = 0;
  let directionalHits = 0;
  let followConsensusPayoff = 0;
  let fadeConsensusPayoff = 0;

  for (const row of rows) {
    const p = clampProbability(row.probability);
    const outcome = Number(row.outcome);
    const bucket = probabilityBucket(p);
    const existing = bucketed.get(bucket) ?? {
      bucket,
      count: 0,
      avg_probability: 0,
      realized_yes_rate: 0,
      brier_score: 0,
    };
    existing.count += 1;
    existing.avg_probability += p;
    existing.realized_yes_rate += outcome;
    existing.brier_score += (p - outcome) ** 2;
    bucketed.set(bucket, existing);

    brierTotal += (p - outcome) ** 2;
    const consensusWasYes = p >= 0.5;
    if ((consensusWasYes && outcome === 1) || (!consensusWasYes && outcome === 0)) directionalHits += 1;

    const consensusPrice = consensusWasYes ? p : 1 - p;
    const consensusPayout = consensusWasYes ? outcome : 1 - outcome;
    const follow = consensusPayout - consensusPrice;
    followConsensusPayoff += follow;
    fadeConsensusPayoff += -follow;
  }

  return {
    observations: count,
    brier_score: count ? round(brierTotal / count) : null,
    directional_hit_rate: count ? round((directionalHits / count) * 100) : null,
    naive_follow_consensus_payoff_per_share: count ? round(followConsensusPayoff / count) : null,
    naive_fade_consensus_payoff_per_share: count ? round(fadeConsensusPayoff / count) : null,
    buckets: [...bucketed.values()]
      .sort((a, b) => a.bucket.localeCompare(b.bucket))
      .map((bucket) => ({
        bucket: bucket.bucket,
        observations: bucket.count,
        avg_probability: round(bucket.avg_probability / bucket.count),
        realized_yes_rate: round((bucket.realized_yes_rate / bucket.count) * 100),
        brier_score: round(bucket.brier_score / bucket.count),
      })),
  };
}

function normalizeHorizons(value) {
  const raw = Array.isArray(value) ? value : String(value).split(",");
  const parsed = raw.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item >= 0);
  return parsed.length ? [...new Set(parsed)] : [168, 24, 1, 0];
}

function normalizeTerms(value) {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : String(value).split(",");
  return raw.map((item) => item.trim().toLowerCase()).filter(Boolean);
}

function marketMatches(market, terms) {
  if (!terms.length) return true;
  const text = `${market.question ?? ""} ${market.title ?? ""} ${market.slug ?? ""}`.toLowerCase();
  return terms.some((term) => text.includes(term));
}

function flattenSearchMarkets(results) {
  const events = array(results?.events);
  return events.flatMap((event) => array(event.markets).map((market) => ({
    ...market,
    event: {
      id: event.id,
      slug: event.slug,
      title: event.title,
      closed: event.closed,
      active: event.active,
    },
  })));
}

function dedupeMarkets(markets) {
  const seen = new Set();
  const rows = [];
  for (const market of markets) {
    const key = market.conditionId ?? market.id ?? market.slug;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    rows.push(market);
  }
  return rows;
}

function horizonLabel(hours) {
  if (hours === 0) return "latest_before_resolution";
  if (hours % 24 === 0) return `${hours / 24}d_before_resolution`;
  return `${hours}h_before_resolution`;
}

function probabilityBucket(value) {
  const p = clampProbability(value);
  const low = Math.min(Math.floor(p * 10) * 10, 90);
  return `${low}-${low + 10}`;
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function unixTimestamp(value) {
  if (value == null || value === "") return null;
  if (Number.isFinite(Number(value))) {
    const numeric = Number(value);
    return numeric > 10_000_000_000 ? Math.floor(numeric / 1000) : Math.floor(numeric);
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : null;
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value) {
  const parsed = number(value);
  return Math.round(parsed * 10000) / 10000;
}

function clampProbability(value) {
  const parsed = number(value);
  if (parsed < 0) return 0;
  if (parsed > 1) return 1;
  return parsed;
}

function sum(rows, field) {
  return rows.reduce((total, row) => total + number(row[field]), 0);
}

function requireValue(value, name) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function requireWallet(value) {
  const wallet = requireValue(value, "wallet").toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(wallet)) {
    throw new Error("wallet must be a 0x-prefixed 40-character address");
  }
  return wallet;
}

function requireConditionId(value) {
  const conditionId = requireValue(value, "condition id").toLowerCase();
  if (!/^0x[a-f0-9]{64}$/.test(conditionId)) {
    throw new Error("condition id must be a 0x-prefixed 64-character hash");
  }
  return conditionId;
}
