/**
 * RugCheck adapter — Solana token safety and risk reports.
 *
 * Usage:
 *   import { RugCheckClient, getTokenReportSummary } from "./adapters/rugcheck/index.mjs";
 *   const client = new RugCheckClient();
 *   const summary = await getTokenReportSummary(client, mintAddress);
 */

export { RugCheckClient, RugCheckError } from "./client.mjs";

export function ping(client) {
  return client.get("../ping");
}

export function getTokenReport(client, mint) {
  return client.get(`tokens/${encodeURIComponent(requireValue(mint, "mint"))}/report`);
}

export function getTokenReportSummary(client, mint) {
  return client.get(`tokens/${encodeURIComponent(requireValue(mint, "mint"))}/report/summary`);
}

export function getTokenLockers(client, mint) {
  return client.get(`tokens/${encodeURIComponent(requireValue(mint, "mint"))}/lockers`);
}

export function getTokenVotes(client, mint) {
  return client.get(`tokens/${encodeURIComponent(requireValue(mint, "mint"))}/votes`);
}

export function getNewTokens(client) {
  return client.get("stats/new_tokens");
}

export function getRecentTokens(client) {
  return client.get("stats/recent");
}

export function getTrendingTokens(client) {
  return client.get("stats/trending");
}

export function getVerifiedTokens(client) {
  return client.get("stats/verified");
}

export function getBulkTokenReports(client, mints) {
  return client.post("bulk/tokens/report", {
    mints: normalizeMints(mints),
  });
}

export function getBulkTokenSummary(client, mints) {
  return client.post("bulk/tokens/summary", {
    mints: normalizeMints(mints),
  });
}

export function summarizeSafety(report, summary = null) {
  const risks = Array.isArray(report?.risks) ? report.risks : Array.isArray(summary?.risks) ? summary.risks : [];
  const score = numberOrNull(summary?.score ?? report?.score);
  const scoreNormalised = numberOrNull(summary?.score_normalised ?? report?.score_normalised);
  const lpLockedPct = numberOrNull(summary?.lpLockedPct ?? report?.lpLockedPct);
  const topHolders = Array.isArray(report?.topHolders) ? report.topHolders : [];
  const topHolderPct = numberOrNull(topHolders[0]?.pct);
  const top10HolderPct = topHolders
    .slice(0, 10)
    .reduce((sum, holder) => sum + (numberOrNull(holder?.pct) ?? 0), 0);

  return {
    status: risks.length ? "risk_flagged" : "checked",
    score,
    score_normalised: scoreNormalised,
    risk_count: risks.length,
    risks: risks.map(normalizeRisk),
    mint_authority: authorityStatus(report?.token?.mintAuthority),
    freeze_authority: authorityStatus(report?.token?.freezeAuthority),
    metadata_mutable: report?.tokenMeta?.mutable ?? null,
    lp_locked_pct: lpLockedPct,
    holder_concentration: {
      top_holder_pct: topHolderPct,
      top_10_pct: Number(top10HolderPct.toFixed(4)),
    },
    token_program: report?.tokenProgram ?? summary?.tokenProgram ?? null,
    creator: report?.creator ?? null,
  };
}

function normalizeRisk(risk) {
  if (typeof risk === "string") return { name: risk };
  return {
    name: risk?.name ?? risk?.type ?? risk?.description ?? "unknown",
    level: risk?.level ?? risk?.severity ?? null,
    score: numberOrNull(risk?.score),
    description: risk?.description ?? risk?.message ?? null,
    value: risk?.value ?? null,
  };
}

function authorityStatus(value) {
  return value ? "enabled" : "disabled";
}

function normalizeMints(mints) {
  if (Array.isArray(mints)) return mints.filter(Boolean);
  return String(mints ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function requireValue(value, name) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}
