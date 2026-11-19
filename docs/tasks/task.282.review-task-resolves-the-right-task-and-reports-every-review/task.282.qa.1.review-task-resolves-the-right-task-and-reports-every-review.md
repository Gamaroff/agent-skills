# QA Report: Task 282 - review-task resolves the right task and reports every review

**Task**: [Link to task document](./task.282.review-task-resolves-the-right-task-and-reports-every-review.md)
**Gate File**: [task.282.gate.1.review-task-resolves-the-right-task-and-reports-every-review.yml](./task.282.gate.1.review-task-resolves-the-right-task-and-reports-every-review.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-18
**Gate Status**: CONCERNS

---

## Executive Summary

Both behaviours work. A second review of an item now posts its own comment, and a bare number resolves to a task before an issue. Every change has a committed test with a control, and each reverted guard turns a test red. Three medium findings keep the gate at CONCERNS: the new resolver wraps an over-long digit string to a wrong task id, the wall-time criterion has no measurement, and the task document still describes the earlier marker design.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (fix the three findings)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists, status `ready-for-review`
- [x] All three phases complete
- [x] Fast gate green on the LAN server: 8611 tests, 0 failures (head before the report commit)
- [x] No breaking change declared; the bare marker for review 1 is kept
- [x] PR #921 open against `develop`

### Review Methodology

Direct tools plus one independent Explore reviewer (the shared diff reviewer prompt) over the 3512-line branch diff. The generated `skills/*/references/` copies were out of scope for the reviewer; they are held by `bundle:check`.

CI on 92a259573bb8: pending when read (recorded, changes nothing).

Diff review: code review. Step 4b: not applicable beyond the call-site blocks, which are held by `comment-slot-coverage.test.mjs`.

---

## New Findings This Cycle

First review, so every finding is new.

- **[medium]** `shared/resources/resolve-bare-task.sh:37` — over-long digit string wraps in arithmetic → T282-QA-1
- **[medium]** success criterion wall time unmeasured → T282-QA-2
- **[medium]** task document describes the superseded marker design → T282-QA-3

---

## Implementation Verification

| Phase | Status | Test result | Notes |
| --- | --- | --- | --- |
| 1: numbered review stage | PASS | `tracker-comment.test.mjs`, `comment-slot-coverage.test.mjs` | engine alias, lead list, three call sites |
| 2: skip rule and task-id-first resolution | CONCERNS | `resolve-bare-task.test.mjs` | resolver wraps on over-long input (QA-1); the skip rule is prose with no test |
| 3: tests, bundle | PASS | `bundle:check` 0 problems | |

**Overall Phase Completion**: 3/3 complete, one with a finding.

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| Two reviews on one issue post two comments; review 1's re-run reads `already` | PASS | `review-task-N is keyed per review` test; mutation M1 and M2 below |
| `243` resolves to `task.243` when a document exists, an issue only when none does; `#243` and a URL stay issue forms | PASS | `resolve-bare-task.test.mjs`: found, none, and the `#5` usage control |
| A task only on another branch is named with that branch | PASS | the branch and worktree tests; mutation M4 |
| A second review's verdict is posted, shown by a named test | PASS | same test as row 1 |
| A bare task number resolves to the task, shown by the fixture session | PASS | fixture repositories in the resolver test |
| `CI=true npm test` wall time within 10% of `develop` | **UNVERIFIED** | not measured (T282-QA-2) |
| Each change has a mutation proof | PASS | five proofs below. The Step 2 skip rule is prose with no committed test, so it has none |
| `bundle:check` 0 problems; `npm test` passes | PASS | bundle clean; fast gate 8611 / 0 |
| `comment-slot-coverage.test.mjs` passes with the new stage form | PASS | also red under mutation M5 |
| A live review marker still reads `already` for review 1 | PASS | the `-1` and bare cases in the keying test |

Criteria drift: clean (`criteria-drift.js`, base review-commit). CHANGELOG: cites (task 282).

---

## Issues Found

### MEDIUM Severity Issues (3)

**T282-QA-1 — an over-long digit string resolves to the wrong task.** `n=$((10#$n))` wraps. Reproduced from the repo root:

```
resolve-bare-task.sh 18446744073709551617  → found docs/tasks/task.1.…   (wrong: task 1)
resolve-bare-task.sh 9223372036854775808   → none                        (negative after the wrap)
resolve-bare-task.sh 5, 0005               → found task.5.…              (control: correct)
```

Origin: code review CR-1, reproduced by QA (rule 5d). The script is new in this PR, so it is not pre-existing. Fix: strip leading zeros with string operations and refuse more than 9 digits with exit 2.

**T282-QA-2 — wall time unmeasured.** Raised as a finding, as task 281 did; the measurement runs on the LAN server in qa-fix.

**T282-QA-3 — the document describes the old marker design.** Three places (Target Architecture "Marker", the Phase 1 checkbox, the Breaking Changes line) say review 1 passes the bare key. The shipped call sites always pass `-N` and the engine folds `-1` to the bare marker.

Total: HIGH 0, MEDIUM 3, LOW 0. No separate bug files, as on task 281: the gate is the record the fix loop reads.

---

## NFR Assessment

- **Performance — CONCERNS.** Wall time unmeasured (T282-QA-2). The change adds one test file of about half a second and nothing on a hot path.
- **Reliability — PASS.** The resolver answers five cases, exits 1 on a git failure or duplicate documents, and never guesses.
- **Security — PASS.**
  - **Status**: PASS
  - **Evidence**: measured
  - **Probes executed**: 22 (run record `task.282.qa.1.security.run.json`: executed 22, reproduced 0, escaped 0)
  - The probe ran the resolver through the `shell-argv` form under bash and zsh: ten hostile inputs (letter suffix, path traversal, command substitution, semicolon, negative, newline, hash, empty, Arabic-Indic digit, glob) all rejected; the legitimate input accepted. `boundary: true`; `boundary_signals: []`.
- **Maintainability — PASS.** One definition of the stage lists, held equal by a test.

---

## Code Review

Reviewer: shared Explore reviewer, one pass. Not a refute pass (first review).

**Correctness bugs (3):**

- [medium/high] `shared/resources/resolve-bare-task.sh:37` — arithmetic wrap on over-long digits → **promoted: T282-QA-1** (reproduced, control passes, new in this PR)
- [low/medium] `shared/resources/tracker-comment.js:151` — `review-task-02` and `review-task-2` give different markers. Reproduced, and the same holds on `origin/develop` for `qa-gate-02` vs `qa-gate-2` (`canonicalStage` folds only `-1`/`-01`), and call sites reject leading zeros, so it is `pre-existing` per 5b → `recommendations.future`
- [low/medium] `shared/resources/resolve-bare-task.sh:90` — a task reachable only from a tag or stash reads `none`; `git branch --contains` errors are discarded. Not reproduced → advisory, `recommendations.future`

**Cleanups (1):**

- `shared/resources/resolve-bare-task.sh:85` — the newest commit touching the path may be a deletion → add `--diff-filter=AM`. Not reproduced → advisory.

mutation-proven: alias call removed from `run()` → `review-task-N is keyed per review` → covered
mutation-proven: review stages removed from `CYCLE_SCOPED_STAGES` → `numeric suffix is legal only for cycle-scoped stages (NEW-6)` plus three task.282 tests → covered
mutation-proven: resolver glob loses the literal dot after the number → `a bare number resolves to the task document in this working tree` and `two documents claiming one number` → covered
mutation-proven: resolver skips the linked-worktree step → `a task present only in a linked worktree is named with that worktree` → covered
mutation-proven: review-task call site reverted to the bare stage → `a cycle-scoped stage is never passed bare (SITES)` → covered
Each was reverted from a `cp` snapshot (`cmp` clean) and the baseline went green after. The Step 2 skip rule is prose with no committed test, so it has no proof.

---

## Test Artifacts

### Test Commands Executed

```bash
npm run test:remote                       # ci:fast on the LAN server: 8611 tests, 0 fail
node --test shared/resources/tests/{tracker-comment,resolve-bare-task,comment-slot-coverage,doc-links,next-numbered}.test.mjs
node .agents/skills/qa-task/references/security-probe.mjs --entry 'shell-argv:shared/resources/resolve-bare-task.sh' …   # 22 executed, 0 escaped
node .agents/skills/qa-task/references/criteria-drift.js …            # clean
bash .agents/skills/qa-task/references/changelog-cites.sh task.282   # cites (task 282)
```

The rest of `npm run ci` (`eval:all`, `validate:all`, `check:generated`, `bundle:check`, `lint:shell`, `lint:secrets`) ran on the LAN server: exit 0. The `lint:secrets` lane skipped locally with "gitleaks not installed — lane skipped (CI runs the pinned binary)", so that lane is CI's to run.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — T282-QA-1, T282-QA-2, T282-QA-3

**Gate File**: co-located at `task.282.gate.1.review-task-resolves-the-right-task-and-reports-every-review.yml`
**Next Steps**: qa-fix cycle 1: bound the resolver's digits, measure wall time on the LAN server, reconcile the document's marker description.
