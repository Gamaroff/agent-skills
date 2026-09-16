# Implementation Report: The card preflight passes a Success Criteria block that renders as a bold label with nothing under it — 15 of 106 task docs

**Task**: `task.117.card-preflight-heading-only.md`
**Run Number**: 1
**Started**: 2026-09-17 06:36
**Status**: In Progress

---

## Summary

Fix `summariseSection` so a bold-only label followed by a list yields the list as the card content, add a `heading-only` finding kind to the card preflight, make the preflight's clean output name its scope, and prove it with a population-form corpus test (15 → 0).

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | low                                                                        |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | In Progress ✅ (#415, created at Step 2 by review-task)                      |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.117.*` exists in git                              | Branch created at `b1a0f78d` from develop; pushed with tracking | —                    |
| 2. review-task             | ✅ Done    | `task.117.review.{N}.{name}.md` exists (or skip logged)                | `task.117.review.1.card-preflight-heading-only.md` — 9/10 READY TO IMPLEMENT; Planned → Ready for Development; issue #415 created | pre-pass B/C inline in report §Pre-pass summaries |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 1 iteration; 5/5 phases; ci:fast green; corpus 29 → 0 | loop audit inline (see Decisions Log) |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.117.qa.{N}.*.md`; `task.117.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.117.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-17

- Invoked by `/develop-next` (autonomous run; item T117, source `task-registry`).
- Feature branch base: develop — auto-answered (develop-next directive: recommended option; current branch is `develop`)
- PR target branch: develop — auto-answered (develop-next directive: recommended option)
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 fan-out: resolver not dispatched (explicit file path given); tracker poller not dispatched (no `github_issue:` in frontmatter — issue would be null); lite-mode inputs read directly from the document.
- Pipeline mode: standard — risk_level=low (ok) AND phase_count=3 (not < 3) AND single_module=false (shared/resources + create-{task,story,epic} + tests)
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Branch: `feature/task.117.card-preflight-heading-only` created from `develop` at `b1a0f78d`; implementation report stashed before branch creation, restored after.
- Tracker signal (work-started): skipped — no `github_issue:` linked.
- Task status at start: Planned — noted; Step 2 (`/review-task`) will validate and promote.

### Step 2 — review-task — 2026-09-17

- review-task output: Comprehensive report — required for pipeline audit trail (auto).
- Pre-pass: Agent B (architecture) dispatched 06:38 → returned 06:39, `aligned`; Agent C (already-implemented) dispatched 06:38 → returned 06:39, `not-implemented`. Both summaries recorded in the review report.
- Corpus re-measured during review: 15 of 120 task docs publish a label-only Success Criteria block (task said 15 of 106 on 2026-09-10 — count unchanged, corpus grew).
- Tracker sync prompt auto-answered **Sync to GitHub** (recommended; precedent tasks 110–115): dedup search 0 matches → issue #415 created, board add, Priority P2. Board `Estimate` field absent — not mirrored (non-blocking).
- Q2 (scope statement vs mandatory-section count) auto-answered **scope statement** (recommended): `countMandatorySections` is task-only in `skills/create-task/scripts/lib.js`; a count in `shared/resources/` would need a second copy of the heading list.
- Q3 (drop one leading bold label vs all bold-only label lines) auto-answered **all** (recommended) — same mechanism as `dropHeadingLines`; the 15 docs carry several labels in sequence.
- review-task Step 8.5 auto-answered: Yes, apply all critical + important fixes — pipeline proceeds autonomously. Fixes applied: 3 / skipped: 0.
- review-task Step 9 auto-answered: Yes, fixes complete — pipeline proceeds autonomously. Planned promoted to Ready for Development by review-task.
- Review report: `docs/tasks/task.117.card-preflight-heading-only/task.117.review.1.card-preflight-heading-only.md` (9/10, READY TO IMPLEMENT).
- Tracker: review-task comment `posted` on #415; work-started re-fired at Step 2 — issue #415 created by the review; lock updated. work-started comment `posted`; board `already` (In Progress).

### Step 3 — develop — 2026-09-17

- Pre-develop surface map: subagent not dispatched — pass performed inline; independence lost. The review (Step 2) had already read every file in scope, and re-dispatching Explore to re-find them would be a redundant pass. 11 files identified in shared/resources + create-* skills + tests:
  - `shared/resources/jira-sync.js` — `dropHeadingLines` (:1259), `isListSection` (:1308), `summariseSection` (:1324), `checkCardSections` (:1658), `formatCardCheck` (:1733); module.exports ~:5570
  - `shared/resources/card-preflight.js` — CLI; clean output = `formatCardCheck` "No problems found."; `preflight()` exported
  - `shared/resources/tests/jira-sync-card-summary.test.mjs` — summariser fixtures A–E; test H walks the task corpus with a >20 floor (`checkCardSections` must stay ok on every doc)
  - `shared/resources/tests/card-preflight.test.mjs` — one-definition property test B, bundled-copy parity test B, create-* invocation test D
  - `shared/resources/authoring-card-preflight.md` — the contract; names `missing`/`empty`/`no-body`
  - `skills/create-task/SKILL.md` §4.6, `skills/create-story/SKILL.md` §6.2a, `skills/create-epic/SKILL.md` §"Card Preflight" — prose sites
  - `skills/create-task/scripts/lib.js:122` — `countMandatorySections` (task-only; not used)
  - `CHANGELOG.md` — Fixed entry
  - 15 affected docs: task.3–15, 105, 106 — shape is `**Functional**:` + blank + list, then further `**Label**:` + list groups
- Plan file found: `docs/tasks/task.117.card-preflight-heading-only/task.117.plan.card-preflight-heading-only.md` — included as implementation context for /develop.
- Always-load files: 3 (coding-standards, tech-stack, source-tree) prepended to the /develop context.
- Fast gate precondition: `develop.fastGateCommand` unset → fallback `npm run ci:fast`; script defined → OK.
- Planned/Draft gate: N/A — status is Ready for Development.
- Alignment: 🆕 no implementation (greenfield for the fix; PREPASS_C `not-implemented`).
- **Measurement before the fix (by the new corpus test, `heading-only` kind added first): 29 of 120**, not 15 — the 15 label-only blocks (task.3–15, 105, 106) plus 11 (task.16–27) where `**Functional**:` sits directly above its bullets with no blank line and the prose path joined them into one run-on string, plus 3 Breaking Changes blocks (task.32, 34, 104 — a label straight into a code fence). The 2026-09-10 instrument counted `chars < 40`, which sees only the first shape. Same root cause; recorded in the test header, the task's Progress Tracking and the CHANGELOG.
- After the summariser fix: 1 of 120 — task.104's Breaking Changes opened `**Before** (GitHub, …):` (a bold run with trailing text, not a label) straight into a fence. The fix belongs in the document (same call as task.2 in test H): one lead sentence added, Change Log row + `updated` bumped.
- Design: bold-label lines are dropped in `dropHeadingLines` (every one, same mechanism as `###`), not only a leading one — Q3 from the review. `RE_BOLD_LABEL` excludes `[.!?]` inside the bold so `**None.**` stays content. `summariseSection` returns `kind: "heading-only"` when a non-empty section is nothing but headings/labels; `checkCardSections` also applies `isLabelOnly(text, kind)` (prose, no terminator, no list item) to non-empty text. Severity follows the block: critical, or important on an optional block.
- Scope statement (Q2): `describeCardScope` in `formatCardCheck` (so `sync-jira-* --check-card` says it too) and as `scope` in `card-preflight --json`. No mandatory-section count.
- Mutation proofs (source snapshotted with `cp`, restored byte-identical): (1) revert the bold-label drop → corpus test red at 28 of 120 and the label-alone fixture red; (2) `isLabelOnly` made inert → `H: a label with nothing but a fence under it…` red.
- Fast gate iteration 1: `npm run ci:fast` → first run red on prettier (2 new test files); formatted; second run green (TEST_EXIT=0, 1 skipped). Log removed.
- `npm run bundle` run; `bundle:check` OK; 44 bundled `references/` copies updated.
- Loop audit: subagent not dispatched — audit performed inline; independence lost. completed=5/5, status=Ready for Review, last_commit_hash=b1a0f78d (no new commit yet; Step 4 commits).
- CHANGELOG.md: `### Fixed` entry added under Unreleased (body-diff-on-next-sync noted, per §10).
- Development completion comment posted to github issue 415 (`develop-complete`, count=5).

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.117.card-preflight-heading-only`
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}
