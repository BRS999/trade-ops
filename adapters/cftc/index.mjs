/**
 * CFTC adapter — Commitment of Traders (COT) data.
 *
 * Free public API from the CFTC via Socrata. No key required.
 * Reports release every Friday at 3:30pm ET for the prior Tuesday's positions.
 *
 * Usage:
 *   import { CftcClient, getCOT, getCOTSnapshot } from './adapters/cftc/index.mjs';
 *   const client = new CftcClient();
 *   const gold = await getCOT(client, 'gold');
 *   const all  = await getCOTSnapshot(client);
 */

export { CftcClient, CftcError } from "./client.mjs";
export { getCOT, getCOTSnapshot, INSTRUMENT_KEYS } from "./cot.mjs";
