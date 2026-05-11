# QA Report: Task 21 — Pre-`/qa-fix` findings ingester Explore subagent

**Task**: [task.21.qa-fix-findings-ingester-subagent.md](./task.21.qa-fix-findings-ingester-subagent.md)
**Gate File**: [task.21.gate.1.qa-fix-findings-ingester-subagent.yml](./task.21.gate.1.qa-fix-findings-ingester-subagent.yml)
**QA Engineer**: QA Engineer (automated pipeline)
**Review Date**: 2026-05-09
**Gate Status**: PASS (re-review cycle 2)

---

## Executive Summary

Task 21 correctly inserts an Explore subagent as the primary path for QA artifact ingestion in `/qa-fix` Step 1, with the existing inline reads retained as a fallback. Both modified files (SKILL.md and the new shared prompt) implement the design from the plan. Two MEDIUM issues relate to dispatch-instruction ambiguity and placeholder style inconsistency that could cause runtime failures if an implementing agent follows the instructions literally.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (checkboxes marked)
- [x] No automated tests (agent instruction changes — not runnable code)
- [x] Breaking changes: none documented (confirmed correct — no breaking changes)
- [x] Code on feature branch with open PR (#57)

### Testing Approach

Direct tools — read task doc, diff, inspect both changed files for structural and semantic correctness. No parallel agents (small, single-module, Low risk).

### Review Methodology

Adaptive strategy override: direct tools — small task (<3 phases, 2 files, Low risk).

---

## Implementation Verification

| Phase | Status | Notes |
|---|---|---|
| Phase 1: Findings Summary schema | PASS | Schema in ingester prompt matches plan; `suggested_fix_path` described correctly |
| Phase 2: Explore prompt | PASS | Story and task glob patterns present; cap 20; `truncated_count` field; sort rules present |
| Phase 3: Wire into qa-fix Step 1 | PASS | Step 1a primary, Step 1b fallback, Step 1.5 conditional no-op, truncation HALT unconditional |

**Overall Phase Completion**: 3/3 phases passed

---

## Success Criteria Verification

### Functional Criteria

| Criterion | Target | Actual | Status |
|---|---|---|---|
| QA artifacts not loaded inline in Step 1 | Step 1b is fallback only | Step 1a dispatches subagent; Step 1b retained as fallback | PASS |
| Findings Summary risk-sorted | high → medium → low, gate > report > bug | Sort rules specified in prompt Rules section | PASS |
| Fix order matches baseline | Within tolerance | Prompt specifies same priority order as original triage | PASS |
| Step 1.5 retained as fallback | No-op when ingester succeeds | "no-op" path explicitly documented | PASS |
| Truncation halts unconditional | Even in autonomous pipeline | HALT explicitly stated, no auto-acknowledge clause | PASS |

### Performance Criteria

| Criterion | Target | Actual | Status |
|---|---|---|---|
| Main tokens for qa-fix Step 1 reduced | ≥70% | Subagent reads all artifacts; main receives compact YAML summary only | PASS |

### Code Quality Criteria

| Criterion | Target | Actual | Status |
|---|---|---|---|
| Prompt schema clarity | Complete, unambiguous | Schema complete; `suggested_fix_path` clarified both inline and in Rules | PASS |
| Glob patterns coverage | Story and task modes | Both modes present in prompt | PASS |

---

## Breaking Changes Validation

None documented. Confirmed correct — the changes are additive (new Step 1a, Step 1b wraps existing content). Existing behaviour preserved via fallback.

---

## Issues Found

### MEDIUM Severity Issues (2)

**Issue 1: Dispatch instruction uses "Provide" not "Substitute" — ambiguous**
- **Severity**: MEDIUM
- **Category**: Instruction clarity
- **File**: `skills/qa-fix/SKILL.md` — Step 1a, lines 338–341
- **Observation**: Step 1a says `Load the prompt from ... Provide: \`<dir>\`...` The established pattern in this repo (see `create-pr` Step 5, line 241) uses `Substitute \`<DIFF_FILE>\` with the value of $DIFF_FILE. Dispatch:`. The word "Provide" does not clearly instruct the implementing agent to substitute the value into the prompt text before dispatching. An agent may interpret it as "pass as separate context" rather than text substitution.
- **Impact**: Ingester subagent receives `<dir>` literally; artifact discovery globs resolve to nothing; no findings returned; qa-fix falls through to Step 1b silently instead of failing loudly. Context reduction goal not achieved.
- **Recommendation**: Change Step 1a dispatch instruction to match established pattern: `Substitute \`<dir>\` with the absolute path to the story/task directory. Substitute \`{epic}\`, \`{story}\`, or \`{id}\` with the relevant IDs from context. Dispatch:`
- **Priority**: P1

**Issue 2: Mixed placeholder styles in ingester prompt body**
- **Severity**: MEDIUM
- **Category**: Instruction clarity
- **File**: `shared/resources/qa-findings-ingester-prompt.md` — lines 13, 15–22
- **Observation**: The prompt body uses `<dir>` (angle-bracket style) for the directory path but `{epic}`, `{story}`, `{id}` (curly-bracket style) for the IDs in the glob patterns. Two different placeholder conventions in the same file may confuse an implementing agent about which values to substitute.
- **Impact**: An agent may substitute `<dir>` but leave `{epic}` literally in the globs, producing invalid glob patterns that match nothing.
- **Recommendation**: Standardise to one style. Since `<DIFF_FILE>` is the established pattern in this repo, prefer `<dir>`, `<epic>`, `<story>`, `<id>`. Alternatively, standardise all to `{curly}`. Update Step 1a dispatch instruction to match whichever style is chosen.
- **Priority**: P1

### LOW Severity Issues (1)

**Issue 3: Nested code fences in prompt file**
- **Severity**: LOW
- **Category**: Cosmetic/structural
- **File**: `shared/resources/qa-findings-ingester-prompt.md` — lines 7–78
- **Observation**: The YAML output schema block (` ```yaml `) appears inside the outer code fence (` ``` `). This is syntactically non-standard markdown but functionally fine for agents reading raw text.
- **Recommendation**: Consider using indented blocks or a different delimiter (e.g. `---schema---`) for the inner schema to avoid nesting.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 1

---

## NFR Assessment

### Performance — PASS
Task purpose is context-token reduction. Design achieves ≥70% reduction for Step 1 by keeping raw artifacts out of main context. Subagent handles all artifact I/O.

### Reliability — CONCERNS
Two MEDIUM issues (ambiguous dispatch + mixed placeholders) could cause silent fallthrough to Step 1b rather than explicit failure. The fallback path preserves functionality but silently defeats the token-reduction purpose. No data loss risk.

### Security — PASS
No auth, credentials, or sensitive data involved. Explore subagent is read-only. No security surface change.

### Maintainability — PASS
Step 1.5 dual-path clearly documented. Both ingester prompt and SKILL.md changes are well-structured. Minor placeholder ambiguity could cause future confusion when extending patterns.

---

## Regression Testing

| Area | Status | Notes |
|---|---|---|
| Step 1b fallback path | PASS | Existing inline-read content preserved verbatim |
| Step 1.5 fallback branch | PASS | New "When Step 1b ran" clause preserves original behaviour |
| Step 2+ (triage, codebase Explore) | PASS | No changes downstream of Step 1.5; still consumes Findings Summary |
| Shared resources | PASS | New file; no existing file modified in shared/resources/ |

---

## Test Artifacts

### Files Reviewed
- `shared/resources/qa-findings-ingester-prompt.md` (new)
- `skills/qa-fix/SKILL.md` (Step 1 + Step 1.5 modifications)
- `skills/qa-fix/SKILL.md` (Step 2, Step 3 — downstream validation)
- `shared/resources/pr-body-summariser-prompt.md` (reference pattern)
- `skills/create-pr/SKILL.md` line 241 (established Substitute pattern)

### Test Commands Executed
```bash
git diff origin/main...HEAD --name-only
grep -n "Provide\|substitute\|Substitute\|dispatch\|Load the prompt" skills/qa-fix/SKILL.md
grep -n "pr-body\|Substitute\|DIFF_FILE\|Load the prompt\|substitute" skills/create-pr/SKILL.md
```

### Coverage Report
Not applicable — agent instruction changes, no runnable code.

---

## Recommendations

### Immediate Actions (Blocking — Conditional deployment)

1. **Fix dispatch instruction (Issue 1)** — Change "Provide" to explicit "Substitute" pattern in Step 1a of `skills/qa-fix/SKILL.md`. Match the `create-pr` pattern at line 241.
2. **Standardise placeholder styles (Issue 2)** — Unify `<dir>`, `{epic}`, `{story}`, `{id}` to one style in `shared/resources/qa-findings-ingester-prompt.md`, and update Step 1a instruction to match.

### Short-term Actions (Non-Blocking)

1. Consider using non-nested delimiters for the YAML schema block in `qa-findings-ingester-prompt.md` (Issue 3, cosmetic).

---

## Final Assessment

**Gate Status**: ~~CONCERNS~~ → **PASS** (after re-review cycle 2)
**Rationale**: Both MEDIUM issues fixed. Dispatch instruction now uses "Substitute placeholders before dispatching" + explicit `Dispatch: Agent(...)` call. All placeholders standardised to `<angle>` style. All phases verified; fallback path unchanged; no regressions.
**Quality Score**: 93/100

**Deployment Recommendation**: APPROVED
**Conditions**: None

---

## Re-Review — Cycle 2 (2026-05-09)

### Bug Resolution

| Issue | Status | Fix Verified |
|---|---|---|
| MEDIUM-1: "Provide" vs "Substitute" dispatch | FIXED | `skills/qa-fix/SKILL.md` Step 1a now says "Substitute placeholders before dispatching" + `Dispatch: Agent(...)` |
| MEDIUM-2: Mixed placeholder styles | FIXED | All placeholders in `qa-findings-ingester-prompt.md` standardised to `<angle>` style |

**Gate upgrade**: CONCERNS → PASS
**Quality score**: 80 → 93
