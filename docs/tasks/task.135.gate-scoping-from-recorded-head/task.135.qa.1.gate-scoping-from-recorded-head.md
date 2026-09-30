# QA Report: Task 135 - Gate scoping from a recorded head, not a typed timestamp

**Task**: [task.135](./task.135.gate-scoping-from-recorded-head.md)
**Gate File**: [task.135.gate.1.gate-scoping-from-recorded-head.yml](./task.135.gate.1.gate-scoping-from-recorded-head.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-30
**Testing Completed**: 2026-09-30
**Gate Status**: FAIL

---

## Executive Summary

First review of PR #531 (head `79ba80e7`). The design holds and every phase is implemented, but the independent diff review found one HIGH and two MEDIUM correctness bugs, all reproduced or confirmed against the tree: the new corpus freshness test goes red on `develop` as soon as any gated branch is rebased (develop-batch) or squash-merged; the Step 3b scope block reads a variable only another shell binds, so it always runs unscoped and names the wrong cause; and the Phase 0 trigger counts commits in five directories only.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (schema 2)
- [x] Code on feature branch with open PR (#531)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, executed-prose, eval replays)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review (reasoned)
- [x] Code Review (independent Explore subagent)

### Review Methodology

Direct tools plus one read-only Explore reviewer over the whole-branch diff (first review). The reviewer's diff excluded generated bundled copies (`skills/*/references/*`, checked by `bundle:check`) and `docs/tasks/*`. Traceability mapper skipped: the task's Success Criteria are a checklist, not a table. Step 4b: `qa-execute-snippets` ran over the six changed runnable-prose files — the new scope and trigger blocks are classified `mutating` (they write `$DIFF_FILE`) and so are executed instead by `qa-scope-from-head.test.mjs` in scratch repositories under bash and zsh; no shell disagreement in any runnable block.

---

## New Findings This Cycle

First review — every finding below is new.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: `head:` on the gate | PASS | Verified | qa-task, qa-story, qa-gate templates schema 2; bind block before YAML. This cycle's gate is the first schema-2 gate and passes the freshness test. |
| Phase 2: scope and trigger from the head | CONCERNS | Partial | Block identical in three places (test E). CR-2: the block cannot see `$LATEST_GATE`. CR-3: trigger path list. |
| Phase 3: freshness test + 5c row | CONCERNS | Partial | 5c trail row added. CR-1: corpus rule breaks on rewritten branches. |

**Overall Phase Completion**: 3/3 implemented; 2 with defects.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Gate carries schema 2, 40-hex head, clock updated | Yes | Yes | PASS | gate.1 of this task |
| Cycle N+1 file list = `git diff --name-only <head>..HEAD` regardless of `updated:` | Yes | Only when `$LATEST_GATE` is bound in the same shell | CONCERNS | CR-2 |
| Trigger re-reviews after a commit a future-dated gate would hide | Yes | Yes inside the five listed dirs | CONCERNS | CR-3 |
| Schema-1 prior gate → unscoped with reason, never `--since` | Yes | Yes (test C) | PASS | |
| Freshness test green; mutation proofs; no `--since=` in scope paths | Yes | Green today; red after any rebase/squash | FAIL | CR-1 |
| CHANGELOG names schema 2 as Breaking | Yes | Yes | PASS | |

---

## Breaking Changes Validation

### Breaking Change: gate `schema: 2` requires `head:`
Documented: Yes · Migration Path Provided: Yes (add 2 to accepted schemas; schema 1 stays valid) · Migration Tested: Yes (no JS reader keys on `schema: 1`; eval replay gates stay schema 1 and pass) · Consumer Code Updated: N/A
**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: Freshness test red after a rebase or squash merge (CR-1)**
- **Severity**: HIGH
- **Category**: Functional
- **Bug Report**: [task.135.bug.1.freshness-test-red-after-rebase-or-squash.md](./task.135.bug.1.freshness-test-red-after-rebase-or-squash.md)
- **Observation**: the corpus rule asserts existence and ancestry for every schema-2 gate; develop-batch rebases items before merging (`skills/develop-batch/SKILL.md` "Rebase on the current tip"), and `mergeStrategy` accepts `squash`/`rebase`.
- **Impact**: `npm test` red on `develop` for everyone after one such merge.
- **Recommendation**: scope the history rules to gates changed on the current branch.
- **Priority**: P1

### MEDIUM Severity Issues (3)

**Issue: Step 3b cannot see the prior gate (CR-2)** — [bug 2](./task.135.bug.2.step-3b-reads-latest-gate-from-another-shell.md). Reproduced: the shared block with `PRIOR_GATES=2` and no `LATEST_GATE` prints `Re-review scope: unscoped — prior gate carries no head: (schema 1)` and exits 0 under bash and zsh. Promoted.

**Issue: Trigger counts five directories only (CR-3)** — [bug 3](./task.135.bug.3.code-moved-counts-only-five-directories.md). Promoted.

**Issue: Uncommitted document edits invisible to the trigger (CR-4)** — [bug 4](./task.135.bug.4.doc-moved-ignores-uncommitted-edits.md). Medium confidence — advisory, not in `top_issues[]`; recommended to fix alongside.

### LOW Severity Issues (2)

- CR-5: the skip fires only when the QA document edits are committed with the gate; a split commit re-reviews (fails safe). Document the requirement.
- CR-6: the scoped-diff non-vacuity HALT could fire on a fix that returns every changed file to its base content — unreachable while the gate and report sit in the list, but its message would blame the pathspec.

**Total Issues**: HIGH: 1, MEDIUM: 3, LOW: 2 (+2 cleanups)

---

## NFR Assessment

### Performance — PASS
Two `git` reads per cycle.

### Reliability — CONCERNS
CR-2 and CR-4: both fail toward re-review, but CR-2 records a false cause on every cycle 3+.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`. Predicate-shaped functions in the diff: `checkGate` (test-only helper, never shipped, judges repository files) and the Step 3b HALT guards (decide on local git state, no external input). No sink applies.

### Maintainability — PASS
One scope block, byte-identical in three files and pinned by test E; two new executed tests.

---

## Code Review

Independent Explore reviewer, whole-branch diff (1219 lines, bundled copies excluded). `code_review_blocking=true` (pipeline override): CR-1, CR-2, CR-3 promoted to `top_issues[]`.

**Correctness bugs (6):**
- [high/high] `shared/resources/tests/gate-head-freshness.test.mjs:66` — history rules break after a rebase/squash → scope to branch-changed gates (**CR-1, promoted**)
- [medium/high] `skills/qa-task/SKILL.md:412` — Step 3b reads `$LATEST_GATE` from another shell → bind it in the block, HALT when unreadable (**CR-2, promoted**)
- [medium/high] `skills/qa-task/SKILL.md:192` — `CODE_MOVED` path list → `-- . ':(exclude)docs'` (**CR-3, promoted**)
- [medium/medium] `skills/qa-task/SKILL.md:199` — `DOC_MOVED` ignores uncommitted edits → diff the gate commit against the working tree (CR-4)
- [low/medium] `skills/qa-task/SKILL.md:197` — skip needs gate + document in one commit (CR-5)
- [low/low] `shared/resources/qa-re-review-scope.md:228` — legitimately empty scoped patch HALTs with a wrong cause (CR-6)

**Cleanups (2):**
- `shared/resources/tests/qa-scope-from-head.test.mjs:118` — temp dirs leak when setup throws → `t.after()` (CR-7)
- `shared/resources/tests/gate-head-freshness.test.mjs:98` — the independent count shares the walker → enumerate separately (CR-8)

Provenance: all six bugs are in code this branch introduces (the head-based blocks and tests are new).

mutation-proven: scope source reverted to `--since` → qa-scope-from-head B[bash], B[zsh], E → covered
mutation-proven: author-time comparison removed → gate-head-freshness "precedes its head's author time" → covered
mutation-proven: head-presence check removed → gate-head-freshness "no head: is red" → covered
mutation-proven: document measured from head instead of the gate commit → qa-scope-from-head F2[bash], F2[zsh] → covered

---

## Regression Testing

| Area | Result |
| --- | --- |
| `qa-re-review-scope-parity.test.mjs` (58) | PASS |
| `npm run eval:develop-task`, `npm run eval:develop-story` (replays incl. schema-1 gate fixtures) | PASS |
| `npm run validate -- skills/{qa-task,qa-story,qa-gate}/` | PASS |
| `ci:fast` at develop time | 4650/4653 — one load-timing flake (passes alone), one link check cleared by staging |

---

## Test Artifacts

### Files Reviewed
`skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `skills/qa-gate/SKILL.md`, `shared/resources/qa-re-review-scope.md`, `shared/resources/pr-conformance-prompt.md`, `shared/resources/code-review-prompt.md`, `shared/resources/tests/qa-scope-from-head.test.mjs`, `shared/resources/tests/gate-head-freshness.test.mjs`, `evals/shared/tests/qa-re-review-scope-parity.test.mjs`, `CHANGELOG.md`, `skills/develop-batch/SKILL.md` (CR-1 confirmation).

### Test Commands Executed
```bash
command node --test shared/resources/tests/qa-scope-from-head.test.mjs shared/resources/tests/gate-head-freshness.test.mjs evals/shared/tests/qa-re-review-scope-parity.test.mjs
npm run eval:develop-task && npm run eval:develop-story
npm run validate -- skills/qa-task/ ; npm run validate -- skills/qa-story/ ; npm run validate -- skills/qa-gate/
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <each changed SKILL.md / shared prompt> --json
```

### Coverage Report
Not measured — prose and test changes; no instrumented source.

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1 — scope the freshness test's history rules to branch-changed gates; fix the "never rebases" sentence (P1)
2. CR-2 — bind `LATEST_GATE` in Step 3b; HALT when unreadable on cycle 3+ (P1)
3. CR-3 — count every non-`docs/` path (P2)

### Short-term Actions (Non-Blocking)
1. CR-4 — diff the gate commit against the working tree
2. CR-5 note, CR-7/CR-8 cleanups

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: gate rule 1 — a HIGH entry (CR-1).
**Quality Score**: 60/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.135.qa.1.gate-scoping-from-recorded-head.md`
**Gate File**: co-located at `task.135.gate.1.gate-scoping-from-recorded-head.yml`
**Next Steps**: `/qa-fix` for CR-1–CR-3 (and CR-4); cycle 2 is a whole-branch refute pass.
