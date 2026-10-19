# QA Report: Task 192 - Read-back checks this cycle's verdict

**Task**: [task.192](./task.192.read-back-checks-this-cycles-verdict.md)
**Gate File**: [task.192.gate.1.read-back-checks-this-cycles-verdict.yml](./task.192.gate.1.read-back-checks-this-cycles-verdict.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-19
**Testing Completed**: 2026-10-19
**Gate Status**: CONCERNS

---

## Executive Summary

First review of PR #688. Every functional criterion is held by a named, committed test, the fast gate
is green (5893/0), and a 17-case probe of the read-back CLI rejected 11 of 12 hostile documents. Two
findings remain: the SKILL.md descriptions of the read-back were not updated (MEDIUM), and a QA
section is judged on its first `**Gate Decision**` line only (LOW).

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — QA-1 fixed

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete; status `ready-for-review`
- [x] All 3 implementation phases checked complete
- [x] Tests passing
- [x] Breaking changes documented (none for a correct document)
- [x] Code on `feature/task.192.read-back-checks-this-cycles-verdict`, PR #688 open

### Review Methodology

Direct tools (3 phases, single module, low risk) plus one read-only Explore code reviewer over the
`origin/develop...HEAD` diff (8 files, generated `references/` copies and `docs/tasks` excluded from the
patch; the reviewer diffed the copies against their sources). Reviewer dispatched 07:24Z, returned in
107951 ms (`duration_ms`). First review — no re-review scope.

Step 4b: not applicable — no runnable prose in the change set (no `SKILL.md` or
`shared/resources/*.md` changed).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Verdict checks | CONCERNS | Verified | `verdictProblems()` at `qa-read-back.js:117`; first decision line only (QA-2) |
| Phase 2: Lock retry | PASS | Verified | 4 attempts at 200/400/800 ms, once per run; `stageAttempts` |
| Phase 3: Bundle and changelog | CONCERNS | Verified | bundle in sync, CHANGELOG present; SKILL.md descriptions not updated (QA-1) |

**Overall Phase Completion**: 3/3 implemented, 2 with findings

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| A differing `**Gate Decision**` exits 1 | test "halts on a **Gate Decision** that differs from the gate's token" | PASS |
| A newest QA row not naming the token is a problem; a later `qa-fix` row is not | "halts on a newest QA row that names another verdict"; "task/story: a qa-fix and a finalise row after the QA row still read clean" | PASS |
| A missing `**Gate Decision**` line is a problem | "halts on a QA section with no **Gate Decision** line" | PASS |
| Lock released → clean; persistent → 4 attempts; non-lock → 1 | "a lock released during the backoff…", "a lock that outlasts the backoff is reported after 4 attempts", "a failure that is not a lock is reported on the first attempt, with no wait" | PASS |
| Performance: at most 1.4 s, persistent-lock path only | the outlasts test asserts sleeps `[200,400,800]` across all paths; the non-lock test asserts no sleep | PASS |
| `npm test`, `bundle:check`, `prettier --check .` pass | ci:fast 5893/0 at this tree; `bundle:check` rc 0; `prettier --check .` rc 0 | PASS |
| CHANGELOG names both checks and the retry | `CHANGELOG.md:172-179` | PASS |

---

## Breaking Changes Validation

None declared. Over-firing control: the engine read the accepted documents of 12 tasks clean
(implementation report § Step 3). **Overall**: PASS.

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: SKILL.md read-back sections omit the verdict check and the lock retry (QA-1)**
- **Severity**: MEDIUM · **Category**: Quality (documentation accuracy)
- **Bug Report**: [task.192.bug.1.skill-md-read-back-omits-verdict-check.md](./task.192.bug.1.skill-md-read-back-omits-verdict-check.md)
- **Observation**: `skills/qa-task/SKILL.md:1606` and `skills/qa-story/SKILL.md:2144` say the read-back
  "checks four things" and that "a `git add` that fails halts". Population enumerated by
  `git grep -n "qa-read-back" -- 'shared/resources/*.md' 'skills/*/SKILL.md'`: only these two describe
  the checks; the step 5–6 loop doc names the script without listing them.
- **Recommendation**: add the verdict check as item 5 with its remedy; amend item 2 for the retry.

### LOW Severity Issues (1)

**QA-2** — `verdictProblems` reads the first `**Gate Decision**` line of each section only. A section
whose first line matches and whose later line is stale reads clean (probe case
`stale-decision-after-current`, reproduced; its mirror `stale-decision-before-current` is rejected).
Plausibility, measured: 0 of 191 tracked documents with a QA section carry two decision lines, and
`upsertQaResults` replaces the section whole. Kept LOW; cheap to close with `matchAll`.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
Persistent lock ≤ 1.4 s per run; non-lock failure 0 ms wait (both asserted).

### Reliability — PASS
Retry keyed on `index.lock` in stderr only; exit 2 stays "could not look".

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 17 (copied from the run record's `totals.executed`)
- `boundary: true` — `qa-read-back.js` exit 1 blocks the QA commit and the PR comment. Probed as
  `cli:shared/resources/qa-read-back.js --argv '["--doc","{input}"]'`, the form task.149 used, with a
  17-case file of fixture documents in one scratch repository (5 legitimate, 12 hostile, each hostile
  case `expected: {exit: 1}` so a could-not-look exit 2 cannot score as a refusal). Verdict
  `present-but-inert`: 16 passed, 1 reproduced (QA-2). Record:
  `task.192.qa.1.security.run.json`.

### Maintainability — CONCERNS
QA-1.

---

## Code Review

Advisory except where promoted; `code_review_blocking=true` (pipeline), so only `bug` + `high`
confidence would map — none did. QA-1 is QA's own finding, raised after verifying CR-1.

**Correctness bugs (1):**
- [medium/medium] `shared/resources/qa-read-back.js:27` — the SKILL.md read-back descriptions still
  list four checks → document the verdict check in both (verified; raised as QA-1)

**Cleanups (2):**
- `shared/resources/tests/qa-read-back.test.mjs:686` — the real-time CLI test does not assert a retry
  happened → assert `stageAttempts > 1`. Not taken: the start-up race is why the assertion was left
  out (implementation report, deviation 2); the seam test holds the retry.
- `shared/resources/qa-read-back.js:148` — a document with no Change Log rows gets two problems for
  one cause → skip the QA-row problem when there are no rows (routed to `recommendations.future`).

All three anchors checked by `finding-anchors.js` (`ok`).

mutation-proven: removed the `verdictProblems` call at `qa-read-back.js:382` → 8 tests in
`qa-read-back.test.mjs` red (the verdict HALT cases) → covered. Baseline green after the snapshot
restore. The five development-time proofs are in the implementation report § Step 3.

---

## Regression Testing

`qa-read-back.test.mjs` 46/46 (and under `TMPDIR=/tmp`), the bundled qa-task copy 46/46,
`qa-read-back-block.test.js` 12/12 — 104/104 together. Full ci:fast at this tree: 5893/0. PASS.

---

## Test Artifacts

### Test Commands Executed
```bash
command node --test shared/resources/tests/qa-read-back.test.mjs tests/qa-read-back-block.test.js skills/qa-task/references/tests/qa-read-back.test.mjs
TMPDIR=/tmp command node --test shared/resources/tests/qa-read-back.test.mjs
npm run bundle:check
npm run validate -- skills/qa-task/ ; npm run validate -- skills/qa-story/
./node_modules/.bin/prettier --check .
command node shared/resources/security-probe.mjs --sink markdown-structure --entry 'cli:shared/resources/qa-read-back.js' --argv '["--doc","{input}"]' --cases-file <scratch>/cases.json --record docs/tasks/task.192.read-back-checks-this-cycles-verdict/task.192.qa.1.security.run.json --json
```

Standards-named validation: `npm run validate -- skills/qa-task/` and `npm run validate -- skills/qa-story/`,
both rc 0 (a first call passing both directories at once printed the usage line and is not counted).
CI's `validate` job also passed at `ac1d5566`.

### Coverage Report
Not measured — `node:test` without coverage instrumentation; coverage is per criterion above.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Engine behaviour meets every criterion. One MEDIUM documentation-accuracy finding
remains, plus one LOW finding the probe reproduced.
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — QA-1 fixed
**Next Steps**: `/qa-fix` cycle 1 (QA-1, QA-2), then QA cycle 2.
