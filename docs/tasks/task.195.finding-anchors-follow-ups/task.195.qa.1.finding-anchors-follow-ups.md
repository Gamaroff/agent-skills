# QA Report: Task 195 - Finding-anchors follow-ups

**Task**: [task.195.finding-anchors-follow-ups.md](./task.195.finding-anchors-follow-ups.md)
**Gate File**: [task.195.gate.1.finding-anchors-follow-ups.yml](./task.195.gate.1.finding-anchors-follow-ups.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-19
**Testing Completed**: 2026-10-19
**Gate Status**: CONCERNS

---

## Executive Summary

All four phases are in place, every success criterion has a committed test, and `npm run ci:fast` is green (5959 tests, 0 failures). The diff review found two defects inside this task's own scope, and both were reproduced. A `code_review` finding with **no** `file_line` key still reads as the clean `no-line`. The `--inline` guard passes a file that has no findings array, although its HALT message says it covers that case.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed (13/13 items)
- [x] Tests passing
- [x] Breaking changes documented (§5; CHANGELOG consumer note)
- [x] Code on feature branch with open PR (#695)

### Testing Approach

- [x] Automated Testing (unit, executed-prose blocks)
- [x] Regression Testing (`npm run ci:fast`)
- [x] Security Review (fence probe, measured)
- [x] Code Review (Step 3b)

### Review Methodology

Direct tools, plus one read-only Explore code reviewer, since this is a first review of a 4-phase task with medium risk. Reviewer time is measured from the completion notice: `duration_ms` 147524 (about 2.5 minutes). The reviewer's YAML arrived through the notification HTML-escaped (`&gt;`). I unescaped it before running the anchor check, and all five anchors read `ok`.

Step 4b: in scope, because four SKILL.md files with changed fenced bash blocks are in the change set. The `changed` counts:
- qa-task: 1 changed block, 1 mutating, 0 executed.
- qa-story: 1 changed block, 1 mutating, 0 executed.
- review-code: 2 changed blocks, 2 mutating, 0 executed.
- review-pr: 2 changed blocks, 2 mutating, 0 executed.

Every changed block writes files (`cat >`, `--annotate`), so the engine refuses to run it. Each file therefore reports `changed-blocks-not-executed`, and review-pr also reports `zero-blocks-executed` (1 placeholder, 15 mutating). This is recorded, not suppressed. The same blocks **are** executed per PR by `evals/shared/tests/finding-anchors-blocks.test.mjs` (checker blocks, in a scratch repository) and by the review-code/review-pr guard tests (`--inline` guards). zsh is not installed on this host (`which zsh` → none), so every execution was under bash only.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Engine | CONCERNS | Verified | `unparseable`, root-in-rev and `--index` hold; TASK-195-QA1-1 (wrapped code finding with no `file_line`) |
| Phase 2: Dispatcher blocks | CONCERNS | Verified | Reason decision executed per PR; TASK-195-QA1-2 (guard passes `{}`) |
| Phase 3: review-pr head SHA | PASS | N/A | Superseded by `319bf779`, verified in review 1 |
| Phase 4: Consumers, population, release notes | PASS | Verified | develop-bug rule, consumer population (11 members, floor 5), CHANGELOG |

**Overall Phase Completion**: 4/4 delivered, 2 with concerns

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| SC-1 unparseable / no-line by lens | `finding-anchors.test.mjs` (unparseable cases, lens-by-key pair) | PASS, with TASK-195-QA1-1 as a gap the criterion does not name |
| SC-2 root not in rev → bad-root | `finding-anchors.test.mjs` root-in-rev + in-tree control | PASS |
| SC-3 `--index` staged read; with `--rev` → usage | `finding-anchors.test.mjs`; `finding-anchors-blocks.test.mjs` review-code staged | PASS |
| SC-4 blocks HALT on missing checker, continue on malformed | `finding-anchors-blocks.test.mjs` (13 cases) | PASS |
| SC-5 `--inline` refuses un-annotated | review-code / review-pr guard tests | PASS for un-annotated findings; TASK-195-QA1-2 for a file with no findings array |
| SC-6 review-pr head SHA | `skills/review-pr/tests/resolve-head-rev.test.js` + blocks test | PASS |
| SC-7 develop-bug rule (documentation) | `finding-anchors-callers.test.mjs` | PASS |
| SC-8 each path read once | existing counting-`readFile` test, green | PASS |
| SC-9 tests, bundle, validate | ci:fast 5959/0; `bundle:check` 0 problems; `npm run validate` ✓ for 5 skills | PASS |
| SC-10 mutation proof | 7 dev mutations, each red, recorded in the implementation report; QA spot check below | PASS (committed tests went red) |
| SC-11 CHANGELOG | `[Unreleased]` › Fixed names `unparseable`, `--index`, the dispatcher change | PASS |

---

## Breaking Changes Validation

### Breaking Change: code findings that used to read `no-line` now read `unparseable`
Documented: Yes (§5, CHANGELOG consumer-upgrade note)
Migration Path Provided: Yes (treat `unparseable` as malformed)
Migration Tested: Yes (dispatcher enumerations updated at the nine sites; blocks test)
Consumer Code Updated: Yes
Notes: An external caller is told to re-vendor.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: A wrapped code finding with no `file_line` reads clean**
- **Severity**: MEDIUM
- **Category**: Functional
- **Gate id**: TASK-195-QA1-1 (from CR-1, reproduced by QA)
- **Observation**: `{"code_review":{"findings":[{"id":"CR-9","category":"bug",…}]}}` → `reason: ok`, verdict `no-line`. `anchorOf` decides the lens by key only, so a code finding that has lost its key looks like a conformance one.
- **Impact**: This is the problem-1 defect class, a code finding with no usable location passing as clean, at its extreme. qa-* would promote such a finding without `(location unverified: …)`.
- **Recommendation**: Decide the lens from the wrapper where there is one, and read a code finding with no usable `file_line` as `unparseable`.
- **Priority**: P2

### LOW Severity Issues (1)

- **TASK-195-QA1-2** (from CR-3, reproduced): the `--inline` guard `jq -e '[ .code_review.findings[]? | select(has("anchor_check") | not) ] | length == 0'` exits 0 on `{}`. That contradicts its own HALT text ("or the file is not findings JSON"). The same pattern is in review-pr.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
The engine still reads each path once per run. The `--rev` route adds one `git cat-file -t` per run.

### Reliability — CONCERNS
The missing-checker HALT is executed per PR. TASK-195-QA1-1 leaves one clean verdict for a code finding that has no location.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 12, copied from `task.195.qa.1.security.run.json` `totals.executed`
- `boundary: true`. The review-code Step 2b block refuses a `TARGET` outside `worktree | staged | range`, and it is probed with `fence:skills/review-code/SKILL.md#Step 2b — Check every anchor (always)`, `--slot '{target: worktree | staged | range}'`. Cases are in `task.195.qa.1.review-code-target-cases.json`: 9 hostile (empty, case change, extra flag, two words, trailing `;`, suffix, raw `--index`, glob, leading space), all refused with the HALT text, and 3 legitimate (worktree malformed, staged malformed, worktree clean), all accepted with the checker's reason. 0 reproduced. Run under bash; zsh is absent on the host.
- The reason-deciding `case` in all four checker blocks is a boundary on the checker's **output**, not on case input. qa-task and qa-story place the block third under its heading, which is out of `fence:`'s reach (it takes the first bash block). That decision is executed per PR by `finding-anchors-blocks.test.mjs` instead, which is a committed test and not a probe count.

### Maintainability — PASS
The tests execute the shipped blocks rather than grepping them, and the consumer population guard carries a floor.

---

## Code Review

Advisory except where promoted. `code_review_blocking=true` was in force, but no finding is `bug` + `confidence: high`, so none was promoted by the blocking rule. TASK-195-QA1-1 and -2 are QA findings, entered after QA reproduced them. Their reviewer severity and confidence are unchanged.

**Correctness bugs (5):**
- [medium/medium] `shared/resources/finding-anchors.js:106`: a `code_review` finding with no `file_line` is classed conformance and reads clean `no-line` → choose the lens from the wrapper (→ TASK-195-QA1-1)
- [medium/medium] `skills/review-code/SKILL.md:179`: the Step 4 `--inline` block reads `$INLINE_FILE`, `$PR_NUMBER` and `$SUMMARY_FILE` with no writer in the block → bind them as review-pr does. **Provenance: pre-existing.** `origin/develop:skills/review-code/SKILL.md:156,160` reads the same three unbound, and this task's scope is the anchor guard, so it is routed to `recommendations.future`.
- [low/medium] `skills/review-code/SKILL.md:169`: the guard passes on a file with no findings array (→ TASK-195-QA1-2)
- [low/medium] `shared/resources/tests/finding-anchors.test.mjs:752`: platform-variance; the `--index` bad-root case assumes `os.tmpdir()` is outside any work tree. Reproduced: with `TMPDIR` set to a directory inside this checkout, the case fails (28 pass / 1 fail); with `TMPDIR=/tmp`, 43/43 pass. Routed to future work.
- [low/medium] `evals/shared/tests/finding-anchors-blocks.test.mjs:171`: the population test asserts only the four named skills. Measured today: no other executed document runs the checker (`git grep 'command node \S*finding-anchors'` outside `references/` hits only historical task docs). Routed to future work.

**Cleanups (0)**

mutation-proven: review-pr checker block's no-reason HALT arm replaced with "continue ok" → `finding-anchors-blocks.test.mjs` "review-pr: a checker that cannot load HALTs…" → covered

---

## Regression Testing

`npm run ci:fast` (Step 3, same code tree; only the implementation report was committed since): 5959 tests, 0 failures. Targeted re-run this cycle: `finding-anchors.test.mjs` + `finding-anchors-blocks.test.mjs` 43/43 (`TMPDIR=/tmp`). PASS.

---

## Test Artifacts

### Test Commands Executed
```bash
npm run -s validate -- skills/{review-pr,review-code,qa-task,qa-story,develop-bug}/
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <SKILL.md> --diff-base <merge-base> --copy-as skills:.agents/skills --json
command node .agents/skills/qa-task/references/security-probe.mjs --sink filename --entry 'fence:skills/review-code/SKILL.md#Step 2b — Check every anchor (always)' --slot '{target: worktree | staged | range}' --cases-file docs/tasks/task.195.finding-anchors-follow-ups/task.195.qa.1.review-code-target-cases.json --repo-root . --record docs/tasks/task.195.finding-anchors-follow-ups/task.195.qa.1.security.run.json --json
TMPDIR=/tmp command node --test shared/resources/tests/finding-anchors.test.mjs evals/shared/tests/finding-anchors-blocks.test.mjs
```

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-195-QA1-1: decide the lens from the wrapper; a code finding with no `file_line` reads `unparseable`.
2. TASK-195-QA1-2: the `--inline` guard requires the findings array.

### Short-term Actions (Non-Blocking)
1. CR-2: bind the review-code Step 4 inputs (pre-existing).
2. CR-4: `GIT_CEILING_DIRECTORIES` in the `--index` bad-root case.
3. CR-5: enumerate the documents that run the checker.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Two reproduced in-scope defects, one MEDIUM and one LOW. No HIGH.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-195-QA1-1 and TASK-195-QA1-2 fixed.

---

**Next Steps**: `/qa-fix` for TASK-195-QA1-1 and -2, then the QA re-review (cycle 2, refute pass).
