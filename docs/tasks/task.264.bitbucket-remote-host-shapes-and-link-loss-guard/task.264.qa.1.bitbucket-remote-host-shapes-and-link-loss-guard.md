# QA Report: Task 264 - Bitbucket remote host shapes and link-loss guard

**Task**: [Link to task document](./task.264.bitbucket-remote-host-shapes-and-link-loss-guard.md)
**Gate File**: [task.264.gate.1.bitbucket-remote-host-shapes-and-link-loss-guard.yml](./task.264.gate.1.bitbucket-remote-host-shapes-and-link-loss-guard.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-05
**Gate Status**: PASS

---

## Executive Summary

Cycle 1 reviewed PR #847 at head `8b075544`. The remote parser, the update guard, the docs and the regenerated bundles all match the task. No finding reaches the gate.

**Overall Assessment**: PASS (95/100)
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Review Methodology

Direct tools only (small task, three phases, first review). The Step 3b diff code review was performed inline by the QA agent rather than by a dispatched Explore subagent, so there was no independent reviewer; that independence loss is recorded here. Traceability mapper not dispatched; internal mapping used.

CI on 8b075544e909: pending (read once, not waited on; undecided states change nothing in the gate).

Step 4b: not applicable beyond the four SKILL.md edits, which add table text only and no fenced bash.

---

## Implementation Verification

| Phase                    | Status | Test Result | Notes                                                                 |
| ------------------------ | ------ | ----------- | --------------------------------------------------------------------- |
| Phase 1: Remote parser   | PASS   | Verified    | `parseBitbucketRemote` pure, exact host set, used by `getBitbucketRepoBase` |
| Phase 2: Update guard    | PASS   | Verified    | Guard sits after `isUpdate` in all four scripts; dry-run covered       |
| Phase 3: Docs and release | PASS  | Verified    | Four SKILL.md rows, CHANGELOG entry citing task 264, bundles in sync   |

**Overall Phase Completion**: 3/3

---

## Success Criteria Verification

| Criterion                                                      | Status | Evidence                                                                                           |
| -------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| Seven shapes derive the base; unknown and look-alike hosts null | PASS   | `jira-sync-bitbucket-remote.test.mjs` 29/29 green, including `bitbucket.org.evil.example`           |
| Update with null base exits non-zero, no write, all four scripts | PASS   | 3 end-to-end tests per script in `skills/sync-jira-*/tests/end-to-end.test.js`; guard at `sync-jira-task.js:637` and its three siblings |
| Create with null base still warns and exits 0                  | PASS   | Third end-to-end test per script                                                                    |
| No added subprocess or network per run                         | PASS   | Parser is pure; `git remote get-url` is read once as before; the message helper reads it on the error path only |
| Added suite time under 2 s                                     | PASS   | Measured: `uptime` load average 3.00; `time node --test shared/resources/tests/jira-sync-bitbucket-remote.test.mjs` = 0.193 s real, 29 pass |
| `CI=true npm test` passes                                      | PASS   | `CI=true npm run ci:fast` exited 0 at develop Step 3 (143.7 s); PR CI pending on this head          |
| `npm run validate` passes                                      | PASS   | `quick_validate.py` run for sync-jira-task, -story, -epic, -bug: all pass                          |
| Mutation proof recorded                                        | PASS   | See below                                                                                           |
| `CHANGELOG.md` cites task 264                                  | PASS   | `changelog-cites.sh`: cites (task 264)                                                              |
| `bundle:check` and `check:generated` clean                     | PASS   | `bundle freshness: 129 skill(s) checked, 0 problems`; `check:generated` ran without error           |
| Four SKILL.md state update-stops / create-warns                | PASS   | Env-var and troubleshooting rows read in the diff                                                   |

Criteria drift: clean (no criterion changed since review). Platform variance: the new tests build temp git repos under `os.tmpdir()`; `TMPDIR=/tmp node --test …` also passes.

---

## Issues Found

HIGH: 0, MEDIUM: 0, LOW: 2 (advisory, in the gate's `recommendations.future`).

- LOW: `missingBitbucketBaseMessage` suggests a `BITBUCKET_REPO_URL` line from the last two path segments of any remote, so a Server or non-Bitbucket remote gets a plausible but possibly wrong suggestion.
- LOW: the stock `url-authority` probe sink has no allow-list form, so an exact-host predicate needs a bespoke cases file.

---

## NFR Assessment

### Performance: PASS
Parser is pure; suite 0.19 s.

### Reliability: PASS
An update that cannot derive a base stops before any write, dry-run included.

### Security: PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 9 (6 hostile, 3 legitimate; 0 reproduced, 0 escaped)
- The stock `url-authority` corpus scored `rejects-every-input` against this function because it validates an exact-host allow-list, not a free host component. That is a corpus mismatch, not a defect. A purpose-built cases file was run through `security-probe.mjs`: verdict `engages`. Record: `task.264.qa.1.….security.run.json`. The refusal message strips remote userinfo (tested).

### Maintainability: PASS
One parser and one message helper shared by four scripts.

---

## Code Review

Boundary: true (`parseBitbucketRemote`, allow-list predicate), probed above.

**Correctness bugs (0):** none.

**Cleanups (1):**
- `shared/resources/jira-sync.js` `missingBitbucketBaseMessage` — suggest the env line only when the host reads as Bitbucket (LOW, advisory).

mutation-proven: removed the `isUpdate && !bbBase` guard in each of the four scripts → 2 tests red per script (update stops with no write; dry-run stops) → covered
mutation-proven: excluded `ssh.bitbucket.org` from `BITBUCKET_HOSTS` → 5 parser tests red → covered

Both proofs were run by `develop` at Step 3 and are carried here from the implementation report; this cycle did not repeat them. The tests are committed, so the outcome is `covered`, not `dev-only`.

---

## Regression Testing

Existing end-to-end suites for the four scripts pass with the new tests alongside them (`ci:fast` exit 0). A create with a null base is unchanged.

---

## Test Artifacts

### Test Commands Executed
```bash
node --test shared/resources/tests/jira-sync-bitbucket-remote.test.mjs
TMPDIR=/tmp node --test shared/resources/tests/jira-sync-bitbucket-remote.test.mjs
python3 skills/create-skill/scripts/quick_validate.py skills/sync-jira-{task,story,epic,bug}
npm run bundle:check
npm run check:generated
node .agents/skills/qa-task/references/security-probe.mjs --sink url-authority --entry 'shared/resources/jira-sync.js#parseBitbucketRemote' --cases-file <bespoke> --record <record>
```

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Every success criterion is verified from a named command or file; no finding is open.
**Quality Score**: 95/100
**Deployment Recommendation**: APPROVED

**QA Report**: co-located at `task.264.qa.1.bitbucket-remote-host-shapes-and-link-loss-guard.md`
**Gate File**: co-located at `task.264.gate.1.bitbucket-remote-host-shapes-and-link-loss-guard.yml`
**Next Steps**: PR review (Step 5c), then finalise.
