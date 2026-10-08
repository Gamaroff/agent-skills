# QA Report: Task 173 - Fold the 5c review and its doc-only fixes into the acceptance commit (cycle 6)

**Task**: [Link to task document](./task.173.fold-5c-review-into-acceptance-commit.md)
**Gate File**: [task.173.gate.6.fold-5c-review-into-acceptance-commit.yml](./task.173.gate.6.fold-5c-review-into-acceptance-commit.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-08
**Gate Status**: CONCERNS

---

## Executive Summary

This is the first cycle of the granted re-entry (budget 7). The cycle-5 fix holds: a dirty listed
path now HALTs in both arms, and a stale list is replaced only when every path it names is clean.
The new HALT text for the stale arm offers `git checkout HEAD -- $q` as a remedy. The block cannot
prove that the dirt is a 5c edit, so that remedy can discard other work.

**Overall Assessment**: CONCERNS · **Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Status |
| --- | --- |
| CR5-1 stale arm replaces the list unchecked | FIXED — mutation-proved (`covered`, bash + zsh) |

---

## Review Methodology

Re-review scope: files changed since gate 5 (head 4cfd1d4ffc82; 8 files) — default. The fix delta is
`6eb59e6c`: the classify guard and its test. One Explore reviewer; duration 122.9 s (completion
notice `duration_ms`). `SAFETY_REPROBE` clause 1 is false; clauses 2–3 do not hold. Direct tools
otherwise (re-review).

Step 4b ran `qa-execute-snippets.mjs` over `shared/resources/develop-pipeline-step-5-6-qa-loop.md`
under bash and zsh: 1 runnable, 1 placeholder, 22 mutating, 0 findings. The mutating blocks are
`git`/`gh` blocks and are refused by design. The classify block is executed by the committed suite
`acceptance-commit-carries-5c.test.mjs` (38/38, both shells).

---

## New Findings This Cycle

- **[medium]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1460` — the stale-arm HALT
  calls any dirty listed path "an uncarried 5c edit" and offers `git checkout HEAD -- $q`. The list
  records the paths the classifier cleared, not the paths 5c edited, so the dirt can be other work.
  This contradicts the section's own rule at line 1521: the block never discards work it cannot prove
  is its own. → Reword the HALT as "dirty since a 5c pass cleared it; inspect before acting". Drop
  the bare checkout remedy. Align the line 1448 comment and the test. (CR6-1, adopted from the
  reviewer's medium/medium; severity kept.)
- **[low, advisory]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1456` — when
  `git diff` fails (exit 128, for example on a blank list line), the failure reaches the dirty HALT
  and is misattributed. It fails safe, by halting. The writer never emits a blank line, so this goes
  to `recommendations.future` (CR6-2, low/low).

Both anchors resolve to the quoted text at `HEAD` (`finding-anchors.js`, `ok`). Provenance: both
findings are in lines `6eb59e6c` added. Neither is pre-existing. No separate bug file was written,
which matches cycles 2–5; the gate entry is the record.

---

## Code Review

**Correctness bugs (2):**
- [medium/medium] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1460` — HALT remedy can discard unattributable work → reword, drop the bare checkout. Promoted to `top_issues` as CR6-1 by QA adoption (not auto-promoted: confidence medium).
- [low/low] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1456` — `git diff` failure is read as dirty → three-way exit branch. Advisory.

**Cleanups (0).**

`boundary: false`: the change is a guard over a list this pipeline writes, and there is no new
untrusted-input surface. This is unchanged from QA report 1.

mutation-proven: stale arm skips the dirty check (`|| continue` before the header test) → `5c classify: a stale list is replaced only when its paths are clean; a dirty one HALTs` red under bash and zsh → covered

---

## Test Artifacts

```bash
command node --test shared/resources/tests/acceptance-commit-carries-5c.test.mjs   # 38/38
npm run ci:fast                                                                      # 5,549 pass / 0 fail / 1 skipped
npm run validate -- skills/develop-task/ && npm run validate -- skills/develop-story/  # ✓ ✓
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file shared/resources/develop-pipeline-step-5-6-qa-loop.md --json
```

---

## NFR Assessment

Security PASS (reasoned, probes 0, `boundary: false`). Performance PASS. Reliability CONCERNS
(CR6-1). Maintainability PASS.

---

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100 · **Next Steps**: `/qa-fix` cycle 6. It is a
wording fix to one HALT line, plus its comment and the test regex. Cycle 7 then gates it.
