# Sprint Review Summary — Task 43

**Task:** Templates and creation skills emit the canonical Change Log
**Document:** `task.43.change-log-templates-and-creation.md`
**Status:** ✅ Accepted — 2026-08-12
**PR:** [#210](https://github.com/Gamaroff/agent-skills/pull/210)
**Issue:** [#202](https://github.com/Gamaroff/agent-skills/issues/202)
**Roadmap:** item **T43**, Phase 2 "Emit"

---

## Summary

Task 42 defined the canonical Change Log and built the engine to write it. Nothing produced it. This task
closes that gap: every PRD, epic, story and task template now emits the canonical four-column section, and
all six `create-*` skills seed its first row.

Before this, two of the four document types never got a Change Log at creation at all, the two templates
that did emitted a **bulleted** heading the engine could find but read no rows from, and the brownfield PRD
template used five columns where everything else used four. A newly created document of any of the four
types now opens with exactly one Change Log row.

---

## Success Criteria Met

- ✅ `create-task`'s template carries an **unnumbered** `## Change Log` between Stakeholder Sign-off and
  Progress Tracking — unnumbered so the 11-section contract survives, re-asserted in the same test block
- ✅ `create-epic`'s inline epic structure contains `## Change Log`
- ✅ All three epic templates carry a top-level `## Change Log` table and are **byte-identical**
- ✅ Both story templates and both PRD templates use the canonical four columns
- ✅ A document created by each of `create-{prd,epic,story,task}` opens with exactly one row
- ✅ No measurable runtime change; both eval suites unchanged at 3s
- ✅ `npm test`, both eval suites, bundle idempotence, `generate-catalog` (not required) all satisfied
- ✅ Every touched skill links the spec instead of restating it; `CHANGELOG.md` updated; drift resolved and locked

---

## Key Changes

**Templates (8 files + 2 propagated copies)**

- Task templates gained the unnumbered section; the pair is now byte-locked — the `review-task` copy had
  been missing its entire YAML frontmatter block and used a legacy `**Task ID**:` header.
- Epic templates: the log was promoted out of `## Notes & Updates` into its own H2 immediately above it.
  Open Questions and Decisions Made stay behind — a document-lifecycle record is not a note.
- Legacy story markdown template: promoted and tabulated.
- Brownfield PRD: five columns → four. Both PRD templates and the story YAML pair carry the canonical
  instruction. PRDs keep `### Change Log` nested under §1 — promoting it would break the 8-section contract,
  and the engine reads H3 anyway.

**Creation skills (6)** — `create-epic`, `create-task`, `create-story`, `create-doc`,
`create-parallel-stories`, `create-prd` all seed row one and link
`shared/resources/document-change-log.md` rather than restating the columns. Six restatements was the
problem being solved. `create-parallel-stories` §2.3 is the notable one: its mandatory parent-epic mutation
previously left no trace at all, and now writes a row on the epic.

**Tests and evals** — 13 protocol assertions and 6 eval assertions, with both `01-happy` replay fixtures
updated (the fixture *is* the recorded output the assertions run against).

---

## The finding worth reporting

The task documented three epic-template copies with two of them "byte-equal". **They were not.** All three
differed from each other, and the drift was twice the documented size:

| Copy | Lines | Drift vs canonical |
| --- | --- | --- |
| `docs/templates/epic-template.md` | 709 | — (canonical) |
| `epic-registry-manager/references/` | 709 | **18 lines** — a wholly different frontmatter schema |
| `documentation-standards-validator/references/` | 706 | **9 lines** — 3 absent OKF fields + 6 stale links |

The 18-line case had the *same line count* as the canonical copy, which is precisely why nobody noticed:
equality had been assumed from `wc -l`. The new test asserts **bytes**.

That changed the nature of Phase 2's work — "make all three byte-identical" **replaces**
`epic-registry-manager`'s frontmatter schema, which is a decision rather than a copy-paste. A pre-lock
consumer grep (added by the review) caught `prd-structure-guide.md` documenting the old schema, fixed in the
same phase; without it the skill would have contradicted its own template.

---

## Testing & QA

| Check | Result |
| --- | --- |
| `npm test` | **1158 / 1158** pass, 0 fail |
| `node --test tests/skill-protocol.test.js` | 36/36 (13 new) |
| `npm run eval:create-task` | 12/12 assertions |
| `npm run eval:create-story` | 15/15 assertions |
| `npm run validate:all` | 115 skills passed, 0 failed |
| `countMandatorySections()` | 11 — unchanged |
| `npm run bundle` ×2 | Idempotent by content hash |
| Byte-locks after bundling | epic trio ✅ · task pair ✅ · story YAML pair ✅ |
| CI (head `ce8f287`) | test ✅ · validate ✅ · link-check ✅ |
| **QA Gate** | **PASS 98/100** — 2 cycles, 1 fix cycle |

Reliability was established rather than assumed: feeding each new template through T42's engine confirms
`findChangeLog` reports H2 for all six, `upsertChangeLog` extends in place (heading count 1 → 1 every
time), a realistically-seeded row survives the first machine write, and the authoring comment survives with
`<!-- change-log-start -->` inserted between it and the heading.

**QA cycle 1** found one medium and two low issues — all in the *new instructions*, not the templates.
Fixing them surfaced a fourth instance of the same class the code review had missed: the legacy story
template has no YAML frontmatter at all, so its `updated:` instruction was equally unsatisfiable. A
repo-wide sweep now establishes the invariant: a template tells a writer to bump `updated:` **iff** that
document type actually has the field.

---

## Security & Compliance

Both **NOT_APPLICABLE**, verified rather than assumed: zero `.sh`/`.py`/credential files touched, no
dependency change, and the only `.js` in the diff is the test file. The change incidentally **clears a live
standards violation** — the validator's epic copy carried no `type:` field, which the repo's own OKF
standard grades Critical.

---

## Known Limitations & Follow-ups

1. **task.44 must land `review-prd`'s four-column writer.** This task narrows the brownfield PRD table and
   leaves `review-prd/SKILL.md:772` emitting five cells. Documented as Breaking Change 1 / Risk 4 and in
   `CHANGELOG.md`; a blocking condition on task.44, which the roadmap already sequences next.
2. **Epic documents have no `updated:` frontmatter field**, unlike PRD/story/task — the root cause behind
   QA's CR-2. Worth adding for OKF timestamp parity.
3. **`create-architecture-doc`'s brownfield template** carries the same legacy five-column form while its
   three siblings already use four. Outside this task's scope and outside the canonical spec (which covers
   PRD, epic, story, task), so deliberately untouched.
4. **No backfill.** Existing documents keep whatever Change Log they have; adoption is going-forward only.

---

## Demo Notes

Run `/create-task` (or `/create-story`) in a scratch directory: the generated document now opens with a
single-row Change Log in the canonical four-column shape. Then run `node --test tests/skill-protocol.test.js`
and change one byte in any epic-template copy — the byte-lock fails immediately, which is the drift class
this task was written to end.
