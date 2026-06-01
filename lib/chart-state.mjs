import {
  AC,
  ADX,
  AO,
  ATR,
  AccelerationBands,
  BollingerBands,
  BollingerBandsWidth,
  CCI,
  CG,
  DEMA,
  DMA,
  DX,
  EMA,
  IQR,
  LinearRegression,
  MACD,
  MAD,
  MOM,
  OBV,
  PSAR,
  REI,
  RMA,
  ROC,
  RSI,
  SMA,
  SMA15,
  StochasticOscillator,
  StochasticRSI,
  TDS,
  TR,
  VWAP,
  WMA,
  WSMA,
  WilliamsR,
  ZigZag,
} from "trading-signals";

/**
 * Build source-agnostic, non-prescriptive chart state from normalized candles.
 *
 * @param {Array<object>} rawCandles
 * @param {object} [options]
 * @param {string} [options.symbol]
 * @param {string} [options.timeframe]
 * @returns {object}
 */
export function buildChartState(rawCandles, options = {}) {
  const candles = normalizeCandles(rawCandles);
  if (candles.length === 0) {
    throw new Error("At least one usable candle is required");
  }

  const volumes = candles.map((bar) => bar.volume).filter((value) => Number.isFinite(value));
  const last = candles.at(-1);
  const previous = candles.length >= 2 ? candles.at(-2) : null;

  const indicatorInputs = createIndicators();
  for (const candle of candles) {
    const hl = { high: candle.high, low: candle.low };
    const hlc = { high: candle.high, low: candle.low, close: candle.close };
    const hlcv = { ...hlc, volume: candle.volume ?? 0 };
    const ohlcv = { open: candle.open, ...hlcv };

    indicatorInputs.sma20.add(candle.close);
    indicatorInputs.sma50.add(candle.close);
    indicatorInputs.sma200.add(candle.close);
    indicatorInputs.ema20.add(candle.close);
    indicatorInputs.ema50.add(candle.close);
    indicatorInputs.rma14.add(candle.close);
    indicatorInputs.wma20.add(candle.close);
    indicatorInputs.wsma14.add(candle.close);
    indicatorInputs.dema20.add(candle.close);
    indicatorInputs.sma15.add(candle.close);
    indicatorInputs.dma20_50.add(candle.close);
    indicatorInputs.linreg20.add(candle.close);

    indicatorInputs.rsi14.add(candle.close);
    indicatorInputs.macd.add(candle.close);
    indicatorInputs.ao5_34.add(hl);
    indicatorInputs.ac5_34_5.add(hl);
    indicatorInputs.cci20.add(hlc);
    indicatorInputs.cg10_3.add(candle.close);
    indicatorInputs.mom10.add(candle.close);
    indicatorInputs.rei8.add(hlc);
    indicatorInputs.roc10.add(candle.close);
    indicatorInputs.stoch14_3_3.add(hlc);
    indicatorInputs.stochRsi14.add(candle.close);
    indicatorInputs.tds.add(candle.close);
    indicatorInputs.williamsR14.add(hlc);

    indicatorInputs.adx14.add(hlc);
    indicatorInputs.dx14.add(hlc);
    indicatorInputs.psar.add(hl);
    indicatorInputs.zigzag5.add(hl);

    indicatorInputs.atr14.add(hlc);
    indicatorInputs.tr.add(hlc);
    indicatorInputs.bb20.add(candle.close);
    indicatorInputs.bbw20.add(candle.close);
    indicatorInputs.accelerationBands20.add(hlc);
    indicatorInputs.iqr20.add(candle.close);
    indicatorInputs.mad20.add(candle.close);

    if (Number.isFinite(candle.volume)) {
      indicatorInputs.obv20.add(ohlcv);
      indicatorInputs.vwap.add(hlcv);
    }
  }

  const recent20 = sliceWindow(candles, 20);
  const recent60 = sliceWindow(candles, 60);
  const volume20 = sliceWindow(volumes, 20);
  const indicators = {
    sma20: safeIndicatorResult(indicatorInputs.sma20),
    sma50: safeIndicatorResult(indicatorInputs.sma50),
    sma200: safeIndicatorResult(indicatorInputs.sma200),
    ema20: safeIndicatorResult(indicatorInputs.ema20),
    ema50: safeIndicatorResult(indicatorInputs.ema50),
    rma14: safeIndicatorResult(indicatorInputs.rma14),
    wma20: safeIndicatorResult(indicatorInputs.wma20),
    wsma14: safeIndicatorResult(indicatorInputs.wsma14),
    dema20: safeIndicatorResult(indicatorInputs.dema20),
    sma15: safeIndicatorResult(indicatorInputs.sma15),
    dma20_50: safeIndicatorResult(indicatorInputs.dma20_50),
    linearRegression20: safeIndicatorResult(indicatorInputs.linreg20),
    rsi14: safeIndicatorResult(indicatorInputs.rsi14),
    macd: safeIndicatorResult(indicatorInputs.macd),
    ao5_34: safeIndicatorResult(indicatorInputs.ao5_34),
    ac5_34_5: safeIndicatorResult(indicatorInputs.ac5_34_5),
    cci20: safeIndicatorResult(indicatorInputs.cci20),
    cg10_3: safeIndicatorResult(indicatorInputs.cg10_3),
    mom10: safeIndicatorResult(indicatorInputs.mom10),
    obv20: safeIndicatorResult(indicatorInputs.obv20),
    rei8: safeIndicatorResult(indicatorInputs.rei8),
    roc10: safeIndicatorResult(indicatorInputs.roc10),
    stochastic14_3_3: safeIndicatorResult(indicatorInputs.stoch14_3_3),
    stochasticRsi14: safeIndicatorResult(indicatorInputs.stochRsi14),
    tds: safeIndicatorResult(indicatorInputs.tds),
    williamsR14: safeIndicatorResult(indicatorInputs.williamsR14),
    adx14: safeAdxResult(indicatorInputs.adx14),
    dx14: safeDxResult(indicatorInputs.dx14),
    psar: safeIndicatorResult(indicatorInputs.psar),
    inputVwap: safeIndicatorResult(indicatorInputs.vwap),
    zigzag5: safeIndicatorResult(indicatorInputs.zigzag5),
    atr14: safeIndicatorResult(indicatorInputs.atr14),
    trueRange: safeIndicatorResult(indicatorInputs.tr),
    bollinger20: safeIndicatorResult(indicatorInputs.bb20),
    bollingerWidth20: safeIndicatorResult(indicatorInputs.bbw20),
    accelerationBands20: safeIndicatorResult(indicatorInputs.accelerationBands20),
    iqr20: safeIndicatorResult(indicatorInputs.iqr20),
    mad20: safeIndicatorResult(indicatorInputs.mad20),
    volumeSma20: volume20.length ? mean(volume20) : null,
  };

  const ranges = {
    high20: max(recent20.map((bar) => bar.high)),
    low20: min(recent20.map((bar) => bar.low)),
    high60: max(recent60.map((bar) => bar.high)),
    low60: min(recent60.map((bar) => bar.low)),
  };

  const distances = buildDistances(last.close, indicators, ranges);
  const returns = buildReturns(candles);
  const volatility = buildVolatility(last, indicators);
  const volume = buildVolume(last, indicators);
  const flags = buildFlags({ last, previous, indicators, ranges, distances, returns, volume });
  const facts = buildFacts({ indicators, distances, returns, volume, volatility });

  return {
    symbol: options.symbol ?? null,
    timeframe: options.timeframe ?? null,
    bars: candles.length,
    first: pickCandleFields(candles[0]),
    last: pickCandleFields(last),
    indicators: roundObject(indicators),
    ranges: roundObject(ranges),
    distances: roundObject(distances),
    returns: roundObject(returns),
    volatility: roundObject(volatility),
    volume: roundObject(volume),
    flags,
    facts,
    caveats: [
      "Chart state is descriptive only; it does not produce a trade recommendation.",
      "Levels are derived from candle history and should be checked against liquidity, news, and risk context.",
    ],
  };
}

