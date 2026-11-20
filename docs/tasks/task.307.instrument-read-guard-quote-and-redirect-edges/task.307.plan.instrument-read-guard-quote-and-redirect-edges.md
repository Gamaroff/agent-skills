---
id: task.307.plan
title: "Implementation Plan: Instrument-read guard quote and redirect edges"
type: plan
task-ref: task.307.instrument-read-guard-quote-and-redirect-edges.md
---

# Implementation Plan: Instrument-read guard quote and redirect edges

Single file changed: `tests/orchestration-instrument-reads.test.js`, plus a `CHANGELOG.md` line. Every probe below was run on 2026-11-14 against the matcher as it stands.

## Phase 1 — Quote edge

Reproduced misses: `cmd; echo foo'bar; baz' $?` and `cmd; echo "a"'s; b' $?` both return `false`; the control `cmd; echo foo 'bar; baz' $?` returns `true`.

Recommended: **option 2, balance.** In `maskQuoted`, a single quote that is not at a word boundary opens a quote only when a matching `'` exists later on the line. An apostrophe with no partner (`Don't …`, `it's …`) stays prose, so the task 299 cycle 3 controls keep passing.

Known limit to record in the header whichever option wins: two apostrophes on one line (`it's … don't`) pair up and mask the text between them. Name it as an unseen shape, with a fixture showing the verdict.

Fixtures (flagged): both T299-QA-7 shapes. Fixtures (controls, unchanged): `Don't write cmd; echo "rc=$?"`, `it's cmd; echo "rc=$?"`, and the prose line with a real `>>` redirect.

## Phase 2 — Redirect and capture edges

- `REDIRECT` today is `/(^|[^0-9&])>/`. Replace it so `&>`, `&>>`, `1>` and `1>>` count as redirects while `2>&1` does not. Probe before and after: `&> log` and `1> log` return `true` today (false positives); `1>> log` already returns `false`.
- Each redirect form gets a passing fixture and an unredirected twin that stays flagged.
- Captured status, `x=$(cmd; echo $?)`: returns `true` today. Decision to record in the QA report: leave it flagged. A wrapper inside `$( … )` is rare in shipped prose and teaching it is harmless; name it in the header as a shape the guard flags although the echo is captured.

## Phase 3 — Prove and record

- Mutation proof per fix: revert the balance rule, then the redirect pattern, one at a time with the Edit tool; name the fixture that goes red each time; restore.
- Population: `command node --test tests/orchestration-instrument-reads.test.js` reports the clean scan.
- Header: rewrite the "knowingly does NOT see" list to match the guard after the change.
- `CHANGELOG.md`: one entry citing `(task 307)`.
- Timing: median of five runs of the test file, `uptime` beside each.
