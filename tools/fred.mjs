#!/usr/bin/env node

import { FredClient, getMacroSnapshot, getLatest, getObservations, getSeries, getEconomicCalendar } from "../adapters/fred/index.mjs";

const client = new FredClient();
const [, , command, ...rest] = process.argv;

try {
  switch (command) {
    case "macro":
      print(await getMacroSnapshot(client));
      break;
    case "latest":
      print(await getLatest(client, requireArg(rest[0], "series_id")));
      break;
    case "observations":
      print(await runObservations(rest));
      break;
    case "series":
      print(await getSeries(client, requireArg(rest[0], "series_id")));
      break;
    case "calendar":
      print(await runCalendar(rest));
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

async function runObservations(args) {
  const seriesId = requireArg(args[0], "series_id");
  const options = {};

  for (let i = 1; i < args.length; i += 1) {
    if (args[i] === "--limit") { options.limit = Number(requireArg(args[++i], "limit")); continue; }
    if (args[i] === "--sort")  { options.sort_order = requireArg(args[++i], "sort"); continue; }
    if (args[i] === "--from")  { options.observation_start = requireArg(args[++i], "from"); continue; }
    if (args[i] === "--to")    { options.observation_end = requireArg(args[++i], "to"); continue; }
    throw new Error(`Unknown option: ${args[i]}`);
  }

  return getObservations(client, seriesId, options);
}

async function runCalendar(args) {
  const options = {};
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--from") { options.from = requireArg(args[++i], "from"); continue; }
    if (args[i] === "--to")   { options.to = requireArg(args[++i], "to"); continue; }
    if (args[i] === "--high") { options.highOnly = true; continue; }
    throw new Error(`Unknown option: ${args[i]}`);
  }
  return getEconomicCalendar(client, options);
}

function requireArg(value, name) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp() {
  console.log(`Trade Ops FRED Tool

Usage:
  node tools/fred.mjs macro
  node tools/fred.mjs latest <series_id>
  node tools/fred.mjs observations <series_id> [--limit 10] [--sort asc|desc] [--from YYYY-MM-DD] [--to YYYY-MM-DD]
  node tools/fred.mjs series <series_id>

Common series:
  DGS2      2-Year Treasury Yield
  DGS10     10-Year Treasury Yield
  T10Y2Y    10Y-2Y Yield Spread
  FEDFUNDS  Fed Funds Rate
  CPIAUCSL  CPI
  UNRATE    Unemployment Rate
  VIXCLS    VIX

  node tools/fred.mjs calendar [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--high]
`);

}
