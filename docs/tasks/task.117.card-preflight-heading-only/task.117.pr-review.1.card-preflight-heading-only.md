# PR Review Report: PR #416 — fix(card-preflight): catch a label-only card block; clean output names its scope (task 117)

**Reviewed:** 2026-09-17
**PR:** [#416](https://github.com/Gamaroff/agent-skills/pull/416) — `feature/task.117.card-preflight-heading-only` → `develop` (OPEN, head `e087c163`)
**Work item:** [`task.117.card-preflight-heading-only.md`](./task.117.card-preflight-heading-only.md) — resolved via `branch-stem`
**Tracker:** [#415](https://github.com/Gamaroff/agent-skills/issues/415) — OPEN (labels `task`, `priority:medium`; milestone "Technical Tasks (standalone)")
**Verdict:** ✅ APPROVE

Scope: the PR diff with auto-generated `*/references/*` bundled copies excluded — 44 of 89 files, +3815/−73 of +9035/−704. Both lenses ran as read-only Explore subagents at `--effort medium` (code lens dispatched 03:47 UTC → returned 03:50 UTC; conformance lens 03:47 → 03:49). Pipeline context: Step 5c of `/develop-task`, after a six-cycle QA loop (budget extended by the user after the cycle-5 escalation); gate 6 is CONCERNS with `top_issues: []`.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.117.implementation.1.card-preflight-heading-only-initial-run.md` (working tree carries the cycle-6 entry; committed at Step 8) |
| Review report | ✅ | `task.117.review.1.card-preflight-heading-only.md` (9/10) |
| QA reports | 6 | `task.117.qa.1` … `task.117.qa.6` |
| Gate | CONCERNS | `task.117.gate.6.card-preflight-heading-only.yml` (90) — `top_issues: []`; QA Cycle 6 entry: `Proceeding to 5c` |
| DoD | ❌ (expected) | not yet — `/finalise` is Step 7 |
| Sprint review | ❌ (expected) | not yet — `/finalise` is Step 7 |
| Open bugs | 0 | bug.1 … bug.7 all Closed |
| Handover | ❌ (none) | 0 outstanding |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| 1. `heading-only` is a finding kind; corpus test reports 0 (15 before, recorded) | `shared/resources/jira-sync.js` `checkCardSections` `code: "heading-only"`; `shared/resources/tests/card-preflight-corpus.test.mjs` (floor 100, count 0; header records 29 of 120 before the fix) | ✅ met |
| 2. `summariseSection` renders the list under a bold label | `dropHeadingLines` drops `RE_BOLD_LABEL` lines; fixtures H / H2 / H3 in `jira-sync-card-summary.test.mjs` | ✅ met |
| 3. The preflight's clean output names its scope | `describeCardScope` in `formatCardCheck`; `scope` in `card-preflight --json` and the four `sync-jira-* --check-card --json` | ✅ met |
| 4. One-definition property test still passes; bundled copies match | `card-preflight.test.mjs` B; `bundle:check` 128 skills, 0 problems | ✅ met |
| 5. Observations #43, #49 close naming this PR | performed by `/finalise` (Step 7) | ⏳ pending by design |

## Conformance Findings

```
[PC-1] trail · low · confidence: medium — task.117.implementation.1.card-preflight-heading-only-initial-run.md:238
  The `### QA Cycle 6` entry recorded `**Action**: Exit the QA loop` rather than the accepting-route token `Proceeding to 5c`.
  → Changed to `Proceeding to 5c` in the working-tree edit (applied during this review, before the Step 8 commit).

[PC-2] consistency · low · confidence: high — task.117.implementation.1.card-preflight-heading-only-initial-run.md:248
  `## Completion` still read `Escalated — QA loop limit (5 cycles)…`, contradicting the Progress row and `QA Iterations: 6`.
  → Reset to the `{populated at end}` placeholder (applied during this review; `/finalise` fills it).
```

## Code Review Findings

```
[CR-1] cleanup · low · confidence: high — shared/resources/tracker-card-summary.md:121
  The `dropHeadingLines` API row still says it removes only `###` grouping labels; the change also drops column-0 bold labels.
  → Extend the row: removes `###` sub-headings and standalone bold labels (`**Label**:`) outside fences, keeping what is under them.

[CR-2] cleanup · low · confidence: medium — shared/resources/jira-sync.js:1387
  The single-line bold-without-colon early return bypasses `transform` (harmless for today's epic transform, which only rewrites `**x:**`).
  → Document the deliberate skip, or pass the returned text through `transform`.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: trail
    severity: low
    confidence: medium
    ref: "docs/tasks/task.117.card-preflight-heading-only/task.117.implementation.1.card-preflight-heading-only-initial-run.md:238"
    finding: "The QA Cycle 6 entry recorded `**Action**: Exit the QA loop` rather than the accepting-route token `Proceeding to 5c`."
    suggested_action: "Change the Cycle 6 Action line to `Proceeding to 5c` before the Step 8 commit (applied)."
  - id: PC-2
    category: consistency
    severity: low
    confidence: high
    ref: "docs/tasks/task.117.card-preflight-heading-only/task.117.implementation.1.card-preflight-heading-only-initial-run.md:248"
    finding: "The Completion block's Final Status still described the cycle-5 escalation, contradicting the Progress row and the QA Iterations line."
    suggested_action: "Reset Final Status to the placeholder so /finalise fills it (applied)."
  - id: CR-1
    category: cleanup
    severity: low
    confidence: high
    ref: "shared/resources/tracker-card-summary.md:121"
    finding: "The dropHeadingLines API row still says it removes only ### grouping labels, but the change also drops column-0 bold labels."
    suggested_action: "Extend the row to say it removes ### sub-headings and standalone bold labels outside fences, keeping what is under them."
  - id: CR-2
    category: cleanup
    severity: low
    confidence: medium
    ref: "shared/resources/jira-sync.js:1387"
    finding: "The single-line bold-without-colon early return in summariseSection bypasses transform, a second code path the transform contract does not cover."
    suggested_action: "Document that the early-return path deliberately skips transform, or apply transform to the returned text."
truncated_count: 0
```

## Recommended Actions

1. Proceed to `/finalise` (Step 7) — the PR delivers criteria 1–4 with evidence; criterion 5 is finalise's own action.
2. Fold CR-1 (one API-row sentence) and CR-2 (a comment or a `transform` pass on the early return) into the follow-up task that QA cycle 6 recommended for the pre-existing glued-fence shape (CR6-1), so the three land together with their own review.
3. PC-1 and PC-2 are already applied in the working tree and land with the Step 8 commit.
