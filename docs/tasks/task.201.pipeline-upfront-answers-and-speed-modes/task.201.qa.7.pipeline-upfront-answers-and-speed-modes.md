# QA Report: Task 201 - Pipeline up-front answers and speed modes (cycle 7)

**Task**: [task.201.pipeline-upfront-answers-and-speed-modes.md](./task.201.pipeline-upfront-answers-and-speed-modes.md)
**Gate File**: [task.201.gate.7.pipeline-upfront-answers-and-speed-modes.yml](./task.201.gate.7.pipeline-upfront-answers-and-speed-modes.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-11
**Gate Status**: CONCERNS

---

## Executive Summary

Re-entered QA after finalise run 2's DoD gaps were closed by commit `2149dba5`. The three AC10 gaps
are closed: the criterion row cites the right holders, new test 2d executes §0d's own config-read
lines, and the name scan now includes hand-authored skill references. One medium bug in test 2d is
promoted: it inherits `SKILLS_CONFIG_FILE` from the runner's environment.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (CR-1 fixed)

## Review Methodology

Re-review scope: files changed since gate 6 (head 5508cfe180c0; 11 files, 2 of them outside the task
directory) — default. Clause 1 of the safety re-probe: `false`. One Explore subagent, 104 s by its
`duration_ms`. Step 4b: not applicable — no runnable prose in the change set.

## Re-Review Context

| Prior item | Status | Evidence |
| --- | --- | --- |
| DoD run 2 gap 1 — AC10 limits holder mis-cited | FIXED | Task doc criterion row now cites `pipeline-answers.test.mjs` 4a/4g + docs 2d |
| DoD run 2 gap 2 — §0d config read unpinned | FIXED | `pipeline-answers-docs.test.mjs` 2d — mutation-proven below |
| DoD run 2 gap 3 — develop-bug step-0 reference outside the scan | FIXED | `pipeline-answers-generic.test.mjs` population includes hand-authored `skills/*/references/*.md` |
| Gate 6 advisories (low) | CARRIED | Routed to `recommendations.future` |

## New Findings This Cycle

- **[medium/high, promoted CR-1]** `shared/resources/tests/pipeline-answers-docs.test.mjs:292` — 2d runs `bash -c` with the runner's whole `process.env`; `read-config.sh` treats any `SKILLS_CONFIG_FILE` other than `skills-config.yaml` as a redirect, so the cwd fixture is bypassed. Reproduced: `SKILLS_CONFIG_FILE=/nonexistent.yaml node --test --test-name-pattern=2d …` → 1 fail. → pass an explicit env without `SKILLS_CONFIG_FILE` (or pinned to the fixture); pin `AGENT_SKILLS_CONFIG_TIER`.
- **[low/medium, advisory CR-2]** `shared/resources/tests/pipeline-answers-docs.test.mjs:275` — `argOf` takes the first `--policy-*` match anywhere in the block, not on the resolve command span. → read from the joined resolve span and assert both flags there.

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| No consumer-specific names; all limits from `skills-config.yaml` | PASS | Names: `pipeline-answers-generic.test.mjs`. Limits: `pipeline-answers.test.mjs` 4a/4g + docs 2d |
| All other criteria | PASS | Unchanged since gate 4; fast gate 5305/0 |

## Code Review

**Correctness bugs (2):** CR-1 (promoted to `top_issues[]`, `code_review_blocking`), CR-2 (advisory —
confidence medium). Anchors: both checked against the file at `HEAD` by reading the named lines; both match `line_text`.

**Cleanups (0).**

boundary: false — the change set is two test files (helpers `argOf`, `runPolicyRead`, `shippedFiles`), which ship nothing and gate no action at run time. probes_executed: 0.

Provenance: CR-1 is new — test 2d did not exist before `2149dba5`.

mutation-proven: §0d `read_nested_config_key develop defaultMode` → `defaultMod` → `pipeline-answers-docs` 2d red → covered

## NFR Assessment

- **Security** — PASS. Evidence: reasoned. Probes executed: 0. No boundary in the change set.
- **Performance** — PASS.
- **Reliability** — PASS. Fast gate green; CR-1 is an environment sensitivity in a test.
- **Maintainability** — PASS.

## Test Artifacts

```bash
npm run ci:fast                                                                   # 5305 tests, 0 failed, rc 0
node --test shared/resources/tests/pipeline-answers{,-docs,-generic}.test.mjs     # 74/74
SKILLS_CONFIG_FILE=/nonexistent.yaml node --test --test-name-pattern=2d shared/resources/tests/pipeline-answers-docs.test.mjs   # 1 fail (CR-1)
```

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Next Steps**: 5b `/qa-fix` for CR-1, then re-review.
