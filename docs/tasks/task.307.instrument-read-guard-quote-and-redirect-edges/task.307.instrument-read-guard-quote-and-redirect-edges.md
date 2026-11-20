---
id: task.307
title: "Instrument-read guard quote and redirect edges"
type: task
description: "Close the two edge cases task 299 left open in its guard: a single quote glued to the previous word is not masked, and an echo redirected with &> or 1> is flagged as a wrapped status."
tags: [develop-task, qa-task, test-harness]
category: testing
status: accepted
completed_date: 2026-11-14
pr_number: 902
priority: Low
created: 2026-11-13
updated: 2026-11-14
estimated_effort_hours: 2
---

# Technical Task: Instrument-read guard quote and redirect edges

**Status:** Accepted

Follow-up to task 299. Source: task.299 gate 4 `recommendations.future` (T299-QA-7 and CR-2); not from the observation log.

---

## 1. Overview

`tests/orchestration-instrument-reads.test.js` (task 299) fails on prose that teaches a background step's status as the echo after the command, `cmd; echo "rc=$?"`. Task 299's QA left two edges open, both reproduced by running the matcher, neither present in the shipped population. This task closes them: the guard masks a quote glued to the preceding word, and it treats `&>` and `1>` as the redirects they are. It also decides what the guard says about a status captured inside `$( … )`.

Key deliverables: the guard fix, flagged and passing fixtures per shape, a mutation proof per fix, and the header's unseen-shapes list brought up to date.

## 2. Motivation

**Current problems** (each run on the matcher at `tests/orchestration-instrument-reads.test.js:74` on 2026-11-13):

- **A miss (T299-QA-7).** `cmd; echo foo'bar; baz' $?` and `cmd; echo "a"'s; b' $?` return `false`. The single quote opens only after whitespace or an operator (`tests/orchestration-instrument-reads.test.js:63`), so the glued quote is not masked, the `;` inside it splits the echo, and the `$?` is never seen. The control with a space before the quote, `cmd; echo foo 'bar; baz' $?`, returns `true`.
- **A false positive (CR-2, redirects).** `cmd; echo "rc=$?" &> log` and `cmd; echo "rc=$?" 1> log` return `true` (`1>>` already returns `false`, because the second `>` follows a `>`). `REDIRECT` (`tests/orchestration-instrument-reads.test.js:73`) skips a `>` that follows a digit or `&`, so `2>&1` is not a redirect, and that also makes `&>` and `1>` read as non-redirects. The echo in both lines goes to a file, which is the corrected form the guard exists to teach.
- **A false positive, or a stated choice (CR-2, capture).** `x=$(cmd; echo $?)` returns `true`. The `echo` there is captured into a variable, not the step's last command, so the notification's code is not the wrapper's. Whether the guard should flag it is a decision, not an obvious bug.

**Benefits:** a guard whose stated limits are true. A false positive on the corrected form teaches authors to allowlist or reword, and an allowlist nobody believes is a guard nobody reads.

## 3. Technical Background

**Current state** (each name below was found with `grep -n` on 2026-11-13):

- `maskQuoted(line)` — `tests/orchestration-instrument-reads.test.js:53`. Masks `;`, `&`, `|`, `>` inside quotes with `_`, so quoted text is parsed once. A double quote opens anywhere; a single quote opens only at a word boundary (`:63`), added in task 299 cycle 3 so an apostrophe in prose (`Don't`) does not open one.
- `ECHO_AFTER_OPERATOR` — `:70`. An `echo` after `;`, `&`, `&&`, `|` or `||`, capturing its arguments up to the next operator.
- `REDIRECT` — `:73`, `/(^|[^0-9&])>/`. A `>` not preceded by a digit or `&`.
- `wrappedStatus(line)` — `:74`. True when an echo's arguments read `$?` or `${?}` and carry no redirect.
- The header (`:3` to `:34`) names what the guard does not see. It does not name a glued single quote, `&>`, `1>` or a captured status.

**Target.** The matcher agrees with the shell on these shapes, or the header names the ones it does not.

**Population for the clean-scan criterion:** tracked `shared/resources/*.md` and `skills/*/SKILL.md`, as the guard derives it (`tests/orchestration-instrument-reads.test.js`, the population test). Record the command and let the test report the count.

**The tension to resolve, stated once.** A single quote opens at a word boundary because an apostrophe in prose must not open one (task 299 gate 3: `Don't write cmd; echo "rc=$?"` masked the `;` and passed). A glued quote is the opposite case: `foo'bar` is a quote in shell and an apostrophe in prose (`it's`). The two cannot be told apart by position alone. The plan therefore picks between three options, all with fixtures that include the task 299 cycle 3 apostrophe cases as controls:

1. Treat a quote after a closing quote as a boundary (`"a"'s; b'`), and a quote after a word character as prose. This catches the second QA-7 shape and leaves `foo'bar; baz'` as a named unseen shape.
2. Track balance: open a quote at a glued position only when a matching close exists later on the line. This catches both shapes and keeps `it's fine; echo $?` clean.
3. Name both glued shapes in the header and change nothing.

## 4. Scope

**In scope:** ✅ `tests/orchestration-instrument-reads.test.js` ✅ fixtures per shape, flagged and passing ✅ a mutation proof per fix ✅ the header's unseen-shapes list ✅ a `CHANGELOG.md` entry.

**Out of scope:** ❌ new wrapped-status shapes beyond the three above (`printf`, `tee`) ❌ the 70 date-only placeholders task 299 named as an unseen shape ❌ any change to shipped prose. If the clean-scan criterion finds a real hit in shipped prose, file it as its own task.

## 5. Breaking Changes

None. A guard test change; no shipped behaviour moves.

## 6. Implementation Plan

