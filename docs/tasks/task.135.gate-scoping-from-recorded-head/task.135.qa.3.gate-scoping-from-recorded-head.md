# QA Report: Task 135 - Gate scoping from a recorded head, not a typed timestamp — cycle 3 (safety re-probe)

**Task**: [task.135](./task.135.gate-scoping-from-recorded-head.md)
**Gate File**: [task.135.gate.3.gate-scoping-from-recorded-head.yml](./task.135.gate.3.gate-scoping-from-recorded-head.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-30
**Testing Completed**: 2026-09-30
**Gate Status**: FAIL

---

## Executive Summary

Cycle 3 at head `e451c70f`. Cycle 2's four fixes hold, but the reviewer re-searched the whole surface and found the unbound-input class one level up: every block now binds `$LATEST_GATE` from `$TASK_FILE` / `$TASK_DIR`, and nothing checks those inputs, so an unbound one silently becomes `.` — no gate, `SAFETY_REPROBE=false`, and a `:(exclude).` that excludes the whole tree. Two further MEDIUMs: the freshness test's timestamp rule depends on the machine's TZ, and the scope list loses paths git C-quotes.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing (99/99 on the three suites; ci:fast 4675/4676 at e451c70f)
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#531)

### Review Methodology

Cycle 3. `SAFETY_REPROBE=true`: clause 1 did not fire (gate 2 security `CONCERNS reasoned`), clause 3 did — gate 2 is FAIL and the task's Success Criteria contain "never" ("…never `--since`"). The whole branch was reviewed (1700 lines, generated copies and `docs/tasks/*` excluded) by a fresh Explore subagent with the SAFETY RE-PROBE directive, which enumerated the blocks' inputs and probed them read-only under bash and zsh.

```
Re-review scope: unscoped (prior gate FAIL with a "never" success criterion — clause 3)
```

Dogfood: the shipped Phase 0 step 5 and Step 3b blocks were executed on this task. Step 5 (clause 1) → `false` under bash and zsh; Step 3b with `SAFETY_REPROBE` unset → HALT as designed; with `false` the narrowed scope reads `files changed since gate 2 (head 60b4ef6e8cfb; 30 files)`; with `true` → whole branch. The same run exposed a **pre-existing** defect (on `origin/develop` in both skills): `mktemp /tmp/qa-code-review-XXXXXX.diff` is not randomised by BSD `mktemp` and fails after first use, leaving `DIFF_FILE` empty. Provenance: pre-existing — not entered in `top_issues[]`; recurrence appended to observation #181.

---

## Re-Review Context

| Cycle-2 finding | Status | Evidence |
| --- | --- | --- |
| CR2-1 SAFETY_REPROBE unbound in Step 3b | FIXED — reachable by another road → CR3-1 | H1/H2, I; M11/M16 red |
| CR2-2 freshness test vs in-flight rebase | FIXED | mechanism replaced; M15 red |
| CR2-3 Phase 0 step 3 gate unbound | FIXED | F9; M12 red |
| CR2-4 / CR2-5 trigger exclusion, untracked | FIXED | F7/F8; M13/M14 red |

---

## New Findings This Cycle

Searched unscoped (clause 3): full `origin/develop...HEAD` diff, 12 files. Re-enumerated the blocks' inputs — the gate's `head:` line (quotes, comments, CRLF, duplicates, nesting, short/uppercase SHAs), `$LATEST_GATE`/`$TASK_FILE`/`$TASK_DIR` (unset, spaces, leading dash, outside the repo, repo root), `$PRIOR_GATES`, `$SAFETY_REPROBE`, git states (detached, shallow, head == HEAD, merges), and the freshness parser under three TZs.

- **[high]** `skills/qa-task/SKILL.md:278` — unchecked `$TASK_FILE` → `.` → `SAFETY_REPROBE=false` (CR3-1, [bug 9](./task.135.bug.9.unbound-task-file-degrades-to-dot.md))
- **[medium]** `skills/qa-task/SKILL.md:204` — `:(exclude).` excludes the tree; missing task file reads unmoved (CR3-2, [bug 10](./task.135.bug.10.task-dir-dot-excludes-whole-tree.md))
- **[medium]** `skills/qa-task/SKILL.md:436` — Step 3b reads an unchecked `$TASK_DIR` (CR3-3, [bug 11](./task.135.bug.11.step-3b-reads-task-dir-unbound.md))
- **[medium]** `shared/resources/tests/gate-head-freshness.test.mjs:74` — zone-less `updated:` accepted; TZ-dependent (CR3-5, [bug 12](./task.135.bug.12.updated-accepts-zoneless-timestamps.md))
- **[medium]** `shared/resources/qa-re-review-scope.md` block — C-quoted paths drop out of scope (CR3-6, [bug 13](./task.135.bug.13.scope-drops-quoted-paths.md))
- **[medium, advisory]** CR3-4 — the guard checks `SAFETY_REPROBE`'s form, not its truth; clause 1 could be recomputed in the block
- **[low]** CR3-7 — scope reads committed history only; CR3-8 — gate-writing prose overstates the freshness test

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --- | --- | --- |
| Gate carries schema 2, head, clock updated | PASS | gates 1–3 |
| Cycle N+1 file list from head | CONCERNS | CR3-3, CR3-6 |
| Trigger re-reviews after a hidden commit | CONCERNS | CR3-2 |
| Schema-1 → unscoped with reason | PASS | |
| Freshness test green, rewrite-proof | CONCERNS | CR3-5 |
| CHANGELOG | PASS | |

---

## Issues Found

**Total Issues**: HIGH: 1, MEDIUM: 5 (4 promoted), LOW: 2. Bugs 9–13 filed. Bugs 5–8 closed.

---

## NFR Assessment

### Performance — PASS

### Reliability — CONCERNS
CR3-2, CR3-3, CR3-6 silently change what a cycle reviews.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: reasoned
- **Probes executed**: 0
- CR3-1 can still zero the safety carve-out through an unchecked input. `boundary: false` — the blocks decide on local git state and agent-bound paths; the reviewer's input probes were read-only and by hand, not through the probe engine.

### Maintainability — PASS

---

## Code Review

Fresh Explore reviewer, SAFETY RE-PROBE directive. `code_review_blocking=true`: CR3-1, CR3-2, CR3-3, CR3-5, CR3-6 promoted.

**Correctness bugs (8):** CR3-1 [high/high], CR3-2 [medium/high], CR3-3 [medium/high], CR3-4 [medium/medium], CR3-5 [medium/high], CR3-6 [medium/high], CR3-7 [low/medium], CR3-8 [low/high] — as listed above.

Provenance: CR3-1 … CR3-8 are in code this branch introduces. The `mktemp` defect is pre-existing (identical on `origin/develop`).

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: gate rule 1 — a HIGH entry.
**Quality Score**: 40/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.135.qa.3.gate-scoping-from-recorded-head.md`
**Gate File**: co-located at `task.135.gate.3.gate-scoping-from-recorded-head.yml`
**Next Steps**: `/qa-fix` CR3-1, CR3-2, CR3-3, CR3-5, CR3-6. The unbound-input class has now appeared in three cycles — fix it as a class: every block validates its own inputs.
