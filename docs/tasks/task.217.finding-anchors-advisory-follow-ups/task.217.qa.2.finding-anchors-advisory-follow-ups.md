# QA Report: Task 217 - Finding-anchors advisory follow-ups (cycle 2)

**Task**: [Link to task document](./task.217.finding-anchors-advisory-follow-ups.md)
**Gate File**: [task.217.gate.2.finding-anchors-advisory-follow-ups.yml](./task.217.gate.2.finding-anchors-advisory-follow-ups.yml)
**Previous Report**: [task.217.qa.1.finding-anchors-advisory-follow-ups.md](./task.217.qa.1.finding-anchors-advisory-follow-ups.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-24
**Testing Completed**: 2026-10-24
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2 re-reviewed the whole branch diff as a refute pass, reading cycle 1's fixes first. All six
cycle-1 findings are fixed, and a reverting mutation of each fix turns a committed test red. All
three probe controls engage: 69 cases executed, 0 escaped. The refute pass found that the new Step 5
tree-diff skips still fail open in two ways. Both were reproduced:

- an unfilled or misspelled `TARGET` disables the skips (QA2-1)
- a run from a subdirectory makes every path look clean (QA2-2)

There are also two low findings.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Gate 1 finding | Status | Evidence |
| --- | --- | --- |
| QA1-1 Step 5 apply-list unguarded (TASK-217-BUG-1) | ✅ FIXED | Step 5 runs the stamp guard. 8 hostile inputs HALT in the block test. Probe 19/19. Mutation → `covered` |
| QA1-2 review-code `--inline` guard unprobeable (TASK-217-BUG-2) | ✅ FIXED | `fence:…#Step 4.2 — Post the findings inline (both platforms)` → `engages` 19/19 (cycle 1: 0 executed) |
| QA1-3 range target not skipped | ✅ FIXED | `runFor("range")` assertion. Mutation → `covered` |
| QA1-4 `rm -f` masks the poster status | ✅ FIXED | A failed poster exits 3 in the block test. Mutation → `covered` |
| QA1-5 Step 5 case list unheld | ✅ FIXED | The restated-verdict test holds 5 restatements. Mutation → `covered` |
| QA1-6 CHANGELOG conflict with develop | ✅ FIXED | Merge `acd48bb8`. PR #745 reads `MERGEABLE` |

## New Findings This Cycle

- **[medium]** `skills/review-code/SKILL.md:276` — QA2-1. Step 5 never checks `TARGET`, so the
  unfilled placeholder or `--staged` prints `apply:` for a file whose working tree differs from the
  index. → HALT on an unknown `TARGET`, and keep the probe control reachable.
- **[medium]** `skills/review-code/SKILL.md:306` — QA2-2. `git diff --quiet -- "$P"` exits 0 when the
  pathspec matches nothing, so a run from `sub/` applies a dirty file. → `cd` to the toplevel, and
  skip a path that is not in the tree.
- **[low]** `skills/review-code/SKILL.md:294` — QA2-3. The jq `\s` trim keeps U+FEFF, which JS
  `trim()` strips, so the shell parses `﻿a.js` where the checker verified `a.js`.
- **[low]** `CHANGELOG.md:18` — QA2-4. "The summary comment still posts" is false for `/review-code`,
  because its Step 4.3 fallback does not fire on a guard HALT.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#745, OPEN, MERGEABLE)

### Testing Approach

- [x] Automated Testing (unit, block, eval)
- [x] Regression Testing
- [x] Security Review (probe engine, 3 controls)
- [x] Code Review (refute pass)

### Review Methodology

Direct tools, plus one read-only Explore reviewer for Step 3b (re-review, small task). The reviewer
was dispatched at 2026-10-24T04:59:59Z and returned at 05:04:04Z (`duration_ms` 205379).

Re-review scope: unscoped. This is the cycle-2 refute pass over the full `origin/develop...HEAD`
diff: 26 files changed in total, a 4,202-line patch.

`SAFETY_REPROBE=false`: clause 1 is `false`. Clauses 2–3 do not hold, because the prior security
status was CONCERNS for an unreachable control, not a FAIL.

Step 4b: in-scope files `skills/review-code/SKILL.md` and `skills/review-pr/SKILL.md`.

- **Changed blocks**: 3 changed (review-code 2, review-pr 1), 0 executed. All 3 are `mutating` (they
  call `mktemp`, `rm -f` and `git`), so the engine reports `changed-blocks-not-executed`. Those same
  blocks run under the `fence:` probes and the committed block tests, which is where they are
  measured.
- **review-code**: `no-executable-blocks` (7 blocks, all mutating).
- **review-pr**: `zero-blocks-executed` (1 placeholder, 15 mutating). The placeholder block is
  unchanged by this diff.
- **Shells**: bash only. zsh is unavailable on this host, and none of the changed lines is
  shell-sensitive.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Engine — refuse non-object findings, stamp annotated files | PASS | Verified | Unchanged since gate 1 |
| Phase 2: `--inline` blocks — grammar, stamp, verdicts | PASS | Verified | Step 4.2 heading. Poster status kept. QA2-3 is a residue of the grammar match |
| Phase 3: review-code `--staged --fix`, population guard, changelog | CONCERNS | Partial | Step 5 skips fail open on `TARGET` and cwd (QA2-1, QA2-2). CHANGELOG claim (QA2-4) |

**Overall Phase Completion**: 3/3 delivered, 1 with concerns.

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| A non-object finding is refused as `usage` | PASS | `finding-anchors.test.mjs` usage tests (unchanged since gate 1) |
| The `--inline` blocks post exactly the anchor the checker verified | CONCERNS | Stamp tests in both skills. QA2-3: the BOM trim differs from JS `trim()` |
| review-code `--inline` and `--fix` never edit an unchecked file | CONCERNS | Block tests cover staged and range at the root. QA2-1 and QA2-2 reproduce an `apply:` on an unchecked file |
| Verdict restatements held to the engine | PASS | `finding-anchors-blocks.test.mjs`, 5 restatements. Mutation → `covered` |
| Dispatcher population derived from the tree | PASS | Floor 4. CR-6 (advisory) notes the scan is narrower than all hand-authored docs |
| `--index` outside-a-work-tree test passes with TMPDIR in a checkout | PASS | 249/249 with `TMPDIR` inside the checkout |

---

## Breaking Changes Validation

### Breaking Change 1: a non-object finding is refused
Documented: Yes · Migration Path Provided: Yes · Migration Tested: Yes · Consumer Code Updated: N/A

### Breaking Change 2: the `--inline` guards require the checker's stamp
Documented: Yes · Migration Path Provided: Yes (re-run the checker step) · Migration Tested: Yes (stamp tests) · Consumer Code Updated: N/A.
Note QA2-4: the stated impact, "the summary comment still posts", holds for `/review-pr` only.

**Overall Breaking Changes Assessment:** PASS. The migration path is correct. The impact sentence is
QA2-4.

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (2)

**Issue: Step 5 applies every finding when TARGET is not a known target**
- **Severity**: MEDIUM
- **Category**: Functional / Security (a fail-open guard)
- **Bug Report**: [task.217.bug.3.step5-target-unchecked.md](./task.217.bug.3.step5-target-unchecked.md)
- **Observation**: with `TARGET=staged`, a dirty staged file is skipped. With `--staged` or the
  unfilled placeholder, it prints `apply: CR-1 (a.js)`.
- **Impact**: `--fix` edits a line the checker never saw.
- **Recommendation**: HALT as Step 2b does, and keep the Step 5 probe control reachable.
- **Priority**: P1

**Issue: Step 5 treats every file as clean when run outside the repository root**
- **Severity**: MEDIUM
- **Category**: Functional / Security (a fail-open guard)
- **Bug Report**: [task.217.bug.4.step5-cwd-fails-open.md](./task.217.bug.4.step5-cwd-fails-open.md)
- **Observation**: the same setup run from `sub/` prints `apply: CR-1 (a.js)`, because
  `git diff --quiet -- a.js` matches nothing there and exits 0.
- **Impact**: `--fix` edits a file whose working tree differs from what was reviewed.
- **Recommendation**: `cd` to the toplevel, and skip paths not in the checked tree.
- **Priority**: P1

### LOW Severity Issues (2)

- **QA2-3**: the BOM trim differs between the jq selectors and JS `trim()`. Reproduced:
  `apply: CR-1 (﻿a.js)` on a dirty file.
- **QA2-4**: the CHANGELOG and the task Risk table say the summary still posts. For `/review-code` it
  does not.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 2

---

## NFR Assessment

### Performance — PASS
One `jq -e` guard per Step 5 run. There is no other new work.

### Reliability — PASS
The `--inline` block exits with the poster's status. Every refusal leaves no scratch file. The
targeted tests pass 249/249 under both `TMPDIR` values.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 69. **Escaped**: 0. Copied from `task.217.qa.2.security.run.json` `totals`.
- The three controls:
  - review-code `--inline` (Step 4.2): `engages` 19/19
  - review-pr `--inline`: `engages` 31/31
  - review-code Step 5: `engages` 19/19
- The boundary is `boundary: true`: a guard whose `false` prevents an edit or a post.
- The probes cannot reach the `TARGET` and cwd inputs, because `fence:` fills one slot. The two
  fail-open paths (QA2-1, QA2-2) were found by hand reproduction, which does not count toward
  `probes_executed`.

### Maintainability — PASS
The verdict lists are held to the engine exports, and each block is reachable by its heading. CR-7
(cleanup) notes that Step 4 item 1 now has no 4.1 heading.

---

## Code Review

The findings come from Step 3b, the refute pass. `code_review_blocking=true`, so every bug with high
confidence is promoted. Every anchor checked `ok`.

**Correctness bugs (6):**
- [medium/high] `skills/review-code/SKILL.md:276` — Step 5 never checks `TARGET`. An unfilled or
  misspelled value disables both skips → HALT on an unknown target (**promoted**, TASK-217-QA2-1;
  reproduced)
- [medium/high] `skills/review-code/SKILL.md:306` — `git diff --quiet` exits 0 for a path that matches
  nothing, so a run from a subdirectory applies everything → `cd` to the toplevel, and skip a path
  not in the tree (**promoted**, TASK-217-QA2-2; reproduced)
- [medium/medium] `skills/review-code/SKILL.md:229` — the Step 4.3 fallback does not fire on a guard
  HALT, so `/review-code` posts nothing, contrary to the CHANGELOG → add the trigger or scope the
  claim (entered by QA as TASK-217-QA2-4, low, after reading the triggers)
- [medium/medium] `skills/review-code/SKILL.md:243` — the Step 4.3 block reads `$SUMMARY_FILE` with no
  writer → bind it in the block. **Provenance: `pre-existing`.** The merge base has the same
  `cat "$SUMMARY_FILE"`, and this diff only added the heading above it. The block sits outside the
  task's `--inline`/`--fix` scope, so it is routed to `recommendations.future`.
- [low/high] `skills/review-code/SKILL.md:294` — the jq trim keeps U+FEFF where JS `trim()` strips
  it → strip what `trim()` strips, or have the checker write the parsed path (**promoted**,
  TASK-217-QA2-3; reproduced)
- [low/medium] `evals/shared/tests/finding-anchors-blocks.test.mjs:215` — the derived population
  misses `skills/*/references/*.md` and calls continued across lines → widen the scan (advisory,
  future)

**Cleanups (1):**
- `skills/review-code/SKILL.md:151` — Step 4 item 1 has no 4.1 heading, and the Step-4-wide paragraph
  now sits under 4.3 → add a 4.1 heading (advisory, future)

**Mutation spot check (cycle-1 fixes), each run from a `cp` snapshot and restored:**

```
mutation-proven: Step 5 guard → `|| true` → task.217: Step 5 under --staged … → covered
mutation-proven: range skip → `if false` → task.217: Step 5 under --staged … → covered
mutation-proven: POST_RC=$? → POST_RC=0 → task.217: the --inline block runs with only its placeholders … → covered
mutation-proven: Step 5 skip list drops unparseable → every restated verdict list … → covered
```

4 of 4 cycle-1 fixes were mutation-proven `covered`. `git status --porcelain` was unchanged after the
run.

**Platform variance:** the targeted suites pass 249/249 under `TMPDIR=/tmp` and 249/249 with
`TMPDIR` inside the checkout.

---

## Regression Testing

| Area | Result |
| --- | --- |
| review-code / review-pr skill tests | PASS (249/249 with the eval and engine suites) |
| finding-anchors engine + blocks eval | PASS |
| Full fast gate (`npm run ci:fast`, `.agents/skills` symlink aside) | PASS — 6267 pass, 0 fail, 14 skipped of 6281 (GATE_EXIT=0) |
| PR CI @ 9d888cec | pass: link-check, secret-scan, shellcheck, test, validate |

---

## Test Artifacts

### Files Reviewed
`skills/review-code/SKILL.md`, `skills/review-pr/SKILL.md`, `shared/resources/finding-anchors.js`,
`skills/review-code/tests/review-code.test.js`, `skills/review-pr/tests/review-pr.test.js`,
`evals/shared/tests/finding-anchors-blocks.test.mjs`, `CHANGELOG.md`.

### Test Commands Executed
```bash
TMPDIR=/tmp node --test skills/review-code/tests/*.test.js skills/review-pr/tests/*.test.js evals/shared/tests/finding-anchors-blocks.test.mjs shared/resources/tests/finding-anchors.test.mjs
TMPDIR=$PWD/.claude/state/tmpq node --test <same globs>
npm run validate -- skills/review-code/   # ✓
npm run validate -- skills/review-pr/     # ✓
node shared/resources/security-probe.mjs --sink filename --slot '{findings-json}' --record docs/tasks/task.217.finding-anchors-advisory-follow-ups/task.217.qa.2.security.run.json --json \
  --name "review-code --inline stamp guard" --entry 'fence:skills/review-code/SKILL.md#Step 4.2 — Post the findings inline (both platforms)' --cases-file docs/tasks/task.217.finding-anchors-advisory-follow-ups/task.217.qa.1.review-code-inline-cases.json
#   … and the review-pr --inline control (task.217.dod.1.security.cases.1.json) and the Step 5 control (task.217.qa.1.review-code-step5-cases.json)
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/review-code/SKILL.md --diff-base "$(git merge-base origin/develop HEAD)" --copy-as skills:.agents/skills --json
npm run ci:fast
```

The hand reproductions for QA2-1, QA2-2 and QA2-3 extract the committed Step 5 block from
`git show HEAD:skills/review-code/SKILL.md` and run it in a temporary repository: a staged file with
a further edit on top, run from the root and from `sub/`.

### Coverage Report
Not measured: this repository's suites are `node --test` without coverage instrumentation.

---

## Recommendations

### Immediate Actions (Blocking)
1. Make the Step 5 skips fail closed on `TARGET` (QA2-1) and on the cwd (QA2-2). P1.

### Short-term Actions (Non-Blocking)
1. QA2-3: match the selectors' trim to JS `trim()`.
2. QA2-4: make the summary claim true for `/review-code`, or scope it to `/review-pr`.
3. CR-4 (pre-existing), CR-6, CR-7, and a multi-slot `fence:` probe. See the gate's
   `recommendations.future`.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: cycle 1's findings are all closed and held by tests. Two reproduced medium defects
remain in the Step 5 skips that cycle 1 extended.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: QA2-1 and QA2-2 fixed.

---

**QA Report**: co-located at `task.217.qa.2.finding-anchors-advisory-follow-ups.md`
**Gate File**: co-located at `task.217.gate.2.finding-anchors-advisory-follow-ups.yml`
**Next Steps**: `/qa-fix` cycle 2 on QA2-1..QA2-4, then QA cycle 3 (scoped to the files changed since `9d888cec`).
