#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const [, , command = "help"] = process.argv;

try {
  switch (command) {
    case "up":
      runCompose(["up", "-d", "kronos"]);
      break;
    case "down":
      runCompose(["down"]);
      break;
    case "ps":
      runCompose(["ps"]);
      break;
    case "shell":
      runCompose(["exec", "kronos", "bash"]);
      break;
    case "check":
      runCheck();
      break;
    case "example":
      runExample();
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

function runCheck() {
  runCompose([
    "run",
    "--rm",
    "kronos",
    "python",
    "-c",
    [
      "import json",
      "import os",
      "import sys",
      "sys.path.insert(0, '/opt/Kronos')",
      "import torch",
      "from model import Kronos, KronosPredictor, KronosTokenizer",
      "payload = {",
      "  'python': sys.version.split()[0],",
      "  'torch': torch.__version__,",
      "  'cuda': torch.cuda.is_available(),",
      "  'kronos_repo': os.path.exists('/opt/Kronos/README.md'),",
      "  'imports': ['Kronos', 'KronosPredictor', 'KronosTokenizer']",
      "}",
      "print(json.dumps(payload, indent=2))"
    ].join("\n")
  ]);
}

function runExample() {
  runCompose([
    "run",
    "--rm",
    "kronos",
    "python",
    "-c",
    [
      "import sys",
      "sys.path.insert(0, '/opt/Kronos')",
      "import numpy as np",
      "import pandas as pd",
      "from model import Kronos, KronosTokenizer, KronosPredictor",
      "tokenizer = KronosTokenizer.from_pretrained('NeoQuasar/Kronos-Tokenizer-base')",
      "model = Kronos.from_pretrained('NeoQuasar/Kronos-small')",
      "predictor = KronosPredictor(model, tokenizer, device='cpu', max_context=512)",
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
      "pred_len = 120",
      "x_df = df.loc[:lookback-1, ['open', 'high', 'low', 'close']]",
      "x_timestamp = df.loc[:lookback-1, 'timestamps']",
      "y_timestamp = df.loc[lookback:lookback+pred_len-1, 'timestamps']",
      "pred_df = predictor.predict(df=x_df, x_timestamp=x_timestamp, y_timestamp=y_timestamp, pred_len=pred_len, T=1.0, top_p=0.9, sample_count=1, verbose=True)",
      "print('Forecasted Data Head:')",
      "print(pred_df.head().to_string())"
    ].join("\n")
  ]);
}

function runCompose(args) {
  ensureComposeFile();
  const result = spawnSync("docker", ["compose", ...args], {
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

function ensureComposeFile() {
  const composePath = path.join(repoRoot, "compose.yaml");
  if (!existsSync(composePath)) {
    throw new Error(`Missing compose file at ${composePath}`);
  }
}

function printHelp() {
  console.log(`Trade Ops Kronos Tool

Usage:
  node tools/kronos.mjs shell
  node tools/kronos.mjs check
  node tools/kronos.mjs example

Commands:
  up       Start the Kronos container in the background
  down     Stop the Kronos container and related compose resources
  ps       Show the Kronos compose status
  shell    Open an interactive shell in the Kronos container
  check    Verify the container can import Kronos and PyTorch
  example  Run the upstream no-volume example script

Examples:
  npm run kronos -- up
  npm run kronos -- ps
  npm run kronos -- check
  npm run kronos -- shell
  npm run kronos -- example
`);
}
