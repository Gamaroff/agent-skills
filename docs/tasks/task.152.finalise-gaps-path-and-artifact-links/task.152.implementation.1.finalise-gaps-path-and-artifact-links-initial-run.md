# Implementation Report: [Task 152] finalise: bug-mode gaps path and co-located artifacts in 8a and link guard

**Task**: `task.152.finalise-gaps-path-and-artifact-links.md`
**Run Number**: 1
**Started**: 2026-09-26 21:05
**Status**: In Progress

---

## Summary

Close /finalise's two scope edges: bug mode through Step 8 (GAPS path) with a shared Verification Complete fill and a `status-history.js` `--json` contract, and widen 8a / the evaluator / the doc-links corpus guard to co-located pipeline artifacts with writer-site link checks.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set                                                                    |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | In Progress ✅ (gh-stage: transitioned; Priority already P2 Medium)         |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.152.*` exists in git                              | Branch created at `e5ca5919`; pushed to origin | —                    |
| 2. review-task             | ✅ Done    | `task.152.review.{N}.{name}.md` exists (or skip logged)                | `task.152.review.1.*.md` — READY TO IMPLEMENT 9/10; Planned → Ready for Development | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 1 iteration (inline); commits fac47f6, debdd6e, a9709ab, c796370; audit 20/20 | `.summaries/step-3-loop-audit-1.json` |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.152.qa.{N}.*.md`; `task.152.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.152.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-26

- Dispatched by `/develop-next` (roadmap item T152, source `roadmap`) — AUTONOMOUS RUN directive in force.
- Upfront Setup (Phase 0d) — 2 questions, both auto-answered with the recommended option (not prompted):
  - Q1 Feature branch base: develop — on `develop`; recommended option.
  - Q2 PR target branch: develop — recommended option.
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 run inline (resolver not needed — explicit path; tracker poller and lite-mode detector not dispatched). Lite-mode inputs derived from the document: risk_level=absent (risk_ok=true), phase_count=7 (<3 false), single_module=false (finalise, qa-task, qa-story, review-pr, shared/resources) → PIPELINE_MODE=standard.
- Document status `planned` → proceed; Step 2 `/review-task` validates and promotes.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Tracker: github, issue #482.
- Branch: `feature/task.152.finalise-gaps-path-and-artifact-links` from `develop` @ `e5ca5919`. Implementation report stashed before branch creation, restored after.
- Tracker comment work-started: posted. GitHub board: work-started → transitioned (In Progress).

### Step 2 — review-task — 2026-09-26

- review-task output: Comprehensive report — required for pipeline audit trail (auto-answered).
- Pre-pass B: drift (1 medium: ShellCheck omitted for new `.sh`); pre-pass C: not-implemented.
- review-task Step 8.5 auto-answered: Yes, apply all critical + important fixes. Applied I1 (root-anchored helper paths), I2 (`lint:shell` in Phase 7), O1 (two anchors).
- review-task Step 9 auto-answered: Yes, fixes complete. Planned promoted to Ready for Development by review-task.
- Review report: docs/tasks/task.152.finalise-gaps-path-and-artifact-links/task.152.review.1.finalise-gaps-path-and-artifact-links.md
- Tracker key re-read after review: 482 (unchanged) — no re-fire needed.
- Tracker comments: review-task stage posted; review stage posted.

### Step 3 — develop — 2026-09-26

- Fast gate precondition: `develop.fastGateCommand` unset → default `npm run ci:fast`; script resolves.
- Pre-develop surface map: 19 files identified in skills/finalise, shared/resources (fill helper, status-history.js, finalise-fix-and-recheck.mjs + preconditions JSON, doc-links.js), qa-task/qa-story/review-pr SKILL.md, four test files, CHANGELOG. Map notes: `qa-task` and `qa-story` already bundle `references/doc-links.js` (only `review-pr` gains a copy — task § 7 item 14 overstated); their existing `qa-read-back.js` link-checks the work-item document only, never the QA report, so the writer check is still needed.
- Plan file found: docs/tasks/task.152.finalise-gaps-path-and-artifact-links/task.152.plan.finalise-gaps-path-and-artifact-links.md — included as implementation context for /develop
- Step 3 inline — /develop not invoked: the plan names every hunk (helper body, table rows, markers, 8.5 branch, evaluator predicate, corpus test shape, writer block), and the surface map is recorded above.
- Always-load files read: coding-standards, tech-stack, source-tree (3).
- Iteration 1 (inline) implemented all 7 phases:
  - P1 `shared/resources/fill-verification-complete.sh` (ShellCheck clean); 7.1 calls it with `accepted`.
  - P2 five `gaps-*` skip-table rows + markers; 8.1 fills `gaps`; 8.3 bug-mode Status History call (root-anchored path, `--json`); 8.4 skip; 8.5 binds `DOC_KIND`/`DOD_PATH` and reads the DoD file's Step 5 in bug mode; 8.5's `stakeholder-summary-cli.js` call re-addressed from the repo root (review O2); checklist qualifier.
  - P3 `status-history.js`: `--json`, usage exit 2, `normaliseStatus` (exported, applied in `main()` only).
  - P4 `isCoLocatedArtifact` + `artifactPaths` admission; preconditions JSON statement/input.
  - P5 8a clause + CI-table row widened; artifact corpus guard (1,000 floors; 11 links / 2 fences pinned from its first red run — matches the § 3 measurement). Wall time ≈ 2.0 s (budget 10 s).
  - P6 writer-site block in qa-task Step 11, qa-story Output 1, review-pr Step 7; section-scoped population test.
  - P7 CHANGELOG `[Unreleased]` (Added ×3, Changed ×2 breaking, Fixed ×1).
