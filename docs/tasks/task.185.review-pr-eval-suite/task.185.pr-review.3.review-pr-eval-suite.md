# PR Review Report: PR #574 — feat(task.185): review-pr eval suite (#573)

**Reviewed:** 2026-10-05
**PR:** [#574](https://github.com/Gamaroff/agent-skills/pull/574) — `feature/task.185.review-pr-eval-suite` → `develop` (OPEN)
**Work item:** [`task.185.review-pr-eval-suite.md`](task.185.review-pr-eval-suite.md) — resolved via `branch stem`
**Tracker:** [#573](https://github.com/Gamaroff/agent-skills/issues/573) — OPEN
**Verdict:** ⚠️ CONCERNS

Scope: `origin/develop...origin/feature/task.185.review-pr-eval-suite` at `59739d20`, 7405 diff
lines. The default `*/references/*` exclusion removed nothing. Effort: medium. Report number from
`next-report-number.sh`: `3`. This is the third 5c review, after `/finalise` run 2 and QA cycle 8.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.185.implementation.1.review-pr-eval-suite-initial-run.md` |
| Review report | ✅ | `task.185.review.1.review-pr-eval-suite.md` |
| QA reports | 8 | `task.185.qa.1` … `task.185.qa.8` |
| Gate | PASS | `task.185.gate.8.review-pr-eval-suite.yml` (100) |
| DoD | ✅ (runs 1–2: gaps) | `task.185.dod.1`, `task.185.dod.2` — `/finalise` run 3 follows |
| Sprint review | ❌ | none yet — written at `/finalise` |
| Open bugs | 0 | `task.185.bug.1` … `bug.7`, all Closed |
| Handover | ❌ | none — no tracker action was deferred |

## Acceptance Criteria Traceability

All 13 criteria are met. AC1's zsh arm is verified locally, as the operator decided and the criterion
records. **Live recheck on head `59739d20`** (PC-1 below), run as
`env -u ANTHROPIC_API_KEY DRIVER=claude-cli node evals/shared/repeat.mjs <all four> --runs 1`:
01 6/6, 02 7/7, 03 5/5, 04 6/6 assertions, each passed 1/1, rc 0. That includes no refused or
unhandled `gh` call under the refuse-by-default fake.

## Conformance Findings

```
[PC-1] trail · low · confidence: medium — task.185.dod.2 AC3 row
  The live-criteria evidence predated the fake gh's refuse-by-default rewrite (cycles 5–8).
  → Addressed in this review: all four scenarios re-run live on 59739d20 and passed (see above).

[PC-2] consistency · low · confidence: low — task doc § Definition of Done - Gaps Identified
  The run-2 gaps section still names gate 7 and an unticked BLOCKING step that f728e459 fixed.
  → /finalise run 3 supersedes the section.
```

## Code Review Findings

```
[CR-1] bug · medium · confidence: medium — evals/shared/runner.mjs:413
  An unknown assertion fn name becomes a failed assertion, so the runner exits EVAL_FAIL_EXIT and repeat.mjs scores a malformed scenario as a failed run instead of could-not-run; worst for liveAssertions, which replay never exercises.
  → Validate assertion and liveAssertions fn names before any run and exit with a non-verdict status.

[CR-2] cleanup · low · confidence: medium — evals/shared/drivers/claude-cli.mjs:95
  A timed-out claude -p is reported as "exited null" without res.error.code or res.signal.
  → Include them in the thrown message when status is null.
```

CR-1 joins 5c-2 CR-1 as the second instance of a non-verdict scored as a verdict. Both are latent:
no shipped scenario has an unknown fn or a never-settling hook. Both go into the harness follow-up.

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: trail
    severity: low
    confidence: medium
    ref: "docs/tasks/task.185.review-pr-eval-suite/task.185.dod.2.review-pr-eval-suite.md AC3 row"
    finding: "The live-criteria evidence predated the fake gh's refuse-by-default rewrite in cycles 5-8."
    suggested_action: "Re-run the four scenarios live on the current head; done in this review, all passed."
  - id: PC-2
    category: consistency
    severity: low
    confidence: low
    ref: "docs/tasks/task.185.review-pr-eval-suite/task.185.review-pr-eval-suite.md § Definition of Done - Gaps Identified"
    finding: "The run-2 gaps section still names gate 7 and an unticked BLOCKING step that f728e459 fixed."
    suggested_action: "/finalise run 3 supersedes the section."
  - id: CR-1
    category: bug
    severity: medium
    confidence: medium
    ref: "evals/shared/runner.mjs:413"
    finding: "An unknown assertion fn name is scored as a failed run (EVAL_FAIL_EXIT) instead of could-not-run."
    suggested_action: "Validate assertion and liveAssertions fn names before any run and exit with a non-verdict status."
  - id: CR-2
    category: cleanup
    severity: low
    confidence: medium
    ref: "evals/shared/drivers/claude-cli.mjs:95"
    finding: "A timed-out claude -p is reported as exited null without the error code or signal."
    suggested_action: "Include res.error.code and res.signal in the message when status is null."
truncated_count: 0
```

## Recommended Actions

1. Proceed to `/finalise` run 3. It supersedes the run-2 gaps section.
2. File one harness follow-up: CR-1 here, 5c-2 CR-1, gate 8's C8-CR-1..3, gate 7's C7-CR-2, CR-2 here.
