#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { AgentMailClient } from "agentmail";

try {
  process.loadEnvFile();
} catch {
  // .env is optional.
}

const HELP = `Usage:
  npm run agentmail -- inboxes
  npm run agentmail -- send --inbox <id> --to <email[,email]> --subject <text> --text <body>
  npm run agentmail -- send --input reports/market-reads/YYYY-MM-DD.md --subject "Morning Read"

Environment:
  AGENTMAIL_API_KEY       Required AgentMail API key
  AGENTMAIL_INBOX_ID      Default sending inbox
  MARKET_READ_EMAIL_TO    Default recipient for market-read delivery

Send options:
  --inbox <id>            Overrides AGENTMAIL_INBOX_ID
  --to <email[,email]>    Overrides MARKET_READ_EMAIL_TO
  --cc <email[,email]>
  --bcc <email[,email]>
  --subject <text>
  --text <body>
  --input <path|->        Text body from a file or stdin
  --html <body>
  --html-input <path|->   HTML body from a file or stdin
  --json                  Print raw JSON response
`;

const [command, ...args] = process.argv.slice(2);

if (!command || command === "help" || command === "--help" || command === "-h") {
  console.log(HELP);
  process.exit(0);
}

main().catch(async (error) => {
  console.error(`agentmail: ${formatError(error)}`);
  if (error?.message === "fetch failed") {
    const diagnostic = await diagnoseConnectivity();
    if (diagnostic) console.error(`agentmail diagnostic: ${diagnostic}`);
  }
  process.exit(1);
});

async function main() {
  const client = new AgentMailClient({ apiKey: requireEnv("AGENTMAIL_API_KEY") });

  if (command === "inboxes") {
    const opts = parseArgs(args);
    const response = await client.inboxes.list();
    if (opts.json) {
      console.log(JSON.stringify(response, null, 2));
      return;
    }
    printInboxes(response);
    return;
  }

  if (command === "send") {
    const opts = parseArgs(args);
    const inboxId = opts.inbox ?? process.env.AGENTMAIL_INBOX_ID ?? process.env.AGENTMAIL_INBOX;
    const to = splitAddresses(opts.to ?? process.env.MARKET_READ_EMAIL_TO ?? process.env.AGENTMAIL_TO);
    const cc = splitAddresses(opts.cc);
    const bcc = splitAddresses(opts.bcc);
    const text = opts.text ?? readOptionalInput(opts.input);
    const html = opts.html ?? readOptionalInput(opts.htmlInput);
    const subject = opts.subject ?? defaultSubject(opts.input);

    if (!inboxId) {
      throw new Error("--inbox or AGENTMAIL_INBOX_ID is required");
    }
    if (!to) {
      throw new Error("--to or MARKET_READ_EMAIL_TO is required");
    }
    if (!text && !html) {
      throw new Error("--text, --input, --html, or --html-input is required");
    }

    const payload = { to, subject };
    if (cc) payload.cc = cc;
    if (bcc) payload.bcc = bcc;
    if (text) payload.text = text;
    if (html) payload.html = html;

    const response = await client.inboxes.messages.send(inboxId, payload);
    if (opts.json) {
      console.log(JSON.stringify(response, null, 2));
      return;
    }
    console.log(`sent message ${response.messageId} in thread ${response.threadId}`);
    return;
  }

  throw new Error(`unknown command "${command}"\n\n${HELP}`);
}

function parseArgs(argv) {
  const opts = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      throw new Error(`unexpected argument "${token}"`);
    }

    const key = toCamel(token.slice(2));
    if (key === "json") {
      opts[key] = true;
      continue;
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`missing value for ${token}`);
    }
    opts[key] = value;
    index += 1;
  }
  return opts;
}

function readOptionalInput(path) {
  if (!path) return undefined;
  if (path === "-") return readFileSync(0, "utf8");
  return readFileSync(path, "utf8");
}

function splitAddresses(value) {
  if (!value) return undefined;
  const addresses = String(value)
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
  if (addresses.length === 0) return undefined;
  return addresses.length === 1 ? addresses[0] : addresses;
}

function defaultSubject(inputPath) {
  if (!inputPath || inputPath === "-") return "Trade Ops Report";
  return `Trade Ops Report: ${basename(inputPath)}`;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function printInboxes(response) {
  const inboxes = Array.isArray(response) ? response : response.inboxes ?? response.data ?? [];
  if (inboxes.length === 0) {
    console.log("no inboxes found");
    return;
  }

  for (const inbox of inboxes) {
    const id = inbox.id ?? inbox.inboxId ?? "(unknown id)";
    const address = inbox.email ?? inbox.emailAddress ?? inbox.address ?? "(unknown address)";
    const name = inbox.displayName ?? inbox.name ?? "";
    console.log([id, address, name].filter(Boolean).join("\t"));
  }
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function formatError(error) {
  const parts = [error?.message ?? String(error)];
  const cause = error?.cause;
  if (cause?.code || cause?.message) {
    parts.push(
      [
        cause.code,
        cause.syscall,
        cause.hostname,
        cause.address ? `${cause.address}${cause.port ? `:${cause.port}` : ""}` : "",
        cause.message
      ].filter(Boolean).join(" ")
    );
  }
  return parts.join(" — caused by ");
}

async function diagnoseConnectivity() {
  try {
    const response = await fetch("https://api.agentmail.to", { method: "GET" });
    return `api.agentmail.to reachable with HTTP ${response.status}; check API key, inbox, or send payload`;
  } catch (error) {
    const cause = error?.cause;
    return [
      cause?.code ?? error?.message ?? String(error),
      cause?.syscall,
      cause?.hostname,
      cause?.address ? `${cause.address}${cause.port ? `:${cause.port}` : ""}` : "",
      cause?.message
    ].filter(Boolean).join(" ");
  }
}
