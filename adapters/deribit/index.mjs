/**
 * Deribit adapter — public read API.
 *
 * Primary use cases:
 *   - BTC/ETH options surface context
 *   - Futures/options open interest and volume
 *   - Volatility/skew research inputs
 */

export { DeribitClient, DeribitError } from "./client.mjs";

export function getInstruments(client, options = {}) {
  return client.get("public/get_instruments", {
    currency: options.currency ?? "BTC",
    kind: options.kind,
    expired: options.expired ?? false,
  });
}

export function getBookSummaryByCurrency(client, options = {}) {
  return client.get("public/get_book_summary_by_currency", {
    currency: options.currency ?? "BTC",
    kind: options.kind,
  });
}

export function getOrderBook(client, instrumentName, options = {}) {
  return client.get("public/get_order_book", {
    instrument_name: requireValue(instrumentName, "instrumentName"),
    depth: options.depth ?? 10,
  });
}

export function getVolatilityIndex(client, currency = "BTC") {
  return client.get("public/get_volatility_index_data", {
    currency,
    resolution: "1",
  });
}

export async function getOptionsSnapshot(client, currencies = ["BTC", "ETH"]) {
  const rows = [];
  for (const currency of currencies) {
    const summary = await getBookSummaryByCurrency(client, { currency, kind: "option" });
    rows.push(summarizeCurrencyOptions(currency, summary));
  }
  return {
    as_of: new Date().toISOString(),
    source: "deribit",
    rows,
  };
}

function summarizeCurrencyOptions(currency, summary) {
  const rows = Array.isArray(summary) ? summary : [];
  const active = rows.filter((row) => Number(row.open_interest) > 0 || Number(row.volume) > 0);
  const calls = active.filter((row) => String(row.instrument_name).includes("-C"));
  const puts = active.filter((row) => String(row.instrument_name).includes("-P"));

  return {
    currency,
    instruments: rows.length,
    active: active.length,
    total_open_interest: round(sum(active, "open_interest")),
    total_volume: round(sum(active, "volume")),
    call_open_interest: round(sum(calls, "open_interest")),
    put_open_interest: round(sum(puts, "open_interest")),
    put_call_oi_ratio: ratio(sum(puts, "open_interest"), sum(calls, "open_interest")),
    top_by_open_interest: [...active]
      .sort((a, b) => Number(b.open_interest ?? 0) - Number(a.open_interest ?? 0))
      .slice(0, 10)
      .map(normalizeOptionSummary),
    top_by_volume: [...active]
      .sort((a, b) => Number(b.volume ?? 0) - Number(a.volume ?? 0))
      .slice(0, 10)
      .map(normalizeOptionSummary),
  };
}

function normalizeOptionSummary(row) {
  return {
    instrument_name: row.instrument_name,
    underlying_price: number(row.underlying_price),
    open_interest: number(row.open_interest),
    volume: number(row.volume),
    bid_price: number(row.bid_price),
    ask_price: number(row.ask_price),
    mark_price: number(row.mark_price),
    mark_iv: number(row.mark_iv),
  };
}

function sum(rows, field) {
  return rows.reduce((total, row) => total + Number(row[field] ?? 0), 0);
}

function ratio(numerator, denominator) {
  return denominator ? round(numerator / denominator) : null;
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value, places = 4) {
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 10 ** places) / 10 ** places;
}

function requireValue(value, name) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}
