#!/usr/bin/env node

import { FinraClient, getShortVolume, getShortVolumeMulti, getTopShortVolume } from "../adapters/finra/index.mjs";

const client = new FinraClient();
const [, , command, ...rest] = process.argv;

try {
  switch (command) {
    case "symbol":
      print(await getShortVolume(client, requireArg(rest[0], "symbol"), rest[1]));
      break;
    case "multi":
      print(await getShortVolumeMulti(client, requireArgs(rest, "symbols"), undefined));
      break;
    case "top":
      print(await getTopShortVolume(client, Number(rest[0] ?? 25), { minVolume: Number(rest[1] ?? 100000) }));
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

function requireArg(value, name) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function requireArgs(values, name) {
  if (!values.length) throw new Error(`at least one ${name} is required`);
  return values;
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp() {
  console.log(`Trade Ops FINRA Short Volume Tool

Usage:
  node tools/finra.mjs <command> [args]

Commands:
  symbol <SYMBOL> [YYYY-MM-DD]        Short volume for a single symbol
  multi  <SYM1> <SYM2> ...            Short volume for multiple symbols, sorted by short %
  top    [n=25] [minVol=100000]       Top N most-shorted names across all NMS securities

Data:
  Source: FINRA Consolidated NMS daily short sale volume file
  Cadence: Published daily ~6pm ET, covers each trading day
  No API key required

Reading the output:
  short_pct     fraction of today's volume that was short sales
                >50% = more than half of trades are shorts — elevated pressure
                Spike up after weakness → possible capitulation / exhaustion
                Persistently high alongside falling price → active distribution

  ⚠  This is short VOLUME (daily flow), not short INTEREST (open positions / float %).
     It does not measure squeeze potential directly.

Examples:
  node tools/finra.mjs symbol MARA
  node tools/finra.mjs symbol NVDA 2026-05-28
  node tools/finra.mjs multi MARA SOFI KTOS APP
  node tools/finra.mjs top 10
`);
}
