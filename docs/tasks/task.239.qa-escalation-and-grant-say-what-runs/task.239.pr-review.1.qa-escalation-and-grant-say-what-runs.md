# PR Review Report: PR #779 — feat(task.239): QA escalation and grant say what will run

**Reviewed:** 2026-10-28
**PR:** [#779](https://github.com/Gamaroff/agent-skills/pull/779) — `feature/task.239.qa-escalation-and-grant-say-what-runs` → `develop` (OPEN)
**Work item:** [`task.239.qa-escalation-and-grant-say-what-runs.md`](./task.239.qa-escalation-and-grant-say-what-runs.md) — resolved via `branch stem`
**Tracker:** [#769](https://github.com/Gamaroff/agent-skills/issues/769) — OPEN
**Verdict:** ✅ APPROVE

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.239.implementation.1.qa-escalation-and-grant-say-what-runs-initial-run.md (QA-loop entries uncommitted until Step 8, by design) |
| Review report | ✅ | task.239.review.1.qa-escalation-and-grant-say-what-runs.md |
| QA reports | 5 | task.239.qa.1 … task.239.qa.5 |
| Gate | PASS | task.239.gate.5.qa-escalation-and-grant-say-what-runs.yml (100) |
| DoD | ❌ | not yet — Step 7 writes it; this review runs at Step 5c |
| Sprint review | ❌ | not yet — Step 7 writes it |
| Open bugs | 0 | bug.1 and bug.2 are Closed |
| Handover | — | none |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| SC-1: the grant writes `convergence_from_cycle` in the same write and prints it | `shared/resources/grant-qa-cycles.sh` jq write; `grant-qa-cycles.test.sh` both grant kinds | ✅ met |
| SC-2: the Convergence check counts from `convergence_from_cycle` | step-5-6 step 3 window clause; `qa-escalation-template.test.mjs` window rule and table rows | ✅ met |
| SC-3: the label reads "Resume the QA loop with {k} more cycles" | both SKILL.md, both READMEs, resume contract | ✅ met |
| SC-4: the templates run the third-strike comparison; step 1 is delete, replace or waive | filling rule 1; template test | ✅ met |
| SC-5: the not-converging variant carries the flat-count reading | both templates; template test | ✅ met |
| SC-6: the grant is one script call | Phase 0b unchanged in call count | ✅ met |
| SC-7: at most one `high_files` comparison per entry | filling rule 1 runs two on a loop limit since `274ebe31` | ⚠️ partial (PC-1) |
| SC-8: `npm run ci:fast` passes | CI green on `e265c5a8` | ✅ met |
| SC-9: `bundle:check` passes | 0 problems | ✅ met |
| SC-10: validate both skills | CI validate green | ✅ met |
| SC-11: every new guard mutation-proved | commit messages of `31f6b48b`, `274ebe31`, `978fa17d`, `e265c5a8` | ✅ met |
| SC-12: a pre-task lock resumes as before | table row `7, 7, 7` absent → trips at 3 | ✅ met |
| SC-13: CHANGELOG entry | `CHANGELOG.md` `[Unreleased]` | ✅ met |

## Conformance Findings

```
[PC-1] coverage · low · confidence: high — SC-7
  SC-7 is ticked as "at most one high_files comparison per entry", but since 274ebe31
  filling rule 1 has a loop-limit escalation run two: the two-gate comm command and the
  three-gate block. The last SC-7 pass (qa.2, head 31f6b48b) predates that change.
  → Reword SC-7 to match what shipped (one comparison on a convergence stall, two on a
    loop limit, as bug.1 and QA2-CR-3 require) with a Change Log row, or reduce the
    loop-limit rule to one comparison.
```

PC-1 came from a follow-up question to the conformance lens: the orchestrator noticed SC-7 while reading the criteria, and asked the lens to check it against filling rule 1. The lens's first pass returned no findings.

## Code Review Findings

Skipped (`--no-code`): QA ran the code reviewer on every cycle, with `code_review_blocking=true`.

**Anchors:** 1 checked against `6e930e4847793766ea2024df8484c7761988a292` (via `head-branch`). It is a criterion id with no file anchor, so `no-line`. All verified.

**Scope:** 23 generated `*/references/*` copies of `shared/resources/` files were excluded from the diff. None is named by the work item, the PR body or a commit subject.

## Machine-Readable Findings

```yaml
reviewed_gate: task.239.gate.5.qa-escalation-and-grant-say-what-runs.yml
findings:
  - id: PC-1
    category: coverage
    severity: low
    confidence: high
    ref: "SC-7"
    anchor_check: no-line
    finding: "SC-7 is ticked as at most one high_files comparison per entry, but since 274ebe31 a loop-limit escalation runs two (the two-gate command and the three-gate block)."
    suggested_action: "Reword SC-7 to match what shipped (one comparison on a stall, two on a loop limit) with a Change Log row, or reduce the loop-limit rule to one comparison."
truncated_count: 0
```

## Recommended Actions

1. Reword SC-7 to state one comparison on a convergence stall and two on a loop limit, and add a Change Log row. The PC-1 `ref` is a criterion id, so the 5c carry records it and does not fix it.
