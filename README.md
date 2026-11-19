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
