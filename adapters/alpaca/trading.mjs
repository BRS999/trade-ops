/**
 * Alpaca trading functions — account, positions, orders, clock.
 */

// ── Account ────────────────────────────────────────────────────────────────

export function getAccount(client) {
  return client.get("account");
}

/** Concise account summary: equity, cash, buying power, P&L. */
export async function getAccountSummary(client) {
  const a = await getAccount(client);
  return {
    mode:              client.mode,
    status:            a.status,
    equity:            Number(a.equity),
    cash:              Number(a.cash),
    buying_power:      Number(a.buying_power),
    portfolio_value:   Number(a.portfolio_value),
    last_equity:       Number(a.last_equity),
    day_pnl:           Number(a.equity) - Number(a.last_equity),
    day_pnl_pct:       ((Number(a.equity) - Number(a.last_equity)) / Number(a.last_equity)) * 100,
    pattern_day_trader: a.pattern_day_trader,
    day_trade_count:   a.daytrade_count,
    shorting_enabled:  a.shorting_enabled,
    currency:          a.currency,
  };
}

/** Portfolio P&L history. */
export function getPortfolioHistory(client, opts = {}) {
  return client.get("account/portfolio/history", {
    period:      opts.period,    // e.g. "1D", "1W", "1M", "1A"
    timeframe:   opts.timeframe, // "1Min", "5Min", "15Min", "1H", "1D"
    intraday_reporting: opts.intraday_reporting ?? "market_hours",
  });
}

// ── Positions ─────────────────────────────────────────────────────────────

export function getPositions(client) {
  return client.get("positions");
}

export function getPosition(client, symbol) {
  return client.get(`positions/${symbol.toUpperCase()}`);
}

/** Close a position. percentage: 0–100, qty: shares to close (default closes all). */
export function closePosition(client, symbol, opts = {}) {
  const params = {};
  if (opts.qty)        params.qty        = String(opts.qty);
  if (opts.percentage) params.percentage = String(opts.percentage);
  return client.delete(`positions/${symbol.toUpperCase()}`, params);
}

/** Close all open positions. */
export function closeAllPositions(client, opts = {}) {
  return client.delete("positions", { cancel_orders: opts.cancelOrders ?? true });
}

// ── Orders ────────────────────────────────────────────────────────────────

/**
 * List orders.
 * @param {Object} [opts]
 * @param {'open'|'closed'|'all'} [opts.status='open']
 * @param {number} [opts.limit=50]
 * @param {string} [opts.after]   ISO timestamp
 * @param {string} [opts.until]   ISO timestamp
 * @param {'asc'|'desc'} [opts.direction='desc']
 */
export function getOrders(client, opts = {}) {
  return client.get("orders", {
    status:    opts.status    ?? "open",
    limit:     opts.limit     ?? 50,
    after:     opts.after,
    until:     opts.until,
    direction: opts.direction ?? "desc",
    nested:    true,
  });
}

export function getOrder(client, orderId) {
  return client.get(`orders/${orderId}`);
}

/**
 * Place an order.
 *
 * @param {Object} order
 * @param {string} order.symbol
 * @param {'buy'|'sell'} order.side
 * @param {'market'|'limit'|'stop'|'stop_limit'|'trailing_stop'} order.type
 * @param {'day'|'gtc'|'ioc'|'fok'} order.tif
 * @param {number} [order.qty]          shares (mutually exclusive with notional)
 * @param {number} [order.notional]     dollar amount (market orders only)
 * @param {number} [order.limit_price]  required for limit/stop_limit
 * @param {number} [order.stop_price]   required for stop/stop_limit
 * @param {number} [order.trail_price]  required for trailing_stop ($ amount)
 * @param {number} [order.trail_percent] required for trailing_stop (%)
 * @param {boolean} [order.extended_hours]
 * @param {string} [order.client_order_id]
 *
 * Bracket order: add take_profit.limit_price and stop_loss.stop_price
 */
