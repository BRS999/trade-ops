#!/usr/bin/env node

import {
  MassiveClient,
  getBars,
  getFinancials,
  getOptionContracts,
  getOptionChainSnapshot,
  getOptionTrades,
  getOptionBars,
  scanUnusualOptions,
  getFuturesContracts,
  getFuturesProducts,
  getFuturesSchedule,
  getFuturesSnapshots,
  getFuturesBars,
  getFuturesTrades,
  getFuturesExchanges,
  getFuturesMarketStatus,
  getFuturesQuote,
  getFrontContract,
  getPrevDay,
  getSnapshot,
  getSnapshots,
  getTickerDetails,
  getInflation,
  getInflationExpectations,
  getLaborMarket,
  getTreasuryYields,
  getYieldCurve,
  getNews,
  getStockNews,
  getShortInterest,
  getLatestShortInterest,
  getShortVolume,
  getDividends,
  getSplits,
  getMarketStatus,
  getMarketHolidays,
  getUniversalSnapshot,
  getRelatedCompanies,
  getCryptoBars,
  getCryptoSnapshots,
  getCryptoTickerSnapshot,
  getCryptoTrades,
  getForexBars,
  getForexQuote,
  getForexSnapshots,
  getIndexBars,
  getIndexSnapshots,
  getEtfAnalyticsLatest,
  getEtfConstituents,
  getEtfTopHoldings,
  getEtfFundFlows,
  getEtfProfile,
} from "../adapters/massive/index.mjs";

let client;

