/**
 * BLS adapter — public read API.
 *
 * Primary use cases:
 *   - Official labor and CPI time-series context
 *   - Macro release deep dives independent of FRED lag/formatting
 */

export { BlsClient, BlsError } from "./client.mjs";

export const DEFAULT_SERIES = {
  unemployment: "LNS14000000",
  cpi_all_urban: "CUSR0000SA0",
  cpi_core: "CUSR0000SA0L1E",
  payrolls: "CES0000000001",
  average_hourly_earnings: "CES0500000003",
};

export function getSeries(client, seriesIds, options = {}) {
  const ids = Array.isArray(seriesIds) ? seriesIds : [seriesIds];
  return client.post("timeseries/data/", {
    seriesid: ids,
    startyear: options.startYear ?? options.startyear,
    endyear: options.endYear ?? options.endyear,
    calculations: options.calculations,
    annualaverage: options.annualaverage,
  });
}

export async function getMacroSnapshot(client, options = {}) {
  const endYear = options.endYear ?? new Date().getFullYear();
  const startYear = options.startYear ?? endYear - 1;
  const data = await getSeries(client, Object.values(DEFAULT_SERIES), { startYear, endYear });
  const series = data.Results?.series ?? [];

  return {
    as_of: new Date().toISOString(),
    source: "bls",
    start_year: startYear,
    end_year: endYear,
    series: Object.fromEntries(series.map((entry) => [seriesName(entry.seriesID), normalizeSeries(entry)])),
  };
}

function normalizeSeries(entry) {
  const latest = entry.data?.[0] ?? null;
  return {
    series_id: entry.seriesID,
    latest: latest ? normalizePoint(latest) : null,
    points: (entry.data ?? []).slice(0, 12).map(normalizePoint),
  };
}

function normalizePoint(point) {
  return {
    year: point.year,
    period: point.period,
    period_name: point.periodName,
    value: number(point.value),
    footnotes: point.footnotes ?? [],
  };
}

function seriesName(seriesId) {
  for (const [name, id] of Object.entries(DEFAULT_SERIES)) {
    if (id === seriesId) return name;
  }
  return seriesId;
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