export function normalizeCandles(rawCandles) {
  if (!Array.isArray(rawCandles)) {
    throw new Error("Candles input must be a JSON array");
  }

  return rawCandles
    .map((raw, index) => normalizeCandle(raw, index))
    .filter(Boolean)
    .sort((a, b) => a.sortTime - b.sortTime);
}

function normalizeCandle(raw, index) {
  if (!raw || typeof raw !== "object") return null;

  const timestamp = raw.timestamp ?? raw.time ?? raw.date ?? raw.t ?? null;
  const sortTime = parseSortTime(timestamp, index);
  const open = toNumber(raw.open ?? raw.o);
  const high = toNumber(raw.high ?? raw.h);
  const low = toNumber(raw.low ?? raw.l);
  const close = toNumber(raw.close ?? raw.c);
  const volume = toNumber(raw.volume ?? raw.v);

  if (![open, high, low, close].every(Number.isFinite)) return null;

  return {
    timestamp: timestamp == null ? null : String(timestamp),
    sortTime,
    open,
    high,
    low,
    close,
    volume: Number.isFinite(volume) ? volume : null,
  };
}

function createIndicators() {
  return {
    sma20: new SMA(20),
    sma50: new SMA(50),
    sma200: new SMA(200),
    ema20: new EMA(20),
    ema50: new EMA(50),
    rma14: new RMA(14),
    wma20: new WMA(20),
    wsma14: new WSMA(14),
    dema20: new DEMA(20),
    sma15: new SMA15(15),
    dma20_50: new DMA(20, 50),
    linreg20: new LinearRegression(20),
    rsi14: new RSI(14),
    macd: new MACD(new EMA(12), new EMA(26), new EMA(9)),
    ao5_34: new AO(5, 34),
    ac5_34_5: new AC(5, 34, 5),
    cci20: new CCI(20),
    cg10_3: new CG(10, 3),
    mom10: new MOM(10),
    obv20: new OBV(20),
    rei8: new REI(8),
    roc10: new ROC(10),
    stoch14_3_3: new StochasticOscillator(14, 3, 3),
    stochRsi14: new StochasticRSI(14),
    tds: new TDS(),
    williamsR14: new WilliamsR(14),
    adx14: new ADX(14),
    dx14: new DX(14),
    psar: new PSAR({ accelerationStep: 0.02, accelerationMax: 0.2 }),
    vwap: new VWAP(),
    zigzag5: new ZigZag({ deviation: 5 }),
    atr14: new ATR(14),
    tr: new TR(),
    bb20: new BollingerBands(20, 2),
    bbw20: new BollingerBandsWidth(new BollingerBands(20, 2)),
    accelerationBands20: new AccelerationBands(20, 4),
    iqr20: new IQR(20),
    mad20: new MAD(20),
  };
}

