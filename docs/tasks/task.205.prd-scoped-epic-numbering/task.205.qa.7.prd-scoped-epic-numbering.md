# QA Report: Task 205 - PRD-scoped epic numbering (cycle 7)

**Task**: [task.205.prd-scoped-epic-numbering.md](./task.205.prd-scoped-epic-numbering.md)
**Gate File**: [task.205.gate.7.prd-scoped-epic-numbering.yml](./task.205.gate.7.prd-scoped-epic-numbering.yml)
**QA Engineer**: QA Engineer (qa-task, develop-task pipeline cycle 7 — second granted re-entry)
**Review Date**: 2026-10-15
**Gate Status**: PASS

---

## Executive Summary

Cycle 6's fix holds. The stray fence is gone, so every engine can now see Steps 6–7 of
`create-epics-from-shards`. The probe of the Step 7 guard, run against the committed document,
passes all 8 cases. The test now finds blocks with the same reader as the engines. Bug 14 is
closed. The only new finding is one low cleanup.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| QA6-1 / [BUG-14](./task.205.bug.14.shards-stray-fence-hides-step-7-guard.md) stray fence hides the Step 7 guard | ✅ FIXED | The fence probe against the committed doc passes all 8 cases. Step 4b now sees 4 of 4 blocks (was 1). Mutation-proven both ways (below). Closed. |
| CR-1 (advisory, gate 6): zsh `nomatch` message | not addressed | Advisory. Still in `recommendations.future`. |
| CR-2 (cleanup, gate 6): duplicate P.E message | not addressed | Cleanup. Still in `recommendations.future`. |

---

## Review Methodology

Re-review scope: files changed since gate 6 (head a6897af1f176; 11 files) — default. `SAFETY_REPROBE=false`.
Strategy: direct tools plus one Explore diff reviewer. Dispatched 13:56:37Z; it returned after
112831 ms (`duration_ms` from the completion notice). Two files were reviewable:
`skills/create-epics-from-shards/SKILL.md` and `tests/epic-numbering-retirement.test.js`.
The reviewer checked five things: the template closes once; dedent handles list-indented and empty
blocks; the `before` hook runs ahead of every caller on Node 22; the path-root scan still covers the
same 21 blocks; and no block this test reads was dropped.

Step 4b: `qa-execute-snippets.mjs` on `create-epics-from-shards/SKILL.md` reports
`no-executable-blocks`. All 4 blocks are mutating, and the count is now correct. Shell: bash
(`zsh-unavailable`).

---

## New Findings This Cycle

- Cleanup (CR-1, low/high): `tests/epic-numbering-retirement.test.js:29` requires `node:test` a second time just to get `before`. `test.before` is already available, as `tests/release-ci-verdict.test.js` shows. → use `test.before`.

All anchors checked: `ok` (1 of 1). Nothing was promoted to `top_issues`.

---

## Implementation Verification

All 7 of 7 phases verified. This cycle touched Phase 3 (skill blocks) and the retirement test.

---

## Success Criteria Verification

No change from gate 5. The criteria this fix touches (the Step 7 batch check, executed skill blocks)
are held by the committed test, which now reads blocks with the shared fence reader, and by the
recorded probe.

---

## Breaking Changes Validation

Unchanged: PASS.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1 (cleanup)

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — PASS
The batch presence and id checks hold. The zsh message gap is still advisory, and the check still fails safe there.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 8 (record: [task.205.qa.7.security.run.json](./task.205.qa.7.security.run.json))
- The Step 7 batch guard was run through the fence probe and correctly handled every case. It
  accepted the 2 valid batches. It rejected all 6 bad inputs: a misnamed file, a missing epic, a
  duplicate P.E, an `epic.2.20` prefix collision, a missing second epic in the batch, and `E0=0`.
  Bash only.

### Maintainability — PASS
The fence structure is restored. The test and the engines now use one fence reader.

---

## Code Review

**Correctness bugs (0).**

**Cleanups (1):**
- `tests/epic-numbering-retirement.test.js:29` — a second `require("node:test")` just for `before`. → use `test.before`.

boundary: true — `fence:skills/create-epics-from-shards/SKILL.md#Step 7: Quality Validation`; probes_executed: 8.

mutation-proven: stray fence restored → `create-epics-from-shards blocks: E0 from next epic; Step 7 checks the batch` → covered
mutation-proven: `blockBy` reverted to the nesting-blind regex, with the stray fence restored → none (17/17 green) → the original defect reproduced; the shared reader is what makes the first proof go red

---

## Regression Testing

Full fast gate (`npm run ci:fast`, format check plus `npm test`) is green: 5690 tests, 5676 pass, 0 fail.

---

## Test Artifacts

### Test Commands Executed
```bash
npm run ci:fast
npm run -s validate -- skills/create-epics-from-shards/
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/create-epics-from-shards/SKILL.md --copy-as docs:docs --json
command node .agents/skills/qa-task/references/security-probe.mjs --sink filename --entry 'fence:skills/create-epics-from-shards/SKILL.md#Step 7: Quality Validation' --slot "$(printf '{PRD dir}"\nE0="{E0}"; COUNT="{count}')" --cases-file .claude/state/t205-qa6-cases2.json --name shards-step7-batch-check --record docs/tasks/task.205.prd-scoped-epic-numbering/task.205.qa.7.security.run.json --json
```

The validator passed.

---

## Recommendations

### Short-term Actions (Non-Blocking)
1. CR-1: use `test.before`.
2. Carried: make the Step 7 presence loop glob-free (zsh) and give the duplicate case its own message.
3. Add a repository-wide check that every SKILL.md fence closes where it opens.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: no open finding. Bugs 1–14 are closed, and the boundary is probed against the committed document.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.205.qa.7.prd-scoped-epic-numbering.md`
**Gate File**: co-located at `task.205.gate.7.prd-scoped-epic-numbering.yml`
**Next Steps**: Step 5c `/review-pr`, then `/finalise`.
