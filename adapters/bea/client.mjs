/**
 * Bureau of Economic Analysis (BEA) adapter — public read API.
 *
 * Covers national accounts (NIPA), GDP by industry, regional state-level data,
 * international transactions, and input-output tables.
 *
 * What this adds over FRED/BLS:
 *   - GDPbyIndustry: which sectors are growing vs contracting (sector rotation signal)
 *   - Regional: state-level personal income and GDP (regional banks, real estate)
 *   - InputOutput: industry supply chain dependency tables
 *   - ITA: international trade and financial flows (FX and multinationals)
 *
 * Environment variable: BEA_API_KEY or BEA_KEY
 * Free key (requires email activation): https://apps.bea.gov/API/signup/
 *
 * Base URL: https://apps.bea.gov/api/data/
 * Auth: UserID query parameter
 */

try { process.loadEnvFile(); } catch {}

export class BeaError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "BeaError";
    this.code = code;
  }
}

export class BeaClient {
  constructor() {
    const apiKey = process.env.BEA_API_KEY ?? process.env.BEA_KEY;
    if (!apiKey) throw new BeaError("BEA_API_KEY (or BEA_KEY) is not set");
    this.apiKey = apiKey;
    this.baseUrl = "https://apps.bea.gov/api/data/";
  }

  async get(params) {
    const url = new URL(this.baseUrl);
    url.searchParams.set("UserID", this.apiKey);
    url.searchParams.set("ResultFormat", "JSON");
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }

    const res = await fetch(url.toString());
    if (!res.ok) throw new BeaError(`BEA HTTP ${res.status}`);

    const json = await res.json();
    const results = json.BEAAPI?.Results;

    if (results?.Error) {
      const { APIErrorCode: code, APIErrorDescription: desc } = results.Error;
      if (code === "4") throw new BeaError("BEA key not activated — click the activation link in your signup email.", code);
      throw new BeaError(`BEA API error ${code}: ${desc}`, code);
    }

    return results;
  }

  /** Discover valid parameter values for a dataset+parameter combination. */
  async getParameterValues(datasetname, parameterName) {
    return this.get({ method: "GetParameterValues", datasetname, ParameterName: parameterName });
  }
}
