# QA Report: Task 201 - Pipeline up-front answers and speed modes (cycle 8)

**Task**: [task.201.pipeline-upfront-answers-and-speed-modes.md](./task.201.pipeline-upfront-answers-and-speed-modes.md)
**Gate File**: [task.201.gate.8.pipeline-upfront-answers-and-speed-modes.yml](./task.201.gate.8.pipeline-upfront-answers-and-speed-modes.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-11
**Gate Status**: PASS

---

## Executive Summary

Scoped re-review of the cycle-7 fix (`debadda8`) to docs test 2d. Both gate-7 findings are closed
and mutation-proven. The reviewer raised four low findings; one high-confidence bug was promoted and
then carried to future work by the cosmetic-residue exit (route 2b).

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

## Review Methodology

Re-review scope: files changed since gate 7 (head 2149dba5a64b; 4 files, 1 outside the task
directory) — default. Clause 1 of the safety re-probe: `false`. One Explore subagent, 104 s by its
`duration_ms`. Step 4b: not applicable — no runnable prose in the change set.

## Re-Review Context

| Gate 7 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 test 2d inherits `SKILLS_CONFIG_FILE` | FIXED | 2d passes under `SKILLS_CONFIG_FILE=/nonexistent.yaml`; mutation-proven below |
| CR-2 `argOf` not confined to the resolve span | FIXED | Reads from `commandSpan(…, "resolve")`; mutation-proven below |

## New Findings This Cycle

- **[low/high, promoted CR-1 → carried, route 2b]** `shared/resources/tests/pipeline-answers-docs.test.mjs:308` — nothing proves the `awk` iteration ran tier 2. Mutation: deleting the tier pin leaves 2d green (`no-red-untested`). → print the tier that ran and assert it.
- **[low/medium, advisory CR-2]** `shared/resources/tests/pipeline-answers-docs.test.mjs:326` — the `""` tier is not pinned to python; on a host without pyyaml both iterations run awk. → iterate python/awk, skip python loudly when unavailable.
- **[low/low, advisory CR-3]** `shared/resources/tests/pipeline-answers-docs.test.mjs:305` — the child env still inherits `BASH_ENV`, `PYTHONPATH`. → allowlist the env.
- **[cleanup CR-4]** `shared/resources/tests/pipeline-answers-docs.test.mjs:56` — `flagsPassedTo`'s doc comment left above `commandSpan`. → move it.

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| No consumer-specific names; all limits from `skills-config.yaml` | PASS | Names: `pipeline-answers-generic.test.mjs`. Limits: `pipeline-answers.test.mjs` 4a/4g + docs 2d |
| All other criteria | PASS | Unchanged since gate 4; fast gate 5305/0 |

## Code Review

**Correctness bugs (3):** CR-1 (promoted, then carried by route 2b), CR-2 and CR-3 (advisory). Anchors: checked against `HEAD` by reading the named lines; all match.

**Cleanups (1):** CR-4.

boundary: false — the change set is one test file (`commandSpan`, `flagsPassedTo`, `policyHandedToResolve`), which ships nothing and gates no action at run time. probes_executed: 0.

mutation-proven: env isolation (`delete env.SKILLS_CONFIG_FILE`) removed → 2d red under `SKILLS_CONFIG_FILE=/nonexistent.yaml` → covered
mutation-proven: `--policy-*` line cut off the resolve call in §0d → 2d red ("the resolve call passes --policy-mode") → covered
mutation-proven: tier pin (`env.AGENT_SKILLS_CONFIG_TIER = tier`) removed → nothing red → no-red-untested (CR-1)

## NFR Assessment

- **Security** — PASS. Evidence: reasoned. Probes executed: 0. No boundary in the change set.
- **Performance** — PASS.
- **Reliability** — PASS. Fast gate green.
- **Maintainability** — PASS.

## Test Artifacts

```bash
npm run ci:fast                                                       # 5305 tests, 0 failed, rc 0 (head debadda8)
node --test shared/resources/tests/pipeline-answers-docs.test.mjs     # 11/11
SKILLS_CONFIG_FILE=/nonexistent.yaml node --test --test-name-pattern=2d shared/resources/tests/pipeline-answers-docs.test.mjs   # pass
```

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 100/100
**Next Steps**: Step 5c conformance review.
