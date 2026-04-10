/**
 * FRED series — observations and search.
 *
 * getObservations(client, seriesId, options)  → array of { date, value }
 * getLatest(client, seriesId)                 → single most-recent observation
 * getSeries(client, seriesId)                 → series metadata
 */

/**
 * @typedef {Object} Observation
 * @property {string} date    YYYY-MM-DD
 * @property {number|null} value
 */

/**
 * @typedef {Object} SeriesMeta
 * @property {string} id
 * @property {string} title
 * @property {string} units
 * @property {string} frequency
 * @property {string} seasonal_adjustment
 * @property {string} last_updated
 * @property {string} observation_start
 * @property {string} observation_end
 * @property {string} notes
 */

/**
 * Fetch observations for a series.
 *
 * @param {import('./client.mjs').FredClient} client
 * @param {string} seriesId   e.g. 'DGS10', 'FEDFUNDS', 'CPIAUCSL'
 * @param {Object} [options]
 * @param {number} [options.limit=10]
 * @param {string} [options.sort_order='desc']   'asc' | 'desc'
 * @param {string} [options.observation_start]   YYYY-MM-DD
 * @param {string} [options.observation_end]     YYYY-MM-DD
 * @returns {Promise<Observation[]>}
 */
export async function getObservations(client, seriesId, options = {}) {
  const {
    limit = 10,
    sort_order = "desc",
    observation_start,
    observation_end,
  } = options;

  const data = await client.get("series/observations", {
    series_id: seriesId,
    limit: String(limit),
    sort_order,
    ...(observation_start && { observation_start }),
    ...(observation_end && { observation_end }),
  });

  return (data.observations ?? []).map((obs) => ({
    date: obs.date,
    value: obs.value === "." ? null : Number(obs.value),
  }));
}

/**
 * Fetch the single most-recent observation for a series.
 *
 * @param {import('./client.mjs').FredClient} client
 * @param {string} seriesId
 * @returns {Promise<Observation>}
 */
export async function getLatest(client, seriesId) {
  const obs = await getObservations(client, seriesId, { limit: 1, sort_order: "desc" });
  if (!obs.length) throw new Error(`No observations found for series: ${seriesId}`);
  return obs[0];
}

/**
 * Fetch series metadata (title, units, frequency, etc).
 *
 * @param {import('./client.mjs').FredClient} client
 * @param {string} seriesId
 * @returns {Promise<SeriesMeta>}
 */
export async function getSeries(client, seriesId) {
  const data = await client.get("series", { series_id: seriesId });
  const s = (data.seriess ?? [])[0] ?? {};

  return {
    id: s.id ?? seriesId,
    title: s.title ?? null,
    units: s.units ?? null,
    frequency: s.frequency ?? null,
    seasonal_adjustment: s.seasonal_adjustment ?? null,
    last_updated: s.last_updated ?? null,
    observation_start: s.observation_start ?? null,
    observation_end: s.observation_end ?? null,
    notes: s.notes ?? null,
  };
}
