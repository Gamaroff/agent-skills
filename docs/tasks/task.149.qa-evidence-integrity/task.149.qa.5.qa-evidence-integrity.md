# QA Report: Task 149 - QA evidence integrity (cycle 5)

**Task**: [task.149.qa-evidence-integrity.md](./task.149.qa-evidence-integrity.md)
**Gate File**: [task.149.gate.5.qa-evidence-integrity.yml](./task.149.gate.5.qa-evidence-integrity.yml)
**Previous**: [task.149.qa.4.qa-evidence-integrity.md](./task.149.qa.4.qa-evidence-integrity.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-26
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous finding | Status | Evidence |
| ---------------- | ------ | -------- |
| TASK-149-BUG-6 (MEDIUM) — block input unbound | **FIXED** → Closed | Block is one placeholder call; wiring test substitutes in text; raw block exits 2 |
| TASK-149-BUG-7 (MEDIUM) — staging outside the work item | **FIXED** → Closed | Script stages only regular files under the work item; tests + probe case `untracked-outside` refused |
| CR4-4 (low) — root SRC | **FIXED** | `isWithin` (QA-27); probe case `copy-as.src-is-root` refused |

## New Findings This Cycle

- **[medium]** `shared/resources/qa-read-back.js` — three could-not-look states without exit 2 → TASK-149-BUG-8.
- **[medium]** `shared/resources/qa-read-back.js` — cycle gate not found under the `qa-cycle.sh` grammar, no halt → TASK-149-BUG-9.
- cleanups (advisory): CR-5 double report on a failed stage; CR-6 DEST check still a string prefix.

---

## Review Methodology

Cycle 5, the last budgeted cycle. **Re-review scope: since 2026-09-26T05:55:00Z (default).** Gate 4's
security axis was PASS measured, so no carve-out applied. The scope covered 19 files and a 2488-line
patch. The reviewer was one read-only Explore subagent, dispatched 11:24 and returned 11:26. QA probed
the new `qa-read-back.js` as a boundary in its own right, because its exit 1 blocks the QA comment.

---

## NFR Assessment

### Security — PASS
- **Status**: PASS · **Evidence**: measured · **Probes executed**: 48 (run record `task.149.qa.5.security.run.json` `totals.executed`)
- `--copy-as` containment **engages 24/24**; `change-log --check-updated` **engages 14/14**; `qa-read-back` verdict **engages 10/10**. Nothing written outside; `TMPDIR=/tmp` → 166 pass.

### Reliability — CONCERNS
BUG-8, BUG-9. · **Performance** — PASS · **Maintainability** — PASS

---

## Code Review

`code_review_blocking` = true. CR-1 and CR-2 are bug + high confidence and enter automatically.
QA verified CR-3 (medium) and CR-4 (low) by reading them against `doc-links.js` and grouped them with
CR-1 under one contract, "could not look is exit 2", as BUG-8. CR-5 and CR-6 are cleanups.

- [medium/high] `shared/resources/qa-read-back.js:153` — directory `--doc` staged whole → **BUG-8**
- [medium/high] `shared/resources/qa-read-back.js:135` — gate grammar / no `!gate` branch → **BUG-9**
- [medium/medium] `shared/resources/qa-read-back.js:166` — disk fallback reads as clean → **BUG-8**
- [low/medium] `shared/resources/qa-read-back.js:156` — uncaught throws exit 1 → **BUG-8**
- cleanup `qa-read-back.js:171`, `qa-execute-snippets.mjs:1678` → advisory

**Mutation proofs (tests guarding cycle-4 fixes)**: staging anywhere → 2 tests red; stage failure
ignored → red; `no-log` passes → red; no-report accepted → red; no pass-1 staging → 4 red; old prefix
containment → QA-27 red. All `covered`.

---

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 80/100 · **Deployment**: CONDITIONAL on BUG-8, BUG-9
