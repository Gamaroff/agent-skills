# PR Review Report: PR #537 — feat(qa-results): QA Testing Results section engine — one writer, one place, refuses to stack (task 155)

**Reviewed:** 2026-10-01
**PR:** [#537](https://github.com/Gamaroff/agent-skills/pull/537) — `feature/task.155.qa-results-section-engine` → `develop` (OPEN, head `06b5d80f`)
**Work item:** [`task.155.qa-results-section-engine.md`](./task.155.qa-results-section-engine.md) — resolved via `branch-stem`
**Tracker:** [#486](https://github.com/Gamaroff/agent-skills/issues/486) — OPEN
**Verdict:** ⚠️ CONCERNS

Fourth pass (Step 5c, after QA cycle 9 / gate 9 CONCERNS 90). Effort `medium`. Scope: `git diff origin/develop...origin/feature/task.155.qa-results-section-engine`, excluding `*/references/*`. The two excluded files, `skills/qa-{task,story}/references/qa-results.js`, are byte-identical to `shared/resources/qa-results.js` apart from the AUTO-GENERATED header, and that source was reviewed. The implementation report was read from the **working tree**: it has 20 uncommitted lines covering QA cycles 3–9 and both operator grants, including "QA loop re-entry 2" and the operator acceptance rule. There is no DoD yet, which is expected because the task has not been finalised.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ (working tree ahead of HEAD) | `task.155.implementation.1.qa-results-section-engine-initial-run.md` — Cycle 9 `**Action**: Proceeding to 5c`; re-entry 2 and the operator rule are **uncommitted** (PC-2) |
| Review report | ✅ | `task.155.review.1.qa-results-section-engine.md` |
| QA reports | 9 | `task.155.qa.1` … `task.155.qa.9` |
| Gate | CONCERNS | `task.155.gate.9.qa-results-section-engine.yml` (90); REL-024..027 `status: waived` under the operator rule |
| DoD | — (expected) | not finalised |
| Sprint review | — (expected) | not finalised |
| Open bugs | 0 | — |
| Handover | — | none |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| One writer for the section (find + upsert) | `shared/resources/qa-results.js` `findQaResults` / `upsertQaResults`; `shared/resources/tests/qa-results.test.mjs` | ✅ met |
| Canonical placement before the change-log block | `canonicalOffset`; corpus test | ✅ met |
| Refuses to stack (`multiple`), never deletes outside the span | `upsertQaResults` refusals and `removesStructure`; gate 9 corpus run: 0 lines lost outside the span over 1,990 docs × 4 writes | ✅ met |
| Step 12 of qa-task / qa-story writes through the engine | `skills/qa-task/SKILL.md` Step 12, `skills/qa-story/SKILL.md` Step 12 item 3; `tests/qa-results-step12-wiring.test.js` | ✅ met |
| Corpus repaired and guarded (task.65) | `task.65` diff (−100); `tests/qa-results-corpus.test.js` | ✅ met |
| Content other skills write inside the section survives a replace | `CARRIED_SUBSECTIONS = ["Bug Reports"]` only | ⚠️ partial — Deferred Work (PC-1), linkless Bug Reports lines under a rendered list (PC-2 / CR-1) |

No false refusal was found. The code lens probed every tracked `docs/**/*.md`, and all 155 plain renders returned `replaced`.

## Conformance Findings

Ranked by plausibility and consequence. PC-1 was found and probed by the orchestrating reviewer, not by the conformance lens. PC-2..PC-7 are the lens's PC-1..PC-6, renumbered.

```
[PC-1] trail · medium · confidence: medium — task.155.qa-results-section-engine.md § Deferred Work ("task.141's hand-written `### Deferred Work` … is QA-owned text by this rule and is replaced whole"); shared/resources/qa-results.js:124
  Deletes content that a pipeline skill writes, and the task document classifies it as hand-written QA
  text. develop-pipeline-step-5-6-qa-loop.md routes 2 and 2b (lines 685, 737) say "record the same ids
  on the work item under **Deferred Work**" without saying where. On task.141 (1 of 23 tracked
  Deferred Work headings) that record landed inside the QA section. I probed a plain render against
  task.141: the result is `replaced`, `### Deferred Work` is gone, and 52 lines are lost. The route-2b
  → 5c → re-entry → next QA cycle sequence that deletes it is the same path this task took (cycle 7
  exit, PR review 3, re-entry). The operator rule reads "a deletion in a plausible document still
  blocks". Gate 9 routed this to future as "pre-existing (5b)". The deletion itself only becomes
  mechanical with this engine. Also, task.51's `### Known limits — deferred by operator decision` sits
  inside its span; that task is accepted and has low exposure.
  → Add "Deferred Work" to CARRIED_SUBSECTIONS (the cheapest fix; same carry machinery), or name a position outside the QA section in the route-2/2b step and correct the "hand-written / QA-owned" wording.

[PC-2] trail · medium · confidence: high — gate.9 REL-026 resolution; implementation report "carried under its second clause"
  REL-026 deletes content, and the operator rule carries only findings that "refuse or duplicate
  (never delete)". The waiver rests on the rule's converse ("a deletion that is not in a plausible
  document is carried"), and the operator never stated that. The affected documents are real
  (tasks 116, 42, 76 and 94 would lose 12 structure lines). The trigger, a render that carries its
  own Bug Reports list, is the path mergeCarried was built for, and neither Step 12 forbids it. My
  own assessment is that the trigger is unlikely, because no Step 12 template renders a list and
  no bug link is lost. The waiver still goes beyond the rule as written.
  → Re-open REL-026, or put it to the operator explicitly. The cheapest fix is one sentence in both Step 12 notes ("the rendered section must not include a Bug Reports list"), or carry the old block whole when the render has a list.

[PC-3] trail · medium · confidence: high — implementation report (working tree only)
  At PR head 06b5d80f the implementation report reads `**Status**: Escalated` and has no QA Cycle 9
  entry and no operator rule. Committed gate 9 stamps four waivers that cite "operator rule
  2026-10-01", and the only record of that rule is uncommitted.
  → Commit the working-tree implementation report with this PR review.

[PC-4] trail · low · confidence: medium — gate.9 REL-027 resolution
  REL-027 also deletes, so it also rests on the unstated converse clause. The facts behind it are
  honest: create-bug-report Step 5 writes exactly `### Bug Reports`, develop-bug and qa-fix only edit
  the list in place, and 0 tracked instances use a bold, singular or `### Bugs` label.
  → Have the operator ratify the "0-writer deletion" clause next to the rule.

[PC-5] consistency · low · confidence: high — CHANGELOG.md:115-117
  "a QA cycle never drops a task's bug links; every other subsection is QA's own and is replaced
  whole" overstates the engine. A `**Bug Reports**` label loses its links (REL-027), a rendered list
  drops linkless lines (REL-026), `####` blocks carry QA's own later subsections (REL-025), and
  task.141's Deferred Work is not QA's own (PC-1). The entry also does not mention the peel of a
  trailing HTML comment.
  → Qualify the entry and name REL-024..027 as known limits.

[PC-6] consistency · low · confidence: medium — skills/qa-task/SKILL.md:1369; skills/qa-story/SKILL.md:1892
  Both Step 12 notes say that a `### Bug Reports` list "is carried through the replace". Neither says
  what happens when the render brings its own list, which is the REL-026 trigger and the gate's own
  proposed mitigation.
  → One sentence in both notes (same fix as PC-2).

[PC-7] consistency · low · confidence: high — task.155.qa-results-section-engine.md:468
  "a render that includes its own list takes it over" contradicts the gate-8 bullet and the engine,
  which keep the render's entries and add every old line naming a link the render lacks.
  → Reword it, or mark it superseded.
```

## Code Review Findings

```
[CR-1] bug · medium · confidence: high — shared/resources/qa-results.js:192
  (= REL-026) With a rendered Bug Reports list, mergeCarried keeps only old lines that carry a
  link. It drops task.116's `#### Open Bugs` / `#### Closed` groups, task.42's table header and
  separator, task.76's and task.94's bold labels and every linkless entry, and it splices table rows
  under bullets. The function's comment says "nothing the old list recorded is lost".
  → Carry the old block whole (or every linkless, heading and table-header line) when the render has a list, or refuse the write.

[CR-2] bug · medium · confidence: high — shared/resources/qa-results.js:248
  (= REL-024) trimSeparator peels a trailing HTML comment, but normaliseSection does not strip one.
  A render that ends in a comment gains one copy per cycle (3 after 3 replaces). This duplicates
  content and never deletes it.
  → Make normaliseSection strip or refuse a trailing standalone comment under the same rule trimSeparator uses.

[CR-3] bug · low · confidence: medium — shared/resources/qa-results.js:250
  (= REL-024) Any last line ending in `-->` walks back to the nearest earlier `<!--` line, so stale
  QA content is left behind after the new section. This duplicates content and never deletes it.
  → Peel only a single, well-formed comment block.

[CR-4] cleanup · low · confidence: medium — shared/resources/qa-results.js:185
  With no rendered list, the 2nd and later old Bug Reports blocks fold in by body only, so their own
  heading lines (e.g. `### Bug Reports (2)`) are dropped. The links are kept.
  → Keep each later block's heading, or document the drop.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: trail
    severity: medium
    confidence: medium
    ref: "task.155.qa-results-section-engine.md § Deferred Work; shared/resources/qa-results.js:124"
    finding: "A QA replace silently deletes the Deferred Work record that the route-2/2b pipeline step writes on the work item (task.141: `replaced`, 52 lines lost), yet the task calls it hand-written QA text and gate 9 routed it to future as pre-existing."
    suggested_action: "Add Deferred Work to CARRIED_SUBSECTIONS, or name a position outside the QA section in the route-2/2b step, and correct the wording."
  - id: PC-2
    category: trail
    severity: medium
    confidence: high
    ref: "task.155.gate.9 REL-026 resolution"
    finding: "REL-026 deletes content, but it was waived under an operator rule whose carry clause covers only refuse-or-duplicate findings."
    suggested_action: "Re-open it or get explicit operator sign-off; the cheapest fix is forbidding a rendered Bug Reports list in both Step 12 notes."
  - id: PC-3
    category: trail
    severity: medium
    confidence: high
    ref: "task.155.implementation.1.qa-results-section-engine-initial-run.md (uncommitted)"
    finding: "The operator rule that gate 9's four waivers cite exists only in the uncommitted working-tree implementation report."
    suggested_action: "Commit the working-tree implementation report."
  - id: PC-4
    category: trail
    severity: low
    confidence: medium
    ref: "task.155.gate.9 REL-027 resolution"
    finding: "REL-027 deletes content and rests on an unstated converse of the operator rule, although its 0-writer facts check out."
    suggested_action: "Have the operator ratify the 0-writer-deletion clause next to the rule."
  - id: PC-5
    category: consistency
    severity: low
    confidence: high
    ref: "CHANGELOG.md:115-117"
    finding: "The CHANGELOG claims bug links are never dropped and every other subsection is QA's own, which REL-025..027 and task.141's Deferred Work contradict."
    suggested_action: "Qualify the entry and name REL-024..027 as known limits."
  - id: PC-6
    category: consistency
    severity: low
    confidence: medium
    ref: "skills/qa-task/SKILL.md:1369; skills/qa-story/SKILL.md:1892"
    finding: "The Step 12 notes are silent on a render that brings its own Bug Reports list, which is the REL-026 trigger."
    suggested_action: "Add one sentence to both notes forbidding or describing it."
  - id: PC-7
    category: consistency
    severity: low
    confidence: high
    ref: "task.155.qa-results-section-engine.md:468"
    finding: "The Deferred Work bullet says a rendered list takes over, which contradicts the engine's merge behaviour."
    suggested_action: "Reword it or mark it superseded."
  - id: CR-1
    category: bug
    severity: medium
    confidence: high
    ref: "shared/resources/qa-results.js:192"
    finding: "With a rendered Bug Reports list, mergeCarried drops every old linkless line (group headings, table headers, labels, linkless entries)."
    suggested_action: "Carry the old block whole when the render has a list, or refuse the write."
  - id: CR-2
    category: bug
    severity: medium
    confidence: high
    ref: "shared/resources/qa-results.js:248"
    finding: "A render that ends in an HTML comment stacks one copy per cycle, because trimSeparator peels it and normaliseSection keeps it."
    suggested_action: "Strip or refuse a trailing comment in normaliseSection under the same rule trimSeparator uses."
  - id: CR-3
    category: bug
    severity: low
    confidence: medium
    ref: "shared/resources/qa-results.js:250"
    finding: "A last line ending in `-->` walks back to an unrelated earlier comment and leaves stale content after the section."
    suggested_action: "Peel only a single well-formed comment block."
  - id: CR-4
    category: cleanup
    severity: low
    confidence: medium
    ref: "shared/resources/qa-results.js:185"
    finding: "Later Bug Reports blocks fold in without their heading lines."
    suggested_action: "Keep each later block's heading or document the drop."
truncated_count: 0
```

## Recommended Actions

1. **PC-1:** add `"Deferred Work"` to `CARRIED_SUBSECTIONS`, a one-line change on the machinery that already exists, plus a test on task.141's shape. Or fix the route-2/2b step so it names a position outside the section. This is the only deletion found in a shape a pipeline skill actually produces.
2. **PC-2 / PC-6 / CR-1:** add one sentence to both Step 12 notes forbidding a rendered Bug Reports list. That closes REL-026's trigger without code. Otherwise, get explicit operator sign-off for carrying deletions (REL-026 and REL-027).
3. **PC-3:** commit the working-tree implementation report so the waivers' authority is on the branch.
4. **PC-5 / PC-7:** correct the CHANGELOG and the Deferred Work wording.
5. CR-2 / CR-3 / CR-4 (REL-024) remain duplicate-only residue, which is acceptable under the operator rule as carried.
