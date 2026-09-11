# PR Review Report: PR #387 — docs(task.107): rewrite the bug-fix runbook against the pipeline that exists

**Reviewed:** 2026-09-11
**PR:** [#387](https://github.com/Gamaroff/agent-skills/pull/387) — `feature/task.107.bug-runbook-rewrite` → `develop` (OPEN)
**Work item:** [`task.107.bug-runbook-rewrite.md`](./task.107.bug-runbook-rewrite.md) — resolved via `branch stem`
**Tracker:** [#386](https://github.com/Gamaroff/agent-skills/issues/386) — OPEN
**Verdict:** 🚨 **REQUEST CHANGES**

> **Scope:** 11 files, +1377/−59. No paths excluded — this change touches no generated
> `references/` copies.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.107.implementation.1.bug-runbook-rewrite-initial-run.md` |
| Review report | ✅ | `task.107.review.1.bug-runbook-rewrite.md` (READY TO IMPLEMENT, 8/10) |
| QA reports | 2 | `task.107.qa.1.*.md`, `task.107.qa.2.*.md` |
| Gate | **PASS** | `task.107.gate.2.bug-runbook-rewrite.yml` (95); cycle 1 was FAIL (70) |
| DoD | ❌ | Step 7 has not run — correct at this point in the pipeline |
| Sprint review | ❌ | Written by Step 7 |
| Open bugs | 0 | — |
| Handover | ✅ | none outstanding (`access.tracker` is `full`) |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| SC1 — names `/develop-bug` + `/review-bug`, actual step order | `bug-fix.md` "Phase 1 — The 8 steps" table | ✅ met |
| SC2 — three modes, pattern + numbering each | `bug-fix.md` "Pick the bug mode first" table | ✅ met |
| SC3 — tracker-sync on both arms, names which skill | `bug-fix.md` "Tracker sync — both arms" + the split-by-arm paragraph | ✅ met (was the cycle-1 FAIL) |
| SC4 — no `## Change Log` in bug-report guidance | 0 `^## Change Log` headings in `bug-fix.md` | ✅ met |
| SC5 — `which-path.md` routes a defect to the bug path | Q1 in flowchart, prose fallback and quick-reference table | ✅ met |
| SC6 — hotfix boundary callout unchanged | byte-identical apart from one prettier blank line | ✅ met |
| SC7 — every internal link resolves against the tracked tree | 38 links added, 0 dead | ✅ met |
| SC8 — `bug-fix.md` ≤ 200 lines | `wc -l` = 200 | ✅ met (at the boundary) |

**8 of 8 met.** The deliverable satisfies the task. Every finding below is in the **paper trail**,
not in the change — which is precisely the gap this lens exists to cover, and the QA gate could not
see it because a QA gate reviews the deliverable.

## Conformance Findings

```
[PC-1] consistency · high · confidence: high — docs/tasks/task.107.bug-runbook-rewrite/task.107.bug-runbook-rewrite.md:80-121
  The entire QA Testing Results block was spliced into the middle of §3's sentence. An unanchored
  string replace matched the FIRST occurrence of "## Change Log" — which was inside §3's prose
  ("barred from the `## Change Log`, and a rewrite is exactly where…") rather than the real heading
  at line 199. §3 now reads "barred from the `## QA Testing Results" and breaks mid-sentence; a
  malformed heading "## Change Log`, and a" sits at line 120; the QA section has no real heading.
  → Restore §3's sentence and move the QA block to its own `## QA Testing Results` heading after §11.

[PC-2] trail · medium · confidence: high — task.107.bug-runbook-rewrite.md → "### Key Findings"
  Key Findings is verbatim cycle-1 text — "Six of eight success criteria clean, one marginal, one
  failed. **SC3 failed**" — contradicting the same section's "Gate Decision: PASS", the Fix Cycle
  table's "SC3 now met", and gate.2's "All 8 success criteria now met".
  → Rewrite against the cycle-2 outcome.

[PC-3] trail · medium · confidence: high — task.107.implementation.1.*.md:39
  Pipeline Progress still marks row "5–6. qa-task / qa-fix loop" as ⏳ Pending with empty Notes,
  while the same file's QA Iteration History records two completed cycles and both gates exist.
  → Mark the row done with the cycle count, gate results and 5c state.

[PC-4] trail · low · confidence: high — task.107.bug-runbook-rewrite.md → Fix Cycle table, TASK-107-004
  Row states "Trimmed 200 → **198** lines"; the shipped file is 200. qa.2 records the full story
  ("198 at the time of fix; the cycle-2 correction returned it to 200"); the task doc dropped it.
  → Carry qa.2's wording across.

[PC-5] trail · low · confidence: high — task.107.bug-runbook-rewrite.md → Test Coverage Summary
  "Phases Verified: 4/4 (phase 2 with concerns)" carries gate.1's `phases_with_issues: [2]`; the
  governing gate.2 records `[]` and maintainability upgraded CONCERNS → PASS.
  → Drop the qualifier or attribute it to cycle 1.
```

## Code Review Findings

**None.**

> **The dispatched code lens was killed prematurely — my error, not its.** I judged it stalled from a
> 159-byte output file; the file had in fact grown to ~712 KB and the agent was midway through
> verifying citations when I stopped it. Three other subagents genuinely did hang this run, and I
> applied that pattern to one that was working. The pass was completed in-line instead, and each item
> in its brief was executed:
>
> - **The verification block, run verbatim from the shipped file**: prints `status: closed`,
>   `**Status**: ✅ Closed`, `1`, `0` and the registry row — exactly its comments.
> - **Links**: 38 relative links added by the diff, resolved against the **tracked** tree
>   (`git ls-files`) — 0 dead.
> - **Mermaid**: both flowcharts validated through the Mermaid renderer — `valid: true`.
> - **Gate YAML**: both files parse; all thirteen required keys present in each; every `top_issues`
>   entry carries `id`/`severity`/`file`/`finding`/`suggested_action`/`suggested_owner`.
>
> Recorded rather than presented as a clean two-reader pass: the code lens here was one reader, and
> that reader wrote the code. The conformance lens — which produced every finding above — did complete
> as an independent second reader.

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: consistency
    severity: high
    confidence: high
    ref: "docs/tasks/task.107.bug-runbook-rewrite/task.107.bug-runbook-rewrite.md:80"
    finding: "The QA Testing Results block was spliced into the middle of section 3's sentence by an unanchored replace that matched an inline code span instead of the heading, leaving a malformed heading and a broken sentence."
    suggested_action: "Restore section 3's sentence and move the QA block to its own heading after section 11."
  - id: PC-2
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.107.bug-runbook-rewrite/task.107.bug-runbook-rewrite.md:117"
    finding: "The Key Findings paragraph is verbatim cycle-1 text asserting SC3 failed, contradicting the PASS gate and the fix table in the same section."
    suggested_action: "Rewrite Key Findings against the cycle-2 outcome."
  - id: PC-3
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.107.bug-runbook-rewrite/task.107.implementation.1.bug-runbook-rewrite-initial-run.md:39"
    finding: "The Pipeline Progress row for the QA loop still reads Pending while the QA Iteration History below it records two completed cycles."
    suggested_action: "Mark the row done with the cycle count, gate results and 5c state."
  - id: PC-4
    category: trail
    severity: low
    confidence: high
    ref: "docs/tasks/task.107.bug-runbook-rewrite/task.107.bug-runbook-rewrite.md:110"
    finding: "The fix-cycle row states the page was trimmed to 198 lines; the shipped file is 200."
    suggested_action: "Carry the QA report's full wording across."
  - id: PC-5
    category: trail
    severity: low
    confidence: high
    ref: "docs/tasks/task.107.bug-runbook-rewrite/task.107.bug-runbook-rewrite.md:96"
    finding: "Phases Verified carries cycle 1's phases_with_issues value, which the governing gate 2 records as empty."
    suggested_action: "Drop the qualifier or attribute it to cycle 1."
truncated_count: 0
```

## Recommended Actions

1. **PC-1 first, and by hand** — it is a structural corruption of the work item, introduced by an
   unanchored string replace. Verify the repair by reading §3 and the heading list, not by re-running
   a replace.
2. PC-2, PC-3 — the trail currently tells two different stories about the same run.
3. PC-4, PC-5 — stale cycle-1 numbers in a section that now reports cycle 2.

> **What this run says about the two lenses.** The QA gate passed the deliverable at 95/100 and was
> right to: all eight success criteria are met and the code lens is clean. Every finding here is in
> the *record of the work*, which no QA gate reads. PC-1 in particular was invisible to `prettier`,
> `markdown-link-check`, `ci:fast` and both QA cycles — the file is structurally valid markdown, it
> just says something other than what it means.
