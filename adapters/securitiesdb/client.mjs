/**
 * SecuritiesDB adapter — free public read API.
 *
 * Provides SEC Form 4 insider transactions and 13F smart-money institutional
 * flow (Citadel, Renaissance Technologies, Bridgewater, Soros, Millennium, etc.).
 *
 * No API key required.
 * Base URL: https://securitiesdb.com/api/v1
 */

export class SecuritiesDbError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "SecuritiesDbError";
    this.status = status;
  }
}

export class SecuritiesDbClient {
  constructor() {
    this.baseUrl = "https://securitiesdb.com/api/v1";
  }

  async get(path) {
    const res = await fetch(`${this.baseUrl}/${path}`, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      throw new SecuritiesDbError(`SecuritiesDB ${res.status}`, res.status);
    }

    const json = await res.json();
    if (json.meta?.status && json.meta.status !== 200) {
      throw new SecuritiesDbError(`SecuritiesDB error: ${JSON.stringify(json.meta)}`);
    }

    return json;
  }
}
