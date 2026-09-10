# QA Report: Task 101 — fail fast on a missing `fastGateCommand` (Cycle 2 — refute pass)

**Task**: [task.101.fast-gate-command-existence-check.md](./task.101.fast-gate-command-existence-check.md)
**Gate File**: [task.101.gate.2.fast-gate-command-existence-check.yml](./task.101.gate.2.fast-gate-command-existence-check.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-10
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2 is the mandatory **refute pass** — the whole branch diff re-read to find the claim that is
*false*, not to confirm the change works. Cycle 1's fix holds: its replacement claims were tested
against the engine and survived. The pass found **one new MEDIUM in the original change**, and it is
the kind cycle 1 could not have caught because cycle 1's own check used the wrong reference point.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Review Methodology

**Re-review scope**: unscoped — whole `origin/develop...HEAD` diff (cycle 2 rule: `PRIOR_GATES=1` →
`REFUTE_PASS=true`). `SAFETY_REPROBE=false`, computed from cycle 1's gate: the security axis read
`OK reasoned`, which is a clean reading, not a missing one.

The cycle-2 narrowing is deliberately *not* applied: the files changed since the last gate are
exactly cycle 1's own fix, so a narrowed pass would read only the repair and never re-read the
original change with what cycle 1 learned. That is precisely what happened here — the new finding is
in the original change, at a location cycle 1's fix never touched.

Step 3b diff code review performed inline rather than via an Explore subagent (session Agent-tool
constraint), with the refute directive applied.

---

## Re-Review Context

| Previous finding | Status | Verification |
| --- | --- | --- |
| **T101-001** — §8 asserted `qa-task` Step 4b as the verification route | **FIXED** | §8 now names `evals/shared/tests/fast-gate-precondition.test.mjs` and records why Step 4b cannot be the route. Both of its new factual claims were **refuted against the engine and survived** — see below. |

### The fix's own claims, tested rather than accepted

A fix is new code, so cycle 1's replacement text was treated as a claim to disprove:

| Claim now in §8 | Refutation attempt | Result |
| --- | --- | --- |
| `blocks=6, {runnable:0, placeholder:2, mutating:4}` | Re-ran the engine over the current file | Measured `blocks=6, {runnable:0, placeholder:2, mutating:4}` — **matches** |
| "No amount of `--bind` or `--copy` changes that" | Re-ran with `--bind fastGateCommand='npm run ci:fast' --copy .` | `runnable` still `0` — **claim holds** |

Both survive. The fix is sound.

---

## New Findings This Cycle

### **[MEDIUM] T101-002** — `shared/resources/develop-pipeline-step-3-develop-loop.md:153` — the precondition is positioned where a reader executing the loop will not reach it in time

The document's heading structure:

```
 88  ## Develop Loop — Run Until Complete (Bounded)
 92  ### LOOP (both orchestrators — execute identically)      ← the reader executes from here
128  ## Test Failure Triage (…applies inside /develop)         ← reached WHEN A TEST FAILS
132  ### What the loop runs — the fast gate
153  ### Precondition — the gate must resolve before the first iteration   ← the new block
201  ### Output Capture Pattern
```

The precondition's own text says *"Run this once, before the loop's first iteration."* But it lives
under **Test Failure Triage**, and nothing at the loop's entry point (line 88 or 92) directs a reader
there. The section a reader consults *after a failure* is where the instruction that prevents the
failure has been filed. By the time they arrive, the loop has already died mid-iteration — **which is
the exact failure mode this task exists to remove**.

**Why cycle 1 passed it, stated plainly.** Cycle 1 asserted placement as *"the precondition's index in
the document precedes `### Output Capture Pattern`"* — and that assertion is true, and it is also
satisfiable without the property it was meant to establish. The Output Capture Pattern was the wrong
reference point; the right one is the loop's control flow. A check that passes for a reason unrelated
to what it is checking is the vacuity shape this repo's mutation-proving rules exist to catch, and it
occurred here in a *structural* assertion rather than a test.

**The sibling documents inherit it, and this is one finding rather than two.** The qa-fix cycle and
`develop-bug`'s verify cycle now both assert *"the develop loop checks the named script resolves
before its first iteration, so by the time this cycle runs the key has already been proven to name a
real script."* That claim is only as true as the precondition's firing. `develop-bug` Step 3 does
reference this document for its bounded loop and triage, so it is not flatly false — it is
conditional on the same root cause. Fixing placement fixes all three; reporting them separately would
inflate the count without adding information.

**Suggested action**: add a forward pointer at the top of `## Develop Loop — Run Until Complete
(Bounded)`, before `### LOOP`. Then close the regression hole — extend the dedicated test to assert
the loop section references the precondition, so the link cannot silently disappear.

---

## Four-transition probe (refute directive)

The directive requires probing bulk teardown, in-flight, error path and reconnect for anything
touching emission, subscription, caching or lifecycle.

| Transition | Applies? | Finding |
| --- | --- | --- |
| Bulk teardown | No | The precondition holds no state and subscribes to nothing. |
| In-flight | No | Runs once, before the loop; no concurrent input exists. |
| **Error path** | Yes | `npm run 2>/dev/null` on a host with no npm, or no `package.json`, yields empty output → the check HALTs saying the project "does not define" the script. Direction is right; the message misattributes the cause. Already recorded as Optional in cycle 1; not re-raised. State is not stranded — HALT is terminal and recoverable by config. |
| Reconnect | No | No connection. |

**Combination review** (the diff re-read as one change): the guard narrowing and the new table
interact — the table supplies the `npm run lint` token that made `lint` need classifying. Probed for
a compounding defect and found none: `npm run build 2>/dev/null` (a real script with stderr
discarded) is still **seen**, so the exemption cannot mask a real invocation introduced by the table.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full hermetic suite (`npm run ci:fast`) after cycle 1's fix | PASS — 3033 passing, 0 failing |
| Eval fixtures encoding step-3 behaviour | No drift. `evals/develop-task/protocol/{pipeline-shape,step-contract}.test.mjs` reference the step-3 file and require keywords `develop`, `loop`, `MAX_ITER` — all still present. No scenario fixture encodes the fast gate. |
| CI/gate parity | PASS — unchanged |
| Bundle / catalog freshness | PASS — unchanged |

---

## Mutation-Proof Spot Check (Step 3c)

Cycle 1's fix was a documentation correction with no new executable invariant, so there is no new
test to mutation-prove this cycle. The five mutations from cycle 1 remain valid and were not re-run.
**Not** recorded as "every invariant mutation-proven" — 5/5 were proven in cycle 1, 0 were added in
cycle 2, and stating it that way is the point.

---

## NFR Assessment

- **Performance** — PASS. Unchanged.
- **Security** — PASS, `reasoned`, 0 probes. Unchanged from cycle 1.
- **Maintainability** — PASS. Unchanged.
- **Reliability** — **CONCERNS**. The check is reliable; what is not established is that it *fires*.
  Its position makes reaching iteration 1 without it the likely path. This is a reliability property
  of the deliverable rather than of the snippet, and it is the same root cause as T101-002.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: 0 HIGH. One MEDIUM found by the refute pass, in the original change rather than in the
fix — placement relative to the loop's control flow. Cycle 1's finding is verified closed and its
replacement claims survived refutation.
**Quality Score**: 90/100

**HIGH findings**: 0 (cycle 1: 0 → cycle 2: 0)

**Deployment Recommendation**: CONDITIONAL — add the loop-entry pointer.

---

**Next Steps**: `/qa-fix` cycle 2 — add the forward pointer and assert it in the test.
