#!/usr/bin/env node

import { BlsClient, DEFAULT_SERIES, getMacroSnapshot, getSeries } from "../adapters/bls/index.mjs";

const client = new BlsClient();
const [, , command, ...rest] = process.argv;

try {
  switch (command) {
    case "series":
      print(await getSeries(client, req(rest[0], "seriesIds").split(","), parseOptions(rest.slice(1))));
      break;
    case "macro":
      print(await getMacroSnapshot(client, parseOptions(rest)));
      break;
    case "known-series":
      print(DEFAULT_SERIES);
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

function parseOptions(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--start-year") options.startYear = Number(req(args[++index], "start-year"));
    else if (arg === "--end-year") options.endYear = Number(req(args[++index], "end-year"));
    else throw new Error(`Unknown option: ${arg}`);
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
  console.log(`Trade Ops — BLS

Usage: npm run bls -- <command> [args]

Commands:
  known-series
  series <id1,id2> [--start-year YYYY] [--end-year YYYY]
  macro [--start-year YYYY] [--end-year YYYY]
`);
}
