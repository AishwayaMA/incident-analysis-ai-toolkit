import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, unlink } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const configuredUrl = process.env.SPLUNK_BASE_URL;
if (!configuredUrl) {
  throw new Error('Set SPLUNK_BASE_URL locally to your approved Splunk instance URL.');
}
const parsedUrl = new URL(configuredUrl);
export const BASE_URL = parsedUrl.origin;
const LANDING_URL = `${BASE_URL}/en-US/app/search/search`;
const USER_DATA_DIR = path.resolve(
  process.env.SPLUNK_PROFILE_DIR || path.join(os.homedir(), '.splunk-mcp-profile'),
);
const LOGIN_TIMEOUT_MS = 120_000;
const JOB_POLL_TIMEOUT_MS = Number(process.env.SPLUNK_JOB_POLL_TIMEOUT_MS || 180_000);
const PROFILE_LOCK_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 1_000;
const DEFAULT_BROWSER_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BROWSER_PATH = process.env.SPLUNK_BROWSER_PATH || DEFAULT_BROWSER_PATH;
const AUTH_REDIRECT_PATTERN =
  /login|account\/login|okta\.com|microsoftonline\.com|pingidentity|duosecurity/i;

if (USER_DATA_DIR !== os.homedir() && !USER_DATA_DIR.startsWith(`${os.homedir()}${path.sep}`)) {
  throw new Error('SPLUNK_PROFILE_DIR must be inside your home directory.');
}

let _browserContext = null;
let _page = null;
let _profileLockHandle = null;
let _profileLockToken = null;
let _queryQueue = Promise.resolve();

if (!Number.isInteger(JOB_POLL_TIMEOUT_MS) || JOB_POLL_TIMEOUT_MS < 10_000 || JOB_POLL_TIMEOUT_MS > 600_000) {
  throw new Error('SPLUNK_JOB_POLL_TIMEOUT_MS must be an integer between 10000 and 600000.');
}

const PROFILE_LOCK_PATH = `${USER_DATA_DIR}.query-lock`;

async function acquireProfileLock() {
  const deadline = Date.now() + PROFILE_LOCK_TIMEOUT_MS;
  const token = randomUUID();
  await mkdir(path.dirname(USER_DATA_DIR), { recursive: true, mode: 0o700 });

  while (Date.now() < deadline) {
    try {
      const handle = await open(PROFILE_LOCK_PATH, 'wx', 0o600);
      await handle.writeFile(JSON.stringify({ pid: process.pid, token }));
      _profileLockHandle = handle;
      _profileLockToken = token;
      return;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;

      try {
        const owner = JSON.parse(await readFile(PROFILE_LOCK_PATH, 'utf8'));
        let ownerIsRunning = true;
        if (Number.isInteger(owner.pid) && owner.pid > 0) {
          try {
            process.kill(owner.pid, 0);
          } catch (probeError) {
            if (probeError.code === 'ESRCH') ownerIsRunning = false;
          }
        }
        if (!ownerIsRunning) {
          await unlink(PROFILE_LOCK_PATH);
          continue;
        }
      } catch (readError) {
        if (readError.code === 'ENOENT') continue;
        if (readError instanceof SyntaxError) {
          await delay(100);
          continue;
        }
        throw readError;
      }

      await delay(500);
    }
  }

  throw new Error('Another Splunk search is using the shared browser profile. Wait for it to finish, then retry.');
}