export function placeOrder(client, order) {
  const body = {
    symbol:          order.symbol.toUpperCase(),
    side:            order.side,
    type:            order.type,
    time_in_force:   order.tif ?? order.time_in_force ?? "day",
  };

  if (order.qty      !== undefined) body.qty      = String(order.qty);
  if (order.notional !== undefined) body.notional = String(order.notional);

  if (order.limit_price   !== undefined) body.limit_price   = String(order.limit_price);
  if (order.stop_price    !== undefined) body.stop_price    = String(order.stop_price);
  if (order.trail_price   !== undefined) body.trail_price   = String(order.trail_price);
  if (order.trail_percent !== undefined) body.trail_percent = String(order.trail_percent);

  if (order.extended_hours)     body.extended_hours = true;
  if (order.client_order_id)    body.client_order_id = order.client_order_id;

  if (order.take_profit || order.stop_loss) {
    body.order_class = "bracket";
    if (order.take_profit) body.take_profit = { limit_price: String(order.take_profit) };
    if (order.stop_loss)   body.stop_loss   = { stop_price:  String(order.stop_loss) };
  }

  return client.post("orders", body);
}

/** Cancel a single order. */
export function cancelOrder(client, orderId) {
  return client.delete(`orders/${orderId}`);
}

/** Cancel all open orders. */
export function cancelAllOrders(client) {
  return client.delete("orders");
}

/**
 * Place an OCO (one-cancels-other) exit for an existing position.
 * One sell leg hits the take-profit limit; the other is a stop-loss.
 * Whichever fills first automatically cancels the other.
 *
 * For crypto, Alpaca requires stop_limit (not plain stop) so a
 * stop_limit_price is required — defaults to stop_price * 0.995 (0.5% slippage).
 *
 * @param {string} symbol
 * @param {number} qty
 * @param {number} takeProfitPrice   limit sell price
 * @param {number} stopPrice         stop trigger price
 * @param {Object} [opts]
 * @param {number} [opts.stopLimitPrice]  limit price for stop_limit leg (crypto only)
 * @param {'day'|'gtc'} [opts.tif]
 */
export function placeOcoExit(client, symbol, qty, takeProfitPrice, stopPrice, opts = {}) {
  const tif = opts.tif ?? "gtc";
  const body = {
    symbol:        symbol.toUpperCase(),
    qty:           String(qty),
    side:          "sell",
    type:          "limit",
    time_in_force: tif,
    order_class:   "oco",
    take_profit: {
      limit_price: String(takeProfitPrice),
    },
    stop_loss: {
      stop_price:  String(stopPrice),
    },
  };

  // Crypto requires stop_limit — add limit_price to the stop leg
  if (opts.stopLimitPrice) {
    body.stop_loss.limit_price = String(opts.stopLimitPrice);
  }

  return client.post("orders", body);
}

/** Replace an existing order (price or qty change). */
export function replaceOrder(client, orderId, opts = {}) {
  const body = {};
  if (opts.qty         !== undefined) body.qty         = String(opts.qty);
  if (opts.limit_price !== undefined) body.limit_price = String(opts.limit_price);
  if (opts.stop_price  !== undefined) body.stop_price  = String(opts.stop_price);
  if (opts.tif)                       body.time_in_force = opts.tif;
  return client.patch(`orders/${orderId}`, body);
}

// ── Market clock & calendar ───────────────────────────────────────────────

/** Is the market open right now? Next open/close timestamps. */
export function getClock(client) {
  return client.get("clock");
}

/** Market calendar — trading days between two dates. */
export function getCalendar(client, opts = {}) {
  return client.get("calendar", { start: opts.start, end: opts.end });
}

// ── Assets ────────────────────────────────────────────────────────────────

export function getAsset(client, symbol) {
  return client.get(`assets/${symbol.toUpperCase()}`);
}

/** Check if a symbol is tradeable. */
export async function isTradeable(client, symbol) {
  try {
    const a = await getAsset(client, symbol);
    return { symbol: a.symbol, tradeable: a.tradeable, shortable: a.shortable, fractionable: a.fractionable };
  } catch {
    return { symbol, tradeable: false };
  }
}

// ── Activities ────────────────────────────────────────────────────────────

/** Account activity — fills, dividends, etc. */
export function getActivities(client, opts = {}) {
  return client.get("account/activities", {
    activity_type: opts.type,  // "FILL", "DIV", "ACATC", etc.
    after:         opts.after,
    until:         opts.until,
    direction:     opts.direction ?? "desc",
    page_size:     opts.limit ?? 50,
  });
}
