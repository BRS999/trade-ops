#!/usr/bin/env node

import {
  RugCheckClient,
  getBulkTokenReports,
  getBulkTokenSummary,
  getNewTokens,
  getRecentTokens,
  getTokenLockers,
  getTokenReport,
  getTokenReportSummary,
  getTokenVotes,
  getTrendingTokens,
  getVerifiedTokens,
  ping,
  summarizeSafety,
} from "../adapters/rugcheck/index.mjs";

const client = new RugCheckClient();
const [, , command, ...rest] = process.argv;

try {
  switch (command) {
    case "ping":
      print(await ping(client));
      break;
    case "report":
      print(await getTokenReport(client, req(rest[0], "mint")));
      break;
    case "summary":
      print(await getTokenReportSummary(client, req(rest[0], "mint")));
      break;
    case "safety": {
      const mint = req(rest[0], "mint");
      const [report, summary] = await Promise.all([
        getTokenReport(client, mint),
        getTokenReportSummary(client, mint).catch(() => null),
      ]);
      print({
        mint,
        as_of: new Date().toISOString(),
        safety: summarizeSafety(report, summary),
      });
      break;
    }
    case "lockers":
      print(await getTokenLockers(client, req(rest[0], "mint")));
      break;
    case "votes":
      print(await getTokenVotes(client, req(rest[0], "mint")));
      break;
    case "bulk-reports":
      print(await getBulkTokenReports(client, req(rest[0], "mints")));
      break;
    case "bulk-summary":
      print(await getBulkTokenSummary(client, req(rest[0], "mints")));
      break;
    case "new":
      print(await getNewTokens(client));
      break;
    case "recent":
      print(await getRecentTokens(client));
      break;
    case "trending":
      print(await getTrendingTokens(client));
      break;
    case "verified":
      print(await getVerifiedTokens(client));
      break;
    case "help":
    case undefined:
      printHelp();
      break;
    default:
      throw new Error(`Unknown command: ${command}. Run with 'help' for usage.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

function req(value, name) {
  if (!value) throw new Error(`<${name}> is required`);
  return value;
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp() {
  console.log(`Trade Ops — RugCheck

Usage: npm run rugcheck -- <command> [args]

Token Reports
  summary <mint>                    Short token risk report
  report <mint>                     Full token risk report
  safety <mint>                     Normalized safety summary for trade filters
  lockers <mint>                    LP locker/vault data
  votes <mint>                      Community vote data
  bulk-summary <mint1,mint2>        Bulk summarized reports
  bulk-reports <mint1,mint2>        Bulk full reports

Discovery
  new                               Recently detected tokens
  recent                            Most viewed recent tokens
  trending                          Trending/voted tokens
  verified                          Recently verified tokens

Diagnostics
  ping                              RugCheck health check

Environment:
  RUGCHECK_BASE_URL                 Override API base URL
  RUGCHECK_API_KEY                  Optional API key
  RUGCHECK_JWT                      Optional RugCheck JWT
  RUGCHECK_TIMEOUT_MS               Request timeout

Examples:
  npm run rugcheck -- safety 3TYgKwkE2Y3rxdw9osLRSpxpXmSC1C1oo19W9KHspump
  npm run rugcheck -- summary <mint>
`);
}
