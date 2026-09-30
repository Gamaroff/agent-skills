# PR Review Report: PR #537 — feat(qa-results): QA Testing Results section engine — one writer, one place, refuses to stack (task 155)

**Reviewed:** 2026-09-30
**PR:** [#537](https://github.com/Gamaroff/agent-skills/pull/537) — `feature/task.155.qa-results-section-engine` → `develop` (OPEN, head `3f691fee`)
**Work item:** [`task.155.qa-results-section-engine.md`](./task.155.qa-results-section-engine.md) — resolved via `branch-stem`
**Tracker:** [#486](https://github.com/Gamaroff/agent-skills/issues/486) — OPEN
**Verdict:** 🚨 REQUEST CHANGES

**Scope:** `git diff origin/develop...origin/feature/task.155.qa-results-section-engine`, excluding `*/references/*`. The two excluded files (`skills/qa-story/references/qa-results.js` and `skills/qa-task/references/qa-results.js`) were checked. Each is byte-identical to `shared/resources/qa-results.js` apart from the `AUTO-GENERATED` header line. Effort: medium. This is the second PR review; the first was `task.155.pr-review.1.qa-results-section-engine.md` (CONCERNS).

**Implementation report:** read from the **working tree**. The file has 84 uncommitted added lines, covering QA cycles 3 and 4. The committed copy is the Step 4 one, and Step 8 commits the final copy.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.155.implementation.1.qa-results-section-engine-initial-run.md` (working tree; QA Cycle 4 `**Action**: Proceeding to 5c`) |
| Review report | ✅ | `task.155.review.1.qa-results-section-engine.md` |
| QA reports | 4 | `task.155.qa.{1..4}.qa-results-section-engine.md` |
| Gate | PASS | `task.155.gate.4.qa-results-section-engine.yml` (100), `head: 182367ee`, route 2b cosmetic-residue exit |
| DoD | ❌ (expected) | Step 7 writes it; the task is `ready-for-review`, not `accepted` |
| Sprint review | ❌ (expected) | Written at `/finalise` |
| Open bugs | 0 | — |
| Handover | ❌ (none) | — |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| `upsertQaResults` returns `replaced` / `relocated` / `created` / `multiple` / `bad-section`, and writes nothing on the last two | `shared/resources/tests/qa-results.test.mjs` A1–A5 | ✅ met |
| A fenced or inline-code `## QA Testing Results` is never found or replaced | C1–C4 | ✅ met |
| qa-task and qa-story Step 12 write through the engine; the extracted call leaves exactly one section | `tests/qa-results-step12-wiring.test.js` | ✅ met |
| The corpus guard passes after the task.65 repair and fails, naming the file, when a second copy is re-added | `tests/qa-results-corpus.test.js`; task.65 lost 100 lines: the two superseded stacked copies (`## QA Testing Results` and `— Cycle 2`), removed as Phase 3 specifies; the Change Log append-only check passes | ✅ met |
| Performance: under 2s, no network | 41 tests in 1.24s (re-run for this review) | ✅ met |
| No second fence scanner; protection comes from `change-log.js` | `qa-results.js` imports `protectedRanges` | ✅ met |
| The engine refuses rather than corrupting (Overview / Expected outcome) | CR-1 below: a section with an unbalanced fence is accepted, and the next replace deletes everything after it | ❌ unmet on one input class |
| Observation #178 → `actioned` on merge | Unticked; happens after merge | — (post-merge) |

## Conformance Findings

```
[PC-2] trail · medium · confidence: high — Deferred Work › REL-008
  The REL-008 entry under ## Deferred Work says "a log header that is not Date-first is not
  recognised". Gate 3 records the same finding as a deletion: "a log whose header is not
  Date-first … still loses its rows under a misplaced section (P4, P5)". The entry also
  describes the two-table half ("loses the first table's rows"). The deferral is recorded,
  but it presents a Change Log row-loss path as a recognition gap.
  → Reword the entry to say rows are deleted in both shapes, so it reads the same as gate 3.

[PC-1] coverage · low · confidence: medium — task doc § 3 ("one blank line on each side") vs Change Log seam
  The PC-1 deferral from PR review 1 is honest: the seam belongs to upsertChangeLog. But § 3
  still promises a blank line on each side, the task's own document breaks that promise, and
  no follow-up is named.
  → Narrow the § 3 wording, or name a follow-up issue in the PC-1 Deferred Work entry.

[PC-3] trail · low · confidence: medium — Deferred Work › REL-010 / REL-011
  Gate 4 says REL-011 stacks a copy on every write and "multiple never fires". The Deferred
  Work entries do not say either shape defeats the task's headline no-stacking guarantee.
  → Add to the REL-011 entry that each write stacks another copy and `multiple` never fires.

[PC-4] trail · low · confidence: medium — gate 4 recommendations.future "CR-3 cleanup"
  Gate 4 carries a CR-3 cleanup (reuse RE_BREAK in normaliseSection) that ## Deferred Work
  does not list. The section's intro line still says only "Carried from QA gate 3".
  → Add gate 4's CR-3, and make the intro cite gates 3 and 4 and PR review 1.

[PC-5] consistency · low · confidence: high — CHANGELOG.md [Unreleased] (task 155)
  The CHANGELOG says a misplaced section "is relocated, never replaced in place, so the log's
  rows are never taken with it". The deferred REL-008 records row loss for logs with two Date
  tables or a header that is not Date-first.
  → Qualify the sentence, or fix REL-008 before the entry ships.
```

## Code Review Findings

```
[CR-1] bug · high · confidence: high — shared/resources/qa-results.js:182
  An unbalanced fence inside a QA Testing Results section deletes everything after the
  section on the next replace. fencedRanges treats the unclosed fence as code running to EOF,
  so no later heading, marker block or marker-less log bounds the span. The replace takes it
  all and reports `replaced`. normaliseSection (line 273) accepts such a section, so the engine
  can write its own trigger. Reproduced for this review on scratch copies:
    (a) Story with a change-log marker block. Write 1 is a section containing
        "```markdown / ## Foo / ```bash / ls / ``` / ```" (a nested-fence slip, which leaves
        one fence open) and returns `created`. Write 2 is "## QA Testing Results\n\nGate: gate.2"
        and returns `replaced`. The whole <!-- change-log-start/end --> block and its rows are
        gone.
    (b) Marker-less task whose existing section has a lone unclosed ``` fence. One replace
        returns `replaced` and deletes the "## Change Log" table and the following "## Notes"
        section, through to EOF.
  This is not REL-011, which covers an unclosed fence at document level stacking created
  copies (duplication). This path deletes content. QA cycle 4 probed "an unclosed fence" in
  the section and reported "No path that deletes content was found".
  Plausibility: low to medium. Neither Step 12 template renders a fence inside the section,
  and 0 of the 155 tracked QA sections have an odd fence count (measured for this review).
  But the section is agent-rendered prose, a nested-fence slip is a common authoring error,
  and the failure is silent: the engine exits 0 and reports `replaced`.
  → Have normaliseSection return bad-section when the body's fences are unbalanced. Have
    findQaResults/upsertQaResults refuse, with a named reason, an existing section whose fence
    range runs to EOF. Add a two-write regression test that is red before the fix.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-2
    category: trail
    severity: medium
    confidence: high
    ref: "task.155.qa-results-section-engine.md ## Deferred Work REL-008 vs task.155.gate.3.qa-results-section-engine.yml REL-008"
    finding: "The REL-008 deferral describes the non-Date-first half as not recognised, but gate 3 records it as deleting Change Log rows."
    suggested_action: "Reword the REL-008 entry to say rows are lost in both shapes, matching gate 3."
  - id: PC-1
    category: coverage
    severity: low
    confidence: medium
    ref: "task.155.qa-results-section-engine.md § 3 blank line on each side vs the change-log-start seam"
    finding: "The PC-1 deferral is honest, but § 3 still promises a blank line on each side that the task's own document breaks, and no follow-up is named."
    suggested_action: "Narrow the § 3 wording, or name a follow-up issue in the PC-1 Deferred Work entry."
  - id: PC-3
    category: trail
    severity: low
    confidence: medium
    ref: "Deferred Work REL-010 / REL-011 vs gate.4 REL-011"
    finding: "The REL-010 and REL-011 entries leave out that these shapes stack sections without a multiple refusal, which is the task's headline guarantee."
    suggested_action: "State in the REL-011 entry that each write stacks another copy and multiple never fires."
  - id: PC-4
    category: trail
    severity: low
    confidence: medium
    ref: "task.155.gate.4.qa-results-section-engine.yml recommendations.future CR-3 cleanup"
    finding: "Gate 4's CR-3 cleanup is missing from Deferred Work, whose intro line still cites only gate 3."
    suggested_action: "Add gate 4's CR-3, and cite gates 3 and 4 and PR review 1 in the intro line."
  - id: PC-5
    category: consistency
    severity: low
    confidence: high
    ref: "CHANGELOG.md [Unreleased] task 155 'never taken with it'"
    finding: "The CHANGELOG says a misplaced section never takes the log's rows, but the deferred REL-008 records row loss."
    suggested_action: "Qualify the sentence, or fix REL-008 before the entry ships."
  - id: CR-1
    category: bug
    severity: high
    confidence: high
    ref: "shared/resources/qa-results.js:182"
    finding: "An unbalanced fence inside a QA section makes the next replace delete everything after the section to EOF (Change Log block and rows, later sections), reported as replaced, and normaliseSection accepts such a section."
    suggested_action: "Return bad-section for a section with unbalanced fences, refuse an existing section whose fence runs to EOF, and add a two-write regression test."
truncated_count: 0
```

## Recommended Actions

1. **CR-1 (blocking).** Fix the unbalanced-fence path so it refuses instead of deleting. It is the only confirmed path that deletes content, and it contradicts QA cycle 4's "no path that deletes content". Mutation-prove the fix with a two-write regression test.
2. **PC-2.** Reword the REL-008 Deferred Work entry to say it deletes rows. Qualify the CHANGELOG sentence (PC-5), or fix REL-008 alongside CR-1, since both are in the same span-bounding code.
3. **PC-1, PC-3, PC-4.** Tidy the Deferred Work entries so each carried residue reads at the severity its gate recorded.

**Deferral honesty, in summary:** every id (REL-007/008/009/010/011 and PC-1) is recorded under `## Deferred Work` and closed in its gate's `top_issues[]` with `carried_from` set. The reasoning matches the gates for REL-007, REL-009, REL-010 and REL-011. REL-008 is understated (PC-2). **Scope:** nothing shipped outside the task. The task.65 repair (−100 lines) is in scope. As Phase 3 specifies, it keeps the highest-gate copy and removes two superseded ones. Those copies held 64 unique lines of per-cycle summary, which now live only in the QA and bug reports they linked to. `change-log.js --check-append-only` on task.65 returns `ok`.
