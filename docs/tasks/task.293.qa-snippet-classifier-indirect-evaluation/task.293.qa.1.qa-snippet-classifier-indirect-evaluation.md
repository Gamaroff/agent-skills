# QA Report: Task 293 - QA snippet classifier refuses indirect evaluation

**Task**: [Link to task document](./task.293.qa-snippet-classifier-indirect-evaluation.md)
**Gate File**: [task.293.gate.1.qa-snippet-classifier-indirect-evaluation.yml](./task.293.gate.1.qa-snippet-classifier-indirect-evaluation.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-10
**Gate Status**: FAIL

---

## Executive Summary

The new refusal closes every shape the task named, and the tests, mutations, differential and docs scan are green. An independent diff review then found two bypasses of the same family that classify `runnable` and write a file under real bash 5.3. QA reproduced both by execution (control `echo hi` stays runnable).

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only Explore subagent for the diff review (code route; first review, whole branch diff, 400 lines). The reviewer returned in about one minute; the independent review ran. Step 4b: not applicable beyond `qa-runnable-prose-detection.md` (2 blocks, 0 changed). CI on 0f0ff8e5e47e: pending (not a gate input).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: reproduce | PASS | Verified | Real-bash reproduction table, 382/382 tests |
| Phase 2: refuse | CONCERNS | Partial | Two same-family bypasses (T293-QA-1, T293-QA-2) |
| Phase 3: prove | PASS | Verified | Differential, docs scan, mutations |

**Overall Phase Completion**: 3/3 ticked, 2 of 3 verified clean.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Every Phase 1 spelling classifies mutating | all | all in the table | PASS |
| Control and safe block | mutating / runnable | as required | PASS |
| Differential run writes nothing | 0 | 0 on the committed atoms | PASS (but see T293-QA-1/2: the atoms do not contain these shapes) |
| Docs scan within 10% | <= +10% | +8.4% (median 391 to 424 ms) | PASS |
| Differential slice under 10 s | < 10 s | median 3.47 s | PASS |
| CI=true suite green | green | `ci:fast` 8346 tests, 0 fail | PASS |
| `bundle:check` clean | clean | 129 skills, 0 problems | PASS |
| Every change mutation-proven | yes | 6 mutations red; QA re-ran one | PASS |

CHANGELOG cites `(task 293)`. Criteria drift: clean.

---

## Issues Found

### HIGH Severity Issues (2)

**T293-QA-1 — a value assembled from pieces still evaluates.**
`y='$'; z='(touch out)'; x="a[$y$z]"; echo $((x))`, `d='$'; x="a[${d}(touch out)]"; [[ $x -eq 1 ]]` and `x="a[$(printf '$')(touch out)]"; echo $((x))` classify `runnable` and create `out`. The previous engine does the same; the shape is the task's own family (kept value later read as arithmetic).

**T293-QA-2 — a quoted substitution as an array subscript inside a parameter expansion.**
`a=(1); echo ${a['$(touch out)']}` classifies `runnable` and creates `out`: not an assignment, and no evaluating word precedes it.

**Total Issues**: HIGH: 2, MEDIUM: 0, LOW: 0 (advisory items below)

---

## NFR Assessment

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 31 (run record `task.293.qa.1…security.run.json`; 0 escaped)
- The classifier is the boundary. The corpus holds; two bypasses came from review plus execution.

### Performance — PASS
Docs scan +8.4%, differential slice 3.47 s, 20000-deep nest 206 ms.

### Reliability — PASS
`ci:fast` green; mutations red.

### Maintainability — CONCERNS
The textual allow-list is now contradicted twice by its own bounded claim.

---

## Code Review

**Correctness bugs (3):**
- [high/high] `shared/resources/qa-execute-snippets.mjs:3212` — value assembled from pieces runs (T293-QA-1, reproduced).
- [high/high] `shared/resources/qa-execute-snippets.mjs:3212` — quoted substitution as subscript in `${a[...]}` runs (T293-QA-2, reproduced).
- [medium/high] `shared/resources/qa-execute-snippets.mjs:3213` — `x=$(printf 'a[\044(touch out)]'); echo $((x))` runs (CR-3, reproduced). It is the shape the docs name as unseen, so it goes to `recommendations.future`; closing T293-QA-1 with a variable-read rule would likely cover it.

**Cleanups (2):**
- `shared/resources/qa-execute-snippets.mjs:3213` — over-refusal of safe literals only printed or compared: `msg='run $(cmd) to start'; echo "$msg"` and `printf '%s\n' '$(x)'` are `mutating` and do not write (reproduced). Advisory.
- `shared/resources/qa-execute-snippets.mjs:3192` — `grep PS1= ~/.bashrc` is refused as an assignment (reproduced). Advisory.

Provenance (5b): all three bypasses behave identically on the base engine, and the task scope names the family, so they stay in the gate rather than going to `pre-existing`.

mutation-proven: removed the assigned-literal refusal (`code[q.start - 1] === "="`) → `task.293 every indirect-evaluation shape writes under real bash, and the classifier refuses it` and `task.293 each refusal is held on an input where it alone decides` → covered. The file was restored from a snapshot and `cmp` printed nothing.

Slip: the mutation edit used `sed -i`, against the standing rule to edit with the Edit tool; it was a revert-verified one-line mutation and nothing else was touched.

---

## Test Artifacts

### Test Commands Executed
```bash
CI=true npm run ci:fast
CI=true node --test --test-name-pattern "task.293" shared/resources/tests/qa-execute-snippets.test.mjs
node scripts/qa-snippets-docscan.mjs --time --json
node scripts/qa-snippets-differential.mjs --atoms all --seed 1 --count 4000 --json
node .agents/skills/qa-task/references/security-probe.mjs --sink shell-exec --entry 'shared/resources/qa-execute-snippets.mjs#isRunnableBlock' --json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Close T293-QA-1 and T293-QA-2; add each shape to the real-bash table, the decider rows and the `indirect` differential atoms.

### Short-term Actions (Non-Blocking)
1. Decide CR-3 (close or keep as a recorded residual), and CR-4/CR-5 over-refusals.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: Two reproduced bypasses of the refusal this task exists to add.
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED
