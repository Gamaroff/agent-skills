# QA Report: Task 195 - finding-anchors follow-ups

**Task**: [task.195.finding-anchors-follow-ups.md](./task.195.finding-anchors-follow-ups.md)
**Gate File**: [task.195.gate.3.finding-anchors-follow-ups.yml](./task.195.gate.3.finding-anchors-follow-ups.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-19
**Testing Completed**: 2026-10-19
**Gate Status**: CONCERNS

---

## Re-Review Context

This cycle re-enters QA at 5a after `/finalise` halted on DoD gaps ([dod.1](./task.195.dod.1.finding-anchors-follow-ups.md)). The fix commit is `4d6f7f25`. The previous gate is [gate 2](./task.195.gate.2.finding-anchors-follow-ups.yml): PASS 100 at head `bdd4b66e`.

| Finding | Severity | Status | Evidence |
| --- | --- | --- | --- |
| DoD 1 security: mixed lens shape (`code_review.findings` not an array beside annotated conformance findings) passes the review-pr guard | medium | ✅ FIXED | The guard requires an array for every lens present, and `findingsOf` returns `null` (`usage`) on the same shape. Guard test and engine test cases are committed. The probe case `code-findings-string-beside-annotated-conformance` is refused. Mutations go red. |
| DoD 1 security: `anchor_check: null` passes both guards | low | ✅ FIXED | Both guards require `(.anchor_check \| type) == "string"`. The HALT cases are in both guard tests. |
| DoD 1 security: `mktemp` before the guard leaks a scratch file on every refusal (13 escapes) | — | ✅ FIXED | The `mktemp` now runs after the guard, and the schema-failure exit removes the file. A whole-block test asserts an empty `$TMPDIR` after a refusal and after a post. The probe shows 0 escapes. A mutation goes red. |
| DoD 1 CI: reading 1 PENDING | — | open (not QA's) | PR CI is still queued. `/finalise` takes a fresh reading. |

No co-located bug reports exist, so Step 9b has nothing to close.

---

## Executive Summary

All three finalise security gaps are fixed. The probe that reproduced them now runs 43 cases and reproduces 0, with 0 escapes. The safety re-probe found one in-scope medium: a code finding whose `file_line` is not a string reads as a clean anchor. SC-1 makes "not `path:line` reads unparseable" this task's job, so that finding enters the gate.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#695)

### Review Methodology

The review used direct tools plus one read-only Explore reviewer for Step 3b. The reviewer was dispatched at 16:56:33 UTC and its completion notice gives `duration_ms` 190051.

Re-review scope: unscoped (safety re-probe). Clause 1 of the gate 2 trigger is false. `SAFETY_REPROBE=true` was set by judgement because `/finalise`'s DoD 1 failed on the security axis of a boundary this branch delivers, and a narrowed scope would have read only the fix. The diff is the full `origin/develop...HEAD` (39 files, 6865 patch lines). `REFUTE_PASS=false` (cycle 3).

Step 4b (changed blocks):

| File | Changed blocks | Executed | Classified as |
| --- | --- | --- | --- |
| skills/review-pr/SKILL.md | 2 | 0 | mutating |
| skills/review-code/SKILL.md | 2 | 0 | mutating |

Both files report `changed-blocks-not-executed`. review-pr also reports `zero-blocks-executed`: 1 placeholder and 15 mutating, as in QA 2. These are recorded, not suppressed. The blocks write files (`mktemp`, `--annotate`), so the engine refuses them by design. They run in the committed whole-block and guard tests and in the fence probe below. Shell: bash only; zsh is absent on the host.

---

## New Findings This Cycle

- **[medium]** `shared/resources/finding-anchors.js:115`: `anchorOf` wraps `file_line` in `String()`, so `["shared/resources/finding-anchors.js:90"]` is annotated `unchecked-text` and the run reads `ok`. Reproduced at HEAD (`reason: ok`, `anchor_check: "unchecked-text"`). **Provenance:** the base engine also reads `ok`, but SC-1 puts the class in scope, so the task is unfinished. → TASK-195-QA3-1.
- **[low]** `skills/review-pr/SKILL.md:976`: a reviewer-supplied `anchor_check: "ok"` passes both guards un-annotated. Advisory, routed to future.
- **[low]** `shared/resources/finding-anchors.js:134`: a non-object conformance finding reads `no-line` / `ok`, but `--annotate` skips it, so the guard HALTs with a misleading message. Advisory, routed to future.
- **[low/low]** `skills/review-pr/SKILL.md:986`: the inline selector splits on the first colon, while the checker's grammar takes the last. Advisory, routed to future.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: engine (unparseable, root-in-rev, --index) | CONCERNS | Verified | 32 engine tests. TASK-195-QA3-1 is an unparseable shape the engine still accepts. |
| Phase 2: dispatchers decide on `reason` | PASS | Verified | Block tests unchanged and green. |
| Phase 3: consumer sweep (rescoped) | PASS | Verified | Callers test unchanged and green. |

**Overall Phase Completion**: 3/3 (1 with a finding)

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| All tests passing | 0 fail | fast gate 5963 tests, 0 failed @ `4d6f7f25` | PASS |
| SC-1 unparseable code anchor | exit 1, `unparseable` | absent, bare path and range: yes. Non-string `file_line`: no (TASK-195-QA3-1) | CONCERNS |
| SC-5 `--inline` refuses un-annotated / non-findings | HALT | guard tests plus fence probe 20/20, 0 escapes | PASS |
| Standards-named validation | 0 errors | `quick_validate.py` on review-pr, review-code, qa-task and qa-story: all valid | PASS |
| SC-10 mutation proofs | covered | 3 of 3 this cycle (below) | PASS |

---

## Breaking Changes Validation

None documented. The `--findings-file` usage message now reads "no findings array for every lens present". The probe case that pinned the old text was updated (see Security). **Overall:** PASS.

---

## Issues Found

**Total Issues**: HIGH 0, MEDIUM 1 (TASK-195-QA3-1), LOW 0 (gate). The three advisory findings are listed above.

---

## NFR Assessment

### Performance — PASS

`findingsOf` adds one filter over at most two lenses.

### Reliability — CONCERNS

TASK-195-QA3-1 is a silent pass: an unverified location is rendered as verified.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 43, copied from `task.195.qa.3.security.run.json` `totals.executed`
- `boundary: true`. Two controls:
  - review-pr `--inline` guard, using DoD 1's `cases.2` (20 cases): `engages`, 0 reproduced, 0 escapes. DoD 1 had 2 reproduced and 13 escapes.
  - review-code Step 2b checker block (23 cases): `engages`, 0 reproduced. The first run with DoD 1's `cases.1` reproduced `no-findings-array`, but only on the text: the case pins the old usage message word for word, while the block still HALTs on `usage` with the new wording. The cases were copied to `task.195.qa.3.step2b-checker-cases.json` with the message updated, and that run is the recorded one. A mis-paired first run (review-code `--inline` cases against the Step 2b block) was discarded, and the record was rebuilt from scratch.
- The review-code `--inline` guard is still out of fence reach (the second block under its heading). Its committed test runs the extracted block.

### Maintainability — PASS

The every-lens rule is worded the same in the engine and both guards.

---

## Code Review

**Correctness bugs (4):**

- [medium/high] `shared/resources/finding-anchors.js:115`: a non-string `file_line` is stringified and verified → treat it as `unparseable`. **Promoted: TASK-195-QA3-1.**
- [low/medium] `skills/review-pr/SKILL.md:976`: a reviewer-supplied string `anchor_check` passes the guards → add a checker-only annotation marker.
- [low/medium] `shared/resources/finding-anchors.js:134`: a non-object conformance finding is `no-line` but not annotated → flag non-object findings.
- [low/low] `skills/review-pr/SKILL.md:986`: the selector's colon split disagrees with the checker → use `capture()` with the checker's grammar.

**Cleanups (0).**

Anchor check: the reviewer's 4 anchors were read against `--rev HEAD`, and each `line_text` matches its line.

mutation-proven: review-pr guard without the every-lens `all(…)` clause → `--inline refuses a findings file with an un-annotated finding, …` (review-pr) → covered
mutation-proven: review-pr `mktemp` moved back before the guard → `--inline leaves no scratch file behind, whether it refuses the input or posts it` → covered
mutation-proven: `findingsOf` `every` → `some` → `every lens present must hold a findings array; a lens that did not run may be absent or null` → covered

These are 3 of 3 for the fix commit. They ran in a detached scratch worktree, after the reviewer had returned, restored from `cp` snapshots. `git status` was clean and the worktree was removed.

Platform variance: `TMPDIR=<scratch>/tmpalt command node --test` over the engine, blocks, review-code and review-pr suites gave 209 pass, 0 fail. `TMPDIR=/tmp` over review-pr gave 163 pass, 0 fail.

---

## Regression Testing

`npm run ci:fast` on `4d6f7f25` ran 5963 tests with 0 failures.

---

## Test Artifacts

### Test Commands Executed

```bash
npm run ci:fast                                                   # 5963 tests, 0 fail
python3 skills/create-skill/scripts/quick_validate.py skills/{review-pr,review-code,qa-task,qa-story}   # all valid
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/{review-pr,review-code}/SKILL.md --diff-base <merge-base> --copy-as skills:.agents/skills --json
node .agents/skills/qa-task/references/security-probe.mjs --entry 'fence:skills/review-pr/SKILL.md#`--inline` — findings beside the lines they are about' --slot '{findings-json}' --cases-file task.195.dod.1.security.cases.2.json --sink filename --record task.195.qa.3.security.run.json --json
node .agents/skills/qa-task/references/security-probe.mjs --entry 'fence:skills/review-code/SKILL.md#Step 2b — Check every anchor (always)' --slot '{target: worktree | staged | range}' --cases-file task.195.qa.3.step2b-checker-cases.json --sink filename --record task.195.qa.3.security.run.json --json
TMPDIR=<scratch>/tmpalt node --test <4 affected suites>           # 209/0
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: The DoD gaps are closed and proven. One in-scope medium remains in the engine's anchor parsing.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-195-QA3-1 fixed.
**Next Steps**: 5b `/qa-fix` for TASK-195-QA3-1. Then cycle 4, then 5c.
