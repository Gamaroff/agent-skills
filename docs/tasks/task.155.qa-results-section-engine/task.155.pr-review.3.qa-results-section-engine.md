# PR Review Report: PR #537 — feat(qa-results): QA Testing Results section engine — one writer, one place, refuses to stack (task 155)

**Reviewed:** 2026-09-30
**PR:** [#537](https://github.com/Gamaroff/agent-skills/pull/537) — `feature/task.155.qa-results-section-engine` → `develop` (OPEN, head `c0358417`)
**Work item:** [`task.155.qa-results-section-engine.md`](./task.155.qa-results-section-engine.md) — resolved via `branch-stem`
**Tracker:** [#486](https://github.com/Gamaroff/agent-skills/issues/486) — OPEN
**Verdict:** ⚠️ CONCERNS

Pipeline Step 5c, third pass (after PR review 2 REQUEST CHANGES → QA cycles 5–7 under the 5 → 7 operator grant). Both lenses ran at `--effort medium`.

**Scope note.** The diff is `origin/develop...origin/feature/task.155.qa-results-section-engine` with `*/references/*` excluded. The two excluded files (`skills/qa-task/references/qa-results.js`, `skills/qa-story/references/qa-results.js`) are bundled copies of `shared/resources/qa-results.js`; `npm run bundle:check` reports 0 problems across 129 skills. **Implementation report:** read from the **working tree**, which is modified and uncommitted and holds QA cycles 3–7. The committed copy is from Step 4, and Step 8 commits the final one. This is expected and is not a trail defect.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.155.implementation.1.qa-results-section-engine-initial-run.md` (working tree, cycles 1–7 and the grant record) |
| Review report | ✅ | `task.155.review.1.qa-results-section-engine.md` |
| QA reports | 7 | `task.155.qa.1` … `task.155.qa.7` |
| Gate | PASS | `task.155.gate.7.qa-results-section-engine.yml` (100; route-2b cosmetic-residue exit, REL-018/019 carried) |
| DoD | ❌ (expected) | Step 7 has not run |
| Sprint review | ❌ (expected) | Step 7 has not run |
| Open bugs | 0 | — |
| Handover | ❌ (n/a) | none written |

The operator grant (5 → 7 cycles, `grant-qa-cycles.sh`, `qa_max_cycles: 7`) is recorded in the working-tree implementation report. Every gate `head:` is an ancestor of `c0358417`, and the cycle 7 entry reads `Proceeding to 5c`.

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| `upsertQaResults` returns `replaced` / `relocated` / `created` / `multiple` / `bad-section` and writes nothing on refusals | `shared/resources/qa-results.js:387-431`, `shared/resources/tests/qa-results.test.mjs` (56/56 pass) | ✅ met |
| A fenced or inline-code heading is never found or replaced | `qa-results.js:233` (`insideProtected`); tests | ✅ met |
| qa-task and qa-story Step 12 write through the engine; the extracted call leaves one section | both `SKILL.md` Step 12 blocks; `tests/qa-results-step12-wiring.test.js` | ✅ met (see CR-2 for an ordering contradiction in qa-story (d)) |
| Corpus guard passes after the task.65 repair and fails, naming the file, on a re-added copy | `tests/qa-results-corpus.test.js`; the task.65 diff drops only the gate 1 and gate 2 copies | ✅ met |
| No second fence scanner | `qa-results.js:60-71` imports from `change-log.js` | ✅ met |
| Engine plus corpus tests run in under 2 s; no network | 56 tests in about 1.0 s | ✅ met |
| CHANGELOG `[Unreleased]` cites `(task 155)` | `CHANGELOG.md` | ✅ met (wording drift: PC-3, PC-4) |
| Obs #178 is set to `actioned` when the PR merges | — | ⏳ post-merge, open by design |

**Reviewer checks, reproduced independently:**

- The engine was run over all 155 tracked documents that carry a section: 155 `replaced`, 0 refusals, 0 lines lost **outside** the replaced span.
- A legacy misplaced section inside a marker block, followed by an `upsertChangeLog` row, relocates with no row loss.
- A misplaced section before a log whose header is not Date-first loses the log's rows. That is REL-008, already deferred honestly, and no tracked document has the shape.

## Conformance Findings

```
[PC-1] trail · low · confidence: high — task.155.qa-results-section-engine.md:448 (## Deferred Work)
  Gate 7's recommendations.future says CR-5/6/7 and the "checked() only counts sections" limit are
  in the task's Deferred Work. That section names none of them. Its lead sentence still says
  "Carried from QA gates 3 and 4", but it now holds items from gates 5–7.
  → Add CR-5, CR-6, CR-7 and the checked() section-count-only limit as LOW items citing gates 6/7.
    Reword the lead to cover gates 3–7.

[PC-2] trail · low · confidence: medium — task.155.qa-results-section-engine.md:455 (REL-010)
  REL-010 is still listed as an open "grows without `multiple`" path. Since 3056978c,
  normaliseSection refuses any rendered section that carries a Change Log heading (`bad-section`),
  so the engine can no longer re-add the tail on each write.
  → Re-verify, then mark REL-010 closed by 3056978c, or reword it to the one-time stale-tail residue.

[PC-3] consistency · low · confidence: high — CHANGELOG.md:106
  The CHANGELOG says only "a second H1/H2, or an unclosed fence" makes a section string refused.
  The engine now also refuses (fence-blind) a section holding a change-log marker, a Change Log
  heading, or any fenced line that reads as an H1/H2. A fenced bash `# comment` gives
  `bad-section`, which is the REL-016 trade.
  → Say the section string is scanned ignoring fences and refused on a marker, H1/H2 or Change Log
    heading. Point to REL-016/REL-019.

[PC-4] consistency · low · confidence: medium — CHANGELOG.md:105
  "(one residual shape is recorded in the task's Deferred Work)" understates what was deferred.
  REL-007 covers two positions and REL-008 covers two log shapes, and both can drop rows under an
  already-misplaced section. The setext exclusion is deferred too.
  → Replace it with a count-free reference that names REL-008 as the row-dropping residual.
```

## Code Review Findings

```
[CR-1] bug · medium · confidence: high — shared/resources/qa-results.js:409
  A replace removes everything from `## QA Testing Results` to the next H1/H2 or change-log
  marker. removesStructure refuses only on markers, H1/H2 and Change Log headings, so other skills'
  H3 subsections inside the span are deleted silently, with the reason `replaced`.
  create-bug-report task mode (Step 5) writes a `### Bug Reports` list "in the QA & Quality
  Assurance section". 11 of 155 tracked task documents carry it inside the span (e.g. task.113:
  all 6 bug links are lost on the next QA write). task.141 also carries a `### Deferred Work`
  record there. The QA experiments ("0 deletions") measured only content outside the span, so
  they could not see this. The bug files themselves survive; the task document's index of them
  does not, and qa-task Step 9 files bugs before Step 12 in the same run.
  → Carry foreign H3+ subsections that are not in the Step 12 template (at least `### Bug Reports`
    and `### Deferred Work`) into the rewritten section, or refuse `unbounded` on them. Add a
    round-trip test built from a create-bug-report task-mode document. Alternatively, move
    create-bug-report's list to its own H2 and defer the engine change with that stated.

[CR-2] cleanup · low · confidence: medium — skills/qa-story/SKILL.md:1940
  The new (a) prose says to write the section through the engine before the Change Log row in (d).
  Item (d), unchanged, still says to append the row "in the same edit as (a)–(c)", so the step now
  gives two different orders.
  → Reword (d) so the row is appended after (a)'s engine call succeeds, matching qa-task.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: trail
    severity: low
    confidence: high
    ref: "task.155.qa-results-section-engine.md:448"
    finding: "Gate 7 says CR-5/6/7 and the checked() section-count-only limit are in Deferred Work, but that section omits them and its lead still says gates 3 and 4."
    suggested_action: "Add CR-5, CR-6, CR-7 and the checked() limit as LOW items citing gates 6/7 and reword the lead to gates 3–7."
  - id: PC-2
    category: trail
    severity: low
    confidence: medium
    ref: "task.155.qa-results-section-engine.md:455"
    finding: "REL-010's growth path is closed by 3056978c (a rendered section carrying a Change Log heading is now bad-section), yet it is listed as an open deferral."
    suggested_action: "Re-verify and mark REL-010 closed by 3056978c, or reword it to the one-time stale-tail residue."
  - id: PC-3
    category: consistency
    severity: low
    confidence: high
    ref: "CHANGELOG.md:106"
    finding: "The CHANGELOG describes the pre-3056978c bad-section rule and omits the fence-blind refusal of markers, Change Log headings and fenced H1/H2-like lines (the REL-016 trade)."
    suggested_action: "Say the section string is scanned ignoring fences and refused on a marker, H1/H2 or Change Log heading, and point to REL-016/REL-019."
  - id: PC-4
    category: consistency
    severity: low
    confidence: medium
    ref: "CHANGELOG.md:105"
    finding: "'One residual shape is recorded' understates the deferred relocate residuals (REL-007, REL-008's row-dropping shapes, setext)."
    suggested_action: "Use a count-free reference that names REL-008 as the row-dropping residual."
  - id: CR-1
    category: bug
    severity: medium
    confidence: high
    ref: "shared/resources/qa-results.js:409"
    finding: "A replace silently deletes foreign H3 subsections inside the span, such as create-bug-report's task-mode '### Bug Reports' list (11 of 155 tracked task docs; task.113 loses all 6 links) and task.141's '### Deferred Work'."
    suggested_action: "Carry foreign non-template H3+ subsections into the rewritten section, or refuse unbounded on them, and add a round-trip test from a create-bug-report task-mode document."
  - id: CR-2
    category: cleanup
    severity: low
    confidence: medium
    ref: "skills/qa-story/SKILL.md:1940"
    finding: "qa-story item (d) still says to append the Change Log row 'in the same edit as (a)–(c)', which contradicts the new write-(a)-first ordering."
    suggested_action: "Reword (d) so the row is appended after (a)'s engine call succeeds."
truncated_count: 0
```

## Recommended Actions

1. **CR-1**: decide before exit. Either preserve (or refuse on) foreign H3 subsections in the replaced span, or move create-bug-report's task-mode `### Bug Reports` list out of the QA section and record the engine-side residue under Deferred Work. This is the one remaining path that deletes content a repository skill writes, and 7% of the tracked corpus has the shape.
2. **PC-3 / PC-4**: bring the CHANGELOG clause up to date with the fence-blind `bad-section`/`unbounded` rules and the plural residuals.
3. **PC-1 / PC-2**: complete Deferred Work (CR-5/6/7, the `checked()` limit, the gates 3–7 lead) and re-verify REL-010.
4. **CR-2**: fix the (a)/(d) ordering contradiction in qa-story Step 12.
