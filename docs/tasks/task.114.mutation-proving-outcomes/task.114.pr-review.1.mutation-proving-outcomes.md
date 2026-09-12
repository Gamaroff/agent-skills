# PR Review Report: PR #400 — feat(task.114): mutation-proving.md organised around what a mutation run can tell you

**Reviewed:** 2026-09-12
**PR:** [#400](https://github.com/Gamaroff/agent-skills/pull/400) — `feature/task.114.mutation-proving-outcomes` → `develop` (OPEN)
**Work item:** [`task.114.mutation-proving-outcomes.md`](./task.114.mutation-proving-outcomes.md) — resolved via `branch-stem`
**Tracker:** [#399](https://github.com/Gamaroff/agent-skills/issues/399) — OPEN (task, priority:high)
**Verdict:** ✅ APPROVE

Effort: medium. Diff scope: `origin/develop...origin/feature/task.114.mutation-proving-outcomes` excluding `*/references/*` (six auto-generated bundled copies) — 20 files, +2021/−91.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.114.implementation.1.mutation-proving-outcomes-initial-run.md |
| Review report | ✅ | task.114.review.1.mutation-proving-outcomes.md (READY TO IMPLEMENT 9/10) |
| QA reports | 3 | task.114.qa.{1,2,3}.mutation-proving-outcomes.md |
| Gate | PASS | task.114.gate.3.mutation-proving-outcomes.yml (95) — gates 1–2 CONCERNS, all issues closed in place |
| DoD | ❌ | not yet — `/finalise` has not run (status `ready-for-review`; correct at Step 5c) |
| Sprint review | ❌ | not yet — same |
| Open bugs | 0 | bugs 1–5 all Closed |
| Handover | ❌ | none — no deferred tracker actions |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| 1. Every §2 outcome has a rule and discriminating question | `shared/resources/mutation-proving.md` — 13-row table, 6 instrument rules + check rule, shape 7 | ✅ met |
| 2. No consumer states a count of the doc's shapes; a test asserts it | three pointers rewritten; `evals/shared/tests/mutation-proving-pointers-parity.test.mjs` (test 1 red on 8 distinct mutations across the run) | ✅ met |
| 3. Step 3c distinguishes "reds a committed test" from "development-time only" | `skills/qa-task/SKILL.md` Step 3c, `skills/qa-story/SKILL.md` Mutation-Proof Spot Check — `covered` vs `dev-only` | ✅ met |
| 4. Observations #16…#55 close naming this PR | not in the diff — the observation log lives outside the repo; PR body defers to the operator after merge | ⚠️ partial (operator follow-up, see PC-1) |

## Conformance Findings

```
[PC-1] coverage · low · confidence: medium — Success Criteria #4 (task.114.mutation-proving-outcomes.md:132)
  Criterion 4 has no deliverable in the diff and no pipeline step owns it — the log lives outside the repo and the PR body defers closure to an operator after merge.
  → Close the twelve observations once PR #400 merges (observation-log.js set-status --status actioned), or reword the criterion as a post-merge operator follow-up so /finalise does not read it as an unmet DoD item.

[PC-2] consistency · low · confidence: low — frontmatter pr_number (task.114.mutation-proving-outcomes.md:1-16)
  No pr_number yet and the body does not reference PR #400 — the normal pre-/finalise state; /finalise writes the field.
  → No action before /finalise; confirm it writes pr_number: 400.

[PC-3] scope · low · confidence: medium — skills/qa-task/SKILL.md:477, skills/qa-story/SKILL.md:376
  While removing "four shapes", the two Step 3c consumers gain a new restated count of the target ("four of its steps exist because…") that the parity regex (count + "shapes") does not guard — the #18 class the task exists to prevent, correct today, with nothing keeping it true.
  → Drop the numeral, or extend the parity test to counted "steps" beside a pointer.
```

## Code Review Findings

```
[CR-1] cleanup · low · confidence: medium — CHANGELOG.md:35
  The entry says the parity test was mutation-proved "two ways at authoring, and two more at QA cycle 1", while the test header also records two cycle-2 mutations — the changelog understates the proof record it points at.
  → Append the cycle-2 mutations or refer to the test header.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: coverage
    severity: low
    confidence: medium
    ref: "Success Criteria #4 (task.114.mutation-proving-outcomes.md:132)"
    finding: "Criterion 4 (observations close naming this PR) has no deliverable in the diff and no pipeline step owns it; the PR body defers it to an operator after merge."
    suggested_action: "Close the observations once PR #400 merges, or reword the criterion as a post-merge operator follow-up."
  - id: PC-2
    category: consistency
    severity: low
    confidence: low
    ref: "frontmatter pr_number (task.114.mutation-proving-outcomes.md:1-16)"
    finding: "No pr_number in frontmatter yet — the normal pre-/finalise state."
    suggested_action: "No action before /finalise; confirm it writes pr_number: 400."
  - id: PC-3
    category: scope
    severity: low
    confidence: medium
    ref: "skills/qa-task/SKILL.md:477"
    finding: "The Step 3c consumers gain a new restated count of the target ('four of its steps') that the parity regex does not guard."
    suggested_action: "Drop the numeral, or extend the parity test to counted 'steps' beside a pointer."
  - id: CR-1
    category: cleanup
    severity: low
    confidence: medium
    ref: "CHANGELOG.md:35"
    finding: "The CHANGELOG proof tally omits the two cycle-2 mutations the test header records."
    suggested_action: "Append the cycle-2 mutations or refer to the test header."
truncated_count: 0
```

## Recommended Actions

1. PC-3 — drop "four of its" in both Step 3c texts (one word; the class this task exists to remove).
2. CR-1 — make the CHANGELOG tally agree with the test header.
3. PC-1 — after merge, close observations #16, #18, #19, #26, #29, #32, #37, #41, #42, #45, #47, #55 naming PR #400; treat criterion 4 as an operator follow-up in the DoD.
4. PC-2 — nothing; `/finalise` writes `pr_number`.
