# QA Report: Task 217 - Finding-anchors advisory follow-ups

**Task**: [task.217.finding-anchors-advisory-follow-ups.md](./task.217.finding-anchors-advisory-follow-ups.md)
**Gate File**: [task.217.gate.1.finding-anchors-advisory-follow-ups.yml](./task.217.gate.1.finding-anchors-advisory-follow-ups.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-23
**Testing Completed**: 2026-10-23
**Gate Status**: CONCERNS

---

## Executive Summary

All three phases are delivered, and every success criterion holds on evidence: tests, the probe engine and mutation proofs. The diff review found a third consumer of `anchor_check` that this change added without the guard it gave the other two. The new Step 5 apply-list block trusts a findings file the checker never annotated. Separately, the `review-code --inline` guard cannot be reached by the probe engine. Both are medium. Four low items ride along, one of them a `CHANGELOG.md` conflict with `develop`.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (3/3, checkboxes ticked)
- [x] Tests passing
- [x] Breaking changes documented (CHANGELOG, task §4)
- [x] Code on feature branch with open PR ([#745](https://github.com/Gamaroff/agent-skills/pull/745))

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, eval, fenced-block execution)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review (probe engine, 42 cases)
- [x] Code Review

### Review Methodology

The approach was hybrid: one read-only Explore subagent ran the diff review (Step 3b), and everything else used direct tools. The task has 3 phases across 4 skills plus the engine, with medium risk on a refuse-by-default boundary. Reviewer dispatched 20:23:11Z; its completion notice gave `duration_ms` 683741 (11.4 min).

Step 4b: the snippet engine ran over both changed SKILL.md files. It executed none of the changed blocks: review-pr has 1 changed block, review-code has 2, and all 3 are classified `mutating` because they call `node`, `mktemp` and `gh`. Only bash was available (`zsh-unavailable` on this host). Every changed block is executed instead by a committed test and by the probe engine:

- review-pr `--inline`: `review-pr.test.js` extracts the guard, and the probe ran 31 cases.
- review-code `--inline`: the full-block run test in `review-code.test.js`.
- review-code Step 5: the temp-repo test in `review-code.test.js`, and the probe ran 11 cases.

`changed-blocks-not-executed` is therefore recorded, not promoted.

---

## New Findings This Cycle

First review — not applicable.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: engine refusal + stamp | PASS | Verified | `finding-anchors.js` refuses a non-object before `checkTree`; stamp written on wrapped docs; `CLEAN` exported |
| Phase 2: guards + selectors + bindings | PASS | Verified | Both guards require the stamp, count and seven verdicts; `capture()` grammar; review-code binds `PR_NUMBER`/`SUMMARY_FILE` |
| Phase 3: staged skip, population, CHANGELOG | CONCERNS | Partial | Staged skip delivered; the same block lacks the guard (QA1-1) and covers only `--staged` (QA1-3) |

**Overall Phase Completion**: 3/3 delivered, 1 with concerns

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| `[null]` → usage naming `code_review.findings[0]` | PASS | `finding-anchors.test.mjs` "task.217: non-objects …" (both lenses) |
| `["x"]` on pr_conformance → usage, no annotate file | PASS | same test, annotate-file absence asserted |
| Two-lens stamp count = total | PASS | "task.217: --annotate stamps …"; mutation M1 → red |
| Both guards HALT on no stamp / count mismatch / unknown verdict | PASS | `review-pr.test.js` and `review-code.test.js` task.217 stamp tests; probe 31/31 (review-pr); M3 → red |
| Colon path and padded anchor | PASS | the task.217 grammar test in each skill; whitespace and first-colon mutations red (Step 3) |
| review-code `--inline` runs with only placeholders | PASS | full-block run test (`bash -uc`) |
| `--staged --fix` skips a differing file | PASS | temp-repo test; mutation M2 → red |
| Fifth dispatcher fails the blocks test | PASS | "derived from the tree" test; a fake fifth dispatcher → red (Step 3) |
| Refusal adds no reads (0 `deps.exec`, no annotate output) | PASS | counting-exec refusal test |
| Each path read once | PASS | task.195 SC-8 test green in the 6267 |
| `npm run ci` passes | PASS | `ci:fast` (6267 pass, 0 fail, symlink aside), `eval:all` EVAL_EXIT=0 (symlink aside), `validate:all`, `check:generated`, `bundle:check`, `lint:shell`, `lint:secrets` clean |
| quick_validate on 4 skills | PASS | `npm run validate -- skills/<s>/` ✓ for review-pr, review-code, qa-task, qa-story |
| Every fix mutation-proven | PASS | Step 3 implementation report plus 3 QA spot checks below |
| CHANGELOG cites task 217, both breaking changes | PASS | `[Unreleased]` › Fixed; conflicts with develop (QA1-6) |
| Bundled copies in the same commit | PASS | `ab2c64be` carries the source and the four `references/` copies; `bundle:check` clean |

---

## Breaking Changes Validation

### Breaking Change: `--inline` guards require the checker stamp
Documented: Yes · Migration Path Provided: Yes (re-run the checker step; the HALT names it) · Migration Tested: Yes (probe case `reviewer-written-ok-no-stamp` HALTs with the message) · Consumer Code Updated: Yes (control fixtures stamped)

### Breaking Change: non-object finding exits 2 (`usage`)
Documented: Yes · Migration Path Provided: Yes (every dispatcher already HALTs on `usage`) · Migration Tested: Yes (CLI null test) · Consumer Code Updated: N/A

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (2)

**Issue: Step 5 apply-list trusts an unchecked findings file (TASK-217-QA1-1, from CR-1)**
- **Severity**: MEDIUM
- **Category**: Security / Functional
- **Bug Report**: [task.217.bug.1.step5-apply-list-unguarded.md](./task.217.bug.1.step5-apply-list-unguarded.md)
- **Observation**: `LIST=$(jq …)` reads `anchor_check` with no stamp or verdict check. An un-annotated finding has an empty `CHECK` and prints `apply:`, and `{}` prints nothing at exit 0.
- **Impact**: `--fix` edits a line nobody verified, which is the outcome this task exists to prevent.
- **Recommendation**: Use the `--inline` guard, and HALT on failure.
- **Priority**: P1

**Issue: review-code `--inline` guard is unreachable by the probe engine (TASK-217-QA1-2)**
- **Severity**: MEDIUM
- **Category**: Security (evidence)
- **Bug Report**: [task.217.bug.2.review-code-inline-guard-unprobeable.md](./task.217.bug.2.review-code-inline-guard-unprobeable.md)
- **Observation**: `fence:skills/review-code/SKILL.md#Step 4 — `--comment` (optional)` resolves to the first block under that heading, the GitHub one. It has no `{findings-json}`, so the run declines `bad-slot`, and the control is recorded `unverifiable` with 0 executed.
- **Impact**: The guard is held only by unit tests. `/finalise`'s zero-guard would fail the same record.
- **Recommendation**: Give the block its own heading, then run the 19 prepared cases.
- **Priority**: P1

### LOW Severity Issues (4)

- **TASK-217-QA1-3** (CR-2): Step 5 skips only under `--staged`, but `range` and PR targets are checked at `--rev HEAD` (line 95), and `--fix` edits the working tree.
- **TASK-217-QA1-4** (CR-4): the `--inline` block exits 0 after `rm -f`, whatever the poster returned.
- **TASK-217-QA1-5** (CR-5): the Step 5 `case` list restates `MALFORMED`, but no test holds it.
- **TASK-217-QA1-6**: PR #745 conflicts with `develop` in `CHANGELOG.md`, because PR #744 added an `[Unreleased]` entry.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 4

---

## NFR Assessment

### Performance — PASS
The refusal adds no reads: a counting `exec` stub sees 0 calls. The one-read-per-path test is green.

### Reliability — PASS
Every new block HALTs on unreadable input and removes its scratch file on every path. A run with `TMPDIR` inside the checkout is green: 58/58 across the engine and blocks tests.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 42 (run record `totals.executed`), escaped 0
- Results by control:
  - review-pr `--inline` stamp guard: `engages`, 31/31.
  - review-code Step 5 apply-list: `engages`, 11/11. `TARGET` stays at its placeholder, so the verdict skip and the jq HALT are probed. The `--staged` skip needs a git index and is held by the committed temp-repo test.
  - review-code `--inline`: `unverifiable`, 0 (QA1-2).
- The concern comes from QA1-1 and QA1-2.

### Maintainability — PASS
Restated verdicts are held to the engine's exports. The dispatcher population is derived from the tree, with a floor of 4 and a control for a comment-only mention.

---

## Code Review

The anchor checker returned `ok` on all 5 findings (stamp `findings: 5`). `code_review_blocking=true` (pipeline override), so CR-1 is promoted as TASK-217-QA1-1. CR-2 and CR-4 are below high confidence; QA verified CR-2 by reading line 95 and carries both as low items. Boundary: `true`. `probes_executed: 42`, `escaped: 0`.

**Correctness bugs (4):**
- [medium/high] `skills/review-code/SKILL.md:272`: the Step 5 apply-list has no stamp or verdict guard → reuse the `--inline` guard → **promoted: TASK-217-QA1-1**
- [medium/medium] `skills/review-code/SKILL.md:285`: the skip covers only `staged`; `range` is checked at HEAD → compare against HEAD for HEAD-checked targets (QA1-3)
- [low/low] `skills/review-code/SKILL.md:182`: the stamp counts findings but does not bind their content → hash the anchor fields, or document the limit (future)
- [low/low] `skills/review-code/SKILL.md:208`: `rm -f` masks the poster's exit → save and exit with its status (QA1-4)

**Cleanups (1):**
- `skills/review-code/SKILL.md:280`: the Step 5 `case` list is not held by the restated-verdict test → enumerate it (QA1-5)

Mutation spot checks (snapshot with `cp`, restore, tree clean after):
- mutation-proven: stamp write removed in `finding-anchors.js` → "task.217: --annotate stamps a wrapped document …" → covered
- mutation-proven: staged skip disabled in review-code Step 5 → "task.217: Step 5 under --staged skips …" → covered
- mutation-proven: review-pr guard's stamp clause replaced by `true` → "task.217: --inline requires the checker's stamp …" (plus "--inline refuses … un-annotated", whose fixture omits the stamp) → covered

Platform variance: `TMPDIR=/tmp command node --test shared/resources/tests/finding-anchors.test.mjs` → exit 0, 41/41. The same tests plus the blocks test with `TMPDIR` set inside the checkout → 58/58.

---

## Regression Testing

| Area | Result |
| --- | --- |
| qa-task / qa-story checker blocks (bundled engine changed) | PASS — `finding-anchors-blocks.test.mjs` runs all four dispatchers |
| finding-anchors callers | PASS — `finding-anchors-callers.test.mjs` |
| Whole suite | PASS — 6267 pass, 0 fail; `eval:all` green |

---

## Test Artifacts

### Files Reviewed
`shared/resources/finding-anchors.js`, `skills/review-pr/SKILL.md`, `skills/review-code/SKILL.md`, the four test files, `CHANGELOG.md`, the four bundled copies.

### Test Commands Executed
```bash
npm run ci:fast                       # 6267 pass, 0 fail (.agents/skills moved aside)
npm run eval:all                      # EVAL_EXIT=0 (.agents/skills moved aside)
npm run validate:all; npm run check:generated; npm run bundle:check; npm run lint:shell; npm run lint:secrets
npm run validate -- skills/{review-pr,review-code,qa-task,qa-story}/
TMPDIR=/tmp command node --test shared/resources/tests/finding-anchors.test.mjs
command node shared/resources/security-probe.mjs --sink filename --entry 'fence:skills/review-pr/SKILL.md#`--inline` — findings beside the lines they are about' --slot '{findings-json}' --cases-file docs/tasks/task.217.finding-anchors-advisory-follow-ups/task.217.dod.1.security.cases.1.json --record docs/tasks/task.217.finding-anchors-advisory-follow-ups/task.217.qa.1.security.run.json --json
command node shared/resources/security-probe.mjs --sink filename --entry 'fence:skills/review-code/SKILL.md#Step 5 — `--fix` (optional)' --slot '{findings-json}' --cases-file docs/tasks/task.217.finding-anchors-advisory-follow-ups/task.217.qa.1.review-code-step5-cases.json --record docs/tasks/task.217.finding-anchors-advisory-follow-ups/task.217.qa.1.security.run.json --json
```

### Coverage Report
Not measured. The repository's `node --test` runner collects no coverage.

---

## Recommendations

### Immediate Actions (Blocking)
1. QA1-1: guard the Step 5 apply-list (P1).
2. QA1-2: make the review-code `--inline` block reachable by `fence:` and probe it with `task.217.qa.1.review-code-inline-cases.json` (P1).
3. QA1-6: merge `origin/develop`, keeping both `[Unreleased]` entries.

### Short-term Actions (Non-Blocking)
1. QA1-3, QA1-4 and QA1-5: they sit in the same block, so fix them in the same cycle.
2. CR-3: decide whether the stamp should bind finding content.
3. Pre-existing: the qa-task and qa-story Step 3b blocks never remove their `qa-findings.*` scratch file.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Two medium findings. One is a promoted high-confidence bug, and the other is a boundary with no executed probe. No high findings, and every success criterion holds.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: QA1-1 and QA1-2 fixed; conflict with `develop` resolved.

---

**QA Report**: co-located at `task.217.qa.1.finding-anchors-advisory-follow-ups.md`
**Gate File**: co-located at `task.217.gate.1.finding-anchors-advisory-follow-ups.yml`
**Next Steps**: `/qa-fix` cycle 1 on the six `top_issues`, then QA cycle 2 (a full-diff refute pass).
