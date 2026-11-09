---
name: jira-bug-report
description: Writes and files a properly structured QA bug report in this project's Jira (project KAN), from a failing test or an observed issue in the Mondial2026 app. Use this whenever the user asks to file a bug, report a bug, open a Jira ticket, or says a test failed and should be tracked — even if they just say "file this" or "report this to Jira" without spelling out the format. Always use the exact report structure and the project's scripts/*.mjs tools described below, never a different ad-hoc format.
---

# Filing a QA bug report to Jira

This skill captures the structure and workflow used for `mundial-qa-automation`'s bug
reports — built from real practice in this project, not a generic template. The goal of
each report is that someone with **zero context on this conversation** — a developer, a
PM, future-you in six months — can read it and immediately know what's wrong, how to see
it themselves, and how bad it is.

## Before writing anything: get real data

Never invent a stack trace, a locator, or a reproduction step from memory or guesswork.
If there's a failing automated test, actually run it and capture the real error output —
if you're not sure it still fails, re-run it. If it's a UI bug, reproduce it live (the
built-in browser against the local Docker stack at `http://localhost:8080`, started via
`docker compose --env-file .env.docker up -d db rest gateway web` in `mundial-qa-automation`)
and take a screenshot of the actual broken state. A report built from real output is
trustworthy; one built from assumption gets dismissed the first time someone can't
reproduce it exactly as described.

If a test needs to be run outside the normal suite (e.g. a `test.fail()`-marked known bug,
to see the *real* failure instead of an "expected failure" pass), copy it into a scratch
file like `tests/ui/_scratch-demo.spec.ts` without the `test.fail()` marker, run it, then
delete the scratch file — never leave it committed.

## Report structure

Use this exact structure every time. Each section answers a specific question a reader
will have; skipping one just means they have to come ask you instead of the ticket
answering it for them.

```
Failing test: '<test name>' -- <file path>:<line number>
(omit this line if there's no automated test — e.g. a manually observed issue)

Environment: <explicit, clickable URL(s)> -- e.g. "Local Docker test environment:
http://localhost:8080 (the same bug is also present in production at
https://pgmondial2026.netlify.app)". Never a relative path like "(/)" — a reader with no
context on this codebase has no idea what that means or where it points.

Preconditions: <what state the app/user needs to be in before following the steps>

Steps to reproduce:
1. <first step, with an explicit URL if navigation is involved>
2. ...

Expected result: <what should happen>

Actual result: <what actually happens>

Severity: <how bad the impact is if it stays unfixed>
Priority: <how urgently it should be worked on>
(These are two different questions and the answer isn't always the same — a cosmetic
typo on the homepage can be high priority to fix before a demo despite low severity, and
a severe data-corruption bug nobody will hit for months might be lower priority than
something smaller affecting everyone today. Always state both, separately, with a short
reason, rather than one combined "importance" rating.)

Technical detail: <the real error/stack trace from actually running it, not a paraphrase>

Reproducibility: <e.g. "100% (every run)" or "intermittent, ~1 in 5 attempts">

Found via: <automated UI test suite / manual exploration / etc — plus a note that this was
filed via the project's AI-assisted Jira integration>
```

## Filing it

```bash
node scripts/file-jira-bug.mjs "<title>" "<full description from the structure above>"
```
Prints the created issue's URL (e.g. `KAN-4`).

If you captured a screenshot of the reproduction, attach it — a picture of the actual
broken state is far more convincing than prose alone:
```bash
node scripts/attach-jira-file.mjs <ISSUE-KEY> "<path to screenshot>"
```

To fix something after filing (e.g. you realize the Environment URL was unclear, or need
to add the exact failing test name you found after the fact):
```bash
node scripts/update-jira-description.mjs <ISSUE-KEY> "<full replacement description>"
node scripts/comment-jira.mjs <ISSUE-KEY> "<comment text>"
```

All four scripts read Jira credentials from `.env` in `mundial-qa-automation` (gitignored,
never committed) — `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_SITE_URL`, `JIRA_PROJECT_KEY`.

## Why this is manual, not automatic

This workflow is deliberately something you run when asked, not something wired into CI
to fire automatically on every test failure. A human (here, Claude in conversation with
the user) drafts each report from real evidence and judgment about severity/priority —
auto-filing from every red CI run would spam the board with duplicates and flaky-test
noise, and nobody would trust the board enough to actually read it.
