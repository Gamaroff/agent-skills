# QA Report: Task 140 - Harden the shell-fn: sentinels and the fake-gh coverage

**Task**: [Link to task document](./task.140.shell-fn-sentinel-hardening.md)
**Gate File**: [task.140.gate.4.shell-fn-sentinel-hardening.yml](./task.140.gate.4.shell-fn-sentinel-hardening.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-30
**Testing Completed**: 2026-09-30
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 4 re-review after the cycle 3 fix (`ab079810`), which ran on an operator grant of two more cycles. BUG-5 and BUG-6 are fixed; each row goes red on its own single mutant. The unscoped safety re-probe found three ways past the `gh` containment. All three reproduce **identically at `origin/develop`**, so they are pre-existing and go to `future`. The defect this change owns is rule §5 calling an absolute path the trip-wire's "one limit" (TASK-140-BUG-7, medium).

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (BUG-7)

---

## Re-Review Context

| Previous issue (gate 3) | Status |
| --- | --- |
| CR-1 / BUG-5 (high): trip-wire decline drops escapes, cases, shells | FIXED — mutation-proven |
| CR-2 / BUG-6 (medium): trip-wire records nothing under `env -i` | FIXED — mutation-proven |
| Advisory CR-4 (gate 3 `future`): PATH prepend reaches a real `gh` | Confirmed by execution this cycle; pre-existing (identical at base) → `future`; the rule's claim about it → BUG-7 |

---

## New Findings This Cycle

- **[medium]** `shared/resources/probe-boundary-rule.md` §5: states one trip-wire limit; three more exist (TASK-140-BUG-7) → state them with a pinning row.

Searched unscoped (prior gate: security FAIL): the full `origin/develop...HEAD` diff, 35 files. The reviewer re-enumerated the ways a library can reach `gh`, including PATH rewrites, `command -p`, a missing `PATH`, backgrounded calls, a noexec `TMPDIR` and quoted marker paths, and executed each against the current engine.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#527)

### Review Methodology

Direct tools for the verification; one read-only Explore reviewer for the diff (206 s, returned). Re-review scope: unscoped (prior gate failed on security). Step 4b: not applicable — the change set's runnable prose did not change this cycle (rule §5 is prose, with no fenced bash).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: red rows | PASS | Verified | |
| Phase 2: body and gates | PASS | Verified | Cycle 3 fix in the trip-wire decline and stub |
| Phase 3: lint lanes | PASS | Verified | Unchanged this cycle |
| Phase 4: rule, bundle, CHANGELOG | CONCERNS | Verified | §5 limit statement incomplete (BUG-7) |

**Overall Phase Completion**: 4/4 (1 with a concern)

---

## Success Criteria Verification

Unchanged from gate 3, except for the rule: every functional criterion holds at `ab079810`. The criterion "rule §5 states the limits" is the one with a concern.

---

## Breaking Changes Validation

None declared; none found.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: Rule §5 overclaims a single trip-wire limit**
- **Severity**: MEDIUM
- **Category**: Security (documentation of a control's limits)
- **Bug Report**: [task.140.bug.7.rule-overclaims-one-limit.md](./task.140.bug.7.rule-overclaims-one-limit.md)
- **Observation**: three further bypasses, each executed
- **Impact**: a reader trusts the trip-wire past what it guarantees
- **Recommendation**: state the limits with a pinning row

### LOW Severity Issues (0)

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS
`TMPDIR=/tmp` shell rows 55/55; full file 114/114.

### Reliability — PASS
BUG-6 closed.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 69 (run record `task.140.qa.4.security.run.json`, `totals.executed`)
- `resolveEntry` through the task.136 wrapper: 21 cases, with a real `uploads/link-to-etc → /etc` present for the run (created, then removed). Result `present-but-inert`; the one reproduced case is the pre-existing `encoded-traversal`, the same as cycles 1–3.
- `gh_labels_filter` with `--fake-gh`: `engages` 20 (bash + zsh). `shell:qa-cycle.sh`: `engages` 28.
- Containment bypasses: pre-existing (see Code Review); the overclaim is the CONCERNS.

### Maintainability — PASS

---

## Code Review

Reviewer: read-only Explore, full branch diff, with the safety re-probe directive; returned `code_review:` with 4 findings.

**Correctness bugs (4):**
- [high/high] `shared/resources/security-probe.mjs:1672` — a library PATH prepend puts a real `gh` ahead of the trip-wire; the run is scored → **pre-existing** (below)
- [high/high] `shared/resources/security-probe.mjs:1666` — the same prepend bypasses `--fake-gh`, and the record names the fixture → **pre-existing** (TASK-136-BUG-1 class)
- [medium/high] `shared/resources/security-probe.mjs:1245` — a `gh` call backgrounded past the spawn runs after teardown → **pre-existing**
- [medium/low] `shared/resources/security-probe.mjs:1128` — noexec `TMPDIR` skips the stub (platform variance; not executed on macOS) → advisory, `future`

**Provenance (5b).** The same scratch driver ran at HEAD `ab079810` and at an `origin/develop` worktree. It plants a "real `gh`" that writes a marker, puts it ahead on `PATH` inside a library, and calls it through `X=gh; "$X"`:

| Shape | HEAD | origin/develop |
| --- | --- | --- |
| PATH prepend, no `--fake-gh` | `absent`, 20, real gh ran | `absent`, 20, real gh ran |
| PATH prepend, `--fake-gh` | `absent`, 20, real gh ran | `absent`, 20, real gh ran |
| backgrounded past teardown | `absent`, 20, real gh ran | `absent`, 20, real gh ran |

Identical at base; no fixture in the corpus has any of these shapes → `pre-existing`, not in `top_issues[]`, routed to `recommendations.future` as a follow-up task. Severity and confidence are kept exactly as returned. The claim in §5 is new in this branch, which makes it a finding (BUG-7).

**Cleanups (0).**

mutation-proven: drop `cases`/`escapes`/`shells`/`fakeGh`/`args` from the trip-wire decline → "the trip-wire decline keeps what the runs observed" (BUG-5 row) → covered
mutation-proven: marker path back to `$PROBE_GH_TRIPPED` in the environment → "gh called under env -i still trips the wire" (BUG-6 row) → covered

Each mutant reddened only its own row; the file was restored from a `cp` snapshot, and `git diff --quiet HEAD` was clean afterwards.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `security-probe.test.mjs` | PASS 114/114 |
| `TMPDIR=/tmp` shell rows | PASS 55/55 |
| task.136 green path | engages, 20 |
| task.128 `shell:shared/resources/qa-cycle.sh` | engages, 28 |
| `npm run validate` (finalise, qa-story, qa-task, review-security) | exit 0 ×4 |
| `npm run ci:fast` at `ab079810` (qa-fix cycle 3) | 4609 pass, 0 fail |

---

## Test Artifacts

### Test Commands Executed
```bash
command node --test shared/resources/tests/security-probe.test.mjs   # 114/114
TMPDIR=/tmp command node --test --test-name-pattern='task\.140|symlink|fake-gh|shell-fn|shell entry' shared/resources/tests/security-probe.test.mjs   # 55/55
command node shared/resources/security-probe.mjs --sink path --entry '.claude/state/t140-probe-wrapper.mjs#containsShellFnEntry' --cases-file .claude/state/t136-probe-cases.json --repo-root "$(pwd)" --record docs/tasks/task.140.shell-fn-sentinel-hardening/task.140.qa.4.security.run.json --json   # 21, present-but-inert
command node shared/resources/security-probe.mjs --sink filename --entry 'shell-fn:shared/resources/gh-labels.sh#gh_labels_filter' --cases-file tests/fixtures/shell-fn/gh-labels.cases.json --fake-gh tests/fixtures/fake-gh --record … --json   # engages 20
command node shared/resources/security-probe.mjs --sink filename --entry 'shell:shared/resources/qa-cycle.sh' --record … --json   # engages 28
npm run -s validate -- skills/{finalise,qa-story,qa-task,review-security}/   # exit 0 each
```

---

## Recommendations

### Immediate Actions (Blocking)
1. BUG-7: state the three further trip-wire limits in rule §5, with a row pinning the PATH-prepend shape.

### Short-term Actions (Non-Blocking)
1. Follow-up task: close the `gh` containment bypasses (post-source `gh` shadow, a fixture-answered marker, a process-group kill before teardown, a stub self-test).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: no HIGH. One medium, which this change owns: a documentation overclaim about a control's limits.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: BUG-7 fixed

---

**QA Report**: co-located at `task.140.qa.4.shell-fn-sentinel-hardening.md`
**Gate File**: co-located at `task.140.gate.4.shell-fn-sentinel-hardening.yml`
**Next Steps**: qa-fix cycle 4 (BUG-7), then QA cycle 5
