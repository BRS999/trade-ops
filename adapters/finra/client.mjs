/**
 * FINRA short sale volume client.
 *
 * Reads the daily Consolidated NMS (CNMS) short sale volume file published
 * by FINRA. No API key required. Files are published by ~6pm ET on each
 * trading day and cover all NMS securities across NYSE, Nasdaq, and CBOE BZX.
 *
 * File URL: https://cdn.finra.org/equity/regsho/daily/CNMSshvol{YYYYMMDD}.txt
 * Format: Date|Symbol|ShortVolume|ShortExemptVolume|TotalVolume|Market
 *
 * NOTE: This is short VOLUME (daily flow), not short INTEREST (open positions).
 * Short volume % = what fraction of today's trading was short sales.
 * It does not measure total shares sold short or days-to-cover.
 */

const BASE = "https://cdn.finra.org/equity/regsho/daily";
const TIMEOUT_MS = 20000;

export class FinraError extends Error {
  constructor(message) {
    super(message);
    this.name = "FinraError";
  }
}

export class FinraClient {
  async fetchFile(date) {
    const url = `${BASE}/CNMSshvol${date}.txt`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new FinraError(`FINRA file not found for ${date} (HTTP ${response.status}). Market may have been closed.`);
    }

    return response.text();
  }

  /** Parse raw CNMS file text into an array of row objects. */
  parse(text) {
    const lines = text.trim().split("\n");
    const rows = [];
    for (const line of lines) {
      const parts = line.split("|");
      if (parts.length < 5 || parts[0] === "Date") continue;
      const shortVol = Number(parts[2]);
      const totalVol = Number(parts[4]);
      rows.push({
        date: parts[0],
        symbol: parts[1],
        short_volume: shortVol,
        short_exempt_volume: Number(parts[3]),
        total_volume: totalVol,
        short_pct: totalVol > 0 ? shortVol / totalVol : null,
        markets: parts[5]?.trim() ?? null,
      });
    }
    return rows;
  }

  /**
   * Fetch and parse the file for a given date, walking back up to maxDays
   * trading days to find the most recent available file.
   */
  async getRows(dateStr, maxDays = 5) {
    const d = dateStr ? new Date(dateStr + "T12:00:00Z") : new Date();
    for (let i = 0; i < maxDays; i++) {
      const ymd = d.toISOString().slice(0, 10).replace(/-/g, "");
      try {
        const text = await this.fetchFile(ymd);
        return { date: ymd, rows: this.parse(text) };
      } catch {
        d.setUTCDate(d.getUTCDate() - 1);
      }
    }
    throw new FinraError(`No FINRA short volume file found in the last ${maxDays} trading days.`);
  }
}
