/**
 * GDELT adapter — geopolitical news and event context.
 *
 * Wraps the free GDELT DOC 2.0 API. Use this for:
 *   - Global news article discovery by keyword, theme, country, or tone
 *   - Coverage volume and tone timelines for macro/geopolitical topics
 *   - Cross-language monitoring (GDELT searches 65 machine-translated languages)
 *
 * Query operators (embedded in the query string):
 *   theme:TAX_FNCACT           — GKG theme (see KNOWN_THEMES)
 *   sourcecountry:china        — outlet country
 *   sourcelang:english         — original language
 *   tone<-5                    — negative coverage filter
 *   domain:reuters.com         — restrict to domain
 *
 * Docs: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
 */

export { GdeltClient, GdeltError } from "./client.mjs";

/** Common GKG themes useful for trading and macro research. */
export const KNOWN_THEMES = {
  tariff: "ECON_TARIFF",
  trade_war: "ECON_TRADEWAR",
  sanctions: "SANCTIONS",
  inflation: "ECON_INFLATION",
  recession: "ECON_RECESSION",
  oil: "ENV_OIL",
  war: "ARMEDCONFLICT",
  protest: "PROTEST",
  cyber: "CYBER_ATTACK",
  terrorism: "TERROR",
  central_bank: "ECON_CENTRALBANK",
  supply_chain: "ECON_SUPPLYCHAIN",
};

/** DOC API output modes exposed by this adapter. */
export const DOC_MODES = {
  articles: "ArtList",
  volume: "TimelineVol",
  volumeRaw: "TimelineVolRaw",
  volumeInfo: "TimelineVolInfo",
  tone: "TimelineTone",
  language: "TimelineLang",
  sourceCountry: "TimelineSourceCountry",
  toneChart: "ToneChart",
};

/**
 * Build a GDELT query string from structured parts.
 *
 * @param {Object} parts
 * @param {string|string[]} [parts.keyword]
 * @param {string|string[]} [parts.theme]       Theme slug or KNOWN_THEMES key
 * @param {string|string[]} [parts.sourceCountry]
 * @param {string|string[]} [parts.sourceLang]
 * @param {string}          [parts.domain]
 * @param {string}          [parts.tone]        e.g. "<-5" or ">5"
 * @param {string}          [parts.near]        "20:word1 word2"
 */
export function buildQuery(parts = {}) {
  const tokens = [];

  for (const word of asList(parts.keyword)) {
    tokens.push(word.includes(" ") ? `"${word}"` : word);
  }

  for (const theme of asList(parts.theme)) {
    const slug = KNOWN_THEMES[theme] ?? theme;
    tokens.push(`theme:${slug}`);
  }

  for (const country of asList(parts.sourceCountry)) {
    tokens.push(`sourcecountry:${country.replace(/\s+/g, "")}`);
  }

  for (const lang of asList(parts.sourceLang)) {
    tokens.push(`sourcelang:${lang}`);
  }

  if (parts.domain) tokens.push(`domain:${parts.domain}`);
  if (parts.tone) tokens.push(`tone${parts.tone}`);
  if (parts.near) tokens.push(`near${parts.near}`);

  const query = tokens.join(" ").trim();
  if (!query) throw new Error("buildQuery requires at least one search term");
  return query;
}

/** Search global news articles (ArtList mode). */
export function searchArticles(client, query, options = {}) {
  return client.doc({
    query,
    mode: DOC_MODES.articles,
    format: "json",
    timespan: options.timespan ?? "7d",
    maxrecords: clamp(options.maxRecords ?? options.maxrecords ?? 50, 1, 250),
    startdatetime: formatDateTime(options.startDateTime ?? options.startdatetime),
    enddatetime: formatDateTime(options.endDateTime ?? options.enddatetime),
    sort: options.sort,
  });
}

/** Coverage volume timeline (% of global news mentioning the query). */
export function getVolumeTimeline(client, query, options = {}) {
  return client.doc({
    query,
    mode: options.raw ? DOC_MODES.volumeRaw : DOC_MODES.volume,
    format: "json",
    timespan: options.timespan ?? "7d",
    startdatetime: formatDateTime(options.startDateTime ?? options.startdatetime),
    enddatetime: formatDateTime(options.endDateTime ?? options.enddatetime),
  });
}

