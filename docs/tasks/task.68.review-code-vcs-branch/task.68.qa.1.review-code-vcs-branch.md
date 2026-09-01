# QA Report: Task 68 — `/review-code` branches on TRACKER where it should branch on VCS

**Task**: [task.68.review-code-vcs-branch.md](./task.68.review-code-vcs-branch.md)
**Gate File**: [task.68.gate.1.review-code-vcs-branch.yml](./task.68.gate.1.review-code-vcs-branch.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-01
**PR**: [#294](https://github.com/Gamaroff/agent-skills/pull/294) (OPEN, head `31b3184`)
**Gate Status**: CONCERNS

---

## Executive Summary

The fix is correct, minimal and unusually well guarded: the branch key, both platform arms, the rule statement and the removal of the dead pointer are each held by a test that has been *proved* to fail without them. The sweep behind Phase 3 is thorough and — importantly — records what it deliberately left alone.

One MEDIUM defect, and it is in the new test file rather than the fix: two tests read sibling skills, so the suite fails with ENOENT wherever `review-code` ships without `review-pr` and `finalise` beside it. Packaging permits exactly that.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — resolve TASK68-001.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All 3 implementation phases completed (0 unchecked boxes)
- [x] Tests passing
- [x] Breaking changes documented — task claims none; verified (see below)
- [x] Code on feature branch with open PR #294

### Review Methodology

**Direct tools.** Adaptive Review Strategy selects direct tools for a 3-phase, `risk_level: low`, single-skill change. No parallel agents; Step 3b run as a single inline pass. Recorded per the strategy table.

First review — no prior gate, so Phase 0's re-review branch does not apply.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
|---|---|---|---|
| Phase 1: Fix the branch | **PASS** | Verified | `skills/review-code/SKILL.md` Step 4 now contains **zero** `TRACKER=` occurrences. GitHub arm reads `VCS=github`, Bitbucket arm `VCS=bitbucket`, and the rule is stated in `review-pr`'s exact words. The dead `mirror /qa-story step 6` pointer is gone and replaced with a real recipe. |
| Phase 2: Guard it | **CONCERNS** | 12/12 green in-repo, **10/12 standalone** | Tests exist, are correctly scoped to the Step 4 section, and hold under mutation. But two of them escape the skill directory — see TASK68-001. |
| Phase 3: Sweep | **PASS** | Verified | All 64 occurrences across 20 source files classified; the classification table is in the implementation report, including the hits deliberately kept. Spot-checked `qa-story` 6b, `qa-task` 13b, `finalise` (both hits) and the four `shared/resources/develop-pipeline-*` hits — all genuinely issue-shaped. |

**Overall Phase Completion**: 2/3 PASS, 1 CONCERNS.

---

## Success Criteria Verification

### Functional

| Criterion | Target | Actual | Status |
|---|---|---|---|
| `--comment` takes the Bitbucket path when `VCS=bitbucket`, regardless of `TRACKER` | Yes | Yes — arm keyed on `VCS=bitbucket`; no `TRACKER=` remains in the file | PASS |
| The Bitbucket arm names a recipe that actually exists | Yes | `finalise` Step 7 verified present, with both a GitHub arm and a Bitbucket arm | PASS |
| The VCS-vs-TRACKER rule is stated in the skill | Yes | Verbatim match with `review-pr` line 79, asserted by a cross-skill test | PASS |

### Code Quality

| Criterion | Target | Actual | Status |
|---|---|---|---|
| `skills/review-code/tests/` exists and runs under `npm test` | Yes | Yes — glob added to `package.json`; **confirmed in the gate log that it actually ran**, not merely that the glob was added | PASS |
| Every fix is mutation-proved | Yes | 5 reverts, all red; independently re-verified by QA (below) | PASS |
| The sweep's classification is recorded, including hits left alone | Yes | Full table in the implementation report | PASS |
| Suite green | 0 failures | `npm run ci:fast`: **2116 tests, 0 failures**, prettier clean | PASS |

---

## Mutation-Proof Spot Check (Step 3c)

The developer reported five reverts, all red. QA re-ran an **independent** sixth that the developer did not run — changing the Bitbucket arm's key to `TRACKER=bitbucket`:

| Mutation | Applied? | Result |
|---|---|---|
| `**Bitbucket** (`VCS=bitbucket`)` → `(`TRACKER=bitbucket`)` | proved applied | 🔴 **3 failing**, restored 12/12 green |

`mutation-proven: yes` for the branch-key invariant, independently confirmed. The developer's own five reverts each asserted that the mutation string actually matched before counting the red — the correct discipline, and the reason the result is admissible. A mutation that cannot prove it mutated is not evidence.

---

## Breaking Changes Validation

### Breaking Change: none claimed

- **Documented**: Yes — §5 asserts none.
- **Verified**: Yes. In a GitHub/GitHub repo `TRACKER` and `VCS` both resolve to `github`, so every branch this change touches selects the same arm as before. The only behavioural difference is in the mixed configuration that was already broken.
- **Consumer code updated**: N/A.

**Assessment**: PASS. The claim is correct and is the reason the defect survived undetected.

---

## Issues Found

### MEDIUM Severity Issues (1)

**TASK68-001 — the shipped test suite fails outside this repository**

- **Severity**: MEDIUM
- **Category**: Quality / portability
- **File**: `skills/review-code/tests/review-code.test.js`
- **Observation**: two tests read across skill boundaries — `path.join(ROOT, "..", "review-pr", "SKILL.md")` and `path.join(ROOT, "..", "finalise", "SKILL.md")`. `package_skill.py` walks the entire skill directory (`skill_path.rglob('*')`) and its `EXCLUDE_DIRS` is only `{__pycache__, .git, node_modules, .DS_Store}` — `tests/` is not excluded, so the suite ships.
- **Reproduced**: copied `SKILL.md` + `tests/` alone into a temp directory and ran `node --test` → **2 of 12 fail with `ENOENT`**. Not inferred from reading the packager; executed.
- **Impact**: bounded. It is a confusing failure in a consumer's test run, not a misbehaviour of the skill. But it is a regression against the file's own model: `review-pr/tests/review-pr.test.js` reads only within its own `ROOT`, and this file was explicitly written after it.
- **Recommendation**: keep both assertions — the cross-skill drift guard is genuinely valuable and is the thing stopping the two skills disagreeing again — but degrade instead of crashing. Guard each sibling read and skip when the file is absent, so the check is enforced here and inert elsewhere.
- **Priority**: P2

### LOW Severity Issues (2)

1. **The Bitbucket arm names variables it does not derive.** It references `${BB_API}`, `${BB_WORKSPACE}`, `${BB_REPO}` and `${PR_ID}`; the Step 4 snippet resolves only `VCS`/`TRACKER`. The "copy that shape" pointer to `finalise` Step 7 does cover it — `finalise` derives all four — so this is legibility, not correctness. Documented as a future recommendation.
2. **Step 4b reports `zero-blocks-executed` for this skill** — 3 fenced bash blocks, all classified `mutating` (write-redirection at :52, `.` sourcing fail-closed at :96, `rm -rf` deny-list at :120), none executed. **Verified pre-existing, not a regression**: the same engine run against the `develop` version of the file returns a byte-identical classification and the identical finding. This change adds no new executable block and alters no block's classification. Out of scope for task 68.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2.

No bug report files created — MEDIUM issue TASK68-001 is being fixed in this cycle's qa-fix pass, so it never leaves the loop.

---

## NFR Assessment

### Performance — PASS
Prose plus 12 assertions over files already read. Suite grew 2104 → 2116 tests with no measurable runtime change.

### Reliability — PASS
The change makes the original silent failure unreachable: `gh` can no longer be selected against a Bitbucket PR. The Bitbucket arm delegates credential resolution to `bitbucket-auth.sh`, which fails closed. Rollback is a single revert across three files, as §11 states.

### Security — PASS
No credential handling introduced or altered; no secrets in the diff. The referenced auth helper is the one already used elsewhere and returns non-zero when no credential is set, which is the correct posture for a step that would otherwise 404 ambiguously.

### Maintainability — CONCERNS
TASK68-001. Otherwise strong: the tests' Step-4 scoping is deliberate and documented in a comment explaining *why* a file-wide `TRACKER` ban would be wrong — that comment is what stops a future maintainer "simplifying" the assertion into a defect.

---

## Code Review (Step 3b)

Advisory — the task does not set `code_review_blocking`, and the pipeline did not pass the run-level override. TASK68-001 is recorded in `top_issues` on its own merits as a MEDIUM defect found in review (Step 9), not via the code-review promotion path.

**Correctness bugs (1):**
- [medium/high] `skills/review-code/tests/review-code.test.js:104,150` — cross-skill `readFileSync` throws `ENOENT` when the sibling skill is absent → guard the read and skip the assertion instead.

**Cleanups (1):**
- `skills/review-code/SKILL.md:103` — the Bitbucket arm could name where `BB_API`/`BB_WORKSPACE`/`BB_REPO` come from rather than relying on the reader following the `finalise` pointer.

Positives worth recording, because they are the reason this review is short:
- Assertions are scoped to the Step 4 section rather than the whole file, with a comment explaining that a file-wide ban would forbid a legitimate future issue-shaped branch. That is the distinction the task is about, encoded in the guard.
- The `STEP_4` slice asserts its own match (`assert.ok(m, …)`) before use, so a renamed heading fails loudly rather than silently matching nothing — the vacuity trap this repo has been bitten by twice.
- The `finalise` pointer is itself tested for existence, so the cross-reference cannot rot unnoticed.

---

## Regression Testing

| Area | Result |
|---|---|
| Full suite | PASS — 2116 tests, 0 failures |
| Formatting | PASS — `prettier --check` clean |
| Bundled `references/` drift | PASS — the pre-commit hook ran `npm run bundle`; every skill reported in sync, including `review-code` |
| Skill frontmatter | PASS — `npm run validate -- skills/review-code/` → ✓ |
| Sibling skills' behaviour | PASS — the sweep changed no file other than `review-code`; the 63 other `TRACKER=github` occurrences are untouched |

---

## Test Artifacts

### Test Commands Executed

```bash
npm run ci:fast                                   # 2116 tests, 0 failures; prettier clean
node --test 'skills/review-code/tests/*.test.js'  # 12/12
node shared/resources/qa-execute-snippets.mjs --file skills/review-code/SKILL.md --json
node --test 'review-code/tests/*.test.js'         # standalone copy → 10/12, 2× ENOENT
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Zero HIGH findings; the fix and its guards are correct and independently mutation-verified. One MEDIUM portability defect in the new test file, plus a Maintainability CONCERNS driven by it. Gate rule 2 (any MEDIUM → CONCERNS) and rule 4 (any NFR CONCERNS → CONCERNS) both apply.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL — resolve TASK68-001.

---

**Next Steps**: `/qa-fix` addresses TASK68-001, then re-review.
