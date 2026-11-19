# Incident Analysis AI Toolkit

Sanitized documentation of an existing incident-investigation workflow in VS Code:
read an incident, trace local code, search production logs, optionally validate on
stage, and report verified findings separately from hypotheses.

This repository contains documentation and a blank analysis template only.
It does not contain executable integrations, company scripts, internal addresses,
incident records, member data, credentials, or live connections.

## Contents

- [Incident-triage skill](skills/incident-triage/SKILL.md)
- [Splunk workflow](skills/incident-triage/references/splunk.md)
- [ServiceNow workflow](skills/incident-triage/references/servicenow.md)
- [GitHub, stage, and VS Code workflow](skills/incident-triage/references/tools.md)
- [Blank incident analysis](templates/INC_NUMBER_analysis.md)

## Use

1. Use the existing, organization-approved local tools and SSO setup.
2. Load or consult the skill in your assistant's supported skill location.
3. Keep actual incident notes in approved local storage outside this repository.
4. Use the blank template to distinguish observations, hypotheses, and evidence gaps.

The CLI readers described here are existing prerequisites, not included packages.
This repository cannot establish connections or reproduce their authentication setup.
There is no new background service, browser automation package, or token-storage
implementation here.

## Full workflow: incident number to final analysis

Start in VS Code by asking the assistant to investigate an incident number:

```text
Investigate INC_NUMBER and save the findings in INC_NUMBER_analysis.md.
```

With the existing approved readers and access already configured:

1. **Load the skill and check prior work.** Load the incident-triage skill and
   check for an existing local analysis. Continue from verified findings rather
   than repeating completed searches.
2. **Read ServiceNow, without updating it.** Use the existing reader to retrieve
   the description, work-note history, failed APIs, and attachments. Inspect
   screenshots locally. Identify the actual reporting user, affected feature,
   expected result, observed result, and related incidents.
3. **Establish the investigation window.** Record the reported time and time
   zone, convert it to UTC, and identify safe request, event, or correlation
   references. Ask for clarification if the incident does not identify the
   missing record or destination.
4. **Trace the relevant code.** Check Git status, then follow the UI component,
   service, request construction, and downstream integration. Use existing
   GitHub access when necessary. Do not overwrite unrelated work or assume
   local code matches the deployed production version.
5. **Investigate production logs.** Use the existing Splunk reader, starting
   with the reporting user and a narrow time window. Follow correlation or
   event IDs through source save, publication, consumer processing, persistence,
   and retrieval. Run searches sequentially when they share a browser profile.
6. **Compare like-for-like records.** Compare successful and missing records
   using the same source system and sync direction. Check record-specific
   payload differences. Do not attribute a single failure to a common code
   setting without supporting evidence.
7. **Validate a hypothesis when appropriate.** If authorized and necessary,
   use read-only stage navigation and permitted browser-only mocks, without
   copying production member data. Remove mocks afterward. Do not open
   production application records without explicit approval.
8. **Separate findings from assumptions.** State what each log or screenshot
   proves, which boundary failed, and what remains unknown. Record retention,
   access, and result-truncation limits. Event acceptance does not prove a
   downstream record was inserted.
9. **Propose the next action.** Identify the owning team and the exact missing
   evidence or correction. Draft ServiceNow work notes for the user to post;
   never post them automatically. Propose a minimal code fix only when supported
   by evidence, and wait for approval before implementation.
10. **Verify approved changes, if any.** Use existing diagnostics and focused
    tests. Report their actual results and anything that could not be tested.
    No code change is required when the evidence points to another system.
11. **Save the final local analysis.** Populate the
    [blank template](templates/INC_NUMBER_analysis.md) as
    `INC_NUMBER_analysis.md` in approved local storage outside this repository.
    Include the symptom, time window, verified evidence, code trace, hypotheses,
    validation results, limitations, conclusion, owner/action, and draft work
    note. Read back the saved file to verify it persisted.
12. **Return a concise handoff.** Summarize the result and link to the local
    analysis file. If root cause remains unverified, say so and provide the
    specific next trace or owner needed. Do not present an incomplete trace as
    a confirmed root cause.

The final deliverable is the persisted local analysis file, not just a chat
answer. Actual incident analyses, screenshots, and log exports stay out of Git;
only this generic workflow and the blank template belong in this repository.
Existing authenticated sessions are reused until expiry, with user-completed
SSO/MFA when required.

## Session reuse

Reuse an existing authenticated reader or shared browser tab until SSO expires.
Complete sign-in and MFA yourself when prompted. Never export, copy, request,
log, or commit session tokens, cookies, passwords, or browser profiles.
Session expiry and organizational sign-in policies still apply.

## Publication boundary

Only publish sanitized workflow documentation and blank templates.
Keep real logs, screenshots, incident analyses, payloads, local configuration,
and authentication material out of Git, including private repositories.
Ignoring a file does not remove previously committed content.
