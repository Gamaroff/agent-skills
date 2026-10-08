# QA Report: Task 173 - Fold the 5c review and its doc-only fixes into the acceptance commit

**Task**: [Link to task document](./task.173.fold-5c-review-into-acceptance-commit.md)
**Gate File**: [task.173.gate.1.fold-5c-review-into-acceptance-commit.yml](./task.173.gate.1.fold-5c-review-into-acceptance-commit.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-08
**Testing Completed**: 2026-10-08
**Gate Status**: FAIL

---

## Executive Summary

All four phases are implemented and every success criterion is held by a committed test that passes
under bash and zsh. The diff review found one high-confidence correctness bug: the 5c carry block
restores a refused path with `git checkout HEAD`, which discards all uncommitted work in that file,
and the implementation report is exactly such a file at 5c. Four further findings are adopted for the
same fix cycle.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (4/4 ticked)
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#613, OPEN)

### Testing Approach

- [x] Automated Testing (unit, behaviour tests in scratch git repos)
- [x] Regression Testing (`npm run ci`)
- [x] Security Review (reasoned)
- [x] Code Review (Step 3b, one Explore reviewer)

### Review Methodology

Direct tools plus the single Step 3b reviewer: 4 phases across `shared/resources/` and
`skills/finalise/` (two modules, risk not set) — the default row. First review: whole branch diff,
`origin/develop...HEAD`, excluding generated `skills/*/references/` byte copies (verified by
`bundle:check`, 0 problems) and the work item's own `docs/tasks/` files — 7 source files + 1 new test.
Reviewer duration 199.6 s (from the completion notice's `duration_ms`).
The traceability matrix (`.summaries/qa-traceability-matrix.md`) was consumed.

Step 4b ran over the three changed runnable-prose files: step-5-6 (24 blocks: 1 runnable, ran clean
under bash and zsh; 1 placeholder; 22 mutating), finalise `SKILL.md` (38 blocks: 0 runnable,
2 placeholder, 36 mutating — `zero-blocks-executed`, medium, on pre-existing placeholder blocks), step-7
(11 blocks: 0 runnable, 2 placeholder, 9 mutating — `zero-blocks-executed`). Every block this task
added is refused as mutating (`git add`/`git commit`), by design. Those blocks are instead extracted
from the shipped Markdown and executed under bash and zsh by
`shared/resources/tests/acceptance-commit-carries-5c.test.mjs`, which is the stronger evidence. The
two `zero-blocks-executed` findings are about pre-existing placeholder blocks the change did not
touch; recorded, not promoted.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: narrow the index-sweeping commits | PASS | Verified | 8a block `-- "${TOUCHED[@]}"`; hook `-- "$REPORT"`; scenario 17 + 8a test |
| Phase 2: the 5c carry path | FAIL | Verified with defects | CR-1 restore data loss; CR-2 silent parse failure; CR-3 placeholder guard |
| Phase 3: 6a states what it carries | CONCERNS | Verified | CR-4 path normalisation edge |
| Phase 4: docs and validation | PASS | Verified | CR-5 overclaim in the step doc |

**Overall Phase Completion**: 4/4 implemented; 2 phases carry findings.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| Doc-only CONCERNS pushes no commit 5c→6a | carry test asserts `HEAD` unchanged (`acceptance-commit-carries-5c.test.mjs`) | PASS |
| 6a carries report + doc fixes; boundary passes | 6a test: one commit, suffix, porcelain clean | PASS |
| 8a commits only `touched`; `--git-base` exit 0 | 8a test runs the shipped block + the CLI | PASS |
| PreCompact pause commits only the report | `develop-pipeline-on-precompact.test.sh` scenario 17 | PASS |
| Non-doc CONCERNS finding recorded, not fixed | classify test (`record CR-1 …`), carry test non-doc restore | PASS (restore unsafe — CR-1) |
| Pushed tail commits 3 → 2 | carry test (zero commits); 3→2 inferred | PASS (partial evidence, as the task states) |
| CI runs drop by one | follows from the above, no test by design | PASS (by derivation) |
| Each new test mutation-proved | re-run by QA: see Code Review | PASS |
| `npm run ci` / validate / bundle:check | `npm run ci` exit 0; validate ✓ on all 8 changed skills; `bundle:check` 0 problems | PASS |
| CHANGELOG entry | `CHANGELOG.md` `[Unreleased]` › Changed | PASS |
| Doc-only rule stated once; rows point at it | step-5-6 `:1392–1393` → carry subsection | PASS |

---

## Breaking Changes Validation

None documented, none found. The 6a message suffix is new text; no parser reads 6a's message (grep
for `accept — DoD` outside the skill finds only the bug-mode test, which asserts the derivation-only
`MSG`).

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: The carry restore wipes uncommitted work (CR-1)**
- **Severity**: HIGH
- **Category**: Functional / Reliability
- **Bug Report**: [task.173.bug.1.carry-restore-wipes-uncommitted-work.md](./task.173.bug.1.carry-restore-wipes-uncommitted-work.md)
- **Observation**: `git checkout HEAD -- "$p"` (`develop-pipeline-step-5-6-qa-loop.md:1474`) discards every uncommitted change in a refused path. `isDocsPath("docs/tasks/…/task.N.implementation.1.x.md", ["docs/**"])` is true, and the report is uncommitted by design at 5c.
- **Impact**: loss of the run's audit trail; or the report riding 6a, breaking Step 8's ownership.
- **Recommendation**: refuse `*.implementation.*` and `$PR_REVIEW`; HALT instead of restoring a path that was dirty before 5c's edit.
- **Priority**: P1

### MEDIUM Severity Issues (1)

**Issue: Classifier silent on unparsed findings (CR-2)**
- **Severity**: MEDIUM
- **Bug Report**: [task.173.bug.2.classifier-silent-on-unparsed-findings.md](./task.173.bug.2.classifier-silent-on-unparsed-findings.md)
- **Observation**: no output and exit 0 for a missing section/fence or an entry without `id:`/`ref:`.
- **Recommendation**: count entries vs lines; HALT on a gap.

### LOW Severity Issues (3)

- **CR-3**: `CARRY_FIXED` has no unsubstituted-placeholder guard (`:1457`).
- **CR-4**: 6a `CARRIED` normalises only a leading `./` (`skills/finalise/SKILL.md:1373`).
- **CR-5**: the carry subsection's "cannot land in the wrong commit" overclaims; HALT commits via `/commit-changes` in the 5c→6a window are not path-limited (`:1408`).

**Total Issues**: HIGH: 1, MEDIUM: 1, LOW: 3

---

## NFR Assessment

### Performance — PASS
One push and one CI run fewer per doc-only CONCERNS run; the classifier is one `node` process.

### Reliability — CONCERNS
CR-1 (data loss on restore) and CR-2 (silent parse failure).

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- No auth, network or untrusted-input surface added. `boundary: false`. The predicate-shaped code
  the diff adds is the stage loop's per-path accept/refuse. It delegates the decision to the existing
  `isDocsPath` in `ci-tree-equivalence.js`, which task.172 owns and probed. The rest is the
  `ref`→path strip in the classifier (two regex replaces, no decision of its own) and git staging.
  Neither is a new acceptance predicate.

### Maintainability — PASS
Blocks are extracted from the shipped Markdown and executed by the test; one definition of the docs
patterns is reused.

---

## Code Review

**Correctness bugs (5):**
- [high/high] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1474` — the restore discards all uncommitted work; the implementation report is carried or wiped → refuse it and `$PR_REVIEW`; HALT on a pre-dirty path. **Promoted: top_issues CR-1 (code_review_blocking).**
- [medium/medium] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1434` — classifier silent on unparsed findings → count and HALT. Adopted into top_issues by QA after reading.
- [low/medium] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1457` — no placeholder guard on `CARRY_FIXED` → add one. Adopted.
- [low/medium] `skills/finalise/SKILL.md:1373` — `CARRIED` string match → let git normalise. Adopted.
- [low/medium] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1408` — overclaim about HALT commits → state it. Adopted.

**Cleanups (0):** none.

All five anchors: `ok` (`finding-anchors.js --rev HEAD`). Provenance: every finding is in lines this
branch added — none pre-existing.

mutation-proven: 8a `-- "${TOUCHED[@]}"` removed → 8a narrowing test (bash, zsh) → covered
mutation-proven: 6a suffix dropped → 6a carry test → covered
mutation-proven: carry block commits → carry test → covered
mutation-proven: classifier marks everything doc-only → classify test → covered
mutation-proven: hook bare commit → precompact scenario 17 → covered
(5 of the 8 development-time proofs, recorded by the Step 3 run of the same agent. The other three
are not restated here. Independence loss: QA and develop share one reader.)

---

## Regression Testing

`npm run ci` exit 0: 5,522 node tests, 0 failures, the shell suites and `eval:all`.
`finalise-fix-and-recheck.test.mjs`, `finalise-bug-mode.test.mjs`, `finalise-publish-boundary.test.mjs`
and `develop-pipeline-on-precompact.test.sh` all pass.

---

## Test Artifacts

### Test Commands Executed
```bash
npm run ci                       # exit 0
npm run bundle:check             # 0 problems
npm run validate -- skills/{finalise,develop-task,develop-story,develop-bug,develop,qa-task,qa-story,review-pr}/   # all ✓
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <each changed runnable-prose file> --json
node .agents/skills/qa-task/references/finding-anchors.js --findings-file … --rev HEAD --json   # 5 ok
```

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1: refuse the implementation report and `$PR_REVIEW`; HALT on a pre-dirty restore. Add a test case for each.

### Short-term Actions (Non-Blocking, same cycle)
1. CR-2 to CR-5 as above.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one high-confidence correctness bug under `code_review_blocking`.
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.173.qa.1.fold-5c-review-into-acceptance-commit.md`
**Gate File**: co-located at `task.173.gate.1.fold-5c-review-into-acceptance-commit.yml`
**Next Steps**: `/qa-fix` cycle 1.