function buildDistances(close, indicators, ranges) {
  return {
    closeVsSma20Pct: pctDiff(close, indicators.sma20),
    closeVsSma50Pct: pctDiff(close, indicators.sma50),
    closeVsSma200Pct: pctDiff(close, indicators.sma200),
    closeVsEma20Pct: pctDiff(close, indicators.ema20),
    closeVsEma50Pct: pctDiff(close, indicators.ema50),
    closeVsDema20Pct: pctDiff(close, indicators.dema20),
    closeVsInputVwapPct: pctDiff(close, indicators.inputVwap),
    closeVsPsarPct: pctDiff(close, indicators.psar),
    closeVs20dHighPct: pctDiff(close, ranges.high20),
    closeVs20dLowPct: pctDiff(close, ranges.low20),
    closeVs60dHighPct: pctDiff(close, ranges.high60),
    closeVs60dLowPct: pctDiff(close, ranges.low60),
  };
}

function buildReturns(candles) {
  const last = candles.at(-1);
  return {
    oneBarPct: returnOver(candles, 1, last),
    fiveBarPct: returnOver(candles, 5, last),
    twentyBarPct: returnOver(candles, 20, last),
    sixtyBarPct: returnOver(candles, 60, last),
  };
}

function buildVolatility(last, indicators) {
  return {
    atr14: indicators.atr14,
    atr14PctOfClose: pctOf(indicators.atr14, last.close),
    intrabarRangePct: pctOf(last.high - last.low, last.close),
    bollingerWidthPct: indicators.bollinger20
      ? pctOf(indicators.bollinger20.upper - indicators.bollinger20.lower, last.close)
      : null,
    accelerationBandWidthPct: indicators.accelerationBands20
      ? pctOf(indicators.accelerationBands20.upper - indicators.accelerationBands20.lower, last.close)
      : null,
    trueRangePctOfClose: pctOf(indicators.trueRange, last.close),
    iqr20: indicators.iqr20,
    mad20: indicators.mad20,
  };
}

function buildVolume(last, indicators) {
  return {
    current: last.volume,
    sma20: indicators.volumeSma20,
    ratioVsSma20: last.volume != null && indicators.volumeSma20 ? last.volume / indicators.volumeSma20 : null,
  };
}