/** Average tone timeline for matching coverage. */
export function getToneTimeline(client, query, options = {}) {
  return client.doc({
    query,
    mode: DOC_MODES.tone,
    format: "json",
    timespan: options.timespan ?? "7d",
    startdatetime: formatDateTime(options.startDateTime ?? options.startdatetime),
    enddatetime: formatDateTime(options.endDateTime ?? options.enddatetime),
  });
}

/** Coverage volume broken down by source language. */
export function getLanguageTimeline(client, query, options = {}) {
  return client.doc({
    query,
    mode: DOC_MODES.language,
    format: "json",
    timespan: options.timespan ?? "7d",
    startdatetime: formatDateTime(options.startDateTime ?? options.startdatetime),
    enddatetime: formatDateTime(options.endDateTime ?? options.enddatetime),
  });
}

/** Coverage volume broken down by source country. */
export function getSourceCountryTimeline(client, query, options = {}) {
  return client.doc({
    query,
    mode: DOC_MODES.sourceCountry,
    format: "json",
    timespan: options.timespan ?? "7d",
    startdatetime: formatDateTime(options.startDateTime ?? options.startdatetime),
    enddatetime: formatDateTime(options.endDateTime ?? options.enddatetime),
  });
}

/** Tone histogram — distribution of emotional tone across matching articles. */
export function getToneChart(client, query, options = {}) {
  return client.doc({
    query,
    mode: DOC_MODES.toneChart,
    format: "json",
    timespan: options.timespan ?? "7d",
    startdatetime: formatDateTime(options.startDateTime ?? options.startdatetime),
    enddatetime: formatDateTime(options.endDateTime ?? options.enddatetime),
  });
}

/**
 * Combined geopolitical snapshot: recent articles + volume spike check + tone.
 * Makes 3 sequential API calls (respects GDELT rate limits).
 */
export async function getGeopoliticalSnapshot(client, query, options = {}) {
  const timespan = options.timespan ?? "7d";
  const maxRecords = options.maxRecords ?? 25;
  const articlesOnly = options.articlesOnly ?? options.articles_only ?? false;

  const articles = await searchArticles(client, query, { timespan, maxRecords });

  if (articlesOnly) {
    return {
      as_of: new Date().toISOString(),
      source: "gdelt_doc",
      query,
      timespan,
      articles: normalizeArticles(articles),
    };
  }

  const volume = await getVolumeTimeline(client, query, { timespan });
  const tone = await getToneTimeline(client, query, { timespan });

  const volumeSeries = volume.timeline?.[0]?.data ?? [];
  const toneSeries = tone.timeline?.[0]?.data ?? [];
  const latestVolume = volumeSeries.at(-1)?.value ?? null;
  const priorVolume = volumeSeries.at(-2)?.value ?? null;
  const latestTone = toneSeries.at(-1)?.value ?? null;

  return {
    as_of: new Date().toISOString(),
    source: "gdelt_doc",
    query,
    timespan,
    coverage: {
      latest_volume_pct: latestVolume,
      prior_volume_pct: priorVolume,
      volume_change_pct: pctChange(priorVolume, latestVolume),
      latest_tone: latestTone,
      volume_points: volumeSeries.length,
      tone_points: toneSeries.length,
    },
    articles: normalizeArticles(articles),
  };
}

export function normalizeArticles(response) {
  return (response.articles ?? []).map((article) => ({
    title: article.title ?? null,
    url: article.url ?? null,
    url_mobile: article.url_mobile || null,
    seen_at: parseSeenDate(article.seendate),
    domain: article.domain ?? null,
    language: article.language ?? null,
    source_country: article.sourcecountry ?? null,
    social_image: article.socialimage || null,
  }));
}

function parseSeenDate(value) {
  if (!value) return null;
  // GDELT format: 20260527T043000Z
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(value);
  if (!match) return value;
  const [, y, mo, d, h, mi, s] = match;
  return new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s))).toISOString();
}

function pctChange(from, to) {
  if (from == null || to == null || from === 0) return null;
  return Number((((to - from) / from) * 100).toFixed(2));
}

function asList(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatDateTime(value) {
  if (!value) return undefined;
  if (/^\d{14}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid datetime: ${value}`);
  const pad = (n) => String(n).padStart(2, "0");
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
  ].join("");
}
