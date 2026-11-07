# QA Report: Task 269 - finalise never hand-copies agent output

**Task**: [task document](./task.269.finalise-never-hand-copies-agent-output.md)
**Gate File**: [task.269.gate.4.finalise-never-hand-copies-agent-output.yml](./task.269.gate.4.finalise-never-hand-copies-agent-output.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-07
**Gate Status**: PASS

---

## Executive Summary

Cycle 4 re-reviewed the files changed since gate 3's head (`a9845bc0`). The only code-side change is a four-line assertion in `security-probe-plan-cases-file.test.mjs` that holds the absolute-name guard in `resolveCasesFile`. The rest is task documents and the DoD run 1 records. No new finding.

**Overall Assessment**: PASS (100/100)
**Deployment Recommendation**: APPROVED

### Review Methodology

Direct tools only. The scoped code diff is 8 lines, so it was read inline and no reviewer subagent was dispatched; the independence of the review is lost for this cycle. Re-review scope: files changed since gate 3 (head `a9845bc0`; 12 files) — default, since the prior gate's security axis passed.
CI on bf56d2e94458: pending.

## Re-Review Context

| Finding | Status | Evidence |
| --- | --- | --- |
| Gate 3: no open finding | n/a | `top_issues` was empty |
| DoD run 1 AC #6 (timing record) | ✅ addressed | five timed runs in the `qa.3` addendum, slowest 410.7 ms |
| DoD run 1 AC #7 (mutation proofs) | ✅ addressed | 13 proofs in the `qa.3` addendum; the absolute-name guard now has a committed test |

## New Findings This Cycle

None. Searched: the scoped diff of `shared/resources/tests/security-probe-plan-cases-file.test.mjs`. Checked that the new assertions use a file that exists (so the later containment checks cannot be what refuses it), that the control case `in.json` relative is accepted, and that the work directory is the test's own temp directory.

## Success Criteria Verification

Unchanged since cycle 3 and all met. `criteria-drift`: clean.

## NFR Assessment

Security PASS (measured: the DoD run 1 probe record, 10 executed, 0 reproduced, 0 escaped; `security-probe-plan.mjs` unchanged since gate 3). Performance PASS. Reliability PASS. Maintainability PASS.

## Code Review

No findings.

mutation-proven: `path.isAbsolute(name)` guard in `resolveCasesFile` removed → `resolveCasesFile: a directory, an absolute name and a NUL are refused` (security-probe-plan-cases-file.test.mjs) → covered

The mutant was applied from a snapshot (guard line count 1 before, 0 after), 1 test failed (9 pass), then the file was restored and compared byte for byte; `git status` shows no change under `shared/`. The three related test files pass 41/41 on the restored source.

Boundary: `boundary: true`; the DoD run 1 record (`task.269.dod.1.security.run.json`) supplies `probes_executed: 10`.

## Test Artifacts

### Test Commands Executed

```bash
TMPDIR=/tmp CI=true node --test shared/resources/tests/security-probe-plan-cases-file.test.mjs shared/resources/tests/agent-reply-block.test.mjs shared/resources/tests/read-only-agent-writes.test.mjs   # 41 pass, 0 fail
./node_modules/.bin/prettier --check shared/resources/tests/security-probe-plan-cases-file.test.mjs                                                       # clean
bash changelog-cites.sh task.269                                                                                                                         # cites (task 269)
CI=true TMPDIR=/tmp npm run ci:fast                                                                                                                      # exit 0, run on the same test content before commit
```

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 100/100
**Deployment Recommendation**: APPROVED
**Next Steps**: Step 5c `/review-pr`, then `/finalise` (scoped re-run).
