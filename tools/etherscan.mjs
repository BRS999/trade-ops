#!/usr/bin/env node

import {
  EtherscanClient,
  getBalance,
  getTokenHoldings,
  getTransactions,
  getTokenTransfers,
  getGasOracle,
  getEthPrice,
  getLatestBlock,
  getWalletSnapshot,
} from "../adapters/etherscan/index.mjs";

const args = process.argv.slice(2);
const chainIdx = args.indexOf("--chain");
const chainId = chainIdx !== -1 ? args.splice(chainIdx, 2)[1] : undefined;
const client = new EtherscanClient(chainId);
const [command, ...rest] = args;

try {
  switch (command) {
    case "balance":
      print(await getBalance(client, requireArg(rest[0], "address")));
      break;
    case "tokens":
      print(await getTokenHoldings(client, requireArg(rest[0], "address")));
      break;
    case "txs":
      print(await getTransactions(client, requireArg(rest[0], "address")));
      break;
    case "token-txs":
      print(await getTokenTransfers(client, requireArg(rest[0], "address")));
      break;
    case "gas":
      print(await getGasOracle(client));
      break;
    case "price":
      print(await getEthPrice(client));
      break;
    case "block":
      print(await getLatestBlock(client));
      break;
    case "snapshot":
      print(await getWalletSnapshot(client, requireArg(rest[0], "address")));
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

function requireArg(value, name) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp() {
  console.log(`Trade Ops Etherscan Tool

Usage:
  node tools/etherscan.mjs <command> [args]

Commands:
  balance  <address>    ETH balance of a wallet
  tokens   <address>    ERC-20 token holdings
  txs      <address>    Recent ETH transactions (25)
  token-txs <address>   Recent ERC-20 token transfers (50)
  gas                   Current gas oracle (safe / propose / fast gwei)
  price                 ETH/USD and ETH/BTC from Etherscan oracle
  block                 Latest finalized block number
  snapshot <address>    Full wallet snapshot (balance + tokens + recent txs)

Options:
  --chain <id>   Chain ID (default: 1 = Ethereum mainnet, or ETHERSCAN_CHAIN_ID env)
                 Common: 1=Ethereum, 10=Optimism, 8453=Base, 42161=Arbitrum, 137=Polygon

Requires:
  ETHERSCAN_API_KEY in .env — free key at https://etherscan.io/myapikey

Examples:
  node tools/etherscan.mjs gas
  node tools/etherscan.mjs price
  node tools/etherscan.mjs balance 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
  node tools/etherscan.mjs snapshot 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

Signals:
  gas       → network demand proxy; elevated fast_gwei = DeFi activity surge
  price     → ETH anchor; compare to CoinGecko for spread arbitrage check
  snapshot  → whale / exchange wallet positioning; watch for large inflows to
              known exchange hot wallets as a distribution signal
`);
}
