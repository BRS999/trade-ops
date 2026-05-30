#!/usr/bin/env node

import {
  GdeltClient,
  KNOWN_THEMES,
  buildQuery,
  getGeopoliticalSnapshot,
  getLanguageTimeline,
  getSourceCountryTimeline,
  getToneChart,
  getToneTimeline,
  getVolumeTimeline,
  searchArticles,
} from "../adapters/gdelt/index.mjs";

const client = new GdeltClient();
const [, , command, ...rest] = process.argv;

try {
  switch (command) {
    case "search":
      print(await searchArticles(client, req(rest[0], "query"), parseOptions(rest.slice(1))));
      break;
    case "articles":
      print(await runArticles(rest));
      break;
    case "volume":
      print(await getVolumeTimeline(client, req(rest[0], "query"), parseOptions(rest.slice(1))));
      break;
    case "tone":
      print(await getToneTimeline(client, req(rest[0], "query"), parseOptions(rest.slice(1))));
      break;
    case "tone-chart":
      print(await getToneChart(client, req(rest[0], "query"), parseOptions(rest.slice(1))));
      break;
    case "languages":
      print(await getLanguageTimeline(client, req(rest[0], "query"), parseOptions(rest.slice(1))));
      break;
    case "countries":
      print(await getSourceCountryTimeline(client, req(rest[0], "query"), parseOptions(rest.slice(1))));
      break;
    case "snapshot":
      print(await runSnapshot(rest));
      break;
    case "themes":
      print(KNOWN_THEMES);
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

async function runArticles(args) {
  const query = buildQueryFromArgs(args);
  return searchArticles(client, query, parseOptions(args.filter((a) => a.startsWith("--"))));
}

async function runSnapshot(args) {
  const query = buildQueryFromArgs(args);
  return getGeopoliticalSnapshot(client, query, parseOptions(args.filter((a) => a.startsWith("--"))));
}

function buildQueryFromArgs(args) {
  const positional = [];
  const options = parseOptions(args.filter((a) => a.startsWith("--")));
  for (const arg of args) {
    if (!arg.startsWith("--")) positional.push(arg);
  }

  if (positional[0] && !options.keyword && !options.theme && !options.sourceCountry) {
    return positional[0];
  }

  return buildQuery({
    keyword: options.keyword ?? positional[0],
    theme: options.theme,
    sourceCountry: options.sourceCountry,
    sourceLang: options.sourceLang,
    domain: options.domain,
    tone: options.tone,
    near: options.near,
  });
}

function parseOptions(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const next = args[i + 1];
    if (!next || next.startsWith("--")) {
      options[key] = true;
    } else {
      options[key] = isNaN(Number(next)) ? next : Number(next);
      i++;
    }
  }
  return options;
}

function req(value, name) {
  if (!value) throw new Error(`<${name}> is required`);
  return value;
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp() {
  console.log(`Trade Ops GDELT Tool

GDELT DOC 2.0 — free geopolitical news API. No API key. Rate limit: ~1 req / 5s.

Usage — raw query:
  node tools/gdelt.mjs search "trade war"
  node tools/gdelt.mjs search "theme:ECON_TARIFF" --timespan 3d --max-records 25
  node tools/gdelt.mjs volume "sanctions" --timespan 14d
  node tools/gdelt.mjs tone "inflation" --timespan 7d
  node tools/gdelt.mjs tone-chart "recession"
  node tools/gdelt.mjs languages "ukraine"
  node tools/gdelt.mjs countries "tariff"

Usage — structured articles/snapshot:
  node tools/gdelt.mjs articles --keyword "supply chain" --theme tariff --timespan 7d
  node tools/gdelt.mjs articles --theme sanctions --source-country china --max-records 20
  node tools/gdelt.mjs snapshot "middle east conflict" --timespan 3d
  node tools/gdelt.mjs snapshot --keyword tariff --theme trade_war --timespan 7d

Options:
  --timespan 7d|3d|24h|12h|3m       Lookback window (default 7d)
  --max-records N                   ArtList limit, 1-250 (default 50)
  --start-datetime ISO|YYYYMMDDHHMMSS
  --end-datetime ISO|YYYYMMDDHHMMSS
  --sort DateDesc|DateAsc|ToneDesc|ToneAsc
  --keyword TEXT
  --theme KEY|GKG_THEME             Use KNOWN_THEMES key or raw theme slug
  --source-country COUNTRY
  --source-lang LANG
  --domain DOMAIN
  --tone <-5|>5                     Tone filter appended to query
  --raw                             Use raw article counts for volume mode
  --articles-only                   Snapshot: skip volume/tone (1 call, ~15s vs ~50s)

  node tools/gdelt.mjs themes       List KNOWN_THEMES shortcuts

Examples:
  npm run gdelt -- snapshot "tariff" --timespan 7d
  npm run gdelt -- articles --theme oil --source-country russia --max-records 15
  npm run gdelt -- volume "(tariff OR sanctions)" --timespan 14d
`);
}
