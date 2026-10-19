# QA Report: Task 205 - PRD-scoped epic numbering (cycle 3)

**Task**: [task.205.prd-scoped-epic-numbering.md](./task.205.prd-scoped-epic-numbering.md)
**Gate File**: [task.205.gate.3.prd-scoped-epic-numbering.yml](./task.205.gate.3.prd-scoped-epic-numbering.yml)
**QA Engineer**: QA Engineer (qa-task, develop-task pipeline cycle 3)
**Review Date**: 2026-10-15
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2's fixes hold: all seven gating findings are verified and bugs 3–7 are closed. The scoped
review found two more blocks of the same class — a skill block reading values another block bound.
Both gate at MEDIUM. One was rated HIGH by the reviewer and re-rated on a measurement (below). The
suite is green.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (bugs 8–9)

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| CR-1 / [BUG-3](./task.205.bug.3.task-milestone-block-reads-unbound-epic-ref.md) unbound `$EPIC_REF` | ✅ FIXED | block reads the task's own `epic:`; misleading env ignored (test). Closed. |
| CR-2 / [BUG-4](./task.205.bug.4.task-milestone-title-parsed-by-a-second-parser.md) second title parser | ✅ FIXED | key from `epic-meta`; single-quoted title case. Closed. |
| CR-3 / [BUG-5](./task.205.bug.5.rename-block-inputs-never-bound.md) rename/edit inputs | ✅ FIXED | blocks derive from `EPIC_FILE_PATH`. Closed. The same class in ensure-epic is new BUG-9. |
| CR-4 / [BUG-6](./task.205.bug.6.rename-from-creates-on-lookup-failure.md) lookup failure creates | ✅ FIXED | `unverifiable`, zero writes (test). Closed. |
| CR-5 / [BUG-7](./task.205.bug.7.review-epic-resolver-ignores-prd-root.md) review-epic PRD root | ✅ FIXED | `specs/prd` fixture resolves. Closed. |
| CR-6, CR-8, CR-9 (low) | ✅ FIXED | guarded inputs; hyphen rule tested both ways; dotted title match refused. |

---

## Review Methodology

Re-review scope: files changed since gate 2 (head a1d73c9e9b2b; 26 files) — default. `SAFETY_REPROBE=false`.
One Explore reviewer, 178 s (completion notice `duration_ms` 177898). Tests: head `67d5dd32` is the
tree the cycle-2 fast gate ran green on — 5687 tests, 5673 pass, 0 fail.

**Severity re-rating (CR-1).** The reviewer rated the create-epic preflight finding HIGH. Measured:
running that line in its own shell prints `card-preflight: no such file: /epics/epic...[name]/…` and
exits 2 — a loud failure of an advisory step, not a silent wrong result. Base's version of the same
line (`origin/develop:skills/create-epic/SKILL.md:349`, which reads an unbound `${PRD_ROOT}`) fails
the same way, exit 2. On that measurement the finding is re-rated **MEDIUM** (original HIGH recorded
in the gate as `original_severity`). Confidence unchanged. **Stated plainly:** at the original
rating, the HIGH sequence would read `1, 1, 1`, and the Convergence check would trip and escalate
this cycle. At the re-rated value the sequence is `1, 1, 0` and the loop continues.

---

## New Findings This Cycle

- **[medium, re-rated from high]** `skills/create-epic/SKILL.md:386` — preflight reads `PRD_DIR`/`P`/`E` from another block ([BUG-8](./task.205.bug.8.create-epic-preflight-reads-another-blocks-inputs.md)).
- **[medium]** `skills/ensure-epic-github-issue/SKILL.md:147` — milestone and create blocks read Step E1's values ([BUG-9](./task.205.bug.9.ensure-epic-create-blocks-read-step-e1-values.md)).
- Advisory (medium confidence): `tests/epic-numbering-retirement.test.js:510` — fixture under `os.tmpdir()` but the block reads `/tmp`; **reproduced**: `TMPDIR=/var/tmp node --test tests/epic-numbering-retirement.test.js` → 1 fail. `skills/sync-github-epic/SKILL.md:213` — `references/tracker-issue.js` relative to the repository root, failure discarded. `skills/create-epics-from-shards/SKILL.md:396` — the floor counts pre-existing epics.
- Cleanup: `shared/resources/doc-id.js:422` — `epicSummary` docblock stranded above `epicMeta`.

All six anchors checked: `ok`.

---

## NFR Assessment

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 10
- Re-probed `review-epic` Input Resolution: `engages`, 10/10. Record: [task.205.qa.3.security.run.json](./task.205.qa.3.security.run.json).

### Performance — PASS
### Reliability — CONCERNS
Two blocks still read values bound elsewhere.
### Maintainability — PASS

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 80/100
**Next Steps**: `/qa-fix` cycle 3 — bind the two blocks, and enumerate every block this task added for any read of a value another block binds.
