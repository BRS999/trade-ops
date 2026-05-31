/**
 * Etherscan adapter — Ethereum on-chain data.
 *
 * Useful signals:
 *   - Whale wallet tracking (large ETH/token holders)
 *   - Exchange inflow/outflow (Coinbase, Binance hot wallets)
 *   - Gas price as a demand/congestion proxy
 *   - ETH price anchor
 *   - Token balance snapshots for DeFi positions
 *
 * Requires ETHERSCAN_API_KEY (free tier: 5 req/s, 100k/day).
 */

export { EtherscanClient, EtherscanError } from "./client.mjs";

const WEI = 1e18;

// ── Account ────────────────────────────────────────────────────────────────

/** ETH balance of an address in ether (not wei). */
export async function getBalance(client, address) {
  const wei = await client.get({ module: "account", action: "balance", address, tag: "latest" });
  return { address, balance_eth: Number(wei) / WEI };
}

/** ERC-20 token transfer list for an address (most recent first). */
export async function getTokenTransfers(client, address, opts = {}) {
  const { contractAddress, startBlock = 0, endBlock = 99999999, page = 1, offset = 50 } = opts;
  const params = { module: "account", action: "tokentx", address, startblock: startBlock, endblock: endBlock, page, offset, sort: "desc" };
  if (contractAddress) params.contractaddress = contractAddress;
  const rows = await client.get(params);
  if (!Array.isArray(rows)) return [];
  return rows.map(r => ({
    hash: r.hash,
    block: Number(r.blockNumber),
    timestamp: new Date(Number(r.timeStamp) * 1000).toISOString(),
    from: r.from,
    to: r.to,
    value: Number(r.value) / 10 ** Number(r.tokenDecimal),
    token_symbol: r.tokenSymbol,
    token_name: r.tokenName,
    contract: r.contractAddress,
  }));
}

/** Normal (ETH) transactions for an address (most recent first). */
export async function getTransactions(client, address, opts = {}) {
  const { startBlock = 0, endBlock = 99999999, page = 1, offset = 25 } = opts;
  const rows = await client.get({ module: "account", action: "txlist", address, startblock: startBlock, endblock: endBlock, page, offset, sort: "desc" });
  if (!Array.isArray(rows)) return [];
  return rows.map(r => ({
    hash: r.hash,
    block: Number(r.blockNumber),
    timestamp: new Date(Number(r.timeStamp) * 1000).toISOString(),
    from: r.from,
    to: r.to,
    value_eth: Number(r.value) / WEI,
    gas_used: Number(r.gasUsed),
    is_error: r.isError === "1",
    method: r.functionName?.split("(")[0] || null,
  }));
}

/** ERC-20 token balances for an address (top holdings). */
export async function getTokenHoldings(client, address) {
  const rows = await client.get({ module: "account", action: "addresstokenbalance", address, page: 1, offset: 50 });
  if (!Array.isArray(rows)) return [];
  return rows.map(r => ({
    token_symbol: r.TokenSymbol,
    token_name: r.TokenName,
    balance: Number(r.TokenQuantity),
    contract: r.TokenAddress,
  }));
}

// ── Gas & price ────────────────────────────────────────────────────────────

/**
 * Current gas oracle: safe, propose, and fast gwei estimates.
 * Useful as a network-congestion / demand proxy for ETH and DeFi names.
 */
export async function getGasOracle(client) {
  const data = await client.get({ module: "gastracker", action: "gasoracle" });
  return {
    safe_gwei: Number(data.SafeGasPrice),
    propose_gwei: Number(data.ProposeGasPrice),
    fast_gwei: Number(data.FastGasPrice),
    base_fee_gwei: Number(data.suggestBaseFee),
  };
}

/** ETH price in USD and BTC from Etherscan's oracle. */
export async function getEthPrice(client) {
  const data = await client.get({ module: "stats", action: "ethprice" });
  return {
    eth_usd: Number(data.ethusd),
    eth_btc: Number(data.ethbtc),
    as_of: new Date(Number(data.ethusd_timestamp) * 1000).toISOString(),
  };
}

// ── Chain stats ────────────────────────────────────────────────────────────

/** Latest finalized block number. */
export async function getLatestBlock(client) {
  const hex = await client.get({ module: "proxy", action: "eth_blockNumber" });
  return { block: parseInt(hex, 16) };
}

/** Total ETH supply. */
export async function getEthSupply(client) {
  const wei = await client.get({ module: "stats", action: "ethsupply" });
  return { supply_eth: Number(wei) / WEI };
}

// ── Snapshot ───────────────────────────────────────────────────────────────

/**
 * Wallet snapshot: ETH balance + top token holdings + recent inflows.
 * One call per address to get a quick DeFi/whale position picture.
 */
export async function getWalletSnapshot(client, address) {
  const [balance, tokens, txs, recentTokenTxs] = await Promise.allSettled([
    getBalance(client, address),
    getTokenHoldings(client, address),
    getTransactions(client, address, { offset: 10 }),
    getTokenTransfers(client, address, { offset: 10 }),
  ]);

  const val = r => r.status === "fulfilled" ? r.value : null;

  return {
    address,
    as_of: new Date().toISOString(),
    eth: val(balance),
    token_holdings: val(tokens),
    recent_eth_txs: val(txs),
    recent_token_txs: val(recentTokenTxs),
  };
}
