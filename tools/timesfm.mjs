#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const timesfmRoot = path.join(repoRoot, "tmp", "timesfm-native");
const nativeRepo = path.join(timesfmRoot, "timesfm");
const forecastRoot = path.join(repoRoot, "tmp", "forecasts", "timesfm");
const nativeVenv = path.join(timesfmRoot, ".venv");
const nativePython = path.join(nativeVenv, "bin", "python");
const forecastScript = path.join(repoRoot, "tools", "forecasting", "timesfm_forecast.py");
const [, , command = "help"] = process.argv;

try {
  switch (command) {
    case "setup":
      runSetup();
      break;
    case "check":
      runCheck();
      break;
    case "example":
      runExample(process.argv.slice(3));
      break;
    case "forecast":
      runForecast(process.argv.slice(3));
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

function runSetup() {
  ensureUv();
  runHost("mkdir", ["-p", timesfmRoot]);

  if (!existsSync(nativeRepo)) {
    runHost("git", ["clone", "--depth=1", "https://github.com/google-research/timesfm.git", nativeRepo]);
  }

  if (!existsSync(nativePython)) {
    runHost("uv", ["venv", "--python", "3.11", "--seed", nativeVenv]);
  }

  runHost("uv", ["pip", "install", "--python", nativePython, "-e", `${nativeRepo}[torch]`]);
  runHost("uv", ["pip", "install", "--python", nativePython, "numpy", "torch"]);
}

function runCheck() {
  ensureSetup();
  runHost(nativePython, [
    "-c",
    [
      "import importlib.metadata as metadata",
      "import json",
      "import sys",
      "import torch",
      "import timesfm",
      "payload = {",
      "  'python': sys.version.split()[0],",
      "  'torch': torch.__version__,",
      "  'timesfm': metadata.version('timesfm'),",
      "  'mps_built': hasattr(torch.backends, 'mps'),",
      "  'mps_available': hasattr(torch.backends, 'mps') and torch.backends.mps.is_available(),",
      "  'imports': ['timesfm', 'TimesFM_2p5_200M_torch', 'ForecastConfig']",
      "}",
      "print(json.dumps(payload, indent=2))"
    ].join("\n")
  ]);
}

function runExample(args) {
  ensureSetup();
  const options = parseForecastOptions(args, { allowSymbol: false });
  runTimesfmPython({
    mode: "example",
    options,
    inputPath: null
  });
}

function runForecast(args) {
  ensureSetup();
  const symbol = requireArg(args[0], "symbol");
  const options = parseForecastOptions(args.slice(1), { allowSymbol: true });

  mkdirSync(timesfmRoot, { recursive: true });
  mkdirSync(forecastRoot, { recursive: true });

  const stem = `${sanitizeSymbol(symbol)}-${options.range}-${options.interval}`;
  const outputPath = path.join(forecastRoot, `${stem}.json`);

  let inputPath;
  if (options.inputFile) {
    inputPath = options.inputFile;
  } else {
    const bars = fetchYahooBars(symbol, options);
    const usableBars = bars.filter((bar) => Number.isFinite(Number(bar.close)) && Number(bar.close) > 0);
    if (usableBars.length < options.minBars) {
      throw new Error(`Need at least ${options.minBars} usable bars; got ${usableBars.length}`);
    }
    inputPath = path.join(timesfmRoot, `${stem}.json`);
    writeFileSync(inputPath, JSON.stringify(usableBars, null, 2));
  }

  runTimesfmPython({
    mode: "forecast",
    options: { ...options, symbol, outputPath },
    inputPath
  });
}

function runTimesfmPython({ mode, options, inputPath }) {
  const args = [
    forecastScript,
    mode,
    "--model-id",
    options.modelId,
    "--prediction-length",
    String(options.predictionLength),
    "--max-context",
    String(options.maxContext)
  ];

  if (options.localFilesOnly) {
    args.push("--local-files-only");
  }

  if (mode === "forecast") {
    args.push(
      "--symbol",
      options.symbol,
      "--interval",
      options.interval,
      "--input",
      inputPath,
      "--output",
      options.outputPath
    );
  }

  runHost(nativePython, args);
}

function parseForecastOptions(args, { allowSymbol }) {
  const options = {
    range: "6mo",
    interval: "1d",
    minBars: 24,
    modelId: "google/timesfm-2.5-200m-pytorch",
    predictionLength: 8,
    maxContext: 1024,
    localFilesOnly: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--range") {
      if (!allowSymbol) {
        throw new Error("--range is only valid for forecast");
      }
      options.range = requireArg(args[index + 1], "range");
      index += 1;
      continue;
    }
    if (arg === "--interval") {
      if (!allowSymbol) {
        throw new Error("--interval is only valid for forecast");
      }
      options.interval = requireArg(args[index + 1], "interval");
      index += 1;
      continue;
    }
    if (arg === "--model-id") {
      options.modelId = requireArg(args[index + 1], "model-id");
      index += 1;
      continue;
    }
    if (arg === "--prediction-length") {
      options.predictionLength = parsePositiveInt(requireArg(args[index + 1], "prediction-length"), "prediction-length");
      index += 1;
      continue;
    }
    if (arg === "--max-context") {
      options.maxContext = parsePositiveInt(requireArg(args[index + 1], "max-context"), "max-context");
      index += 1;
      continue;
    }
    if (arg === "--min-bars") {
      options.minBars = parsePositiveInt(requireArg(args[index + 1], "min-bars"), "min-bars");
      index += 1;
      continue;
    }
    if (arg === "--local-files-only") {
      options.localFilesOnly = true;
      continue;
    }
    if (arg === "--input") {
      options.inputFile = requireArg(args[index + 1], "input");
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function fetchYahooBars(symbol, options) {
  const result = spawnSync(
    "node",
    [
      path.join(repoRoot, "tools", "yahoo.mjs"),
      "bars",
      symbol,
      "--range",
      options.range,
      "--interval",
      options.interval
    ],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  );

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status === "number" && result.status !== 0) {
    throw new Error(result.stderr || `Yahoo bars command failed with status ${result.status}`);
  }

  return JSON.parse(result.stdout);
}

function ensureUv() {
  const result = spawnSync("uv", ["--version"], { cwd: repoRoot, stdio: "ignore" });
  if (result.error || result.status !== 0) {
    throw new Error("uv is required for native TimesFM setup");
  }
}

function ensureSetup() {
  if (!existsSync(nativePython) || !existsSync(nativeRepo)) {
    throw new Error("Native TimesFM environment is not set up. Run `npm run timesfm -- setup` first.");
  }
}

function runHost(cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: repoRoot,
    stdio: "inherit"
  });

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }
}

function parsePositiveInt(value, name) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
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
  console.log(`Trade Ops TimesFM Tool

Usage:
  node tools/timesfm.mjs setup
  node tools/timesfm.mjs check
  node tools/timesfm.mjs example [--model-id google/timesfm-2.5-200m-pytorch] [--prediction-length 8] [--max-context 1024]
  node tools/timesfm.mjs forecast <symbol> [--range 6mo] [--interval 1d] [--prediction-length 8] [--max-context 1024] [--local-files-only]

Commands:
  setup     Create a local Python env under tmp/ and install TimesFM deps
  check     Verify native PyTorch and TimesFM imports
  example   Run a synthetic local forecast
  forecast  Run a local forecast on Yahoo bars and write tmp/forecasts/timesfm/*.json

Examples:
  npm run timesfm -- setup
  npm run timesfm -- check
  npm run timesfm -- example
  npm run timesfm -- forecast BTC-USD --range 5d --interval 1h --prediction-length 12
  npm run timesfm -- forecast BTC-USD --range 5d --interval 1h --prediction-length 12 --local-files-only
  npm run timesfm -- forecast TSM --range 6mo --interval 1d --prediction-length 5
`);
}
