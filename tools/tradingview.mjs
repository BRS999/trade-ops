#!/usr/bin/env node

import { TradingViewAdapter } from "../adapters/tradingview/client.mjs";

const tv = new TradingViewAdapter();

const [, , command, ...rest] = process.argv;

try {
  switch (command) {
    case "account":
      print(await tv.getAccountSummary());
      break;
    case "positions":
      print(await tv.getPaperPositions());
      break;
    case "orders":
      print(await tv.getWorkingOrders());
      break;
    case "history":
      print(await tv.getOrderHistory());
      break;
    case "chart":
      print(await tv.getChartState());
      break;
    case "indicators":
      print(await tv.getIndicatorValues());
      break;
    case "symbol":
      requireArg(rest[0], "symbol");
      print(await tv.setSymbol(rest[0]));
      break;
    case "timeframe":
      requireArg(rest[0], "timeframe");
      print(await tv.setTimeframe(rest[0]));
      break;
    case "buy":
      print(await placeOrder("buy", rest));
      break;
    case "sell":
      print(await placeOrder("sell", rest));
      break;
    case "close":
      requireArg(rest[0], "symbol");
      print(await tv.closePaperPosition(rest[0]));
      break;
    case "cancel":
      requireArg(rest[0], "identifier");
      print(await tv.cancelPaperOrder(rest[0]));
      break;
    case "help":
    case undefined:
      printHelp();
      break;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

async function placeOrder(side, args) {
  const symbol = requireArg(args[0], "symbol");
  const quantity = Number(requireArg(args[1], "quantity"));
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("quantity must be a positive number");
  }

  const type = (args[2] || "market").toLowerCase();
  if (!["market", "limit"].includes(type)) {
    throw new Error("type must be market or limit");
  }

  const order = {
    symbol,
    side,
    type,
    quantity,
  };

  if (type === "limit") {
    const limitPrice = Number(requireArg(args[3], "limitPrice"));
    if (!Number.isFinite(limitPrice) || limitPrice <= 0) {
      throw new Error("limitPrice must be a positive number");
    }
    order.limitPrice = limitPrice;
  }

  return tv.placePaperOrder(order);
}

function requireArg(value, name) {
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp() {
  console.log(`Trade Ops TradingView Tool

Usage:
  node tools/tradingview.mjs account
  node tools/tradingview.mjs positions
  node tools/tradingview.mjs orders
  node tools/tradingview.mjs history
  node tools/tradingview.mjs chart
  node tools/tradingview.mjs indicators
  node tools/tradingview.mjs symbol <symbol>
  node tools/tradingview.mjs timeframe <timeframe>
  node tools/tradingview.mjs buy <symbol> <quantity> [market|limit] [limitPrice]
  node tools/tradingview.mjs sell <symbol> <quantity> [market|limit] [limitPrice]
  node tools/tradingview.mjs close <symbol>
  node tools/tradingview.mjs cancel <orderId|symbol>
`);
}
