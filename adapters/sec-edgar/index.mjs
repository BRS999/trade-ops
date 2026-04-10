/**
 * SEC EDGAR adapter — public filings and company facts.
 *
 * Current scope:
 * - resolve ticker/CIK
 * - fetch company submissions
 * - fetch recent filings
 * - fetch company facts
 */

export { SecEdgarClient, SecEdgarError, normalizeCik } from "./client.mjs";
export {
  resolveEntity,
  getCompanySubmissions,
  getRecentFilings,
  getCompanyFacts,
  getLatestFiling,
  getRecent8K,
  getFactConcept,
} from "./company.mjs";