async function releaseProfileLock() {
  const handle = _profileLockHandle;
  const token = _profileLockToken;
  _profileLockHandle = null;
  _profileLockToken = null;
  if (!handle) return;

  await handle.close();
  try {
    const owner = JSON.parse(await readFile(PROFILE_LOCK_PATH, 'utf8'));
    if (owner.token === token) await unlink(PROFILE_LOCK_PATH);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

export function isLoginPage(url) {
  return (
    !url.includes('/en-US/app/') ||
    AUTH_REDIRECT_PATTERN.test(url)
  );
}

export async function getPage() {
  if (_page && !_page.isClosed()) return _page;
  if (_browserContext) await resetPage();

  try {
    _browserContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
      executablePath: BROWSER_PATH,
      headless: true,
    });
  } catch (error) {
    if (/ProcessSingleton|SingletonLock/.test(error.message)) {
      throw new Error('The Splunk Chrome profile is already open outside this reader. Close or finish the other Splunk reader, then retry.');
    }
    throw error;
  }
  _page = await _browserContext.newPage();
  // Splunk's landing page occasionally stalls; one retry avoids failing the whole query.
  try {
    await _page.goto(LANDING_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  } catch (error) {
    if (!/Timeout/i.test(error.message)) throw error;
    await _page.goto(LANDING_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  }
  return _page;
}

export async function resetPage() {
  const context = _browserContext;
  _page = null;
  _browserContext = null;
  if (context) await context.close();
}

export async function reAuthenticate() {
  await resetPage();
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    executablePath: BROWSER_PATH,
    headless: false,
    args: ['--start-maximized'],
    noViewport: true,
  });

  try {
    const page = await context.newPage();
    await page.goto(LANDING_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const deadline = Date.now() + LOGIN_TIMEOUT_MS;

    while (Date.now() < deadline && isLoginPage(page.url())) {
      await delay(2_000);
    }

    if (isLoginPage(page.url())) {
      throw new Error('Splunk sign-in was not completed within two minutes.');
    }

    await delay(1_000);
  } finally {
    await context.close();
  }

  await resetPage();
}

async function requestJson(page, url, options = {}) {
  const response = await page.evaluate(
    async ({ requestUrl, requestOptions }) => {
      const result = await fetch(requestUrl, {
        ...requestOptions,
        credentials: 'include',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          ...requestOptions.headers,
        },
      });
      const text = await result.text();
      return {
        status: result.status,
        url: result.url,
        contentType: result.headers.get('content-type') || '',
        text,
      };
    },
    { requestUrl: url, requestOptions: options },
  );

  if ([401, 403].includes(response.status) || AUTH_REDIRECT_PATTERN.test(response.url)) {
    return { authExpired: true };
  }

  let json;
  try {
    json = JSON.parse(response.text);
  } catch {
    if (/text\/html/i.test(response.contentType)) return { authExpired: true };
    throw new Error(`Splunk returned a non-JSON response (HTTP ${response.status}).`);
  }

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Splunk API request failed (HTTP ${response.status}): ${JSON.stringify(json)}`);
  }

  return { json };
}

async function executeQueryOnce(spl, earliest, latest, count) {
  const page = await getPage();
  if (isLoginPage(page.url())) return { authExpired: true };

  const job = await page.evaluate(
    async ({ endpoint, search, earliestTime, latestTime }) => {
      const formKey = document.cookie.match(/splunkweb_csrf_token_\d+=([^;]+)/)?.[1] || '';
      const body = new URLSearchParams({
        search,
        earliest_time: earliestTime,
        latest_time: latestTime || 'now',
        output_mode: 'json',
        exec_mode: 'normal',
      });
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'X-Splunk-Form-Key': formKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });
      const text = await response.text();
      return {
        status: response.status,
        url: response.url,
        contentType: response.headers.get('content-type') || '',
        text,
      };
    },
    {
      endpoint: `${BASE_URL}/en-US/splunkd/__raw/services/search/jobs`,
      search: spl,
      earliestTime: earliest,
      latestTime: latest,
    },
  );

  if ([401, 403].includes(job.status) || AUTH_REDIRECT_PATTERN.test(job.url)) {
    return { authExpired: true };
  }
  if (job.status < 200 || job.status >= 300) {
    throw new Error(`Splunk job submission failed (HTTP ${job.status}): ${job.text}`);
  }

  let jobJson;
  try {
    jobJson = JSON.parse(job.text);
  } catch {
    if (/text\/html/i.test(job.contentType)) return { authExpired: true };
    throw new Error('Splunk job submission returned invalid JSON.');
  }

  const sid = jobJson.sid || jobJson.entry?.[0]?.name;
  if (!sid) throw new Error(`Splunk did not return a search job SID: ${job.text}`);

  const jobUrl = `${BASE_URL}/en-US/splunkd/__raw/services/search/jobs/${encodeURIComponent(sid)}?output_mode=json`;
  const deadline = Date.now() + JOB_POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await delay(POLL_INTERVAL_MS);
    const status = await requestJson(page, jobUrl);
    if (status.authExpired) return status;

    const content = status.json.entry?.[0]?.content;
    if (content?.dispatchState === 'FAILED') {
      throw new Error(`Splunk search job failed: ${JSON.stringify(content)}`);
    }
    if (content?.dispatchState === 'DONE') {
      const resultsUrl = `${BASE_URL}/en-US/splunkd/__raw/services/search/jobs/${encodeURIComponent(sid)}/results?output_mode=json&count=${count}&offset=0`;
      const result = await requestJson(page, resultsUrl);
      if (result.authExpired) return result;
      return { results: result.json.results ?? [] };
    }
  }

  throw new Error(
    `Splunk search job ${sid} did not finish within ${JOB_POLL_TIMEOUT_MS / 1000} seconds. ` +
    'Narrow the time range/query or increase SPLUNK_JOB_POLL_TIMEOUT_MS (maximum 600000).',
  );
}

async function executeQueryExclusive(spl, earliest, latest, count) {
  await acquireProfileLock();
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const page = await getPage();
      if (isLoginPage(page.url())) {
        await resetPage();
        await reAuthenticate();
        continue;
      }

      const response = await executeQueryOnce(spl, earliest, latest, count);
      if (!response.authExpired) return response.results;
      await resetPage();
      await reAuthenticate();
    }

    throw new Error('Splunk authentication expired again after sign-in; retry the search.');
  } finally {
    try {
      await resetPage();
    } finally {
      await releaseProfileLock();
    }
  }
}

export function executeQuery(spl, earliest = '-24h@h', latest = 'now', count = 100) {
  const query = _queryQueue.then(() => executeQueryExclusive(spl, earliest, latest, count));
  _queryQueue = query.catch(() => {});
  return query;
}
