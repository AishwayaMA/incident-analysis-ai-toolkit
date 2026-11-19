# ServiceNow

Use the existing approved local `sn-query.js` reader. This repository does not
include its code, organization-specific configuration, or authentication setup.

The existing command shape is:

```text
node <approved-reader-directory>/sn-query.js incident <INC_NUMBER>
```

1. Read the incident description, status, work-note history, and attachments.
2. Identify the reporting user in the description, not automatically the caller.
3. Extract API time, time zone, operation, status, and trace references.
4. Inspect downloaded screenshots locally; do not commit them.
5. Treat automated recommendations and previous hypotheses as claims to verify.
6. Draft findings in chat for the user to post. Never post, save, resolve, or delete.

Reuse the existing reader session until expiry. The user completes any SSO/MFA
prompt directly; never request or export credentials, tokens, or cookies.

For browser fallback, reuse a shared logged-in tab. If none is shared, open the
site without forcing a fresh page and let the user share their authenticated tab.
Do not bypass authentication or export its state.
