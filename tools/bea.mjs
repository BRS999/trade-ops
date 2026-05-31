#!/usr/bin/env node

import {
  BeaClient,
  getGdpByIndustry,
  getGdpComponents,
  getInputOutput,
  getInternationalTransactions,
  getMacroSnapshot,
  getPce,
  getRegional,
  getStatePersonalIncome,
  getStatGdp,
  listDatasets,
  listParameters,
} from "../adapters/bea/index.mjs";

const client = new BeaClient();
const [, , command, ...rest] = process.argv;

try {
  switch (command) {
    case "datasets":
      print(await listDatasets(client));
      break;
    case "params":
      print(await listParameters(client, req(rest[0], "datasetname")));
      break;
    case "snapshot":
      print(await getMacroSnapshot(client));
      break;
    case "gdp":
      print(await getGdpComponents(client, parseOptions(rest)));
      break;
    case "pce":
      print(await getPce(client, parseOptions(rest)));
      break;
    case "gdp-by-industry":
      print(await getGdpByIndustry(client, parseOptions(rest)));
      break;
    case "state-gdp":
      print(await getStatGdp(client, parseOptions(rest)));
      break;
    case "state-income":
      print(await getStatePersonalIncome(client, parseOptions(rest)));
      break;
    case "regional":
      print(await getRegional(client, req(rest[0], "tableName"), parseOptions(rest.slice(1))));
      break;
    case "international":
      print(await getInternationalTransactions(client, parseOptions(rest)));
      break;
    case "input-output":
      print(await getInputOutput(client, parseOptions(rest)));
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
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const next = args[i + 1];
    if (!next || next.startsWith("--")) {
      opts[key] = true;
    } else {
      opts[key] = isNaN(Number(next)) ? next : Number(next);
      i++;
    }
  }
  return opts;
}

function req(value, name) {
  if (!value) throw new Error(`<${name}> is required`);
  return value;
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp() {
  console.log(`Trade Ops BEA Tool
Bureau of Economic Analysis — national, industry, and regional economic data.

Requires BEA_API_KEY or BEA_KEY in .env.
Get a free key at: https://apps.bea.gov/API/signup/
⚠ Key requires email activation before first use.

Usage:
  node tools/bea.mjs datasets                         List all available datasets
  node tools/bea.mjs params <datasetname>             List parameters for a dataset
  node tools/bea.mjs snapshot                         GDP + GDP-by-industry macro snapshot

  node tools/bea.mjs gdp [--frequency Q] [--year 2024,2023]
  node tools/bea.mjs pce [--frequency M]             Personal consumption by type
  node tools/bea.mjs gdp-by-industry [--frequency A] [--year 2024,2023,2022]
  node tools/bea.mjs state-gdp [--year 2024,2023]
  node tools/bea.mjs state-income [--year 2024,2023]
  node tools/bea.mjs regional <tableName> [--geo-fips STATE] [--line-code 1] [--year 2024]
  node tools/bea.mjs international [--indicator BalCurrentAcct] [--frequency Q]
  node tools/bea.mjs input-output [--table-id 259] [--year 2023]

Key NIPA table names:
  T10101  GDP and components (PCE, Investment, Govt, Net Exports)
  T20305  Personal consumption by type
  T50100  Gross private domestic investment

Key Regional table names:
  CAGDP1   GDP summary by state
  CAGDP2   GDP by state and industry
  CAINC1   Personal income by state
  CAINC5   Personal income by major source
  SAEMP25N Employment by industry (state)

Examples:
  node tools/bea.mjs gdp --frequency Q --year 2026,2025,2024
  node tools/bea.mjs gdp-by-industry --frequency A --year 2025,2024,2023
  node tools/bea.mjs state-gdp --year 2024,2023
  node tools/bea.mjs international --indicator GoodsTrade --frequency Q
  node tools/bea.mjs input-output --table-id 259
`);
}
