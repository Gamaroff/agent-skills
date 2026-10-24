# QA Report: Task 227 - Step 8 checklist block mixes rm with must-pass checks; host refuses the whole block

**Task**: [Link to task document](./task.227.step-8-checklist-no-rm.md)
**Gate File**: [task.227.gate.2.step-8-checklist-no-rm.yml](./task.227.gate.2.step-8-checklist-no-rm.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-24
**Testing Completed**: 2026-10-24
**Gate Status**: CONCERNS

---

## Executive Summary

QA cycle 2 re-reviewed the whole branch diff (`origin/develop...8d21d218`, 29 files) as a refute pass. Both cycle-1 findings are fixed, both fixes are mutation-proven in a clean worktree, and the guard's matcher now probes as `engages`. The refute pass found four LOW items, all reproduced. Two are reliability gaps on the hand-run `--complete` path, which a pipeline run does not reach. With those two, reliability is CONCERNS.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-227-QA1-1: the no-rm guard misses keyword, prefix-command and path forms | medium | ✅ FIXED | `lineRunsNoRm` refuses all of them (control test, 19 hit forms). Mutation m1 (old regex back) and m2 (no quote removal) both turn the control test red. Probe: `engages`, 17/17 scored as their direction requires |
| TASK-227-QA1-2: `--complete` drops the hold-dir record while files are held | medium | ✅ FIXED | Scenario 15 has full, empty and missing cases in both arms (82/82). Mutation m5 (keep branch off) turns both "keeps a live hold-dir record" cases red. m6 (record never removed) turns the empty, missing and five-record cases red |
| CR-3 (cycle 1, cleanup): pin the guard floor to Step 8 | low | ✅ FIXED, `absorbed` | The guard now asserts that it read Step 8's own `--complete` block. Step 8 is the only doc with such a block, so the older `seen >= 1` floor fires first (m4) |

Bug reports 1 and 2 are closed by this cycle (Step 9b).

---

## New Findings This Cycle

- **[low]** `shared/resources/advance-pipeline-lock.sh:183` — QA2-1: when `--complete` keeps `step4-hold-dir.txt`, it still deletes `step4-held-paths.txt`, the list of those same files (CR-2). → Keep `step4-held-paths.txt` along with the hold-dir record.
- **[low]** `shared/resources/advance-pipeline-lock.sh:186` — QA2-2: a hold directory that cannot be listed reads as empty, so its record is deleted (CR-3). → Keep the record unless `ls -A` succeeds and prints nothing.
- **[low]** `shared/resources/tests/lib/rm-invocation.mjs:19` — QA2-3: `rm>/dev/null a` and `rm<<EOF` are accepted, because the lookahead omits `<` and `>` (CR-4). → Add both characters to the lookahead class.
- **[low]** `docs/tasks/task.227.step-8-checklist-no-rm/task.227.step-8-checklist-no-rm.md:183` — QA2-4: §3, §4 and criteria 1–2 still say `step4-hold-dir.txt` is always removed. → Amend those four lines.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#746, OPEN, head `8d21d218`)

### Testing Approach

- [x] Automated Testing (lock suite, checklist suite, `npm run ci:fast`)
- [x] Regression Testing
- [x] Security Review (probe executed)
- [x] Code Review (refute pass)

### Review Methodology

Direct tools, as for a re-review. The one subagent was the Step 3b diff reviewer.

Re-review scope: unscoped — cycle 2 refute pass over the whole branch diff (`origin/develop...HEAD`, 29 files, 2385 patch lines). SAFETY_REPROBE=false (clause 1 false; the prior security CONCERNS came from an unprobed matcher, not a safety failure).

Diff reviewer: one read-only Explore subagent, prompt from `code-review-prompt.md` plus the REFUTE PASS directive. Dispatched 07:52:15Z; completion notice `duration_ms` 237318 (about 4 min). All four anchors are `ok` (`finding-anchors.js`, `--rev HEAD`).

Mutation proofs ran in a detached worktree at `8d21d218` with no `.agents/skills` symlink, after confirming both suites were green there. The working tree was untouched: `git status --porcelain` is unchanged apart from this cycle's QA artifacts.

Step 4b: one changed block (`develop-pipeline-step-8-commit.md:178`) was skipped as `mutating`. Its helper path `.agents/skills/{develop-story|…}` is a template, not a literal path. Finding `changed-blocks-not-executed` is the same as cycle 1. The block is executed by the committed `executed against fixtures` suite in `step-8-completion-checklist.test.mjs` with the template bound, under bash for the Task, Story and Bug variants. zsh is not installed on this host.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Tests first | PASS | Verified | Scenario 15, the records test and the guard are in place; cycle 1 added the control test and hold-dir cases |
| Phase 2: Move the removals | CONCERNS | Verified | The removals are in `--complete` in both arms; QA2-1 and QA2-2 are on the cycle-1 keep branch |
| Phase 3: Docs and bundle | PASS | Verified | Header, `usage()`, Step 8 comments and CHANGELOG are updated; `bundle:check` reports 0 problems |

**Overall Phase Completion**: 3/3 delivered, 1 with low findings

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| `--complete` with a lock removes the five records and the lock | PASS (with QA2-4) | `[bash] --complete (lock arm) removes the five records and leaves no lock` (fixture record is empty, so the hold-dir exception does not apply); wording is stale (QA2-4) |
| No-lock `--complete` removes the same records, exits 0 | PASS (with QA2-4) | `--complete (no-lock arm)` case |
| An unrelated file survives | PASS | `keeps an unrelated file and the halt snapshot`, both arms |
| The checklist block has no `rm`, and the guard fails if one is added | PASS (residual QA2-3) | Guard test; m3 (`if true; then rm -f …` added to the block) turns it red |
| `npm run ci` passes | PASS (local) | `ci:fast` 6289/0 plus `validate:all`, `bundle:check`, `check:generated`, `lint:shell` all exit 0. `eval:all` and `lint:secrets` were not re-run this cycle. CI on the final head is gated at `/finalise` |
| `bundle:check` clean, no `UNREACHED` | PASS | `128 skill(s) checked, 0 problems` |
| Report records both Phase 2 mutations | PASS | Implementation report, Step 3 Decisions Log |
| CHANGELOG names the change | PASS | Unreleased entry, now including the exception |
| Usage text lists the five records | PASS | `usage()` plus the exception line |

---

## Breaking Changes Validation

### Breaking Change: `--complete` removes five records beside the lock

Documented: Yes (§5, now with the hold-dir exception)
Migration Path Provided: Yes (none needed; the only caller's end state is unchanged)
Migration Tested: Yes (both arms, scenario 15)
Consumer Code Updated: N/A
Notes: Diff review CR-1 (not promoted) observes that a hand-run no-lock `--complete` during a pause also clears records a later `--restore` would want. That is the documented meaning of "the run is finished". It is routed to `recommendations.future`.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (4)

- **QA2-1** (reliability): held-paths is deleted while the hold-dir record is kept. Reproduced: no lock, hold directory holding `held.txt`, both records present → after `--complete`, hold-dir kept, held-paths gone.
- **QA2-2** (reliability): an unlistable hold directory reads as empty. Reproduced with `chmod 000` on a hold directory holding a file → record gone.
- **QA2-3** (security/guard): `rm>`/`rm<` forms are accepted. Reproduced with `lineRunsNoRm`. Plausibility: 0 occurrences of the shape across about 41 `rm` call sites in the shipped docs. The reviewer rated it `cleanup/low`; QA records it as a guard residual at `low`.
- **QA2-4** (docs): §3:71, §4:85 and criteria :183 and :184 are stale.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 4

---

## NFR Assessment

### Performance — PASS
`lineRunsNoRm` is quadratic on a long run of separators: 1.2 ms at 1k, 16.7 ms at 4k, 264 ms at 16k characters. The longest line in the scanned docs is 1017 characters, so this has no practical impact.

### Reliability — CONCERNS
QA2-1 and QA2-2. Both are on the hand-run `--complete` path. Step 8's own check HALTs on a non-empty hold directory before it reaches `--complete`.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 17 (`totals.executed` from `task.227.qa.2.security.run.json`; escaped 0)
- `boundary: true`: `lineRunsNoRm` is a deny predicate over agent-edited step docs, and its verdict backs the guard assertion. Probed with `security-probe.mjs --sink shell-exec --entry shared/resources/tests/lib/rm-invocation.mjs#lineRunsNoRm` and rm-specific cases. The verdict was `engages`: 13 hostile cases refused (keyword, prefix-command, path, backtick, quote-split, escape and quoted-`#` forms) and 4 legitimate cases accepted. The generic shell-exec corpus probes command-name allow-lists and does not fit this control. The `--complete` removal itself decides nothing beyond the hold-dir test: it uses literal names in `dirname(LOCK)` and no glob.

### Maintainability — PASS
The matcher has its own module, and its header names what it does not see (`find -delete`, `unlink`, `$RM`). QA2-4 is doc drift in the work item.

---

## Code Review

Refute pass, `code_review_blocking=true` (pipeline override; no frontmatter flag). No finding is `bug` + `high` confidence, so none was promoted automatically. QA raised CR-2, CR-3 and CR-4 itself after reproducing them.

**Correctness bugs (3):**
- [medium/medium] `shared/resources/advance-pipeline-lock.sh:181`: CR-1. A no-lock `--complete` during a pause or HALT clears the records a later `--restore` reads. Not promoted. Provenance: Step 8, the only shipped caller, removed the same records in the same states on base. The hand-run case is documented in §5. Routed to `recommendations.future`.
- [low/medium] `shared/resources/advance-pipeline-lock.sh:183`: CR-2. Held-paths is deleted while the hold-dir record is kept. Raised as QA2-1.
- [low/medium] `shared/resources/advance-pipeline-lock.sh:186`: CR-3. An unlistable directory reads as empty. Raised as QA2-2.

**Cleanups (1):**
- `shared/resources/tests/lib/rm-invocation.mjs:19`: CR-4. The lookahead omits `<` and `>`, and `\S*\/` backtracks. Raised as QA2-3 (guard residual) and noted under Performance.

**Mutation proofs** (worktree at `8d21d218`, baseline green before each):

mutation-proven: old `RM_WORD` regex restored → `lineRunsNoRm refuses every way a line runs rm and nothing else` → covered
mutation-proven: quote/escape removal dropped from `lineRunsNoRm` → `lineRunsNoRm refuses every way a line runs rm and nothing else` → covered
mutation-proven: `if true; then rm -f .claude/state/x; fi` added to the Step 8 `--complete` block → `no fenced block that calls --complete carries an rm invocation` → covered
mutation-proven: Step 8 stops calling `--complete` → the guard fails on `seen >= 1`, not on the new Step 8 floor → absorbed
mutation-proven: hold-dir keep branch disabled → `[bash] --complete ({lock,no-lock} arm) keeps a live hold-dir record` → covered
mutation-proven: hold-dir record never removed → `removes the five records` and `removes a {empty,missing} hold-dir record` → covered

Five of six are `covered`; one is `absorbed`.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `advance-pipeline-lock.test.sh` (all scenarios) | PASS 82/82 |
| `step-8-completion-checklist.test.mjs` incl. executed-against-fixtures | PASS 62/62 |
| Full `npm test` via `ci:fast` | PASS 6289/0 |

---

## Test Artifacts

### Files Reviewed
`shared/resources/advance-pipeline-lock.sh`, `shared/resources/advance-pipeline-lock.test.sh`, `shared/resources/develop-pipeline-step-8-commit.md`, `shared/resources/tests/lib/rm-invocation.mjs`, `shared/resources/tests/step-8-completion-checklist.test.mjs`, `CHANGELOG.md`, the task document.

### Test Commands Executed
```bash
npm run ci:fast                       # via quality-gate.sh, symlink moved aside: 6289 tests, 0 failed
npm run validate:all; npm run bundle:check; npm run check:generated; npm run lint:shell   # all exit 0
bash shared/resources/advance-pipeline-lock.test.sh                                      # 82/82
node --test shared/resources/tests/step-8-completion-checklist.test.mjs                  # 62/62
node .agents/skills/qa-task/references/security-probe.mjs --sink shell-exec \
  --entry shared/resources/tests/lib/rm-invocation.mjs#lineRunsNoRm --cases-file <rm cases> \
  --record docs/tasks/task.227.step-8-checklist-no-rm/task.227.qa.2.security.run.json      # engages, 17
node .agents/skills/qa-task/references/qa-execute-snippets.mjs \
  --file shared/resources/develop-pipeline-step-8-commit.md --diff-base <merge-base> --copy-as skills:.agents/skills
```

### Coverage Report
Not measured (shell and `node:test` suites, no coverage instrumentation).

---

## Recommendations

### Immediate Actions (Blocking)
1. QA2-1 and QA2-2: keep held-paths with a kept hold-dir record, and treat an unlistable hold dir as non-empty. Add both cases to scenario 15.

### Short-term Actions (Non-Blocking)
1. QA2-3: add `<` and `>` to the lookahead.
2. QA2-4: amend §3, §4 and criteria 1–2.
3. CR-1: consider a halt-snapshot check in the no-lock arm (follow-up).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No HIGH or MEDIUM findings. Reliability is CONCERNS on two reproduced LOW gaps in the hand-run `--complete` path.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions** (if conditional): QA2-1 and QA2-2 fixed, or waived with a reason.

---

**QA Report**: co-located at `task.227.qa.2.step-8-checklist-no-rm.md`
**Gate File**: co-located at `task.227.gate.2.step-8-checklist-no-rm.yml`
**Next Steps**: The develop-task loop routes the gate (classifier), then either `/qa-fix` cycle 2 or 5c.
