#!/usr/bin/env node

import {
  SecEdgarClient,
  getCompanyFacts,
  getCompanySubmissions,
  getFactConcept,
  getLatestFiling,
  getRecentFilings,
  getRecent8K,
  resolveEntity,
} from "../adapters/sec-edgar/index.mjs";

const client = new SecEdgarClient();
const [, , command, ...rest] = process.argv;

try {
  switch (command) {
    case "resolve":
      print(await resolveEntity(client, requireArg(rest[0], "tickerOrCik")));
      break;
    case "submissions":
      print(await getCompanySubmissions(client, requireArg(rest[0], "tickerOrCik")));
      break;
    case "filings":
      print(await runFilings(rest));
      break;
    case "latest-10k":
      print(await getLatestFiling(client, requireArg(rest[0], "tickerOrCik"), "10-K"));
      break;
    case "latest-10q":
      print(await getLatestFiling(client, requireArg(rest[0], "tickerOrCik"), "10-Q"));
      break;
    case "recent-8k":
      print(await runRecent8K(rest));
      break;
    case "facts":
      print(await getCompanyFacts(client, requireArg(rest[0], "tickerOrCik")));
      break;
    case "facts-concept":
      print(await runFactsConcept(rest));
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

async function runFilings(args) {
  const tickerOrCik = requireArg(args[0], "tickerOrCik");
  const options = {};

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--forms") {
      options.forms = requireArg(args[index + 1], "forms")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      index += 1;
      continue;
    }
    if (arg === "--limit") {
      const limit = Number(requireArg(args[index + 1], "limit"));
      if (!Number.isFinite(limit) || limit <= 0) {
        throw new Error("limit must be a positive number");
      }
      options.limit = limit;
      index += 1;
      continue;
    }
    throw new Error(`Unknown filings option: ${arg}`);
  }

  return getRecentFilings(client, tickerOrCik, options);
}

async function runRecent8K(args) {
  const tickerOrCik = requireArg(args[0], "tickerOrCik");
  let limit = 5;

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--limit") {
      limit = Number(requireArg(args[index + 1], "limit"));
      if (!Number.isFinite(limit) || limit <= 0) {
        throw new Error("limit must be a positive number");
      }
      index += 1;
      continue;
    }
    throw new Error(`Unknown recent-8k option: ${arg}`);
  }

  return getRecent8K(client, tickerOrCik, limit);
}

async function runFactsConcept(args) {
  const tickerOrCik = requireArg(args[0], "tickerOrCik");
  const concept = requireArg(args[1], "concept");
  let limit = 10;

  for (let index = 2; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--limit") {
      limit = Number(requireArg(args[index + 1], "limit"));
      if (!Number.isFinite(limit) || limit <= 0) {
        throw new Error("limit must be a positive number");
      }
      index += 1;
      continue;
    }
    throw new Error(`Unknown facts-concept option: ${arg}`);
  }

  return getFactConcept(client, tickerOrCik, concept, { limit });
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
  console.log(`Trade Ops SEC EDGAR Tool

Usage:
  node tools/sec-edgar.mjs resolve <tickerOrCik>
  node tools/sec-edgar.mjs submissions <tickerOrCik>
  node tools/sec-edgar.mjs filings <tickerOrCik> [--forms 10-K,10-Q,8-K] [--limit 10]
  node tools/sec-edgar.mjs latest-10k <tickerOrCik>
  node tools/sec-edgar.mjs latest-10q <tickerOrCik>
  node tools/sec-edgar.mjs recent-8k <tickerOrCik> [--limit 5]
  node tools/sec-edgar.mjs facts <tickerOrCik>
  node tools/sec-edgar.mjs facts-concept <tickerOrCik> <concept> [--limit 10]
`);
}
