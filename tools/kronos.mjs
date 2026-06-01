#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const kronosCacheRoot = path.join(repoRoot, "tmp", "kronos-native");
const forecastRoot = path.join(repoRoot, "tmp", "forecasts", "kronos");
const nativeVenv = path.join(kronosCacheRoot, ".venv");
const nativePython = path.join(nativeVenv, "bin", "python");
const nativeRepo = path.join(kronosCacheRoot, "Kronos");
const [, , command = "help"] = process.argv;

try {
  switch (command) {
    case "setup":
      runNativeSetup();
      break;
    case "check":
      runNativeCheck();
      break;
    case "example":
      runNativeExample();
      break;
    case "forecast":
      runNativeForecast(process.argv.slice(3));
      break;
    case "help":
      printHelp();
      break;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

function runNativeSetup() {
  ensureUv();
  runHost("mkdir", ["-p", kronosCacheRoot]);

  if (!existsSync(nativeRepo)) {
    runHost("git", ["clone", "--depth=1", "https://github.com/shiyu-coder/Kronos.git", nativeRepo]);
  }

  if (!existsSync(nativePython)) {
    runHost("uv", ["venv", "--python", "3.11", "--seed", nativeVenv]);
  }

  runHost("uv", ["pip", "install", "--python", nativePython, "torch", "numpy", "pandas"]);
  runHost("uv", ["pip", "install", "--python", nativePython, "-r", path.join(nativeRepo, "requirements.txt")]);
}

function runNativeCheck() {
  ensureNativeSetup();
  runHost(nativePython, [
    "-c",
    [
      "import json",
      "import os",
      "import sys",
      `sys.path.insert(0, ${JSON.stringify(nativeRepo)})`,
      "import torch",
      "from model import Kronos, KronosPredictor, KronosTokenizer",
      "payload = {",
      "  'python': sys.version.split()[0],",
      "  'torch': torch.__version__,",
      "  'mps_built': hasattr(torch.backends, 'mps'),",
      "  'mps_available': hasattr(torch.backends, 'mps') and torch.backends.mps.is_available(),",
      `  'native_repo': os.path.exists(${JSON.stringify(path.join(nativeRepo, "README.md"))}),`,
      "  'imports': ['Kronos', 'KronosPredictor', 'KronosTokenizer']",
      "}",
      "print(json.dumps(payload, indent=2))"
    ].join("\n")
  ]);
}

function runNativeExample() {
  ensureNativeSetup();
  runHost(nativePython, [
    "-c",
    [
      "import sys",
      `sys.path.insert(0, ${JSON.stringify(nativeRepo)})`,
      "import numpy as np",
      "import pandas as pd",
      "import torch",
      "from model import Kronos, KronosTokenizer, KronosPredictor",
      "device = 'mps' if hasattr(torch.backends, 'mps') and torch.backends.mps.is_available() else 'cpu'",
      "tokenizer = KronosTokenizer.from_pretrained('NeoQuasar/Kronos-Tokenizer-base')",
      "model = Kronos.from_pretrained('NeoQuasar/Kronos-small')",
      "predictor = KronosPredictor(model, tokenizer, device=device, max_context=512)",
      "timestamps = pd.date_range('2026-01-01', periods=520, freq='5min')",
      "base = np.linspace(100.0, 110.0, 520)",
      "wave = np.sin(np.arange(520) / 12.0) * 0.8",
      "close = base + wave",
      "open_ = close + np.sin(np.arange(520) / 7.0) * 0.15",
      "high = np.maximum(open_, close) + 0.25",
      "low = np.minimum(open_, close) - 0.25",
      "df = pd.DataFrame({",
      "  'timestamps': timestamps,",
      "  'open': open_,",
      "  'high': high,",
      "  'low': low,",
      "  'close': close",
      "})",
      "lookback = 400",
      "pred_len = 24",
      "x_df = df.loc[:lookback-1, ['open', 'high', 'low', 'close']]",
      "x_timestamp = df.loc[:lookback-1, 'timestamps']",
      "y_timestamp = pd.Series(df.loc[lookback:lookback+pred_len-1, 'timestamps'])",
      "pred_df = predictor.predict(df=x_df, x_timestamp=x_timestamp, y_timestamp=y_timestamp, pred_len=pred_len, T=1.0, top_p=0.9, sample_count=1, verbose=True)",
      "print('device:', device)",
      "print('Forecasted Data Head:')",
      "print(pred_df.head().to_string())"
    ].join("\n")
  ]);
}

function runNativeForecast(args) {
  ensureNativeSetup();

  const symbol = requireArg(args[0], "symbol");
  const options = parseForecastOptions(args.slice(1));

  mkdirSync(kronosCacheRoot, { recursive: true });
  mkdirSync(forecastRoot, { recursive: true });

  const outputPath = path.join(forecastRoot, `${sanitizeSymbol(symbol)}.json`);

  let inputPath;
  if (options.inputFile) {
    inputPath = options.inputFile;
  } else if (options.stdin) {
    const raw = readFileSync("/dev/stdin", "utf8");
    const bars = JSON.parse(raw);
    inputPath = path.join(kronosCacheRoot, `${sanitizeSymbol(symbol)}.json`);
    writeFileSync(inputPath, JSON.stringify(bars, null, 2));
  } else {
    throw new Error("No candle data provided. Pipe bars via stdin or use --input <file>.\nExample: npm run alpaca -- bars AAPL | npm run kronos -- forecast AAPL --stdin");
  }

  runKronosForecast(nativePython, [
    "-c",
    [
      "import json",
      "import sys",
      `sys.path.insert(0, ${JSON.stringify(nativeRepo)})`,
      "import pandas as pd",
      "import torch",
      "from pathlib import Path",
      "from model import Kronos, KronosTokenizer, KronosPredictor",
      `symbol = ${JSON.stringify(symbol)}`,
      `lookback = ${String(options.lookback)}`,
      `pred_len = ${String(options.predLen)}`,
      `interval = ${JSON.stringify(options.interval)}`,
      `input_path = Path(${JSON.stringify(inputPath)})`,
      "bars = json.loads(input_path.read_text())",
      "df = pd.DataFrame(bars)",
      "if 'timestamp' in df.columns:",
      "    df['timestamps'] = pd.to_datetime(df['timestamp'], unit='s')",
      "elif 'date' in df.columns:",
      "    df['timestamps'] = pd.to_datetime(df['date'])",
      "else:",
      "    raise KeyError('bars must have a timestamp (unix s) or date (ISO) field')",
      "df = df[['timestamps', 'open', 'high', 'low', 'close']].copy()",
      "x_df = df.tail(lookback)[['open', 'high', 'low', 'close']].reset_index(drop=True)",
      "x_timestamp = df.tail(lookback)['timestamps'].reset_index(drop=True)",
      "if interval.endswith('h'):",
      "    freq = interval",
      "    start = x_timestamp.iloc[-1] + pd.Timedelta(hours=1)",
      "    y_timestamp = pd.Series(pd.date_range(start=start, periods=pred_len, freq=freq))",
      "else:",
      "    start = x_timestamp.iloc[-1] + pd.offsets.BDay(1)",
      "    y_timestamp = pd.Series(pd.bdate_range(start=start, periods=pred_len))",
      "device = 'mps' if hasattr(torch.backends, 'mps') and torch.backends.mps.is_available() else 'cpu'",
      "tokenizer = KronosTokenizer.from_pretrained('NeoQuasar/Kronos-Tokenizer-base')",
      "model = Kronos.from_pretrained('NeoQuasar/Kronos-small')",
      "predictor = KronosPredictor(model, tokenizer, device=device, max_context=512)",
      "pred_df = predictor.predict(df=x_df, x_timestamp=x_timestamp, y_timestamp=y_timestamp, pred_len=pred_len, T=1.0, top_p=0.9, sample_count=1, verbose=False)",
      "last_close = float(df['close'].iloc[-1])",
      "payload = {",
      "  'symbol': symbol,",
      "  'device': device,",
      "  'input_bars': len(df),",
      "  'lookback': lookback,",
      "  'pred_len': pred_len,",
      "  'interval': interval,",
      "  'last_timestamp': str(df['timestamps'].iloc[-1]),",
      "  'last_close': last_close,",
      "  'predictions': [",
      "    {",
      "      'timestamp': str(idx),",
      "      'open': float(row['open']),",
      "      'high': float(row['high']),",
      "      'low': float(row['low']),",
      "      'close': float(row['close']),",
      "      'close_change_pct_vs_last': (float(row['close']) / last_close - 1.0) * 100.0,",
      "    }",
      "    for idx, row in pred_df.iterrows()",
      "  ]",
      "}",
      "print(json.dumps(payload, indent=2))"
    ].join("\n")
  ], outputPath);
}

function runKronosForecast(cmd, args, outputPath) {
  const result = spawnSync(cmd, args, { cwd: repoRoot, encoding: "utf8" });

  if (result.error) throw result.error;
  if (typeof result.status === "number" && result.status !== 0) {
    process.stderr.write(result.stderr ?? "");
    process.exit(result.status);
  }

  // Parse stdout to validate JSON, then write to file
  const payload = JSON.parse(result.stdout);
  writeFileSync(outputPath, JSON.stringify(payload, null, 2));
  console.log(JSON.stringify(payload, null, 2));
}

function runHost(cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: repoRoot,
    stdio: "inherit"
  });

  if (result.error) throw result.error;
  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }
}

