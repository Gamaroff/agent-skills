# Task Review Report: Task 87 — Shell commands in table cells escape the snippet-execution gate

**Reviewed:** 2026-09-09
**Review Depth:** Standard
**Task Status:** Draft → Ready for Development
**Overall Assessment:** GOOD

---

## Executive Summary

The task is technically excellent and structurally incomplete. Every technical claim in it verifies
against the code — the engine, the rule doc, the origin gate finding, the `zero-blocks-executed`
record and the `category: bug` finding shape all exist as described, and no hallucinations were found.
What it was missing was the half a developer executes: it had no Implementation Plan, no Testing
Strategy, no Files Summary, no Risk Assessment and no Rollback Plan — 6 of the 11 mandatory sections.

**Critical Issues:** 2 🚨
**Important Issues:** 5 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked — invoked inside the `develop-task` pipeline under the
`/develop-next` autonomous directive; every gate auto-answered with its recommended option and logged.
**Implementation Readiness:** 8/10 (was 4/10 before fixes)
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

No interactive questions were asked. This review ran non-interactively inside the pipeline. The
decisions that would otherwise have been questions were resolved as follows, and each is recorded:

| Would-be question | Resolution | Basis |
| ----------------- | ---------- | ----- |
| Output format | Comprehensive report | Pipeline default — required for the audit trail |
| Tracker sync — no `github_issue` | Sync to GitHub (issue #364 created) | Recommended option under the autonomous directive; Step 4 `create-pr` needs the linkage |
| Apply fixes? | Yes — all critical + important | Pipeline auto-answer; `/develop` must not run against an unreviewed plan |
| Fixes complete? | Yes → promote to `ready-for-development` | Pipeline auto-answer; all critical + important fixes applied |
| Success criterion 3 is ambiguous — "counts unchanged" cannot hold for a document that *has* table-cell commands | Rewrote it to scope the invariant to documents with **no** command column | Reading it literally would make the task's own purpose a criterion failure; the narrow reading is the only coherent one |
| Should the corpus-wide findings the extractor surfaces be triaged in this task? | Scoped **out**; Phase 4 measures the surface and records it | 4h estimate cannot absorb an unbounded triage, and the measurement is what turns it into a scheduling decision |

---

## 1. Template Structure Compliance

**Status:** ISSUES FOUND (now fixed)

### Issues

#### Critical

- **`## Implementation Plan` absent.** The mandatory section a developer actually executes. The
  document described the defect and the goal, and stopped. `/develop` would have had to invent the
  phases, which is exactly the guesswork the section exists to remove.
- **`## Testing Strategy` absent.** On a task whose second success criterion *is* a mutation proof,
  the absence of a testing section is not a formality — the criterion named a proof with nowhere
  specifying how it is constructed.

#### Important

- `## Technical Background` absent — no current-vs-target statement, so the "one function wide" nature
  of the change was not written down anywhere.
- `## Files Summary` absent.
- `## Risk Assessment` absent — and this task carries a real, high-likelihood risk (see §5).
- `## Rollback Plan` absent.
- `github_issue` absent from frontmatter — no tracker linkage.

#### Optional

- `## Progress Tracking` absent.
- `## Breaking Changes` absent — genuinely not applicable to the CLI contract, but worth stating
  explicitly because one behavioural change *is* intended.

### Other checks

| Check | Result |
| ----- | ------ |
| File naming (`task.{n}.{name}.md`, dots as separators) | ✅ PASS |
| OKF frontmatter — `type: task` non-empty | ✅ PASS |
| OKF `description` present | ✅ PASS |
| OKF `tags` a YAML list | ✅ PASS |
| Placeholder scan (`[TBD]`, `[TODO]`, `???`) | ✅ PASS — none |
| Tracker card preflight (`--check-card`) | ✅ PASS — `ok: true`, 0 findings, before and after fixes |
| Stakeholder Sign-off | Not checked — `sign-off.enabled` absent from `skills-config.yaml` |
| Change Log | ✅ PASS — section present with a row; `status` had not advanced past `planned`, so the currency check does not fire |
| `estimated_effort_hours: 4` vs rubric | Within tolerance (5 criteria, low risk) — no finding |

**Score: 5/10** before fixes (6 of 11 mandatory sections missing), **9/10** after.

### Recommendations (applied)

1. Added all six missing sections, plus Progress Tracking and an explicit Breaking Changes statement.
2. Created and linked GitHub issue #364 (milestone `Technical Tasks (standalone)`, priority P2 on the
   board; the board has no `Estimate` field, so that mirror was skipped — non-blocking).
