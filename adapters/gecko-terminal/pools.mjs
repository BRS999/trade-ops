/**
 * GeckoTerminal pool endpoints.
 *
 * getTopPools(client, network, page)
 * getDexPools(client, network, dex, page)
 * getGlobalTrendingPools(client, duration, page)
 * getNetworkTrendingPools(client, network, duration, page)
 * getGlobalNewPools(client, page)
 * getNetworkNewPools(client, network, page)
 * searchPools(client, query, network, page)
 * getPool(client, network, address, include)
 * getMultiPools(client, network, addresses, include)
 * getPoolInfo(client, network, address)
 * getPoolTrades(client, network, address, page)
 * getPoolOhlcv(client, network, address, opts)
 */

function parsePool(item) {
  const a = item.attributes ?? {};
  return {
    address: a.address ?? item.id,
    name: a.name ?? null,
    dex: item.relationships?.dex?.data?.id ?? null,
    network: item.relationships?.network?.data?.id ?? null,
    base_token_price_usd: a.base_token_price_usd ? Number(a.base_token_price_usd) : null,
    quote_token_price_usd: a.quote_token_price_usd ? Number(a.quote_token_price_usd) : null,
    fdv_usd: a.fdv_usd ? Number(a.fdv_usd) : null,
    market_cap_usd: a.market_cap_usd ? Number(a.market_cap_usd) : null,
    reserve_usd: a.reserve_in_usd ? Number(a.reserve_in_usd) : null,
    volume_usd: {
      m5:  Number(a.volume_usd?.m5  ?? 0),
      m15: Number(a.volume_usd?.m15 ?? 0),
      m30: Number(a.volume_usd?.m30 ?? 0),
      h1:  Number(a.volume_usd?.h1  ?? 0),
      h6:  Number(a.volume_usd?.h6  ?? 0),
      h24: Number(a.volume_usd?.h24 ?? 0),
    },
    price_change_pct: {
      m5:  Number(a.price_change_percentage?.m5  ?? 0),
      m15: Number(a.price_change_percentage?.m15 ?? 0),
      m30: Number(a.price_change_percentage?.m30 ?? 0),
      h1:  Number(a.price_change_percentage?.h1  ?? 0),
      h6:  Number(a.price_change_percentage?.h6  ?? 0),
      h24: Number(a.price_change_percentage?.h24 ?? 0),
    },
    transactions: a.transactions ?? null,
    pool_created_at: a.pool_created_at ?? null,
  };
}

export async function getTopPools(client, network, page = 1) {
  const data = await client.get(`networks/${network}/pools`, { page });
  return (data.data ?? []).map(parsePool);
}

export async function getDexPools(client, network, dex, page = 1) {
  const data = await client.get(`networks/${network}/dexes/${dex}/pools`, { page });
  return (data.data ?? []).map(parsePool);
}

export async function getGlobalTrendingPools(client, duration = "24h", page = 1) {
  const data = await client.get("networks/trending_pools", { duration, page });
  return (data.data ?? []).map(parsePool);
}

export async function getNetworkTrendingPools(client, network, duration = "24h", page = 1) {
  const data = await client.get(`networks/${network}/trending_pools`, { duration, page });
  return (data.data ?? []).map(parsePool);
}

export async function getGlobalNewPools(client, page = 1) {
  const data = await client.get("networks/new_pools", { page });
  return (data.data ?? []).map(parsePool);
}

export async function getNetworkNewPools(client, network, page = 1) {
  const data = await client.get(`networks/${network}/new_pools`, { page });
  return (data.data ?? []).map(parsePool);
}

export async function searchPools(client, query, network = null, page = 1) {
  const params = { query, page };
  if (network) params.network = network;
  const data = await client.get("search/pools", params);
  return (data.data ?? []).map(parsePool);
}

export async function getPool(client, network, address, include = "base_token,quote_token,dex") {
  const data = await client.get(`networks/${network}/pools/${address}`, { include });
  return { pool: parsePool(data.data), included: data.included ?? [] };
}

export async function getMultiPools(client, network, addresses, include = "base_token,quote_token,dex") {
  const data = await client.get(
    `networks/${network}/pools/multi/${addresses.join(",")}`,
    { include }
  );
  return (data.data ?? []).map(parsePool);
}

export async function getPoolInfo(client, network, address) {
  const data = await client.get(`networks/${network}/pools/${address}/info`);
  return data.data ?? null;
}

export async function getPoolTrades(client, network, address, page = 1) {
  const data = await client.get(`networks/${network}/pools/${address}/trades`, { page });
  return (data.data ?? []).map((item) => {
    const a = item.attributes ?? {};
    return {
      tx_hash: a.tx_hash ?? null,
      block_number: a.block_number ?? null,
      block_timestamp: a.block_timestamp ?? null,
      kind: a.kind ?? null,
      volume_usd: a.volume_in_usd ? Number(a.volume_in_usd) : null,
      from_token_amount: a.from_token_amount ?? null,
      to_token_amount: a.to_token_amount ?? null,
      price_from_in_usd: a.price_from_in_usd ? Number(a.price_from_in_usd) : null,
      price_to_in_usd: a.price_to_in_usd ? Number(a.price_to_in_usd) : null,
    };
  });
}

/**
 * Fetch OHLCV candles for a pool.
 *
 * @param {import('./client.mjs').GeckoTerminalClient} client
 * @param {string} network
 * @param {string} address
 * @param {Object} opts
 * @param {string} [opts.timeframe='hour']   'minute' | 'hour' | 'day'
 * @param {number} [opts.aggregate=1]        Candle size multiplier
 * @param {number} [opts.limit=100]          Max candles (max 1000)
 * @param {string} [opts.currency='usd']     'usd' | 'token'
 * @param {string} [opts.token='base']       'base' | 'quote'
 */
export async function getPoolOhlcv(client, network, address, opts = {}) {
  const {
    timeframe = "hour",
    aggregate = 1,
    limit = 100,
    currency = "usd",
    token = "base",
  } = opts;

  const data = await client.get(
    `networks/${network}/pools/${address}/ohlcv/${timeframe}`,
    { aggregate, limit, currency, token }
  );

  const ohlcv = data?.data?.attributes?.ohlcv_list ?? [];
  return ohlcv.map(([timestamp, open, high, low, close, volume]) => ({
    timestamp,
    open: Number(open),
    high: Number(high),
    low: Number(low),
    close: Number(close),
    volume: Number(volume),
  }));
}
