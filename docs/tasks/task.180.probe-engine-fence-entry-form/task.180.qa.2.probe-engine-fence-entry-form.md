# QA Report: Task 180 - security-probe: a fence: entry form for a fenced bash block in a step doc

**Task**: [task.180.probe-engine-fence-entry-form.md](./task.180.probe-engine-fence-entry-form.md)
**Gate File**: [task.180.gate.2.probe-engine-fence-entry-form.yml](./task.180.gate.2.probe-engine-fence-entry-form.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-12
**Testing Completed**: 2026-10-12
**Gate Status**: FAIL

---

## Re-Review Context

Previous gate: [gate 1](./task.180.gate.1.probe-engine-fence-entry-form.yml) — FAIL 70, 3 findings. Fix commit `bdbedcdf`.

| Previous issue | Status | Evidence |
| --- | --- | --- |
| TASK-180-001 (HIGH) syntax error scored as refusal | FIXED — for parse errors; the wider class is TASK-180-005 | regression test; mutation F1 red |
| TASK-180-002 (MEDIUM) fence: control key ignores slot/name | FIXED | both identity directions tested; mutation F2 red |
| TASK-180-003 (LOW) empty `--slot` passes `main()` | FIXED | test; mutation F3 red |
| CR-4 / CR-5 cleanups (cycle 1) | FIXED | stderr-first detail (mutation F4 red); 7 length guards |

---

## Executive Summary

Cycle 1's fixes hold. Cycle 2 was the refute pass, run as a safety re-probe (the prior HIGH was a
security-verdict defect), and the reviewer reproduced four more defects in the `fence:` scoring path.
The HIGH is a false alarm rather than a false pass: a case whose `expected.absent` names a file its
own fixture writes scores every hostile case accepted. Two MEDIUMs widen and reorder cycle 1's fix.
Engine probes: 26 executed, 0 reproduced.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Review Methodology

Direct tools plus one Step 3b reviewer (Explore). **Cycle 2 — refute pass** over the whole branch
diff (`origin/develop...HEAD`, generated copies and task docs excluded): 13 files, 2155 lines.
`SAFETY_REPROBE=true` by judgement (clause 2: the prior HIGH was a security-verdict defect; clause 1
from the gate read `false`), so the safety re-probe directive was appended after the refute
directive. Reviewer measured duration 306.7 s (`duration_ms` 306713). Mapper not dispatched (no
Success Criteria table).

Re-review scope: unscoped (cycle 2 refute pass + safety re-probe by judgement)

---

## New Findings This Cycle

- **[HIGH]** `shared/resources/security-probe.mjs:2250` — no collision guard between `expected.absent` and `fixture.files` → decline the shape (TASK-180-004, bug.3)
- **[MEDIUM]** `shared/resources/security-probe.mjs:2346` — shell diagnostics other than a parse error still read as a refusal → score every diagnostic about the script `errored` (TASK-180-005, bug.4)
- **[MEDIUM]** `shared/resources/security-probe.mjs:2324` — the parse-failure branch masks a reproduced side effect → compare `expected.absent` first (TASK-180-006, bug.5)
- **[LOW]** `shared/resources/security-probe.mjs:1020` — a declined fence: run loses its slot (TASK-180-007)
- **[LOW]** `shared/resources/security-probe.mjs:2050` — CRLF headings never match (TASK-180-008, platform-variance)

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: Tests first | PASS | 17 fence tests |
| Phase 2: The entry form | CONCERNS | TASK-180-004..008 |
| Phase 3: Routing and proof | PASS | unchanged since cycle 1; parse-failure clause added at 5 sites |

---

## Success Criteria Verification

Unchanged from QA cycle 1 (all held by named tests); criterion 1's rule now carries the
parse-failure clause, and TASK-180-005/006 refine it further.

## Breaking Changes Validation

None. **PASS**

---

## Issues Found

**Total Issues**: HIGH: 1, MEDIUM: 2, LOW: 2 — details and bug links in New Findings above.

---

## NFR Assessment

### Performance — PASS
No new timeout literal; `ci:fast` 5380/0 at the fix commit.

### Reliability — CONCERNS
TASK-180-007 (stale record entry), TASK-180-008 (CRLF).

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 26 — from `task.180.qa.2.security.run.json` `totals.executed`
- Boundary: **true**. `resolveEntry` fence: branch (13 cases) and the shipped fast-gate precondition via `fence:` (13), both `engages`, 0 reproduced.
- CONCERNS for TASK-180-004..006.

### Maintainability — PASS

---

## Code Review

Refute pass + safety re-probe, `code_review_blocking=true`. Promoted (bug + high confidence):
CR-1 → TASK-180-004, CR-2 → -005, CR-3 → -006, CR-4 → -007. CR-6 (low/medium) entered by QA as
-008. All anchors resolve (`finding-anchors.js`, `--rev HEAD`).

**Correctness bugs (6):**
- [high/high] `shared/resources/security-probe.mjs:2250` — expected.absent / fixture.files collision → TASK-180-004
- [medium/high] `shared/resources/security-probe.mjs:2346` — other shell diagnostics read as refusal → TASK-180-005
- [medium/high] `shared/resources/security-probe.mjs:2324` — diagnostic branch before `expected` → TASK-180-006
- [low/high] `shared/resources/security-probe.mjs:1020` — declined run loses slot → TASK-180-007
- [low/high] `shared/resources/security-probe.mjs:2300` — a command backgrounded past the spawn outlives the case → **pre-existing** (provenance: the `shell:` arm on `origin/develop` has the identical exposure; it is the stated limit in `probe-boundary-rule.md` §5) → `recommendations.future`, not `top_issues[]`
- [low/medium] `shared/resources/security-probe.mjs:2050` — platform-variance: CRLF → TASK-180-008

**Cleanups (1):**
- `shared/resources/security-probe.mjs:2319` — a signal is reported as a timeout → future

**Mutation proofs (cycle 1's fixes):** F1 parse-failure branch → covered; F2 fence key → covered;
F3 empty slot → covered; F4 stderr detail → covered (quoted in the implementation report).

**Step 4b:** no runnable-prose file changed since cycle 1 beyond one-clause edits; re-run not needed
(the edited blocks are prose, not fenced).

---

## Test Artifacts

### Test Commands Executed
```bash
npm run ci:fast   # 5380 pass, 0 fail at bdbedcdf (the fix commit)
command node shared/resources/security-probe.mjs --sink path --entry 'shared/resources/security-probe.mjs#resolveEntry' --cases-file task.180.qa.1.security.cases.json --name 'resolveEntry fence: branch' --record task.180.qa.2.security.run.json
command node shared/resources/security-probe.mjs --sink filename --entry 'fence:shared/resources/develop-pipeline-step-3-develop-loop.md#Precondition — the gate must resolve before the first iteration' --slot '<fastGateCommand>' --cases-file shared/resources/tests/fixtures/fence-probe/t167-cases.json --name 'fast-gate precondition via fence:' --record task.180.qa.2.security.run.json
```

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one HIGH (TASK-180-004) and two MEDIUM in the fence: scoring order.
**Quality Score**: 60/100
**Deployment Recommendation**: BLOCKED

**Next Steps**: `/qa-fix` TASK-180-004..008 in one pass over `runFenceCase`'s scoring order.
