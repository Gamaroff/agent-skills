# Implementation Report: The bundler copies depth-relative links verbatim, so every bundled references/ file carries broken links

**Task**: `task.108.bundler-rewrites-relative-links.md`
**Run Number**: 1
**Started**: 2026-09-12 14:16
**Status**: In Progress

---

## Summary

Fix `bundle_skill.py` / `package_skill.py` so depth-relative links in bundled `references/` copies resolve from their new location, and add a CI link check over `skills/**` + `shared/resources/**` so the breakage cannot recur silently.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | medium                                                                     |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | N/A (no issue linked)                                                      |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.108.*` exists in git                              | Branch created at `7afb742c` | —                    |
| 2. review-task             | ✅ Done    | `task.108.review.{N}.{name}.md` exists (or skip logged)                | `task.108.review.1.bundler-rewrites-relative-links.md` — READY TO IMPLEMENT 9/10; Planned → Ready for Development | prepass B/C inline (see Decisions) |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 1 iteration; 5/5 phases; fast gate 3 runs (prettier → eval parity → green 3,196/0) | inline audit (status + checkbox count) |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.108.qa.{N}.*.md`; `task.108.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.108.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-12

- Invoked by `/develop-next` (autonomous run) — item T108, source `task-registry` (no roadmap phase held an actionable row).
- Phase 0a-parallel: resolver not needed (file path given); tracker poller and lite-mode detector run inline rather than as Explore subagents (outputs are a few lines; prior sessions recorded Explore hangs). No failures.
- Tracker: `TRACKER=github`, no `github_issue:` in frontmatter → `TRACKER_ISSUE` empty; all tracker/board operations skipped.
- Pipeline mode: **standard** — risk_level=`medium` (not in {low, absent}) → risk_ok=false; phase_count / single_module not decisive.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Task status at start: `Planned` — proceeding; Step 2 `/review-task` validates and promotes.
- Phase 0b: no previous run (no branch, no PR, no implementation report) → starting fresh.
- Phase 0d (auto-answered per develop-next directive, no prompt): Q1 feature branch base = `develop` (current branch `develop`, recommended); Q2 PR target = `develop` (recommended). 2 questions, 2 auto-answers.
- qa-planning gate: skipped (auto — no prompt)

### Step 1 — create-branch

- Branch `feature/task.108.bundler-rewrites-relative-links` created from `develop` at `7afb742c`, pushed with tracking. Implementation report stashed before branch creation, restored after.
- Tracker signal (work-started) skipped — no issue linked at Step 1 (issue #395 was created in Step 2; `work-started` is not re-fired retroactively — the review comment is the first tracker record).

### Step 2 — review-task

- Gate: status `Planned`, no review report → ran `/review-task`. review-task output: Comprehensive report — required for pipeline audit trail.
- Step 0a branch setup auto-skipped (already on `feature/task.108.*`).
- Pre-pass agents dispatched in parallel: B (architecture) → `aligned`, 2 low notes; C (already-implemented) → `not-implemented`, 5 findings. Neither failed.
- Reviewer baseline scan: 626 files / 1,610 links / 735 broken in 212 files; shapes 347 docs / 320 unbundled siblings / 58 other; 10 false positives from regex fence parsing.
- review-task tracker-sync prompt auto-answered: **Sync to GitHub** (recommended; every task 100–107 is linked) → issue #395 created, board P1, `github_issue: 395` written. Estimate field absent on board (warning).
- review-task Step 8.5 auto-answered: Yes, apply all critical + important fixes — pipeline proceeds autonomously. 5 Important fixes applied to the task doc + plan (link rule for unbundled siblings; `package_skill.py` imports the pass; line-based fence + pattern placeholder spec; guard under `npm test`; reference path). 0 skipped.
- review-task Step 9 auto-answered: Yes, fixes complete — pipeline proceeds autonomously. Planned promoted to Ready for Development by review-task. Change Log rows 1.1 + status transition written.
- Review report: `docs/tasks/task.108.bundler-rewrites-relative-links/task.108.review.1.bundler-rewrites-relative-links.md`
- Review outcome comment posted to github issue 395 (`reason: posted`).

### Step 3 — develop

- Fast gate precondition: `develop.fastGateCommand` = `npm run ci:fast` (repo default) — script resolves. ✅
- Pre-develop surface map: 9 files identified in create-skill/scripts + tests + docs — recorded from the Step 2 review's own verification rather than a fresh Explore dispatch (the surface was fully enumerated there): `skills/create-skill/scripts/bundle_skill.py` (1055 lines; `rewrite_text`, `discover_needed`, `expected_bytes`, sibling assertion pattern), `skills/create-skill/scripts/package_skill.py` (179; duplicated regexes L108-135), `tests/bundle-transitive.test.js` + `tests/bundle-check-mode.test.js` (existing bundler test conventions — node:test, temp fixture trees), `tests/fixtures/` (one existing fixture dir), `package.json` (`tests/*.test.js` glob), `docs/reference/develop-story-pipeline-audit.2026-08-20.md` (Theme F, L175+), `docs/contributing/packaging.md`, `CHANGELOG.md` (`[Unreleased]` at L5).
- Plan file found: `docs/tasks/task.108.bundler-rewrites-relative-links/task.108.plan.bundler-rewrites-relative-links.md` — included as implementation context for /develop (updated by the review).
- Always-load files passed: 3 (coding-standards, tech-stack, source-tree).
- `/develop` caller mode: orchestrated (lock present, branch matches). Status Ready for Development → In Progress. Risk `medium` → no qa-planning gate. Alignment: greenfield (PREPASS_C `not-implemented`), no alignment prompt.
- **Phase 1 baseline** (checker, before any bundler change): 845 broken relative links in 215 files; 606 files / 1,690 relative links walked. Shape: docs ×~347, unbundled shared siblings ×~320, other ×~58 (matches the review's estimate; the task's 864/229 figure came from a regex-fence scan with false positives).
- Source-side defects surfaced by the checker outside `references/` copies: 2 template placeholders using `<…>` (added to the placeholder pattern), 1 `link-to-pr` template literal (→ `{pr-url}`), 1 directory link with trailing slash (checker strips it). After the rewrite, 8 skill-native files remained — consumer-relative links in `epic-template.md` (3 identical copies incl. `docs/templates/`) and `story-template.md` converted to `{ARCH_ROOT}` / `{REPO_ROOT}` / `{DOCS_ROOT}` / `{epic}.{story}` placeholders; `references/X` self-links in three `develop-bug` step docs → siblings; a dead `CLAUDE.md#epic-numbering-system` anchor → `docs/standards/epic-registry.md`; three nonexistent companion guides in `performance-optimizer` → plain text.
- **Design decision (one rule)**: resolved target inside `skills/<skill>/` → relative to the copy; anything else → `UPSTREAM_BASE + repo-relative path`. "Bundled sibling" decided from `needed ∪ reconcilable` (the same population `check_skill` uses), never from disk mid-run — otherwise run 1 emits URLs for siblings written later and run 2 flips them back. Runs after `rewrite_text`, so a shared source's `references/X` target maps as `shared/resources/X` (only when the source is under `shared/resources/` — from a skill's own file the same spelling is a real path).
- **Latent bug found and fixed**: `SHARED_REF_RE` (bundler) and `collect_shared_refs` (validator/packager) matched `shared/resources/X` *inside* the upstream URLs the pass now writes — the packager's walk over `references/` rediscovered every URL as a reference and vendored files the tree deliberately did not bundle, so zip ≠ tree. Both regexes now carry `(?<![\w-]/)`.
- **Packager**: previously `zipf.write(src_path)` wrote the RAW shared source into the zip *and* the walk wrote the in-tree copy at the same arcname → duplicate entries, raw copy winning on extraction. Now one entry, `expected_bytes(...)`. A skill's own `.md` gets the outside-the-skill rule (README `../../docs/…` was the last broken link in the zip tree).
- Non-vacuity floor counts every parsed inline link (external included, 1,985 on this corpus), not only relative ones (855 after the fix) — a floor on relative links alone would drift with the very fix it guards.
- Verification: `npm run bundle` twice → second run changes nothing (status + diff hashes equal); `bundle --check --all` → 126 skills, 0 problems; checker → 0 broken; three packaged skills (develop-task, create-task, observe-work) extracted → 57 md files, 100 relative links, 0 broken; zip copy byte-identical to in-tree copy.
- **Mutation proofs**: (1) `rewrite_md_links` stubbed to return content unchanged → re-bundle → `bundled-links.test.js` red (that test, not another) and 2/4 of `bundle-link-rewrite.test.js` red; restored → green. (2) walk truncated to zero files → floor test red with `scan-broken: visited 0 files / 0 links`; the link assertion passes vacuously on the empty walk, which is exactly why the floor exists; restored → green.
- Fast gate iteration 1: `prettier --check` flagged the three new JS files → formatted.
- Fast gate iteration 2: 3195/3197 pass; one failure — `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` "every transitively-bundled reference is byte-identical to its source". Its test-local `normaliseBundled()` undid only the `shared/resources/`→`references/` rewrite, so a copy that now also carries re-relativised links read as STALE. `transition-protocol-parity.test.mjs` had the identical helper (used to allowlist bundled copies by content) and was one link away from the same failure. **Fix**: new `evals/shared/lib/bundled-parity.mjs` — `bundleCheck(skillDir)` shells `bundle_skill.py --check` (the one definition of "in sync") and `isFreshBundledCopy(file, source)` = banner declares the source AND `--check` reports it clean. Both tests rewired; `normaliseBundled` deleted from both. Mutation-checked: appending a byte to `skills/develop-task/references/tracker-comment-contract.md` makes the parity test flag it again. Two enumerations of "what the bundler writes" (the bundler and a hand inverse) is the drift class this repo names; this removes the second one.
- Fast gate iteration 3: green — 3,197 tests, 3,196 pass, 0 fail.
- Loop audit (iteration 1): status `Ready for Review`, 5/5 phases `[x]`, no commit yet (Step 4 `/create-pr` commits) → EXIT loop. Audit performed inline from the three fields rather than via an Explore dispatch — same three facts, no interpretation needed.
- `/develop` Change Log row written (`Implemented — 8 source files + ~210 regenerated bundles, 10 tests`). `/finalise` NOT invoked (pipeline bypass — Step 7).
- Development completion comment posted to github issue 395 (`develop-complete`, count=5).
- GitHub board: work-started → transitioned (fired now — the issue did not exist at Step 1; idempotent, `--add-to-board`).

### Step 4 — create-pr

- SCOPE_PATHS: `docs/tasks/task.108.bundler-rewrites-relative-links`, `skills`, `tests`, `evals`, `docs`, `AGENTS.md`, `CHANGELOG.md` (the two root files are named explicitly — the `dirname` loop yields `.` for them and would drop them). Pre-flight guard: no out-of-scope untracked files (all untracked paths are in scope).

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {populated at end}
**Branch**: `feature/task.108.bundler-rewrites-relative-links`
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}
