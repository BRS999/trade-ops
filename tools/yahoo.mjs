#!/usr/bin/env node

/**
 * @deprecated Yahoo Finance rate-limits aggressively (429s during market hours).
 * For equity/crypto quotes use: node tools/alpaca.mjs snapshot <symbol>
 * This tool is kept for symbols Alpaca doesn't cover: indices (^GSPC), forex (EURUSD=X), futures (GC=F).
 */

import { YahooClient, getBars, getQuote, getCryptoQuote, getQuotes, getExpiries, getChain, getAtmSnapshot } from "../adapters/yahoo/index.mjs";

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
    case "expiries":
      print(await getExpiries(client, requireArg(rest[0], "symbol")));
      break;
    case "chain": {
      const sym = requireArg(rest[0], "symbol");
      const opts = {};
      for (let i = 1; i < rest.length; i++) {
        if (rest[i] === "--expiry")   { opts.expiry  = rest[++i]; continue; }
        if (rest[i] === "--type")     { opts.type    = rest[++i]; continue; }
        if (rest[i] === "--strikes")  { opts.strikes = Number(rest[++i]); continue; }
      }
      print(await getChain(client, sym, opts));
      break;
    }
    case "atm":
      print(await getAtmSnapshot(client, requireArg(rest[0], "symbol")));
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
    if (arg === "--range")    { options.range    = args[++index]; continue; }
    if (arg === "--interval") { options.interval = args[++index]; continue; }
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
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp() {
  console.log(`Trade Ops Yahoo Tool

⚠  DEPRECATED for equity/crypto — use: node tools/alpaca.mjs snapshot <symbol>
   Yahoo rate-limits aggressively. Keep using this only for indices, forex, futures.

Usage:
  node tools/yahoo.mjs quote <symbol>        e.g. ^GSPC, EURUSD=X, GC=F
  node tools/yahoo.mjs quotes <sym1,sym2>
  node tools/yahoo.mjs bars <symbol> [--range 3mo] [--interval 1d]
  node tools/yahoo.mjs expiries <symbol>
  node tools/yahoo.mjs atm <symbol>
  node tools/yahoo.mjs chain <symbol> [--expiry 2026-06-20] [--type calls] [--strikes 5]
`);
}