function buildFlags({ last, previous, indicators, ranges, distances, returns, volume }) {
  const flags = [];

  addFlag(flags, indicators.sma20 != null && last.close < indicators.sma20, "below_sma20");
  addFlag(flags, indicators.sma20 != null && last.close > indicators.sma20, "above_sma20");
  addFlag(flags, indicators.sma50 != null && last.close < indicators.sma50, "below_sma50");
  addFlag(flags, indicators.sma50 != null && last.close > indicators.sma50, "above_sma50");
  addFlag(flags, indicators.sma200 != null && last.close < indicators.sma200, "below_sma200");
  addFlag(flags, indicators.sma200 != null && last.close > indicators.sma200, "above_sma200");
  addFlag(flags, indicators.rsi14 != null && indicators.rsi14 < 30, "rsi_below_30");
  addFlag(flags, indicators.rsi14 != null && indicators.rsi14 < 50, "rsi_below_50");
  addFlag(flags, indicators.rsi14 != null && indicators.rsi14 > 50, "rsi_above_50");
  addFlag(flags, indicators.rsi14 != null && indicators.rsi14 > 70, "rsi_above_70");
  addFlag(flags, indicators.macd?.histogram != null && indicators.macd.histogram < 0, "macd_histogram_negative");
  addFlag(flags, indicators.macd?.histogram != null && indicators.macd.histogram > 0, "macd_histogram_positive");
  addFlag(flags, indicators.roc10 != null && indicators.roc10 < 0, "roc10_negative");
  addFlag(flags, indicators.roc10 != null && indicators.roc10 > 0, "roc10_positive");
  addFlag(flags, indicators.cci20 != null && indicators.cci20 <= -100, "cci20_below_minus_100");
  addFlag(flags, indicators.cci20 != null && indicators.cci20 >= 100, "cci20_above_100");
  addFlag(flags, indicators.stochastic14_3_3?.stochK != null && indicators.stochastic14_3_3.stochK <= 20, "stoch_k_below_20");
  addFlag(flags, indicators.stochastic14_3_3?.stochK != null && indicators.stochastic14_3_3.stochK >= 80, "stoch_k_above_80");
  addFlag(flags, indicators.williamsR14 != null && indicators.williamsR14 <= -80, "williams_r_below_minus_80");
  addFlag(flags, indicators.williamsR14 != null && indicators.williamsR14 >= -20, "williams_r_above_minus_20");
  addFlag(flags, indicators.adx14?.adx != null && indicators.adx14.adx >= 25, "adx14_above_25");
  addFlag(flags, indicators.psar != null && last.close < indicators.psar, "close_below_psar");
  addFlag(flags, indicators.psar != null && last.close > indicators.psar, "close_above_psar");
  addFlag(flags, indicators.bollinger20?.lower != null && last.close < indicators.bollinger20.lower, "close_below_bollinger_lower");
  addFlag(flags, indicators.bollinger20?.upper != null && last.close > indicators.bollinger20.upper, "close_above_bollinger_upper");
  addFlag(
    flags,
    indicators.accelerationBands20?.lower != null && last.close < indicators.accelerationBands20.lower,
    "close_below_acceleration_band_lower",
  );
  addFlag(
    flags,
    indicators.accelerationBands20?.upper != null && last.close > indicators.accelerationBands20.upper,
    "close_above_acceleration_band_upper",
  );
  addFlag(flags, ranges.low20 != null && distances.closeVs20dLowPct != null && distances.closeVs20dLowPct <= 3, "near_20_bar_low");
  addFlag(flags, ranges.high20 != null && distances.closeVs20dHighPct != null && distances.closeVs20dHighPct >= -3, "near_20_bar_high");
  addFlag(flags, returns.twentyBarPct != null && returns.twentyBarPct <= -8, "down_more_than_8pct_in_20_bars");
  addFlag(flags, returns.twentyBarPct != null && returns.twentyBarPct >= 8, "up_more_than_8pct_in_20_bars");
  addFlag(flags, volume.ratioVsSma20 != null && volume.ratioVsSma20 >= 1.5, "volume_above_1_5x_20bar_average");
  addFlag(flags, previous != null && last.close > previous.close, "close_above_prior_close");
  addFlag(flags, previous != null && last.close < previous.close, "close_below_prior_close");

  return flags;
}

