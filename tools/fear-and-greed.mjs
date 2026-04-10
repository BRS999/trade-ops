#!/usr/bin/env node

import { getCurrent, getHistory } from "../adapters/fear-and-greed/index.mjs";

const [, , command, ...rest] = process.argv;

try {
  switch (command) {
    case "current":
    case undefined:
      print(await getCurrent());
      break;
    case "history":
      print(await getHistory(Number(rest[0] ?? 7)));
      break;
    default:
      throw new Error(`Unknown command: ${command}. Use: current, history [days]`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}
