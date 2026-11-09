# QA Report: Task 274 - QA engines stop passing what they cannot see

**Task**: [Link to task document](./task.274.qa-engines-stop-passing-what-they-cannot-see.md)
**Gate File**: [task.274.gate.1.qa-engines-stop-passing-what-they-cannot-see.yml](./task.274.gate.1.qa-engines-stop-passing-what-they-cannot-see.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-09
**Gate Status**: FAIL

---

## Executive Summary

All five engine fixes are in place and the classifier holds on 25 probed cases. The independent diff review found two high-confidence defects in the new code, and QA reproduced both by execution. A third, medium, came from running Step 4b over a changed document. The gate is FAIL and the task goes to `/qa-fix`.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Review Methodology

- Adaptive strategy: direct tools plus one read-only Explore subagent for the diff review (first review, 5 phases, one module family).
- Diff review: code review (every changed path is not documentation). Reviewer dispatched 09:23Z, returned in 47 s (`duration_ms` 47302).
- Step 4b: run over `shared/resources/probe-boundary-rule.md` and `shared/resources/qa-runnable-prose-detection.md`.
- CI on 7caa465c: not read by `qa-ci-read.sh` this cycle; the PR was opened minutes earlier. Recorded as undecided, no gate entry.
- Worktrees: `develop` (598e16fe) and the PR head in scratch worktrees for the timing runs, so the working tree was never mutated.

---

## New Findings This Cycle

First review; all findings are new.

- **[high]** `shared/resources/security-probe.mjs:1896` — `--fixture-copy` follows a symlinked intermediate directory (T274-QA-1, bug 1).
- **[high]** `shared/resources/qa-execute-snippets.mjs:784` — dash-prefixed expansion still classifies runnable (T274-QA-2, bug 2).
- **[medium]** `shared/resources/qa-execute-snippets.mjs` (syntax check) — flags a documented template (T274-QA-3, bug 3).

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| 1 Owner decisions | PASS | Recorded in the task document (598e16fe) |
| 2 Snippet runner | CONCERNS | Shapes 1-3 hold; shape 4 incomplete (QA-2); syntax check false positive (QA-3) |
| 3 Probe record and shared fixtures | CONCERNS | Name keying holds; `--fixture-copy` containment hole (QA-1) |
| 4 status-history width | PASS | `width-mismatch` refusal, exit 2 |
| 5 Docs, bundles, CHANGELOG | PASS | CHANGELOG cites (task 274) |

**Overall Phase Completion**: 5/5 implemented, 2 with findings.

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| Four base-scan shapes classify mutating, with controls | PARTIAL | Shapes 1-3 and shape 4 with a leading expansion: 15 hostile cases rejected, 10 legitimate accepted (run record, 25 executed). Shape 4 with a dash prefix is not (QA-2) |
| Newly refused real-docs blocks listed and fixed or annotated | PASS | One block, `sed '2d' "$f"` in historical task.90, recorded with its command and rationale in the task's Phase note |
| Second control coexists; width mismatch refused | PASS | Named tests in `security-probe.test.mjs` and `status-history-cli.test.mjs` (read; QA did not re-run them alone this cycle) |
| `npm test` within 10% of develop (median of 5) | UNVERIFIED | Measurement in progress, see below |
| Each fix has a mutation proof | UNVERIFIED | Developer's proofs are in the implementation report; QA did not repeat them this cycle (`not-run`) |
| `bundle --check` 0 problems; `CI=true npm test` passes | UNVERIFIED | Developer reports 0 and 8,124 pass; QA's own runs are part of the timing measurement |
| Task.205-shape cases file under 100,000 bytes | UNVERIFIED | A plan test holds a 16-case plan under 5 KB with a 200 KB shared file; `wc -c` of a task.205-shape file not yet recorded |
| Existing committed cases file still runs unchanged | PASS | QA's own cases file ran through the engine; legacy-filename test exists |

Criteria drift: clean (base: reviewed blob). CHANGELOG: `(task 274)` cited.

**Performance measurement.** Script: scratchpad `perf.sh`, five alternating `CI=true npm test` runs on `develop` and the head, `uptime` before each. Run 1 on develop: rc=1, 179.9 s, 8,072 pass, 2 fail. The two failing files (`skills/create-task/tests/from-observation.test.js`, `tests/test-clean-checkout.test.js`) fail on `develop` in a worktree, so they are harness artefacts, not this change. The median and the 10% verdict go in the cycle 2 report.

---

## Issues Found

### HIGH Severity Issues (2)

**T274-QA-1: `--fixture-copy` follows a symlinked intermediate directory**
- **Bug Report**: [task.274.bug.1.fixture-copy-follows-symlinked-directory.md](./task.274.bug.1.fixture-copy-follows-symlinked-directory.md)
- **Observation**: a file outside the root was copied into each case directory (a script that exits 7 on seeing the text rejected the case; the control accepted).
- **Recommendation**: realpath containment before reading.

**T274-QA-2: a dash followed by an expansion still classifies runnable**
- **Bug Report**: [task.274.bug.2.flag-prefix-with-expansion-still-runnable.md](./task.274.bug.2.flag-prefix-with-expansion-still-runnable.md)
- **Observation**: `find docs -$A`, `find docs "-${A}"`, `find docs -$(echo delete)` return runnable; the same on base, but the task puts this shape in scope.
- **Recommendation**: refuse any expansion in the argument unless its first literal character is known not to be a dash.

### MEDIUM Severity Issues (1)

**T274-QA-3: the syntax check flags a documented template**
- **Bug Report**: [task.274.bug.3.syntax-check-flags-template-placeholders.md](./task.274.bug.3.syntax-check-flags-template-placeholders.md)
- **Observation**: `probe-boundary-rule.md:748` (`<command> <candidate>`) raises `syntax error near unexpected token '<'` under bash and zsh.

### LOW Severity Issues (1)

- The owner-accepted shape-4 rule also refuses `sed 2d "$f"`, a read-only use. Accepted by decision; revisit if it blocks real docs.

**Total Issues**: HIGH: 2, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — CONCERNS
Criterion not yet measured; run 1 of 5 complete.

### Reliability — PASS
Refusals return a `reason` and write nothing partial.

### Security — FAIL
- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 25 (15 hostile, 10 legitimate; run record `task.274.qa.1.security.run.json`, `totals.executed` 25, `reproduced` 0, `escaped` 0)
- `boundary: true` (the classifier accepts or rejects blocks). Criteria signals: `refused`, `is refused`. The containment defect in `--fixture-copy` (QA-1) is outside the probe corpus; the diff review found it and QA reproduced it.

### Maintainability — CONCERNS
A false doc comment on `variableArgumentToDenyListed` ("literal first character cannot be a flag"); syntax-check noise on templates.

---

## Code Review

Reviewer returned 2 correctness bugs and 0 cleanups. Anchors: `ok` for both.

**Correctness bugs (2):**
- [high/high] `shared/resources/security-probe.mjs:1896` — only the leaf is lstat'd, a symlinked directory passes → realpath containment. Reproduced by QA; control passes; not on base (the flag is new). Promoted as T274-QA-1.
- [high/high] `shared/resources/qa-execute-snippets.mjs:784` — only a leading expansion is refused → refuse any expansion unless the first literal character is not a dash. Reproduced by QA; controls pass; same output on base, but the shape is in the task's scope, so it stays. Promoted as T274-QA-2.

Platform variance: no environment-derived value reaches a validating consumer in the diff; the `TMPDIR=/tmp` re-run is not applicable.

mutation-proven: not run by QA this cycle (developer's proofs are in the implementation report) → not-run

---

## Test Artifacts

### Test Commands Executed
```bash
command node shared/resources/security-probe.mjs --sink url-authority --entry 'shared/resources/qa-execute-snippets.mjs#isRunnableBlock' --name classify-base-scan --cases-file <cases.json> --record <run.json> --json
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <changed .md> --diff-base <merge-base> --copy-as skills:.agents/skills --json
CI=true npm test   # develop and head worktrees, 5 alternating pairs, in progress
```

### Step 4b result
`probe-boundary-rule.md`: 0 runnable, 1 mutating, 2 `execution-failure` (QA-3). `qa-runnable-prose-detection.md`: 1 runnable, 1 mutating, 0 findings. Changed blocks: 0 in both. Not run: `npm run validate -- skills/<changed>/` for the 17 bundled skill copies (held back to keep the timing runs clean); to run in cycle 2.

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix QA-1 and QA-2 with controls and mutation proofs.
2. Fix QA-3 and count false positives across the tracked docs.

### Short-term Actions (Non-Blocking)
1. Finish the timing measurement, the `wc -c` cases-file size, and `npm run validate` in cycle 2.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: two reproduced high-severity defects in code this task adds.
**Quality Score**: 70/100
**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.274.qa.1.qa-engines-stop-passing-what-they-cannot-see.md`
**Gate File**: co-located at `task.274.gate.1.qa-engines-stop-passing-what-they-cannot-see.yml`
**Next Steps**: `/qa-fix` on the three findings, then re-review.
