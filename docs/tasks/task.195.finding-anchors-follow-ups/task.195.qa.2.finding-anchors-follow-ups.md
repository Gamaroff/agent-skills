# QA Report: Task 195 - finding-anchors follow-ups

**Task**: [task.195.finding-anchors-follow-ups.md](./task.195.finding-anchors-follow-ups.md)
**Gate File**: [task.195.gate.2.finding-anchors-follow-ups.yml](./task.195.gate.2.finding-anchors-follow-ups.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-19
**Testing Completed**: 2026-10-19
**Gate Status**: PASS

---

## Re-Review Context

Previous gate: [gate 1](./task.195.gate.1.finding-anchors-follow-ups.yml), CONCERNS 90, head `b4cbb43e`.

| Finding        | Severity | Status   | Evidence                                                                                                                                                                            |
| -------------- | -------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TASK-195-QA1-1 | medium   | ✅ FIXED | `lensesOf(doc)` gives each wrapped finding its wrapper's lens. A wrapped code finding with no `file_line` reads `unparseable` in a unit test and in a CLI test. Both mutations go red. |
| TASK-195-QA1-2 | low      | ✅ FIXED | Both `--inline` guards require a findings array. `{}`, `{code_review:{}}` and `[]` HALT in the committed tests. Both mutations go red, and the review-pr guard is fence-probed (14 cases).   |

No co-located bug reports exist, so Step 9b has nothing to close.

---

## Executive Summary

This is cycle 2, a full-branch refute pass over `origin/develop...HEAD` (25 files). Both cycle 1 findings are fixed and mutation-proven. The refute reviewer returned three bugs, all medium or low confidence. None is promoted to the gate, and all three are routed to future work.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#695)

### Review Methodology

Direct tools, plus one read-only Explore reviewer for Step 3b, dispatched at 16:10:41 UTC. The completion notice gives its duration as 162127 ms.

Re-review scope: unscoped — cycle 2 refute pass (`REFUTE_PASS=true`), full `origin/develop...HEAD` diff, 25 files, 4272 patch lines. `SAFETY_REPROBE=false` (clause 1 false; the prior gate's security was PASS).

Step 4b: in scope, because four SKILL.md files change fenced bash blocks. The `changed` counts are:

| File        | Changed blocks | Executed | Classified as |
| ----------- | -------------- | -------- | ------------- |
| review-code | 2              | 0        | mutating      |
| review-pr   | 2              | 0        | mutating      |
| qa-task     | 1              | 0        | mutating      |
| qa-story    | 1              | 0        | mutating      |

Each file reports `changed-blocks-not-executed`, and review-pr also reports `zero-blocks-executed`. These are recorded, not suppressed. The blocks write files (`cat >`, `--annotate`), so the engine refuses them by design. They are executed per PR instead: by `finding-anchors-blocks.test.mjs` (the four checker blocks), by the review-code and review-pr guard tests (the `--inline` guards), and by the fence probe below. Shell: bash; zsh is absent on the host.

---

## New Findings This Cycle

- **[medium/medium]** `skills/review-pr/SKILL.md:972`: the `--inline` guard requires one findings array, not one per wrapper present. A file with `code_review.findings: "oops"` and an annotated `pr_conformance` array passes the guard, and the checker reports `ok`. The code findings then vanish, which looks the same as "the code lens found nothing". This is new to this branch (the guard was added here) and was reproduced (`jq -e` rc 0). **Fix:** require an array for every wrapper key present. Not promoted (confidence medium). Routed to future.
- **[low/medium]** `shared/resources/finding-anchors.js:128`: a `null` finding entry throws a TypeError, and the dispatcher `*)` branch then reports "checker not runnable". **Pre-existing:** the same TypeError occurs on `origin/develop`'s engine with the same input. The task names no null-entry handling in scope. Routed to future.
- **[low/medium]** `skills/review-code/SKILL.md:94`: `--staged --fix` checks anchors against the index and then edits the working tree. New to this branch (the `--index` read is new). Routed to future.

---

## Implementation Verification

| Phase                                    | Status | Test Result | Notes                                                                      |
| ---------------------------------------- | ------ | ----------- | -------------------------------------------------------------------------- |
| Phase 1: engine (unparseable, root-in-rev, --index) | PASS   | Verified    | 31 engine tests; the wrapper-decided lens was added in cycle 1               |
| Phase 2: dispatchers decide on `reason`  | PASS   | Verified    | 14 block tests execute the four checker blocks                              |
| Phase 3: consumer sweep (rescoped)       | PASS   | Verified    | callers test, population floor 5                                            |

**Overall Phase Completion**: 3/3

---

## Success Criteria Verification

| Criterion                                    | Target           | Actual                                                                 | Status |
| -------------------------------------------- | ---------------- | ---------------------------------------------------------------------- | ------ |
| All tests passing                            | 0 fail           | fast gate 5961 tests, 0 failed @ `bdd4b66e`                            | PASS   |
| Unparseable code anchor is malformed         | exit 1           | `finding-anchors.test.mjs` unit + CLI; wrapped keyless case added      | PASS   |
| Dispatchers decide on `reason`               | HALT w/o reason  | `finding-anchors-blocks.test.mjs` (4 × missing / malformed / clean)    | PASS   |
| `--inline` refuses un-annotated / non-findings | HALT           | guard tests + fence probe (14 executed, 0 reproduced)                  | PASS   |
| Standards-named validation                   | 0 errors         | `npm run validate` on review-code, review-pr, qa-task, qa-story, develop-bug: all rc 0 | PASS |

---

## Breaking Changes Validation

None documented. `checkAnchors(findings, {readFile})` keeps its old signature: `lenses` is optional and defaults to the key rule. **Overall:** PASS.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0 (gate), LOW: 0 (gate). The three advisory code-review findings are listed under New Findings This Cycle.

---

## NFR Assessment

### Performance — PASS

`lensesOf` makes one pass. No new I/O.

### Reliability — PASS

TASK-195-QA1-1 is closed. CR-1 is a residual silent-drop path. It needs a reviewer output where one lens has a non-array findings value. It is advisory and recorded as future work.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 14, copied from `task.195.qa.2.security.run.json` `totals.executed`
- `boundary: true`. The review-pr `--inline` guard refuses a file that is not annotated findings JSON. It was probed with `fence:skills/review-pr/SKILL.md#`--inline` — findings beside the lines they are about` and `--slot '{findings-json}'`, using the cases in `task.195.qa.2.review-pr-inline-guard-cases.json`:
  - 10 hostile inputs, all refused with the HALT text: `{}`, a wrapper with no array (both lenses), a bare array, `null`, a string, a non-array `findings`, an un-annotated code finding, an un-annotated finding among annotated ones, and an empty array beside an un-annotated lens.
  - 4 legitimate inputs, all accepted by the stubbed poster: annotated code, conformance only, an empty review, and both lenses annotated.
  - 0 reproduced.
  - The probe did not include the mixed shape that CR-1 found. The reviewer found it, not the corpus.
- The review-code `--inline` guard is the second bash block under its heading, which `fence:` cannot reach. Its committed test runs the extracted block with the same hostile shapes. That is a test, not a probe count.

### Maintainability — PASS

The engine defines the lens rule once. The four enumeration sites use the same wording for `unparseable`.

---

## Code Review

**Correctness bugs (3):**

- [medium/medium] `skills/review-pr/SKILL.md:972`: the guard requires one array, not one per wrapper present, so a broken code lens passes silently. **Fix:** require an array for each wrapper key that is present.
- [low/medium] `shared/resources/finding-anchors.js:128`: a null finding crashes the checker, which then reads as "not runnable". Pre-existing. **Fix:** give a non-object finding its own verdict.
- [low/medium] `skills/review-code/SKILL.md:94`: `--staged --fix` checks anchors against the index but edits the worktree. **Fix:** refuse, or re-check when the two differ.

**Cleanups (0).**

Anchor check: `finding-anchors: ok`. All 3 anchors are verified (`--rev HEAD`). No finding is promoted (none is `confidence: high`).

mutation-proven: `run` passes `lenses: null` → `CLI: a wrapped code finding with no file_line exits 1 and is annotated unparseable` → covered
mutation-proven: `anchorOf` ignores its lens (`if (true)`) → `under a wrapper the wrapper decides the lens: …` → covered
mutation-proven: review-code guard without its array check → `--inline refuses a findings file with an un-annotated finding, …` (review-code) → covered
mutation-proven: review-pr guard without its array check → `--inline refuses a findings file with an un-annotated finding, …` (review-pr) → covered

Four of four proofs for the two cycle 1 fixes. Each was restored with `cmp`, and the tree was clean afterwards.

Platform variance: `TMPDIR=<scratch>/tmpalt command node --test` over the engine, blocks, callers, review-code and review-pr suites gave 237 pass, 0 fail (rc 0).

---

## Regression Testing

The fast gate (`npm run ci:fast`) on `bdd4b66e` ran 5961 tests with 0 failures. Every caller of `checkAnchors`/`anchorOf` lives in the engine file and its tests, and both still pass.

---

## Test Artifacts

### Test Commands Executed

```bash
npm run ci:fast                                  # 5961 tests, 0 fail
npm run validate -- skills/{review-code,review-pr,qa-task,qa-story,develop-bug}/   # all rc 0
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <each SKILL.md> --diff-base <merge-base> --copy-as skills:.agents/skills --json
node .agents/skills/qa-task/references/security-probe.mjs --entry 'fence:skills/review-pr/SKILL.md#`--inline` — findings beside the lines they are about' --slot '{findings-json}' --cases-file task.195.qa.2.review-pr-inline-guard-cases.json --sink filename --record task.195.qa.2.security.run.json --json
TMPDIR=<scratch>/tmpalt node --test <5 affected suites>   # 237/0
```

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Both cycle 1 findings are fixed and proven, and no high-confidence bug remains. The boundary is measured with a probe that reproduced 0.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED
**Next Steps**: 5c `/review-pr --effort medium --comment --no-code`. CR-1, CR-2 and CR-3 go to a follow-up task.
