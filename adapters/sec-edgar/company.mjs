import { normalizeCik } from "./client.mjs";

export async function resolveEntity(client, tickerOrCik) {
  if (!tickerOrCik) {
    throw new Error("tickerOrCik is required");
  }

  const raw = String(tickerOrCik).trim();
  const digitsOnly = raw.replace(/\D/g, "");

  if (digitsOnly && digitsOnly.length >= 1 && digitsOnly.length <= 10 && raw === digitsOnly) {
    const cik = normalizeCik(raw);
    const mapping = await client.getTickerMap();
    const match = mapping.find((entry) => entry.cik === cik);
    return {
      cik,
      ticker: match?.ticker ?? null,
      title: match?.title ?? null,
    };
  }

  const ticker = raw.toUpperCase();
  const mapping = await client.getTickerMap();
  const match = mapping.find((entry) => entry.ticker === ticker);
  if (!match) {
    throw new Error(`No SEC ticker mapping found for ${ticker}`);
  }

  return {
    cik: match.cik,
    ticker: match.ticker,
    title: match.title,
  };
}

export async function getCompanySubmissions(client, tickerOrCik) {
  const entity = await resolveEntity(client, tickerOrCik);
  const data = await client.get(`/submissions/CIK${entity.cik}.json`);
  return {
    cik: entity.cik,
    ticker: entity.ticker ?? data?.tickers?.[0] ?? null,
    title: data?.name ?? entity.title ?? null,
    sic: data?.sic ?? null,
    sicDescription: data?.sicDescription ?? null,
    exchanges: data?.exchanges ?? [],
    tickers: data?.tickers ?? (entity.ticker ? [entity.ticker] : []),
    filings: data?.filings ?? {},
    raw: data,
  };
}

export async function getRecentFilings(client, tickerOrCik, options = {}) {
  const { forms = [], limit = 20 } = options;
  const submissions = await getCompanySubmissions(client, tickerOrCik);
  const recent = submissions.filings?.recent ?? {};
  const accessionNumbers = recent.accessionNumber ?? [];

  const filings = accessionNumbers.map((accessionNumber, index) => ({
    cik: submissions.cik,
    ticker: submissions.ticker,
    companyName: submissions.title,
    form: recent.form?.[index] ?? null,
    accessionNumber,
    filingDate: recent.filingDate?.[index] ?? null,
    reportDate: recent.reportDate?.[index] ?? null,
    acceptanceDateTime: recent.acceptanceDateTime?.[index] ?? null,
    primaryDocument: recent.primaryDocument?.[index] ?? null,
    primaryDocDescription: recent.primaryDocDescription?.[index] ?? null,
    isXbrl: recent.isXBRL?.[index] ?? null,
    isInlineXbrl: recent.isInlineXBRL?.[index] ?? null,
    filmNumber: recent.filmNumber?.[index] ?? null,
  }));

  const normalizedForms = forms.map((form) => form.toUpperCase());
  const filtered = normalizedForms.length
    ? filings.filter((filing) => normalizedForms.includes(String(filing.form || "").toUpperCase()))
    : filings;

  return filtered.slice(0, limit);
}

export async function getLatestFiling(client, tickerOrCik, form) {
  const filings = await getRecentFilings(client, tickerOrCik, {
    forms: [form],
    limit: 1,
  });
  return filings[0] ?? null;
}

export async function getRecent8K(client, tickerOrCik, limit = 5) {
  return getRecentFilings(client, tickerOrCik, {
    forms: ["8-K"],
    limit,
  });
}

export async function getCompanyFacts(client, tickerOrCik) {
  const entity = await resolveEntity(client, tickerOrCik);
  const data = await client.get(`/api/xbrl/companyfacts/CIK${entity.cik}.json`);
  return {
    cik: entity.cik,
    ticker: entity.ticker ?? null,
    entityName: data?.entityName ?? entity.title ?? null,
    facts: data?.facts ?? {},
    raw: data,
  };
}

export async function getFactConcept(client, tickerOrCik, concept, options = {}) {
  const { limit = 10 } = options;
  const facts = await getCompanyFacts(client, tickerOrCik);
  const conceptName = String(concept || "").trim();
  if (!conceptName) {
    throw new Error("concept is required");
  }

  const namespaces = facts.facts || {};
  const matches = [];

  for (const [namespace, entries] of Object.entries(namespaces)) {
    if (!entries || typeof entries !== "object") continue;
    const fact = entries[conceptName];
    if (!fact) continue;
    const units = fact.units || {};
    for (const [unit, values] of Object.entries(units)) {
      if (!Array.isArray(values)) continue;
      matches.push({
        namespace,
        concept: conceptName,
        label: fact.label ?? null,
        description: fact.description ?? null,
        unit,
        values: values
          .slice()
          .sort((a, b) => String(b.filed || "").localeCompare(String(a.filed || "")))
          .slice(0, limit),
      });
    }
  }

  if (!matches.length) {
    throw new Error(`No fact concept found for ${conceptName}`);
  }

  return {
    cik: facts.cik,
    ticker: facts.ticker,
    entityName: facts.entityName,
    concept: conceptName,
    matches,
  };
}
