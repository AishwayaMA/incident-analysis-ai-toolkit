# GitHub, stage, and VS Code

## GitHub

- Use the already available GitHub integration to inspect relevant code or history.
- Use local code when it is already available; check Git status before changes.
- Keep private company source in its approved repository.
- Do not upload logs, incident/member data, credentials, or connection state.
- Create or push commits only when requested, and inspect the exact diff first.
- Verify repository owner, visibility, committed files, and remote result.
- Include the assistant co-author trailer on assistant-created commits:

```text
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

## Stage and integrated browser

- Reuse a shared authenticated tab for the same host.
- Do not force a new tab for SSO-protected applications.
- If login is required, stop and let the user sign in directly.
- Navigate and read only; do not click create, save, submit, or activate.
- Do not open production records without explicit approval.
- Never use real production member data as a stage fixture.
- If a permitted browser-only mock is necessary, scope it narrowly and remove it.
- Do not claim a hypothesis is reproduced without observing the expected result.

## VS Code

- Load the skill using the assistant's supported skill mechanism.
- Discover available deferred tools before calling them.
- Read the relevant component, service, configuration key, and direct callers.
- Prefer targeted searches and bounded reads to broad output dumps.
- Separate observed runtime evidence from local code assumptions.
- Propose the smallest relevant fix and wait for approval.
- After approved edits, use existing diagnostics and focused tests.
  State clearly if tests could not run.
- Keep actual analysis and temporary query output outside the repository.

This guidance does not install extensions, provision servers, or add integrations.
