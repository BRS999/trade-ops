# SEC EDGAR Adapter

This module will own filings and company-facts integration from SEC EDGAR.

This adapter uses public SEC endpoints and does not require an API key.

Current scope:

- ticker/CIK resolution
- company submissions lookup
- recent filing lookup
- company facts retrieval
- event enrichment for equity workflows

Files:

- [client.mjs](/Users/benjaminspencer/git/trade-ops/adapters/sec-edgar/client.mjs)
- [company.mjs](/Users/benjaminspencer/git/trade-ops/adapters/sec-edgar/company.mjs)
- [index.mjs](/Users/benjaminspencer/git/trade-ops/adapters/sec-edgar/index.mjs)

Current exported methods:

- `resolveEntity(client, tickerOrCik)`
- `getCompanySubmissions(client, tickerOrCik)`
- `getRecentFilings(client, tickerOrCik, { forms, limit })`
- `getCompanyFacts(client, tickerOrCik)`
- `getLatestFiling(client, tickerOrCik, form)`
- `getRecent8K(client, tickerOrCik, limit)`
- `getFactConcept(client, tickerOrCik, concept, { limit })`

Notes:

- SEC requests should send a browser-like or otherwise acceptable `User-Agent`
- the current adapter ships with built-in request headers and does not require an env var for user-agent configuration
- this adapter is for public filings/facts enrichment, not market data
