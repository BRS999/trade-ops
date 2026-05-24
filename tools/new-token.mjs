#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DexScreenerClient,
  getLatestBoostedTokens,
  getLatestTokenProfiles,
  getPairsByTokens,
  getTopBoostedTokens
} from "../adapters/dexscreener/index.mjs";
import {
  RugCheckClient,
  getTokenReport,
  getTokenReportSummary,
  summarizeSafety
} from "../adapters/rugcheck/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const [, , command = "help", ...rest] = process.argv;
const client = new DexScreenerClient();
const rugCheckClient = new RugCheckClient();

try {
  switch (command) {
    case "scan":
      print(await runScan(rest));
      break;
    case "token":
      print(await runToken(rest));
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

async function runScan(args) {
  const options = parseOptions(args, {
    source: "latest-boosted",
    chain: "solana",
    limit: 10,
    save: false
  });
  const candidates = await discoverCandidates(options);
  const evaluations = [];

  for (const candidate of candidates) {
    const evaluation = await evaluateToken(candidate.chainId, candidate.tokenAddress, {
      source: options.source,
      profile: candidate
    }).catch((error) => ({
      token_address: candidate.tokenAddress,
      chain: candidate.chainId,
      label: "untradeable",
      reasons: ["fetch_failed"],
      warnings: [error.message],
      safety: unknownSafety()
    }));
    evaluations.push(evaluation);
  }

  const payload = {
    as_of: new Date().toISOString(),
    scope: "new-token-scan",
    source: options.source,
    chain: options.chain,
    count: evaluations.length,
    summary: summarize(evaluations),
    evaluations
  };

  if (options.save) {
    savePayload(payload, `${options.source}-${options.chain}`);
  }

  return payload;
}

async function runToken(args) {
  const chain = requireArg(args[0], "chain");
  const tokenAddress = requireArg(args[1], "tokenAddress");
  const options = parseOptions(args.slice(2), { save: false });
  const payload = await evaluateToken(chain, tokenAddress, { source: "token" });

  if (options.save) {
    savePayload(payload, `${chain}-${sanitize(tokenAddress)}`);
  }

  return payload;
}

async function discoverCandidates(options) {
  let rows;
  if (options.source === "latest-profiles") {
    rows = await getLatestTokenProfiles(client, options.limit * 3);
  } else if (options.source === "top-boosted") {
    rows = await getTopBoostedTokens(client, options.limit * 3);
  } else {
    rows = await getLatestBoostedTokens(client, options.limit * 3);
  }

  const seen = new Set();
  return rows
    .filter((row) => row.chainId === options.chain)
    .filter((row) => {
      const key = `${row.chainId}:${row.tokenAddress}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, options.limit);
}

async function evaluateToken(chain, tokenAddress, context = {}) {
  const config = loadRiskConfig();
  const pairs = await getPairsByTokens(client, tokenAddress, 30);
  const matchingPairs = pairs.filter(
    (pair) =>
      pair.chain === chain &&
      (sameAddress(pair.base_token.address, tokenAddress) || sameAddress(pair.quote_token.address, tokenAddress))
  );

  if (!matchingPairs.length) {
    return {
      as_of: new Date().toISOString(),
      scope: "new-token",
      source: context.source ?? "token",
      chain,
      token_address: tokenAddress,
      label: "untradeable",
      lifecycle: "unknown",
      reasons: ["no_pairs_found"],
      warnings: [],
      safety: unknownSafety(),
      pairs: []
    };
  }

  const primary = choosePrimaryPair(matchingPairs);
  const now = Date.now();
  const ageHours = primary.pair_created_at ? (now - primary.pair_created_at) / 3600000 : null;
  const metrics = buildMetrics(primary, matchingPairs, ageHours);
  const safety = await fetchSafety(chain, tokenAddress);
  const lifecycle = classifyLifecycle(metrics, config);
  const decision = classifyTradeability(metrics, lifecycle, config, safety);

  return {
    as_of: new Date().toISOString(),
    scope: "new-token",
    source: context.source ?? "token",
    chain,
    token_address: tokenAddress,
    symbol: primary.base_token.symbol,
    name: primary.base_token.name,
    label: decision.label,
    lifecycle,
    reasons: decision.reasons,
    warnings: decision.warnings,
    risk_policy: {
      max_position_size_usd: config.max_position_size_usd,
      max_risk_per_trade_usd: config.max_risk_per_trade_usd,
      no_averaging_down: config.no_averaging_down
    },
    safety,
    metrics,
    primary_pair: primary,
    pool_count: matchingPairs.length,
    pairs: matchingPairs
  };
}

function buildMetrics(primary, pairs, ageHours) {
  const volume1h = numberOrNull(primary.volume_usd.h1);
  const volume24h = numberOrNull(primary.volume_usd.h24);
  const liquidity = numberOrNull(primary.liquidity_usd);
  return {
    age_hours: ageHours,
    liquidity_usd: liquidity,
    fdv_usd: numberOrNull(primary.fdv),
    market_cap_usd: numberOrNull(primary.market_cap),
    volume_usd: {
      m5: numberOrNull(primary.volume_usd.m5),
      h1: volume1h,
      h6: numberOrNull(primary.volume_usd.h6),
      h24: volume24h
    },
    price_change_pct: primary.price_change_pct,
    volume_to_liquidity_1h: liquidity && volume1h != null ? volume1h / liquidity : null,
    volume_to_liquidity_24h: liquidity && volume24h != null ? volume24h / liquidity : null,
    live_pool_count: pairs.filter((pair) => (pair.volume_usd.h1 ?? 0) > 0 || (pair.liquidity_usd ?? 0) > 1000).length
  };
}

function classifyLifecycle(metrics, config) {
  const age = metrics.age_hours;
  const h1 = metrics.price_change_pct.h1;
  const h6 = metrics.price_change_pct.h6;
  const h24 = metrics.price_change_pct.h24;

  if (age == null) return "unknown";
  if (age < config.ultra_new_hours) {
    if (h1 != null && h1 <= -35) return "first_flush";
    if (h1 != null && h1 >= 50) return "initial_pump";
    return "launch_discovery";
  }
  if (age < 24) {
    if (h1 != null && h1 <= -25) return "first_flush";
    if (h6 != null && h6 >= 50 && (h1 ?? 0) > -15) return "initial_pump";
    return "base_or_decay";
  }
  if (age < config.early_lifecycle_hours) {
    if ((h24 ?? 0) > 0 && (h6 ?? 0) > 10 && (h1 ?? 0) > -10) return "second_wave";
    if ((h24 ?? 0) < -20 || (h6 ?? 0) < -20) return "base_or_decay";
    return "early_lifecycle";
  }
  return "mature_micro_meme";
}

function classifyTradeability(metrics, lifecycle, config, safety) {
  const reasons = [];
  const warnings = [];
  const liquidity = metrics.liquidity_usd;
  const fdv = metrics.fdv_usd;
  const h1Volume = metrics.volume_usd.h1;
  const h24Volume = metrics.volume_usd.h24;
  const h1Change = metrics.price_change_pct.h1;
  const h5Change = metrics.price_change_pct.m5;
  const vl1h = metrics.volume_to_liquidity_1h;

  if (safety.status === "unknown") warnings.push("safety_unknown");
  if (safety.status === "unavailable") warnings.push("safety_unavailable");
  if (safety.status === "risk_flagged") warnings.push("rugcheck_risks");
  if (safety.mint_authority === "enabled") warnings.push("mint_authority_enabled");
  if (safety.freeze_authority === "enabled") warnings.push("freeze_authority_enabled");
  if (safety.metadata_mutable === true) warnings.push("metadata_mutable");
  if (safety.score_normalised != null && safety.score_normalised >= 75) reasons.push("rugcheck_high_risk_score");
  if (safety.holder_concentration?.top_holder_pct != null && safety.holder_concentration.top_holder_pct >= 20) {
    warnings.push("top_holder_concentration_high");
  }
  if (safety.holder_concentration?.top_10_pct != null && safety.holder_concentration.top_10_pct >= 50) {
    warnings.push("top_10_concentration_high");
  }
  if (safety.lp_locked_pct != null && safety.lp_locked_pct < 25) {
    warnings.push("lp_lock_low");
  }

  if (liquidity == null) reasons.push("liquidity_unknown");
  else if (liquidity < config.min_watch_liquidity_usd) reasons.push("liquidity_too_thin");
  else if (liquidity < config.min_liquidity_usd) warnings.push("liquidity_below_trade_threshold");

  if (fdv == null) warnings.push("fdv_unknown");
  else if (fdv < config.min_fdv_usd) reasons.push("fdv_too_low");
  else if (fdv > config.max_fdv_usd) warnings.push("fdv_high_for_new_token");

  if (h1Volume == null || h1Volume < config.min_1h_volume_usd) warnings.push("low_1h_volume");
  if (h24Volume == null || h24Volume < config.min_24h_volume_usd) warnings.push("low_24h_volume");

  if (vl1h != null && vl1h > config.max_volume_to_liquidity_ratio_1h) warnings.push("volume_hot_vs_liquidity");
  if (vl1h != null && vl1h < config.min_volume_to_liquidity_ratio_1h) warnings.push("volume_thin_vs_liquidity");

  if (h1Change != null && h1Change <= -35) reasons.push("active_first_flush");
  if (h5Change != null && h5Change <= -10) warnings.push("short_term_sell_pressure");

  if (
    reasons.includes("liquidity_unknown") ||
    reasons.includes("liquidity_too_thin") ||
    reasons.includes("fdv_too_low") ||
    reasons.includes("rugcheck_high_risk_score")
  ) {
    return { label: "untradeable", reasons, warnings };
  }
  if (lifecycle === "first_flush") {
    return { label: "too_early", reasons: [...reasons, "wait_for_reclaim_after_flush"], warnings };
  }
  if (lifecycle === "launch_discovery") {
    return { label: "watch_launch", reasons: [...reasons, "ultra_new_wait_for_structure"], warnings };
  }
  if (lifecycle === "initial_pump") {
    return { label: "scalp_only", reasons: [...reasons, "initial_pump_high_reversal_risk"], warnings };
  }
  if (isPaperTradeCandidate(metrics, lifecycle, config)) {
    return {
      label: "paper_trade_candidate",
      reasons: [...reasons, paperCandidateReason(lifecycle)],
      warnings: [...warnings, "requires_chart_confirmation", "paper_only"]
    };
  }
  return { label: "watch_launch", reasons: [...reasons, "needs_more_structure"], warnings };
}

function isPaperTradeCandidate(metrics, lifecycle, config) {
  const liquidity = metrics.liquidity_usd;
  const fdv = metrics.fdv_usd;
  const h1Volume = metrics.volume_usd.h1;
  const h24Volume = metrics.volume_usd.h24;
  const m5Change = metrics.price_change_pct.m5;
  const h1Change = metrics.price_change_pct.h1;
  const h6Change = metrics.price_change_pct.h6;
  const h24Change = metrics.price_change_pct.h24;
  const vl1h = metrics.volume_to_liquidity_1h;

  if (liquidity == null || liquidity < config.min_liquidity_usd) return false;
  if (fdv == null || fdv < config.min_fdv_usd || fdv > config.max_fdv_usd) return false;
  if (h1Volume == null || h1Volume < config.min_1h_volume_usd) return false;
  if (h24Volume == null || h24Volume < config.min_24h_volume_usd) return false;
  if (m5Change != null && m5Change <= -10) return false;
  if (h1Change != null && h1Change <= -20) return false;
  if (vl1h != null && vl1h > config.max_volume_to_liquidity_ratio_1h) return false;

  if (lifecycle === "second_wave") {
    return (h6Change ?? 0) > 10 && (h24Change ?? 0) > 0;
  }

  if (lifecycle === "base_or_decay" || lifecycle === "early_lifecycle") {
    return (h1Change ?? 0) > 0 && (h6Change ?? 0) > -10 && (h24Change ?? 0) > 0;
  }

  if (lifecycle === "mature_micro_meme") {
    return (h1Change ?? 0) > 0 && (h6Change ?? 0) > 0 && (h24Change ?? 0) > 0;
  }

  return false;
}

function paperCandidateReason(lifecycle) {
  if (lifecycle === "second_wave") return "second_wave_market_data_pass";
  if (lifecycle === "mature_micro_meme") return "mature_meme_market_data_pass";
  return "early_lifecycle_market_data_pass";
}

function choosePrimaryPair(pairs) {
  return [...pairs].sort((a, b) => pairScore(b) - pairScore(a))[0];
}

function pairScore(pair) {
  return (pair.liquidity_usd ?? 0) * 2 + (pair.volume_usd.h1 ?? 0) + (pair.volume_usd.h24 ?? 0) * 0.1;
}

function summarize(evaluations) {
  return evaluations.reduce((summary, item) => {
    summary[item.label] = (summary[item.label] ?? 0) + 1;
    return summary;
  }, {});
}

function unknownSafety() {
  return {
    status: "unknown",
    mint_authority: "unknown",
    freeze_authority: "unknown",
    holder_concentration: "unknown",
    lp_lock_or_burn: "unknown",
    routing_slippage: "unknown",
    note: "DexScreener does not provide enough data for a full safety gate."
  };
}

async function fetchSafety(chain, tokenAddress) {
  if (chain !== "solana") {
    return {
      ...unknownSafety(),
      note: "RugCheck is currently used only for Solana token safety checks."
    };
  }

  try {
    const [report, summary] = await Promise.all([
      getTokenReport(rugCheckClient, tokenAddress),
      getTokenReportSummary(rugCheckClient, tokenAddress).catch(() => null)
    ]);
    return summarizeSafety(report, summary);
  } catch (error) {
    return {
      status: "unavailable",
      mint_authority: "unknown",
      freeze_authority: "unknown",
      holder_concentration: "unknown",
      lp_lock_or_burn: "unknown",
      routing_slippage: "unknown",
      error: error instanceof Error ? error.message : String(error),
      note: "RugCheck safety data could not be fetched."
    };
  }
}

function loadRiskConfig() {
  const configPath = path.join(repoRoot, "config", "new-token-risk.json");
  return JSON.parse(readFileSync(configPath, "utf8"));
}

function parseOptions(args, defaults) {
  const options = { ...defaults };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--source") {
      options.source = requireArg(args[index + 1], "source");
      index += 1;
      continue;
    }
    if (arg === "--chain") {
      options.chain = requireArg(args[index + 1], "chain");
      index += 1;
      continue;
    }
    if (arg === "--limit") {
      options.limit = parsePositiveInt(requireArg(args[index + 1], "limit"), "limit");
      index += 1;
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

function savePayload(payload, stem) {
  const outputDir = path.join(repoRoot, "tmp", "new-tokens");
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, `${sanitize(stem)}.json`), `${JSON.stringify(payload, null, 2)}\n`);
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function sameAddress(left, right) {
  return String(left ?? "").toLowerCase() === String(right ?? "").toLowerCase();
}

function parsePositiveInt(value, name) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) throw new Error(`${name} must be a positive integer`);
  return parsed;
}

function sanitize(value) {
  return String(value).replaceAll(/[^A-Za-z0-9_-]+/g, "_");
}

function requireArg(value, name) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp() {
  console.log(`Trade Ops New Token Tool

Usage:
  node tools/new-token.mjs scan [--source latest-boosted] [--chain solana] [--limit 10] [--save]
  node tools/new-token.mjs token <chain> <tokenAddress> [--save]

Sources:
  latest-boosted
  top-boosted
  latest-profiles

Labels:
  untradeable
  too_early
  watch_launch
  scalp_only
  candidate_after_retest
  paper_trade_candidate

Examples:
  npm run new-token -- scan --source latest-boosted --chain solana --limit 10
  npm run new-token -- token solana 33eum82LaAhtv5YkUq1BdwEviSErH5CnFxqVNLT5pump
`);
}