try {
  client = new MassiveClient();
} catch (error) {
  if (process.argv[2] !== "help" && process.argv[2] !== undefined) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

const [, , command, ...rest] = process.argv;

try {
  switch (command) {
    // ── Stocks (existing) ──────────────────────────────────────────────────
    case "snapshot":
      ensureClient();
      print(await getSnapshot(client, requireArg(rest[0], "ticker")));
      break;
    case "prev-day":
      ensureClient();
      print(await getPrevDay(client, requireArg(rest[0], "ticker")));
      break;
    case "ticker-details":
      ensureClient();
      print(await getTickerDetails(client, requireArg(rest[0], "ticker")));
      break;
    case "financials":
      ensureClient();
      print(await runFinancials(rest));
      break;
    case "bars":
      ensureClient();
      print(await runBars(rest));
      break;

    // ── Options (paid) ────────────────────────────────────────────────────
    case "options-contracts":
      ensureClient();
      print(await runOptionsContracts(rest));
      break;
    case "options-chain":
      ensureClient();
      print(await runOptionsChain(rest));
      break;
    case "options-trades":
      ensureClient();
      print(await runOptionsTrades(rest));
      break;
    case "options-bars":
      ensureClient();
      print(await runOptionsBars(rest));
      break;
    case "options-unusual":
      ensureClient();
      print(await runOptionsUnusual(rest));
      break;

    // ─ Futures (paid for snapshots/trades) ────────────────────────────────
    case "futures-contracts":
      ensureClient();
      print(await runFuturesContracts(rest));
      break;
    case "futures-products":
      ensureClient();
      print(await runFuturesProducts(rest));
      break;
    case "futures-snapshot":
      ensureClient();
      print(await runFuturesSnapshot(rest));
      break;
    case "futures-bars":
      ensureClient();
      print(await runFuturesBars(rest));
      break;
    case "futures-trades":
      ensureClient();
      print(await runFuturesTrades(rest));
      break;
    case "futures-front":
      ensureClient();
      print(await runFuturesFront(rest));
      break;
    case "futures-schedule":
      ensureClient();
      print(await runFuturesSchedule(rest));
      break;
    case "futures-exchanges":
      ensureClient();
      print(await getFuturesExchanges(client));
      break;
    case "futures-status":
      ensureClient();
      print(await getFuturesMarketStatus(client));
      break;
    case "futures-quote":
      ensureClient();
      print(await getFuturesQuote(client, requireArg(rest[0], "ticker")));
      break;

    // ── Economics (Fed) ──────────────────────────────────────────────────
    case "inflation":
      ensureClient();
      print(await getInflation(client, parseDateOpts(rest)));
      break;
    case "inflation-expectations":
      ensureClient();
      print(await getInflationExpectations(client, parseDateOpts(rest)));
      break;
    case "labor-market":
      ensureClient();
      print(await getLaborMarket(client, parseDateOpts(rest)));
      break;
    case "treasury-yields":
      ensureClient();
      print(await getTreasuryYields(client, parseDateOpts(rest)));
      break;
    case "yield-curve":
      ensureClient();
      print(await getYieldCurve(client, rest[0]));
      break;

    // ── News ─────────────────────────────────────────────────────────────
    case "news":
      ensureClient();
      print(await runNews(rest));
      break;
    case "stock-news":
      ensureClient();
      print(await runStockNews(rest));
      break;

    // ── Short data, dividends, splits ─────────────────────────────────────
    case "short-interest":
      ensureClient();
      print(await runShortInterest(rest));
      break;
    case "short-volume":
      ensureClient();
      print(await runShortVolume(rest));
      break;
    case "dividends":
      ensureClient();
      print(await getDividends(client, parseTickerOpts(rest)));
      break;
    case "splits":
      ensureClient();
      print(await getSplits(client, parseTickerOpts(rest)));
      break;

    // ── Market status ────────────────────────────────────────────────────
    case "market-status":
      ensureClient();
      print(await getMarketStatus(client));
      break;
    case "market-holidays":
      ensureClient();
      print(await getMarketHolidays(client));
      break;
    case "snapshot-all":
      ensureClient();
      print(await runUniversalSnapshot(rest));
      break;
    case "related-companies":
      ensureClient();
      print(await getRelatedCompanies(client, requireArg(rest[0], "ticker")));
      break;

    // ── Crypto ───────────────────────────────────────────────────────────
    case "crypto-bars":
      ensureClient();
      print(await runCryptoBars(rest));
      break;
    case "crypto-snapshot":
      ensureClient();
      print(await getCryptoTickerSnapshot(client, requireArg(rest[0], "ticker")));
      break;
    case "crypto-snapshots":
      ensureClient();
      print(await getCryptoSnapshots(client, { limit: Number(flag(rest, "--limit", "100")) }));
      break;
    case "crypto-trades":
      ensureClient();
      print(await runCryptoTrades(rest));
      break;

    // ── Forex ────────────────────────────────────────────────────────────
    case "forex-quote":
      ensureClient();
      print(await getForexQuote(client, requireArg(rest[0], "ticker")));
      break;
    case "forex-snapshots":
      ensureClient();
      print(await getForexSnapshots(client, { limit: Number(flag(rest, "--limit", "100")) }));
      break;
    case "forex-bars":
      ensureClient();
      print(await runForexBars(rest));
      break;

    // ── Indices ──────────────────────────────────────────────────────────
    case "index-bars":
      ensureClient();
      print(await runIndexBars(rest));
      break;
    case "index-snapshots":
      ensureClient();
      print(await getIndexSnapshots(client, { ticker: flag(rest, "--ticker"), limit: Number(flag(rest, "--limit", "100")) }));
      break;
    case "major-indices":
      ensureClient();
      print(await getIndexSnapshots(client, { limit: 10 }));
      break;

    // ── ETF ──────────────────────────────────────────────────────────────
    case "etf-analytics":
      ensureClient();
      print(await getEtfAnalyticsLatest(client, requireArg(rest[0], "ticker")));
      break;
    case "etf-constituents":
      ensureClient();
      print(await getEtfConstituents(client, {
        ticker: flag(rest, "--ticker"),
        limit: Number(flag(rest, "--limit", "500")),
      }));
      break;
    case "etf-top":
      ensureClient();
      print(await getEtfTopHoldings(client, requireArg(rest[0], "ticker"), Number(flag(rest, "--n", "10"))));
      break;
    case "etf-flows":
      ensureClient();
      print(await runEtfFlows(rest));
      break;
    case "etf-profile":
      ensureClient();
      print(await getEtfProfile(client, requireArg(rest[0], "ticker")));
      break;

    // ── Help ─────────────────────────────────────────────────────────────
    case "help":
    case undefined:
      printHelp();
      break;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Runners — Stocks (existing)
// ═══════════════════════════════════════════════════════════════════════════════

async function runFinancials(args) {
  const ticker = requireArg(args[0], "ticker");
  const options = {};

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--timeframe") {
      options.timeframe = requireArg(args[index + 1], "timeframe");
      index += 1;
      continue;
    }
    if (arg === "--limit") {
      const limit = Number(requireArg(args[index + 1], "limit"));
      if (!Number.isFinite(limit) || limit <= 0) throw new Error("limit must be a positive number");
      options.limit = limit;
      index += 1;
      continue;
    }
    throw new Error(`Unknown financials option: ${arg}`);
  }

  return getFinancials(client, ticker, options);
}

async function runBars(args) {
  const ticker = requireArg(args[0], "ticker");
  const options = {};

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--from") { options.from = requireArg(args[index + 1], "from"); index += 1; continue; }
    if (arg === "--to") { options.to = requireArg(args[index + 1], "to"); index += 1; continue; }
    if (arg === "--timespan") { options.timespan = requireArg(args[index + 1], "timespan"); index += 1; continue; }
    if (arg === "--multiplier") {
      const m = Number(requireArg(args[index + 1], "multiplier"));
      if (!Number.isFinite(m) || m <= 0) throw new Error("multiplier must be a positive number");
      options.multiplier = m; index += 1; continue;
    }
    if (arg === "--limit") {
      const limit = Number(requireArg(args[index + 1], "limit"));
      if (!Number.isFinite(limit) || limit <= 0) throw new Error("limit must be a positive number");
      options.limit = limit; index += 1; continue;
    }
    throw new Error(`Unknown bars option: ${arg}`);
  }

  return getBars(client, ticker, options);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Runners — Options
// ═══════════════════════════════════════════════════════════════════════════════

async function runOptionsContracts(args) {
  const underlying = requireArg(args[0], "underlying");
  const contractType = flag(args, "--type");
  const asOf = flag(args, "--as-of");
  const limit = Number(flag(args, "--limit", "100"));
  return getOptionContracts(client, underlying, contractType || undefined, asOf || undefined, limit);
}

async function runOptionsChain(args) {
  const underlying = requireArg(args[0], "underlying");
  return getOptionChainSnapshot(client, underlying);
}

async function runOptionsTrades(args) {
  const ticker = requireArg(args[0], "options-ticker");
  const from = flag(args, "--from");
  const to = flag(args, "--to");
  const limit = Number(flag(args, "--limit", "100"));
  const opts = { limit };
  if (from) opts.timestamp_gte = from;
  if (to) opts.timestamp_lte = to;
  return getOptionTrades(client, ticker, opts);
}

async function runOptionsBars(args) {
  const ticker = requireArg(args[0], "options-ticker");
  const from = flag(args, "--from");
  const to = flag(args, "--to");
  const timespan = flag(args, "--timespan", "day");
  const multiplier = Number(flag(args, "--multiplier", "1"));
  const limit = Number(flag(args, "--limit", "120"));
  return getOptionBars(client, ticker, { from, to, timespan, multiplier, limit });
}

async function runOptionsUnusual(args) {
  const underlying = requireArg(args[0], "underlying");
  const minVolume = Number(flag(args, "--min-volume", "100"));
  const oiMultiplier = Number(flag(args, "--oi-multiplier", "2"));
  return scanUnusualOptions(client, underlying, { minVolume, oiMultiplier });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Runners — Futures
// ═══════════════════════════════════════════════════════════════════════════════

async function runFuturesContracts(args) {
  const productCode = flag(args, "--product") || flag(args, "--product-code");
  const asOf = flag(args, "--as-of");
  const limit = Number(flag(args, "--limit", "100"));
  const includeInactive = args.includes("--all");
  return getFuturesContracts(client, {
    product_code: productCode,
    active: !includeInactive,
    as_of: asOf || undefined,
    limit,
  });
}

async function runFuturesProducts(args) {
  const exchange = flag(args, "--exchange");
  const sector = flag(args, "--sector");
  const limit = Number(flag(args, "--limit", "100"));
  return getFuturesProducts(client, { exchange, sector, limit });
}

async function runFuturesSnapshot(args) {
  const ticker = flag(args, "--ticker");
  const productCode = flag(args, "--product") || flag(args, "--product-code");
  const sort = flag(args, "--sort");
  const limit = Number(flag(args, "--limit", "100"));
  return getFuturesSnapshots(client, {
    ticker: ticker || undefined,
    product_code: productCode || undefined,
    sort: sort || undefined,
    limit,
  });
}

async function runFuturesBars(args) {
  const ticker = requireArg(args[0], "ticker");
  const from = flag(args, "--from");
  const to = flag(args, "--to");
  const timespan = flag(args, "--timespan", "day");
  const multiplier = Number(flag(args, "--multiplier", "1"));
  const limit = Number(flag(args, "--limit", "5000"));
  return getFuturesBars(client, ticker, { from, to, timespan, multiplier, limit });
}

async function runFuturesTrades(args) {
  const ticker = requireArg(args[0], "ticker");
  const from = flag(args, "--from");
  const to = flag(args, "--to");
  const limit = Number(flag(args, "--limit", "100"));
  const opts = { limit };
  if (from) opts.timestamp_gte = from;
  if (to) opts.timestamp_lte = to;
  return getFuturesTrades(client, ticker, opts);
}

async function runFuturesFront(args) {
  const productCode = requireArg(args[0], "product-code");
  return getFrontContract(client, productCode);
}

async function runFuturesSchedule(args) {
  const from = flag(args, "--from");
  const to = flag(args, "--to");
  const productCode = flag(args, "--product") || flag(args, "--product-code");
  const limit = Number(flag(args, "--limit", "100"));
  return getFuturesSchedule(client, { from, to, product_code: productCode || undefined, limit });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Runners — Economics (Fed)
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// Runners — News
// ═══════════════════════════════════════════════════════════════════════════════

async function runNews(args) {
  const tickers = flag(args, "--tickers");
  const channels = flag(args, "--channels");
  const from = flag(args, "--from");
  const to = flag(args, "--to");
  const limit = Number(flag(args, "--limit", "25"));
  return getNews(client, {
    tickers: tickers || undefined,
    channels: channels || undefined,
    from: from || undefined,
    to: to || undefined,
    limit,
    sort: "-published",
  });
}

async function runStockNews(args) {
  const ticker = requireArg(args[0], "ticker");
  const limit = Number(flag(args, "--limit", "25"));
  const from = flag(args, "--from");
  return getStockNews(client, ticker, { limit, from: from || undefined });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Runners — Short data, dividends, splits
// ═══════════════════════════════════════════════════════════════════════════════

async function runShortInterest(args) {
  const ticker = flag(args, "--ticker");
  const from = flag(args, "--from");
  const to = flag(args, "--to");
  const limit = Number(flag(args, "--limit", "100"));
  if (!ticker) {
    // Multi-ticker query requires at least one filter
    throw new Error("short-interest requires --ticker or use latest-short-interest <ticker>");
  }
  return getLatestShortInterest(client, ticker);
}

async function runShortVolume(args) {
  const ticker = requireArg(args[0], "ticker");
  const from = flag(args, "--from");
  const to = flag(args, "--to");
  const limit = Number(flag(args, "--limit", "100"));
  return getShortVolume(client, { ticker, from: from || undefined, to: to || undefined, limit, sort: "-date" });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Runners — Market
// ═══════════════════════════════════════════════════════════════════════════════

async function runUniversalSnapshot(args) {
  const ticker = flag(args, "--ticker");
  const type = flag(args, "--type");
  const limit = Number(flag(args, "--limit", "100"));
  return getUniversalSnapshot(client, { ticker: ticker || undefined, type: type || undefined, limit });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Runners — Crypto
// ═══════════════════════════════════════════════════════════════════════════════

async function runCryptoBars(args) {
  const ticker = requireArg(args[0], "ticker");
  const from = flag(args, "--from");
  const to = flag(args, "--to");
  const timespan = flag(args, "--timespan", "day");
  const multiplier = Number(flag(args, "--multiplier", "1"));
  const limit = Number(flag(args, "--limit", "5000"));
  return getCryptoBars(client, ticker, { from, to, timespan, multiplier, limit });
}

async function runCryptoTrades(args) {
  const ticker = requireArg(args[0], "ticker");
  const from = flag(args, "--from");
  const to = flag(args, "--to");
  const limit = Number(flag(args, "--limit", "100"));
  return getCryptoTrades(client, ticker, {
    timestamp_gte: from || undefined,
    timestamp_lte: to || undefined,
    limit,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Runners — Forex
// ═══════════════════════════════════════════════════════════════════════════════

async function runForexBars(args) {
  const ticker = requireArg(args[0], "ticker");
  const from = flag(args, "--from");
  const to = flag(args, "--to");
  const timespan = flag(args, "--timespan", "day");
  const multiplier = Number(flag(args, "--multiplier", "1"));
  const limit = Number(flag(args, "--limit", "5000"));
  return getForexBars(client, ticker, { from, to, timespan, multiplier, limit });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Runners — Indices
// ═══════════════════════════════════════════════════════════════════════════════

async function runIndexBars(args) {
  const ticker = requireArg(args[0], "ticker");
  const from = flag(args, "--from");
  const to = flag(args, "--to");
  const timespan = flag(args, "--timespan", "day");
  const multiplier = Number(flag(args, "--multiplier", "1"));
  const limit = Number(flag(args, "--limit", "5000"));
  return getIndexBars(client, ticker, { from, to, timespan, multiplier, limit });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Runners — ETF
// ═══════════════════════════════════════════════════════════════════════════════

async function runEtfFlows(args) {
  const ticker = flag(args, "--ticker");
  const from = flag(args, "--from");
  const to = flag(args, "--to");
  const limit = Number(flag(args, "--limit", "100"));
  return getEtfFundFlows(client, {
    ticker: ticker || undefined,
    from: from || undefined,
    to: to || undefined,
    limit,
    sort: "-date",
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

function ensureClient() {
  if (!client) throw new Error("Massive client is unavailable");
}

function requireArg(value, name) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function flag(args, name, defaultVal) {
  const idx = args.indexOf(name);
  if (idx === -1) return defaultVal;
  return args[idx + 1];
}

function parseDateOpts(args) {
  const opts = {};
  const limit = Number(flag(args, "--limit", "100"));
  opts.limit = limit;
  const sort = flag(args, "--sort");
  if (sort) opts.sort = sort;
  const maturity = flag(args, "--maturity");
  if (maturity) opts.maturity = maturity;
  const from = flag(args, "--from");
  if (from) opts.from = from;
  const to = flag(args, "--to");
  if (to) opts.to = to;
  // If first positional arg exists and no --from/--to, treat as date
  if (args[0] && !from && !to) {
    const m = args[0].match(/^\d{4}-\d{2}-\d{2}$/);
    if (m) opts.date = args[0];
  }
  return opts;
}

function parseTickerOpts(args) {
  const opts = {};
  const limit = Number(flag(args, "--limit", "100"));
  opts.limit = limit;
  const sort = flag(args, "--sort");
  if (sort) opts.sort = sort;
  const from = flag(args, "--from");
  if (from) opts.from = from;
  const to = flag(args, "--to");
  if (to) opts.to = to;
  // First positional arg is ticker
  if (args[0] && !args[0].startsWith("--")) {
    opts.ticker = args[0];
  }
  return opts;
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp() {
  console.log(`Trade Ops Massive Tool

Requires:
  MASSIVE_API_KEY in the environment

═══════════════════════════════════════════════════════════════
Stocks
═══════════════════════════════════════════════════════════════
  snapshot              <ticker>            plan-gated on current account
  prev-day              <ticker>
  ticker-details        <ticker>
  financials            <ticker> [--timeframe quarterly] [--limit 4]
  bars                  <ticker> --from YYYY-MM-DD --to YYYY-MM-DD [--timespan day] [--multiplier 1] [--limit 120]

═══════════════════════════════════════════════════════════════
Economics / Federal Reserve (free)
═══════════════════════════════════════════════════════════════
  inflation             [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--limit 100] [--sort -date]
  inflation-expectations [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--limit 100]
  labor-market          [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--limit 100]
  treasury-yields       [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--maturity 10Y] [--limit 100]
  yield-curve           [YYYY-MM-DD]

═══════════════════════════════════════════════════════════════
News — Benzinga (plan-gated on current account)
═══════════════════════════════════════════════════════════════
  news                  [--tickers AAPL,MSFT] [--channels News,Analysis] [--from YYYY-MM-DD] [--limit 25]
  stock-news            <ticker> [--limit 25] [--from YYYY-MM-DD]

═══════════════════════════════════════════════════════════════
Short Data, Dividends, Splits (free)
═══════════════════════════════════════════════════════════════
  short-interest        --ticker <ticker>
  short-volume          <ticker> [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--limit 100]
  dividends             <ticker> [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--limit 100]
  splits                <ticker> [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--limit 100]

═══════════════════════════════════════════════════════════════
Market Status
═══════════════════════════════════════════════════════════════
  market-status
  market-holidays
  snapshot-all          [--ticker AAPL] [--type stocks] [--limit 100]  plan-gated
  related-companies     <ticker>

═══════════════════════════════════════════════════════════════
Crypto
═══════════════════════════════════════════════════════════════
  crypto-bars           <X:BTCUSD> --from YYYY-MM-DD --to YYYY-MM-DD [--timespan day] [--multiplier 1]
  crypto-snapshot       <BTC-USD>           plan-gated on current account
  crypto-snapshots      [--limit 100]       plan-gated on current account
  crypto-trades         <X:BTCUSD> [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--limit 100]  plan-gated

═══════════════════════════════════════════════════════════════
Forex
═══════════════════════════════════════════════════════════════
  forex-quote           <C:EURUSD>          plan-gated on current account
  forex-snapshots       [--limit 100]       plan-gated on current account
  forex-bars            <C:EURUSD> --from YYYY-MM-DD --to YYYY-MM-DD [--timespan day]

═══════════════════════════════════════════════════════════════
Indices (plan-gated on current account)
═══════════════════════════════════════════════════════════════
  index-bars            <I:SPX> --from YYYY-MM-DD --to YYYY-MM-DD [--timespan day]
  index-snapshots       [--ticker I:SPX] [--limit 100]
  major-indices         (SPX, NDX, DJI snapshots)

═══════════════════════════════════════════════════════════════
ETF (plan-gated on current account)
═══════════════════════════════════════════════════════════════
  etf-analytics         <ticker>            latest quantitative analysis
  etf-constituents      --ticker <ticker>   full holdings list
  etf-top               <ticker> [--n 10]  top N holdings
  etf-flows             --ticker <ticker> [--from YYYY-MM-DD] [--to YYYY-MM-DD]
  etf-profile           <ticker>            expense ratio, AUM, issuer, etc.

═══════════════════════════════════════════════════════════════
Options (paid — Starter $29/mo+ for snapshots, Developer $79/mo+ for trades)
═══════════════════════════════════════════════════════════════
  options-contracts     <underlying> [--type call|put] [--as-of YYYY-MM-DD] [--limit 100]
  options-chain         <underlying>
  options-trades        <options-ticker> [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--limit 100]
  options-bars          <options-ticker> --from YYYY-MM-DD --to YYYY-MM-DD [--timespan day]
  options-unusual       <underlying> [--min-volume 100] [--oi-multiplier 2]

═══════════════════════════════════════════════════════════════
Futures (paid — Starter $29/mo+ for snapshots/quotes, Developer $79/mo+ for trades)
═══════════════════════════════════════════════════════════════
  futures-contracts     [--product ES|GC|CL|...] [--all] [--limit 100]
  futures-products      [--exchange CME|NYMEX|...] [--sector Energy|Metals|...]
  futures-exchanges     list supported futures exchanges
  futures-status        current futures market status
  futures-quote         <ticker>            NBBO quote for a contract
  futures-front         <product-code>      nearest-expiry contract
  futures-snapshot      --ticker ESZ24 [--sort field] [--limit 100]
  futures-snapshot      --product ES
  futures-bars          <ticker> --from YYYY-MM-DD --to YYYY-MM-DD [--timespan day]
  futures-trades        <ticker> [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--limit 100]
  futures-schedule      --from YYYY-MM-DD --to YYYY-MM-DD [--product ES|GC|...]
`);
}
