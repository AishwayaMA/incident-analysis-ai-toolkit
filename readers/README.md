# Existing JavaScript readers

These are sanitized copies of the existing local readers, not new integrations.
The only code changes remove the two internal default instance URLs and require
`SPLUNK_BASE_URL` and `SN_BASE_URL` to be supplied locally instead.
No stage URL, actual incident, credentials, or authenticated profile is included.

## Files and language

All executable files use JavaScript ES modules on Node.js.

| File | Existing purpose |
| --- | --- |
| `splunk-query.js` | Command-line Splunk queries with bounded time and result count |
| `splunk-playwright.js` | Browser session reuse, query serialization, and search-job polling |
| `spl-guard.js` | Existing keyword-based write-command check |
| `splunk-mcp-server.js` | Optional existing stdio MCP interface exposing `splunk_search` |
| `sn-query.js` | Read incident/table data and download attachments |
| `sn-client.js` | Connect to the local ServiceNow helper |
| `sn-daemon.js` | Serialize requests and keep the ServiceNow browser session in memory |
| `servicenow-playwright.js` | Browser sign-in and ServiceNow Table/Attachment API reads |
| `package.json` | Existing Node.js dependency manifest |

## Local setup

Use an approved Node.js version supporting these dependencies and an approved
Chrome installation. The existing browser executable default is macOS Google
Chrome; use the browser-path variables below if your approved executable differs.

From this directory, install the declared dependencies with your approved package
manager configuration:

```sh
npm install
```

Set the following environment variables in your own shell using approved values.
No real endpoint values belong in this repository. These readers do not load
`.env` files automatically.

| Variable | Required | Meaning |
| --- | --- | --- |
| `SPLUNK_BASE_URL` | For Splunk | Approved Splunk instance origin |
| `SN_BASE_URL` | For ServiceNow | Approved ServiceNow instance origin |
| `SPLUNK_BROWSER_PATH` | If overriding default | Approved Chrome executable |
| `SN_BROWSER_PATH` | If overriding default | Approved Chrome executable |
| `SPLUNK_PROFILE_DIR` | Optional | Local dedicated Splunk profile under your home |
| `SN_PROFILE_DIR` | Optional | Local dedicated ServiceNow profile under your home |
| `SPLUNK_JOB_POLL_TIMEOUT_MS` | Optional | Search timeout, 10000-600000 ms; default 180000 |

Keep the profile directories outside the checkout. Do not copy existing browser
profiles or session files into the repository.

## Existing command shapes

```sh
node splunk-query.js '<read-only SPL>' earliest=-24h@h latest=now count=100
node sn-query.js incident INC_NUMBER
node sn-query.js table '<table>' '<encoded query>' '<fields>' 20
node sn-query.js attachment '<attachment sys_id>' '<approved-local-output-file>'
node sn-query.js stop
```

`INC_NUMBER` and angle-bracket arguments are placeholders; replace them locally.
Real output can include sensitive incident and member data. Keep it in approved
local storage outside this checkout, and do not paste it into public reports.

## Existing background and login behavior

- Splunk runs queries headlessly, reusing a dedicated persistent browser profile.
  Expired authentication opens an interactive Chrome window; the user completes
  SSO/MFA within two minutes. Queries sharing that profile are serialized.
- The ServiceNow client starts its existing background helper on first use.
  It communicates through a private local Unix socket and exits after four idle
  hours. `node sn-query.js stop` ends that helper's session.
- ServiceNow interactive sign-in has a three-minute window. Session cookies are
  carried in process memory to the headless browser, not exported to this repo.
- Running the ServiceNow copy can use the same local socket/profile as an already
  running original reader. Do not run competing instances; coordinate before
  stopping any existing helper.
- The optional existing Splunk MCP entry point is `npm start`. Configure it using
  your client's approved stdio MCP settings and local environment variables.
  No new GitHub or stage connection code is supplied.

The existing checks express read-only intent, not a complete security boundary.
Use least-privilege read-only accounts and server-side authorization. In particular,
the SPL keyword filter is not a full parser or permission enforcement mechanism.
These scripts do not bypass sign-in, MFA, retention, or access policies.

## Excluded

- Private `.npmrc` and the existing registry-specific lockfile.
- `node_modules`, downloaded browsers, caches, browser profiles, sockets, and locks.
- Tokens, cookies, passwords, local endpoint values, and SSO state.
- Actual incident analyses, screenshots, attachments, logs, and company source.

The copies require local configuration and dependency installation. Syntax and
offline checks do not prove that SSO or remote queries work in another environment.