3. Left `## References` **unnumbered**. It was briefly written as `## 12. References`, which breaks the
   11-section mandatory contract `countMandatorySections` asserts.

---

## 2. Technical Accuracy

**Status:** ACCURATE
**Hallucinations Detected:** 0

Every claim was checked against the tree rather than accepted:

| Claim in the task | Verification | Result |
| ----------------- | ------------ | ------ |
| `shared/resources/qa-execute-snippets.mjs` is the engine | file exists, 1543 lines | ✅ |
| It extracts fenced ` ```bash ` blocks and runs them under bash **and** zsh | `extractBlocks()` line 51; `shells = useZsh ? ["bash","zsh"] : ["bash"]` | ✅ |
| It does **not** see table cells | `grep -i table\|cell` over the engine returns only unrelated hits; `extractBlocks()` drops any line that is not a fence while no fence is open | ✅ confirmed absent |
| The safety model is an allow-list plus a temp working copy | `SAFE_COMMANDS` (line 117) documented as an allow-list; `--copy` seeds a `mkdtempSync` sandbox | ✅ |
| A shell disagreement is a `category: bug` finding | line 1350 comment states `high` + `category: bug` is what makes a finding gate-blocking | ✅ |
| `zero-blocks-executed` exists and must keep firing | line 1357, and §4 of the rule doc | ✅ |
| Origin is TASK77-019 in `task.77.gate.3.review-pr-in-pipeline.yml` | file exists; finding id present with the zsh-empty-operand analysis | ✅ |
| Task 67 built the execution gate | task-registry row 109 — `accepted`, PR #289 merged | ✅ |
| The task-77 predicate returns a false PASS under zsh | **executed** in an empty directory: `bash` → exit 2 (`[: : integer expected`), `zsh` → exit 0 (globs abort the substitution silently) | ✅ reproduced |

**Score: 10/10.**

### Findings added by the review (not defects in the task — gaps it did not know about)

Two properties of table cells were absent from the task and are load-bearing for the implementation.
Both were found by reading the real target cells in `develop-pipeline-resume-contract.md`, and both
are now documented in §3 of the task:

- **`|` is escaped as `\|` inside a cell.** The real cells contain
  `gh pr view {PR} --comments --json comments \| grep -i "QA"`. Extracted verbatim, that is not a
  pipeline. An extractor that splits rows on bare `|` also mis-splits the row itself.
- **A cell holds several independent commands**, joined by prose (`… AND … AND …`). Each backticked
  span must be its own block; concatenating the cell would execute prose as shell.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND (now fixed)

The section did not exist. It now has four phases, each with named files, checkbox-level changes and
explicit dependencies:

| Phase | Content | Risk |
| ----- | ------- | ---- |
| 1 | `extractTableCellCommands()` — table recognition, command-column detection, unescaped-pipe splitting, `\|` unescaping, multi-backtick spans, `{line, code, origin, column}` | Low |
| 2 | Merge both extractor streams in `executeFile()`; carry `origin` through both `results.push` branches; annotate `render()` | Low |
| 3 | Extraction, regression and mutation-proof tests, including the revert-and-confirm-red step | Low |
| 4 | Rule-doc §1 scope, `npm run bundle`, corpus measurement, `npm run ci` | Low |

The plan was written against the code, so it names the real integration points — `executeFile()` at
line ~1262 is the single call site of `extractBlocks()`, and everything downstream consumes
`{line, code}` only. That is what makes this a one-function change and why no classification,
sandboxing or reporting rework is required.

**Score: 9/10** after fixes.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (now fixed)

#### Important — success criterion 3 was self-contradictory

> "No change in behaviour for fenced blocks — existing findings and counts unchanged"

Taken literally this fails the moment the task succeeds: a document with a table-cell command column
*must* report a higher `blocks` count afterwards. Rewritten to scope the invariant to documents with no
command column, where it is both meaningful and testable — and a corresponding test was added to the
Testing Strategy ("no tables → byte-identical report").

#### Important — the scope boundary around corpus fallout was undefined

The task did not say who deals with the findings the new extractor surfaces in existing documents. On a
4h estimate an unbounded triage is not absorbable. Phase 4 now *measures* the surface and records it in
the implementation report; triage is explicitly out of scope. That converts an open-ended obligation
into a recorded scheduling decision.

#### Optional — the mutation-proof fixture was named but not supplied

The criterion said "the task-77 predicate, restored verbatim" without saying where to get it. The
predicate no longer exists in the working tree — it was replaced in `cd72e4d4`. It is now quoted
verbatim in Phase 3 and the retrieval command is in References, so the proof does not depend on
someone re-deriving it from history.

**Scope and complexity:** 4 phases, one module, one new function — comfortably inside a single task.
No split recommended.

**Score: 8/10** after fixes.

---

## 5. Risk & Rollback Assessment

**Status:** GAPS FOUND (now fixed)

Neither section existed. The material risk the task had not written down:

> **The extractor surfaces genuine findings across the existing corpus.** Likelihood **high** — it is
> the intended effect. A QA gate that previously passed on unrelated documents can now fail on them.

This is the one risk that can make the correct change feel like a regression, and it is now first in
the table with its mitigation (column restriction, pre-merge measurement, triage scoped out). Four
further risks are recorded: over-extraction noise, a *false* shell disagreement from wrong `\|`
unescaping, allow-list bypass (mitigated by not touching the boundary), and bundled-copy drift.

The Rollback Plan rests on the change being purely additive — a second extractor merged into the
stream, plus one field — so `git revert` plus `npm run bundle` restores fenced-only extraction exactly.
Trigger, procedure, verification and a <10 min estimate are stated.

**Score: 8/10** after fixes.

---

## Summary of Recommendations

### Must Fix (Critical) — 2 issues

1. ✅ **Fixed** — added `## 6. Implementation Plan` with four phases.
2. ✅ **Fixed** — added `## 8. Testing Strategy` including the mutation-proof construction.

### Should Fix (Important) — 5 issues

1. ✅ **Fixed** — added `## 3. Technical Background` (current vs target, plus the two cell-specific properties).
2. ✅ **Fixed** — added `## 7. Files Summary`, including the generated bundled copies.
3. ✅ **Fixed** — added `## 10. Risk Assessment`, leading with the corpus-fallout risk.
4. ✅ **Fixed** — added `## 11. Rollback Plan`.
5. ✅ **Fixed** — created GitHub issue #364, wrote `github_issue` to frontmatter, added the body link.

### Consider (Optional) — 2 items

1. ✅ **Fixed** — added `## Progress Tracking` mirroring the four phases.
2. ✅ **Fixed** — added an explicit `## 5. Breaking Changes` statement (none to the CLI; one intended behavioural change).

---

## Implementation Readiness Assessment

**Score:** 8/10

**Scoring Breakdown:**

- Template Compliance: 9/10
- Technical Accuracy: 10/10
- Implementation Clarity: 9/10
- Consistency: 8/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** Every technical claim verified against the code and the false-pass predicate was
reproduced by execution, so the task is not describing an imagined defect. The structural gaps were
real and blocking, and all of them are closed. The one thing to watch is the corpus-wide finding
surface Phase 4 measures — that is a scheduling risk, not a correctness one.

---

## Next Steps

Task is ready for implementation. The developer should:

1. Work the four phases in order — the dependencies are strict.
2. Do Phase 3's revert-and-confirm-red step and record both results. Without it, the change is
   unheld: the code being present is not the check firing.
3. Edit only `shared/resources/` and run `npm run bundle` — a fix applied to a bundled `references/`
   copy is silently reverted by the next bundle.
4. Record Phase 4's corpus measurement in the implementation report even when the surface is empty —
   an unrecorded empty result is indistinguishable from a measurement that never ran.

---

## Review Metadata

- **Reviewer:** Claude (`/review-task`, non-interactive inside the `develop-task` pipeline)
- **Review Date:** 2026-09-09
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.87.execute-table-cell-snippets/task.87.execute-table-cell-snippets.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md`
- **Code Consulted:** `shared/resources/qa-execute-snippets.mjs`, `shared/resources/qa-runnable-prose-detection.md`, `shared/resources/tests/qa-execute-snippets.test.mjs`, `shared/resources/develop-pipeline-resume-contract.md`, `docs/tasks/task.77.review-pr-in-pipeline/task.77.gate.3.review-pr-in-pipeline.yml`
- **Pre-pass:** run **inline**, not via Explore subagents — this session's operating instructions
  prohibit calling the Agent tool unless the user requests it. Both axes were covered directly:
  architecture alignment (no drift — the change stays inside `shared/resources` and touches no
  documented boundary) and the already-implemented scan (`implementation_status: not-implemented`,
  confirmed by grepping the engine, its tests and the rule doc for any table/cell handling).
