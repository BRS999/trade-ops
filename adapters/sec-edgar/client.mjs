const SEC_BASE_URL = "https://data.sec.gov";
const SEC_FILES_URL = "https://www.sec.gov";
const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Referer": "https://www.sec.gov/",
};
const DEFAULT_REQUESTS_PER_MINUTE = 10;

export class SecEdgarClient {
  constructor(options = {}) {
    this.requestsPerMinute =
      options.requestsPerMinute ?? DEFAULT_REQUESTS_PER_MINUTE;
    this._queue = [];
    this._tickerMap = null;
  }

  async _waitForRateLimit() {
    const now = Date.now();
    const windowMs = 60_000;
    this._queue = this._queue.filter((t) => now - t < windowMs);

    if (this._queue.length >= this.requestsPerMinute) {
      const oldest = this._queue[0];
      const waitMs = windowMs - (now - oldest) + 10;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return this._waitForRateLimit();
    }

    this._queue.push(Date.now());
  }

  async get(path) {
    await this._waitForRateLimit();

    const url = path.startsWith("http")
      ? new URL(path)
      : new URL(path, SEC_BASE_URL);

    const response = await fetch(url.toString(), {
      headers: BROWSER_HEADERS,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new SecEdgarError(response.status, response.statusText, url.pathname, body);
    }

    return response.json();
  }

  async getTickerMap() {
    if (this._tickerMap) {
      return this._tickerMap;
    }

    const data = await this.get(`${SEC_FILES_URL}/files/company_tickers.json`);
    const values = Object.values(data || {});
    this._tickerMap = values.map((entry) => ({
      cik: normalizeCik(entry.cik_str),
      cikNumber: Number(entry.cik_str),
      ticker: String(entry.ticker || "").toUpperCase(),
      title: entry.title || null,
    }));
    return this._tickerMap;
  }
}

export class SecEdgarError extends Error {
  constructor(status, statusText, path, body) {
    super(`SEC EDGAR error ${status ?? ""} ${statusText} on ${path}`);
    this.name = "SecEdgarError";
    this.status = status;
    this.path = path;
    this.body = body;
  }
}

export function normalizeCik(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) {
    throw new Error("CIK value is required");
  }
  return digits.padStart(10, "0");
}
