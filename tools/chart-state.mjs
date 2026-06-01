#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { buildChartState } from "../lib/chart-state.mjs";

const [, , ...argv] = process.argv;

try {
  const options = parseArgs(argv);

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  const input = readInput(options.input);
  const candles = JSON.parse(input);
  const state = buildChartState(candles, {
    symbol: options.symbol,
    timeframe: options.timeframe,
  });

  print(state);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

function parseArgs(args) {
  const options = {
    input: "-",
    symbol: undefined,
    timeframe: undefined,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "help" || arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--input" || arg === "-i") {
      options.input = requireArg(args[index + 1], "input");
      index += 1;
      continue;
    }
    if (arg === "--symbol") {
      options.symbol = requireArg(args[index + 1], "symbol");
      index += 1;
      continue;
    }
    if (arg === "--timeframe") {
      options.timeframe = requireArg(args[index + 1], "timeframe");
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function readInput(inputPath) {
  if (!inputPath || inputPath === "-") {
    return readFileSync(0, "utf8");
  }
  return readFileSync(inputPath, "utf8");
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
  console.log(`Trade Ops Chart State Tool

Source-agnostic candle facts for LLM analysis.

Usage:
  npm run chart-state -- --input candles.json [--symbol GEV] [--timeframe 1Day]
  npm run chart-state -- --input - [--symbol BTC-USD] [--timeframe 1d]

Input:
  JSON array of candles with open/high/low/close and optional volume.
  Accepted field aliases:
    timestamp | time | date | t
    open | o
    high | h
    low | l
    close | c
    volume | v

Output:
  Non-prescriptive chart-state JSON: indicators, distances, returns, flags, and facts.
`);
}
