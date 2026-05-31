#!/usr/bin/env node

/**
 * Alpaca paper/live trading CLI.
 *
 * Defaults to PAPER trading. Live requires --live flag or ALPACA_LIVE=true.
 * Never place a live order without explicit --live confirmation.
 */

import {
  AlpacaClient,
  getAccountSummary,
  getBars,
  getLatestTrade,
  getSnapshots,
  getPortfolioHistory,
  getPositions,
  getPosition,
  closePosition,
  closeAllPositions,
  getOrders,
  getOrder,
  placeOrder,
  cancelOrder,
  cancelAllOrders,
  replaceOrder,
  placeOcoExit,
  getClock,
  getAsset,
  isTradeable,
  getActivities,
} from "../adapters/alpaca/index.mjs";

// ── Parse --live flag before anything else ────────────────────────────────
const argv = process.argv.slice(2);
const liveIdx = argv.indexOf("--live");
const isLive = liveIdx !== -1;
if (liveIdx !== -1) argv.splice(liveIdx, 1);

const [command, ...rest] = argv;

const client = new AlpacaClient({ live: isLive });

if (isLive) {
  process.stderr.write("⚠  LIVE MODE — orders affect real money\n");
}

try {
  switch (command) {

    // ── Account ─────────────────────────────────────────────────────────
    case "account":
      print(await getAccountSummary(client));
      break;

    case "history": {
      const period    = flag(rest, "--period",    "1W");
      const timeframe = flag(rest, "--timeframe", "1D");
      print(await getPortfolioHistory(client, { period, timeframe }));
      break;
    }

    case "clock":
      print(await getClock(client));
      break;

    // ── Positions ────────────────────────────────────────────────────────
    case "positions":
      print(await getPositions(client));
      break;

    case "position":
      print(await getPosition(client, requireArg(rest[0], "symbol")));
      break;

    case "close": {
      const sym = requireArg(rest[0], "symbol");
      const qty = flag(rest, "--qty");
      const pct = flag(rest, "--pct");
      const opts = {};
      if (qty) opts.qty = Number(qty);
      if (pct) opts.percentage = Number(pct);
      print(await closePosition(client, sym, opts));
      break;
    }

    case "close-all":
      print(await closeAllPositions(client));
      break;

    // ── Orders ───────────────────────────────────────────────────────────
    case "orders": {
      const status = flag(rest, "--status", "open");
      const limit  = Number(flag(rest, "--limit", "50"));
      print(await getOrders(client, { status, limit }));
      break;
    }

    case "order":
      print(await getOrder(client, requireArg(rest[0], "order_id")));
      break;

    case "buy":
      print(await runOrder(client, "buy", rest));
      break;

    case "sell":
      print(await runOrder(client, "sell", rest));
      break;

    case "cancel":
      print(await cancelOrder(client, requireArg(rest[0], "order_id")));
      break;

    case "cancel-all":
      print(await cancelAllOrders(client));
      break;

    case "oco-exit": {
      const sym   = requireArg(rest[0], "symbol");
      const qty   = Number(requireArg(flag(rest, "--qty"), "--qty"));
      const tp    = Number(requireArg(flag(rest, "--take-profit"), "--take-profit"));
      const sl    = Number(requireArg(flag(rest, "--stop-loss"), "--stop-loss"));
      const slLim = flag(rest, "--stop-limit");
      const tif   = flag(rest, "--tif", "gtc");
      print(await placeOcoExit(client, sym, qty, tp, sl, {
        stopLimitPrice: slLim ? Number(slLim) : undefined,
        tif,
      }));
      break;
    }

    case "replace": {
      const orderId  = requireArg(rest[0], "order_id");
      const limitP   = flag(rest, "--limit");
      const stopP    = flag(rest, "--stop");
      const qty      = flag(rest, "--qty");
      const tif      = flag(rest, "--tif");
      const opts = {};
      if (limitP) opts.limit_price = Number(limitP);
      if (stopP)  opts.stop_price  = Number(stopP);
      if (qty)    opts.qty         = Number(qty);
      if (tif)    opts.tif         = tif;
      print(await replaceOrder(client, orderId, opts));
      break;
    }

    // ── Research ─────────────────────────────────────────────────────────
    case "asset":
      print(await getAsset(client, requireArg(rest[0], "symbol")));
      break;

    case "tradeable":
      print(await isTradeable(client, requireArg(rest[0], "symbol")));
      break;

    case "activities": {
      const type  = flag(rest, "--type");
      const limit = Number(flag(rest, "--limit", "50"));
      print(await getActivities(client, { type, limit }));
      break;
    }

    // ── Market data ──────────────────────────────────────────────────────────
    case "bars": {
      const sym   = requireArg(rest[0], "symbol");
      const start = flag(rest, "--start");
      const end   = flag(rest, "--end");
      const tf    = flag(rest, "--timeframe", "1Day");
      const limit = Number(flag(rest, "--limit", "500"));
      print(await getBars(client, sym, { start, end, timeframe: tf, limit }));
      break;
    }
    case "price":
      print(await getLatestTrade(client, requireArg(rest[0], "symbol")));
      break;
    case "snapshot":
      print(await getSnapshots(client, rest.length ? rest : [requireArg(rest[0], "symbol")]));
      break;

    case "help":
    case undefined:
      printHelp();
      break;

    default:
      throw new Error(`Unknown command: ${command}`);
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
}

// ── Order builder ─────────────────────────────────────────────────────────

async function runOrder(client, side, args) {
  const symbol  = requireArg(args[0], "symbol");
  const type    = flag(args, "--type",  "market");
  const tif     = flag(args, "--tif",   type === "market" ? "day" : "gtc");
  const qty     = flag(args, "--qty");
  const notional = flag(args, "--notional");
  const limit   = flag(args, "--limit");
  const stop    = flag(args, "--stop");
  const trail   = flag(args, "--trail");
  const trailPct = flag(args, "--trail-pct");
  const tp      = flag(args, "--take-profit");
  const sl      = flag(args, "--stop-loss");
  const ext     = args.includes("--extended");

  if (!qty && !notional) throw new Error("--qty or --notional required");

  const order = { symbol, side, type, tif };
  if (qty)       order.qty            = Number(qty);
  if (notional)  order.notional       = Number(notional);
  if (limit)     order.limit_price    = Number(limit);
  if (stop)      order.stop_price     = Number(stop);
  if (trail)     order.trail_price    = Number(trail);
  if (trailPct)  order.trail_percent  = Number(trailPct);
  if (tp)        order.take_profit    = Number(tp);
  if (sl)        order.stop_loss      = Number(sl);
  if (ext)       order.extended_hours = true;

  return placeOrder(client, order);
}

// ── Helpers ───────────────────────────────────────────────────────────────

function requireArg(value, name) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function flag(args, name, defaultVal) {
  const idx = args.indexOf(name);
  if (idx === -1) return defaultVal;
  return args[idx + 1];
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp() {
  console.log(`Trade Ops Alpaca Tool

⚠  Defaults to PAPER trading. Add --live for live account (real money).

Usage:
  npm run alpaca -- <command> [options] [--live]

Account:
  account                              Equity, cash, buying power, day P&L
  history [--period 1W] [--timeframe 1D]  Portfolio P&L history
  clock                                Market open/closed + next open/close
  activities [--type FILL] [--limit 50]

Positions:
  positions                            All open positions
  position <symbol>                    Single position
  close <symbol> [--qty N] [--pct N]   Close full or partial position
  close-all                            Close all positions

Orders:
  orders [--status open|closed|all] [--limit 50]
  order <order_id>
  cancel <order_id>
  cancel-all

Placing orders:
  buy  <symbol> --qty N  [--type market|limit|stop|stop_limit|trailing_stop]
                          [--tif day|gtc|ioc|fok] [--limit PRICE] [--stop PRICE]
                          [--trail PRICE | --trail-pct PCT]
                          [--take-profit PRICE] [--stop-loss PRICE]
                          [--notional DOLLARS] [--extended]
  sell <symbol> --qty N  [same options as buy]
  replace <order_id> [--limit PRICE] [--stop PRICE] [--qty N] [--tif TIF]

Research:
  asset <symbol>                       Asset details (tradeable, fractionable, etc.)
  tradeable <symbol>                   Quick tradeability check

Examples:
  npm run alpaca -- account
  npm run alpaca -- positions
  npm run alpaca -- buy NVDA --qty 10 --type market
  npm run alpaca -- buy NVDA --qty 10 --type limit --limit 135.00 --tif gtc
  npm run alpaca -- buy NVDA --qty 10 --type limit --limit 135.00 --take-profit 150.00 --stop-loss 128.00
  npm run alpaca -- sell NVDA --qty 5 --type market
  npm run alpaca -- close NVDA
  npm run alpaca -- close NVDA --pct 50
  npm run alpaca -- cancel <order_id>
  npm run alpaca -- orders --status all --limit 20

Periods for history: 1D 1W 1M 3M 6M 1A
Timeframes:          1Min 5Min 15Min 1H 1D
`);
}
