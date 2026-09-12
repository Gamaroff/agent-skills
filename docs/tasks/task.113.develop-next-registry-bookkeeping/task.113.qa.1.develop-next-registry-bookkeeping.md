# QA Report: Task 113 - develop-next's Step 4, merge gate and Step 1→2 signal still assume a roadmap-sourced, PASS-gated item

**Task**: [Link to task document](./task.113.develop-next-registry-bookkeeping.md)
**Gate File**: [task.113.gate.1.develop-next-registry-bookkeeping.yml](./task.113.gate.1.develop-next-registry-bookkeeping.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-12
**Testing Completed**: 2026-09-12
**Gate Status**: CONCERNS

---

## Executive Summary

All three phases are implemented as specified and the suite is green (3221/3222, 0 fail; 93/93 in the five directly affected suites), with nine mutations proven. Four MEDIUM defects were found — two by **executing** the deliverable rather than reading it, two by the adversarial diff review: the Step 4 registry-arm snippet passes `--issue` as a single word under zsh (the operator's shell here) and so exits 2 on exactly the case the `Issue` cell exists for; and `registry-tick.js --annotate` writes a `|` or a newline in `--issue` verbatim into the row, corrupting the table. The reviewer added that the `no-cell` guard is unreachable and lets a narrower consumer registry have a data cell rewritten, and that the matrix's `WAIVED → merge` row can never fire against a gate written per qa-gate's own schema. All four are contained and each has an exact fix.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix QA-1 … QA-4 in the qa-fix cycle

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (5/5 checkboxes)
- [x] Tests passing
- [x] Breaking changes documented (behavioural: Step 3 now merges accepted CONCERNS/WAIVED — stated in task §5 and CHANGELOG)
- [x] Code on feature branch with open PR (#398)

### Testing Approach

- [x] Automated Testing (unit, fixture, protocol shape)
- [x] Regression Testing (registry-tick default mode, task-registry drift test, existing shape suites)
- [x] Security Review (input boundary of the new CLI mode — probed)
- [x] Code Review (Step 3b — Explore subagent, whole-branch diff)
- [x] Documented-command execution (Step 4b — bash + zsh)

### Review Methodology

Direct tools first (medium risk, 3 phases, prose + one engine mode), plus one read-only Explore subagent for the Step 3b diff review. First review — no prior gate; whole-branch diff `origin/develop...HEAD` (19 files), bundled `references/` copies and the task's own docs excluded from the review diff.

**Step 4b**: `qa-execute-snippets.mjs` over the three changed prose files. `develop-next/SKILL.md` and `develop-batch/SKILL.md`: 10 blocks each, all refused as `mutating` (`gh`, `curl`, `git push`, `node …` writers) — `no-executable-blocks`, information only, by design. `develop-pipeline-step-2-review.md`: 9 blocks, 4 placeholder / 5 mutating → `zero-blocks-executed` (medium, pre-existing shape for this file — its placeholders are `{document-file}`-style substitutions). The **new** block (line 255, "Re-read the Tracker Key") was therefore executed **by hand** in a scratch copy under bash and zsh with `{document-file}` bound: GitHub key `397` → `TRACKER_ISSUE_AT_STEP_1=""`, `TRACKER_ISSUE=397`, lock updated; Jira key `PROJ-9` → same; `github_issue: null` → stays empty, lock untouched. Both shells agree. The Step 4 registry-arm invocation was executed under both shells with `ISSUE_REF` set and unset → **shell disagreement** (QA-1 below). zsh available.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1a: `registry-tick.js --annotate` | CONCERNS | 26/26 fixtures pass; 4 mutations red | Notes cell by position, Issue cell by header name, Status untouched, `already` idempotent — all verified. `--issue` is unvalidated (QA-2). |
| Phase 1: Step 4 `item.source` arms (develop-next) | CONCERNS | 5/5 shape tests; 3 prose mutations red | Three arms present, engine call, commit convention, `already`/`no-row` named. The `${ISSUE_REF:+…}` form breaks under zsh (QA-1). |
| Phase 1: develop-batch mirror | PASS | 2/2 shape tests; 1 mutation red | Matrix + three arms mirrored; `--issue` shown in bracket notation, not an executable expansion — not affected by QA-1. |
| Phase 2: Step 3 gate matrix | PASS | 7 rows asserted individually; FAIL-row + PASS-clause mutations red | Matrix in both orchestrators; head-SHA and quality-gate clauses kept; open-entry definition stated. |
| Phase 3: Step 2 re-read + re-fire | PASS | step-contract test; conditional mutation red; block executed bash+zsh | Captures Step 1 value, re-reads both trackers, updates lock, points at 0c-reg; bundled into develop-story/task. Live case on this run: comment `posted`, board `transitioned`, second call `already`. |

**Overall Phase Completion**: 5/5 implemented; 2 with concerns

---

## Success Criteria Verification

| # | Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Step 4 branches on `item.source`; task-registry arm calls `--annotate` (8th + Issue cell only); bug-registry arm names no-cell; re-run `already` | present, tested | present; shape test + engine fixtures | CONCERNS | Behaviour correct under bash; the zsh expansion defect (QA-1) means the Issue fill fails for zsh operators |
| 2 | Step 3 merges accepted + CONCERNS/WAIVED with no open finding; halts on FAIL or open finding | matrix | 7-row matrix, both orchestrators, per-row assertions | PASS | |
| 3 | Step 2 re-reads key, updates lock, re-fires when empty at Step 1; second run `already` | present, idempotent | section + conditional + lock update; executed bash/zsh; live run `already` | PASS | |
| 4 | develop-batch carries the same branch | mirrored | matrix + three arms | PASS | |
| 5 | Observations close with PR named | after merge | not in diff by design | N/A | Out-of-diff action, labelled as such in the task |

**Code Quality**: fast gate (`prettier --check` + hermetic suite) green; 9 mutations proven; CHANGELOG + standard updated; bundles in sync (pre-commit hook).

---

## Breaking Changes Validation

### Breaking Change: Step 3 now merges an `accepted` + `CONCERNS`/`WAIVED` item with no open finding
Documented: Yes (task §5, CHANGELOG Changed)
Migration Path Provided: N/A — behavioural loosening only; `FAIL`, open findings, non-accepted and missing gate still halt
Migration Tested: matrix rows asserted; the HALT rows are mutation-proven present
Consumer Code Updated: N/A
Notes: strictly more information than the token (finalise's verdict + open-finding scan)

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (4)

**Issue: Step 4 registry-arm snippet passes `--issue` as one word under zsh**
- **Severity**: MEDIUM
- **Category**: Functional (runnable prose — shell disagreement)
- **Bug Report**: [task.113.bug.1.zsh-conditional-issue-flag.md](./task.113.bug.1.zsh-conditional-issue-flag.md)
- **Observation**: `${ISSUE_REF:+--issue "$ISSUE_REF"}` is not word-split by zsh; `registry-tick.js` receives `--issue [#397](…)` as one argument and exits 2 (usage error). bash: `dry-run / issue written`; zsh: `unknown argument`.
- **Impact**: the Issue-cell fill fails on the operator's default shell; exit 2 is outside the exit-0 family Step 4 tolerates, so the step halts.
- **Recommendation**: build an `ISSUE_ARGS` array and expand `"${ISSUE_ARGS[@]}"`; assert the `:+` form is absent.
- **Priority**: P1

**Issue: `--annotate --issue` writes `|` / newline into the row verbatim**
- **Severity**: MEDIUM
- **Category**: Quality / input validation
- **Bug Report**: [task.113.bug.2.annotate-issue-cell-injection.md](./task.113.bug.2.annotate-issue-cell-injection.md)
- **Observation**: `--pr` is digit-validated; `--issue` is not. `--issue 'x | y'` produced a nine-cell row; `--issue $'a\nb'` split the row. Both make the row malformed to `parseRegistry` after the fact.
- **Impact**: a caller passing an unvalidated value corrupts the index silently at the point of writing. Contained: shipped callers build `[#N](url)` themselves.
- **Recommendation**: reject `|`, `\r`, `\n` in `--issue` as a usage error (exit 2, nothing written); fixture test for each.
- **Priority**: P1

**Issue: `no-cell` guard is ineffective — a narrower consumer registry gets its last data cell annotated** (QA-3, from CR-1)
- **Severity**: MEDIUM
- **Category**: Functional
- **Bug Report**: [task.113.bug.3.no-cell-guard-ineffective.md](./task.113.bug.3.no-cell-guard-ineffective.md)
- **Observation**: see Code Review CR-1.
- **Impact**: a consumer whose task registry ends in a data column (no notes column) has that column silently rewritten; the guard meant to refuse this is unreachable.
- **Recommendation**: resolve the notes cell from the header; `no-cell` when the last header names a known data column.
- **Priority**: P1

**Issue: the `WAIVED → merge` matrix row is unreachable** (QA-4, from CR-3)
- **Severity**: MEDIUM
- **Category**: Functional (the merge gate contradicts its own table)
- **Bug Report**: [task.113.bug.4.waived-row-unreachable.md](./task.113.bug.4.waived-row-unreachable.md)
- **Observation**: see Code Review CR-3.
- **Impact**: a waived gate — an explicit human decision — still halts the merge, which is the exact inversion observation #52 named.
- **Recommendation**: `waiver.active: true` → listed entries count as waived; state it in the open-entry definition in both orchestrators.
- **Priority**: P1

### LOW Severity Issues (4)

- QA-5 — `GITHUB_ISSUE` can carry the literal `null` on the step-2 re-read (CR-4); move the assignment after the reset.
- QA-6 — header walk uses a private separator regex and can read an earlier table's header (CR-5, cleanup); reuse the selector's `TABLE_SEPARATOR_RE`.
- `registry-tick.js` header walk resolves the `Issue` column by index; a title cell containing an escaped `\|` would shift the index (the notes cell, resolved from the end, is unaffected). `parseRegistry` would already misparse such a row, so this is a shared pre-existing limitation, not a regression — noted only.
- `annotate()` reports `already` when the notes cell already names the PR but `--issue` was requested and the registry has no Issue column (`issue: "no-column"` in the payload). The reason is defensible but a reader of `reason` alone learns nothing about the unfulfilled `--issue`; the payload field carries it. Cosmetic.

**Total Issues**: HIGH: 0, MEDIUM: 4, LOW: 4

---

## NFR Assessment

### Performance — PASS
One extra `node` invocation per registry-sourced run; the annotate mode reads and rewrites one line. No hot path.

### Reliability — PASS
Every annotate outcome exits 0 except usage errors; the roadmap arm is byte-identical to before; a crash between merge and tick re-enters on `already`. The Step 2 re-fire is idempotent (marker + stage CLI `already`), verified live. Rollback: `git revert`, no state.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 4 — `--issue 'x | y'` (corrupts row), `--issue $'a\nb'` (splits row), `--pr abc` (rejected, exit 2), `--issue` overwrite of a filled cell (rejected, `kept`)
- The new CLI accepts a caller string and writes it into a shared, git-tracked index without validating the two characters that break the table's structure. No secret exposure, no shell evaluation (`--body-file`-style discipline is followed by the prose; the engine takes argv). Reported as QA-2.

### Maintainability — PASS
One row locator, one writer file for both writes, reasons documented in the header; the flag-list guard now carries the argument for the three new flags rather than silently widening. Shape tests assert rows individually with floors. The step-2 addition points at 0c-reg rather than restating it.

---

## Code Review

From Step 3b — one read-only Explore subagent over the whole-branch diff (10 files; it also ran the 88 affected tests and probed the annotate mode against a sandbox registry). `code_review_blocking=true` (pipeline override): `bug` + `high`-confidence findings are promoted to the gate.

**Correctness bugs (4):**
- [medium/high] `shared/resources/registry-tick.js:417` — the `no-cell` guard (`dataCells < 5`) does not protect what its comment claims: a 6-column consumer registry (`# | Title | Status | Category | Priority | Created`) passes it and `· PR #n merged` is appended to the **Created** cell (verified in a sandbox); and since `parseRegistry` already rejects rows under five cells, the guard's own branch is unreachable — the fixture that "covers" it accepts `no-row` for exactly that reason → resolve the notes cell from the header the walk already finds (last header cell must not map to a known data column) and return `no-cell` otherwise; tighten the fixture to assert `no-cell` on a 6-column registry. **Promoted to gate: QA-3.**
- [low/high] `shared/resources/registry-tick.js:454` — `--issue` with a missing value (`--issue` as the last argument) yields `undefined`, passes the `!== null` check and writes the literal string `undefined` into the Issue cell reporting `written`; an empty string blanks the `—`; a `|` adds a cell → treat missing/empty as usage errors and reject `|`/newline. **Same defect as QA-2 (folded in; QA-2 widened to cover missing/empty).**
- [low/medium] `skills/develop-next/SKILL.md:153` — the matrix's `accepted | WAIVED | no → merge` row is unreachable for a gate written per qa-gate's own schema: the WAIVED example keeps the waived finding in `top_issues[]` with **no** `status:` field, no skill stamps `status: waived`, and the new rule declares an absent `status:` open — so every WAIVED gate lands on the HALT row and the "waiver is a recorded human decision" intent never applies → define the check so a `WAIVED` gate with `waiver.active: true` treats its listed entries as waived; mirror in develop-batch. **Promoted to gate as QA-4 (medium — it inverts a stated row of the matrix).**
- [low/medium] `shared/resources/develop-pipeline-step-2-review.md:261` — on the GitHub branch `GITHUB_ISSUE` is assigned before the `null` normalisation, so a document carrying `github_issue: null` leaves the compatibility variable holding the literal `null` (Phase 0c resets both) → move the assignment after the reset. **Gate: QA-5 (low).**

**Cleanups (1):**
- `shared/resources/registry-tick.js:433` — the header walk reimplements separator detection with a private regex that diverges from the selector's `TABLE_SEPARATOR_RE` (`select-next.mjs:881`), also matches a bare `---` rule, and does not stop at prose — on a headerless table it can pick up an earlier, unrelated table's header (verified: a preceding `| Issue | Meaning |` legend set `issueCol=1`) → export `TABLE_SEPARATOR_RE`/a `findHeader()` helper from the selector and reuse it, stopping at the first non-table line. Advisory; noted against the file's own "imported, never reimplemented" rule — the task ruled out selector *behaviour* changes, and an export is not one. **Recorded as QA-6 (low, advisory) so the fix cycle sees it.**

**mutation-proven**: the 9 develop-time mutations were re-run by the reviewer's test pass (88 green); no fixes were made *this* cycle, so there is nothing new to prove yet.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `registry-tick.js` default (tick) mode — 15 pre-existing fixtures | PASS |
| `evals/shared/tests/task-registry-drift.test.mjs` | PASS |
| `evals/develop-next/protocol/skill-shape.test.mjs` pre-existing 20 tests | PASS |
| `evals/develop-batch/protocol/skill-shape.test.mjs` pre-existing 30 tests | PASS |
| Full `npm run ci:fast` | PASS (3221 pass / 0 fail / 1 skipped) |
| Bundled copies in sync (`npm run bundle` idempotent, pre-commit re-run) | PASS |

---

## Test Artifacts

### Files Reviewed
`shared/resources/registry-tick.js`, `shared/resources/tests/registry-tick.test.mjs`, `skills/develop-next/SKILL.md` (Steps 3–4), `skills/develop-batch/SKILL.md` (Step 3 lane), `shared/resources/develop-pipeline-step-2-review.md`, `evals/develop-next/protocol/skill-shape.test.mjs`, `evals/develop-batch/protocol/skill-shape.test.mjs`, `evals/develop-task/protocol/step-contract.test.mjs`, `docs/standards/task-registry.md`, `CHANGELOG.md`.

### Test Commands Executed
```bash
npm run ci:fast                                   # 3221 pass / 0 fail
command node --test --test-reporter=tap shared/resources/tests/registry-tick.test.mjs \
  evals/develop-next/protocol/skill-shape.test.mjs evals/develop-batch/protocol/skill-shape.test.mjs \
  evals/develop-task/protocol/step-contract.test.mjs evals/shared/tests/task-registry-drift.test.mjs   # 93/93
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <each changed prose file> --json
# new step-2 block extracted and run under bash + zsh in a scratch copy (github / jira / null)
# Step 4 registry-arm invocation run under bash + zsh with ISSUE_REF set/unset (--dry-run)
# annotate boundary probes: --issue 'x | y', $'a\nb', --pr abc, filled-Issue overwrite
```

### Coverage Report
Not instrumented for this repo (node:test). Behavioural coverage: 11 new fixtures + 8 new shape/contract assertions; 9 mutations proven.

---

## Recommendations

### Immediate Actions (Blocking for a clean gate)
1. QA-1 — array-expand the optional `--issue` in develop-next Step 4; shape-assert the `:+` form absent.
2. QA-2 — validate `--issue` (missing/empty → exit 2; `|`, `\r`, `\n` → exit 2) in `registry-tick.js`; fixture each.
3. QA-3 — make `no-cell` real: resolve the notes cell from the header; fixture a 6-column registry → `no-cell`, nothing written.
4. QA-4 — `waiver.active: true` ⇒ listed entries are waived; state it in both matrices; shape-assert the clause.

### Short-term Actions (Non-Blocking)
1. QA-5 — `GITHUB_ISSUE` null normalisation order (one-line move; cheap enough to take in the same cycle).
2. QA-6 — reuse the selector's separator regex / a `findHeader()` export (cleanup; take it if the QA-3 fix touches the walk anyway).
3. Consider `reason: issue-skipped` (or similar) when `--issue` was requested and could not be applied while the notes cell was already current.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: The work is complete and correct on the paths the tests exercise; four medium defects surfaced by executing the deliverable under the operator's shell, probing the new CLI's input boundary, and reading the matrix against the gate schema it consumes. None is a design flaw — each is a bounded fix with a test — but QA-3 and QA-4 each make a stated guarantee false, which is the shape this repository treats as blocking-until-fixed.
**Quality Score**: 70/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: QA-1 … QA-4 fixed and re-verified (bash + zsh execution of the Step 4 snippet; fixtures for rejected `--issue` values and the 6-column `no-cell` case; shape assertion for the waiver clause).

---

**QA Report**: co-located at `task.113.qa.1.develop-next-registry-bookkeeping.md`
**Gate File**: co-located at `task.113.gate.1.develop-next-registry-bookkeeping.yml`
**Next Steps**: `/qa-fix` on QA-1 … QA-4 (+ QA-5/6 if cheap) → re-review (cycle 2 is a refute pass)
