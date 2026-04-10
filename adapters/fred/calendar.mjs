/**
 * FRED economic calendar — upcoming scheduled data release dates.
 *
 * getEconomicCalendar(client, options)  → scheduled macro events for a date range
 *
 * Uses FRED's /fred/release/dates endpoint to pull upcoming publication dates
 * for the key releases a macro trader needs to track.
 *
 * FRED release IDs for key US events:
 *   10  → Consumer Price Index (CPI)
 *   50  → Employment Situation (NFP + Unemployment Rate)
 *   54  → Personal Income and Outlays (PCE)
 *   53  → Gross Domestic Product (GDP)
 *   14  → Producer Price Index (PPI)
 *   56  → Advance Monthly Retail Trade (Retail Sales)
 *   22  → Initial Jobless Claims (weekly)
 *   82  → Industrial Production
 */

/**
 * @typedef {Object} EconomicEvent
 * @property {string} date        YYYY-MM-DD
 * @property {string} release     Human-readable name (e.g. "CPI")
 * @property {string} description Longer description
 * @property {string} impact      "High" | "Medium"
 * @property {string} release_id  FRED release ID
 */

const RELEASES = [
  { id: "10",  name: "CPI",             description: "Consumer Price Index",               impact: "High" },
  { id: "50",  name: "NFP / Jobs",      description: "Employment Situation (NFP + UNRATE)", impact: "High" },
  { id: "54",  name: "PCE",             description: "Personal Income & Outlays (PCE)",     impact: "High" },
  { id: "53",  name: "GDP",             description: "Gross Domestic Product (Advance)",    impact: "High" },
  { id: "14",  name: "PPI",             description: "Producer Price Index",                impact: "Medium" },
  { id: "56",  name: "Retail Sales",    description: "Advance Monthly Retail Trade",        impact: "Medium" },
  { id: "22",  name: "Jobless Claims",  description: "Initial Jobless Claims (weekly)",     impact: "Medium" },
  { id: "82",  name: "Industrial Prod", description: "Industrial Production & Capacity",    impact: "Medium" },
];

/**
 * Fetch upcoming economic data release dates from FRED.
 *
 * @param {import('./client.mjs').FredClient} client
 * @param {Object}  [options]
 * @param {string}  [options.from]       YYYY-MM-DD (default: today)
 * @param {string}  [options.to]         YYYY-MM-DD (default: 30 days out)
 * @param {boolean} [options.highOnly]   Filter to High-impact events only
 * @returns {Promise<EconomicEvent[]>}
 */
export async function getEconomicCalendar(client, options = {}) {
  const today = new Date();
  const thirtyOut = new Date(today);
  thirtyOut.setDate(today.getDate() + 30);

  const toISODate = (d) => d.toISOString().split("T")[0];

  const {
    from = toISODate(today),
    to = toISODate(thirtyOut),
    highOnly = false,
  } = options;

  const releases = highOnly ? RELEASES.filter((r) => r.impact === "High") : RELEASES;

  const events = [];

  for (const release of releases) {
    const data = await client.get("release/dates", {
      release_id: release.id,
      realtime_start: from,
      realtime_end: to,
      limit: 10,
      sort_order: "asc",
      include_release_dates_with_no_data: "true",
    }).catch(() => null);

    if (!Array.isArray(data?.release_dates)) continue;

    for (const rd of data.release_dates) {
      const date = rd.date;
      if (!date || date < from || date > to) continue;

      events.push({
        date,
        release: release.name,
        description: release.description,
        impact: release.impact,
        release_id: release.id,
      });
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}
