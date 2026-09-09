# QA Report: Task 85 — Give `/review-pr` a machine-readable findings block (cycle 2)

**Task**: [task.85.review-pr-machine-readable-findings.md](./task.85.review-pr-machine-readable-findings.md)
**Gate File**: [task.85.gate.2.review-pr-machine-readable-findings.yml](./task.85.gate.2.review-pr-machine-readable-findings.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-09
**Gate Status**: PASS

---

## Executive Summary

All three cycle-1 findings are fixed, and each fix is pinned by an assertion that was shown to go red
when the fix is reverted. The mandatory cycle-2 refute pass over those fixes found nothing. One LOW
finding remains — an asymmetry the fixes made visible rather than introduced — whose remedy is
explicitly out of this task's scope.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Id | Sev | Finding (cycle 1) | Status | Verification |
| --- | --- | --- | --- | --- |
| TASK85-001 | HIGH | Block-to-output mapping contradicted itself and omitted three fields | **FIXED** | Replaced by an 8-row per-field table. Verified **mechanically in both directions**: every one of the 7 block fields has a row, and every one of the 6 output fields is a destination — no uncovered field either way. 4 assertions added, all mutation-proven (M14–M17). |
| TASK85-002 | MEDIUM | Template yaml block used literal example values under "use this exact template structure" | **FIXED** | Converted to the template's brace convention plus a lens-ordering comment. Verified the result is still **valid YAML** (`yaml.safe_load` parses it) — a `yaml`-tagged fence holding unparseable content would have traded one defect for another. |
| TASK85-003 | LOW | `truncated_count` summing conflicted with the field's schema comment | **FIXED** | Replaced with a paragraph naming what each count measures and why the sum answers the consumer's question. |

### Review Methodology

**Re-review scope: unscoped (cycle 2 — mandatory whole-branch refute pass).** `PRIOR_GATES=1`, so per
`qa-task` Step 3b the scope is the whole `origin/develop...HEAD` diff reviewed **to refute**, not the
narrowed since-last-gate slice. `SAFETY_REPROBE=false` — cycle 1's security axis read `PASS` with
`evidence: reasoned`, which is a clean reading, not an unverified one.

Direct tools, performed inline (this repository's standing instruction bars dispatching the Agent tool
unless the user asks). The substitution is recorded rather than left implied.

---

## Refute Pass — what was probed, and what it found

The refute directive asks for the claim that is **false**, starting with cycle 1's fixes, and names
four lifecycle transitions. Three of the four have no analogue in a prose contract; the fourth
(error path) does, and was probed. What was actually checked:

| Probe | Result |
| --- | --- |
| Is every claim in the new mapping table true against the output schema? | **Yes.** `severity` values match (`high\|medium\|low` both sides); `suggested_fix_path` really does hold a description not a path (the schema comment says so); `category` and `confidence` really are absent from the output schema; `source: pr-review` really is in its enum. |
| Is the table exhaustive in **both** directions? | **Yes.** 7 block fields → 7 rows; 6 output fields → 6 destinations. Checked mechanically, not by eye. |
| Is the rewritten template block still valid YAML? | **Yes** — it parses. The brace placeholders are flow mappings. |
| Does the bundled copy match the source? | **Yes** — identical modulo the AUTO-GENERATED header the bundler adds. |
| **Error path**: what does the ingester do with a block that is present but malformed — a non-list `findings:`, or an entry missing a field? | **Unspecified.** Judged not a finding: the rendered fallback has the same silence about a malformed header, so this is a pre-existing property of the contract rather than something the change introduced, and specifying it would widen scope. Recorded here so the next cycle does not re-derive the judgement. |
| Do the two fixes **interact** badly? (the refute directive's "review the combination") | **No.** TASK85-001 touches the consumer's mapping table; TASK85-002 touches the emitter's template placeholders. The only shared surface is the field names, and the exhaustiveness check above reads both files. |

### One finding the refute pass did surface

`truncated_count` is carried across on the block path and silently dropped on the fallback path — see
TASK85-004 below.

---

## New Findings This Cycle

- **[low]** `shared/resources/qa-findings-ingester-prompt.md` — the block path is told to carry
  `truncated_count` across; the rendered fallback is not. `/review-pr` Step 6 emits the omitted count
  as free prose, and the fallback section never says to parse it, so on a legacy report with truncated
  findings the ingester under-reports. **Pre-existing** — the old ingester did not parse it either —
  and newly visible only because the block path now states the opposite. Its remedy needs a stable
  text shape for the rendered note, which §4 Out of Scope explicitly forbids changing here.
  → Either parse the note, or state plainly that the count is unavailable on the legacy path so an
  under-report is not read as a zero. **[TASK85-004]**

Searched unscoped (cycle 2 refute pass): full `origin/develop...HEAD` diff, 8 files. Re-derived the
block↔output field correspondence from the two subagent schemas and the output schema independently,
rather than re-reading the table and agreeing with it.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1 — Emit the block from `/review-pr` | PASS | Verified | Section, tagged fence, schema, normalisation rule, empty-emit rule, placeholder convention |
| Phase 2 — Teach the ingester to prefer the block | PASS | Verified | Preference, fallback, re-scoped warning, and now an exhaustive mapping table |
| Phase 3 — Re-pin the contract | PASS | Verified | 25/25 green; 17 mutations proven across both cycles |

**Overall Phase Completion**: 3/3.

---

## Success Criteria Verification

| # | Criterion | Status |
| --- | --- | --- |
| 1 | Rendered findings **and** a `yaml` block | PASS |
| 2 | Section emitted even when empty (`findings: []`) | PASS |
| 3 | `ref` for both lenses, `CR-*` from `file_line` | PASS |
| 4 | Ingester prefers the block, states precedence, parses legacy | PASS |
| 5 | `severity:` warning scoped to the rendered shape | PASS |
| 6 | `task.66.pr-review.1` still parses via the fallback, asserted | PASS |
| 7 | Each new assertion mutation-proven | PASS — 17/17 across both cycles |
| 8 | `npm run bundle` run, regenerated copies committed | PASS — 1 consumer, verified byte-identical modulo the generated header |
| 9 | `/review-pr` advisory contract unchanged | PASS |
| 10 | **Full `npm run ci` green** | **PASS** — exit 0, fast tier **and** `eval:all` |

Criterion 10 was PARTIAL in cycle 1 (only `ci:fast` had run). The slow tier was run here rather than
deferred to the merge gate, because the criterion says *full* `npm run ci` and a criterion marked
PARTIAL at acceptance is a criterion nothing verified.

---

## Breaking Changes Validation

Unchanged from cycle 1: none declared, and independently verified — the rendered sections are
byte-identical in the diff, the verdict table and 5c routing are untouched, and the one real legacy
report on disk is asserted to still match the fallback shape. **PASS**

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (0)

None.

### LOW Severity Issues (1)

**TASK85-004** — `truncated_count` asymmetry on the legacy fallback path. Documented above; no bug
file (LOW severity, per Step 9).

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1

---

## NFR Assessment

### Performance — PASS

No runtime code. Full `npm run ci` (fast tier + `eval:all`) completed green.

### Reliability — PASS

Additive; the legacy fallback is preserved and pinned against a real pre-block report rather than a
synthetic fixture. Rollback is one revert plus `npm run bundle` — no migration, no state.

### Security — PASS

- **Status**: PASS
- **Evidence**: `reasoned`
- **Probes executed**: 0
- Unchanged from cycle 1 and re-confirmed against the cycle-2 diff: documentation and contract-test
  change only. No executable code, no new inputs, no auth, network or data surface. The verdict was
  reached by reading; `reasoned` is the accurate value, and `measured` with zero probes would be a
  schema error.

### Maintainability — PASS

Cycle-1 CONCERNS resolved. The mapping is now a table whose exhaustiveness can be checked
mechanically — and was.

---

## Code Review

Step 3b, cycle 2, **refute pass** over the whole branch diff, performed inline. `CR_BLOCKING=true`.

**Correctness bugs (0):** none. The refute pass probed the fixes and their combination; results in the
table above.

**Cleanups (0):** none outstanding — cycle 1's single cleanup (TASK85-003) was fixed.

### Mutation-proof spot check (Step 3c)

`mutation-proven: yes` for every assertion guarding a cycle-1 fix.

| # | Mutation | Occurrences before → after | Result |
| --- | --- | --- | --- |
| M14 | "**No field carries across by name**" softened | 1 → 0 | red |
| M15 | the `confidence` row removed from the mapping table | 1 → 0 | red |
| M16 | the `**Dropped.**` markers removed | 2 → 0 | red |
| M17 | the lens-ordering comment removed from the template | 1 → 0 | red |

**Before/after counts are reported deliberately.** In cycle 1, mutation M5 first read STILL GREEN
because the mutation had never applied — the sentence occurs twice and wraps at a different word each
time, and the `perl` pattern matched neither. "The test stayed green" and "the edit did not happen"
are byte-identical from the runner's output, so a mutation table without occurrence counts cannot be
audited. Two further probe misreadings this cycle had the same shape and are recorded where they
occurred.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `pr-review-loop-parity.test.mjs` | PASS — 25/25 (22 pre-existing + 3 from this task, one of which gained 4 assertions in cycle 1's fix) |
| `skills/review-pr/tests/review-pr.test.js` | PASS — 52/52 |
| Full `npm test` | PASS — 2965 tests, 0 failures |
| `npm run eval:all` | PASS — replay fixtures across develop-task, develop-story and develop-next |
| `prettier --check .` | PASS |
| Bundled consumer parity | PASS — verified by diff, not by the bundler's own report |

---

## Test Artifacts

### Test Commands Executed

```bash
npm run ci
node --test evals/shared/tests/pr-review-loop-parity.test.mjs
node --test skills/review-pr/tests/review-pr.test.js
```

### Step 4b — Documented-command execution

Not re-run: cycle 2 changed the template's placeholder text inside `skills/review-pr/SKILL.md` but
added, removed and altered no fenced `bash` block. Cycle 1's result stands — 1 runnable block, clean
under both bash and zsh; 12 refused by design.

---

## Recommendations

### Immediate Actions (Blocking)

None.

### Short-term Actions (Non-Blocking)

1. **TASK85-004** — resolve the `truncated_count` asymmetry on the fallback path.
2. Consider a success criterion requiring the mapping to be unambiguous. The current ten could be
   fully satisfied by the contradictory mapping cycle 1 found, which is how it reached QA.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: No HIGH or MEDIUM findings. Deterministic rules 1–4 do not fire; all four NFRs PASS.
The single LOW is pre-existing and its remedy is out of scope by the task's own §4.
**Quality Score**: 95/100 — 100 − 5 (1 LOW). Stated explicitly, as in cycle 1, because the schema's
NFR-based formula would return 100 and hide the finding.

**Deployment Recommendation**: APPROVED
**Conditions**: none.

---

**Next Steps**: Step 5c — `/review-pr` over PR #363 is the loop's exit gate. A clean gate hands to it;
it does not by itself exit the loop.
