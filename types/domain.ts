export type TradingMode = "paper" | "live";

export type AssetClass =
  | "equity"
  | "crypto"
  | "future"
  | "prediction_market"
  | "macro";

export type PositionSide = "long" | "short" | "yes" | "no";

export type OrderSide = "buy" | "sell";

export type OrderType = "market" | "limit" | "stop" | "stop_limit";

export type OrderStatus =
  | "working"
  | "filled"
  | "cancelled"
  | "rejected"
  | "expired"
  | "partial";

export type SetupType =
  | "pullback"
  | "breakout"
  | "mean-reversion"
  | "trend-follow"
  | "range-reversion"
  | "event-driven"
  | "momentum"
  | "fade"
  | "hedge"
  | "paper-test";

export type TradeState =
  | "idea"
  | "watchlist"
  | "planned"
  | "ready"
  | "ordered"
  | "open"
  | "closed"
  | "reviewed"
  | "cancelled"
  | "rejected";

export type Timeframe =
  | "1m"
  | "5m"
  | "15m"
  | "1h"
  | "4h"
  | "1D"
  | "1W"
  | "1M";

export interface SymbolRef {
  symbol: string;
  assetClass: AssetClass;
  venue?: string;
  exchange?: string;
  contractId?: string;
  tokenAddress?: string;
}

export interface MoneyValue {
  value: number;
  currency: string;
  display?: string;
}

export interface PriceLevel {
  value: number;
  currency?: string;
  label?: string;
}

export interface RiskBox {
  entry: PriceLevel;
  stop: PriceLevel;
  target: PriceLevel;
  rewardRiskRatio?: number;
  thesisInvalidation?: string;
  intendedRiskUsd?: number;
  intendedSize?: number;
}

export interface IndicatorValue {
  name: string;
  value: number | string;
  line?: string;
  source?: string;
}

export interface ChartContext {
  symbol: string;
  timeframe: Timeframe | string;
  price?: number;
  venue?: string;
  exchange?: string;
  indicators?: IndicatorValue[];
  capturedAt: string;
  stale?: boolean;
}

export interface AccountSnapshot {
  mode: TradingMode;
  broker: string;
  capturedAt: string;
  accountBalance?: MoneyValue;
  equity?: MoneyValue;
  realizedPnl?: MoneyValue;
  unrealizedPnl?: MoneyValue;
  accountMargin?: MoneyValue;
  availableFunds?: MoneyValue;
  ordersMargin?: MoneyValue;
  marginBufferPct?: number;
}

export interface PositionSnapshot {
  symbol: string;
  assetClass?: AssetClass;
  side: PositionSide;
  quantity: number;
  averageFillPrice?: number;
  lastPrice?: number;
  unrealizedPnl?: MoneyValue;
  unrealizedPnlPct?: number;
  leverage?: string;
  margin?: MoneyValue;
  takeProfit?: number | null;
  stopLoss?: number | null;
  openedAt?: string;
}

export interface WorkingOrderSnapshot {
  id?: string;
  symbol: string;
  side: OrderSide;
  type: OrderType | string;
  quantity: number;
  status: OrderStatus;
  limitPrice?: number;
  stopPrice?: number;
  placedAt?: string;
  source?: string;
}

export interface OrderHistoryEntry {
  id?: string;
  symbol: string;
  side: OrderSide;
  type: OrderType | string;
  quantity: number;
  status: OrderStatus;
  limitPrice?: number;
  stopPrice?: number;
  fillPrice?: number;
  placedAt?: string;
  closedAt?: string;
  commission?: MoneyValue;
  leverage?: string;
  margin?: MoneyValue;
}

