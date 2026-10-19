---
id: task.192
title: "Read-back checks this cycle's verdict"
type: task
description: "qa-read-back.js refuses a document whose QA section Gate Decision or newest QA Change Log row does not match this cycle's gate token, and retries a git add that fails only on a transient .git/index.lock before reporting it."
tags: [qa-task, qa-story, qa-read-back, observation, index-lock]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-10-07
updated: 2026-10-19
assignee:
estimated_effort_hours: 8
github_issue: 591
---

# Technical Task: Read-back checks this cycle's verdict

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.192.review.1.read-back-checks-this-cycles-verdict.md` implemented 2026-10-19
**GitHub Issue**: [#591](https://github.com/Gamaroff/agent-skills/issues/591)

---

## 1. Overview

`shared/resources/qa-read-back.js` is the check qa-task Step 12b and qa-story item 3e run before a QA
cycle posts its comment. It already requires the document to link this cycle's gate and report
(task.158, `1002e881`). It does not check that the document's **verdict** is this cycle's. A
document whose `**Gate Decision**` or newest QA Change Log row still carries the previous cycle's
verdict reads clean (obs #205). Separately, its staging step turns a transient `.git/index.lock`,
held for a moment by an editor's git refresh, into a HALT (obs #216). This task adds the verdict
checks and a bounded retry on that one failure.

**Scope**: `shared/resources/qa-read-back.js`, `shared/resources/tests/qa-read-back.test.mjs`, the
bundled copies, a CHANGELOG entry.

**Key deliverables**:

1. Two new problems: `**Gate Decision**` in the QA section differs from this cycle's gate `gate:`
   token, and the newest `qa-task`/`qa-story` Change Log row does not name that token.
2. `stage()` retries `git add` on an `index.lock` failure with a short backoff, then reports it if it
   persists. Any other failure is reported at once, as today.

---

## 2. Motivation

### Current Problems

1. **A stale verdict reads clean** (obs #205). On task.163 QA cycle 2 (2026-09-28) a failed `node -e`
   patch left the document's QA section and Change Log at cycle 1. `qa-read-back.js` printed
   `ok … gate, report and Change Log row present` and exited 0. task.158 has since added the
   this-cycle link check, which would catch that run's stale links. A document whose links were
   updated and whose verdict line or row was not still passes.
2. **A transient lock HALTs a correct document** (obs #216). On task.158 QA cycle 1 (2026-09-29) the
   read-back HALTed twice with `fatal: Unable to create '.git/index.lock': File exists`, while VS Code
   refreshed the index; a third run seconds later was clean. It recurred on task.140 (2026-09-30)
   twice and on task.170 (2026-10-04). The script's own message, "a held .git/index.lock? retry",
   names the remedy and leaves it to a human.

### Benefits

- Step 12b refuses to post a comment over the previous cycle's verdict.
- A read-back no longer HALTs on a lock that clears within a second.

---

## 3. Technical Background

### Current Architecture

Line numbers are from `develop` at `41adc7bb` (re-measured by review 1), paired with the text they point at.

- **Staging**: `const stage = (abs) => { const r = git(["add", "--", rel(abs)], root); …` (`:213`).
  On any non-zero exit it records `could not stage <path> (<stderr>) — a held .git/index.lock? retry`
  (`:218`). There is no retry. `git` is a `spawnSync` wrapper (`function git(args, cwd)`, `:67`).
- **This-cycle checks**: the gate and report come from `qa-cycle.sh --path` (`function artifact`,
  `:95`). Since `1002e881` (2026-09-29) a document that does not link them gets
  `the document does not link this cycle's gate …` (around `:266`). The Change Log check is
  `engines.changeLog.checkUpdatedCoherence` (`:277`), which asks only that a row exists and that
  `updated:` is not older than it.
- **Parsers to reuse**: `findQaResults(content)` (`shared/resources/qa-results.js:597`, exported) returns
  `{ sections, changeLog }`. `extractEntries` (exported from `shared/resources/change-log.js`) returns
  the log's rows as strings.
- **Field shapes**: the QA section writes `**Gate Decision**: <TOKEN>` (the field list `RE_QA_FIELD` at
  `qa-results.js:160`); the QA row reads `QA gate <TOKEN> (<score>) — …` with author `qa-task` or
  `qa-story` (`skills/qa-task/SKILL.md:1575`, `skills/qa-story/SKILL.md:1547`). In the document the
  token is bare (`**Gate Decision**: PASS`); the emoji form at `qa-story/SKILL.md:2207` is the PR-comment
  body, not the document.
- **Tests**: `shared/resources/tests/qa-read-back.test.mjs`; its case "a stage that fails" writes a
  persistent `.git/index.lock` and expects `/could not stage/` (`:158`–`:162`). Every case is built on
  one fixture, `repo()` (`:29`), whose gate is `gate: FAIL`, which has **no** `## QA Testing Results`
  section, and whose only Change Log row is authored `a`. The verdict checks make that fixture HALT, so
  Phase 1 must update it (below). Tests call `readBack()` in-process; the runner reaches the file
  through `shared/resources/tests/*.test.mjs` in `package.json`.
- **Existing retry mechanisms** (same class): `gh-stage.js` has `withRetry` (`:292`, retries every
  thrown error at 1 s / 2 s) and `sleepSync` (`:308`, `Atomics.wait` in a `try`); `resolve-platform.sh`
  has the shell `tracker_call_with_retry`. The new retry **sits beside** them: it must retry only an
  `index.lock` failure and report every other failure on the first attempt, which `withRetry` does not
  do, and requiring `gh-stage.js` would pull a tracker CLI into the qa-task/qa-story bundle closure.
  It copies `sleepSync`'s guarded `Atomics.wait`. One shared helper is a Future Improvement.

### Target Architecture

- **Verdict checks**, after the link checks:
  1. Read this cycle's gate token: the `gate:` line of the gate file `artifact()` returned.
  2. `**Gate Decision**` inside the QA section `findQaResults` finds (the span `start`–`end` of each
     entry in `sections`). No QA section → problem `the document has no ## QA Testing Results section —
     the Step 12 edit did not land`. A section with no `**Gate Decision**` line → problem
     `the QA section has no **Gate Decision** line`. A different token → problem
     `**Gate Decision** is <X> but this cycle's gate <file> says <TOKEN> — the Step 12 edit did not land`.
     More than one section → each is read, and each mismatch is its own problem.
  3. The newest Change Log row (from `extractEntries`) whose author cell — the last non-empty cell — is
     `qa-task` or `qa-story`. Missing → problem. When its description does not match
     `QA gate <TOKEN>` followed by a word boundary → problem naming the row and the token.
     Rows by other authors after it (`qa-fix`, `finalise`) are ignored.
- **Lock retry**: `stage()` retries `git add` when stderr contains `index.lock`, up to 3 more
  attempts at 200 ms, 400 ms and 800 ms (a synchronous sleep via `Atomics.wait` on a
  `SharedArrayBuffer`, since the script is synchronous). A lock that outlasts the backoff is reported
  as today, with "(after 4 attempts)". Any other failure is reported on the first attempt. The
  `--json` result gains `stageAttempts`, an object mapping each staged path (repo-relative) to the
  number of `git add` attempts it took.

### Important Clarifications

- **Measured before writing**: the verdict rule was run against the accepted documents of tasks
  183, 185, 186, 170 and 172 on `5978d32e`; review 1 re-ran it on `41adc7bb` over those five plus 189,
  190, 191, 204, 205, 206 and 207 — all twelve agree (PASS ×8, CONCERNS ×4). In each, the newest gate's token, the `**Gate Decision**`
  line and the newest `qa-task` row agree. The rule does not over-fire on a correct document. The
  command is in the plan. The test re-measures it on fixtures, not on these documents.
- `review-pr` Step 7 and `commit-changes` hit the same lock race (obs #216's 2026-10-04 line). They
  are out of scope; see Future Improvements.

---

## 4. Scope

### In Scope

✅ `qa-read-back.js`: verdict checks and lock retry.
✅ `qa-read-back.test.mjs` cases; bundled copies; CHANGELOG.

### Out of Scope

❌ Retries in `review-pr` Step 7 and `commit-changes`.
❌ Changing what Step 12 writes, or the row format.

---

## 5. Breaking Changes

None. A document that reads clean today and whose verdict matches its gate reads clean after.
A document whose verdict line or newest QA row disagrees with this cycle's gate now HALTs Step 12b.
That is the defect the check exists for.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.192.plan.read-back-checks-this-cycles-verdict.md](task.192.plan.read-back-checks-this-cycles-verdict.md)

### Phase 1: Verdict checks (obs #205)

**Risk**: Low. **Files**: `shared/resources/qa-read-back.js`, its test.

- [x] Update the shared test fixture `repo()` so a complete cycle stays clean: a
  `## QA Testing Results` section with `**Gate Decision**: FAIL` (matching its `gate: FAIL`) and a
  Change Log row `QA gate FAIL (…) — …` authored `qa-task` (task shape) / `qa-story` (story shape).
- [x] Read the gate token from this cycle's gate file.
- [x] Compare the QA section's `**Gate Decision**` (via `findQaResults`) to it.
- [x] Compare the newest `qa-task`/`qa-story` row (via `extractEntries`) to it.
- [x] One problem message per mismatch, naming the gate file and both values.

### Phase 2: Lock retry (obs #216)

**Risk**: Low. **Files**: same.

- [x] Retry `git add` on `index.lock` stderr, 3 more attempts with 200/400/800 ms backoff.
- [x] Keep the existing message for a persistent lock, add the attempt count.
- [x] Expose `stageAttempts` (`{ path: attempts }`) in the result.

### Phase 3: Bundle and changelog

**Risk**: Low. **Files**: bundled copies, `CHANGELOG.md`.

- [x] `npm run bundle`; `npm run bundle:check` clean.
- [x] `[Unreleased]` › Fixed entry citing obs #205 and #216.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/qa-read-back.js`

### Files to Modify (Tests)

2. ✅ `shared/resources/tests/qa-read-back.test.mjs`
2a. ✅ `tests/qa-read-back-block.test.js` — runs the SKILL.md read-back blocks against its own
   consumer-shaped fixture; its fixture gains the verdict and its hand-written engine copy list gains
   `qa-results.js` (found by the fast gate: `git grep -ln qa-read-back -- '*.test.*'` lists four
   files, two of which only pin SKILL.md text)

### Files to Modify (Generated)

3. ✅ Bundled copies of `qa-read-back.js` under `skills/*/references/` (qa-task, qa-story and any
   other the bundler reaches), regenerated by `npm run bundle`.

### Files to Modify (Documentation)

4. ✅ `CHANGELOG.md`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Command**: `command node --test shared/resources/tests/qa-read-back.test.mjs`
- **Verdict**: from the updated clean fixture (gate `FAIL`, section `FAIL`, row `QA gate FAIL`, per
  Phase 1): change the section to `CONCERNS` → problem naming both values; change only the newest `qa-task`
  row to `QA gate CONCERNS` → problem; delete the `**Gate Decision**` line → problem; delete the
  whole QA section → problem; append a
  `qa-fix` row after the QA row → still clean (**control**: the rule reads the newest QA row, not the
  newest row).
- **Lock**: a lock file removed by a timer during the backoff → clean, staged (the case the retry
  exists for). The existing persistent-lock case still reports `could not stage`, now with
  "after 4 attempts". A non-lock `git add` failure reports on the first attempt (`stageAttempts` = 1),
  with no added delay. The input is a gitignored gate (`*.yml` added to the fixture's `.gitignore`):
  `git add` exits 1 with "paths are ignored" and no `index.lock` in stderr (measured by review 1). A path
  outside the repository is not reachable — `stage()` only receives the document, the gate, the report
  and link targets inside the work item's directory.

### Integration Tests

- `npm test`, `npm run bundle:check`.

### Mutation proofs

- Compare against the newest row of any author → the `qa-fix` control goes red.
- Retry on every failure → the non-lock case's attempt-count assertion (`stageAttempts` = 1) goes red.

### Performance Tests

- The persistent-lock path now waits 1.4 s before reporting. No test asserts wall-clock beyond the
  non-lock case's "no added delay", which is checked by attempt count, not seconds.

---

## 9. Success Criteria

### Functional

- [ ] A `**Gate Decision**` that differs from this cycle's gate token is a problem, and the read-back
  exits 1 — held by `qa-read-back.test.mjs` (Phase 1).
- [ ] A newest `qa-task`/`qa-story` row that does not name the token is a problem; a later `qa-fix`
  row does not trigger it — held by the same test (Phase 1).
- [ ] A missing `**Gate Decision**` line is a problem — held by the same test (Phase 1).
- [ ] A lock released during the backoff stages cleanly; a persistent lock is reported after 4
  attempts; a non-lock failure is reported after 1 — held by the same test (Phase 2).

### Performance

- [ ] Not applicable: the retry adds at most 1.4 s, and only to the persistent-lock path.

### Code Quality

- [ ] `npm test`, `npm run bundle:check`, `prettier --check .` pass.

### Migration

- [ ] CHANGELOG entry names both new checks and the retry.

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **The verdict check HALTs a correct document written in an older shape**
   - **Risk**: a document whose QA section predates `**Gate Decision**`, or whose row reads
     differently.
   - **Probability**: Low: it runs only on the cycle being read back, which the current Step 12
     writes. Five accepted documents pass (§ 3).
   - **Mitigation**: messages name the field and the expected value; a fixture per shape.

### Low Risk Areas

1. **A lock held by a long git operation** still HALTs after 1.4 s; the message says it was retried.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: Step 12b HALTs correct documents across tasks.
- **Steps**: `git revert` the merge commit; `npm run bundle`; `npm test`.
- **Validation**: `qa-read-back.test.mjs` green on `develop`.

### Partial Rollback (1-2 hours)

- Phase 1 and Phase 2 revert independently.

### Forward Fix (< 4 hours)

- A shape the verdict check misreads: extend the parse; add the fixture.

### Rollback Triggers

- **Critical**: a correct document refused.
- **Non-critical**: a message that misnames the field.

---

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-07 | 1.0 | Initial draft — cut from observations #205, #216 | create-task |
| 2026-10-19 | 1.1 | Review passed (8/10) — fixture update added to Phase 1, reachable non-lock failure input, existing retry mechanisms named, anchors refreshed | review-task |
| 2026-10-19 |  | Status → ready-for-development | review-task |
| 2026-10-19 |  | Implemented — engine, 2 test suites, CHANGELOG (bundled copies regenerated); 16 new tests | develop |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Verdict checks

- [x] Complete 2026-10-19 — `verdictProblems()`: gate token, every QA section's `**Gate Decision**`, newest `qa-task`/`qa-story` row; fixtures of both read-back suites updated

### Phase 2: Lock retry

- [x] Complete 2026-10-19 — `stage()` retries an `index.lock` failure at 200/400/800 ms, once per run; `stageAttempts` in the result

### Phase 3: Bundle and changelog

- [x] Complete 2026-10-19 — `npm run bundle` (qa-task, qa-story copies), `bundle:check` clean, CHANGELOG `[Unreleased]` › Fixed

### Implementation Summary

**Approach.** Phase 1 adds `verdictProblems(engines, text, gateFile)` to `qa-read-back.js`, called after
the link checks when this cycle's gate exists. It reads the gate's `gate:` token, every section
`findQaResults` returns, and the newest row from `extractEntries` whose last cell is `qa-task` or
`qa-story`. Phase 2 wraps `git add` in a four-attempt loop that continues only while stderr names
`index.lock`.

**Deviations from the plan (each recorded in the implementation report).**

1. **One backoff per run, not per path.** A persistent lock waited 1.4 s on every staged path
   (≥ 4 paths ≈ 5.6 s) — not the "at most 1.4 s" § 8 states. Once one path exhausts the backoff, later
   paths try once. Held by "a lock that outlasts the backoff is reported after 4 attempts".
2. **An injectable `sleepMs` seam** (`readBack(doc, { sleepMs })`, the shape of `gh-stage.js`
   `withRetry`). The plan's only released-lock test removed the lock on a 300 ms timer while a child
   started; under load the child can start after the timer, so an attempt-count assertion there
   would flake. The deterministic case uses the seam; the child-process case is kept and asserts
   only exit 0 and the staged file.
3. **A gate with no readable `gate:` token is a problem.** The plan said it "is already a problem
   elsewhere (check `artifact()`)"; `artifact()` reads no content, so without a message the verdict
   check would silently skip.

**Testing results.** `qa-read-back.test.mjs` 46/46 (16 new cases); `qa-read-back-block.test.js`
12/12. Five mutation proofs each turn a named test red (implementation report § Step 3). The engine
reads all twelve accepted documents measured in § 3 clean (`exit 0`, no problems).

**Completion date.** 2026-10-19.

**Deferred work.** None beyond § Future Improvements (the shared lock-retry helper for `review-pr`
Step 7 and `commit-changes`).

---

## References

- Observation #205 — qa-read-back passes on a QA section left at the previous cycle's gate
- Observation #216 — qa-read-back staging HALTs on a transient index.lock from an editor's git refresh
- `1002e881` (task.158) — the this-cycle link check this task extends

---

## Notes

### Important Reminders

- QA artifacts land beside this document: `task.192.qa.{n}.read-back-checks-this-cycles-verdict.md`,
  `task.192.gate.{n}.read-back-checks-this-cycles-verdict.yml`, bug reports as
  `task.192.bug.{N}.{name}.md`.

### Future Improvements

- The same bounded `index.lock` retry for `review-pr` Step 7's `git add` and `commit-changes`
  (obs #216, 2026-10-04 recurrence), ideally as one shared helper.
