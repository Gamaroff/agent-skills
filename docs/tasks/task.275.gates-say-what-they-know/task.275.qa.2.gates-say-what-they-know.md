# QA Report: Task 275 - Gates say what they know

**Task**: [Link to task document](./task.275.gates-say-what-they-know.md)
**Gate File**: [task.275.gate.2.gates-say-what-they-know.yml](./task.275.gate.2.gates-say-what-they-know.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-15
**Testing Completed**: 2026-11-15
**Gate Status**: PASS

---

## Executive Summary

Re-review after QA cycle 1 (PASS 95, one low open). The refute pass over the whole branch diff found one overclaim, in the helper's header, which the fix cycle's own adversarial pass had already caught and fixed. The one open point is the wall-time criterion's method.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Review Methodology

Re-review, cycle 2, so the whole branch diff is reviewed to refute (`REFUTE_PASS`). Direct tools; the diff review was performed **inline**, no Explore subagent, so independence from the author's session is lost and recorded here.

Re-review scope: unscoped whole-branch diff (cycle 2 is always a full refute pass).

CI on 9181242e7074: pending (all checks were still running when the gate was written).

---

## Re-Review Context

| Previous issue | Status | Evidence |
| -------------- | ------ | -------- |
| T275-QA-1 (low): wall-time criterion unmeasured by its method | PARTIAL | Five alternating develop/branch pairs over the touched test files recorded in the implementation report Issues Log (median difference +31 ms, load 19 to 22). The criterion's method, five runs of the full suite, was not run; the criterion text is unedited |

## New Findings This Cycle

- **[low, fixed]** `shared/resources/gate-open-count.js` header and `shared/resources/stakeholder-summary.md` — the header said the helper's open definition was the develop-next merge gate's; it is not. That gate counts only an absent or `open` status as open, treats `deferred` as closed only with a named owner, and exempts an active WAIVED gate's entries. The helper counts an unfamiliar word as open. Only a PASS lead reads the count, so no rendered lead changes, but the claim was false. Found by qa-fix's adversarial pass (Step 3.5) before this gate; fixed in 9181242e7 (header and doc now state the difference). Not carried into `top_issues[]`: it is closed on the head this gate judged.

---

## Implementation Verification

| Phase                         | Status | Notes |
| ----------------------------- | ------ | ----- |
| Phase 1: The count slot       | PASS   | Unchanged since gate 1 apart from the header comment |
| Phase 2: The remedy status    | PASS   | Unchanged |
| Phase 3: Evidence and sweep   | PASS   | Bundle `--check` 0 problems after the doc fix |

**Overall Phase Completion**: 3/3

---

## Success Criteria Verification

As gate 1 (QA report 1), with the changes below.

| Criterion | Evidence | Status |
| --------- | -------- | ------ |
| `CI=true npm test` wall time within 10% of `develop`, five alternating runs, `uptime` beside each | Not run as specified; bound and a five-pair measurement of the touched test files recorded (see Re-Review Context) | UNVERIFIED (T275-QA-1) |
| All others | Re-run this cycle: the three affected suites 86/86 pass; bundle `--check` clean; `changelog-cites.sh task.275` exits 0 | PASS |

Criteria drift: clean.

---

## Issues Found

HIGH: 0, MEDIUM: 0, LOW: 1 (T275-QA-1, open).

---

## NFR Assessment

Performance, Reliability, Security, Maintainability: PASS (see the gate for notes). Security evidence is `reasoned`, boundary `internal`, as in gate 1.

---

## Code Review

Refute pass, inline, over `origin/develop...HEAD` (4 hand-written source files, the rest bundled copies, docs and tests).

**Correctness bugs (0).** Probes run to refute, beyond gate 1's:

- Status spelling: `status: Closed` and `status: 'closed'` are read as closed (the value is lowercased and unquoted).
- Block boundary: a column-0 comment inside the block is skipped; `top_issues:` is matched only at column 0; a nested `- ` item inside an entry's `refs:` list does not start a new entry (its indent differs from the entry's dash).
- A PASS gate cannot carry an open medium or high entry (gate rules 1 and 2), so "minor points" is accurate for any PASS the count can reach.
- Identity: the helper's definition of open is compared with the develop-next gate's, which is how the overclaim above was found. Neither direction changes a PASS lead.
- Helper against 997 committed gates and a YAML parser, as gate 1: 0 mismatches.

**Cleanups (0).**

mutation-proven: count branch, feed guard and closed-status set were each reverted in cycle 1 and a committed test went red each time (outcome `covered`); the only change since is a comment and a doc paragraph, so no behaviour was mutated again.

---

## Regression Testing

The three affected suites pass (86/86). `ci:fast` on the LAN server was green on the cycle 1 head; the changes since are documentation and a header comment, and the PR's own CI was pending at the time of writing.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Every criterion but one is verified; the one open low is a method gap with its bound met.
**Quality Score**: 95/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.275.qa.2.gates-say-what-they-know.md`
**Gate File**: co-located at `task.275.gate.2.gates-say-what-they-know.yml`
**Next Steps**: the loop's route classifier decides between a fix and the exit to review-pr
