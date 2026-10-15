# QA Report: Task 205 - PRD-scoped epic numbering (cycle 4)

**Task**: [task.205.prd-scoped-epic-numbering.md](./task.205.prd-scoped-epic-numbering.md)
**Gate File**: [task.205.gate.4.prd-scoped-epic-numbering.yml](./task.205.gate.4.prd-scoped-epic-numbering.yml)
**QA Engineer**: QA Engineer (qa-task, develop-task pipeline cycle 4)
**Review Date**: 2026-10-15
**Gate Status**: FAIL

---

## Executive Summary

Cycle 3's fixes hold; bugs 8–9 are closed. The scoped review found that the blocks made
self-binding in cycles 2–3 now call their helpers from two working directories: `doc-id.js` from the
repository root, `tracker-issue.js` and `gh-labels.sh` relative to the skill. That gates as two HIGH
findings with one root. A batch guard that passes on a missing input gates at MEDIUM. The suite is
green.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| CR-1 / [BUG-8](./task.205.bug.8.create-epic-preflight-reads-another-blocks-inputs.md) preflight cross-block read | ✅ FIXED | `{epic file}`; test asserts no variable read. Closed. |
| CR-2 / [BUG-9](./task.205.bug.9.ensure-epic-create-blocks-read-step-e1-values.md) ensure-epic blocks read Step E1 values | ✅ FIXED | `epic-meta` in each block; test with empty env values. Closed. The blocks' path roots are new BUG-10. |
| CR-3, CR-4, CR-5, CR-6 (advisory) | ✅ FIXED | batch floor, `/tmp` fixture (green under `TMPDIR=/var/tmp`), rename path, docblock. |

---

## Review Methodology

Re-review scope: files changed since gate 3 (head 67d5dd326c98; 18 files) — default. `SAFETY_REPROBE=false`.
One Explore reviewer, 125 s (completion notice `duration_ms` 124830). Tests: head `134e9630` is the
tree the cycle-3 fast gate ran green on — 5689 tests, 5675 pass, 0 fail.

**Convergence reading.** HIGH per gate: `1, 1, 0, 2`. The check needs a HIGH at all of the last three
readings, so `0` at cycle 3 means it does not trip this cycle. Two facts bear on that, and both are
stated here. Gate 3's `0` rests on the re-rating recorded in the cycle-3 report. Without it, the
sequence is `1, 1, 1, 2`, and the check would have escalated at cycle 3. The HIGHs also share a
theme: each cycle's fix made more blocks self-binding, and the next review found a binding defect
in a block the fix did not reach. This cycle's fix has to close that population. Only one budgeted
cycle remains after it.

---

## New Findings This Cycle

- **[high]** `skills/ensure-epic-github-issue/SKILL.md:95` — milestone and create blocks mix the repository-root and skill-relative helper paths ([BUG-10](./task.205.bug.10.blocks-mix-repo-root-and-skill-relative-paths.md)).
- **[high]** `skills/sync-github-epic/SKILL.md:250` — the edit block mixes them too; nothing enumerates such blocks (BUG-10).
- **[medium]** `skills/create-epics-from-shards/SKILL.md:388` — the guard validates `"$E0$COUNT"` joined ([BUG-11](./task.205.bug.11.shards-batch-guard-joins-its-two-inputs.md)).
- **Pre-existing, not gated** (`recommendations.future`): the issue-body blocks read `DOC_URL`, `EPIC_RELATIVE_PATH`, `PRD_LINE`, `EPIC_STATUS`, `NEW_BODY`, `priority` bound in prose or other blocks. Measured identical on `origin/develop` (`ensure-epic-github-issue/SKILL.md:114–120`, `sync-github-epic/SKILL.md:162,169`). This task did not introduce them and does not scope them.
- Cleanup: a second `prd_number` parser in create-epic; `P` parsed with `cut` in the shards block.

All six anchors checked: `ok`.

---

## NFR Assessment

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 10
- Re-probed `review-epic` Input Resolution: `engages`, 10/10. Record: [task.205.qa.4.security.run.json](./task.205.qa.4.security.run.json).

### Performance — PASS
### Reliability — CONCERNS
### Maintainability — CONCERNS

---

## Final Assessment

**Gate Status**: FAIL
**Quality Score**: 50/100
**Next Steps**: `/qa-fix` cycle 4. Use one path root for every block this task touched, enforced by a test that fails on a mixed block, and validate the two batch inputs separately. Cycle 5 is the last budgeted cycle.
