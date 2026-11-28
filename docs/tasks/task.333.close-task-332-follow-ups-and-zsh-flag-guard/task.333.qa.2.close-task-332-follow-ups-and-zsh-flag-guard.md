# QA Report: Task 333 - Close task 332's follow-ups and guard the zsh flag trap

**Task**: [Link to task document](./task.333.close-task-332-follow-ups-and-zsh-flag-guard.md)
**Gate File**: [task.333.gate.2.close-task-332-follow-ups-and-zsh-flag-guard.yml](./task.333.gate.2.close-task-332-follow-ups-and-zsh-flag-guard.yml)
**Previous Report**: [task.333.qa.1.close-task-332-follow-ups-and-zsh-flag-guard.md](./task.333.qa.1.close-task-332-follow-ups-and-zsh-flag-guard.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-28
**Testing Completed**: 2026-11-28
**Gate Status**: PASS

---

## Executive Summary

QA cycle 2 is a refute pass over the whole branch diff after qa-fix cycle 1 (`b30e42f94`). Both cycle 1 findings are fixed. QA reverted each fix and saw the predicted test fail, in both directions of the population rule. The refute review found two unbound reads in `review-story`, which are identical on `origin/develop`, and two advisory cleanups. No finding is open.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous finding | Severity | Status | Evidence |
| --- | --- | --- | --- |
| T333-QA-1: guard drops hand-authored `references/*.md` | medium | ✅ FIXED | Population now taken by the `AUTO-GENERATED` marker. 76 hand-authored references files are scanned, 0 new hits. Test E holds both directions; QA M9 and M10 made it fail. |
| T333-QA-2: key misses whitespace after `:+` | low | ✅ FIXED | `FLAG_KEY` takes `\s*`. Test D carries two spaced shapes; QA M8 made D fail. A new zsh premise case shows the spaced form gives 1 argument under zsh and 2 under bash. |

## New Findings This Cycle

- **[medium, pre-existing]** `skills/review-story/SKILL.md:2399` and `:2486`: both Jira blocks read `$PIN_BRANCH` and `$STORY_FILE_PATH` and bind neither (CR-1, CR-2). Routed to `recommendations.future`; see Code Review for the provenance measurement.
- **[low, cleanup]** `shared/resources/tests/zsh-flag-expansion-guard.test.mjs:42`: key calibration gaps (CR-3), reproduced by QA. Advisory.
- **[low, cleanup]** `skills/finalise/SKILL.md:1092`: `AC_YAML_VERIFIED=false` is printed without its reason (CR-4). Advisory.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed (4/4)
- [x] Tests passing
- [x] Breaking changes documented (Step 3a scope-file rename, with resume path)
- [x] Code on feature branch with open PR (#966)

### Review Methodology

Direct tools, re-review. **Step 3b runs as a full refute pass because this is cycle 2**, whatever the Adaptive Review Strategy says.

Re-review scope: unscoped — cycle 2 refute pass (whole `origin/develop...HEAD` diff, 13 files outside the task directory, 712 patch lines).

Diff review: code review (the change set includes `.js` and `.mjs` files). One Explore subagent with the verbatim `code-review-prompt.md` plus the REFUTE PASS directive. It was dispatched at 08:28Z and returned at 08:30Z, `duration_ms` 128377. All 4 anchors were checked `ok` with `finding-anchors.js` at `b30e42f94`.

`SAFETY_REPROBE=false`: gate 1's security axis was PASS, and clauses 2 and 3 do not hold.

CI on b30e42f940fd: pending

Step 4b: run over the three changed in-scope files.
- `skills/finalise/SKILL.md`: 3 changed blocks, all `mutating`.
- `skills/review-story/SKILL.md`: 2 changed blocks, all `mutating`.
- `finalise-dod-ac-prompt.md`: 0 changed blocks.

The engine reports `zero-blocks-executed` / `changed-blocks-not-executed`, as in cycle 1. These blocks write state files by design, so no slot or bind makes them runnable here. `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs` executes the Step 3a and 3c blocks under bash and zsh. The review-story blocks call a Jira sync and are not executed. Advisory, unchanged from gate 1.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: zsh guard + review-story fix | PASS | Verified | Guard 7/7; population widened in cycle 1 |
| Phase 2: finalise Step 3a stem key | PASS | Verified | blocks test 22/22 |
| Phase 3: Step 3c disclosure + single parse | PASS | Verified | engine test 81/81 |
| Phase 4: docs + CHANGELOG | PASS | Verified | traps.md and CHANGELOG restate the widened scope |

**Overall Phase Completion**: 4/4 phases passed

---

## Success Criteria Verification

Carried from QA report 1: every criterion was verified there and none has changed since review. `criteria-drift.js` reports `clean` (base `review-commit`). Cycle 1 touched only the guard test, `traps.md`, `CHANGELOG.md` and the task's Change Log, so the evidence for every criterion except the guard's still holds at this head. The guard criterion is re-verified below.

| Criterion | Status | Evidence at this head |
| --- | --- | --- |
| zsh guard fails on the flag form in a canonical source | PASS | M7 (dev): spaced form in a hand-authored references file → test A fails at `:86`. QA M8 → test D fails. |
| Guard is non-vacuous | PASS | Test B (≥700 blocks) and test E (≥50 references files; a named hand-authored file is in) |
| CHANGELOG cites the task | PASS | `changelog-cites.sh task.333` → `(task 333)` |
| Suite green | PASS | `test:remote` (ci:fast on the LAN server): 8990 tests, 8987 pass, 0 fail, 3 skipped |

---

## Breaking Changes Validation

### Breaking Change: Step 3a re-run-at-head files are keyed by work-item stem
Documented: Yes (CHANGELOG `[Unreleased]` Changed; finalise Step 3a prose)
Migration Path Provided: Yes (resume path: re-run Step 3a)
Migration Tested: Yes (blocks test asserts the stem-keyed file and out-dir exist and the old names do not)
Consumer Code Updated: Yes (the Step 3c reader takes the stem-keyed path)

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

The two medium review findings (CR-1, CR-2) are pre-existing and routed to future work. They are not open issues on this branch.

### LOW Severity Issues (0 open)

CR-3 and CR-4 are advisory cleanups, recorded under Code Review.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Performance — PASS
One merge CLI run parses the AC YAML once (parse-count test, `PARSE_COUNT=1`).

### Reliability — PASS
`AC_YAML_VERIFIED` is echoed through an `if`, so `result-unparseable` keeps exit status 0. The Step 3a rename has a stated resume path.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- **Boundary**: internal, unchanged from gate 1. `merge()` only passes the parsed answer through `opts.answer`; the Step 3a STEM guard reads only placeholders the agent substitutes; cycle 1 changed only a read-only test. No corpus sink models these inputs, and the `fence:` form fills one slot where the Step 3a block carries three placeholders.
- **boundary_signals**: `[]` (`probe-boundary-signals.mjs`, rc 0)

### Maintainability — PASS
The guard now scans everything its header and `traps.md` claim. CR-3's calibration gaps have no live site (searched below) and are advisory.

---

## Code Review

Diff review: code review, cycle 2 refute pass. Blocking resolves to `true` (the pipeline passed `code_review_blocking=true`; the task has no frontmatter flag). No finding qualifies for `top_issues[]`: CR-1 and CR-2 are `confidence: medium` and pre-existing, and CR-3 and CR-4 are cleanups.

**Correctness bugs (2):**
- [medium/medium] `skills/review-story/SKILL.md:2399`: the Step 9.6 Jira block reads `$PIN_BRANCH` and `$STORY_FILE_PATH`, and binds neither. → Bind both in the block, or substitute placeholders with a HALT.
- [medium/medium] `skills/review-story/SKILL.md:2486`: the Step 10 Jira block has the same unbound read. → Same.

Provenance (5b): `git show origin/develop:skills/review-story/SKILL.md` reads both variables the same way at `:2398` and `:2483`. The binding block at `:2380`–`:2388` is a separate fenced block on both sides. Identical on base, and the task's scope is the zsh split, not variable binding, so both are `pre-existing`. They are routed to `recommendations.future` with their severity and confidence unchanged. Gate 1 routed the same finding (its CR-2) the same way.

**Cleanups (2):**
- `shared/resources/tests/zsh-flag-expansion-guard.test.mjs:42`: the key flags the correct one-word `${X:+--flag=$X}`. It misses `${X+--flag "$X"}` (no colon) and `${1:+-f "$1"}` (positional). → Calibrate, or name the forms under NOT CAUGHT.
- `skills/finalise/SKILL.md:1092`: `AC_YAML_VERIFIED=false` comes from two routes, and the block prints only the boolean. → Print the reason too.

CR-3 reproduction, in a `mktemp -d` scratch directory:

```
"${X:+--flag=$X}"   FLAG_KEY true    zsh 1 arg, bash 1 arg   (correct form, flagged)
"${X+--flag "$X"}"  FLAG_KEY false   zsh 1 arg, bash 2 args  (defect, missed)
"${1:+-f "$1"}"     FLAG_KEY false   zsh 1 arg, bash 2 args  (defect, missed)
```

Live-site search, over the same population the guard uses (marker-filtered): no canonical source has a colon-less or positional flag-opening alternative, and none has an `=`-joined one. The gap is real and has no site today, and the reviewer filed it as a cleanup, so it stays advisory. It goes to `recommendations.future` so the guard's NOT CAUGHT list can be completed.

**Mutation proofs (QA, this cycle):** each mutation was made in the working tree after the reviewer returned, restored from a `cp` snapshot, checked with `git diff --quiet`, and followed by a 7/7 baseline.

mutation-proven: `FLAG_KEY` without `\s*` → D (must catch `${X:+ --flag "$X"}`) → covered
mutation-proven: population filter `||` → `&&` (every references file dropped) → E ("a hand-authored references/*.md must be scanned") → covered
mutation-proven: path half replaced by `true` (generated copies admitted) → E ("a generated copy must not be scanned") → covered
mutation-void (discarded, not counted): `x && false || y` reduces to the original filter. No test went red, because the population did not change. It was replaced by the `&&` mutation above.

---

## Regression Testing

`test:remote` (ci:fast on the LAN server, CI-parity container) at the committed tree: 8990 tests, 8987 pass, 0 fail, 3 skipped; tmp-leak ratchet ok. The run before it failed one test, `bundle-comment-origin.test.js` §2, on a comment-only `shared/resources/tests/` literal. That was fixed in `b30e42f94` before commit.

---

## Test Artifacts

### Files Reviewed
`shared/resources/tests/zsh-flag-expansion-guard.test.mjs`, `docs/contributing/traps.md`, `CHANGELOG.md`, `skills/review-story/SKILL.md`, `skills/finalise/SKILL.md`. The reviewer read all 13 files in the diff.

### Test Commands Executed
```bash
command node --test shared/resources/tests/zsh-flag-expansion-guard.test.mjs   # 7/7, and under each mutation
command node .agents/skills/qa-task/references/finding-anchors.js --findings-file "$F" --root "$(git rev-parse --show-toplevel)" --rev HEAD --annotate "$F" --json   # ok, 4/4
command node .agents/skills/qa-task/references/probe-boundary-signals.mjs --doc "$T" --json   # []
command node .agents/skills/qa-task/references/criteria-drift.js --doc "$T" --base-from-review develop --json   # clean
bash .agents/skills/qa-task/references/changelog-cites.sh task.333   # (task 333)
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 966   # pending
npm run test:remote   # 8987 pass, 0 fail
```

### Coverage Report
Not applicable (documentation and test-guard change set; no coverage tooling on these suites).

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. Bind `PIN_BRANCH` and `STORY_FILE_PATH` inside both review-story Jira blocks (pre-existing).
2. Complete the zsh guard's calibration: widen the key or name the forms, and exclude `=`-joined flags.
3. Print the disclosure reason beside `AC_YAML_VERIFIED`.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Both cycle 1 findings are fixed, and QA showed each fix fails its test when reverted. The refute pass found nothing new on this branch that qualifies for the gate.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED
**Conditions**: None

---

**QA Report**: co-located at `task.333.qa.2.close-task-332-follow-ups-and-zsh-flag-guard.md`
**Gate File**: co-located at `task.333.gate.2.close-task-332-follow-ups-and-zsh-flag-guard.yml`
**Next Steps**: Step 5c `/review-pr`, then `/finalise`.
