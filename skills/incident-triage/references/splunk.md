# Splunk

Use the existing approved local `splunk-query.js` reader. A sanitized copy is in
[readers](../../../readers/README.md). Host configuration and authentication state
are not included; set `SPLUNK_BASE_URL` locally before using the copy.

The existing command shape is:

```text
node <approved-reader-directory>/splunk-query.js '<read-only SPL>' '<earliest>' '<latest>' <count>
```

- Start with a short time window and a selective user or correlation filter.
- Convert displayed call times to UTC explicitly; preserve the original zone.
- Run one search at a time when readers share a browser profile.
- Reuse the reader's existing authenticated session. If its sign-in window
  appears, the user completes SSO/MFA directly.
- Store real output only in approved local storage, not this repository.
- Read bounded results and safe metadata; avoid dumping payloads or personal data.
- Narrow a timed-out search rather than repeatedly rerunning a broad scan.
- Aggregate multi-day scope instead of retrieving every raw event.
- Verify retention for the requested period; no results do not prove no event.
- Trace a specific event through publisher acknowledgment and consumer processing.
  An HTTP acceptance or Kafka publish is not proof of a downstream insert.
- Report outages, access failures, truncation, and missing evidence explicitly.

Reading these instructions does not start a browser. Running the CLI may launch
Chrome and prompt for SSO. Its persistent profile stays local.
