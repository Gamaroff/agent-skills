# QA Report: Task 94 - Add the observe-work meta-skill (cycle 3)

**Task**: [task.94.observe-work-skill.md](./task.94.observe-work-skill.md)
**Gate File**: [task.94.gate.3.observe-work-skill.yml](./task.94.gate.3.observe-work-skill.yml)
**Previous Gate**: [gate.2](./task.94.gate.2.observe-work-skill.yml) — FAIL (70/100)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-08
**Gate Status**: CONCERNS

---

## Executive Summary

Both cycle-2 findings are closed. The HIGH was verified against the gate's own stated condition rather than against this repo, and it is exact.

One MEDIUM remains, and it matters less for its size than for its shape: it is the **third counting defect in three cycles from a single root cause** — the hook reimplements the engine's queue rule in shell. Gate 2 wrote the rule for this in advance, and cycle 3 is where it applies.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Review Methodology

**Re-review scope: since 2026-09-08T14:05:00Z (default)** — three code files changed since gate 2: `SKILL.md`, `observe-work-session-start.sh`, `observe-work.test.js`.

- `REFUTE_PASS` = false (cycle 3+)
- `SAFETY_REPROBE` = false (gate 2 `security.status` PASS)

Direct tools; no subagents, per the invoking session's instructions.

---

## Re-Review Context

| Prev. issue | Severity | Status | Verification |
|---|---|---|---|
| **TASK-94-004** — catch-all blocked capture on every fresh install | HIGH | **FIXED** | Verified against the gate's stated condition. All four engine check names (`workspace-exists`, `anchor-durable`, `no-fork`, `activation-configured`) appear in step 1 and each has the correct treatment; `activation-configured` reads "note and continue". Regression assertion **mutation-proved** — restoring the catch-all turns it red naming the defect. |
| **TASK-94-005** — body line counted as a status | MEDIUM | **FIXED** | Frontmatter-scoped read confirmed on the seven-case fixture: hook and engine both 4 open of 7, engine independently reporting the same two files statusless. *Three further adversarial cases surfaced TASK-94-006 — see below.* |

The TASK-94-004 fix deserves one specific note: it **kept** the cycle-1 fix's ordering rationale (read `healthy` before `reason`, and why) and replaced only the catch-all. Reverting wholesale would have reinstated TASK-94-001. Verified that both properties now hold simultaneously.

---

## New Findings This Cycle

- **[MEDIUM]** `shared/resources/observe-work-session-start.sh` — two remaining divergences from the engine, in opposite directions → **replace the mechanism, do not correct it a third time**. ([bug.6](./task.94.bug.6.hook-third-instance-replace-mechanism.md))

### TASK-94-006 — and how it nearly passed

The cycle-2 fix closed the body-quoting overcount. Two divergences remain:

| Case | Engine | Hook |
|---|---|---|
| `status: "open"` (quoted) | parses to `open` → **open** | `'"open"'` → **not open** (undercount) |
| File with no frontmatter | excluded from the log | `''` → **open** (overcount) |

**They cancelled.** With both files present the hook reported `2 open` and the engine reported `2 open` — apparently in agreement. The tell was `total`: hook 3, engine 2, because the engine never counted the frontmatter-less file as a log entry at all.

This is worth recording as a method note, not just a finding: *checking the number the fix was about* would have passed. It was caught by checking a number the fix was **not** about.

### The pattern, and the rule that already covers it

| Cycle | Defect | Mechanism |
|---|---|---|
| 1 | undercount | exact-match `grep` |
| 2 | overcount | unscoped `grep` |
| 3 | both, cancelling | frontmatter `awk` |

Three cycles, three defects, one root cause. Gate 2 recorded the rule before this instance existed:

> *if a third arises, replace the grep with an engine call rather than correcting it again.*

That is the loop's third-strike logic applied by judgement rather than by the formal trigger (which counts HIGH findings; these are MEDIUM). The remedy is **replacement**: call `observation-log.js queue --json`, and fall back to **silence** rather than to a hand-rolled count when node is unavailable. A hook whose entire justification is an accurate count should say nothing rather than a wrong number.

---

## Implementation Verification

| Phase | Status | Notes |
|---|---|---|
| 1–5 | PASS | Unchanged since cycle 2; no files touched |
| 6. Activation | **CONCERNS** | Step 1 now correct and exact. Hook still duplicates the queue rule — TASK-94-006 |

---

## Code Review

Scoped to the three files changed since gate 2.

**Correctness bugs (1):** TASK-94-006, above.

**Cleanups (0 new).** The cycle-1 `{0,300}` advisory remains open and unchanged.

**Re-examined and found sound:**
- The step-1 rewrite names all four engine checks with no drift against `observation-log.js` — verified by extracting both lists and comparing, not by reading.
- The new regression assertion has two clauses, and the second ("no row may treat a bare `healthy: false` as a stop condition") would pass vacuously on a deleted table. The first clause ("must name `activation-configured`") is what makes deletion fail, so the pair is not vacuous. Confirmed by the mutation run.

### mutation-proven

| Invariant | mutation-proven |
|---|---|
| TASK-94-004 regression assertion | **yes** — catch-all restored → red naming the defect; reverted → green |
| TASK-94-001 regression assertion (carried) | yes |
| Hook date branches, re-proved after the frontmatter rewrite | **yes** — all four, including the silent one |
| Remaining 19 assertions | **no** — not individually reverted |

---

## NFR Assessment

**Security — PASS.** Unchanged; `shellcheck --severity=warning` clean after the rewrite.

**Performance — PASS.** Body 277 lines against a 500 ceiling.

**Reliability — CONCERNS.** The startup path is now correct and verified against the condition that mattered. The residual is confined to the opt-in hook and is a **duplication** problem rather than a logic problem — which is exactly why the remedy is replacement rather than another correction.

**Maintainability — PASS.** Both HIGHs found in this loop carry mutation-proved regression assertions, so neither can return silently.

---

## Regression Testing

| Area | Result |
|---|---|
| Full suite | PASS — `npm run ci:fast` exit 0, **2885 pass / 0 fail** |
| Hook: dates, JSON, shellcheck | PASS — all re-proved after the rewrite |
| Bundle / catalog / dependency graph | PASS — no drift |

No regressions.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No HIGH outstanding. The single MEDIUM is the third instance of one root cause, and the correct response is the one gate 2 pre-committed to: replace the mechanism.
**Quality Score**: 90/100 (cycle 2: 70, cycle 1: 60)

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-94-006 addressed by **replacing** the mechanism, not by a third correction.

---

**Next Steps**: `/qa-fix` cycle 3 replaces the hook's count with an engine call. Then cycle 4 verifies, and the loop's exit gate is Step 5c (`/review-pr`).
