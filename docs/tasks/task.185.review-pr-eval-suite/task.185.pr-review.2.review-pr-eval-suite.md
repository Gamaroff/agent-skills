# PR Review Report: PR #574 — feat(task.185): review-pr eval suite (#573)

**Reviewed:** 2026-10-05
**PR:** [#574](https://github.com/Gamaroff/agent-skills/pull/574) — `feature/task.185.review-pr-eval-suite` → `develop` (OPEN)
**Work item:** [`task.185.review-pr-eval-suite.md`](task.185.review-pr-eval-suite.md) — resolved via `branch stem`
**Tracker:** [#573](https://github.com/Gamaroff/agent-skills/issues/573) — OPEN
**Verdict:** ⚠️ CONCERNS

Scope: `origin/develop...origin/feature/task.185.review-pr-eval-suite` at `22ee1609`, 64 files. The
default `*/references/*` exclusion removed nothing. Effort: medium. Report number from
`next-report-number.sh`: `2`. This is the second 5c review. The first (`pr-review.1`, cycle 4) was
followed by a `/finalise` DoD gap and QA cycles 5–7.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.185.implementation.1.review-pr-eval-suite-initial-run.md` |
| Review report | ✅ | `task.185.review.1.review-pr-eval-suite.md` |
| QA reports | 7 | `task.185.qa.1` … `task.185.qa.7` |
| Gate | PASS | `task.185.gate.7.review-pr-eval-suite.yml` (100) |
| DoD | ✅ (run 1: gaps) | `task.185.dod.1.review-pr-eval-suite.md` — `/finalise` re-runs next |
| Sprint review | ❌ | none yet — written at `/finalise` |
| Open bugs | 0 | `task.185.bug.1` … `bug.7`, all Closed |
| Handover | ❌ | none — no tracker action was deferred |

## Acceptance Criteria Traceability

Unchanged from `pr-review.1`: all eight success-criterion groups are met. The fixes since then
touched only the fake `gh` (`evals/shared/lib/fake-gh.mjs`), its test and the shared README. Replay
is 4/4, and the four scenarios serve no `api` fixture, so their live behaviour is unchanged.

## Conformance Findings

```
[PC-1] consistency · low · confidence: low — task.185.review-pr-eval-suite.md § Definition of Done - Gaps Identified
  The DoD-gaps section still names gate 4 and an unticked BLOCKING step, while QA Testing Results reports gate 7 PASS and bugs 5–7 Closed.
  → /finalise marks the section historical (superseded) when it re-runs.
```

## Code Review Findings

```
[CR-1] bug · medium · confidence: medium — evals/shared/runner.mjs:416
  repeat.mjs counts runner exit 0 as a pass, but a setup hook or driver promise that never settles also ends Node with 0, so a run that never reached its assertions would count as a pass.
  → Set a non-verdict process.exitCode at the top of main, so only the explicit post-assertion exit yields 0.

[CR-2] bug · low · confidence: low — evals/shared/lib/fake-gh.mjs (VALUE_FLAGS)
  pr/issue value flags (--color, -s, -B, -A, --author, -l, --label) are missing, so their value is read as the positional key and returns notFound instead of unhandled.
  → Add them, or report a read whose key follows an unmodelled flag as unhandled.

[CR-3] cleanup · low · confidence: medium — evals/shared/lib/fake-gh.mjs (pick)
  pick() drops a requested --json field the fixture lacks instead of failing loudly.
  → Report missing requested fields as unhandled (carried as cycle-1 CR-5).
```

CR-1 is a new instance of the class cycles 1–3 closed (a non-verdict counted as a verdict). It is
not reached by any shipped scenario: the review-pr setup hook is synchronous apart from awaited
child processes, which keep the event loop alive. It is a follow-up, not a blocker.

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: consistency
    severity: low
    confidence: low
    ref: "docs/tasks/task.185.review-pr-eval-suite/task.185.review-pr-eval-suite.md § Definition of Done - Gaps Identified"
    finding: "The DoD-gaps section names gate 4 and an unticked BLOCKING step while QA Testing Results reports gate 7 PASS and bugs 5-7 Closed."
    suggested_action: "/finalise marks the section historical when it re-runs."
  - id: CR-1
    category: bug
    severity: medium
    confidence: medium
    ref: "evals/shared/runner.mjs:416"
    finding: "A setup hook or driver promise that never settles ends Node with exit 0, which repeat.mjs counts as a pass."
    suggested_action: "Set a non-verdict process.exitCode at the top of main so only the explicit post-assertion exit yields 0."
  - id: CR-2
    category: bug
    severity: low
    confidence: low
    ref: "evals/shared/lib/fake-gh.mjs:101"
    finding: "pr/issue value flags are missing from VALUE_FLAGS, so their value is read as the positional key and returns notFound instead of unhandled."
    suggested_action: "Add the flags, or report a read whose key follows an unmodelled flag as unhandled."
  - id: CR-3
    category: cleanup
    severity: low
    confidence: medium
    ref: "evals/shared/lib/fake-gh.mjs:180"
    finding: "pick() drops a requested --json field the fixture lacks instead of failing loudly."
    suggested_action: "Report missing requested fields as unhandled."
truncated_count: 0
```

## Recommended Actions

1. Proceed to `/finalise`; it marks the stale DoD-gaps section historical.
2. File one harness follow-up with CR-1 (non-verdict exit 0), CR-2, CR-3 and gate 7's C7-CR-1/2.
