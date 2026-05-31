/**
 * BEA adapter — public API.
 *
 * Key tables by dataset:
 *
 * NIPA (National Income & Product Accounts):
 *   T10101  GDP and components (quarterly/annual)
 *   T10105  GDP by type of product
 *   T20305  Personal consumption expenditures by type (monthly/quarterly)
 *   T30100  Government expenditures
 *   T50100  Gross private domestic investment
 *
 * GDPbyIndustry:
 *   1   Value added by industry
 *   5   Gross output by industry
 *   6   Intermediate inputs by industry
 *
 * Regional (GeoFIPS: "00000" = US, "01000"–"56000" = states):
 *   CAGDP1   GDP summary by state
 *   CAGDP2   GDP by state and industry
 *   CAINC1   Personal income summary
 *   CAINC5   Personal income by major source
 *   CAINC30  Economic profile by county
 *   SAEMP25N Employment by industry
 *
 * ITA (International Transactions):
 *   BalCurrentAcct, GoodsTrade, ServicesTrade, InvestmentIncome
 *
 * InputOutput:
 *   259  Total requirements table (Leontief inverse)
 *   56   Direct requirements table
 */

export { BeaClient, BeaError } from "./client.mjs";

// ── Discovery ──────────────────────────────────────────────────────────────

/** List all available BEA datasets. */
export async function listDatasets(client) {
  const r = await client.get({ method: "GetDataSetList" });
  return r.Dataset ?? r;
}

/** List parameters for a dataset. */
export async function listParameters(client, datasetname) {
  const r = await client.get({ method: "GetParameterList", datasetname });
  return r.Parameter ?? r;
}

// ── NIPA ───────────────────────────────────────────────────────────────────

/**
 * NIPA table data — national income and product accounts.
 *
 * @param {string}          tableName  e.g. "T10101" (GDP), "T20305" (PCE)
 * @param {Object}          [opts]
 * @param {string}          [opts.frequency]  "Q" quarterly | "A" annual | "M" monthly
 * @param {string|number}   [opts.year]       Year, comma-separated years, or "X" for all
 */
export async function getNipa(client, tableName, opts = {}) {
  const r = await client.get({
    method: "GetData",
    datasetname: "NIPA",
    TableName: tableName,
    Frequency: opts.frequency ?? "Q",
    Year: opts.year ?? "X",
  });
  return normalizeData(r);
}

/**
 * GDP components snapshot (Table T10101).
 * Returns: GDP, PCE, Gross Investment, Exports, Imports, Government.
 */
export function getGdpComponents(client, opts = {}) {
  return getNipa(client, "T10101", { frequency: "Q", ...opts });
}

/**
 * Personal consumption expenditures by type (Table T20305, monthly).
 */
export function getPce(client, opts = {}) {
  return getNipa(client, "T20305", { frequency: "M", ...opts });
}

// ── GDP by Industry ────────────────────────────────────────────────────────

/**
 * GDP (value added) by industry — the sector rotation signal.
 * Shows which industries are growing or contracting relative to total GDP.
 *
 * @param {Object}        [opts]
 * @param {string}        [opts.industry]    Industry code or "ALL" (default)
 * @param {string}        [opts.frequency]   "A" annual | "Q" quarterly (default A)
 * @param {string|number} [opts.year]        Year or "ALL" (default last 5 years)
 */
export async function getGdpByIndustry(client, opts = {}) {
  const r = await client.get({
    method: "GetData",
    datasetname: "GDPbyIndustry",
    TableID: "1",
    Industry: opts.industry ?? "ALL",
    Frequency: opts.frequency ?? "A",
    Year: opts.year ?? buildRecentYears(5),
  });
  return normalizeData(r);
}

// ── Regional ───────────────────────────────────────────────────────────────

/**
 * Regional economic data by state (or county/MSA).
 *
 * @param {string}        tableName  e.g. "CAGDP1" (GDP by state), "CAINC1" (personal income)
 * @param {Object}        [opts]
 * @param {string}        [opts.geoFips]  State FIPS or "00000" for US total (default "00000")
 * @param {string|number} [opts.lineCode] Data line within the table (default "1")
 * @param {string|number} [opts.year]     Year or "ALL"
 */
export async function getRegional(client, tableName, opts = {}) {
  const r = await client.get({
    method: "GetData",
    datasetname: "Regional",
    TableName: tableName,
    GeoFips: opts.geoFips ?? "STATE",
    LineCode: opts.lineCode ?? "1",
    Year: opts.year ?? buildRecentYears(3),
  });
  return normalizeData(r);
}

/**
 * GDP by state — all states, most recent years.
 */
export function getStatGdp(client, opts = {}) {
  return getRegional(client, "CAGDP1", { geoFips: "STATE", lineCode: "1", ...opts });
}

/**
 * Personal income by state.
 */
export function getStatePersonalIncome(client, opts = {}) {
  return getRegional(client, "CAINC1", { geoFips: "STATE", lineCode: "1", ...opts });
}

// ── International Transactions ─────────────────────────────────────────────

/**
 * International transactions (trade + financial flows).
 *
 * @param {Object}  [opts]
 * @param {string}  [opts.indicator]       "BalCurrentAcct" | "GoodsTrade" | "ServicesTrade" |
 *                                          "InvestmentIncome" | "CurrentTaxes" | "ALL" (default)
 * @param {string}  [opts.areaOrCountry]   "AllCountries" (default)
 * @param {string}  [opts.frequency]       "A" | "Q" (default Q)
 * @param {string}  [opts.year]            Year or "ALL"
 */
export async function getInternationalTransactions(client, opts = {}) {
  const r = await client.get({
    method: "GetData",
    datasetname: "ITA",
    Indicator: opts.indicator ?? "ALL",
    AreaOrCountry: opts.areaOrCountry ?? "AllCountries",
    Frequency: opts.frequency ?? "Q",
    Year: opts.year ?? buildRecentYears(3),
  });
  return normalizeData(r);
}

// ── Input-Output ───────────────────────────────────────────────────────────

/**
 * Industry input-output table (supply chain interdependencies).
 *
 * @param {Object}  [opts]
 * @param {string}  [opts.tableId]  "259" total requirements | "56" direct requirements
 * @param {number}  [opts.year]     Year (default most recent available)
 */
export async function getInputOutput(client, opts = {}) {
  const r = await client.get({
    method: "GetData",
    datasetname: "InputOutput",
    TableID: opts.tableId ?? "259",
    Year: opts.year ?? new Date().getFullYear() - 2,
  });
  return normalizeData(r);
}

// ── Snapshot ───────────────────────────────────────────────────────────────

/**
 * Macro snapshot: GDP components + GDP by industry top-level.
 * Uses 2 API calls.
 */
export async function getMacroSnapshot(client) {
  const [gdp, byIndustry] = await Promise.all([
    getGdpComponents(client, { year: buildRecentYears(2) }),
    getGdpByIndustry(client, { frequency: "A", year: buildRecentYears(3) }),
  ]);
  return {
    as_of: new Date().toISOString(),
    gdp_components: gdp,
    gdp_by_industry: byIndustry,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function normalizeData(r) {
  if (!r) return r;
  const data = r.Data ?? r;
  return Array.isArray(data) ? data : r;
}

function buildRecentYears(n) {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: n }, (_, i) => currentYear - i).join(",");
}
