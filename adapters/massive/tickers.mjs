/**
 * Massive ticker details — fundamental metadata for a ticker.
 *
 * getTickerDetails(client, ticker)  → name, market cap, SIC, shares outstanding, etc.
 */

/**
 * @typedef {Object} TickerDetails
 * @property {string}      ticker
 * @property {string|null} name
 * @property {string|null} market              'stocks' | 'crypto' | 'fx' | 'otc' | 'indices'
 * @property {string|null} locale              'us' | 'global'
 * @property {string|null} primary_exchange    e.g. 'XNAS', 'XNYS'
 * @property {string|null} type                'CS' | 'ETF' | 'ADRC' ...
 * @property {boolean}     active
 * @property {string|null} currency_name
 * @property {string|null} description
 * @property {number|null} market_cap
 * @property {number|null} share_class_shares_outstanding
 * @property {number|null} weighted_shares_outstanding
 * @property {string|null} sic_code
 * @property {string|null} sic_description
 * @property {string|null} homepage_url
 * @property {string|null} list_date           YYYY-MM-DD IPO date
 */

/**
 * Fetch detailed ticker metadata.
 *
 * Massive endpoint:
 *   GET /v3/reference/tickers/{ticker}
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {string} ticker
 * @returns {Promise<TickerDetails>}
 */
export async function getTickerDetails(client, ticker) {
  const upper = ticker.toUpperCase();
  const data = await client.get(`/v3/reference/tickers/${upper}`);

  const r = data.results ?? {};

  return {
    ticker: upper,
    name: r.name ?? null,
    market: r.market ?? null,
    locale: r.locale ?? null,
    primary_exchange: r.primary_exchange ?? null,
    type: r.type ?? null,
    active: r.active ?? false,
    currency_name: r.currency_name ?? null,
    description: r.description ?? null,
    market_cap: r.market_cap ?? null,
    share_class_shares_outstanding: r.share_class_shares_outstanding ?? null,
    weighted_shares_outstanding: r.weighted_shares_outstanding ?? null,
    sic_code: r.sic_code ?? null,
    sic_description: r.sic_description ?? null,
    homepage_url: r.homepage_url ?? null,
    list_date: r.list_date ?? null,
  };
}
