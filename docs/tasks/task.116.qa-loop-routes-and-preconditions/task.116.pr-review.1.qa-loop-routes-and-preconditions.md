# PR Review Report: PR #404 — feat(task.116): QA loop routes on the queue, gates on the evidence — route 3, review preconditions, boundary execution, subagent vocabulary

**Reviewed:** 2026-09-14
**PR:** [#404](https://github.com/Gamaroff/agent-skills/pull/404) — `feature/task.116.qa-loop-routes-and-preconditions` → `develop` (OPEN, head `d5c79efb`; checks: validate, link-check, shellcheck, test, branch-rule all SUCCESS)
**Work item:** [`task.116.qa-loop-routes-and-preconditions.md`](./task.116.qa-loop-routes-and-preconditions.md) — resolved via `branch-stem`
**Tracker:** [#403](https://github.com/Gamaroff/agent-skills/issues/403) — OPEN (labels `task`, `priority:high`; milestone Technical Tasks (standalone))
**Verdict:** ⚠️ CONCERNS

Effort `medium`, both lenses. Diff scoped to `origin/develop...origin/feature/task.116.qa-loop-routes-and-preconditions` with `*/references/*` excluded (generated bundle copies; 47 files / 3,524 insertions / 87 deletions reviewed, versus 141 files in the PR). Pipeline context: this is Step 5c on QA cycle 6, which the operator authorised after the cycle-5 Convergence-check escalation.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.116.implementation.1.qa-loop-routes-and-preconditions.md` (working tree; committed at Step 8 by design) |
| Review report | ✅ | `task.116.review.1.qa-loop-routes-and-preconditions.md` — READY TO IMPLEMENT 8/10 |
| QA reports | 6 | `task.116.qa.1…6.qa-loop-routes-and-preconditions.md` |
| Gate | PASS | `task.116.gate.6.qa-loop-routes-and-preconditions.yml` (100) — cycle entry `**Action**: Proceeding to 5c (PR conformance review)`; gates 1–5: CONCERNS 80 / FAIL 40 / CONCERNS 60 / FAIL 70 / FAIL 50 |
| DoD | ❌ | not yet — Step 7 has not run (expected) |
| Sprint review | ❌ | not yet — Step 7 (expected) |
| Open bugs | 0 | bugs 1–7 all `✅ Closed` (7, 2, 6 closed at cycle 6) |
| Handover | ❌ | none (access `full`; nothing deferred) |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| SC1 — `CONCERNS` with empty `top_issues[]` reaches 5c; 5b only on an open finding | `shared/resources/develop-pipeline-step-5-6-qa-loop.md` Outcome branching arms 3–5 + §5c route 3; `evals/shared/tests/pr-review-loop-parity.test.mjs` (matrix-driven exhaustiveness, paraphrase guard, Action-row writer); replay fixture `evals/develop-task/step-isolation/09-qa-concerns-empty-gate-routes-to-5c/` | ✅ met |
| SC2 — qa-task/qa-story cannot write or publish a gate while a dispatched review is outstanding | `skills/qa-task/SKILL.md` 3b post-condition, Step 10 / 13 preconditions; `skills/qa-story/SKILL.md` 1.6 / Output 2 / PR comment; `evals/shared/tests/qa-gate-preconditions-parity.test.mjs` | ✅ met |
| SC3 — Step 3b executes candidates when the boundary rule fires, reporting `probes_executed` | qa-task 3b item 3 / qa-story 1.6 (pointer to `probe-boundary-rule.md`, `security-input-corpus.mjs`); gates 1–6 carry `probes_executed` | ✅ met |
| SC4 — platform-variance check + command in 3b/3c and the review prompt | qa-task 3b item 4 + 3c; qa-story 1.6/1.7; `shared/resources/code-review-prompt.md` PLATFORM VARIANCE category (`TMPDIR=/tmp node --test …`) | ✅ met |
| SC5 — autonomous-defaults names unavailable / failed / slow; "output-file size is not a liveness signal" at every dispatch site | `shared/resources/develop-pipeline-autonomous-defaults.md` §Subagents table + `subagents.wallClockMinutes`; pointers in step-3 develop loop, review-task, review-story, qa-fix, qa-task, qa-story (12 occurrences of the sentence in the diff) | ✅ met |
| SC6 — observations #17, #20, #44, #51, #56, #62 close naming this PR | no hunk — the observation log lives outside the repository; a post-merge operator step (PC-1) | ⚠️ partial — deferred by design |

## Conformance Findings

```
[PC-2] trail · medium · confidence: high — task.116.implementation.1.qa-loop-routes-and-preconditions.md:6,39,225-229
  The implementation report contradicted itself: header "Status: Escalated", Pipeline Progress 5–6 row "5 cycles … escalated, 5c not reached" and the Completion block "Finished 05:50 (escalated) … 5c not reached", while the "### QA Cycle 6" entry records gate PASS with "Action: Proceeding to 5c" and the Resume-after-escalation decision authorises that cycle.
  → Update the header Status, the 5–6 row (6 cycles, gate 6 PASS 100, 5c pending) and the Completion block before Step 8 commits the report.
  ✎ Orchestrator action (same session, working tree): header, 5–6 row and Completion block rewritten; committed with the report at Step 8.

[PC-1] coverage · low · confidence: medium — Success Criteria 6
  Criterion 6 has no hunk and cannot be satisfied from the tree; review.1 (:96) and qa.6 ("SC6 N/A") both defer it to a post-merge operator action while the document still lists it as a criterion.
  → Reword criterion 6 as a post-merge operator step so the document does not promise what the change set cannot deliver; close the six observations once #404 merges.
  ✎ Orchestrator action: criterion 6 now states it is a post-merge operator step (working tree; Step 8).

[PC-3] scope · low · confidence: high — skills/review-pr/SKILL.md:194,546 vs task document §7 Files Summary
  The diff rewrites two sentences in skills/review-pr/SKILL.md (qa-fix cycle 4, CR-4) but the Files Summary — extended for every other qa-fix-added file — has no row for review-pr.
  → Add a Files Summary row for skills/review-pr/SKILL.md.
  ✎ Orchestrator action: row added (working tree; Step 8).
```

## Code Review Findings

```
[CR-1] bug · low · confidence: medium — shared/resources/develop-pipeline-autonomous-defaults.md:56
  The new call site `read_nested_config_key subagents wallClockMinutes` widens the reader surface without adding `subagents|wallClockMinutes` to `_CONFIG_GUARDED_KEYS` (shared/resources/read-config.sh:468), so a quoted or spaced spelling ("subagents":) passes the tier-2 subset scan and silently reads as the default 10 rather than being refused; tracker-access.test.sh scans only shared/resources/*.sh, not prose call sites.
  → Append `subagents` and `wallClockMinutes` to `_CONFIG_GUARDED_KEYS` (and its header call-site list), as was done for `observations|workspace`; regenerate the bundled read-config.sh copies.

[CR-2] bug · low · confidence: low — shared/resources/develop-pipeline-step-5-6-qa-loop.md:292
  A `WAIVED` gate with `waiver.active: true` but no documented reason/approver fails arm 2 (which requires them), is excluded from arm 5 (`waiver.active` not true) and does not meet arm 6's stated malformed definition, so it has no arm.
  → Drop the reason/approver qualifier from arm 2's routing condition (keep it as a gate-writer rule), or name an active waiver lacking reason/approver in arm 6's malformed definition.

[CR-3] cleanup · low · confidence: high — shared/resources/pr-conformance-prompt.md:65
  The TRAIL bullet states a two-value dichotomy (`Proceeding to 5c` / `Running qa-fix`) while the QA-loop preamble this PR adds defines a closed three-value set that also includes `Escalating — loop not converging`.
  → Reword to "and any other value (`Running qa-fix …`, `Escalating — loop not converging`) means it did not reach 5c".
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-2
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.116.qa-loop-routes-and-preconditions/task.116.implementation.1.qa-loop-routes-and-preconditions.md:6,39,225-229"
    finding: "The implementation report's header Status, Pipeline Progress 5–6 row and Completion block still describe the cycle-5 escalation while the QA Cycle 6 entry records gate PASS proceeding to 5c."
    suggested_action: "Update the header Status, the 5–6 row and the Completion block to the operator-authorised cycle 6 before Step 8 commits the report."
  - id: PC-1
    category: coverage
    severity: low
    confidence: medium
    ref: "Success Criteria 6"
    finding: "Criterion 6 (six observations close naming this PR) has no hunk in the diff and cannot be satisfied from the tree; it is deferred to a post-merge operator action while still listed as a criterion."
    suggested_action: "Reword criterion 6 as a post-merge operator step and close the observations once PR #404 merges."
  - id: PC-3
    category: scope
    severity: low
    confidence: high
    ref: "skills/review-pr/SKILL.md:194,546"
    finding: "The diff edits skills/review-pr/SKILL.md but the task document's Files Summary has no row for it."
    suggested_action: "Add a Files Summary row for skills/review-pr/SKILL.md."
  - id: CR-1
    category: bug
    severity: low
    confidence: medium
    ref: "shared/resources/develop-pipeline-autonomous-defaults.md:56"
    finding: "The new read_nested_config_key subagents wallClockMinutes call site is not covered by _CONFIG_GUARDED_KEYS in read-config.sh, so a quoted or spaced key spelling silently reads as the default instead of being refused."
    suggested_action: "Append subagents and wallClockMinutes to _CONFIG_GUARDED_KEYS and regenerate the bundled read-config.sh copies."
  - id: CR-2
    category: bug
    severity: low
    confidence: low
    ref: "shared/resources/develop-pipeline-step-5-6-qa-loop.md:292"
    finding: "A WAIVED gate with waiver.active true but no reason/approver matches neither arm 2, arm 5 nor arm 6's malformed definition."
    suggested_action: "Drop the reason/approver qualifier from arm 2's routing condition or extend arm 6's malformed definition to name it."
  - id: CR-3
    category: cleanup
    severity: low
    confidence: high
    ref: "shared/resources/pr-conformance-prompt.md:65"
    finding: "The TRAIL bullet's two-value Action-row dichotomy omits the third closed-set value Escalating — loop not converging."
    suggested_action: "Reword the bullet so any value other than Proceeding to 5c means the gate did not reach 5c."
truncated_count: 0
```

## Recommended Actions

1. PC-2 — commit the corrected implementation report header / 5–6 row / Completion block at Step 8 (done in the working tree).
2. CR-1 — add `subagents|wallClockMinutes` to `_CONFIG_GUARDED_KEYS` in `shared/resources/read-config.sh` and re-bundle (follow-up; low, medium confidence — verified the list at `:468` omits both keys).
3. CR-3 — align the conformance prompt's TRAIL bullet with the three-value Action-row set (follow-up; one sentence).
4. CR-2 / PC-1 / PC-3 — low; PC-1 and PC-3 addressed in the working tree; CR-2 is a gate-writer-rule vs routing-condition wording question for the loop doc's next edit.
