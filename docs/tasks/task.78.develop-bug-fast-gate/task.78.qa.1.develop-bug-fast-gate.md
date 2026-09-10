# QA Report: Task 78 — Give develop-bug's fix cycle the same fast gate as the other pipelines

**Task**: [task.78.develop-bug-fast-gate.md](./task.78.develop-bug-fast-gate.md)
**Gate File**: [task.78.gate.1.develop-bug-fast-gate.yml](./task.78.gate.1.develop-bug-fast-gate.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-04
**Gate Status**: CONCERNS

---

## Executive Summary

The change does the thing it set out to do, and does it at the right place: the gate sits between
5b's no-change HALT and its commit, which is the ordering TASK-75-001 named as the mistake to avoid,
and the parity test is genuinely iterated rather than passing on its first element — verified by
mutating all three documents, not one.

Three MEDIUM findings, none of them in the gate's behaviour. Two are **port artifacts**: prose
carried across from the qa-fix loop into a document whose local numbering and templates differ, in a
task whose own §3 warned that "this is not a copy-paste". The third is a doc sweep the task did not
plan — the same widening task 75's review found necessary for the same key.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All 4 implementation phases marked complete
- [x] Tests passing
- [x] Breaking changes documented (declared None — verified correct)
- [x] Code on feature branch `feature/task.78.develop-bug-fast-gate` with open PR #314

### Testing Approach

- [x] Automated testing (full hermetic suite + targeted contract test)
- [x] Mutation proving (independently re-run, not taken from the implementation report)
- [x] Regression testing
- [x] Code review (Step 3b)
- [x] Documentation cross-reference sweep

### Review Methodology

Direct tools. Four phases but a single module, `risk_level: low`, and a change set of three files —
the Adaptive Review Strategy's default ("direct tools first; spawn agents if gaps found") applies and
no gap emerged that agents would have closed. First review, so no re-review scope decision applies.

**Step 4b: not applicable — no runnable prose in the change set** by the letter of the rule. See the
LOW observation below, which is about the rule rather than about this change.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Locate the seam | PASS | Verified | Seam is 5b step 3 (`git diff --stat HEAD` → HALT) → step 4 (commit). Confirmed by reading the file, not by trusting the report. The "no shell variable" claim also checks out: this document tracks its counter as `{N}` in prose; `${QA_CYCLE}` appears only in the qa-fix loop. |
| Phase 2: Add the gate | CONCERNS | Verified | Block is correctly placed and correctly worded on the two things the task flagged (config key not literal; 2-attempt budget without the removed `MAX_ITER` claim). Two prose defects introduced by the port — TASK-78-001 and TASK-78-002. |
| Phase 3: Parity test | PASS | Verified | `LOOP_DOCUMENTS` names all three at their authoritative sources. Mutation-proved independently. |
| Phase 4: Bundle drift check | PASS | Verified | `npm run bundle` produces no diff. The rewritten Phase 4 predicted exactly this, and the prediction is what makes the step meaningful rather than ceremonial. |

**Overall Phase Completion**: 4/4 complete, 1 with findings.

---

## Success Criteria Verification

### Functional

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Fix loop runs `<fastGateCommand>` before committing | Yes | Yes — step 3a | PASS |
| Gate sits at the file's own pre-commit seam, after any no-change check | Yes | Between step 3 (HALT) and step 4 (commit) | PASS |
| Retry budget stated as 2 attempts without the `MAX_ITER` claim | Yes | Yes, and states explicitly why the claim is not made | PASS |

### Regression

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| The other two loop documents unchanged | 0 edits | 0 edits (`git diff --stat` touches neither) | PASS |
| No new check added | Same tier, same command | `develop.fastGateCommand`, unchanged | PASS |

### Safety

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Parity test fails if any one of the three loses the gate | Yes | Mutation-proved on all three | PASS |

### Code Quality

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Full hermetic suite | 0 failures | 2320 tests, 2319 pass, 0 fail | PASS |
| `npm run ci:fast` (format + tests) | exit 0 | exit 0 | PASS |
| Documentation consistent | Updated | 3 sites stale — TASK-78-003 | CONCERNS |

---

## Breaking Changes Validation

### Breaking Change: none declared

Documented: N/A · Migration Path: N/A · Consumer Code Updated: N/A

**Verified correct.** The change can only *prevent* a commit that would previously have happened, and
only when the tree is red. No run that previously passed can now fail, and no consumer configuration
changes: a project with no `develop.fastGateCommand` gets the same default the other two loops already
resolve.

**Overall Breaking Changes Assessment**: PASS

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (3)

**TASK-78-001 — "step-3" resolves to the wrong step in this document**

- **Severity**: MEDIUM · **Category**: Quality (correctness of runnable prose)
- **Location**: `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md:173`
- **Observation**: the block says *"Triage per the step-3 pattern"*. That phrase is unambiguous in
  the qa-fix loop it came from, whose local sub-steps are numbered 0/0a/1/2 — there is no local step
  3, so it can only mean the pipeline's Step 3. This document's 5b **does** have a step 3: the
  no-change check. The same added block refers to it in that local sense twice, at lines 153 and 189.
- **Impact**: an agent following the document literally resolves the wrong referent, and the one it
  lands on is a `git diff --stat` HALT check containing no triage at all. The instruction becomes a
  no-op precisely on the red-gate path, which is the only path it governs.
- **Recommendation**: name the target rather than numbering it — *"Triage per the develop loop's
  test-failure triage (`develop-pipeline-step-3-develop-loop.md` §Test Failure Triage)"*.
- **Priority**: P2

**TASK-78-002 — the gate's failure output has nowhere to go**

- **Severity**: MEDIUM · **Category**: Quality
- **Location**: same file, line ~178; templates at lines 60–66 and 71–77
- **Observation**: the block directs a failing gate's output to *"the Verify Cycle entry"*. That entry
  is a fixed five-field template — Regression test / Suite + lint / Code review / Verdict / Action —
  with no slot for a gate result, as is the tracker-comment template mirroring it. The qa-fix loop's
  equivalent points at the free-form QA Iteration History; the instruction survived the port, the
  place it names did not.
- **Impact**: an agent invents a field or drops the output. A twice-red gate that leaves no trace in
  the cycle record is exactly the invisibility this step exists to remove — the gate would fire
  correctly and report nothing.
- **Recommendation**: add `**Fast gate**: {pass / fail — log path}` to both templates. Recording it
  every cycle rather than only on failure is what makes a *green* gate auditable instead of assumed.
- **Priority**: P2

**TASK-78-003 — three live docs still say the gate runs in two places**

- **Severity**: MEDIUM · **Category**: Documentation
- **Locations**: `docs/reference/configuration.md:96`, `docs/reference/configuration.md:178`,
  `skills/develop-next/SKILL.md:200`
- **Observation**: all three describe `develop.fastGateCommand` as running in the develop loop and
  each qa-fix cycle. It now runs in three places. The task's §7 listed three files to modify and
  planned no sweep.
- **Impact**: consumer-facing reference documentation understates where a configured command runs —
  the axis a consumer reads when deciding what to put in `skills-config.yaml`.
- **Note on coverage**: `ci-gate-parity.test.mjs` already reads `configuration.md`, but asserts only
  the default *value*. The stale prose sits inside a file the test opens and passes over, which is
  why this needed a manual sweep to find.
- **Historical records are correctly excluded**: the roadmap change log and task 75's own artifacts
  describe what was true when written and must not be edited.
- **Recommendation**: update the three live sites.
- **Priority**: P2

### LOW Severity Issues (2)

- **L1 — the Step 4b rule has this task's own blind spot, one layer up.**
  `shared/resources/qa-runnable-prose-detection.md` §1 fires only for a `SKILL.md` or a
  `shared/resources/*.md`. The document changed here is `skills/develop-bug/references/*.md` —
  skill-native — so the runnable-prose check structurally cannot fire on it, which is the same
  `shared/resources/`-shaped blind spot that let task 75 miss this file. Practical impact on *this*
  diff is nil: the added block is `placeholder`-class (`<fastGateCommand>`, `{N}`) and would not have
  been executed even if the rule had fired. Recorded as a future item, not folded in — this task's
  §4 explicitly excludes adding checks, and widening the rule deserves its own review.

- **L2 — `LOOP_DOCUMENTS.length === 3` is a deliberate tripwire with a cost.** Adding a legitimate
  fourth loop document fails the test until the constant is bumped. That is the intended behaviour —
  it is what stops an entry being silently dropped — but it is friction on a valid change, and worth
  naming so the next person reads the failure as a prompt rather than a bug.

**Total Issues**: HIGH: 0, MEDIUM: 3, LOW: 2

---

## NFR Assessment

### Performance — PASS

Adds one fast-tier run per develop-bug fix cycle, bounded at 2 attempts. The slow tier is excluded by
design and the gate sits after the no-change check, so the path that always HALTs pays nothing —
which is the specific cost TASK-75-001 was about. The parity test adds one file read.

### Reliability — PASS

Placement verified by reading the file: after the step-3 HALT, before the step-4 commit. The retry
bound is stated as 2 attempts and explicitly declines to claim `MAX_ITER` bounds it — the correction
task 75's QA made, which this task warned against un-making. Mutation proving was re-run
independently for this review rather than taken from the implementation report.

### Security — PASS

No executable code changed. The added block introduces no new command, credential path or network
call; it invokes the same configured `<fastGateCommand>` the other two loop documents invoke.

### Maintainability — CONCERNS

TASK-78-001 and TASK-78-002 are both port artifacts, in a task whose own §3 warned "this is not a
copy-paste" about the gate's *placement*. The warning turned out to apply equally to the block's
prose — its cross-references and the templates it writes into. TASK-78-003 leaves three consumer docs
understating the change. None affects behaviour; all three affect whether the next reader can follow
it.

---

## Code Review

Step 3b, whole-branch diff (first review), read-only.

**Correctness bugs (2):**

- [medium/high] `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md:173` — "step-3"
  collides with 5b's own step 3 → name the develop loop's Test Failure Triage explicitly (TASK-78-001)
- [medium/high] `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md:178` — failure
  output directed at a template with no field for it → add a `**Fast gate**` line to both templates
  (TASK-78-002)

**Cleanups (1):**

- `evals/shared/tests/ci-gate-parity.test.mjs:305` — `read()` uses bare `readFileSync`, so a mistyped
  path in `LOOP_DOCUMENTS` fails with a raw ENOENT rather than naming the list it came from. Pre-existing
  in this file and not introduced here; noted, not raised.

**mutation-proven**: yes — for the parity assertion, all three documents, re-run for this review.

The gate's own behaviour, the placement, the retry bound and the config-key-not-literal rule all
verified clean.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Other two loop documents | PASS — untouched; `git diff --stat` confirms |
| Rest of `ci-gate-parity.test.mjs` (9 other tests) | PASS |
| Full hermetic suite | PASS — 2320 tests, 0 failures |
| Bundle idempotency | PASS — `npm run bundle` yields no diff |

No regressions.

---

## Test Artifacts

### Files Reviewed

- `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`
- `evals/shared/tests/ci-gate-parity.test.mjs`
- `docs/tasks/task.78.develop-bug-fast-gate/task.78.develop-bug-fast-gate.md`
- `CHANGELOG.md`
- Cross-referenced: `shared/resources/develop-pipeline-step-5-6-qa-loop.md`,
  `docs/reference/configuration.md`, `skills/develop-next/SKILL.md`,
  `shared/resources/qa-runnable-prose-detection.md`

### Test Commands Executed

```bash
npm run ci:fast                                        # exit 0 — 2320 tests, 2319 pass, 0 fail
node --test evals/shared/tests/ci-gate-parity.test.mjs # 10/10 pass
npm run bundle && git status --porcelain               # no diff
# mutation proving, per document:
#   strip <fastGateCommand> + develop.fastGateCommand → re-run parity test → restore
```

---

## Recommendations

### Immediate Actions (Blocking)

1. TASK-78-001 — disambiguate the step-3 cross-reference
2. TASK-78-002 — give the fast-gate result a field in both Verify Cycle templates
3. TASK-78-003 — sweep the three docs that still describe two gate sites

### Short-term Actions (Non-Blocking)

1. L1 — widen the Step 4b runnable-prose rule to skill-native `references/*.md` documents; its own item

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: the gate is correctly placed, correctly bounded, and genuinely held by a
mutation-proved test — the parts that needed judgement are right. Three MEDIUM findings sit around
it: two prose defects the port introduced into a document whose numbering and templates differ from
the source, and one doc sweep the plan did not include. All three are cheap and none touches the
gate's behaviour.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL — on TASK-78-001, TASK-78-002 and TASK-78-003.

---

**Next Steps**: `/qa-fix` addresses the three findings; re-review verifies and the loop's exit gate
(Step 5c `/review-pr`) decides.
