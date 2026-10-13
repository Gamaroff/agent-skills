# QA Report: Task 181 - security-probe: a shell-argv: entry form (cycle 4)

**Task**: [task.181.probe-engine-shell-argv-entry-form.md](./task.181.probe-engine-shell-argv-entry-form.md)
**Gate File**: [task.181.gate.4.probe-engine-shell-argv-entry-form.yml](./task.181.gate.4.probe-engine-shell-argv-entry-form.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-13
**Testing Completed**: 2026-10-13
**Gate Status**: PASS

---

## Re-Review Context

QA re-entered at 5a after the `/finalise` DoD-gaps halt (`task.181.dod.1`), through `reenter-qa-after-finalise.sh` (code moved since gate 3's head: commit `918a52af`).

| Previous gap (dod.1) | Status | Evidence |
| --- | --- | --- |
| AC2 — `--argv` refused for a `shell-fn:` entry, untested | ✅ FIXED | test "--argv is still refused for a shell-fn: entry — CLI exit 2 and library decline"; CLI- and library-side mutations each red |
| AC6 — run-time trip-wire decline for `shell-argv:`, untested | ✅ FIXED | test "a gh call the text check cannot see is caught by the run-time trip-wire"; trip-wire-unread mutation red |
| AC6 — `--fake-gh` accepted for `shell-argv:`, untested | ✅ FIXED | test "--fake-gh is accepted and its gh answers the run"; fake-gh-refused mutation red |

## New Findings This Cycle

- **[low]** `shared/resources/tests/security-probe.test.mjs:5625` — the AC2 CLI half asserts the record snapshot is absent but not the `.d` entry directory, which `readRecord` treats as authoritative → future.

---

## Executive Summary

The fix is three coverage tests, one per untested member of AC2 and AC6. Each holds its member: breaking the behaviour it names turns it red. No engine change; the fast gate and both security controls are green.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Review Methodology

Re-review scope: files changed since gate 3 (head 5210dbd66fd2; 1 file) — default. `SAFETY_REPROBE=false` (gate 3 security PASS, `measured`; no HIGH; not FAIL). Independent Explore reviewer dispatched 05:14:06Z, `duration_ms` 77180. Step 4b: no runnable prose changed.

---

## Success Criteria Verification

AC2 and AC6 now hold every member with a per-PR test (`npm test`). All other criteria as gate 3.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1 (advisory)

---

## NFR Assessment

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 19 (`task.181.qa.4.security.run.json`) — both controls engage, 0 reproduced, 0 escapes

### Performance — PASS · Reliability — PASS · Maintainability — PASS

---

## Code Review

Reviewer: independent Explore subagent, scoped to commit `918a52af`. Anchor verified (`finding-anchors.js`).

**Correctness bugs (1):**
- [low/medium] `shared/resources/tests/security-probe.test.mjs:5625` — record `.d` directory not asserted absent → future (not promoted: code_review_blocking promotes only `bug` + `high`).

Mutation spot check: the four mutations at the fix (CLI and library admit `shell-fn:` argv; trip-wire unread for `shell-argv:`; `--fake-gh` refused for `shell-argv:`) each turned one named test red — `covered`.

---

## Regression Testing

`ci:fast` at `918a52af`: 5423 pass, 0 fail.

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 100/100
**Deployment Recommendation**: APPROVED

**Next Steps**: Step 5c PR conformance review, then `/finalise`.
