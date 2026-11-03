# QA Report: Task 252 - migrate-doc-numbering: name every document it cannot classify

**Task**: [Link to task document](./task.252.migrate-doc-numbering-name-blockers.md)
**Gate File**: [task.252.gate.1.migrate-doc-numbering-name-blockers.yml](./task.252.gate.1.migrate-doc-numbering-name-blockers.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-03
**Gate Status**: CONCERNS

---

## Executive Summary

The change does what the task asks: every epic or story directory and every loose PRD-level `.md` that no grammar reads is now a named `unclassified-document` blocker, raised in `plan()` so the early `already` return cannot hide it. The success criteria are met and the tests fail when the behaviour is removed. One defect: the loose-file rule also blocks the section shards of a sharded PRD, which `shard-prd` writes into the PRD directory.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (fix T252-QA-1, then re-gate)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (exit-code change in CHANGELOG.md)
- [x] Code on feature branch with open PR (#817)

### Review Methodology

Direct tools plus one read-only Explore code reviewer (duration 44 s per its completion notice; dispatch and return times not measured). Traceability matrix from the mapper subagent was used. Adaptive strategy: standard mode, single-module task, so no parallel fan-out.

CI on 7228249097b9: green (`qa-ci-read.sh`: CI_STATE=SUCCESS).

Step 4b: not applicable. The runnable-prose change is one list entry in `skills/review-prd/SKILL.md`; no fenced bash block was added or changed.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: fixture test and measurement | PASS | Verified | 7 new tests; baseline `READDIR_BASELINE_252 = 6` recorded in the plan |
| Phase 2: discovery records the unclassified set | CONCERNS | Verified | Also flags section shards of a sharded PRD (T252-QA-1) |
| Phase 3: blocker and count | PASS | Verified | Emitted in `plan()`; `classified` and `skipped` in JSON and text |
| Phase 4: mutation proof and docs | PASS | Verified | See Code Review; SKILL.md and CHANGELOG.md updated |

**Overall Phase Completion**: 3/4 passed, 1 with a finding

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| Dry run and `--check` name all bad documents, exit 1 | test "dry run, --check and --apply each name all five" | PASS |
| `--apply` exits 1 and changes no file | same test, asserts `git status --porcelain` unchanged | PASS |
| Names fixed, `--apply` succeeds, `--check` answers `already` | test "with the five names fixed ... already" | PASS |
| `--json` carries `classified` and `skipped` | assertions in the same tests; real run below | PASS |
| Walk not repeated (readDir baseline) | test "walks each directory once" against baseline 6 | PASS |
| `node --test` on the suite passes | 89 pass, 0 fail (run by QA) | PASS |
| `npm test` and `bundle:check` pass | `ci:fast` exit 0 without CI; bundle regenerated; CI on the PR green | PASS |
| Reverting the emission turns the new test red | mutations below, run by QA | PASS |
| CHANGELOG records the blocker and the exit-code change | `changelog-cites.sh`: cites (task 252); entry names the exit-code change | PASS |
| Real `docs/prd` reports 0 skipped | `migrate-doc-numbering.mjs --root docs/prd --check` → `already`, `22 documents classified, 0 skipped` | PASS |

`criteria-drift.js`: clean (base: review commit); no criterion changed after review.

---

## Breaking Changes Validation

### Breaking Change: a migrated tree with unclassifiable names now answers `blocked` / `needs-migration`

Documented: Yes (CHANGELOG.md, review-prd SKILL.md)
Migration Path Provided: Yes (rename or move the named document, then re-run)
Migration Tested: Yes (names-fixed test)
Consumer Code Updated: N/A

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: T252-QA-1 — section shards of a sharded PRD are blocked**
- **Severity**: MEDIUM
- **Category**: Functional
- **Observation**: `shard-prd` writes section files and `index.md` into the PRD directory beside the PRD (`skills/shard-prd/SKILL.md`, "Which PRD, and Where Its Shards Go"). The loose-file scan skips only L3 PRDs, so each section file of a sharded L1/L2 PRD raises `unclassified-document`. Reproduced on a git repo holding `prd.1.demo/prd.1.demo.md`, `prd.1.demo/goals-and-background-context.md` and `prd.1.demo/index.md`: the engine under review answers `needs-migration` with `unclassified-document: …goals-and-background-context.md … move it out of the PRD tree`. The base engine raised no such blocker on the same input (it reported other findings caused by the minimal fixture, not the shard).
- **Impact**: A valid sharded PRD cannot be migrated until its shards are moved out of the PRD tree, which breaks `create-epics-from-shards`.
- **Recommendation**: Treat loose `.md` files in a PRD directory that also holds an `index.md` as shards and leave them alone; add a test with a sharded L1 PRD.
- **Origin**: reviewer CR-1 (medium confidence), confirmed by reproduction and the `shard-prd` contract. Not re-rated.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0 (advisory items below)

---

## NFR Assessment

### Performance — PASS
Walk count equals the pinned baseline. The per-PRD rescan is a cleanup (CR-4).

### Reliability — CONCERNS
Valid sharded PRDs are refused (T252-QA-1).

### Security — PASS
- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`. Candidates read: `isNonDocumentFile`, `isNonDocumentDir` (allowlist predicates; true only excuses a name), `suggestSpelling`, `unclassifiedReason` (message text). Input is the repository's own directory listing; no corpus sink models it. `boundary_signals` from the criteria classifier: none.

### Maintainability — PASS
One allowlist with a reason per entry; blocker code registered and documented.

---

## Code Review

Reviewer: Explore subagent, read-only, `code_review_blocking=true`. Anchor check: CR-1 ok; CR-2, CR-3 and CR-4 were `text-mismatch` (the reviewer named wrong line numbers; the code each describes exists at lines 554, 240 and about 580), so their locations are shown as unverified.

**Correctness bugs (3):**
- [medium/medium] `shared/resources/migrate-doc-numbering.mjs:582` — sharded L1/L2 PRD shards are flagged; promoted to T252-QA-1 after reproduction.
- [low/medium] `shared/resources/migrate-doc-numbering.mjs:559` ⚠️ unverified anchor (text-mismatch) — under a scope, an unclassified entry under an epics directory with no owning PRD is dropped, while an unscoped run blocks on it. Advisory.
- [low/low] `shared/resources/migrate-doc-numbering.mjs:70` ⚠️ unverified anchor (text-mismatch) — only dot-prefixed directories under `epics/` and `stories/` are exempt; `_archive`-style directories now block. Advisory.

**Cleanups (1):**
- `shared/resources/migrate-doc-numbering.mjs:185` ⚠️ unverified anchor (text-mismatch) — loose-file scan rescans every file per PRD; group by directory once.

mutation-proven: removed the `plan()` emission of `unclassified-document` → "a fully migrated tree with one bad name is blocked, never already" and "dry run, --check and --apply each name all five" went red (87 pass, 2 fail) → covered
mutation-proven: removed the `discover()` recording at the epic-directory site → "discovery records every rejected name…" and "dry run, --check and --apply each name all five" went red (87 pass, 2 fail) → covered

Both proofs used a `cp` snapshot of the engine, were restored byte for byte (`cmp`), and the baseline returned to 89 pass, 0 fail. The third proof the developer ran (emission moved into `verify()` only) was not repeated by QA; it is the developer's, recorded in the plan file.

---

## Regression Testing

Existing suites in `ci:fast` pass. One existing test fixture was changed by the task (a stray `notes.md` became `README.md`); the change is recorded in the plan file and keeps the test's intent.

With `CI=true`, `ci:fast` fails one test: "under CI, every tool a suite skips without is on PATH", because `zsh` is not installed on this laptop (`command -v zsh` finds nothing). It is a host fact, not this change: the same run without `CI` exits 0, and the PR's CI is green. Not a finding.

---

## Test Artifacts

### Test Commands Executed
```bash
command node --test shared/resources/tests/migrate-doc-numbering.test.mjs   # 89 pass, 0 fail
CI=true npm run ci:fast                                                      # 7159 pass, 1 fail (zsh absent on this host)
env -u CI npm run ci:fast                                                    # exit 0
command node shared/resources/migrate-doc-numbering.mjs --root docs/prd --check   # already, 22 classified, 0 skipped
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix T252-QA-1 (sharded PRD directories) and add a test.

### Short-term Actions (Non-Blocking)
1. CR-3: decide on an underscore or reasoned directory allowlist.
2. CR-2: decide scoped behaviour for an unowned epics directory.
3. CR-4: group the loose-file scan by directory.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: The task's criteria are met and held by tests that fail without the code; one reproduced regression on sharded PRDs needs a fix.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T252-QA-1 fixed and re-gated

---

**QA Report**: co-located at `task.252.qa.1.migrate-doc-numbering-name-blockers.md`
**Gate File**: co-located at `task.252.gate.1.migrate-doc-numbering-name-blockers.yml`
**Next Steps**: `/qa-fix` for T252-QA-1, then re-run `/qa-task`
