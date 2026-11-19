---
name: incident-triage
description: Investigate an incident using existing approved ServiceNow and Splunk readers, local code, and optional stage validation; separate verified evidence from hypotheses.
---

# Incident triage

## Boundaries

- ServiceNow is read-only. Draft work notes for the user; never post or save them.
- Ask before opening production application records: opening them may write data.
- Stage is navigation/read-only. Do not create, submit, activate, or save records.
- Propose code changes first; implement only after approval.
- Never handle credentials, tokens, cookies, or browser-profile exports.
- Keep personal/member data in approved local storage; redact it from reports.
- Respect restricted files; never use another tool to bypass a denied read.

## Workflow

1. Check existing local analysis for the incident before repeating work.
2. Read the incident with the existing approved ServiceNow reader.
   Review its screenshots locally and identify the actual reporting user.
   Separate the incident reporter from the service-desk agent.
3. Record failure time and time zone, API name, status, and correlation ID.
   A missing failed-API list does not prove that downstream processing succeeded.
4. Check Git status and trace the relevant local request construction.
   Do not overwrite unrelated work.
5. Search Splunk narrowly around the actual reporting user's failure time.
   Follow request IDs, event IDs, and correlation IDs across service boundaries.
6. Distinguish source save, event publication, consumer processing, downstream
   persistence, and history display. Evidence for one is not proof of the next.
7. Compare equivalent source systems and sync directions. A record imported
   from a legacy system is not proof that the reverse integration works.
8. Use stage only when necessary and authorized. Do not copy production member
   data into stage. Capture relevant network results when validating a hypothesis.
9. Report verified facts, suspected causes, evidence limits, and next owner/action.
   A common code quirk is not an incident cause without record-specific evidence.
10. Persist approved local findings using the blank analysis template, outside Git.

## Existing tool guidance

- [Splunk](references/splunk.md)
- [ServiceNow](references/servicenow.md)
- [GitHub, stage, and VS Code](references/tools.md)

Do not install or invent another connection mechanism as part of this workflow.
