# QA Report: Task 124 - Resume trusts what it finds on disk (cycle 3)

**Task**: [Link to task document](./task.124.pipeline-resume-lifecycle-hygiene.md)
**Gate File**: [task.124.gate.3.pipeline-resume-lifecycle-hygiene.yml](./task.124.gate.3.pipeline-resume-lifecycle-hygiene.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-19
**Testing Completed**: 2026-09-19
**Gate Status**: CONCERNS
**PR**: #436 — https://github.com/Gamaroff/agent-skills/pull/436 (head `0cea64a6`)

---

## Executive Summary

Cycle 2's four findings are verified fixed — one by mutation (the `waiting_on` drop), one by reproduction (a staged rename now splits into `D` + `A` and lands in class (c)), two by reading the exact sentences that changed. The narrowed cycle-3 review (16 files changed since gate 2) found **no HIGH**: two MEDIUM defects — the Phase 0b restore now runs before the grant's refusal, so a declined re-entry leaves a lock behind; and the probe classifies an uncommitted deletion of a branch-added file as overlay and re-creates it (reproduced) — plus three LOW prose contradictions the two fix cycles left behind and one platform note. Gate **CONCERNS**; the loop continues to 5b.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review` after `/qa-fix` cycle 2)
- [x] All implementation phases completed
- [x] Tests passing (`npm run ci:fast` on `0cea64a6` — 3511 pass, 0 fail)
- [x] Breaking changes documented — and the re-invocation migration path now exists (cycle-2 CR-2)
- [x] Code on feature branch with open PR (#436)

### Testing Approach

- [x] Automated Testing (fast gate; lock helper 67/67 bash + zsh)
- [x] Regression Testing
- [x] Security Review (unchanged decision)
- [x] Code Review (Step 3b — cycle 3, **narrowed** to files changed since gate 2)
- [x] Reproduction / mutation of each cycle-2 fix

### Review Methodology

Re-review, cycle 3 → narrowed scope (`git log --since=2026-09-19T14:15:01Z --name-only`, bundled copies and QA artifacts excluded → 16 files, 2 279 diff lines), one read-only Explore subagent, told which items were deferred. `code_review_blocking=true` → `CR_BLOCKING=true`; the two low/high-confidence prose findings entered `top_issues[]` by that rule and the two medium/medium-confidence defects entered it by QA's own judgement (both reproduced/verified — see below). Wait marked/cleared on the lock.

```
Re-review scope: since 2026-09-19T14:15:01Z (default; security axis OK reasoned → SAFETY_REPROBE=false)
```

---

## Re-Review Context

| Cycle-2 issue | Status | Evidence this cycle |
| --- | --- | --- |
| CR-1 stale-snapshot rule fires on `accepted` | **FIXED** | detector Step 1 item 2 keys on MERGED; the accepted-but-unmerged paragraph and table row are present; resume contract + CHANGELOG + fixture 16 agree |
| CR-2 re-invocation never restores | **FIXED** | `--restore {doc-directory}` stated in step-0 §0b, the resume contract's new Phase 0a section, the pause doc and the three orchestrators (3 canonical call sites) — **but see cycle-3 CR-1 for its ordering against the grant** |
| CR-3 stale `waiting_on` through restore | **FIXED** | mutation: remove `.waiting_on` from the del() → `[bash]`/`[zsh] --restore: waiting_on dropped` red; restored → 67/67 |
| CR-4 renames / quoted paths | **FIXED** | reproduction: `git mv a b` → porcelain `--no-renames` yields `D  a` / `A  b`; `A  b` fails the diff test → OVERLAY=false → class (c) |
| CR-5..CR-8 (taken) | FIXED | HALT-rule lint no longer aborts the halt; grant sibling bundled into all eight copies (verified on disk); pre-check dropped; test flag |

---

## New Findings This Cycle

- **[medium]** `shared/resources/develop-pipeline-resume-contract.md:55` — the Phase 0b `--restore` (cycle-2 CR-2) runs at the Resume choice, before the grant's never-lower guard; on a `loop-limit|not-converging` snapshot a declined or refused grant leaves a restored lock and a consumed snapshot, contradicting re-entry step 4 and the task.123 refusal-leaves-nothing-behind rule → branch on `halt_reason` before restoring; the grant restores. **CR-1 (bug 9).**
- **[medium]** `shared/resources/develop-pipeline-resume-contract.md:109` — `git diff --quiet $BASE_REF -- $p` is 0 for a path absent on both sides, so an uncommitted deletion of a branch-added file is classed (a) and re-created. **Reproduced** (`diff --quiet` rc 0; `cat-file -e` rc 128). → `cat-file -e` precondition on the tracked arm. **CR-2 (bug 10).**
- **[low]** task doc §3 Target Architecture still specifies the reversed rule ("accepted or merged"). CR-3.
- **[low]** resume-contract table row (a) and task doc §6 still say the re-read is "over those paths". CR-4.
- **[low]** platform-variance: the MERGED check is `gh pr view`; a Bitbucket `pr_url` makes the rule silently inert (repro: a bitbucket.org pr_url → `gh` fails → candidate kept). CR-5.
- cleanup: the task's Performance criterion text predates the shipped probe's cost. CR-6.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: snapshot and tree on resume | CONCERNS | fixtures 13–16 green | CR-1 (restore/grant order), CR-2 (deleted branch-added file), CR-4/CR-5 prose + platform |
| Phase 2: waiting_on + HALT rm | PASS | 19/19, 32/32 | no new findings |
| Phase 3: report-lint.js | PASS | 12/12 | no new findings |
| Phase 4: lock restore | PASS | 67/67 (bash + zsh) | cycle-2 CR-3 fixed; grant sibling bundled |

**Overall Phase Completion**: 4/4 implemented; 1 CONCERNS, 3 PASS

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Dirty tree classified; overlay never reaches `git add` | yes | mostly | CONCERNS | a deleted branch-added file is misclassified (CR-2) |
| Healthy resume with no step-3 summary not blocked | yes | yes | PASS | |
| No `last-halt.json` survives a completed run | yes | yes (MERGED-keyed) | PASS | GitHub only (CR-5, low) |
| Stop hook does not re-prompt a marked wait | yes | yes | PASS | restore drops a stale wait |
| HALT removes the lock in bash and zsh | yes | yes | PASS | |
| Invalid report cannot be committed | yes | yes | PASS | HALT-rule lint no longer strands the lock |
| Continuation restores the lock; advancing with no lock is an error | yes | yes, both paths | CONCERNS | ordering against the grant (CR-1) |

Performance PASS · Code Quality PASS (three stale sentences, CR-3/4/6, are documentation residue) · Migration deferred to finalise.

---

## Breaking Changes Validation

`advance-pipeline-lock.sh <n>` with no lock → exit 1: migration path now stated on both resume paths. **PASS** (CR-1's ordering is a refinement of that path, not a gap in it).

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (2)

**Issue: restore before the grant defeats a refused re-entry** — [task.124.bug.9.restore-before-grant-defeats-refusal.md](./task.124.bug.9.restore-before-grant-defeats-refusal.md). P2.

**Issue: probe re-creates a deleted branch-added file** — [task.124.bug.10.probe-recreates-deleted-branch-added-file.md](./task.124.bug.10.probe-recreates-deleted-branch-added-file.md). P2. Reproduced.

### LOW Severity Issues (3 + 1 cleanup)

- CR-3 task doc §3 (reversed rule); CR-4 table row (a) + task doc §6 ("over those paths"); CR-5 MERGED check is `gh`-only; CR-6 Performance criterion cost text.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 3 (+1 cleanup)

---

## NFR Assessment

### Performance — PASS
One extra `git cat-file -e` per tracked entry once CR-2 lands.

### Reliability — CONCERNS
CR-2 undoes a deliberate uncommitted deletion (reproduced); CR-1 leaves a lock after a refused re-entry. Both recoverable, neither corrupts committed state, neither HIGH.

### Security — PASS

- **Status**: PASS · **Evidence**: reasoned · **Probes executed**: 0
- Unchanged decision; the restore now dropping `waiting_on` closes the one liveness valve cycle 2 found.

### Maintainability — PASS
The mechanisms are single-definition and tested; the residue is three sentences.

---

## Code Review

Cycle 3, narrowed — `code_review_blocking=true`.

**Correctness bugs (5):**
- [medium/medium] `develop-pipeline-resume-contract.md:55` — restore precedes the grant's refusal → grant-first ordering. CR-1 (bug 9) — in `top_issues` by QA judgement (verified against step 4's text).
- [medium/medium] `develop-pipeline-resume-contract.md:109` — deleted branch-added file classed overlay → `cat-file -e` precondition. CR-2 (bug 10) — **reproduced**, in `top_issues`.
- [low/high] task doc §3 — stale "accepted or merged" line → rewrite. CR-3 (promoted by rule).
- [low/high] `develop-pipeline-resume-contract.md:83` + task doc §6 — "over those paths" → full re-read. CR-4 (promoted by rule).
- [low/medium] `pipeline-resume-detector-prompt.md:85` — platform-variance: `gh`-only MERGED check → GitHub-only statement or host branch. CR-5.

**Cleanups (1):**
- task doc §9 Performance criterion — cost text predates the shipped probe (CR-6).

**Provenance:** all in this branch's changes. **Boundary rule:** unchanged (`boundary: true`, `probes_executed: 0`, `reasoned`).

**Cycle-2 fix verification (executed):**
- mutation-proven: `--restore` `del(… .waiting_on)` → `… .pause_reason)` → `[bash]`/`[zsh] --restore: waiting_on dropped` → covered
- reproduction: `git mv a b` → `D  a` / `A  b` under `--no-renames` → class (c)
- reproduction: ` D n` (branch-added, deleted) → `git diff --quiet` rc 0 (the CR-2 defect)

---

## Regression Testing

| Area | Result | Evidence |
| --- | --- | --- |
| Fast gate on `0cea64a6` | PASS | 3511 pass, 0 fail |
| Lock helper / grant / writer / hooks | PASS | 67 / 41 / 19 / 32 / 18 |
| develop-task replay evals | PASS | 16/16 |
| Bundle freshness | PASS | 0 problems; grant's sibling in all eight copies |

---

## Test Artifacts

### Test Commands Executed
```bash
npm run ci:fast                                                  # rc 0
bash shared/resources/advance-pipeline-lock.test.sh              # 67/67 (+ mutation on the waiting_on drop)
git mv a b; git status --porcelain --no-renames                  # rename reproduction
git diff --quiet origin/develop -- n; echo $?                    # deletion-of-branch-added-file reproduction → 0
```

---

## Recommendations

### Immediate Actions (Blocking for a PASS)
1. CR-1 grant-first ordering + step 4 rewrite (P2). 2. CR-2 `cat-file -e` on the tracked arm + fixture (P2). 3. CR-3/4/6 stale sentences. 4. CR-5 GitHub-only statement.

### Short-term Actions (Non-Blocking)
Carried: cycle-1 CR-5, CR-7.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No high-severity finding (rule 1 does not fire); medium entries in `top_issues` (rule 2) and reliability CONCERNS (rule 4). The two mediums are the last two shapes of the same question the task asks — *does the resume act on evidence it checked?* — and both are one-line fixes with a stated test.
**Quality Score**: 80/100 (100 − 10 for the medium findings − 10 for reliability CONCERNS)

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 and CR-2 fixed.

---

**QA Report**: co-located at `task.124.qa.3.pipeline-resume-lifecycle-hygiene.md`
**Gate File**: co-located at `task.124.gate.3.pipeline-resume-lifecycle-hygiene.yml`
**Next Steps**: `/qa-fix` on gate 3, then cycle 4 (narrowed).
