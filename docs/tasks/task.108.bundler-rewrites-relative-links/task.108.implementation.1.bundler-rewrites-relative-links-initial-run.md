# Implementation Report: The bundler copies depth-relative links verbatim, so every bundled references/ file carries broken links

**Task**: `task.108.bundler-rewrites-relative-links.md`
**Run Number**: 1
**Started**: 2026-09-12 14:16
**Status**: Completed

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
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #396: https://github.com/Gamaroff/agent-skills/pull/396 — 4 commits (feat / docs / fix / chore); in-review comment posted on #395 | —                    |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.108.qa.{N}.*.md`; `task.108.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 4 cycles: CONCERNS 90 → PASS 100 (+1 low) → CONCERNS 90 → PASS 100; 3 fix commits; 5c APPROVE | code-review subagents ×6 (transcripts in scratch; findings in the gates/reports) |
| 7. finalise                | ✅ Done    | `task.108.dod.{N}.*.md`; task `status: accepted`                       | `task.108.dod.1.bundler-rewrites-relative-links.md` ACCEPTED; AC 6/6, security PASS (54 probes, 0 reproduced), compliance N/A, docs PASS, CI SUCCESS | 4 DoD agents (findings folded into the DoD file) |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | Committed in `c1e31af4`, pushed to PR #396 | —                    |

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
- `/commit-changes` split the work into four commits, separating behaviour from churn per the v0.46.0 release lesson: `892d06a` feat(bundler) — the pass, guard, evals helper, docs; `c448822` docs(task.108) — artefacts (landed second because a zsh word-splitting slip aborted the intended second commit and the fourth ran first; order is cosmetic); `22a32a1` fix(links) — 10 source-side repairs; `0e5e36b` chore(bundle) — 205 regenerated copies. Leak check: every file in every commit is under a scope path — OK.
- PR body written directly from the change set (no summariser subagent — the author has the full picture and the diff-derived summary would re-derive it).
- PR #396 opened → develop: https://github.com/Gamaroff/agent-skills/pull/396. `in-review` comment posted on #395 (`posted`). Post-PR state check: PR #396 state = OPEN, head `0e5e36b1` == local HEAD, errors = 0 (checked inline via `gh pr view`).
- GitHub board: in-review → stage-disabled (no `pipeline.in-review` target in this repo's `tracker-workflow.yaml`; correct outcome, non-blocking).

### Steps 5–6 — QA loop

- QA cycle counter = 1 (limit 5). GitHub board: QA-start re-assert → stage-disabled.
- Traceability mapper skipped: `HAS_SUCCESS_CRITERIA_TABLE=false` — §9 Success Criteria is a numbered list, not a table (Phase 0 default applied).
- `/qa-task` invoked with `code_review_blocking=true` (standard mode, no lite directive).
- QA cycle 1: gate CONCERNS 90/100 — `task.108.gate.1.bundler-rewrites-relative-links.yml`, `task.108.qa.1.bundler-rewrites-relative-links.md`. Step 3b code review (Explore subagent, 12 files): 3 bugs + 5 cleanups; CR-1 (bug/medium/high) promoted to `top_issues`. Step 4b not applicable. QA's own mutants: 3/3 caught. PR comment posted; tracker `qa-gate` comment posted on #395.
- Cycle 1 < 3 → Convergence check and Diminishing-returns exit not evaluated (both need three readings). → 5b.
- QA Cycle 1 — changes-requested: stage-disabled. qa-cycle-1 tracker comment posted.
- `/qa-fix` (cycle 1): findings taken from the gate already in context (no ingester subagent — the orchestrator wrote the gate minutes earlier; 8 findings, none ambiguous, no third strike). All 8 applied: CR-1 `isFreshBundledCopy` now `ok && !problems.has(rel)` with an optional `python` override for tests + new `evals/shared/tests/bundled-parity.test.mjs` (fresh / tampered / unrunnable-bundler); CR-2 root-absolute targets external in both twins (+ assertions in both test files); CR-3 `decodeURIComponentSafe` (+ test); CR-4 `t.after` fixture cleanup; CR-5 memoised `scanned()`; CR-6 `_skill_dirs()` lru_cache; CR-7 import moved; CR-8 comment reworded. Step 3.5 adversarial pass: the fixes touch no emission/lifecycle paths; the combination re-read as one diff — the `python` override threads through the cache key so a test's fake binary cannot poison the real cache.
- Mutation proof (CR-1): reverting to `!problems.has(rel)` → "fails CLOSED" test red; restored → green. 131/131 across the affected suites; bundle still a no-op, `--check --all` 0 problems.
- 5b step 0a fast gate: green (3,201 tests, 3,200 pass, 0 fail). Commit `1d18e0e3` — gate 1 + QA report 1 + fixes, implementation report updates excluded; one push.
- 5b 4a: the orchestrator's `qa-fix-1` tracker comment was NOT posted separately — `/qa-fix` Step 7 already posted the identical summary under stage `qa-fix` (cycle=1) plus the PR comment; a second marker would duplicate it. Post-fix PR state (inline `gh pr view`): OPEN, head `1d18e0e3`.
- Cycle counter → 2. Returning to 5a (re-review).
- QA cycle 2: refute pass over the whole branch diff (cycle-2 rule; SAFETY_REPROBE=false — prior security axis PASS/reasoned). Gate 2 PASS 100/100 with C2-CR-1 in `top_issues` (bug/low/high-confidence → appended under `code_review_blocking`; deterministic rules leave the gate at PASS). Gate 1's CR-1 closed in place with `bug_resolution`. PR comment posted; tracker `qa-gate` comment → `already` (marker identity is the stage, so the cycle-2 gate comment deduplicated against cycle 1 — by contract; the per-cycle `qa-cycle-2` comment below carries the cycle).
- Gate PASS **with** `top_issues` → outcome branching routes to 5b, not 5c. Cycle 2 < 3 → Convergence check and Diminishing-returns exit not evaluated.
- QA Cycle 2 — changes-requested: stage-disabled. qa-cycle-2 tracker comment posted.
- `/qa-fix` (cycle 2): all five applied. C2-CR-1 bundled siblings relpath'd from `{skill_dir}/references` (nested-source test added; mutation-proved — reverting the join → red); C2-CR-2 `bundleCheck` now returns `ran` (spawned + summary line + no "could not be resolved" trailer) alongside `ok`, `isFreshBundledCopy` reads `ran` (+ test: a stale unrelated sibling no longer de-allowlists a fresh copy; unresolvable target → `ran:false`); C2-CR-3 `resolved == skill_dir` counts as inside (+ assertion); C2-CR-4 `rmSync`; C2-CR-5 duplicate comment dropped. The Change Log's single `qa-fix` row was amended to "2 iterations" rather than adding a second row (one row per loop exit).
- 5b step 0a fast gate: green (3,203 / 3,202 / 0). Commit `5bdb7011` — gate 2 + QA report 2 + gate 1 closed in place + fixes; one push. PR comment posted; tracker `qa-fix` comment → `already` (stage-identity dedup, as in cycle 1). Post-fix PR state: OPEN, head `5bdb7011`.
- Cycle counter → 3. Returning to 5a (re-review, cycle 3).
- QA cycle 3: default scoping (files changed since gate 2, 5 files, 998 lines; SAFETY_REPROBE=false). Cycle-2 fixes verified by probe + tests + two more zips. Gate 3 CONCERNS 90/100 — C3-CR-1 (bug/medium/high) promoted; a real coverage hole in the guard (`git ls-files -- 'shared/resources/**/*.md'` → 1 file; `'shared/resources/*.md'` → 58). QA hand-scanned the 58 sources: 0/103 relative links broken. Gate 2's entry closed in place. PR + `qa-cycle-3` comments posted.
- **Convergence check (cycle 3)**: HIGH sequence `[0, 0, 0]`. Read literally, `0 >= 0 AND 0 >= 0` trips; read as the rule states its purpose ("fires when HIGH findings *remain and stop falling*" — "Escalating a run with zero HIGH would misreport finished work as stalled"), a run that has never raised a HIGH finding has nothing to converge and the guard does not apply. Applied the stated intent: **not tripped**; recorded here so a reader can disagree. (This cycle's gated finding is medium, not high.)
- **Diminishing-returns exit (cycle 3)**: engine → `continue` (`non-test-finding`: `qa.testArtifactGlobs` is unset in this repo, so `[]` matches nothing by design). → 5b.
- QA Cycle 3 — changes-requested: stage-disabled. qa-cycle-3 tracker comment posted.
- `/qa-fix` (cycle 3): all three applied; corpus now 663 files / 2,098 links / 958 relative, 0 broken; per-half floor on top-level shared sources mutation-proved. The single qa-fix Change Log row folded to "3 iterations"; criterion 1's figures corrected in the task doc.
- 5b step 0a fast gate: green (3,203 / 3,202 / 0). Commit `0dbdd72c`; one push. PR comment posted; tracker `qa-fix` → `already` (stage-identity dedup). Post-fix PR state: OPEN, head `0dbdd72c`.
- Cycle counter → 4. Returning to 5a (re-review, cycle 4). Budget: one cycle remains after this review.
- QA cycle 4: scoped review (4 files, 753 lines). Gate 4 PASS 100/100, `top_issues` empty. Gate 3's entry closed in place with `bug_resolution`. PR + `qa-cycle-4` comments posted. Convergence/diminishing checks not applicable on a clean gate (hands to 5c).
- Path 1: committing gate 4 + QA report 4 (+ closed gate 3, task doc) before `/review-pr`, one push — cycle 4's push is spent here (`f587c357`).
- **5c `/review-pr --effort medium --comment`**: work item resolved via branch-stem; trail complete (impl report, review, 4 QA reports for 4 gates, gate 4 PASS/empty, no bugs, no handover; DoD absent as expected before Step 7). Conformance lens: PC-1 low/low (`pr_number:` written by finalise). Code lens: CR-1 packager `bundled_names` includes skill-native names (low/medium), CR-2 `git ls-files` without `-z` (low/medium), CR-3 banner window 4,000 chars vs 40 lines (cleanup). Verdict by the table: **APPROVE** (only low findings). Report `task.108.pr-review.1.bundler-rewrites-relative-links.md`; marker comment posted (new). The three code findings are carried as follow-ups — none affects the corpus today.
- GitHub board: ready-for-merge → stage-disabled (correct outcome, non-blocking). Loop exit: 4 cycles, gate PASS, PR review APPROVE.

### Step 7 — finalise

- `/finalise` invoked (not inlined). Running summary `task.108.dod.1.bundler-rewrites-relative-links.md`. Four DoD agents in parallel: AC PASS (6/6, per-PR test lane verified for AC1–4; AC5–6 documentary), Security PASS (`boundary: true` — `_relocate_target`/`is_external_target` probed with 54 executed candidates incl. the corpus path sink and the JS twin, 0 reproduced), Compliance NOT_APPLICABLE, Docs PASS (CHANGELOG:111, packaging.md:109, AGENTS.md:64, audit:205; README N/A). CI_ROLLUP resolved to SUCCESS on head `f587c357` (all five checks `completed/success`). Decision: **ACCEPTED**. PR review decision from GitHub is `null` — no formal review is submitted by this pipeline; the 5c advisory APPROVE stands in, per repository convention.
- Frontmatter → `status: accepted`, `pr_number: 396`, `completed_date: 2026-09-12`; Change Log row `1.2 DoD passed — accepted (PR #396)` in the same edit. `registry-tick.js` → `ticked`. DoD section added to the task body; `sprint-review-summary.md` written.
- Canonical PR comment posted (marker; new). DoD body posted to PR — https://github.com/Gamaroff/agent-skills/pull/396#issuecomment-5647096897.
- Issue #395: Document link re-pointed to `develop`; `done` comment → `posted`; closed via `tracker-issue.js`, state verified CLOSED. GitHub board: done → `already`.
- Task completed.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-09-12
**Gate Result**: CONCERNS
**Issues Found**: 1 medium (CR-1: `isFreshBundledCopy()` ignores `ok` — fails open when the bundler cannot run), 2 low (CR-2 root-absolute target twin disagreement; CR-3 `decodeURIComponent` throw), 5 cleanups (CR-4..8)
**HIGH findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)
**Fixes Applied**: CR-1 fail-closed `isFreshBundledCopy` (+ regression test), CR-2 root-absolute targets external on both twins, CR-3 safe decode, CR-4..8 hygiene
**Commit**: `1d18e0e3` (pushed; fast gate 3,200/0)

### QA Cycle 2 — 2026-09-12
**Gate Result**: PASS (with one low `top_issues` entry)
**Issues Found**: 1 low/high-confidence latent bug (C2-CR-1: bundled-sibling branch mis-relativises for a nested shared source — none exists today), 2 low/medium-confidence edge observations (C2-CR-2 `ok` conflation; C2-CR-3 skill-dir self-link), 2 cleanups
**HIGH findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)
**Fixes Applied**: C2-CR-1 references-root relpath (+ nested-source test, mutation-proved), C2-CR-2 `ran`/`ok` split (+ stale-sibling and unresolvable tests), C2-CR-3 skill-dir self-link, C2-CR-4/5 hygiene
**Commit**: `5bdb7011` (pushed; fast gate 3,202/0)

