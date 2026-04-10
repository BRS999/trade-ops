#!/usr/bin/env node

import { CftcClient, getCOT, getCOTSnapshot, INSTRUMENT_KEYS } from "../adapters/cftc/index.mjs";

const client = new CftcClient();
const [, , command, ...rest] = process.argv;

try {
  switch (command) {
    case "cot":
      print(await getCOT(client, requireArg(rest[0], "instrument")));
      break;
    case "snapshot":
      print(await getCOTSnapshot(client, rest.length ? rest : undefined));
      break;
    case "instruments":
      console.log(INSTRUMENT_KEYS.join("\n"));
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

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp() {
  console.log(`Trade Ops CFTC COT Tool

Usage:
  node tools/cftc.mjs cot <instrument>
  node tools/cftc.mjs snapshot [instrument1 instrument2 ...]
  node tools/cftc.mjs instruments

Instruments: ${INSTRUMENT_KEYS.join(", ")}

Examples:
  node tools/cftc.mjs cot gold
  node tools/cftc.mjs cot spx
  node tools/cftc.mjs snapshot
  node tools/cftc.mjs snapshot gold silver crude spx ndx

Reading the output:
  spec_net       = Large speculator net position (longs - shorts)
  spec_net_chg   = Change from prior week
  spec_net_pct   = spec_net as % of open interest — extreme gauge
  comm_net       = Commercial (hedger) net position

  When spec_net_pct is very high (+ve) and price turns → crowded long unwind risk
  When spec_net_pct is very low (-ve) and price turns → short squeeze risk
`);
}
