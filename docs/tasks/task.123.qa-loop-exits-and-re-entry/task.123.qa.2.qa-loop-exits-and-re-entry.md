# QA Report: Task 123 - The QA loop's guards read only the HIGH count and the lock cannot go backwards

**Task**: [task.123.qa-loop-exits-and-re-entry.md](./task.123.qa-loop-exits-and-re-entry.md)
**Gate File**: [task.123.gate.2.qa-loop-exits-and-re-entry.yml](./task.123.gate.2.qa-loop-exits-and-re-entry.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-19
**Testing Completed**: 2026-09-19
**Gate Status**: FAIL

---

## Executive Summary

Cycle 2 — a **refute pass** over the whole branch diff (three commits, head `b9c32281`), as the skill requires when exactly one prior gate exists. All five of cycle 1's gate entries are FIXED and were verified by re-execution, and the four cycle-1 bugs are Closed. The refute then did what it exists to do: it found that cycle 1's own HIGH fix — the absolute `qa_max_cycles` written to the lock — targets a file that **no resume path recreates**, so on the real re-entry path the grant is never persisted and the budget stays 5. Three further findings are all in cycle 1's fixes (a cross-fence variable, a self-disabling guard, a sub-state row keyed on a value only the half-cycle writes). The engine, hook, writer script and every suite remain green.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`, QA Fix Cycle 1 recorded)
- [x] All implementation phases completed
- [x] Tests passing (`ci:fast` green on `b9c32281`: 3489 node, 7 bash suites)
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#435 → develop, OPEN)

### Testing Approach

- [x] Automated Testing (unit, bash suites, replay evals)
- [x] Regression Testing (full `ci:fast`; every cycle-1 fix re-executed)
- [x] Security Review (reasoned — unchanged)
- [x] Code Review (Step 3b — **refute pass**, whole-branch diff, read-only Explore reviewer)
- [x] Runnable-prose execution (Step 4b)
- [ ] Manual Testing — a live multi-cycle run remains a future consumer test

### Review Methodology

Direct tools + one read-only Explore reviewer running the **REFUTE PASS** directive (`PRIOR_GATES=1`). `SAFETY_REPROBE=false` — the prior gate's security axis reads `OK reasoned`. Diff: `origin/develop...HEAD` excluding bundled `references/` copies, 7572 lines, 137 files. `code_review_blocking=true` from the pipeline.

```
Re-review scope: unscoped (cycle 2 — refute pass over the whole branch diff)
```

**A process note, recorded rather than hidden.** After the reviewer returned, QA drafted the script the HIGH finding calls for (`grant-qa-cycles.sh` + suite) *before* writing this gate — the wrong order under the rule that a QA step never leaves a fix in the working tree. The draft was `git stash`ed before the gate was written; the gate and this report describe `b9c32281` exactly, and the working tree matched it when gate 2 was written. The draft is 5b's starting point, not QA evidence.

Step 4b: runnable prose applies. The step-5-6 doc now has **1 runnable block** (the Loop Setup `QA_MAX_CYCLES` read) — executed clean under bash and zsh; the remaining 18 are `node`/`awk`/`jq`-bearing and refused by the allow-list as before. QA executed the grant write and the Loop Setup read by hand under both shells: default `5`, after a grant of 2 at `QA_CYCLE=6` → `8`, no temp-file leftovers, no-lock read → `5`. `develop-task/SKILL.md:48` fails in the engine's temp dir as in cycle 1 (pre-existing block, unchanged).

---

## Re-Review Context

| Cycle 1 finding | Status | Verification |
| --- | --- | --- |
| CR-1 — budget `5 + k` | **FIXED** (arithmetic) — but see C2-CR-1 | `grep '5 + extra_cycles_granted'` → 0 hits in shared/skills; fixture 12 lock `qa_max_cycles: 8`, report `of 8` ×2; parity test forbids the old form |
| CR-2 — `set_qa_phase` function | **FIXED** | `skills/develop-{task,story}/references/set-qa-phase.sh` present, byte-identical to source bar the header, executable; invoked from a temp cwd → `qa_phase → 5b`; `set_qa_phase` → 0 hits; 19-assertion suite in `npm test` |
| CR-3 — hook step-5 sentence | **FIXED** | hook rendered against 5a/5b/5c locks: 5a/5b say "lock stays at 5", 5c conditions on APPROVE/CONCERNS; 27/27 |
| CR-4 — seven restatements | **FIXED** — but the guard has a defect (C2-CR-3) | `grep 'three routes\|routes 1–3'` → 0 hits outside historical task.116 artifacts; parity mutant (one restored "three") → red |
| CR-5 — fixture 11 gate key | **FIXED** | gate.6 carries no `half-cycle:`; report carries `**Half-cycle**` row; 13/13 both sides |
| CR-6..9, negative count | FIXED | resume contract rows; `id` anchoring reproduced (`X-1`, not `42 is lost"`); CHANGELOG headline; row label; `CYCLES_OUTSIDE_LOOP=-2` rule present |

Bugs 1–4: **Closed**.

---

## New Findings This Cycle

- **[high]** `shared/resources/develop-pipeline-resume-contract.md:191` — the grant is written to a lock no resume recreates; the write fails on the real path → `grant-qa-cycles.sh` restores the lock from the snapshot and writes both fields (**C2-CR-1**)
- **[medium]** `skills/develop-task/SKILL.md:288` (+ story twin, + resume contract) — `$QA_CYCLE` read across fences; no temp-file cleanup on `jq` failure → derive inside the script (**C2-CR-2**)
- **[medium]** `evals/shared/tests/pr-review-loop-parity.test.mjs:394` — `STALE_COUNTS` drops its whole alternation at the next growth; `five` never becomes stale → derive from a number-word list minus the current word (**C2-CR-3**)
- **[medium]** `shared/resources/develop-pipeline-resume-contract.md:131` — escalation sub-state row keyed on a value only the half-cycle writes → the loop-limit escalation writes it on every path (**C2-CR-4**)
- **[low]** `CHANGELOG.md:27` — still says `QA_MAX_CYCLES = 5 + k` (**C2-CR-5**)
- cleanup: `develop-pipeline-on-stop.sh:179` — 5a sentence names `set-qa-phase.sh` with no argument (**C2-CR-6**)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Lock position (option B) | PASS | Verified | writer script, hook sentences, tests — all cycle-1 findings closed; C2-CR-6 is cosmetic |
| Phase 2: Routes 2b and 2c | PASS | Verified | fixture 11 corrected; engine 63 tests; `id` anchoring pinned |
| Phase 3: Re-entry | FAIL | Partial | C2-CR-1/2/4: the grant cannot land and the sub-state table misroutes the common halt |

**Overall Phase Completion**: 2/3 phases passed

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --- | --- | --- |
| PASS + LOW-only → 5c without 5b (2b) | PASS | unchanged |
| Budget spent, HIGH-0 medium-falling → gated half-cycle (2c) | PASS | fixture 11 now asserts the report row |
| `current_step` 5 for the loop; `qa_phase`; no hand `jq` | PASS | script writer; hook sentences per sub-step |
| Re-invocation offers the grant, counts on-disk gates, back-fills | **FAIL** | the grant has no lock to land on (C2-CR-1) |
| Route 2c cost ≤ half a cycle | PASS | |
| Every new route: replay fixture + mutation proof | PASS | 12 mutants recorded across cycles |
| Accepting-route set stated once | CONCERNS | guard self-disables at the next growth (C2-CR-3) |
| Observations close naming the PR | PASS | |

---

## Breaking Changes Validation

None declared; absent-field behaviour re-verified (`qa_max_cycles` absent → 5; `qa_phase` absent → 5a).
**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: The grant write targets a lock that no resume path recreates**
- **Severity**: HIGH · **Category**: Functional (contract) · **Bug Report**: [task.123.bug.5.grant-write-targets-a-lock-no-resume-recreates.md](./task.123.bug.5.grant-write-targets-a-lock-no-resume-recreates.md)
- **Observation**: the only writer of the lock is the end of `/create-branch`; every terminal HALT removes it; no resume procedure restores it (grep of the resume contract, step-1 doc, step-0 doc, pause doc and SKILL.md: the only "recreates" is the parenthetical the write relies on). Fixture 12 pre-seeds the lock.
- **Impact**: Phase 3 is inert on the path it was built for.
- **Recommendation**: `grant-qa-cycles.sh <doc-dir> <k>` — reconstruct, restore from snapshot (drop halt/pause fields), atomic two-field write, tested. · **Priority**: P1

### MEDIUM Severity Issues (3)

- **C2-CR-2** — [bug 6](./task.123.bug.6.grant-block-reads-qa-cycle-from-another-fence.md): `$QA_CYCLE` across fences; empty `--argjson`; stray temp file. Same script. · P1
- **C2-CR-3** — [bug 7](./task.123.bug.7.route-count-check-disables-itself-at-the-next-growth.md): `STALE_COUNTS` self-disables at six (reproduced: 3 kept at five, 2 at six, "three routes" uncaught). · P2
- **C2-CR-4** — [bug 8](./task.123.bug.8.escalation-substate-row-keyed-on-a-value-only-the-half-cycle-writes.md): escalation row unreachable on the ordinary loop-limit path (fixture 12's cycle 5 reads `Running qa-fix (cycle 5 of 5)`). · P2

### LOW Severity Issues (2)

- **C2-CR-5** (in `top_issues[]`, high confidence): CHANGELOG still says `5 + k`.
- **C2-CR-6** (cleanup, advisory): hook 5a sentence's `set-qa-phase.sh` has no argument (verified: the script exits 1 with usage on an empty argument).

**Total Issues**: HIGH: 1, MEDIUM: 3, LOW: 2

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — CONCERNS
The re-entry path does not work end to end (C2-CR-1/2). Engine, hook and writer are pinned (64 node tests, 7 bash suites, 12 mutants across two cycles).

### Security — PASS

- **Status**: PASS · **Evidence**: reasoned · **Probes executed**: 0
- Unchanged from cycle 1; `boundary: false`. `set-qa-phase.sh` validates its one argument and interpolates nothing.

### Maintainability — PASS
One self-disabling guard (C2-CR-3); otherwise fixture-first and pinned.

---

## Code Review

Step 3b — **refute pass**. `reviewed: whole-branch diff (7572 lines, ~95 files) …; ran the 4 shell/node suites, bundle:check, and reproduced the grant block and STALE_COUNTS filter by hand`.

**Correctness bugs (5):**
- [high/high] `shared/resources/develop-pipeline-resume-contract.md:191` — lock not recreated on resume → **gate C2-CR-1**
- [medium/medium] `skills/develop-task/SKILL.md:288` — `$QA_CYCLE` cross-fence; no cleanup → **gate C2-CR-2 (QA-verified)**
- [medium/high] `evals/shared/tests/pr-review-loop-parity.test.mjs:394` — self-disabling filter → **gate C2-CR-3**
- [medium/medium] `shared/resources/develop-pipeline-resume-contract.md:131` — unreachable escalation row → **gate C2-CR-4 (QA-verified)**
- [low/high] `CHANGELOG.md:27` — stale `5 + k` → **gate C2-CR-5**

**Cleanups (1):**
- `shared/resources/develop-pipeline-on-stop.sh:179` — 5a sentence's `set-qa-phase.sh` lacks its argument. (advisory)

`probes_executed: 0`, `boundary: false`.

**Mutation-proof spot check (Step 3c)** — QA re-ran two cycle-1 proofs on the head:
- mutation-proven: one restored "three routes" in the ingester prompt → `the accepting-route set is stated once…` → `covered`
- mutation-proven: loose `id` prefix in `KEY_RE` → `the entry id is read from the key position only…` → `covered`

**Platform variance**: not applicable (no environment-derived value reaches a validating consumer).

---

## Regression Testing

| Area | Result |
| --- | --- |
| `ci:fast` on `b9c32281` (3489 node incl. 1 skipped; 7 bash suites) | PASS |
| `eval:all` (34) — run during 5b cycle 1 on this head | PASS |
| `bundle:check`, `check:generated`, `lint:shell`, `format:check` | PASS |

---

## Test Artifacts

### Files Reviewed
All cycle-1 files plus `shared/resources/set-qa-phase.sh` + test, the reworked `on-stop.sh`, the reworked resume contract §Re-entry and 5c sub-state table, both SKILL.md Phase 0b blocks, `pr-review-loop-parity.test.mjs` STALE_COUNTS, fixtures 11/12, CHANGELOG.

### Test Commands Executed
```bash
npm run ci:fast
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <changed prose> --json
# manual: grant write + Loop Setup read under bash and zsh; hook renders for 5a/5b/5c; set-qa-phase.sh from a temp cwd
node -e '<STALE_COUNTS reproduction at routeCount=six>'
```

### Coverage Report
Not instrumented.

---

## Recommendations

### Immediate Actions (Blocking)
1. C2-CR-1 + C2-CR-2 — `grant-qa-cycles.sh` (P1)
2. C2-CR-3 — derived stale-count list + mutation row (P2)
3. C2-CR-4 — loop-limit escalation writes the Action on every path; fixture 12 report (P2)
4. C2-CR-5 — CHANGELOG + parity pin

### Short-term Actions (Non-Blocking)
1. C2-CR-6 — spell the 5a sentence's invocations.
2. Generalise the lock restore to every resume (not only a granted one) — pre-existing gap C2-CR-1 surfaced; its own task if not done here.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one HIGH in cycle 1's own fix under `code_review_blocking=true`; three MEDIUMs, all fixes of fixes. The refute pass paid for itself.
**Quality Score**: 50/100

**Deployment Recommendation**: BLOCKED
**Conditions**: C2-CR-1 through C2-CR-5 fixed and re-gated.

---

**QA Report**: co-located at `task.123.qa.2.qa-loop-exits-and-re-entry.md`
**Gate File**: co-located at `task.123.gate.2.qa-loop-exits-and-re-entry.yml`
**Next Steps**: `/qa-fix` on gate 2; QA cycle 3 (scoped to files changed since gate 2).