- Mutation proofs (each reverted, named test red, restored; runner `.claude/state/t152-mutate.mjs`):
  | # | Mutation | Red test |
  | - | -------- | -------- |
  | M1 | helper hard-codes ACCEPTED for `gaps` | fill helper writes GAPS … (bash, zsh) |
  | M2 | delete the `gaps-body-section` marker | every table row has exactly one prose marker |
  | M3 | drop 8.5's bug branch | 8.5 in bug mode … (bash, zsh) — "gap report body is empty — not posting" |
  | M4 | drop `--json` output | --json prints reason `updated` … |
  | M5 | drop `normaliseStatus` in `main()` | each of the five lifecycle tokens is written in Title Case |
  | M6 | usage exit back to 1 | an unknown flag is a usage error |
  | M7–M14 | drop each `isCoLocatedArtifact` condition (dir, subdir, stem, `.bug.`, `.md`, `..`/NUL, doc anchor, artifact RE) | artifactPaths refuses … / admits nothing without a valid documentPath |
  | M15 | admit any listed artifactPath | both refusal tests |
  | M16 | invert `ARTIFACT_RE` in the artifact walk | corpus: every co-located pipeline artifact … (floor) |
  | M17 | unpin one dead link | same (new dead link) |
  | M18 | unpin one fence | same (new open fence) |
  | M19–M21 | remove each writer block's check or `git add` | writer sites: … |
- Behavioural evidence (recorded, not held by CI): in a scratch git repo, a staged QA report quoting `[x](a.md)` then [y](b.md) inline → `doc-links.js --file` exit 1, `✖ …task.9.qa.1.x.md:3 → b.md [missing]`; after fencing the quotation → exit 0.
- Loop audit iter 1: status ready-for-review, 20/20, HEAD c7963701 → EXIT loop. develop-complete comment posted.
- Gates (with `.agents/skills` symlink moved aside): `npm run ci:fast` rc 0 (4,263 tests, 4,262 pass, 0 fail); `lint:shell` rc 0; `bundle:check` rc 0 (no UNREACHED); `check:generated` rc 0; `quick_validate.py` ✓ finalise, qa-task, qa-story, review-pr.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Step 3 — `unchanged` is unreachable through the status-history CLI.** `upsertStatusHistory` always appends; a repeated identical row reports `updated` and writes a duplicate. The plan anticipated this ("assert what it actually does, and state that"); the test asserts the append and the success criterion carries the note. Review check 10 (outcome reachability) did not catch it at Step 2.
- **Step 3 — `npm run bundle` left a stale `.json` copy.** `skills/finalise/references/finalise-fix-and-recheck-preconditions.json` was not refreshed after the source changed (`.json` carries no provenance banner, so the bundler treats a differing copy as authored); `bundle:check` reported it `AMBIGUOUS`. Resolved by deleting the copy and re-bundling, as the message says.
- **Step 3 — pre-existing `qa-story` template defect fixed.** A stray four-backtick fence line after *Test Commands Executed* closed the Output 1 report template early; *Coverage Report* onward rendered as skill headings and the template's closing fence opened one that never closed. Found by the new section-scoped population test; one-line fix in the section this task edits; CHANGELOG Fixed entry.
- **Step 3 — task § 7 item 14 overstated.** `qa-task` and `qa-story` already bundled `references/doc-links.js` (via `qa-read-back.js`); only `review-pr` gained a copy.

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: feature/task.152.finalise-gaps-path-and-artifact-links
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}
