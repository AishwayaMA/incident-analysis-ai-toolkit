#!/usr/bin/env node
// Usage: node splunk-query.js '<SPL>' [earliest] [latest] [count]
//        node splunk-query.js '<SPL>' earliest=-24h@h latest=now count=100
import { executeQuery, resetPage } from './splunk-playwright.js';
import { assertReadOnly, normalizeSpl } from './spl-guard.js';

const args = process.argv.slice(2);
const query = args.shift();
if (!query) {
  console.error(
    "Usage: node splunk-query.js '<SPL>' [earliest] [latest] [count]\n" +
    "   or: node splunk-query.js '<SPL>' earliest=-24h@h latest=now count=100",
  );
  process.exit(2);
}

const keyedOptions = {};
const positional = [];
for (const arg of args) {
  const match = /^(earliest|latest|count)=(.*)$/.exec(arg);
  if (match) {
    if (Object.hasOwn(keyedOptions, match[1])) {
      console.error(`Duplicate option: ${match[1]}`);
      process.exit(2);
    }
    keyedOptions[match[1]] = match[2];
  } else {
    positional.push(arg);
  }
}
if (positional.length > 3) {
  console.error(`Unexpected argument: ${positional[0]}`);
  process.exit(2);
}
const options = {
  earliest: keyedOptions.earliest ?? positional[0] ?? '-24h@h',
  latest: keyedOptions.latest ?? positional[1] ?? 'now',
  count: keyedOptions.count ?? positional[2] ?? '100',
};

function normalizeTime(value, name) {
  if (!value) {
    console.error(`${name} must not be empty.`);
    process.exit(2);
  }
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed) && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) {
    return String(Math.floor(parsed / 1000));
  }
  return value;
}

const earliest = normalizeTime(options.earliest, 'earliest');
const latest = normalizeTime(options.latest, 'latest');
if (!/^\d+$/.test(options.count)) {
  console.error('count must be an integer between 1 and 1000.');
  process.exit(2);
}
const count = Number(options.count);
if (count < 1 || count > 1000) {
  console.error('count must be an integer between 1 and 1000.');
  process.exit(2);
}

let exitCode = 0;
try {
  const spl = normalizeSpl(query);
  assertReadOnly(spl);
  const results = await executeQuery(spl, earliest, latest, count);
  console.log(JSON.stringify({ query: spl, earliest, latest, count: results.length, results }, null, 2));
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  exitCode = 1;
} finally {
  await resetPage();
}
process.exit(exitCode);
