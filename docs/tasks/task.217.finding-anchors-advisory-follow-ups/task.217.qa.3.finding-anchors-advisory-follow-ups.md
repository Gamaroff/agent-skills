# QA Report: Task 217 - Finding-anchors advisory follow-ups (cycle 3)

**Task**: [Link to task document](./task.217.finding-anchors-advisory-follow-ups.md)
**Gate File**: [task.217.gate.3.finding-anchors-advisory-follow-ups.yml](./task.217.gate.3.finding-anchors-advisory-follow-ups.yml)
**Previous Report**: [task.217.qa.2.finding-anchors-advisory-follow-ups.md](./task.217.qa.2.finding-anchors-advisory-follow-ups.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-24
**Testing Completed**: 2026-10-24
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 3 re-reviewed the 23 files changed since gate 2's head (`9d888cec`). That covers the
`--fix-list` move into `finding-anchors.js`, the new Step 5 block, the inline-selector comments and the
CHANGELOG. All four cycle-2 findings are fixed. Five mutation proofs are covered, and every probe
control engages (73 executed, 0 escaped). The diff review found one new medium (QA3-1): the Step 5
prose says the block answers the same from any directory, but the block runs the checker by a
cwd-relative path and HALTs from a subdirectory. The block test cannot see this, because it swaps
the path for an absolute one. The failure is closed, and nothing is applied.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (QA3-1)

---

## Re-Review Context

| Previous finding | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-217-QA2-1: Step 5 never checked `TARGET` | medium | ✅ FIXED | The Step 5 block binds no target. `--fix-list` reads the tree from the stamp. Mutation "tree ignored" → 4 tests red (`covered`). BUG-3 closed |
| TASK-217-QA2-2: Step 5 failed open outside the root | medium | ✅ FIXED | No `git diff --quiet`. Both sides are read from the stamp's root, and a block run from `skills/` now HALTs (closed), which BUG-4's Expected Behavior allows. BUG-4 closed. The over-claim in its fix record is QA3-1 |
| TASK-217-QA2-3: U+FEFF trim mismatch | low | ✅ FIXED | Step 5 parses with the engine's `anchorOf`; the BOM path test passes. The two `--inline` selectors carry the scoped comment (review-code SKILL.md:197, review-pr SKILL.md:990) |
| TASK-217-QA2-4: "the summary comment still posts" | low | ✅ FIXED | 0 hits in CHANGELOG.md. The Risk table names each skill |

---

## New Findings This Cycle

- **[medium]** `skills/review-code/SKILL.md:285`: the Step 5 block runs
  `.agents/skills/review-code/references/finding-anchors.js` by a cwd-relative path. From `skills/`,
  node exits 1 ("Cannot find module") and the block HALTs. That contradicts SKILL.md:275 ("the block
  gives the same answer from any directory"). The block test (`review-code.test.js:657`) replaces the
  path with an absolute one. → Resolve the script from the top level or narrow the claim, and make the
  test run the shipped path from `sub/`. **TASK-217-QA3-1**, [BUG-5](./task.217.bug.5.step5-relative-checker-path.md).

Advisory only (not in `top_issues[]`):

- **[medium/medium-confidence]** `shared/resources/finding-anchors.js:421` (CR-2): `--fix-list` trusts
  the stored `anchor_check` and the stamp count. This is the same class as gate 1's carried CR-3 (the
  stamp does not bind the findings' content).
- **[cleanup]** `skills/review-code/SKILL.md:177` (CR-3): `: "${PR_NUMBER:?…}"` cannot fire, because the
  line above assigns the literal placeholder.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on the feature branch with open PR #745

### Testing Approach

- [x] Automated Testing (unit, block, eval)
- [x] Regression Testing
- [x] Security Review (probe engine, measured)
- [x] Code Review (scoped diff, one Explore subagent)

### Review Methodology

Direct tools plus one read-only Explore code reviewer (re-review, Adaptive Review Strategy).
Reviewer dispatched 05:46:09Z and returned at 05:50:02Z (`duration_ms` 204957).

Re-review scope: files changed since gate 2 (head 9d888cec067a; 23 files) — default

`SAFETY_REPROBE=false`. Clause 1 (mechanical, from gate 2) is false. Clause 2 does not hold (no HIGH
entry) and clause 3 does not hold (the gate is not FAIL).

Mutation proofs ran in a scratch worktree (`git worktree add --detach`), never the tree the reviewer read.

Step 4b: in-scope files `skills/review-code/SKILL.md` and `skills/review-pr/SKILL.md`.

- **Changed blocks**: 3 changed (review-code 2, review-pr 1), 0 executed. All 3 are `mutating`, so the
  engine reports `changed-blocks-not-executed`. The same blocks run under the `fence:` probes and the
  committed block tests.
- **review-code**: `no-executable-blocks` (7 blocks, all mutating).
- **review-pr**: `zero-blocks-executed` (1 placeholder, 15 mutating). The placeholder block is
  unchanged by this diff.
- **Shells**: bash only (zsh is unavailable on this host).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Engine — refuse non-object findings, stamp annotated files | PASS | Verified | The stamp gains `tree` and `root`; `--fix-list` added |
| Phase 2: `--inline` blocks — grammar, stamp, verdicts | PASS | Verified | QA2-3 comments added; CR-3 cleanup advisory |
| Phase 3: review-code `--staged --fix`, population guard, changelog | CONCERNS | Partial | Step 5 fails closed but over-claims cwd independence (QA3-1) |

**Overall Phase Completion**: 3/3 delivered, 1 with concerns.

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| A non-object finding is refused as `usage` | PASS | `finding-anchors.test.mjs` usage tests |
| The `--inline` blocks post exactly the anchor the checker verified | PASS | Stamp tests in both skills, plus the `--inline` selector grammar test |
| review-code `--inline` and `--fix` never edit an unchecked file | PASS | `--fix-list` tests for all three trees, an unreadable side and 13 refusals. The Step 5 block test runs the real checker. Mutations `covered` (5/5) |
| Verdict restatements held to the engine | PASS | `finding-anchors-blocks.test.mjs`, 3 restatements |
| Dispatcher population derived from the tree | PASS | Unchanged since gate 2 |
| `--index` outside-a-work-tree test passes with TMPDIR in a checkout | PASS | 65/65 with `TMPDIR` in the scratchpad; 47/47 with `TMPDIR=/tmp` |

---

## Breaking Changes Validation

### Breaking Change 1: a non-object finding is refused
Documented: Yes · Migration Path Provided: Yes · Migration Tested: Yes · Consumer Code Updated: N/A

### Breaking Change 2: the `--inline` guards and `--fix-list` require the checker's stamp
Documented: Yes · Migration Path Provided: Yes (re-run Step 2b's anchor check) · Migration Tested:
Yes (an older stamp without `tree` is refused) · Consumer Code Updated: N/A

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: Step 5 over-claims cwd independence**
- **Severity**: MEDIUM
- **Category**: Quality / Reliability
- **Bug Report**: [task.217.bug.5.step5-relative-checker-path.md](./task.217.bug.5.step5-relative-checker-path.md)
- **Observation**: From `skills/`, the block HALTs with "Cannot find module". The prose and BUG-4's
  verification step say the answer is the same from any directory.
- **Impact**: Fails closed. The documented behaviour and the test that holds it are both wrong.
- **Recommendation**: Resolve the path from the top level or narrow the claim; make the test run the
  shipped path.
- **Priority**: P2

### LOW Severity Issues (0)

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS
`--fix-list` caches one comparison per path.

### Reliability — CONCERNS
QA3-1 (fails closed). Platform variance: TMPDIR=/tmp 47/47, TMPDIR in the scratchpad 65/65.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 73 (`task.217.qa.3.security.run.json`, `totals.executed`), escaped 0
- `boundary: true`. Three `fence:` controls: review-code Step 4.2 `--inline` 19/19 engages,
  review-pr `--inline` 31/31 engages, review-code Step 5 23/23 engages.

### Maintainability — PASS
The Step 5 decision lives in the engine that writes the stamp, held by its tests.

---

## Code Review

Reviewed: 19 files in the scoped diff, 6 code and skill-doc files in depth. Every anchor checked:
`finding-anchors: ok` (3/3 `ok`, `--rev HEAD`).

**Correctness bugs (2):**
- [medium/high] `skills/review-code/SKILL.md:285`: the checker is run by a cwd-relative path, so from a
  subdirectory the block HALTs, contradicting the "same answer from any directory" claim. The test
  swaps the path. → Resolve from the top level or narrow the claim; test the shipped path. Promoted
  to **TASK-217-QA3-1** (`code_review_blocking`). Provenance: the claim was added in cycle 2 (0 hits on
  `origin/develop`). In scope.
- [medium/medium] `shared/resources/finding-anchors.js:421`: `--fix-list` trusts the stored verdicts
  and count instead of re-checking. → Re-run `checkAnchors` against the stamped tree. Advisory
  (confidence medium), and recorded in `recommendations.future` beside gate 1's CR-3.

**Cleanups (1):**
- `skills/review-code/SKILL.md:177`: the `${PR_NUMBER:?…}` guard cannot fire. → Use a digits check.

Mutation proofs (scratch worktree, baseline green between each):

```markdown
mutation-proven: fixListOf treats every stamp as worktree → --fix-list subdirectory, unreadable, JSON tests + Step 5 block test (4 red) → covered
mutation-proven: unreadable side read as "same" → "a file that cannot be read on either side is skipped" → covered
mutation-proven: notAnnotated always null → "--fix-list refuses every file the checker did not annotate" + Step 5 block test → covered
mutation-proven: malformed anchors applied → --fix-list subdirectory + JSON + Step 5 block test (3 red) → covered
mutation-proven: Step 5 block ignores the checker exit (`|| true`) → Step 5 block test → covered
```

---

## Regression Testing

| Area | Result |
| --- | --- |
| finding-anchors engine suite | PASS |
| review-code and review-pr suites | PASS |
| finding-anchors-blocks eval | PASS |
| `npm run bundle:check` | PASS (128 skills, 0 problems) |
| `npm run validate` (review-code, review-pr, qa-task, qa-story) | PASS |

---

## Test Artifacts

### Files Reviewed
`shared/resources/finding-anchors.js` and its four bundled copies, `skills/review-code/SKILL.md`,
`skills/review-pr/SKILL.md`, `skills/review-code/tests/review-code.test.js`,
`shared/resources/tests/finding-anchors.test.mjs`, `evals/shared/tests/finding-anchors-blocks.test.mjs`,
`CHANGELOG.md`.

### Test Commands Executed
```bash
command node --test shared/resources/tests/finding-anchors.test.mjs skills/review-code/tests/review-code.test.js skills/review-pr/tests/ evals/shared/tests/finding-anchors-blocks.test.mjs   # 255 pass, 0 fail
TMPDIR=/tmp command node --test shared/resources/tests/finding-anchors.test.mjs                       # 47 pass
TMPDIR=<scratchpad> command node --test shared/resources/tests/finding-anchors.test.mjs skills/review-code/tests/review-code.test.js   # 65 pass
npm run validate -- skills/{review-code,review-pr,qa-task,qa-story}/                                  # all ✓
npm run bundle:check                                                                                   # 0 problems
command node shared/resources/security-probe.mjs --sink filename --slot '{findings-json}' --entry 'fence:…' --cases-file … --record task.217.qa.3.security.run.json   # ×3, 73 executed, 0 escaped
(cd skills && command node .agents/skills/review-code/references/finding-anchors.js --fix-list --findings-file …)   # rc=1, Cannot find module (QA3-1)
```

### Coverage Report
Not measured (`node --test` without instrumentation).

---

## Recommendations

### Immediate Actions (Blocking)
1. QA3-1: make the Step 5 claim and its test agree with the block.

### Short-term Actions (Non-Blocking)
1. CR-2: bind the anchors' content in the stamp, or re-check in `--fix-list`.
2. CR-3: replace the `PR_NUMBER` guard with a digits check.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: One medium (QA3-1), which fails closed. Every cycle-2 finding is fixed.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: QA3-1 fixed

---

**QA Report**: co-located at `task.217.qa.3.finding-anchors-advisory-follow-ups.md`
**Gate File**: co-located at `task.217.gate.3.finding-anchors-advisory-follow-ups.yml`
**Next Steps**: qa-fix cycle 3 for QA3-1, then re-review.
