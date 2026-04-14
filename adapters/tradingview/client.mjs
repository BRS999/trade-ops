import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  ACCOUNT_SUMMARY_QUERY,
  cancelOrderQuery,
  closePositionMenuQuery,
  CONFIRM_CLOSE_POSITION_QUERY,
  ORDER_HISTORY_QUERY,
  ORDERS_QUERY,
  POSITIONS_QUERY,
} from "./queries.mjs";

const execFileAsync = promisify(execFile);

export class TradingViewAdapter {
  constructor(options = {}) {
    this.nodeBinary = options.nodeBinary || "node";
    this.cliPath =
      options.cliPath ||
      "/Users/benjaminspencer/git/tradingview-mcp/src/cli/index.js";
  }

  async run(commandArgs) {
    const { stdout } = await execFileAsync(
      this.nodeBinary,
      [this.cliPath, ...commandArgs],
      {
        maxBuffer: 1024 * 1024 * 8,
      },
    );
    const payload = JSON.parse(stdout);
    if (!payload.success) {
      throw new Error(payload.error || `TradingView command failed: ${commandArgs.join(" ")}`);
    }
    return payload;
  }

  async getChartState() {
    return this.run(["state"]);
  }

  async getIndicatorValues() {
    return this.run(["values"]);
  }

  async setSymbol(symbol) {
    const first = await this.run(["symbol", symbol]);
    const firstVerified = await this.waitForSymbol(symbol);
    if (firstVerified.ok) {
      return {
        ...first,
        chart_ready: true,
        observed_symbol: firstVerified.observed_symbol,
        verification_stage: firstVerified.stage,
      };
    }

    const retrySymbol = fallbackSymbol(symbol);
    if (!retrySymbol || normalizeSymbol(retrySymbol) === normalizeSymbol(symbol)) {
      return {
        ...first,
        chart_ready: false,
        observed_symbol: firstVerified.observed_symbol,
        verification_stage: firstVerified.stage,
      };
    }

    const retry = await this.run(["symbol", retrySymbol]);
    const retryVerified = await this.waitForSymbol(retrySymbol);
    return {
      ...retry,
      requested_symbol: symbol,
      fallback_symbol: retrySymbol,
      chart_ready: retryVerified.ok,
      observed_symbol: retryVerified.observed_symbol,
      verification_stage: retryVerified.stage,
    };
  }

  async setTimeframe(timeframe) {
    const result = await this.run(["timeframe", timeframe]);
    const verified = await this.waitForTimeframe(timeframe);
    return {
      ...result,
      chart_ready: verified.ok,
      observed_resolution: verified.observed_resolution,
      verification_stage: verified.stage,
    };
  }

