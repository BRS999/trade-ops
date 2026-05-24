/**
 * Treasury FiscalData adapter — public read API.
 *
 * Primary use cases:
 *   - Treasury auctions and issuance context
 *   - Debt and fiscal liquidity research
 *   - Official Treasury data independent of market-data vendors
 */

export { FiscalDataClient, FiscalDataError } from "./client.mjs";

export function getDebtToPenny(client, options = {}) {
  return client.get("v2/accounting/od/debt_to_penny", {
    sort: options.sort ?? "-record_date",
    "page[size]": options.limit ?? 10,
    fields: options.fields,
  });
}

export function getTreasurySecurities(client, options = {}) {
  return client.get("v1/accounting/od/securities_sales", {
    sort: options.sort ?? "-record_date",
    "page[size]": options.limit ?? 10,
    fields: options.fields,
    filter: options.filter,
  });
}

export function getDailyTreasuryStatement(client, options = {}) {
  return client.getTransparency("v1/accounting/dts/dts_table_1", {
    sort: options.sort ?? "-record_date",
    "page[size]": options.limit ?? 10,
    fields: options.fields,
    filter: options.filter,
  });
}

export async function getFiscalSnapshot(client, options = {}) {
  const [debt, sales] = await Promise.all([
    getDebtToPenny(client, { limit: options.limit ?? 5 }),
    getTreasurySecurities(client, { limit: options.limit ?? 5 }),
  ]);

  return {
    as_of: new Date().toISOString(),
    source: "treasury_fiscaldata",
    debt_to_penny: debt.data ?? [],
    securities_sales: sales.data ?? [],
  };
}