### QA Cycle 3 — 2026-09-12
**Gate Result**: CONCERNS
**Issues Found**: 1 medium/high-confidence (C3-CR-1: the guard's `shared/resources/**/*.md` pathspec walks only nested files — 57 top-level shared sources never scanned; hand-scan 0/103 broken), 1 low (C3-CR-2 external `unzip` dependency), 1 cleanup (C3-CR-3)
**HIGH findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 3 of 5)
**Fixes Applied**: C3-CR-1 pathspec `shared/resources/*.md` + per-half floor (mutation-proved: narrowing the pathspec → red), C3-CR-2 `python3 -m zipfile`, C3-CR-3 `BUNDLER` exported
**Commit**: `0dbdd72c` (pushed; fast gate 3,202/0)

### QA Cycle 4 — 2026-09-12
**Gate Result**: PASS
**Issues Found**: none (2 advisory cleanups in the zip-listing helper)
**HIGH findings**: 0
**PR Review**: APPROVE — `task.108.pr-review.1.bundler-rewrites-relative-links.md` (1 low/low conformance note; 3 low code findings, medium confidence — follow-ups)
**Loop exit**: n/a — this exit not taken
**Action**: Proceeding to finalise

---

## Completion

**Finished**: 2026-09-12 16:17 UTC
**Final Status**: Completed
**Branch**: `feature/task.108.bundler-rewrites-relative-links`
**PR**: https://github.com/Gamaroff/agent-skills/pull/396
**QA Iterations**: 4 (3 fix cycles)
**DoD Summary**: `task.108.dod.1.bundler-rewrites-relative-links.md`
**Completion Summary**: Implemented the bundler's link re-relativisation pass (`rewrite_md_links()`, one rule: inside the skill → relative, else the upstream `blob/develop` URL), taught `package_skill.py` to import that pass and ship the bundled bytes, guarded both halves of the corpus with `tests/bundled-links.test.js` (floors 200 files / 1,000 links / 20 top-level shared sources) and `tests/bundle-link-rewrite.test.js`, and replaced two hand-written eval normalisers with a bundler-backed, fail-closed parity helper. Baseline 845 broken links in 215 files → 0 over 663 files / 2,098 links; 205 bundled copies regenerated; 10 source-side link defects fixed as found. Four QA cycles (CONCERNS 90 → PASS 100 → CONCERNS 90 → PASS 100) fixed 16 findings — notably the parity helper failing open, a latent nested-source path bug, and the guard's own `**` pathspec walking only nested shared files — each mutation-proved. Step 5c APPROVE; finalise ACCEPTED with the security boundary probed (54 candidates, 0 reproduced). Notable decisions: the review widened a `docs/`-only rule to a single in-bundle/else-upstream rule after measuring the breakage shape; the convergence check was read by its stated intent on a `[0,0,0]` HIGH sequence and recorded as such.

**Tracker debt**: none — no deferred mutations (`access.tracker: full`); board moments `in-review` / `changes-requested` / `ready-for-merge` were `stage-disabled` by this repo's ladder, which is configuration, not debt
