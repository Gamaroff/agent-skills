# Sprint Review Summary — Task 44

**Task:** Review and edit skills log their document mutations
**Status:** ✅ Accepted · 2026-08-12
**PR:** [#211](https://github.com/Gamaroff/agent-skills/pull/211) · **Issue:** [#203](https://github.com/Gamaroff/agent-skills/issues/203)
**QA Gate:** PASS 100/100 (1 fix cycle) · **CI:** green on `75bd814`

---

## Summary

Fourteen skills mutated PRD, epic, story and task documents and left no trace in them. `review-epic` and `review-task` recorded a Change Log entry *only* as a side effect of the Jira sync — so a repo on GitHub, or with no tracker at all, received a fully reviewed document whose history said nothing had happened. `edit-story` closed by *suggesting* an entry; `edit-epic` said nothing while applying cascade edits across child stories.

Those skills now write the row, and the four `review-*` skills grade the section's presence and currency.

This is the third of four tasks in the Change Log series: task.42 defined the spec and built the engine, task.43 made the templates emit the section, task.44 makes review/edit/rewrite skills populate and check it, and task.45 will cover `develop`, QA, `finalise` and the sync skills.

---

## What was delivered

**Writers split by whether the skill owns the edit.** Direct writers append the row in the same edit that makes the change; proposal writers cannot, because `correct-course` and `change-management` emit a Sprint Change Proposal that a human applies — so each proposal now carries a "Change Log rows to add" block giving the exact row per artifact.

| Family | Skills | What changed |
| --- | --- | --- |
| Review | `review-epic`, `review-task`, `review-prd`, `review-story`, `review-bug` | Verdict and status rows on every tracker path; `review-prd` reshaped 5→4 columns; Author cells normalised to the skill name; `review-bug` writes Status History instead |
| Edit | `edit-story`, `edit-epic` | Row is now mandatory, not suggested; the two "Consider updating…" advisories deleted |
| Change management | `correct-course`, `change-management` | Proposals name the rows to add per artifact |
| Structural rewrite | `shard-doc`, `shard-prd`, `enforce-standards`, `epic-registry-manager` | Sharding logs on the index only; renames logged for documents only; epic creation seeds row one |
| Validator | `documentation-standards-validator` | Check (3) finally defined — four conditions, bug reports exempt |

**Grading** was built last, because it is the only part that can halt a consumer pipeline. Presence plus a deliberately narrow currency heuristic, graded per `change-log.enforcement`: `advisory` (the default) yields an Important finding with the verdict still GO; `blocking` yields Critical → NO-GO *and* withholds the status promotion, which is what actually stops a run since `develop-*` gates on `Status:` rather than the score.

---

## Technical details

**Files:** 16 modified (14 `SKILL.md`, `tests/skill-protocol.test.js`, `CHANGELOG.md`), plus bundler-generated `references/document-change-log.md` in 14 skills.

**Testing:** `npm test` 1175/1175 with 21 new protocol tests across three families — the four graders document the config gate and name `advisory` as default; twelve mutators instruct the write and cite the spec; and `review-bug` is asserted to state that bugs carry *no* Change Log, so a later edit cannot quietly add one.

**Anti-drift:** every skill links `shared/resources/document-change-log.md` rather than embedding the column list. Fourteen embedded copies is precisely the failure this series exists to remove.

---

## Quality

One MEDIUM defect was found and fixed. `review-task` Step 8.5 emitted its numbered list as `1, 2, 4, 3` — the new Change Log item sat between the two conditional branches, so an unconditional write could be read as conditional on fixes having been applied. That is the exact gap the task exists to close, and it undercut the skill's own currency heuristic, which is justified on the grounds that a no-findings review still writes a row. Fixed by moving the block and stating the scope explicitly.

**Worth noting for future sprints:** that defect passed lint, all 1175 tests, the bundler, both eval suites and doc-link resolution. In a skills library the instruction files *are* the product, so a mis-ordered instruction list is a product defect that no current automated check can see. A protocol test asserting numbered-list sequence integrity is logged as a non-blocking recommendation.

---

## Demo notes

The clearest demonstration is the task's own document. It was written against the pre-task.43 template and therefore had no Change Log — making it a member of the exact legacy population this change is riskiest for. Its Step 2 review produced **one Important finding and a GO verdict at 9/10** under default config, which is precisely the designed behaviour. The section was then added, and the document now carries the full pipeline history: creation, review verdict, status transition, implementation, both QA gates, the fix, and acceptance.

The feature verified itself on itself.

---

## Impact

A stakeholder reading any PRD, epic, story or task now sees every review verdict and refinement edit in the document itself — on every tracker path, including none. The local file becomes what `tracker-card-summary.md` already claimed it was: the authoritative log.

---

## Known limitations and future work

- **Currency is a heuristic, not a proof.** It compares the newest row against `status:`, not against the document's actual diff. A reviewer who edits prose without adding a row is not caught. Accepted at `advisory`; tightening it needs a cheap structural diff between two commits and is worth its own task.
- **No backfill.** Every document written before the spec has no section and reports one Important finding until someone touches it. This is the adoption boundary, matching how sign-off and OKF v0.1 shipped.
- **Legacy five-column PRD tables** stay five columns; `review-prd` appends four and does not rewrite the header. Ragged rendering until a manual one-time widening.
- **A numbered-list integrity test** would close the defect class found in QA.
