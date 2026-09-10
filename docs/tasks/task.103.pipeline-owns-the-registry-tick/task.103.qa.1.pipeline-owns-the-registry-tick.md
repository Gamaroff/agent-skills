# QA Report: Task 103 - Give the registry tick an owner

**Task**: [task.103.pipeline-owns-the-registry-tick.md](./task.103.pipeline-owns-the-registry-tick.md)
**Gate File**: [task.103.gate.1.pipeline-owns-the-registry-tick.yml](./task.103.gate.1.pipeline-owns-the-registry-tick.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-10
**Gate Status**: FAIL

---

## Executive Summary

The implementation is unusually well-evidenced: the parser and lifecycle vocabulary are imported rather than restated, every guard is mutation-proven, and the negative controls the task asked for are exercised against live corpus data. One HIGH finding blocks the gate, and it is precisely the failure mode this task exists to eliminate — **a documented guarantee that does not hold**. `finalise`'s reason table tells a reader that CI's drift check will fail when the tick reports `no-row`; it will not, because the check iterates registry rows and a task document with no row is invisible to it.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All 5 implementation phases completed and ticked
- [x] Tests passing — `npm run ci:fast` 3063 pass / 0 fail, exit 0
- [x] Breaking changes documented (None; § 5 states the conditional side effect)
- [x] Code on feature branch with open PR #375

### Testing Approach

- [x] Automated Testing (14 new tests; full suite)
- [x] Mutation Proving (8 mutations + 3 negative controls)
- [x] Regression Testing
- [x] Code Review (Step 3b)
- [x] Documented-command execution (Step 4b)
- [ ] Performance Testing — not applicable
- [ ] Security Review — reasoned, not measured (see NFR)

### Review Methodology

**Direct tools.** Adaptive Review Strategy: 5 phases (not >5), medium risk, multiple modules — this falls to the "Default → direct tools first; spawn agents if gaps found" row rather than the parallel-agent row.

> **Deviation, recorded rather than glossed:** Step 3b specifies a read-only Explore subagent for the diff review. It was performed inline instead — this session's operating instructions restrict subagent use. This is a real reduction in independence: the same context that wrote the code reviewed it. It is partly mitigated by the fact that all four findings below were established by **execution**, not by reading — each carries a probe and its output — but a genuinely independent reader may still see what this pass did not. Step 5c (`/review-pr`) remains as a separate lens.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| :--- | :--- | :--- | :--- |
| Phase 1 — the drift check | **CONCERNS** | 3/3 green, 4 mutations red the correct test | Lands in a globbed directory (verified by a 261→264 pass-count delta, not by assumption). But row-driven only — see TASK-103-001 |
| Phase 2 — measure siblings | PASS | Verified independently | Bug registry 12/0 drift; epic registry 4 rows, 1 stale, corrected. Re-measured after the fix: 0 |
| Phase 3 — the § 3 decision | PASS | N/A | Recorded with reasoning and both rejected options, as criterion 5 requires |
| Phase 4 — implement the owner | PASS | 11/11 green, 4 mutations red the correct tests | Story guard, idempotence, cancelled, no-row, no-registry, dry-run, usage error all covered |
| Phase 5 — update the standard | **CONCERNS** | N/A | Rewritten and accurate on ownership, but repeats the unfounded "loud rather than silent" claim — TASK-103-001 |

**Overall Phase Completion**: 3/5 clean, 2 carrying the same single defect.

---

## Success Criteria Verification

| # | Criterion | Status | Evidence |
| :-- | :--- | :--- | :--- |
| 1 | Check fails when document `accepted` and row is not, and vice versa | **PARTIAL** | Both directions verified by mutation (M1 stale, M2 ahead). But "its registry row" presumes a row exists; the no-row case is uncovered — TASK-103-001 |
| 2 | Mutation-proven — reverting a row makes it go red | PASS | M1: row 67 `accepted`→`planned` reds the agreement test. Correct test, verified by name |
| 3 | Non-vacuity floor; cannot pass by matching nothing | PASS | M4: registry truncated to 20 rows reds the floor test **and** the agreement test's own `compared` floor — defence in depth, both fired |
| 4 | `cancelled` and in-flight tasks do not trip it | PASS | NEG-1 (cancelled doc, `planned` row) green; NEG-2 (`ready-for-review` doc, `ready-for-development` row) green; NEG-3 boundary (`accepted` doc, `cancelled` row) correctly red |
| 5 | The § 3 decision recorded with reasoning | PASS | Implementation report, "Registry-tick ownership decision", four numbered reasons and both rejections |
| 6 | Lite mode ticks; a story run does not attempt one | PASS | Story guard test asserts the registry is **byte-identical** after a story run; M5 (guard removed) reds it. Lite mode pinned by asserting the CLI's whole argument surface — an absence-assertion, correctly chosen |
| 7 | Standard names the real owner, no longer says "by hand" | PASS | `docs/standards/task-registry.md` rewritten; verified no "tick the row by hand" remains |
| 8 | Bug and epic registries measured and reported | PASS | Both measured, table in the implementation report, epic 3 corrected |
| 9 | Check wired into a suite `npm test` executes | PASS | Pass count for the `evals/shared/tests/*.test.mjs` glob goes 261 → 264 with the file present — an execution delta, not a file-existence check |

---

## Breaking Changes Validation

### Breaking Change: none claimed

Documented: Yes (§ 5) — "None if a check. If `finalise` gains the write, it gains a side effect on a file it has never touched."
Migration Path Provided: N/A — no consumer contract changes
Consumer Code Updated: N/A
Notes: `finalise` did gain the side effect. It is guarded (`not-a-task`), idempotent (`already`), non-blocking (exit 0 on every outcome) and reversible ("remove the write, keep the check"). The § 5 statement is accurate.

**Overall Breaking Changes Assessment**: PASS

---

## New Findings This Cycle

First review — the whole `origin/develop...HEAD` diff, 11 files, 1761 insertions.

- **[high]** `evals/shared/tests/task-registry-drift.test.mjs` — the check is row-driven, so an `accepted` task document with **no registry row** is invisible to it, contradicting three shipped claims → add the document-driven direction, or withdraw the claims.
- **[medium]** `shared/resources/tests/registry-tick.test.mjs` — the alignment test proves padding survives, not that width is preserved; the width shifts by one → preserve width and assert it exactly, or stop claiming alignment.
- **[low]** `shared/resources/registry-tick.js:236` — no-op `replace` before `split("|")` → delete it.
- **[low]** `shared/resources/registry-tick.js` — the story-guard comment claims a stricter rule than the code implements → reword.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: the drift check cannot see a task document that has no registry row**

- **Severity**: HIGH
- **Category**: Functional
- **Gate ID**: TASK-103-001
- **Observation**: The check iterates `parseRegistry(...).rows` and compares each row against its document. A task document with `status: accepted` and no row is never visited. Verified by probe: an `accepted` `task.998` document with no registry row left the suite **3 pass / 0 fail**.
- **Impact**: Three shipped statements promise the opposite —
  - `skills/finalise/SKILL.md:932` — `no-row` → "**Log it.** CI's drift check will fail on this"
  - `skills/finalise/SKILL.md:1446` — "…needs a manual tick before merge, or CI's drift check fails"
  - `docs/standards/task-registry.md` — "a write that does not happen, or happens wrong, is loud rather than silent"

  A reader who trusts the first two will log a `no-row` and merge, expecting CI to stop them. It will not. **This is the same defect the task was filed about** — the old standard named `finalise` as an owner that owned nothing — reintroduced one level up: a check named as a backstop that does not back up the case it is cited for.
- **Recommendation**: Add a fourth test that walks `docs/tasks/*/task.{N}.*.md`, resolves each to a registry row, and fails on any document with none. Give it its own non-vacuity floor, since a document-walk that matches nothing fails exactly as silently as a row-walk that does.
- **Priority**: P1

### MEDIUM Severity Issues (1)

**Issue: the alignment test's name and the code's comment both overstate what holds**

- **Severity**: MEDIUM
- **Category**: Quality
- **Gate ID**: TASK-103-002
- **Observation**: The assertion is `/\| accepted +\|/` — some trailing padding survives. Executed: a cell of `" planned              "` (22 chars) becomes `" accepted              "` (23). The column shifts.
- **Impact**: Low in practice — the real registry does not column-align its Status cells — but the test's name ("stays aligned"), its docstring ("burying the one-line change in a whole-file diff") and the CLI's own comment all assert a property nothing checks. A future reader will take the test as proof.
- **Recommendation**: Absorb the length delta into the trailing padding when there is room, and assert cell lengths are equal. Where the replacement is genuinely longer than the cell, say so instead of claiming alignment.
- **Priority**: P2

### LOW Severity Issues (2)

- **TASK-103-003** — `registry-tick.js:236`: `original.replace(/^(\s*)\|/, "$1|")` replaces a pipe with itself. Confirmed no-op by execution. Delete it.
- **TASK-103-004** — the story-guard comment says "Two independent signals must both say `task`", but `(docType && docType !== "task")` admits an absent `type:`. The behaviour is right (legacy documents predate OKF `type`); the comment is wrong.

**Total Issues**: HIGH: 1, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Performance — PASS

Drift check ~0.2s inside a ~107s suite. The tick is one read plus one write, with an `already` short-circuit that makes a re-run free. No regression: full suite 3063 pass / 0 fail.

### Reliability — PASS

Every CLI outcome exits 0, which is the correct direction here — acceptance has already happened and blocking it over an index line would trade a cosmetic defect for a stuck pipeline. `ambiguous-row` refuses rather than guessing (a wrong row is worse than a stale one). Idempotence, `--dry-run`, missing registry and missing row are each covered by a test, and each of the four guards was mutation-proven.

### Security — PASS

- **Status**: PASS
- **Evidence**: `reasoned`
- **Probes executed**: 0
- No dynamic RegExp is built from untrusted input — `frontmatterField`'s `field` argument is a hardcoded literal at both call sites (`"type"`, `"status"`). The write target is whatever `--registry` names, which is a local developer/CI tool with no network and no credentials. No hostile candidates were executed, so this is `reasoned`; that is an accurate description of how the verdict was reached, not a downgrade.

### Maintainability — CONCERNS

The strengths are real: the registry parser and the lifecycle vocabulary are imported from `select-next.mjs` rather than copied, and nearly every non-obvious decision carries its reasoning inline. The concern is that **two of the four findings are comments or test names asserting more than the code does** (TASK-103-002, TASK-103-004) — the same overstatement class this task was filed to remove, reappearing in its own implementation.

---

## Code Review

Step 3b, first review, whole branch diff. Every finding below was established by running something, not by reading.

**Correctness bugs (1):**
- [high/high] `evals/shared/tests/task-registry-drift.test.mjs` — row-driven check cannot see a document with no row; three docs claim it can → add the document-driven direction or withdraw the claims. **Promoted to gate `top_issues[]` as TASK-103-001** (`code_review_blocking`).

**Cleanups (3):**
- `shared/resources/registry-tick.js:236` — no-op `replace` before `split("|")` → delete.
- `shared/resources/registry-tick.js` (story-guard comment) — describes a stricter rule than the code implements → reword.
- `shared/resources/tests/registry-tick.test.mjs` (alignment test) — name and docstring exceed the assertion → strengthen the assertion or soften the name.

---

## Step 3c: Mutation-Proof Spot Check

Eight mutations were run during development and re-verified here; each was checked against **which** test went red, not merely that something did.

| Mutation | Expected red | Actual | mutation-proven |
| :--- | :--- | :--- | :--- |
| Registry row 67 `accepted` → `planned` | agreement (stale branch) | agreement | yes |
| Row 104 → `accepted` with a `planned` doc | agreement (ahead branch) | agreement, message names the ahead branch | yes |
| Row 103 points at a missing file | readable-document | readable-document | yes |
| Registry truncated to 20 rows | floor | floor **and** the agreement test's `compared` floor | yes |
| Story guard removed | story-run | story-run | yes |
| `writeFileSync` no-op'd | ticks-its-row | ticks-its-row (+2 collateral, both legitimate) | yes |
| Padding preservation dropped | padding | padding (+2 collateral) | yes |
| `not-accepted` guard removed | not-accepted + cancelled | both | yes |

Negative controls (must stay green): cancelled document with a disagreeing row — green. In-flight document with a disagreeing row — green. Boundary (`accepted` document, `cancelled` row) — correctly red.

**Not mutation-proven:** nothing covering TASK-103-001, because no test covers it. That is the finding.

---

## Step 4b: Documented-Command Execution

`skills/finalise/SKILL.md` gained a fenced `bash` block, so the runnable-prose rule fires.

| Run | Blocks | runnable | placeholder | mutating |
| :--- | ---: | ---: | ---: | ---: |
| Unbound | 20 | 0 | 2 | 18 |
| `--bind DOC_FILE=… --copy docs` | 20 | **1** | 1 | 18 |
| Baseline (`origin/develop`, unbound) | 19 | 0 | 2 | 17 |

- The bound run executed 1 block under **both bash and zsh** (`zshAvailable: true`), status 0 in each, **0 findings**.
- The unbound run's `zero-blocks-executed` finding is **pre-existing**, not introduced: the develop baseline reports the identical 0/2 shape. Recorded per the rule rather than suppressed.
- The block this change adds (line 909, the `registry-tick.js` invocation) classifies `mutating` — `unrecognised-command: node (fail-closed)`. Correct: it is a write, and the deny-list is doing its job.

---

## Regression Testing

| Area | Result |
| :--- | :--- |
| Full suite (`npm run ci:fast`) | PASS — 3063 pass, 0 fail, 1 skipped, exit 0 |
| `prettier --check` across the change set | PASS (after a fix — see below) |
| `npm run bundle` idempotence | PASS — `skills/finalise/references/registry-tick.js` regenerates identically; a pre-commit hook re-ran it with no diff |
| `select-next.mjs` consumers | PASS — the new code imports, never mutates, the selector |
| Pre-existing bundler warning `shared/resources/<name> not found` | Pre-existing on `develop` (verified in a detached worktree). Not introduced |

The `prettier --check` failure is worth naming: the fast gate caught it on the two new files while every functional test was green — the exact task-67 shape the gate's formatting half was added for.

---

## Test Artifacts

### Files Reviewed

`evals/shared/tests/task-registry-drift.test.mjs`, `shared/resources/registry-tick.js`, `shared/resources/tests/registry-tick.test.mjs`, `skills/finalise/SKILL.md`, `docs/standards/task-registry.md`, `docs/development/epic-registry.md`, `CHANGELOG.md`, and the task/review/implementation documents.

### Test Commands Executed

```bash
npm run ci:fast
node --test evals/shared/tests/task-registry-drift.test.mjs
node --test shared/resources/tests/registry-tick.test.mjs
node --test --test-reporter=tap 'evals/shared/tests/*.test.mjs'   # pass-count delta 261 -> 264
node .claude/skills/qa-task/references/qa-execute-snippets.mjs --file skills/finalise/SKILL.md --json
node .claude/skills/qa-task/references/qa-execute-snippets.mjs --file skills/finalise/SKILL.md \
  --bind DOC_FILE=<task-doc> --copy docs --json
```

### Coverage Report

No coverage instrumentation in this repository; coverage is expressed as mutation proofs (table above) rather than as line percentages.

---

## Recommendations

### Immediate Actions (Blocking)

1. **TASK-103-001** — cover the document-driven direction, or withdraw the three claims that promise it. A backstop cited for a case it does not cover is worse than no backstop, because it is trusted.

### Short-term Actions (Non-Blocking)

1. **TASK-103-002** — preserve cell width and assert it, or stop claiming alignment.
2. **TASK-103-003** — delete the no-op `replace`.
3. **TASK-103-004** — correct the story-guard comment.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One HIGH finding. The work is otherwise strong and unusually well-evidenced, but the check's coverage does not match what three shipped documents say it covers — and that mismatch is the exact defect class the task set out to remove.
**Quality Score**: 80/100

**Deployment Recommendation**: BLOCKED
**Conditions**: TASK-103-001 resolved.

---

**Next Steps**: `/qa-fix` — address TASK-103-001 (blocking) and the three advisory findings, then re-review.
