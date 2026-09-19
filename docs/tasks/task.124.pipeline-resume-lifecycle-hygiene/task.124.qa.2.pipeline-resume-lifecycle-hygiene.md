# QA Report: Task 124 - Resume trusts what it finds on disk (cycle 2)

**Task**: [Link to task document](./task.124.pipeline-resume-lifecycle-hygiene.md)
**Gate File**: [task.124.gate.2.pipeline-resume-lifecycle-hygiene.yml](./task.124.gate.2.pipeline-resume-lifecycle-hygiene.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-19
**Testing Completed**: 2026-09-19
**Gate Status**: FAIL
**PR**: #436 — https://github.com/Gamaroff/agent-skills/pull/436 (head `467b2307`)

---

## Executive Summary

Cycle 1's four findings are verified fixed — each by an independent reproduction, not by re-reading the fix. The cycle-2 **refute pass** (full branch diff, reviewed to find the false claim) found two new HIGH defects in the mechanisms this task adds rather than in cycle 1's repairs: the stale-snapshot rule keys on `status: accepted`, which `/finalise` writes *before* Step 8, so it destroys a live post-acceptance resume record; and the re-invocation resume path never restores the lock, so with the numeric advance now exit 1 every re-invoked resume fails at its first transition. Two MEDIUM: `--restore` carries a stale `waiting_on` (a combination of two cycle-1-adjacent changes), and the probe's porcelain parsing lets a staged rename or quoted path through as "discarded". Gate **FAIL**.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review` after `/qa-fix`)
- [x] All implementation phases completed
- [x] Tests passing (`npm run ci:fast` on `467b2307` — 3511 pass, 0 fail)
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#436)

### Testing Approach

- [x] Automated Testing (fast gate on the fixed head; GNU coreutils container for the lock helper, grant, writer and hook suites)
- [x] Regression Testing
- [x] Security Review (unchanged boundary decision — see NFR)
- [x] Code Review (Step 3b — **cycle 2 refute pass**, full branch diff)
- [x] Independent reproduction of each cycle-1 finding

### Review Methodology

Re-review, cycle 2 → **full-diff refute pass** (the cycle-2 exception to the narrowing rule): one read-only Explore subagent over the whole `origin/develop...HEAD` diff (5 675 lines, 68 files; bundled copies, fixtures and QA artifacts excluded) with the REFUTE directive, told which cycle-1 findings were deferred (CR-5, CR-7) so it would not re-report them. Direct tools for the Re-Review Context. `code_review_blocking=true` → `CR_BLOCKING=true`. Wait marked/cleared on the lock.

```
Re-review scope: unscoped — cycle 2 refute pass (prior gate FAIL on a code finding, security axis OK reasoned → SAFETY_REPROBE=false)
```

---

## Re-Review Context

| Cycle-1 issue | Status | Evidence this cycle |
| --- | --- | --- |
| CR-1 `--restore` GNU `stat -f` | **FIXED** | `docker run … alpine:3 + coreutils: advance-pipeline-lock.test.sh` → 43 passed, 0 failed (was 39/40); macOS 65/65 incl. the GNU-shaped shim scenario in bash and zsh |
| CR-2 CI-poll budget < poll | **FIXED** | `set-waiting-on.sh … --budget-minutes 26` → `budget_minutes: 26`; finalise passes `$(( ${FINALISE_CI_MAX_WAIT:-1500} / 60 + 1 ))` |
| CR-3 dispatch population hand-listed | **FIXED** | population derived from directories; qa-task 3b, qa-story 1a/3b, develop-bug step-3 marked; unmarking qa-task → test names `skills/qa-task/SKILL.md:411` |
| CR-4 staged overlay survives | **FIXED** | reproduction: staged `M  f` → `git checkout HEAD -- f` leaves porcelain empty and content = HEAD; the bare form leaves `M  f` |
| CR-6, CR-8, CR-9, CR-10 (advisory, taken) | FIXED | unreadable report → blocking issue; losers consumed; header reworded; dead state removed |
| CR-5, CR-7 (deferred) | OPEN (future) | carried in gate 2 `recommendations.future` |

---

## New Findings This Cycle

- **[high]** `shared/resources/pipeline-resume-detector-prompt.md:85` — the stale-snapshot rule fires on `status: accepted`, which `/finalise` writes at Step 7 6a before CI reading 2 and Step 8; a post-acceptance HALT/pause snapshot is deleted and the resume falls to `source: none` → key on PR MERGED only. **Promoted: CR-1 (bug 5).**
- **[high]** `shared/resources/develop-pipeline-resume-contract.md:139` — `--restore` is instructed only for the in-session continuation; the re-invocation Phase 0b Resume path skips Step 1 and never restores the lock, so every re-invoked resume at step ≥ 2 fails at its first advance → add `--restore` to Phase 0b (step-0 §0b, resume contract, three orchestrators). **Promoted: CR-2 (bug 6).**
- **[medium]** `shared/resources/advance-pipeline-lock.sh:197` — `--restore` keeps a snapshot's `waiting_on`; `--clear` in the no-lock window is a no-op; the rebuilt lock carries a stale wait and the Stop hook allows every stop until the budget elapses → `del(.waiting_on)`. CR-3 (bug 7).
- **[medium]** `shared/resources/develop-pipeline-resume-contract.md:87` — `p=${line:3}` mis-parses `R  old -> new` and quoted paths; the bad pathspec is quiet, "discarded" without effect, and the pathspec-filtered re-read is empty → `--no-renames`, quoted → (c), full-porcelain re-read. CR-4 (bug 8).
- **[low]** `skills/develop-task/SKILL.md:285` (+ story, bug) — the HALT-rule lint ends in `exit 1`, aborting the snapshot + lock removal, while the sentence says the HALT proceeds; the PreCompact hook made the opposite (correct) decision → CR-5, future.
- **[low]** `shared/resources/grant-qa-cycles.sh:77` — the `$ADVANCE` sibling dependency is invisible to the bundler; five of eight bundled grant copies (qa-fix, qa-story, qa-task, review-pr, review-task) have no `advance-pipeline-lock.sh` beside them → CR-6, future.
- cleanups: CR-7 grant's snapshot-only pre-check excludes an orphaned claim from serving a grant; CR-8 the `--budget-minutes` refusal loop prints `pass` unconditionally.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: snapshot and tree on resume | FAIL | fixtures 13–16 green, but | **CR-1** (accepted ≠ finished), **CR-2** (no restore on re-invocation), **CR-4** (porcelain parsing) |
| Phase 2: waiting_on + HALT rm | CONCERNS | 19/19 writer, 32/32 hook | cycle-1 fixes hold; **CR-3** stale wait through a restore; CR-5 (low) HALT-rule lint aborts the halt |
| Phase 3: report-lint.js | PASS | 12/12 | dead state removed; CR-7(c1) still future |
| Phase 4: lock restore | CONCERNS | 65/65 macOS, 43/43 GNU | cycle-1 CR-1 fixed; **CR-3**; CR-6/CR-7 (grant's bundled copies; claim cannot serve a grant) |

**Overall Phase Completion**: 4/4 implemented; 1 FAIL, 2 CONCERNS, 1 PASS

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Dirty tree classified; overlay never reaches `git add` | yes | mostly | CONCERNS | unstaged + staged overlays: yes; rename/quoted entry: reported discarded while untouched (CR-4) |
| Healthy resume with no step-3 summary not blocked | yes | yes | PASS | fixture 15 |
| No `last-halt.json` survives a completed run | yes | over-delivered | FAIL | also deletes a live post-acceptance snapshot (CR-1) |
| Stop hook does not re-prompt a marked wait | yes | yes, and also does not re-prompt a stale one after a restore | CONCERNS | CR-3 |
| HALT removes the lock in bash and zsh | yes | yes | PASS | unchanged |
| Invalid report cannot be committed | yes | yes | PASS | unchanged; CR-5 is about what else the HALT-rule gate aborts |
| In-session continuation restores the lock; advancing with no lock is an error | yes | in-session yes; **re-invocation no** | FAIL | CR-2 |

Performance / Code Quality / Migration: unchanged from cycle 1 (PASS / PASS / deferred to finalise).

---

## Breaking Changes Validation

`advance-pipeline-lock.sh <n>` with no lock → exit 1: documented and tested — **but the migration path is incomplete for the re-invocation resume**, which is CR-2. Assessment: **CONCERNS** until CR-2 lands (the documented path exists only for the in-session case).

---

## Issues Found

### HIGH Severity Issues (2)

**Issue: stale-snapshot rule fires on `status: accepted`** — [task.124.bug.5.stale-snapshot-rule-fires-on-accepted.md](./task.124.bug.5.stale-snapshot-rule-fires-on-accepted.md). Key on MERGED only. P1.

**Issue: re-invocation resume never restores the lock** — [task.124.bug.6.reinvocation-resume-never-restores-lock.md](./task.124.bug.6.reinvocation-resume-never-restores-lock.md). `--restore` in Phase 0b. P1.

### MEDIUM Severity Issues (2)

**Issue: `--restore` carries a stale `waiting_on`** — [task.124.bug.7.restore-carries-stale-waiting-on.md](./task.124.bug.7.restore-carries-stale-waiting-on.md). P2.

**Issue: probe mis-parses renames and quoted paths** — [task.124.bug.8.probe-mishandles-renames-and-quoted-paths.md](./task.124.bug.8.probe-mishandles-renames-and-quoted-paths.md). P2.

### LOW Severity Issues (2)

- CR-5 HALT-rule lint aborts the snapshot/lock removal (three orchestrators) — mirror the hook.
- CR-6 grant's sibling dependency invisible to the bundler — declare it; fail with a named message.

**Total Issues**: HIGH: 2, MEDIUM: 2, LOW: 2 (+2 cleanups)

---

## NFR Assessment

### Performance — PASS
Unchanged; the full-porcelain re-read (CR-4 fix) is one more `git status`.

### Reliability — CONCERNS
CR-1 destroys a live resume record, CR-2 blocks every re-invoked resume, CR-3 opens the Stop hook after a restore — all on the recovery path. Cycle-1 items verified fixed by reproduction.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- Unchanged decision: the boundary (`report-lint.js`) has no corpus sink for a Markdown input surface; `--restore` and the writer take local paths and labels through `jq --arg`; CR-3 is a liveness escape valve, not an injection surface.

### Maintainability — PASS
One restore path, one writer, one template definition hold; the derived dispatch population is now the enumeration the hooks doc names. CR-6/7/8 are advisory.

---

## Code Review

Cycle 2 refute pass — `code_review_blocking=true`: `bug` + `confidence: high` → gate.

**Correctness bugs (6):**
- [high/high] `shared/resources/pipeline-resume-detector-prompt.md:85` — stale-snapshot deletion on `status: accepted`, a Step 7 state → MERGED only. **Promoted: CR-1.**
- [high/high] `shared/resources/develop-pipeline-resume-contract.md:139` — no `--restore` on the re-invocation resume path → add to Phase 0b. **Promoted: CR-2.**
- [medium/high] `shared/resources/advance-pipeline-lock.sh:197` — `waiting_on` survives the restore; `--clear` is a no-op without a lock → `del(.waiting_on)`. **CR-3 — medium, not promoted (rule 1 keys on high severity); in `top_issues` as medium.**
- [medium/medium] `shared/resources/develop-pipeline-resume-contract.md:87` — porcelain parsing (renames, quoted paths); pathspec-filtered re-read → `--no-renames`, (c) on quotes, full re-read. CR-4.
- [low/medium] `skills/develop-task/SKILL.md:285` — HALT-rule lint `exit 1` aborts the halt protocol → skip the commit, keep the snapshot + lock removal. CR-5, future.
- [low/medium] `shared/resources/grant-qa-cycles.sh:77` — `$ADVANCE` sibling invisible to the bundler; five bundled copies lack it → `bundle-dependency:` declaration + named failure. CR-6, future.

**Cleanups (2):**
- `shared/resources/grant-qa-cycles.sh:157` — snapshot-only pre-check excludes an orphaned claim → drop it, relay `--restore`'s refusal (CR-7).
- `shared/resources/set-waiting-on.test.sh:101` — refusal loop passes unconditionally → flag (CR-8).

**Provenance:** all six bugs are in code this branch introduced. **Boundary rule:** unchanged (`boundary: true`, no sink → `probes_executed: 0`, `reasoned`).

**Cycle-1 fix verification (Step 3c — executed, not re-read):**
- mutation-proven (cycle 1 fix): pre-fix `stat -f … || stat -c …` order restored → `[bash] --restore: GNU-shaped stat`, `[zsh] …` → covered
- mutation-proven (cycle 1 fix): qa-task mark removed → parity test names `skills/qa-task/SKILL.md:411` → covered
- reproduction: staged overlay under the HEAD form → cleared; under the bare form → survives (the cycle-1 defect)
- reproduction: `--budget-minutes 26` over a configured 25 → 26 stored

---

## Regression Testing

| Area | Result | Evidence |
| --- | --- | --- |
| Fast gate on `467b2307` | PASS | 3511 pass, 0 fail, 1 skip |
| GNU coreutils (container) | PASS | lock helper 43/43, grant 41/41, writer 17/17, Stop hook 32/32 |
| develop-task replay evals | PASS | 16/16 (fixture 13 now 12/12 with the staged entry) |
| Bundle freshness / shellcheck / prettier | PASS | 0 problems / clean / clean |

---

## Test Artifacts

### Test Commands Executed
```bash
npm run ci:fast                                                   # rc 0
docker run --rm -v "$PWD:/mnt" -w /mnt alpine:3 sh -c 'apk add -q bash coreutils jq; bash shared/resources/advance-pipeline-lock.test.sh'   # 43/43
PIPELINE_LOCK=<lock> bash shared/resources/set-waiting-on.sh ci --kind task --budget-minutes 26
git checkout HEAD -- f   # staged-overlay reproduction in a scratch repo
node --test evals/shared/tests/qa-loop-lock-fields-parity.test.mjs
```

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1 — delete on MERGED only (P1).
2. CR-2 — `--restore` in Phase 0b on every resume path (P1).
3. CR-3 — `del(.waiting_on)` in the restore (P2).
4. CR-4 — `--no-renames`, quoted → (c), full-porcelain re-read (P2).

### Short-term Actions (Non-Blocking)
CR-5..CR-8 and the two carried cycle-1 items — gate 2 `recommendations.future`.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: Rule 1 — two high-severity, high-confidence findings. Both are in the new mechanisms and both were found by refuting the change's own claims about resume: "a snapshot that outlives its run" was read as "a snapshot for an accepted document", and "one restore path" was reached from only one of the two resume paths.
**Quality Score**: 70/100 (100 − 20 for the HIGH blocking findings − 10 for reliability CONCERNS)

**Deployment Recommendation**: BLOCKED
**Conditions**: CR-1 and CR-2 fixed; a re-invoked resume restores its lock; a post-acceptance snapshot survives the detector.

---

**QA Report**: co-located at `task.124.qa.2.pipeline-resume-lifecycle-hygiene.md`
**Gate File**: co-located at `task.124.gate.2.pipeline-resume-lifecycle-hygiene.yml`
**Next Steps**: `/qa-fix` on gate 2 (CR-1..CR-4), then cycle 3 (narrowed to files changed since gate 2).
