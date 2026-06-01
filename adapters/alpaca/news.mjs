/**
 * Alpaca news functions — market news by symbol or topic.
 *
 * Source: Benzinga via Alpaca's data API. Free tier, no rate issues.
 * Endpoint: GET /v1beta1/news
 */

/**
 * Fetch recent news articles, optionally filtered by symbol(s).
 *
 * @param {import('./client.mjs').AlpacaClient} client
 * @param {Object} [opts]
 * @param {string|string[]} [opts.symbols]   e.g. "SOFI" or ["SOFI","MARA"]
 * @param {number}          [opts.limit=10]  max articles (1–50)
 * @param {string}          [opts.start]     ISO date — earliest article date
 * @param {string}          [opts.end]       ISO date — latest article date
 * @param {boolean}         [opts.content]   include full HTML content (default false)
 * @returns {Promise<NewsArticle[]>}
 */
export async function getNews(client, opts = {}) {
  const { symbols, limit = 10, start, end, content = false } = opts;

  const params = { limit };
  if (symbols) {
    params.symbols = Array.isArray(symbols) ? symbols.join(",") : symbols;
  }
  if (start) params.start = start;
  if (end)   params.end   = end;
  if (!content) params.exclude_contentless = false; // include summaries even without body

  const data = await client.request("GET", "/v1beta1/news", { params, base: "data" });
  const articles = data?.news ?? [];

  return articles.map(a => ({
    id:         a.id,
    headline:   a.headline,
    summary:    a.summary || null,
    author:     a.author || null,
    source:     a.source,
    symbols:    a.symbols ?? [],
    url:        a.url,
    created_at: a.created_at,
    updated_at: a.updated_at,
    ...(content && a.content ? { content: a.content } : {}),
  }));
}