> Detailed implementation guide: [task.307.plan.instrument-read-guard-quote-and-redirect-edges.md](task.307.plan.instrument-read-guard-quote-and-redirect-edges.md)

### Phase 1: Quote edge — Risk: Medium

- [x] Choose option 1, 2 or 3 from § 3 and record the choice and the evidence in the QA report.
- [x] If 1 or 2: change `maskQuoted`; add flagged fixtures for both T299-QA-7 shapes and keep every task 299 cycle 3 apostrophe fixture passing.
- [x] If 3: add the glued-quote shapes to the header's unseen list. (Not applicable: option 2 chosen.)

### Phase 2: Redirect and capture edges — Risk: Low

- [x] Make `&>`, `&>>`, `1>` and `1>>` count as redirects, keeping `2>&1` not a redirect. Fixtures: each form passing, each unredirected form flagged.
- [x] Decide the captured-status shape (`x=$(cmd; echo $?)`), record the decision, and either skip it with a fixture or name it as an unseen shape.

### Phase 3: Prove and record — Risk: Low

- [x] Mutation-prove each fix: revert the behaviour, confirm a named fixture goes red, restore with the Edit tool.
- [x] Confirm the shipped population still scans clean.
- [x] Update the header's unseen-shapes list to match what the guard does after this task.
- [x] `CHANGELOG.md` entry citing `(task 307)`.

## 7. Files Summary

**Core:** `tests/orchestration-instrument-reads.test.js` (modified).
**Documentation:** `CHANGELOG.md`.
No `package.json` edit: the guard already matches the `tests/*.test.js` glob, and `tests/test-runner-reach.test.js` is the backstop.

## 8. Testing Strategy

Assert behaviour: each shape in § 2 is a fixture, flagged or passing, and the matcher's verdict is what the test asserts. Mutation-prove each fix. Run `command node --test tests/orchestration-instrument-reads.test.js`, then the whole suite through `npm run test:remote`.

The apostrophe cases from task 299 cycle 3 (`Don't write cmd; echo "rc=$?"`, `it's …`, and the prose case with a real `>>` redirect) stay as controls. A fix for the glued quote that turns one of them green is a regression, not a fix.

## 9. Success Criteria

**Functional**

- [x] Both T299-QA-7 shapes are flagged, or both are named in the header as unseen with the reason (the option chosen in Phase 1 decides which).
- [x] `&>`, `&>>`, `1>` and `1>>` are treated as redirects: the redirected echo passes and the unredirected form is flagged.
- [x] Every task 299 cycle 3 apostrophe fixture still behaves as before.
- [x] The captured-status shape has a recorded decision and a fixture or a header entry.

**Performance**

- [x] The guard adds at most 3 seconds to `ci:fast`: median of five runs of `command node --test tests/orchestration-instrument-reads.test.js`, with `uptime` beside each, outliers reported, recorded in the QA report.

**Code quality**

- [x] Each fix is mutation-proven: the QA report names the reverted behaviour and the fixture that went red.
- [x] The shipped population scans clean.
- [x] `npm run bundle:check`, `format:check`, `lint:shell` and `ci:fast` pass.

**Migration**

- [x] `CHANGELOG.md` entry citing `(task 307)`.

## 10. Risk Assessment

**High:** none. **Medium:** a quote rule loose enough to catch `foo'bar; baz'` also masks an apostrophe in prose and hides a real wrapped status. Mitigation: the cycle 3 apostrophe fixtures are controls and run in the same test. **Low:** the redirect change flags less than before, so a shape that used to be flagged now passes. Mitigation: each redirect form has an unredirected twin that must still be flagged.

## 11. Rollback Plan

Revert the commit. The change is one test file and a changelog line, so there is nothing to migrate. Triggers: the guard fails on unrelated work (Critical); a header wording (non-critical, fix forward).

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-14
**Quality Score**: 95/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.307.qa.1.instrument-read-guard-quote-and-redirect-edges.md](./task.307.qa.1.instrument-read-guard-quote-and-redirect-edges.md)
- **Gate File**: [task.307.gate.1.instrument-read-guard-quote-and-redirect-edges.yml](./task.307.gate.1.instrument-read-guard-quote-and-redirect-edges.yml)

### Test Coverage Summary
- **Tests Executed**: 5 in the guard file; 8469 passed on the remote `ci:fast`
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No critical issues identified.

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

✅ **Acceptance criteria:** all 9 met (QA gate PASS 95/100; four mutation proofs, each red on a named fixture)
✅ **PR:** #902, PR review APPROVE; CI green on the head before acceptance
✅ **Documentation:** guard header and `CHANGELOG.md` entry citing `(task 307)`
✅ **Security / Compliance:** not applicable (test-only change)

**Detailed Verification Log:** see `task.307.dod.1.instrument-read-guard-quote-and-redirect-edges.md`.

## Change Log

<!-- change-log-start -->

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-11-13 | 1.0     | Initial draft | create-task |
| 2026-11-14 | 1.1     | Review passed (8/10): empty plan file written, line anchor `:64` corrected to `:63` | review-task |
| 2026-11-14 |         | Status → ready-for-development | review-task |
| 2026-11-14 |         | QA gate PASS (95/100) — 0 findings | qa-task |
| 2026-11-14 | 1.2     | DoD verified — accepted (PR #902) | finalise |

<!-- change-log-end -->

## Progress Tracking

- [x] Phase 1
- [x] Phase 2
- [x] Phase 3

## References

- Task 299 gate 4 `recommendations.future`: `docs/tasks/task.299.orchestration-status-and-timestamp-from-the-instrument/task.299.gate.4.orchestration-status-and-timestamp-from-the-instrument.yml`
- Task 299 QA reports 3 and 4 (T299-QA-6, T299-QA-7, CR-2)
