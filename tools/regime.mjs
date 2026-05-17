#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { YahooClient, getBars } from "../adapters/yahoo/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const [, , command = "help", ...rest] = process.argv;
const client = new YahooClient();

try {
  switch (command) {
    case "crypto":
      print(await runCryptoRegime(rest));
      break;
    case "symbol":
      print(await runSymbolRegime(rest));
      break;
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

async function runCryptoRegime(args) {
  const options = parseOptions(args, {
    range: "1mo",
    interval: "1h",
    includeMemes: false,
    save: false
  });

  const majors = ["BTC-USD", "ETH-USD", "SOL-USD"];
  const majorResults = [];
  for (const symbol of majors) {
    majorResults.push(await analyzeYahooSymbol(symbol, options));
  }

  const bySymbol = Object.fromEntries(majorResults.map((item) => [item.symbol, item]));
  const breadthSymbols = options.includeMemes ? loadYahooCryptoSymbols() : majors;
  const breadth = await computeBreadth(breadthSymbols, options);
  const risk = classifyCryptoRisk(bySymbol, breadth);
  const payload = {
    as_of: new Date().toISOString(),
    scope: "crypto",
    range: options.range,
    interval: options.interval,
    tags: {
      risk_appetite: risk.riskAppetite,
      leadership: risk.leadership,
      liquidity: classifyLiquidity(new Date())
    },
    confidence: risk.confidence,
    evidence: {
      major_returns: Object.fromEntries(
        majorResults.map((item) => [
          item.symbol,
          {
            return_1h_pct: item.evidence.returns["1h"],
            return_4h_pct: item.evidence.returns["4h"],
            return_24h_pct: item.evidence.returns["24h"],
            trend: item.tags.trend,
            volatility: item.tags.volatility
          }
        ])
      ),
      relative_strength: risk.relativeStrength,
      breadth
    },
    symbols: bySymbol
  };

  if (options.save) {
    saveRegime(payload, "crypto");
  }

  return payload;
}

async function runSymbolRegime(args) {
  const symbol = requireArg(args[0], "symbol");
  const options = parseOptions(args.slice(1), {
    range: "1mo",
    interval: "1h",
    save: false
  });
  const payload = await analyzeYahooSymbol(symbol, options);

  if (options.save) {
    saveRegime(payload, sanitizeSymbol(symbol));
  }

  return payload;
}

async function analyzeYahooSymbol(symbol, options) {
  const bars = await getBars(client, symbol, {
    range: options.range,
    interval: options.interval
  });
  const cleanBars = bars.filter((bar) => Number.isFinite(Number(bar.close)) && Number(bar.close) > 0);
  if (cleanBars.length < 60) {
    throw new Error(`${symbol} needs at least 60 usable bars; got ${cleanBars.length}`);
  }

  const closes = cleanBars.map((bar) => Number(bar.close));
  const highs = cleanBars.map((bar) => Number(bar.high ?? bar.close));
  const lows = cleanBars.map((bar) => Number(bar.low ?? bar.close));
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const trend = classifyTrend(closes, ema20, ema50);
  const volatility = classifyVolatility(closes);
  const returns = {
    "1h": pctChange(closes, 1),
    "4h": pctChange(closes, 4),
    "24h": pctChange(closes, 24)
  };
  const range = classifyRangeExpansion(highs, lows, closes);
  const confidence = scoreSymbolConfidence(trend, volatility, returns);

  return {
    as_of: new Date().toISOString(),
    scope: "symbol",
    symbol,
    range: options.range,
    interval: options.interval,
    input_bars: cleanBars.length,
    last_timestamp: cleanBars.at(-1)?.timestamp ?? null,
    last_close: closes.at(-1),
    tags: {
      trend: trend.tag,
      volatility: volatility.tag,
      range: range.tag,
      liquidity: classifyLiquidity(new Date())
    },
    confidence,
    evidence: {
      returns,
      ema: {
        ema20: ema20.at(-1),
        ema50: ema50.at(-1),
        ema20_slope_12h_pct: pctChange(ema20.filter(Number.isFinite), 12),
        close_vs_ema20_pct: ((closes.at(-1) / ema20.at(-1)) - 1) * 100,
        close_vs_ema50_pct: ((closes.at(-1) / ema50.at(-1)) - 1) * 100
      },
      volatility,
      range
    }
  };
}

async function computeBreadth(symbols, options) {
  const rows = [];
  for (const symbol of symbols) {
    const bars = await getBars(client, symbol, {
      range: options.range,
      interval: options.interval
    }).catch((error) => ({ error }));

    if (!Array.isArray(bars)) {
      rows.push({ symbol, ok: false, error: bars.error?.message ?? "fetch failed" });
      continue;
    }

    const closes = bars
      .map((bar) => Number(bar.close))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (closes.length < 25) {
      rows.push({ symbol, ok: false, error: `insufficient bars: ${closes.length}` });
      continue;
    }

    const ret24h = pctChange(closes, 24);
    const ret4h = pctChange(closes, 4);
    rows.push({
      symbol,
      ok: true,
      return_4h_pct: ret4h,
      return_24h_pct: ret24h,
      positive_4h: ret4h > 0,
      positive_24h: ret24h > 0
    });
  }

  const valid = rows.filter((row) => row.ok);
  const positive24h = valid.filter((row) => row.positive_24h).length;
  const positive4h = valid.filter((row) => row.positive_4h).length;

  return {
    universe: symbols.length,
    valid: valid.length,
    positive_4h: positive4h,
    positive_24h: positive24h,
    breadth_4h: valid.length ? positive4h / valid.length : null,
    breadth_24h: valid.length ? positive24h / valid.length : null,
    rows
  };
}

function classifyCryptoRisk(bySymbol, breadth) {
  const btc = bySymbol["BTC-USD"];
  const eth = bySymbol["ETH-USD"];
  const sol = bySymbol["SOL-USD"];
  const returns24h = {
    btc: btc?.evidence.returns["24h"] ?? 0,
    eth: eth?.evidence.returns["24h"] ?? 0,
    sol: sol?.evidence.returns["24h"] ?? 0
  };
  const avg = average(Object.values(returns24h));
  const positives = Object.values(returns24h).filter((value) => value > 0).length;
  const breadth24h = breadth.breadth_24h ?? positives / 3;
  let riskAppetite = "neutral";
  if (positives >= 2 && avg > 0.75 && breadth24h >= 0.5) {
    riskAppetite = "risk_on";
  } else if (positives <= 1 && avg < -0.75 && breadth24h <= 0.5) {
    riskAppetite = "risk_off";
  }

  const ranked = Object.entries(returns24h).sort((a, b) => b[1] - a[1]);
  const spread = ranked[0][1] - ranked.at(-1)[1];
  const leadership = spread >= 0.5 ? `${ranked[0][0]}_led` : "mixed";
  const agreement = [btc, eth, sol].filter((item) => item?.tags.trend === "uptrend").length;

  return {
    riskAppetite,
    leadership,
    confidence: round2(0.45 + Math.min(0.25, Math.abs(avg) / 10) + (spread >= 0.5 ? 0.15 : 0) + (agreement >= 2 ? 0.15 : 0)),
    relativeStrength: {
      eth_vs_btc_24h_pct: returns24h.eth - returns24h.btc,
      sol_vs_btc_24h_pct: returns24h.sol - returns24h.btc,
      sol_vs_eth_24h_pct: returns24h.sol - returns24h.eth
    }
  };
}

function classifyTrend(closes, ema20, ema50) {
  const close = closes.at(-1);
  const currentEma20 = ema20.at(-1);
  const currentEma50 = ema50.at(-1);
  const ema20Series = ema20.filter(Number.isFinite);
  const slope = pctChange(ema20Series, 12);

  if (close > currentEma20 && currentEma20 > currentEma50 && slope > 0.05) {
    return { tag: "uptrend", slope_12h_pct: slope };
  }
  if (close < currentEma20 && currentEma20 < currentEma50 && slope < -0.05) {
    return { tag: "downtrend", slope_12h_pct: slope };
  }
  if (Math.abs((close / currentEma50 - 1) * 100) < 0.75 && Math.abs(slope) < 0.08) {
    return { tag: "range", slope_12h_pct: slope };
  }
  return { tag: "transition", slope_12h_pct: slope };
}

function classifyVolatility(closes) {
  const logReturns = [];
  for (let index = 1; index < closes.length; index += 1) {
    logReturns.push(Math.log(closes[index] / closes[index - 1]));
  }

  const rolling = rollingStd(logReturns, 24).map((value) => value * Math.sqrt(24) * 100);
  const current = rolling.at(-1);
  const percentile = percentileRank(rolling, current);
  const move24h = Math.abs(pctChange(closes, 24));
  let tag = "normal_vol";
  if (percentile >= 0.95 && move24h >= 3) {
    tag = "liquidation_vol";
  } else if (percentile >= 0.8) {
    tag = "high_vol_expansion";
  } else if (percentile <= 0.25) {
    tag = "low_vol_compression";
  }

  return {
    tag,
    realized_vol_24h_pct: current,
    percentile_1mo: percentile,
    abs_return_24h_pct: move24h
  };
}

function classifyRangeExpansion(highs, lows, closes) {
  const ranges = highs.map((high, index) => {
    const close = closes[index] || 1;
    return ((high - lows[index]) / close) * 100;
  }).filter(Number.isFinite);
  const current = average(ranges.slice(-4));
  const baseline = median(ranges.slice(-72));
  const ratio = baseline ? current / baseline : 1;
  let tag = "normal_range";
  if (ratio >= 1.75) {
    tag = "range_expansion";
  } else if (ratio <= 0.65) {
    tag = "range_compression";
  }
  return {
    tag,
    current_4h_avg_range_pct: current,
    baseline_72h_median_range_pct: baseline,
    expansion_ratio: ratio
  };
}

function classifyLiquidity(date) {
  const utcDay = date.getUTCDay();
  if (utcDay === 0 || utcDay === 6) {
    return "weekend_thin";
  }
  const utcHour = date.getUTCHours();
  if (utcHour < 7 || utcHour > 22) {
    return "off_hours";
  }
  return "normal_liquidity";
}

function scoreSymbolConfidence(trend, volatility, returns) {
  let score = 0.5;
  if (trend.tag === "uptrend" || trend.tag === "downtrend") score += 0.15;
  if (trend.tag === "range") score += 0.05;
  if (volatility.tag === "normal_vol") score += 0.1;
  if (volatility.tag === "liquidation_vol") score -= 0.2;
  if (Math.sign(returns["4h"]) === Math.sign(returns["24h"]) && returns["4h"] !== 0) score += 0.1;
  return round2(Math.max(0.1, Math.min(0.95, score)));
}

function loadYahooCryptoSymbols() {
  const universePath = path.join(repoRoot, "watchlists", "universe.json");
  const universe = JSON.parse(readFileSync(universePath, "utf8"));
  return universe.crypto
    .map((entry) => entry.yahoo_symbol)
    .filter((symbol) => typeof symbol === "string" && symbol.endsWith("-USD"));
}

function parseOptions(args, defaults) {
  const options = { ...defaults };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--range") {
      options.range = requireArg(args[index + 1], "range");
      index += 1;
      continue;
    }
    if (arg === "--interval") {
      options.interval = requireArg(args[index + 1], "interval");
      index += 1;
      continue;
    }
    if (arg === "--include-memes") {
      options.includeMemes = true;
      continue;
    }
    if (arg === "--save") {
      options.save = true;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }
  return options;
}

function saveRegime(payload, stem) {
  const outputDir = path.join(repoRoot, "tmp", "regime");
  mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${stem}.json`);
  writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function ema(values, length) {
  const alpha = 2 / (length + 1);
  const result = [];
  let previous = null;
  for (const value of values) {
    previous = previous === null ? value : value * alpha + previous * (1 - alpha);
    result.push(previous);
  }
  return result;
}

function rollingStd(values, window) {
  const result = [];
  for (let index = window; index <= values.length; index += 1) {
    result.push(std(values.slice(index - window, index)));
  }
  return result;
}

function pctChange(values, periods) {
  if (values.length <= periods) return 0;
  const current = values.at(-1);
  const previous = values.at(-1 - periods);
  return previous ? ((current / previous) - 1) * 100 : 0;
}

function percentileRank(values, current) {
  const clean = values.filter(Number.isFinite);
  if (!clean.length || !Number.isFinite(current)) return 0.5;
  return clean.filter((value) => value <= current).length / clean.length;
}

function average(values) {
  const clean = values.filter(Number.isFinite);
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : 0;
}

function median(values) {
  const clean = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!clean.length) return 0;
  const mid = Math.floor(clean.length / 2);
  return clean.length % 2 ? clean[mid] : (clean[mid - 1] + clean[mid]) / 2;
}

function std(values) {
  const avg = average(values);
  const variance = average(values.map((value) => (value - avg) ** 2));
  return Math.sqrt(variance);
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function sanitizeSymbol(symbol) {
  return symbol.replaceAll(/[^A-Za-z0-9_-]+/g, "_");
}

function requireArg(value, name) {
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp() {
  console.log(`Trade Ops Regime Tool

Usage:
  node tools/regime.mjs crypto [--range 1mo] [--interval 1h] [--include-memes] [--save]
  node tools/regime.mjs symbol <symbol> [--range 1mo] [--interval 1h] [--save]

Commands:
  crypto  Classify crypto regime from BTC, ETH, SOL, relative strength, and breadth
  symbol  Classify trend/volatility/range regime for one Yahoo-covered symbol

Examples:
  npm run regime -- crypto
  npm run regime -- crypto --include-memes --save
  npm run regime -- symbol BTC-USD
  npm run regime -- symbol ETH-USD --range 5d --interval 1h
`);
}
