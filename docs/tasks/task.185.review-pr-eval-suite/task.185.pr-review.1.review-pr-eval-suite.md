# PR Review Report: PR #574 — feat(task.185): review-pr eval suite (#573)

**Reviewed:** 2026-10-05
**PR:** [#574](https://github.com/Gamaroff/agent-skills/pull/574) — `feature/task.185.review-pr-eval-suite` → `develop` (OPEN)
**Work item:** [`task.185.review-pr-eval-suite.md`](task.185.review-pr-eval-suite.md) — resolved via `branch stem`
**Tracker:** [#573](https://github.com/Gamaroff/agent-skills/issues/573) — OPEN
**Verdict:** ⚠️ CONCERNS

Scope: `origin/develop...origin/feature/task.185.review-pr-eval-suite`, 47 files after the default
`*/references/*` exclusion. The exclusion removed nothing, because the PR changes no bundled copy.
Effort: medium. Report number from `next-report-number.sh` (this PR's own script): `1`.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.185.implementation.1.review-pr-eval-suite-initial-run.md` |
| Review report | ✅ | `task.185.review.1.review-pr-eval-suite.md` |
| QA reports | 4 | `task.185.qa.1` … `task.185.qa.4` |
| Gate | PASS | `task.185.gate.4.review-pr-eval-suite.yml` (100) |
| DoD | ❌ | none yet — the task is `ready-for-review`; Step 7 writes it |
| Sprint review | ❌ | none yet — written at `/finalise` |
| Open bugs | 0 | `task.185.bug.1` … `bug.4`, all Closed |
| Handover | ❌ | none — no tracker action was deferred |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| `next-report-number.sh` returns 4 for `.1.`+`.3.`, bash and zsh | `skills/review-pr/scripts/next-report-number.sh`; `review-pr.test.js` "a gap — .1. and .3. → 4" (both shells) | ✅ met |
| `eval:review-pr` passes 4/4 in replay | `package.json` `eval:review-pr`; `evals/review-pr/scenarios/*` | ✅ met |
| Live N=5: 02, 03 at 5/5; 01, 04 at ≥ 4/5 | implementation report: 20/20 runs; recheck through the final harness 2/2 | ✅ met |
| No live run logs a refused or unhandled `gh` call | `fileDoesNotMatch` on `.eval/gh-calls.jsonl` in every scenario | ✅ met |
| Live scenario inside the default timeout | 92–177 s per run | ✅ met |
| `eval:all` growth < 10 s | 4.77 s → 7.59 / 7.92 s | ✅ met |
| `npm test`, `quick_validate`, `lint:shell`, `bundle:check` | gate 4 evidence | ✅ met |
| CHANGELOG, shared README, existing scenarios unchanged | `CHANGELOG.md`, `evals/shared/README.md`; 39 prior scenarios pass | ✅ met |

## Conformance Findings

```
[PC-1] consistency · low · confidence: low — task.185.review-pr-eval-suite.md frontmatter (no pr_number)
  The work item does not yet record PR #574, which is expected: /finalise writes pr_number, and the task is still ready-for-review.
  → Confirm /finalise writes pr_number: 574 at acceptance.
```

## Code Review Findings

```
[CR-1] bug · medium · confidence: medium — skills/review-pr/SKILL.md:633
  The obs #272 fix replaces count-style report numbering in review-pr only. The same unscripted "starts at 1 and increments" rule remains in qa-planning/SKILL.md:649, review-bug/SKILL.md:121, review-epic/SKILL.md:535 and review-task/SKILL.md:2130.
  → File the follow-up the gates already name: point each at a shared highest + 1 script, or record why it is exempt.

[CR-2] bug · low · confidence: low — evals/shared/lib/fake-gh.mjs:689
  With no jq on the host, a -q/--jq read is logged unhandled and the run is scored as a failed run, not could-not-run.
  → Check for jq at install time, or map a missing host tool to a non-verdict exit.

[CR-3] bug · low · confidence: low — evals/shared/repeat.mjs:909
  EVAL_FAIL_EXIT=5 (and the skip/driver-error codes 3 and 4) coincide with Node's own exit codes, so a fatal V8 crash could read as a failed run.
  → Move the opt-in codes into a range Node and the shell do not reserve (64–113).
```

CR-1 is out of scope by the task's own §4. The script stays review-pr's, and sharing it "is a later
call". Every gate since cycle 1 records it in `recommendations.future`. CR-3 repeats gate 4's
advisory C4-CR-1.

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: consistency
    severity: low
    confidence: low
    ref: "docs/tasks/task.185.review-pr-eval-suite/task.185.review-pr-eval-suite.md frontmatter (no pr_number)"
    finding: "The work item does not yet record PR #574, which is expected before /finalise writes pr_number."
    suggested_action: "Confirm /finalise writes pr_number: 574 at acceptance."
  - id: CR-1
    category: bug
    severity: medium
    confidence: medium
    ref: "skills/review-pr/SKILL.md:633"
    finding: "The obs #272 fix replaces count-style report numbering in review-pr only; qa-planning, review-bug, review-epic and review-task keep the unscripted rule."
    suggested_action: "File the follow-up: point each at a shared highest + 1 script, or record why it is exempt."
  - id: CR-2
    category: bug
    severity: low
    confidence: low
    ref: "evals/shared/lib/fake-gh.mjs:689"
    finding: "With no jq on the host, a -q/--jq read is logged unhandled and scored as a failed run rather than could-not-run."
    suggested_action: "Check for jq at install time, or map a missing host tool to a non-verdict exit."
  - id: CR-3
    category: bug
    severity: low
    confidence: low
    ref: "evals/shared/repeat.mjs:909"
    finding: "The opt-in exit codes 3, 4 and 5 coincide with Node's own exit codes, so a fatal V8 crash could read as a failed run."
    suggested_action: "Move the opt-in codes into a range Node and the shell do not reserve (64-113)."
truncated_count: 0
```

## Recommended Actions

1. File the follow-up for CR-1: the four skills that number co-located reports with count-style
   prose. It can reuse `next-report-number.sh` once the script is generalised beyond `.pr-review.`.
2. Fold CR-2 and CR-3 into the scenarios-5–7 follow-up task, which already reuses this harness.
3. Proceed to `/finalise`; confirm it writes `pr_number: 574`.
