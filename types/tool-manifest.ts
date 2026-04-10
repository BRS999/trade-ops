export interface ToolManifestEntry {
  name: string;
  description: string;
  namespace: "read" | "writePaper" | "journal";
  sideEffect: "none" | "paper_trade" | "file_write";
  inputSchema: Record<string, unknown>;
}

export const TRADE_OPS_TOOL_MANIFEST: ToolManifestEntry[] = [
  {
    name: "get_account_snapshot",
    namespace: "read",
    sideEffect: "none",
    description: "Return the latest account-level paper or live snapshot from the configured adapter.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  },
  {
    name: "get_positions",
    namespace: "read",
    sideEffect: "none",
    description: "Return currently open positions.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  },
  {
    name: "get_working_orders",
    namespace: "read",
    sideEffect: "none",
    description: "Return currently working orders.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  },
  {
    name: "get_order_history",
    namespace: "read",
    sideEffect: "none",
    description: "Return historical order records, optionally filtered by symbol or limit.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        symbol: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "get_chart_context",
    namespace: "read",
    sideEffect: "none",
    description: "Return current chart context including symbol, timeframe, and latest price where available.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        symbol: { type: "string" },
        timeframe: { type: "string" },
      },
    },
  },
  {
    name: "get_indicator_values",
    namespace: "read",
    sideEffect: "none",
    description: "Return current indicator values from the charting adapter.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        symbol: { type: "string" },
        timeframe: { type: "string" },
      },
    },
  },
  {
    name: "place_paper_order",
    namespace: "writePaper",
    sideEffect: "paper_trade",
    description: "Place a paper order only. Supported in v1 for simple market and limit orders.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["symbol", "side", "type", "quantity"],
      properties: {
        symbol: { type: "string" },
        assetClass: { type: "string" },
        side: { type: "string", enum: ["buy", "sell"] },
        type: { type: "string", enum: ["market", "limit"] },
        quantity: { type: "number" },
        limitPrice: { type: "number" },
        sourcePlanId: { type: "string" },
        note: { type: "string" },
      },
    },
  },
  {
    name: "close_paper_position",
    namespace: "writePaper",
    sideEffect: "paper_trade",
    description: "Close an open paper position for a specific symbol.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["symbol"],
      properties: {
        symbol: { type: "string" },
        note: { type: "string" },
      },
    },
  },
  {
    name: "cancel_paper_order",
    namespace: "writePaper",
    sideEffect: "paper_trade",
    description: "Cancel a working paper order by orderId or symbol.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        orderId: { type: "string" },
        symbol: { type: "string" },
      },
    },
  },
  {
    name: "attach_paper_bracket",
    namespace: "writePaper",
    sideEffect: "paper_trade",
    description: "Attach take-profit and stop-loss levels to an existing paper position.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["symbol"],
      properties: {
        symbol: { type: "string" },
        takeProfit: { type: "number" },
        stopLoss: { type: "number" },
        note: { type: "string" },
      },
    },
  },
  {
    name: "log_trade_open",
    namespace: "journal",
    sideEffect: "file_write",
    description: "Write a newly opened trade to the local journal.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["trade"],
      properties: {
        trade: { type: "object" },
      },
    },
  },
  {
    name: "log_trade_close",
    namespace: "journal",
    sideEffect: "file_write",
    description: "Write close details, mistakes, and lessons to an existing journal trade.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["tradeId", "closedAt"],
      properties: {
        tradeId: { type: "string" },
        closedAt: { type: "string" },
        exitPrice: { type: "number" },
        mistakes: {
          type: "array",
          items: { type: "string" },
        },
        lessons: {
          type: "array",
          items: { type: "string" },
        },
        notes: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
  },
  {
    name: "log_trade_note",
    namespace: "journal",
    sideEffect: "file_write",
    description: "Append a timestamped note to a trade journal entry.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["tradeId", "note"],
      properties: {
        tradeId: { type: "string" },
        note: { type: "string" },
        notedAt: { type: "string" },
        tags: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
  },
  {
    name: "get_trade_journal",
    namespace: "journal",
    sideEffect: "none",
    description: "Read journal entries by state, symbol, asset class, setup type, or limit.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        state: { type: "string" },
        symbol: { type: "string" },
        assetClass: { type: "string" },
        setupType: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
];
