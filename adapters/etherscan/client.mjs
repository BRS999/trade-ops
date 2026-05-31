/**
 * Etherscan API client.
 *
 * Requires ETHERSCAN_API_KEY. Free tier: 5 calls/sec, 100k calls/day.
 * Get a free key at https://etherscan.io/myapikey
 *
 * Base URL: https://api.etherscan.io/api
 */

try { process.loadEnvFile(); } catch {}

const BASE_URL = "https://api.etherscan.io/v2/api";
const TIMEOUT_MS = Number(process.env.ETHERSCAN_TIMEOUT_MS ?? 15000);

export class EtherscanError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "EtherscanError";
    this.status = status;
  }
}

export class EtherscanClient {
  constructor(chainId = process.env.ETHERSCAN_CHAIN_ID ?? "1") {
    const apiKey = process.env.ETHERSCAN_API_KEY;
    if (!apiKey) throw new EtherscanError("ETHERSCAN_API_KEY is not set");
    this._apiKey = apiKey;
    this._chainId = String(chainId);
  }

  async get(params = {}) {
    const qs = new URLSearchParams({ chainid: this._chainId, ...params, apikey: this._apiKey }).toString();
    const url = `${BASE_URL}?${qs}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new EtherscanError(`HTTP ${response.status} ${response.statusText}`, response.status);
    }

    const body = await response.json();

    // Etherscan wraps errors in status:"0" with a message instead of HTTP error codes
    if (body.status === "0" && body.message !== "No transactions found") {
      throw new EtherscanError(`Etherscan error: ${body.result ?? body.message}`);
    }

    return body.result;
  }
}
