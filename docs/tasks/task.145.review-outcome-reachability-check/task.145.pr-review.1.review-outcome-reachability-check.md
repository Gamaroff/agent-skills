# PR Review Report: PR #485 — feat(task.145): review checks a criterion's stated outcome is reachable (#473)

**Reviewed:** 2026-09-25
**PR:** [#485](https://github.com/Gamaroff/agent-skills/pull/485) — `feature/task.145.review-outcome-reachability-check` → `develop` (OPEN)
**Work item:** [`task.145.review-outcome-reachability-check.md`](./task.145.review-outcome-reachability-check.md) — resolved via `branch-stem`
**Tracker:** [#473](https://github.com/Gamaroff/agent-skills/issues/473) — OPEN
**Verdict:** ⚠️ CONCERNS

Effort `medium`, both lenses. Diff: `origin/develop...origin/feature/task.145.review-outcome-reachability-check`,
with `*/references/*` excluded. The change set had no generated files, so nothing was removed: 31 files, 3551 lines.
Run as develop-task Step 5c after QA cycle 6's diminishing-returns exit.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.145.implementation.1.review-outcome-reachability-check-initial-run.md` (cycle-6 entries are in the working tree; committed at Step 8) |
| Review report | ✅ | `task.145.review.1.review-outcome-reachability-check.md` |
| QA reports | 6 | `task.145.qa.1` … `task.145.qa.6` |
| Gate | CONCERNS | `task.145.gate.6.review-outcome-reachability-check.yml` (90) |
| DoD | ❌ (expected) | Step 7 has not run |
| Sprint review | ❌ (expected) | Step 7 has not run |
| Open bugs | 1 | `task.145.bug.11.named-phase-hold-verb-only.md` (New). Bugs 1–10 are Closed |
| Handover | ❌ | none; `access.tracker` is full |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| review-task Step 3 carries the check (check 10) and a hallucination-pattern line | `skills/review-task/SKILL.md` check 10 and pattern line; `tests/outcome-reachability-check.test.js` review-task site | ✅ met |
| create-task, review-story and review-bug carry the check | the three SKILL.md hunks; population test sites | ✅ met. review-bug goes beyond the scoped bullet (PC-2) |
| Population test holds each site's elements | `tests/outcome-reachability-check.test.js` | ⚠️ partial. The naming sentence is held by verb only (CR6-1, residual); the noun is site-agnostic (CR-2) |
| Suite green | CI test, validate, link-check and shellcheck pass; `ci:fast` locally 4003/4002/0 | ✅ met |

## Conformance Findings

```
[PC-2] scope · medium · confidence: high — skills/review-bug/SKILL.md Step 6 / Step 3 vs task doc §3–§5
  In review-bug the diff goes beyond the one Step 3 bullet the task scoped. It adds a STALE trigger,
  a STALE-outranks-NEEDS-DETAIL precedence rule and a `Stale source` output field. That is a
  verdict-rule change that opens a new path to develop-bug's STALE HALT, while §5 still says there are
  no verdict rule changes.
  → Update task doc §3/§4/§5 to record the review-bug precedence and output changes, including the
    new route to develop-bug's STALE HALT, or split them into a follow-up.

[PC-1] trail · low · confidence: medium — implementation report, Pipeline Progress 5–6 row and Completion
  The report's Pipeline Progress row and Completion block still describe the cycle-5 loop-limit
  escalation, with c02048a6 ungated. Its own QA Cycle 6 entry says gate 6 gated that fix and
  proceeded to 5c.
  → Update the 5–6 row, Final Status and QA Iterations (6) before the Step 8 commit.
```

## Code Review Findings

```
[CR-1] bug · medium · confidence: medium — skills/review-bug/SKILL.md:86
  The new STALE trigger fires whenever the named function already returns the Expected outcome for
  the reproduction input. A live bug gives the same result when its defect sits outside that
  function (a caller passes a different input or drops the result, or the report names the wrong
  function). The rule has no confidence floor, it overrides the pre-pass "whatever the pre-pass
  said" even when the pre-pass says `reproduces: likely`, and it outranks NEEDS DETAIL. So
  develop-bug Step 2 can halt and recommend closing a bug that still reproduces.
  → Route a walk-only already-returns result to STALE only when the pre-pass does not contradict it.
    When the pre-pass says `likely`, report an Important "wrong function or input" note (NEEDS DETAIL).

[CR-2] bug · low · confidence: high — tests/outcome-reachability-check.test.js:66
  NAMED_PHASE's `(phase|task)` alternation accepts either noun at any site, the same site-agnostic
  looseness CR5-2 removed from the check number.
  → When NAMED_PHASE becomes a per-site factory (CR6-1), pass each site's own noun.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-2
    category: scope
    severity: medium
    confidence: high
    ref: "skills/review-bug/SKILL.md Step 6 / Step 3 vs task doc §3–§5"
    finding: "review-bug gains a STALE trigger, a STALE-outranks-NEEDS-DETAIL precedence rule and a Stale source output field beyond the one scoped Step 3 bullet, while the task doc says there are no verdict rule changes."
    suggested_action: "Record the review-bug precedence and output changes, and the new route to develop-bug's STALE HALT, in task doc §3/§4/§5, or split them into a follow-up."
  - id: PC-1
    category: trail
    severity: low
    confidence: medium
    ref: "task.145.implementation.1.review-outcome-reachability-check-initial-run.md: Pipeline Progress 5–6 row and Completion"
    finding: "The implementation report's progress row and Completion block still describe the cycle-5 escalation, which contradicts its own QA Cycle 6 entry."
    suggested_action: "Update the 5–6 row, Final Status and QA Iterations before the Step 8 commit."
  - id: CR-1
    category: bug
    severity: medium
    confidence: medium
    ref: "skills/review-bug/SKILL.md:86"
    finding: "The walk-only STALE trigger has no confidence floor and overrides a pre-pass reproduces: likely, so develop-bug can halt and recommend closing a bug that still reproduces."
    suggested_action: "Route a walk-only already-returns result to STALE only when the pre-pass does not contradict it; otherwise report an Important wrong-function-or-input note."
  - id: CR-2
    category: bug
    severity: low
    confidence: high
    ref: "tests/outcome-reachability-check.test.js:66"
    finding: "NAMED_PHASE's (phase|task) alternation accepts either noun at any site."
    suggested_action: "Pass each site's own noun when NAMED_PHASE becomes a per-site factory."
truncated_count: 0
```

## Recommended Actions

1. CR-1: the review-bug STALE override. It is the finding with behavioural consequence, a live bug recommended for closing. Constrain the walk-only trigger by the pre-pass.
2. PC-2: record the review-bug precedence and output changes in the task document's scope and breaking-changes sections.
3. CR6-1 + CR-2: make NAMED_PHASE a per-site hold with each site's own noun and naming sentence (bug 11).
4. PC-1: bring the implementation report's progress row and Completion in line with cycle 6 (Step 8).