function buildFacts({ indicators, distances, returns, volume, volatility }) {
  const facts = [];

  addFact(facts, distances.closeVsSma20Pct, (value) => `Close is ${formatPct(value)} vs SMA20.`);
  addFact(facts, distances.closeVsSma50Pct, (value) => `Close is ${formatPct(value)} vs SMA50.`);
  addFact(facts, distances.closeVsSma200Pct, (value) => `Close is ${formatPct(value)} vs SMA200.`);
  addFact(facts, distances.closeVsEma20Pct, (value) => `Close is ${formatPct(value)} vs EMA20.`);
  addFact(facts, distances.closeVsInputVwapPct, (value) => `Close is ${formatPct(value)} vs input-window VWAP.`);
  addFact(facts, indicators.rsi14, (value) => `RSI14 is ${formatNumber(value)}.`);
  if (indicators.macd) {
    facts.push(`MACD histogram is ${formatNumber(indicators.macd.histogram)}.`);
  }
  addFact(facts, indicators.adx14?.adx, (value) => `ADX14 is ${formatNumber(value)}.`);
  addFact(facts, indicators.cci20, (value) => `CCI20 is ${formatNumber(value)}.`);
  addFact(facts, indicators.roc10, (value) => `ROC10 is ${formatPct(value * 100)}.`);
  addFact(facts, indicators.stochastic14_3_3?.stochK, (value) => `Stochastic %K is ${formatNumber(value)}.`);
  addFact(facts, indicators.williamsR14, (value) => `Williams %R is ${formatNumber(value)}.`);
  addFact(facts, distances.closeVs20dHighPct, (value) => `Close is ${formatPct(value)} vs 20-bar high.`);
  addFact(facts, distances.closeVs20dLowPct, (value) => `Close is ${formatPct(value)} vs 20-bar low.`);
  addFact(facts, returns.fiveBarPct, (value) => `Five-bar return is ${formatPct(value)}.`);
  addFact(facts, returns.twentyBarPct, (value) => `Twenty-bar return is ${formatPct(value)}.`);
  addFact(facts, volatility.atr14PctOfClose, (value) => `ATR14 is ${formatPct(value)} of close.`);
  addFact(facts, volume.ratioVsSma20, (value) => `Volume is ${formatNumber(value)}x its 20-bar average.`);

  return facts;
}

function safeIndicatorResult(indicator) {
  try {
    return indicator.isStable ? indicator.getResult() : null;
  } catch {
    return null;
  }
}

function safeAdxResult(indicator) {
  const adx = safeIndicatorResult(indicator);
  if (adx == null) return null;
  return {
    adx,
    pdi: safeNumber(indicator.pdi),
    mdi: safeNumber(indicator.mdi),
  };
}

function safeDxResult(indicator) {
  const dx = safeIndicatorResult(indicator);
  if (dx == null) return null;
  return {
    dx,
    pdi: safeNumber(indicator.pdi),
    mdi: safeNumber(indicator.mdi),
  };
}

function pickCandleFields(candle) {
  return {
    timestamp: candle.timestamp,
    open: round(candle.open),
    high: round(candle.high),
    low: round(candle.low),
    close: round(candle.close),
    volume: candle.volume,
  };
}

function returnOver(candles, barsBack, last) {
  if (candles.length <= barsBack) return null;
  return pctDiff(last.close, candles.at(-(barsBack + 1)).close);
}

function addFlag(flags, condition, flag) {
  if (condition) flags.push(flag);
}

function addFact(facts, value, formatter) {
  if (value == null || !Number.isFinite(Number(value))) return;
  facts.push(formatter(Number(value)));
}

function pctDiff(value, base) {
  if (value == null || base == null || !Number.isFinite(value) || !Number.isFinite(base) || base === 0) return null;
  return (value / base - 1) * 100;
}

function pctOf(value, base) {
  if (value == null || base == null || !Number.isFinite(value) || !Number.isFinite(base) || base === 0) return null;
  return (value / base) * 100;
}

function mean(values) {
  const usable = values.filter((value) => Number.isFinite(value));
  if (!usable.length) return null;
  return usable.reduce((sum, value) => sum + value, 0) / usable.length;
}

function min(values) {
  const usable = values.filter((value) => Number.isFinite(value));
  return usable.length ? Math.min(...usable) : null;
}

function max(values) {
  const usable = values.filter((value) => Number.isFinite(value));
  return usable.length ? Math.max(...usable) : null;
}

function sliceWindow(values, size) {
  return values.slice(Math.max(0, values.length - size));
}

function toNumber(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function safeNumber(value) {
  return Number.isFinite(value) ? value : null;
}

function parseSortTime(timestamp, fallback) {
  if (timestamp == null) return fallback;
  if (typeof timestamp === "number") {
    return timestamp > 1_000_000_000_000 ? timestamp : timestamp * 1000;
  }
  const number = Number(timestamp);
  if (Number.isFinite(number)) {
    return number > 1_000_000_000_000 ? number : number * 1000;
  }
  const date = Date.parse(String(timestamp));
  return Number.isFinite(date) ? date : fallback;
}

function roundObject(value) {
  if (value == null) return null;
  if (typeof value === "number") return round(value);
  if (Array.isArray(value)) return value.map(roundObject);
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, roundObject(item)]));
  }
  return value;
}

function round(value) {
  if (value == null || !Number.isFinite(value)) return value;
  return Number(value.toFixed(6));
}

function formatNumber(value) {
  return round(value).toString();
}

function formatPct(value) {
  return `${formatNumber(value)}%`;
}
