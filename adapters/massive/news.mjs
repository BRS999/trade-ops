/**
 * Massive news — Benzinga financial news.
 *
 * Endpoint docs: https://massive.com/docs/rest/benzinga
 *
 * Key endpoints:
 *   GET /benzinga/v2/news  — news articles, press releases, analysis
 *
 * Plan notes: entitlement varies by account. The current account returns 403.
 *
 * Query parameters:
 *   published.gte / published.lte — publication date range
 *   tickers / stocks              — filter by stock tickers
 *   channels                      — e.g. "News", "Press Releases", "Analysis"
 *   tags                          — topic tags
 *   author                        — author name filter
 *   limit / sort
 */

/**
 * @typedef {Object} NewsArticle
 * @property {string|null} id            article ID
 * @property {string|null} title         headline
 * @property {string|null} summary       summary / lead-in text
 * @property {string|null} body          full article text (may be truncated on some plans)
 * @property {string|null} url           direct link to article
 * @property {string|null} author        author name
 * @property {string|null} published_at  ISO timestamp
 * @property {string|null} updated_at    ISO timestamp
 * @property {string[]|null} tickers     related stock tickers
 * @property {string[]|null} channels    e.g. ["News", "Analysis"]
 * @property {string[]|null} tags        topic tags
 */

/**
 * Fetch financial news articles from Benzinga.
 *
 * Includes: news articles, press releases, analyst commentary,
 * price target changes, earnings coverage.
 *
 * GET /benzinga/v2/news
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {Object} [opts]
 * @param {string}  [opts.from]        published.gte — ISO date or YYYY-MM-DD
 * @param {string}  [opts.to]          published.lte — ISO date or YYYY-MM-DD
 * @param {string}  [opts.tickers]     comma-separated stock tickers
 * @param {string}  [opts.channels]    comma-separated: "News","Press Releases","Analysis"
 * @param {string}  [opts.tags]        comma-separated topic tags
 * @param {string}  [opts.author]      author name (exact or partial)
 * @param {number}  [opts.limit=25]    max results (default 25, max 1000)
 * @param {string}  [opts.sort]        e.g. "-published" for newest first
 * @returns {Promise<NewsArticle[]>}
 */
export async function getNews(client, opts = {}) {
  const { from, to, tickers, channels, tags, author, limit = 25, sort } = opts;
  const params = { limit: String(limit) };
  if (from) params["published.gte"] = from;
  if (to) params["published.lte"] = to;
  if (tickers) params.tickers = tickers.toUpperCase();
  if (channels) params.channels = channels;
  if (tags) params.tags = tags;
  if (author) params.author = author;
  if (sort) params.sort = sort;

  const rows = await client.getAll("/benzinga/v2/news", params);
  return rows.map(_parseArticle).filter(Boolean);
}

/**
 * Fetch recent news for a specific stock ticker.
 *
 * Convenience wrapper around getNews with ticker pre-filtered.
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {string} ticker        e.g. "AAPL"
 * @param {Object} [opts]
 * @param {number} [opts.limit=25]
 * @param {string} [opts.from]    ISO date or YYYY-MM-DD
 * @returns {Promise<NewsArticle[]>}
 */
export async function getStockNews(client, ticker, opts = {}) {
  return getNews(client, { ...opts, tickers: ticker.toUpperCase() });
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _parseArticle(raw) {
  if (!raw) return null;

  return {
    id: raw.id ?? raw.benzinga_id ?? null,
    title: raw.title ?? raw.headline ?? null,
    summary: raw.summary ?? raw.teaser ?? null,
    body: raw.body ?? raw.content ?? null,
    url: raw.url ?? raw.benzinga_news_url ?? null,
    author: raw.author ?? null,
    published_at: raw.published ?? raw.created ?? null,
    updated_at: raw.updated ?? null,
    tickers: raw.tickers ?? (raw.stocks ? raw.stocks.map(String) : null),
    channels: raw.channels ?? null,
    tags: raw.tags ?? raw.categories ?? null,
  };
}
