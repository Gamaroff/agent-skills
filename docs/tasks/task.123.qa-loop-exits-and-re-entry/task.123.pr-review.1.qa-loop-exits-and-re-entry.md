# PR Review Report: PR #435 — feat(task.123): QA loop routes 2b/2c, qa_phase lock position, re-entry after a spent budget

**Reviewed:** 2026-09-19
**PR:** [#435](https://github.com/Gamaroff/agent-skills/pull/435) — `feature/task.123.qa-loop-exits-and-re-entry` → `develop` (OPEN)
**Work item:** [`task.123.qa-loop-exits-and-re-entry.md`](./task.123.qa-loop-exits-and-re-entry.md) — resolved via `branch-stem`
**Tracker:** [#423](https://github.com/Gamaroff/agent-skills/issues/423) — OPEN
**Verdict:** ⚠️ CONCERNS

Scope: `git diff origin/develop...origin/feature/task.123.qa-loop-exits-and-re-entry` excluding `*/references/*` (bundled, auto-generated copies of `shared/resources/`) — 158 files, +8453/−244. No excluded path is named in the work item's Files Summary, the PR body or a commit subject, so the default exclusion stands. Effort: medium; both lenses run as read-only Explore subagents. Invoked at pipeline Step 5c, cycle 5 of 5, after the Cosmetic-residue exit (route 2b).

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.123.implementation.1.qa-loop-exits-and-re-entry-initial-run.md` |
| Review report | ✅ | `task.123.review.1.qa-loop-exits-and-re-entry.md` |
| QA reports | 5 | `task.123.qa.1..5.qa-loop-exits-and-re-entry.md` |
| Gate | PASS | `task.123.gate.5.qa-loop-exits-and-re-entry.yml` (100) — cycle 5 entry reads `Proceeding to 5c` (route 2b; C5-CR-1..4 carried to `recommendations.future`, closed) |
| DoD | ❌ | expected — Step 7 `/finalise` has not run; document reads `ready-for-review` |
| Sprint review | ❌ | expected — written by `/finalise` |
| Open bugs | 0 | 14 bug reports, all `✅ Closed` |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

Success criteria (§9 of the work item, checklist form):

| Criterion | Evidence in diff | Status |
|---|---|---|
| Route 2b (cosmetic-residue) / route 2c (gate-the-last-fix) / lock position option B (`qa_phase`) | `shared/resources/qa-diminishing-returns.js` (`classifyLoopRoute`, `describeLoopRoute`), `develop-pipeline-step-5-6-qa-loop.md` §5c five routes, `set-qa-phase.sh`, `develop-pipeline-on-stop.sh` `case 5)` | ✅ met |
| Re-invocation offers the grant, counts on-disk gates, back-fills entries | `grant-qa-cycles.sh` (base = max(gate, report)), `develop-pipeline-resume-contract.md` "Re-entry after a QA loop escalation", both `SKILL.md` Phase 0b prompt | ✅ met |
| Route 2c cost ≤ half a cycle | step doc "Gate-the-last-fix half-cycle" — one 5a, no 5b | ✅ met |
| Every new route: replay fixture + mutation proof | `evals/develop-{task,story}/step-isolation/{10,11,12}-*`; 17+ mutants recorded across gates 1–5 | ✅ met |
| Accepting-route set stated once | §5c enumeration + `pr-review-loop-parity.test.mjs` `staleRouteCountPatterns` | ✅ met |
| Observations #72, #77, #95, #100, #112 close naming the PR | observation log entries `actioned` → PR #435 (recorded in the task's Deferred Work) | ✅ met |

## Conformance Findings

```
[PC-1] consistency · low · confidence: medium — docs/tasks/task.123.qa-loop-exits-and-re-entry/task.123.qa-loop-exits-and-re-entry.md:573-574
  The Progress Tracking checklist leaves `QA: task.123.qa.[N]…` and `Gate: task.123.gate.[N]…` unticked while five QA reports and five gates sit beside the document and the QA Testing Results section already reports gate 5 PASS.
  → Tick the two Progress Tracking rows (or let /finalise do so) so the checklist agrees with the QA Testing Results section and the artifacts on disk.
```

## Code Review Findings

```
[CR-1] bug · medium · confidence: high — shared/resources/develop-pipeline-step-5-6-qa-loop.md:1363
  The route-2c half-cycle runs as cycle N+1 = QA_MAX_CYCLES+1 and hands a clean gate to 5c, but 5c's REQUEST CHANGES row (line 1182) unconditionally returns to 5b, and 5b step 7 (line 1046) plus the Stop hook's 5b/5c sentences (develop-pipeline-on-stop.sh:175,177) only escalate when the counter *equals* QA_MAX_CYCLES — so after the half-cycle a REQUEST CHANGES verdict re-enters 5b at N+1, increments to N+2 and the loop runs past its budget with no limit until a gate clears or the Convergence check trips (the half-cycle eval 11-* only exercises the APPROVE branch).
  → Make the loop-limit trigger a >= comparison (counter >= QA_MAX_CYCLES) everywhere it is stated, and give the half-cycle section an explicit arm for 5c returning REQUEST CHANGES on gate N+1 (escalate with the review's findings, no 5b), then add that branch to the route-2c eval.

[CR-2] bug · low · confidence: medium — shared/resources/grant-qa-cycles.sh:159
  The ownership guard is skipped when the snapshot has no task_or_story_directory on the stated grounds that this is a 'pre-task.123 shape', but the lock has carried that field since Step 1 wrote it (develop-pipeline-step-1-create-branch.md:135), so an absent field is a malformed or hand-edited snapshot, and the guard resolves 'field missing because old' and 'field missing because broken' to the same silent accept.
  → Refuse (or at least warn on stderr about) a snapshot with no task_or_story_directory instead of accepting it, and drop the pre-task.123 justification from the comment and header.

[CR-3] cleanup · low · confidence: high — shared/resources/develop-pipeline-step-5-6-qa-loop.md:521
  The MEDIUM_N snippet maps countRaised() === null to 0, but the input is always a readFileSync string so null is unreachable, and collapsing 'could not read' into '0 raised' is exactly the ambiguous-signal shape the engine's own readTopIssues docstring forbids.
  → Drop the null branch (let a non-string gate fail loudly) or exit non-zero on null so the orchestrator continues into 5b rather than recording a fabricated 0.

[CR-4] cleanup · low · confidence: high — evals/shared/tests/qa-loop-lock-fields-parity.test.mjs:63
  The lookarounds in /\bcycles_granted\b(?<!extra_cycles_granted)/ and /\bextra_cycles\b(?!_granted)/ are dead: '_' is a word character, so \b never falls inside extra_cycles_granted and neither pattern could match it without the lookaround.
  → Simplify to /\bcycles_granted\b/ and /\bextra_cycles\b/ so the misspelling list reads as what it actually checks.
```

Orchestrator note on CR-1: the reviewer's reading was spot-checked against the cited lines — 5b step 7 ("If the counter reads `QA_MAX_CYCLES`") and the hook's 5b sentence ("if the counter reads QA_MAX_CYCLES") are both equality tests, and the 5c REQUEST CHANGES row returns to 5b without a budget check. The route-2c → 5c → REQUEST CHANGES path is therefore unbounded as written. It is a defect in this task's own delivery; the verdict is CONCERNS (medium, not high), so per the pipeline's verdict branching it is recorded, not blocking.

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: consistency
    severity: low
    confidence: medium
    ref: "docs/tasks/task.123.qa-loop-exits-and-re-entry/task.123.qa-loop-exits-and-re-entry.md:573-574"
    finding: "The Progress Tracking checklist leaves the QA and Gate rows unticked while five QA reports and five gates sit beside the document and the QA Testing Results section already reports gate 5 PASS."
    suggested_action: "Tick the two Progress Tracking rows (or let /finalise do so) so the checklist agrees with the QA Testing Results section and the artifacts on disk."
  - id: CR-1
    category: bug
    severity: medium
    confidence: high
    ref: "shared/resources/develop-pipeline-step-5-6-qa-loop.md:1363"
    finding: "After the route-2c half-cycle at cycle N+1, a 5c REQUEST CHANGES verdict re-enters 5b unconditionally and the loop-limit trigger (5b step 7 and the Stop hook's 5b/5c sentences) tests equality with QA_MAX_CYCLES, so the loop runs past its budget with no limit until a gate clears or the Convergence check trips."
    suggested_action: "Make the loop-limit trigger a >= comparison everywhere it is stated, add an explicit arm for 5c returning REQUEST CHANGES on gate N+1 (escalate with the review's findings, no 5b), and add that branch to the route-2c eval."
  - id: CR-2
    category: bug
    severity: low
    confidence: medium
    ref: "shared/resources/grant-qa-cycles.sh:159"
    finding: "The ownership guard silently accepts a snapshot with no task_or_story_directory on a 'pre-task.123 shape' justification, but the lock has carried that field since Step 1, so an absent field is malformed input and 'missing because old' and 'missing because broken' resolve to the same accept."
    suggested_action: "Refuse (or warn on stderr about) a snapshot with no task_or_story_directory instead of accepting it, and drop the pre-task.123 justification."
  - id: CR-3
    category: cleanup
    severity: low
    confidence: high
    ref: "shared/resources/develop-pipeline-step-5-6-qa-loop.md:521"
    finding: "The MEDIUM_N snippet maps countRaised() === null to 0, but null is unreachable for a readFileSync string input and collapsing 'could not read' into '0 raised' is the ambiguous-signal shape the engine forbids."
    suggested_action: "Drop the null branch or exit non-zero on null so the orchestrator continues into 5b rather than recording a fabricated 0."
  - id: CR-4
    category: cleanup
    severity: low
    confidence: high
    ref: "evals/shared/tests/qa-loop-lock-fields-parity.test.mjs:63"
    finding: "The lookarounds on the cycles_granted / extra_cycles misspelling patterns are dead because '_' is a word character and \\b never falls inside extra_cycles_granted."
    suggested_action: "Simplify to /\\bcycles_granted\\b/ and /\\bextra_cycles\\b/."
truncated_count: 0
```

## Recommended Actions

1. **CR-1** — close the budget gap on the route-2c → 5c → REQUEST CHANGES path: `>=` on every loop-limit trigger (5b step 7, the Stop hook's 5b and 5c sentences), an explicit escalation arm in the half-cycle section, and a route-2c eval branch for the REQUEST CHANGES verdict. Filed as follow-up work under the task's Deferred Work.
2. CR-2 — refuse or warn on a snapshot missing `task_or_story_directory`; drop the "pre-task.123 shape" justification.
3. PC-1 — tick the QA / Gate rows in Progress Tracking (`/finalise` at Step 7 is the natural writer).
4. CR-3, CR-4 — cleanups, at leisure.