export interface TradePlan {
  planId: string;
  state: TradeState;
  symbol: string;
  assetClass: AssetClass;
  side: PositionSide;
  setupType: SetupType;
  thesis: string;
  marketContext?: string;
  riskBox: RiskBox;
  timeframe?: Timeframe | string;
  notes?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TradeJournalEntry {
  tradeId: string;
  planId?: string;
  state: TradeState;
  mode: TradingMode;
  symbol: string;
  assetClass: AssetClass;
  side: PositionSide;
  setupType: SetupType;
  thesis: string;
  marketContext?: string;
  riskBox: RiskBox;
  entryPrice?: number;
  exitPrice?: number;
  quantity?: number;
  realizedPnl?: MoneyValue;
  unrealizedPnl?: MoneyValue;
  openedAt?: string;
  closedAt?: string;
  mistakes?: string[];
  lessons?: string[];
  screenshotPaths?: string[];
  chartReferences?: string[];
  tags?: string[];
  notes?: string[];
}

export interface ReviewMetrics {
  startDate: string;
  endDate: string;
  realizedPnl?: MoneyValue;
  unrealizedPnl?: MoneyValue;
  winRate?: number;
  averageRewardRiskAchieved?: number;
  averageWin?: MoneyValue;
  averageLoss?: MoneyValue;
  expectancy?: number;
  profitFactor?: number;
  maxDrawdownEstimate?: number;
  bySetupType?: Record<string, number>;
  byAssetClass?: Record<string, number>;
  byMistakeTag?: Record<string, number>;
}

export interface GetChartContextInput {
  symbol?: string;
  timeframe?: Timeframe | string;
}

export interface GetIndicatorValuesInput {
  symbol?: string;
  timeframe?: Timeframe | string;
}

export interface GetOrderHistoryInput {
  symbol?: string;
  limit?: number;
}

export interface PlacePaperOrderInput {
  symbol: string;
  assetClass?: AssetClass;
  side: OrderSide;
  type: "market" | "limit";
  quantity: number;
  limitPrice?: number;
  sourcePlanId?: string;
  note?: string;
}

export interface ClosePaperPositionInput {
  symbol: string;
  note?: string;
}

export interface CancelPaperOrderInput {
  orderId?: string;
  symbol?: string;
}

export interface AttachPaperBracketInput {
  symbol: string;
  takeProfit?: number;
  stopLoss?: number;
  note?: string;
}

export interface LogTradeOpenInput {
  trade: TradeJournalEntry;
}

export interface LogTradeCloseInput {
  tradeId: string;
  closedAt: string;
  exitPrice?: number;
  realizedPnl?: MoneyValue;
  mistakes?: string[];
  lessons?: string[];
  notes?: string[];
}

export interface LogTradeNoteInput {
  tradeId: string;
  note: string;
  notedAt?: string;
  tags?: string[];
}

export interface GetTradeJournalInput {
  state?: TradeState | "all";
  symbol?: string;
  assetClass?: AssetClass;
  setupType?: SetupType;
  limit?: number;
}

export interface TradeOpsReadApi {
  getAccountSnapshot(): Promise<AccountSnapshot>;
  getPositions(): Promise<PositionSnapshot[]>;
  getWorkingOrders(): Promise<WorkingOrderSnapshot[]>;
  getOrderHistory(input?: GetOrderHistoryInput): Promise<OrderHistoryEntry[]>;
  getChartContext(input?: GetChartContextInput): Promise<ChartContext>;
  getIndicatorValues(input?: GetIndicatorValuesInput): Promise<IndicatorValue[]>;
}

export interface TradeOpsPaperWriteApi {
  placePaperOrder(input: PlacePaperOrderInput): Promise<{
    ok: boolean;
    broker: string;
    mode: "paper";
    order?: WorkingOrderSnapshot | OrderHistoryEntry;
    message?: string;
  }>;
  closePaperPosition(input: ClosePaperPositionInput): Promise<{
    ok: boolean;
    broker: string;
    mode: "paper";
    symbol: string;
    message?: string;
  }>;
  cancelPaperOrder(input: CancelPaperOrderInput): Promise<{
    ok: boolean;
    broker: string;
    mode: "paper";
    orderId?: string;
    symbol?: string;
    message?: string;
  }>;
  attachPaperBracket(input: AttachPaperBracketInput): Promise<{
    ok: boolean;
    broker: string;
    mode: "paper";
    symbol: string;
    takeProfit?: number;
    stopLoss?: number;
    message?: string;
  }>;
}

export interface TradeOpsJournalApi {
  logTradeOpen(input: LogTradeOpenInput): Promise<{
    ok: boolean;
    tradeId: string;
    path?: string;
  }>;
  logTradeClose(input: LogTradeCloseInput): Promise<{
    ok: boolean;
    tradeId: string;
    path?: string;
  }>;
  logTradeNote(input: LogTradeNoteInput): Promise<{
    ok: boolean;
    tradeId: string;
    path?: string;
  }>;
  getTradeJournal(input?: GetTradeJournalInput): Promise<TradeJournalEntry[]>;
  getReviewMetrics(startDate: string, endDate: string): Promise<ReviewMetrics>;
}

export interface TradeOpsApi {
  read: TradeOpsReadApi;
  writePaper: TradeOpsPaperWriteApi;
  journal: TradeOpsJournalApi;
}
