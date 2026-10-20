# QA Report: Task 201 - Pipeline up-front answers and speed modes (cycle 3)

**Task**: [task.201.pipeline-upfront-answers-and-speed-modes.md](./task.201.pipeline-upfront-answers-and-speed-modes.md)
**Gate File**: [task.201.gate.3.pipeline-upfront-answers-and-speed-modes.yml](./task.201.gate.3.pipeline-upfront-answers-and-speed-modes.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-10
**Gate Status**: CONCERNS

---

## Review Methodology

Re-review scope: files changed since gate 2 (head e5db996f2962; 12 files) — default. Generated
`skills/*/references/` copies excluded; the hand-authored `develop-bug-step-0-resolve-bug.md` kept.
One Explore subagent, 130 s by its `duration_ms`. Clause 1 of the safety re-probe: `false`.

## Re-Review Context

| Gate 2 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 resume rebuilds the waiver | FIXED, but see CR-1 below (the Step 1 merge half regressed) | 12a, 12b, 12h — mutation-proven: disabling the no-approver withdrawal → 12b red → `covered` |
| CR-2 raw arguments in a double-quoted string | FIXED | `--args-stdin` via a quoted heredoc; 12c; the substituted §0d block run end to end |
| CR-3 recommendation not ref-checked | FIXED | 12d |
| CR-4 / CR-5 stamp writer | FIXED | 5a, 5b |
| CR-6 skip comparison | FIXED | 12e — mutation-proven: restoring the length/one-way compare → 12e red → `covered` |
| CR-7 persisted skips vs allow-list | FIXED | 12f |
| CR-8 strict --detector | FIXED | 12g |
| CR-9 test 2c population | FIXED | derived population, 8 blocks; order checked |

## New Findings This Cycle

- **[medium/high]** `shared/resources/develop-pipeline-step-1-create-branch.md:187` — `(.waiver // $a[0].waiver)` keeps a waiver the resolver withdrew → write the resolved waiver; test the merge.
- **[low/low]** `shared/resources/record-reviewed-blob.js:64` — the frontmatter key filter matches an indented key the reader does not read → anchor at column 0.
- **cleanup** `shared/resources/tests/pipeline-answers-docs.test.mjs:159` — the heredoc strip also hides the command's `||` continuation line from the scan.

All anchors: `anchor_check: ok`.

## NFR Assessment

- **Security — PASS** — Evidence: measured; Probes executed: 35.
- **Reliability — CONCERNS** — CR-1. **Performance — PASS**. **Maintainability — PASS**.

## Code Review

mutation-proven: no-approver withdrawal disabled → `pipeline-answers.test.mjs` 12b → covered
mutation-proven: set comparison reverted to length + one-way → `pipeline-answers.test.mjs` 12e → covered

## Regression Testing

`npm run ci:fast` at `465e230a`: 5284 pass, 0 fail.

## Final Assessment

**Gate Status**: CONCERNS — one medium.
**Quality Score**: 90/100
**Next Steps**: `/qa-fix` cycle 3, then QA cycle 4.