  async delay(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async evaluate(expression) {
    const payload = await this.run(["ui", "eval", expression]);
    return payload.result;
  }

  async getPaperPositions() {
    const result = await this.evaluate(POSITIONS_QUERY);
    return normalizeTable(result);
  }

  async getWorkingOrders() {
    const result = await this.evaluate(ORDERS_QUERY);
    const rows = normalizeTable(result);
    return rows.filter((row) => (row.Status || "").toLowerCase() === "working");
  }

  async getOrderHistory() {
    const result = await this.evaluate(ORDER_HISTORY_QUERY);
    return normalizeTable(result);
  }

  async getAccountSummary() {
    return this.evaluate(ACCOUNT_SUMMARY_QUERY);
  }

  async closePaperPosition(symbol) {
    const opened = await this.evaluate(closePositionMenuQuery(symbol));
    if (!opened?.ok) return opened;
    await this.delay(300);
    const confirmed = await this.evaluate(CONFIRM_CLOSE_POSITION_QUERY);
    await this.delay(1000);
    return confirmed;
  }

  async cancelPaperOrder(identifier) {
    if (!identifier) {
      throw new Error("identifier is required");
    }
    const result = await this.evaluate(cancelOrderQuery(identifier));
    await this.delay(1000);
    return result;
  }

  async placePaperOrder(order) {
    const {
      symbol,
      side,
      type = "market",
      quantity,
      limitPrice,
      stopPrice,
    } = order;

    if (!symbol) throw new Error("symbol is required");
    if (!side || !["buy", "sell"].includes(side.toLowerCase())) {
      throw new Error("side must be buy or sell");
    }
    if (!quantity) throw new Error("quantity is required");
    if (!["market", "limit", "stop"].includes(type.toLowerCase())) {
      throw new Error("type must be market, limit, or stop");
    }
    if (type.toLowerCase() === "limit" && (limitPrice === undefined || limitPrice === null)) {
      throw new Error("limitPrice is required for limit orders");
    }
    if (type.toLowerCase() === "stop" && (stopPrice === undefined || stopPrice === null)) {
      throw new Error("stopPrice is required for stop orders");
    }

    const normalizedSymbol = normalizeSymbol(symbol);
    const historyBefore = await this.getOrderHistory();
    const workingBefore = await this.getWorkingOrders();

    // Only navigate to the symbol if not already on it — navigation resets the order panel
    const chartState = await this.getChartState().catch(() => null);
    const currentSymbol = normalizeSymbolMatcher(chartState?.symbol || "");
    if (currentSymbol !== normalizedSymbol) {
      await this.setSymbol(symbol);
      await this.delay(1000);
    }

    // Step 1: select order type + direction (triggers React re-render)
    const step1 = await this.evaluate(buildSelectSideQuery({
      side: side.toLowerCase(),
      type: type.toLowerCase(),
    }));
    if (!step1?.ok) return step1;

    // Wait for React to re-render the panel with the selected direction
    await this.delay(800);

    // Step 2: set quantity, limit price, or stop price as applicable
    const step2 = await this.evaluate(buildSetFieldsQuery({ quantity, limitPrice, stopPrice }));
    if (!step2?.ok) return step2;

    await this.delay(300);

    // Step 3: get submit button coordinates
    const coords = await this.evaluate(buildSubmitCoordsQuery());
    if (!coords?.ok) return coords;

    // Step 4: click via CDP Input.dispatchMouseEvent (isTrusted: true — bypasses React's synthetic event check)
    const result = await this.run(["ui", "mouse", String(Math.round(coords.x)), String(Math.round(coords.y))]);
    if (!result?.success) {
      return { ok: false, stage: "cdp_click_failed", ...result };
    }
    const submitResult = { ok: true, stage: "submitted", type: type.toLowerCase(), side: side.toLowerCase(), submitText: coords.submitText };

    const materialized = await this.waitForOrderMaterialization({
      symbol: normalizedSymbol,
      historyBefore,
      workingBefore,
      type: type.toLowerCase(),
    });

    return {
      ...submitResult,
      ...materialized,
    };
  }

  async waitForOrderMaterialization({ symbol, historyBefore, workingBefore, type }) {
    const historyCountBefore = countOrdersForSymbol(historyBefore, symbol);
    const workingCountBefore = countOrdersForSymbol(workingBefore, symbol);

    for (let attempt = 0; attempt < 20; attempt += 1) {
      await this.delay(1000);

      const [historyAfter, workingAfter] = await Promise.all([
        this.getOrderHistory(),
        this.getWorkingOrders(),
      ]);

      const historyCountAfter = countOrdersForSymbol(historyAfter, symbol);
      const workingCountAfter = countOrdersForSymbol(workingAfter, symbol);

      if (historyCountAfter > historyCountBefore) {
        const matching = findLatestOrderForSymbol(historyAfter, symbol);
        return {
          ok: true,
          stage: "materialized_history",
          observedOrder: matching || null,
        };
      }

      if (type === "limit" && workingCountAfter > workingCountBefore) {
        const matching = findLatestOrderForSymbol(workingAfter, symbol);
        return {
          ok: true,
          stage: "materialized_working_order",
          observedOrder: matching || null,
        };
      }
    }

    return {
      ok: false,
      stage: "materialization_not_observed",
      observedOrder: null,
    };
  }

  async waitForSymbol(symbol) {
    const expected = normalizeSymbolMatcher(symbol);

    for (let attempt = 0; attempt < 20; attempt += 1) {
      await this.delay(1000);
      const state = await this.getChartState().catch(() => null);
      const observed = state?.symbol || null;
      if (observed && symbolsMatch(observed, expected)) {
        return {
          ok: true,
          stage: "symbol_matched",
          observed_symbol: observed,
        };
      }
    }

    const finalState = await this.getChartState().catch(() => null);
    return {
      ok: false,
      stage: "symbol_not_observed",
      observed_symbol: finalState?.symbol || null,
    };
  }

  async waitForTimeframe(timeframe) {
    const expected = String(timeframe || "").trim().toUpperCase();

    for (let attempt = 0; attempt < 20; attempt += 1) {
      await this.delay(500);
      const state = await this.getChartState().catch(() => null);
      const observed = String(state?.resolution || "").trim().toUpperCase();
      if (observed === expected) {
        return {
          ok: true,
          stage: "timeframe_matched",
          observed_resolution: state.resolution,
        };
      }
    }

    const finalState = await this.getChartState().catch(() => null);
    return {
      ok: false,
      stage: "timeframe_not_observed",
      observed_resolution: finalState?.resolution || null,
    };
  }
}

function normalizeTable(result) {
  const headers = Array.isArray(result?.headers) ? result.headers : [];
  const rows = Array.isArray(result?.rows) ? result.rows : [];
  return rows.map((row) => {
    const entry = {};
    headers.forEach((header, index) => {
      entry[header] = row[index] ?? "";
    });
    return entry;
  });
}

function normalizeSymbol(symbol) {
  return String(symbol || "").trim().toUpperCase();
}

function normalizeSymbolMatcher(symbol) {
  const upper = normalizeSymbol(symbol);
  if (!upper) return upper;
  const parts = upper.split(":");
  return parts[parts.length - 1];
}

function fallbackSymbol(symbol) {
  const upper = normalizeSymbol(symbol);
  if (!upper.includes(":")) {
    return upper;
  }
  return normalizeSymbolMatcher(upper);
}

function symbolsMatch(observed, expected) {
  const observedFull = normalizeSymbol(observed);
  const observedBare = normalizeSymbolMatcher(observed);
  return observedFull === normalizeSymbol(expected) || observedBare === normalizeSymbol(expected);
}

function countOrdersForSymbol(rows, symbol) {
  return rows.filter((row) => normalizeSymbolMatcher(row.Symbol) === symbol).length;
}

function findLatestOrderForSymbol(rows, symbol) {
  return rows.find((row) => normalizeSymbolMatcher(row.Symbol) === symbol) || null;
}

/**
 * Step 1: select order type (Market/Limit) and direction (Buy/Sell).
 * Must be a separate evaluate call so React can re-render before we
 * query for the submit button (which changes text based on direction).
 */
function buildSelectSideQuery({ side, type }) {
  return `(() => {
    const root = document.querySelector(".orderPanel-qRKEn0AX")
      || document.querySelector(".orderWidget-vZBitAcm")
      || document.querySelector(".orderTicket-vZBitAcm");
    if (!root) return { ok: false, stage: "order_ticket_not_found" };

    const clickByText = (text, scope) => {
      const node = [...scope.querySelectorAll("button,div,span")]
        .find((el) => (el.innerText || el.textContent || "").trim() === text && el.offsetParent);
      if (!node) return false;
      node.click();
      return true;
    };

    clickByText(${JSON.stringify(type === "market" ? "Market" : type === "limit" ? "Limit" : "Stop")}, root);

    const sideButton = [...root.querySelectorAll("div,button,span")]
      .find((el) => (el.innerText || el.textContent || "").trim() === ${JSON.stringify(side === "buy" ? "Buy" : "Sell")} && el.offsetParent);
    if (!sideButton) return { ok: false, stage: "side_not_found" };
    sideButton.click();

    return { ok: true, stage: "side_selected", type: ${JSON.stringify(type)}, side: ${JSON.stringify(side)} };
  })()`;
}

/**
 * Step 2: set quantity and limit price fields.
 * Called after React has re-rendered with the selected direction.
 */
function buildSetFieldsQuery({ quantity, limitPrice, stopPrice }) {
  return `(() => {
    const setById = (id, value) => {
      const input = document.getElementById(id);
      if (!input) return false;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(input, String(value));
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    };

    if (!setById("quantity-field", ${JSON.stringify(String(quantity))})) {
      return { ok: false, stage: "quantity_field_not_found" };
    }

    ${stopPrice != null ? `
    if (!setById("absolute-stop-price-field", ${JSON.stringify(String(stopPrice))})) {
      return { ok: false, stage: "stop_price_field_not_found" };
    }` : ""}

    ${limitPrice != null ? `
    const limitInput = document.getElementById("absolute-limit-price-field")
      || [...document.querySelectorAll("input")].find(i => {
           const v = parseFloat(i.value);
           return i.id === "" && v > 50 && v < 10000;
         });
    if (limitInput) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(limitInput, ${JSON.stringify(String(limitPrice))});
      limitInput.dispatchEvent(new Event("input", { bubbles: true }));
      limitInput.dispatchEvent(new Event("change", { bubbles: true }));
    }` : ""}

    return { ok: true, stage: "fields_set", quantity: ${JSON.stringify(String(quantity))}, limitPrice: ${JSON.stringify(limitPrice ?? null)}, stopPrice: ${JSON.stringify(stopPrice ?? null)} };
  })()`;
}

/**
 * Step 3: get the submit button's center screen coordinates.
 * We use CDP Input.dispatchMouseEvent (isTrusted: true) to click it,
 * because TradingView's order submission checks event.isTrusted.
 */
function buildSubmitCoordsQuery() {
  return `(() => {
    const root = document.querySelector(".orderPanel-qRKEn0AX")
      || document.querySelector(".orderWidget-vZBitAcm")
      || document.querySelector(".orderTicket-vZBitAcm");
    if (!root) return { ok: false, stage: "order_ticket_not_found" };

    const submit = [...root.querySelectorAll("button")]
      .find((el) => {
        const cls = el.className || "";
        return !!el.offsetParent && cls.includes("button-_ba4ELUa");
      });
    if (!submit) return { ok: false, stage: "submit_not_found" };

    const rect = submit.getBoundingClientRect();
    const submitText = (submit.innerText || submit.textContent || "").trim();

    return {
      ok: true,
      stage: "coords_ready",
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      submitText,
    };
  })()`;
}
