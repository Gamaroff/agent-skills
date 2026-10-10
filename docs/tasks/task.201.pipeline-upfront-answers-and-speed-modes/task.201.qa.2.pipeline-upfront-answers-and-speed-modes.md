# QA Report: Task 201 - Pipeline up-front answers and speed modes (cycle 2)

**Task**: [task.201.pipeline-upfront-answers-and-speed-modes.md](./task.201.pipeline-upfront-answers-and-speed-modes.md)
**Gate File**: [task.201.gate.2.pipeline-upfront-answers-and-speed-modes.yml](./task.201.gate.2.pipeline-upfront-answers-and-speed-modes.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-10
**Gate Status**: CONCERNS

---

## Re-Review Context

| Gate 1 finding | Status | Evidence |
| --- | --- | --- |
| QA-1 §0d block reads unbound PIPELINE_MODE / EPIC_BRANCH | FIXED | placeholders; docs test 2c — mutation-proven: reverting `--detector` to `"$PIPELINE_MODE"` → 2c red → `covered` |
| QA-2 resume re-resolves mode and skips | FIXED | 11c–11f — mutation-proven: disabling the persisted-mode branch → 11c, 11f red → `covered` |
| QA-3 branch flag values unvalidated | FIXED | `isRefName`, 11a/11b; probe 35 executed, `engages` — `task.201.qa.2.security.run.json` |
| CR-4 stamp writer/reader spellings | FIXED (partly — see CR-4 below) | 4a–4c — mutation-proven: disabling the shared matcher → 1b, 4a, 4c red → `covered` |

Re-review scope: whole branch, refute pass (cycle 2).

---

## New Findings This Cycle

From the refute pass (one Explore subagent, 234 s by its `duration_ms`; it ran node probes for each
claim). Promoted (bug + high confidence): CR-1, CR-2, CR-4, CR-5, CR-6. Advisory: CR-3, CR-7, CR-8, CR-9.

- **[medium/high]** `shared/resources/pipeline-answers.js:583` — on resume the waiver is rebuilt from the resuming invoker; empty user.name → `approved_by: null`, and Step 1's merge overwrites the lock's approver → keep the lock's waiver.
- **[medium/high]** `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:714` — raw arguments pasted inside a double-quoted `--args "…"` → pass them through a single-quoted heredoc on stdin.
- **[medium/medium]** `shared/resources/pipeline-answers.js:525` — a recommendation (incl. an epic's `integration_branch`) is recorded under `--defaults` without `isRefName` → ref-check it and ask on failure.
- **[low/high]** `shared/resources/record-reviewed-blob.js:61` — frontmatter strip narrower than the reader's `splitFrontmatter` → reuse it.
- **[low/high]** `shared/resources/record-reviewed-blob.js:72` — deleting a stamp line that opens `<!--` exposes commented lines → verify the prose view of the other lines is unchanged.
- **[low/high]** `shared/resources/pipeline-answers.js:391` — duplicate-tolerant skip comparison → compare sets both ways.
- **[low/medium]** `shared/resources/pipeline-answers.js:388` — persisted skips not re-checked against the current allow-list.
- **[low/medium]** `shared/resources/pipeline-answers.js:304` — any `--detector` other than `lite` silently means standard.
- **cleanup** `shared/resources/tests/pipeline-answers-docs.test.mjs:167` — test 2c's site list is hand-written and ignores order.

All nine anchors: `anchor_check: ok`.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| 1 | PASS | unchanged since gate 1 |
| 2 | CONCERNS | CR-1, CR-2, CR-6 |
| 3 | CONCERNS | CR-4, CR-5 (low) |
| 4 | PASS | isRefName probed |
| 5 | PASS | — |

## NFR Assessment

- **Security — CONCERNS** — Evidence: measured; Probes executed: 35 (isRefName, `engages`). CR-2 is a shell-interpolation gap in prose; CR-3 advisory.
- **Reliability — CONCERNS** — CR-1, CR-4, CR-5.
- **Performance — PASS**. **Maintainability — PASS**.

## Code Review

**Correctness bugs (8):** CR-1 … CR-8 above. **Cleanups (1):** CR-9.

mutation-proven: §0d `--detector` placeholder → `"$PIPELINE_MODE"` → `pipeline-answers-docs.test.mjs` 2c → covered
mutation-proven: persisted-mode branch disabled → `pipeline-answers.test.mjs` 11c, 11f → covered
mutation-proven: shared stamp matcher disabled in the writer → `record-reviewed-blob.test.mjs` 1b, 4a, 4c → covered

## Regression Testing

`npm run ci:fast` at the reviewed head (`e5db996f`): 5274 pass, 0 fail.

## Final Assessment

**Gate Status**: CONCERNS — no HIGH; two promoted MEDIUMs.
**Quality Score**: 70/100
**Next Steps**: `/qa-fix` cycle 2, then QA cycle 3 (scoped to files changed since gate 2).
