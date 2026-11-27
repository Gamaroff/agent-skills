# Implementation Report: The AC merge refuses another document's result

**Task**: `task.331.ac-merge-refuses-another-documents-result.md`
**Run Number**: 1
**Started**: 2026-11-27 14:35
**Status**: In Progress
**Report format**: 2

---

## Summary

Make `finalise-rerun-scope.js merge` refuse an AC result whose `story_file` names another document, and key `/finalise`'s AC state files by work-item stem as well as DoD run number.

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
| Board status        | In Progress ✅ (gh-stage work-started: transitioned; Priority already P2 Medium) |
| Tracker Issue       | #958 (GitHub)                                                              |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.331.*` exists in git                             | Branch created at `92ed119de`; pushed with upstream | —                    | 2026-11-27T14:37Z |
| 2. review-task             | ✅ Done | `task.331.review.{N}.{name}.md` exists (or skip logged)               | `task.331.review.1.…md`; READY TO IMPLEMENT 8/10; Planned → Ready for Development | —                    | 2026-11-27T14:41Z |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | Inline, 1 iteration; 8/8 phase boxes; fast gate (remote) 8956 pass / 0 fail | —                    | 2026-11-27T15:14Z |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.331.qa.{N}.*.md`; `task.331.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.331.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-27

- Invoked by `/develop-next` (roadmap item T331) with `--defaults`; autonomous run.
- Feature branch base: develop — source: recommended (auto-answered via `--defaults`)
- PR target branch: develop — source: recommended (auto-answered via `--defaults`)
- Mode: standard — source: detector. Phase 0 run inline (no Explore agents dispatched); inputs derived from the document: risk_level=low (risk_ok), phase_count=3 (not < 3), single_module=false (engine, SKILL.md, tests, CHANGELOG) → standard.
- Skips: none. Refused flags: none. AskUserQuestion: 0 questions (all resolved).
- qa-planning gate: skipped (auto — no prompt)
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Status at start: `planned` — Step 2 `/review-task` validates and promotes.
- Tracker: github, issue #958. No wireframe (ui.wireframeMap unset).
- Branch: `feature/task.331.ac-merge-refuses-another-documents-result` from `develop` at `92ed119de`. Implementation report stashed before branch creation, restored after.
- Tracker comment work-started: posted. GitHub board: work-started → transitioned (In Progress).

### Step 2 — review-task

- review-task invoked (no report existed; status Planned). Output: Comprehensive report — required for pipeline audit trail. Step 8.5 auto-answered "Yes, apply all critical + important fixes"; Step 9 auto-answered "Yes, fixes complete".
- Review report: `docs/tasks/task.331.ac-merge-refuses-another-documents-result/task.331.review.1.ac-merge-refuses-another-documents-result.md` (reviewed_blob written; freshness: fresh/blob-match).
- Pre-pass agents B and C not dispatched; both passes ran inline — independent review did not run for Step 2.
- Decision D1 (taken autonomously, no user present): Step 3c routes `result-document-mismatch` as a HALT in its own arm, per task § 5's "as result-hash-mismatch"; the plan's NEEDS_MANUAL_REVIEW wording was corrected to match.
- Findings: 0 Critical, 5 Important, 3 Optional — all applied (missed eval test pair; extract-block STEM; Step 6 comment; routing; grep criterion rescoped).
- Review outcome comment skipped — review-task reported `posted` (stage review-task-1). Tracker key unchanged (#958).

### Step 3 — develop

- Plan file found: docs/tasks/task.331.ac-merge-refuses-another-documents-result/task.331.plan.ac-merge-refuses-another-documents-result.md — included as implementation context.
- Pre-develop surface map: 6 files identified in finalise (engine `shared/resources/finalise-rerun-scope.js` merge arm `:1144`; `skills/finalise/SKILL.md` Step 3c extract/merge blocks and Step 6 action 2a; tests `finalise-rerun-scope.test.mjs`, `finalise-deferred-ci.test.mjs`, `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs`; `CHANGELOG.md`). Mapped inline during the Step 2 review — no Explore dispatched (independence loss recorded).
- Step 3 inline — /develop not invoked: the plan names every hunk and the surface was already read in full during review.
- Fast gate precondition: `npm run ci:fast` resolves.
- Phase 1: 4 tests written first; 1 red as expected (row 1 merged today), 3 green (rows that do not change). Refusal added after the hash check via `storyFileOf` (same `parseYamlSubset` root as `merge()`) and `sameDocument` (path.resolve, then realpath fallback for symlinked temp dirs/checkouts — an addition beyond the plan's sketch, to keep the macOS tmpdir case from refusing a correct answer).
- Mutations: (1) refusal disabled → "story_file names another document" test red; (2) raw-string comparison → "absolute path merges" test red. Restored; engine suite 69/69.
- Phase 2: four SKILL.md paths carry `${STEM}`; extract block binds STEM with guard; `result-document-mismatch` HALT arm naming the remedy; Step 6 comment rewritten, OWN_DOC guard kept; prose sentence added after the extract paragraph. Tests: 7 deferred-ci paths + 2 eval paths renamed. Path mutation (Step 3c result + Step 6 merged path reverted) → 18 deferred-ci and 4 eval failures; restored, 59/59.
- Phase 3: CHANGELOG `[Unreleased]` › Changed entry (task 331); `changelog-cites.sh task.331` → cites; placement check ok (987 = 987 below the first release heading). `npm run bundle` → finalise 1 bundled; `bundle:check` 0 problems.
- Fast gate: `npm run test:remote` (ci:fast on ci@192.168.1.249) — TEST_EXIT=0, 8959 tests, 8956 pass, 0 fail.
- Loop audit run inline (shell form of the shared prompt): `{"status":"ready-for-review","completed":8,"total":8}` — independent audit did not run.
- Change Log row written by the inline path (one row). Development completion comment posted to github issue 958.

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
**Branch**: feature/task.331.ac-merge-refuses-another-documents-result
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}
