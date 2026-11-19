import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

if (!process.env.SN_BASE_URL) {
  throw new Error('Set SN_BASE_URL locally to your approved ServiceNow instance URL.');
}
export const SN_BASE_URL = new URL(process.env.SN_BASE_URL).origin;
const LANDING_URL = `${SN_BASE_URL}/incident_list.do?sysparm_query=sys_id%3D-1`;
const LOGIN_URL = `${SN_BASE_URL}/login.do`;
const PROBE_PATH = '/api/now/table/sys_user?sysparm_limit=1&sysparm_fields=sys_id';
const USER_DATA_DIR = path.resolve(
  process.env.SN_PROFILE_DIR || path.join(os.homedir(), '.servicenow-reader-profile'),
);
const BROWSER_PATH =
  process.env.SN_BROWSER_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const LOGIN_TIMEOUT_MS = 180_000;

if (!USER_DATA_DIR.startsWith(`${os.homedir()}${path.sep}`)) {
  throw new Error('SN_PROFILE_DIR must be inside your home directory.');
}

let _context = null;
let _page = null;

function onServiceNow(url) {
  return url.startsWith(SN_BASE_URL) && !/login\.do|session_timeout\.do|auth_redirect\.do|external_login/i.test(url);
}

// A signed-out browser still gets a guest session (and a guest g_ck), so authentication is
// confirmed by calling an authenticated API rather than by looking at the URL.
async function authenticatedToken(page) {
  if (!page || page.isClosed() || !onServiceNow(page.url())) return '';
  try {
    return await page.evaluate(async (probe) => {
      const token = typeof window.g_ck === 'string' ? window.g_ck : '';
      if (!token) return '';
      const r = await fetch(probe, { credentials: 'include', headers: { Accept: 'application/json', 'X-UserToken': token } });
      return r.ok ? token : '';
    }, PROBE_PATH);
  } catch {
    return '';
  }
}

export async function resetPage() {
  const context = _context;
  _context = null;
  _page = null;
  if (context) await context.close().catch(() => {});
}

async function launch(headless) {
  _context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    executablePath: BROWSER_PATH,
    headless,
    ...(headless ? {} : { args: ['--start-maximized'], noViewport: true }),
  });
  _page = _context.pages()[0] || (await _context.newPage());
}

// Headless can't complete Microsoft's device check, so it must never follow the SSO redirect;
// it only loads ServiceNow with the session it already has in memory.
async function openHeadless(sessionCookies = []) {
  await launch(true);
  if (sessionCookies.length) await _context.addCookies(sessionCookies);
  try {
    await _page.goto(LANDING_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await _page.waitForFunction(() => window.g_ck, null, { timeout: 15_000 });
  } catch {
    // Not signed in (redirected to SSO or timed out); caller falls back to interactive sign-in.
  }
}

async function signInInteractively() {
  await resetPage();
  await launch(false);
  await _page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 45_000 }).catch(() => {});
  const deadline = Date.now() + LOGIN_TIMEOUT_MS;
  let token = '';
  while (Date.now() < deadline && !(token = await authenticatedToken(_page))) await delay(2_000);
  // ServiceNow's session cookie is memory-only, so carry it to the headless browser in-process.
  const cookies = token ? await _context.cookies() : [];
  await resetPage();
  if (!token) throw new Error('ServiceNow sign-in was not completed within three minutes.');
  await openHeadless(cookies);
}

async function getSession() {
  if (!_page || _page.isClosed()) await openHeadless();
  let token = await authenticatedToken(_page);
  if (token) return { page: _page, token };
  await signInInteractively();
  token = await authenticatedToken(_page);
  if (token) return { page: _page, token };
  throw new Error('ServiceNow session is still not authenticated after sign-in.');
}

async function getOnce(page, token, apiPath, binary) {
  return page.evaluate(
    async ({ url, userToken, asBinary }) => {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: asBinary ? '*/*' : 'application/json', 'X-UserToken': userToken },
      });
      if (!response.ok) return { status: response.status, text: (await response.text()).slice(0, 500) };
      if (!asBinary) return { status: response.status, json: await response.json() };
      const bytes = new Uint8Array(await response.arrayBuffer());
      let binaryText = '';
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binaryText += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      return { status: response.status, base64: btoa(binaryText) };
    },
    { url: `${SN_BASE_URL}${apiPath}`, userToken: token, asBinary: binary },
  );
}

// Read-only: only GET requests to the Table and Attachment APIs are allowed.
export async function snGet(apiPath, { binary = false } = {}) {
  if (!/^\/api\/now\/(table|attachment)\//.test(apiPath)) throw new Error(`Path not allowed: ${apiPath}`);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { page, token } = await getSession();
    const result = await getOnce(page, token, apiPath, binary);
    if ((result.status === 401 || result.status === 403) && attempt === 0) {
      await resetPage();
      continue;
    }
    if (result.status < 200 || result.status >= 300) {
      throw new Error(`ServiceNow GET ${apiPath} failed (HTTP ${result.status}): ${result.text}`);
    }
    return binary ? result.base64 : result.json;
  }
  throw new Error('ServiceNow authentication failed after sign-in.');
}
