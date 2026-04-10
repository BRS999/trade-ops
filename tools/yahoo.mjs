#!/usr/bin/env node

import { YahooClient, getBars, getQuote, getCryptoQuote, getQuotes } from "../adapters/yahoo/index.mjs";

const client = new YahooClient();
const [, , command, ...rest] = process.argv;

try {
  switch (command) {
    case "quote": {
      const sym = requireArg(rest[0], "symbol");
      const isCrypto = sym.toUpperCase().endsWith("-USD");
      print(await (isCrypto ? getCryptoQuote : getQuote)(client, sym));
      break;
    }
    case "quotes":
      print(await getQuotes(client, parseSymbols(rest[0])));
      break;
    case "bars":
      print(await runBars(rest));
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

async function runBars(args) {
  const symbol = requireArg(args[0], "symbol");
  const options = {};

  for (let index = 1; index < args.length; index += 1) {
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
    throw new Error(`Unknown bars option: ${arg}`);
  }

  return getBars(client, symbol, options);
}

function parseSymbols(value) {
  return requireArg(value, "symbols")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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
  console.log(`Trade Ops Yahoo Tool

Usage:
  node tools/yahoo.mjs quote <symbol>
  node tools/yahoo.mjs quotes <symbol1,symbol2,...>
  node tools/yahoo.mjs bars <symbol> [--range 3mo] [--interval 1d]

Examples:
  node tools/yahoo.mjs quote NVDA
  node tools/yahoo.mjs quote BTC-USD
  node tools/yahoo.mjs quotes NVDA,TSLA,META
  node tools/yahoo.mjs bars NVDA --range 6mo --interval 1d
  node tools/yahoo.mjs bars BTC-USD --range 5d --interval 1h
`);
}