function ensureUv() {
  const result = spawnSync("uv", ["--version"], { cwd: repoRoot, stdio: "ignore" });
  if (result.error || result.status !== 0) {
    throw new Error("uv is required for Kronos setup");
  }
}

function ensureNativeSetup() {
  if (!existsSync(nativePython) || !existsSync(nativeRepo)) {
    throw new Error("Kronos environment is not set up. Run `npm run kronos -- setup` first.");
  }
}

function parseForecastOptions(args) {
  const options = {
    interval: "1d",
    lookback: undefined,
    predLen: undefined
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--interval") {
      options.interval = requireArg(args[index + 1], "interval");
      index += 1;
      continue;
    }
    if (arg === "--lookback") {
      options.lookback = Number.parseInt(requireArg(args[index + 1], "lookback"), 10);
      index += 1;
      continue;
    }
    if (arg === "--pred-len") {
      options.predLen = Number.parseInt(requireArg(args[index + 1], "pred-len"), 10);
      index += 1;
      continue;
    }
    if (arg === "--input") {
      options.inputFile = requireArg(args[index + 1], "input");
      index += 1;
      continue;
    }
    if (arg === "--stdin") {
      options.stdin = true;
      continue;
    }
    throw new Error(`Unknown forecast option: ${arg}`);
  }

  if (!options.lookback) {
    options.lookback = options.interval.endsWith("h") ? 96 : 100;
  }

  if (!options.predLen) {
    options.predLen = options.interval.endsWith("h") ? 8 : 5;
  }

  return options;
}

function requireArg(value, name) {
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}


function sanitizeSymbol(symbol) {
  return symbol.replaceAll(/[^A-Za-z0-9_-]+/g, "_");
}

function printHelp() {
  console.log(`Trade Ops Kronos Tool

Usage:
  node tools/kronos.mjs setup
  node tools/kronos.mjs check
  node tools/kronos.mjs example
  node tools/kronos.mjs forecast <symbol> [--range 6mo] [--interval 1d] [--lookback 100] [--pred-len 5]

Commands:
  setup     Create a local Python env for Kronos under tmp/ and install deps
  check     Verify PyTorch and Kronos imports, including MPS availability
  example   Run a synthetic forecast using MPS when available
  forecast  Run a forecast from piped or file candle data, write tmp/forecasts/kronos/<symbol>.json

Candle input (required — no built-in data source):
  --stdin           Read JSON bars from stdin (pipe from any bars command)
  --input <file>    Read JSON bars from a file

Examples:
  npm run kronos -- setup
  npm run kronos -- check
  npm run kronos -- example
  npm run alpaca -- bars AAPL | npm run kronos -- forecast AAPL --stdin
  npm run kronos -- forecast AAPL --input tmp/bars/AAPL.json
`);
}
