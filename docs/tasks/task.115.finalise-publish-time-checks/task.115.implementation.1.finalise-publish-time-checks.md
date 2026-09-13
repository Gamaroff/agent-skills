# Implementation Report: finalise publishes before it verifies: a doubled status header, a CI reading on the wrong head, a working-tree gate, and a CHANGELOG box with no mechanism

**Task**: `task.115.finalise-publish-time-checks.md`
**Run Number**: 1
**Started**: 2026-09-13 07:35
**Status**: Completed

---

## Summary

Give `/finalise` Step 7 publish-time checks — one DoD status location, CI verified on the head that carries the acceptance, a gate on the committed tree rather than the working tree, and a mechanism behind the CHANGELOG checklist box (obs #40, #48, #57, #59). Run under `/develop-next` (autonomous; item T115 via task-registry fallback).

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
| Tracker Issue       | #401 (GitHub) — created by Step 2 `/review-task`                           |
| Board status        | work-started → transitioned ✅ (fired at Step 2 after the issue was created) |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.115.*` exists in git                              | `feature/task.115.finalise-publish-time-checks` created from `develop` at `fe3f045b`; pushed with tracking | —                    |
| 2. review-task             | ✅ Done    | `task.115.review.{N}.{name}.md` exists (or skip logged)                | `task.115.review.1.finalise-publish-time-checks.md`; READY TO IMPLEMENT 8/10 (pre-fix 6/10); 1 Critical + 4 Important fixed; Planned → Ready for Development; issue #401 created | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 1 iteration; 5/5 phases; ci:fast green (3248 pass) after one prettier fix; 6+1 mutation proofs | —                    |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #402: https://github.com/Gamaroff/agent-skills/pull/402 — commit `c7c13fce`; issue #401 commented (in-review: posted) | —                    |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.115.qa.{N}.*.md`; `task.115.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 4 QA cycles (CONCERNS 80 → PASS 95 ×3); 3 qa-fix cycles (1 gate-driven, 2 review-driven); 3 × 5c passes (CONCERNS, CONCERNS, **APPROVE**); 13 findings fixed, 4 LOW + 1 LOW carried to follow-up; 17 shape assertions all mutation-proved | —                    |
| 7. finalise                | ✅ Done    | `task.115.dod.{N}.*.md`; task `status: accepted`                       | `task.115.dod.1.*` · ACCEPTED · acceptance commit `7d2c4fb1` pushed at 6a · CI reading 1 SUCCESS @ 0f3ca4e1, reading 2 SUCCESS @ 7d2c4fb1 (90 s) · PR canonical comment · issue #401 CLOSED · board Done | —                    |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | implementation report only (acceptance artefacts landed at /finalise 6a `7d2c4fb1`) | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-13

- Invoked by `/develop-next` (item T115, `source: task-registry`) under the AUTONOMOUS RUN directive — all Phase 0d questions auto-answered with the recommended option.
- Feature branch base: develop — auto-derived (on `develop`, recommended option)
- PR target branch: develop — auto-derived (recommended option)
- qa-planning gate: skipped (auto — no prompt)
- Phase 0a-parallel executed inline (file path supplied verbatim; tracker poll = no `github_issue`/`jira_key` in frontmatter; lite-mode inputs read from the document). No subagents dispatched.
- Pipeline mode: standard — `risk_level: medium` (risk_ok=false), phase_count=3, single_module=true. Note: the step-0 prose names a "production lite-mode CLI" that does not exist in the tree — logged as observation #79; mode computed from the document's own fields.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Task status at start: `planned` — proceeding; Step 2 (`/review-task`) validates and promotes.
- Step 2: review-task output: Comprehensive report — required for pipeline audit trail. Review report: docs/tasks/task.115.finalise-publish-time-checks/task.115.review.1.finalise-publish-time-checks.md
- Step 2: review-task pre-pass executed in-line (no Explore subagents). Autonomous decisions in place of the three question points — recorded in the report §User Decisions: header removal over a pre-post check; acceptance commit+push moved into Step 7 before the side-effects with the second CI reading recorded on the PR comment + implementation report; no-suppression rule + tracked-and-pushed assertions instead of an audit; changelog drift test scoped to tasks (bugs 13/15 the follow-on).
- Step 2: tracker linkage — autonomous recommended option "Sync to GitHub": issue #401 created via ensure-task-github-issue, board add, Priority P1 (Estimate field absent on board — non-blocking); `github_issue: 401` written.
- Step 2: review-task Step 8.5 auto-answered: Yes, apply all critical + important fixes — pipeline proceeds autonomously. 6/6 applied, 0 skipped.
- Step 2: review-task Step 9 auto-answered: Yes, fixes complete — Planned promoted to Ready for Development by review-task.
- Step 2: Review outcome comment posted to github issue 401 (reason: posted).
- Step 2: work-started re-fired at Step 2 — issue 401 created by the review; lock updated. tracker-comment: posted; gh-stage work-started: transitioned.
- Step 3: fast-gate precondition — no `develop.fastGateCommand` set; fallback `npm run ci:fast` resolves (`package.json` defines it). Passed.
- Step 3: Pre-develop surface map: 9 files identified in finalise + pipeline step docs + evals — reused from the Step 2 review's in-line verification (no Explore subagent dispatched): skills/finalise/SKILL.md (Step 0 template l.87–100; Step 6 CI gate l.594–820; Step 7 l.822–1484 incl. checklist l.1469–1483; Step 8 mirror l.1493/1557), shared/resources/develop-pipeline-step-7-finalise.md (DoD→PR post l.126–160; tracker update; checklist l.~470), shared/resources/develop-pipeline-step-8-commit.md (commit point), shared/resources/develop-pipeline-step-5-6-qa-loop.md (5c l.851+; path-1 commit l.655–700), docs/contributing/releases.md (checklist l.23; one-liner l.33), evals/shared/tests/task-registry-drift.test.mjs (backstop shape), CHANGELOG.md ([Unreleased] cites tasks 107/108/113/114; bug 14 only), skills/finalise/assets/ (sprint-review template only), package.json (ci / ci:fast).
- Step 3: Plan file found: docs/tasks/task.115.finalise-publish-time-checks/task.115.plan.finalise-publish-time-checks.md — included as implementation context for /develop.
- Step 3: Always-load files read and prepended (3): coding-standards.md, tech-stack.md, source-tree.md.
- Step 3: /develop iteration 1 — CALLER_MODE=orchestrated; status gate n/a (Ready for Development); alignment: greenfield within existing docs (no existing checks to align). Implemented: Phase 1 (DoD header line removed from the Step 0 template; flip instructions retired at Step 7/8; checklist item reworded), Phase 2 (finalise Step 7 gains 6a acceptance commit+push / 6b tracked-and-pushed assertions / 6c second CI read with HALT `ci-not-green-on-acceptance-head` / 6d CHANGELOG advisory; CI_HEAD_1 recorded at Step 6; PR canonical comment carries both readings; pipeline step-7 doc gains "The publish boundary" + DoD-post assertion + checklist items; step-8 doc: implementation report only), Phase 3 (5c tracked-and-pushed assertion + no-suppression rule), Phase 4 (releases.md convention/test/owner/flip line; evals/shared/tests/changelog-entry-drift.test.mjs; evals/shared/tests/finalise-publish-boundary.test.mjs). CHANGELOG entry added under [Unreleased]/Changed (task 115).
- Step 3: design note — `verify-push-state.sh` not reused at 6b because it fails on any dirty tree and the orchestrator's implementation report is legitimately uncommitted until Step 8; per-artifact `git ls-files`/`git show origin/<branch>:<path>` used instead. `git add` of the registry split behind an existence check (one unmatched pathspec aborts the whole add).
- Step 3: mutation proofs — drift test: removed the task 114 citation → red naming task 114 (PR #400); shape test: 6 mutants (header line restored; PR comment moved before 6a; commit suppressed; 5c ls-files dropped; releases flip line removed; CI_HEAD_1 removed) → each caught by its own assertion; all sources restored byte-identical (cmp).
- Step 3: fast gate iteration 1 — first run TEST_EXIT=1 (prettier: 2 new test files), `prettier --write`, second run TEST_EXIT=0 (3249 tests, 3248 pass, 0 fail). `npm run bundle` run after the shared/resources edits (22 files incl. references/ copies). Logs removed.
- Step 3: loop audit (in-line) — status Ready for Review, 5/5 phases, exit after iteration 1.
- Step 4: SCOPE_PATHS = [docs/tasks/task.115.finalise-publish-time-checks, CHANGELOG.md, docs/contributing, evals/shared/tests, shared/resources, skills]; pre-flight guard held 0 files. /create-pr --base develop --issue 401 (base pre-supplied — no prompt). One commit `c7c13fce` (23 files, all in scope — leak check OK). PR created: https://github.com/Gamaroff/agent-skills/pull/402. Issue #401 in-review comment: posted. Post-PR state check: PR #402 state = OPEN, head c7c13fce. GitHub board: in-review → stage-disabled (correct — this board's ladder does not map in-review). Lock pr_url updated.
- Step 5: QA cycle counter = 1 (limit 5). GitHub board: QA-start re-assert → stage-disabled (in-review not mapped on this board). Traceability mapper skipped: HAS_SUCCESS_CRITERIA_TABLE=false (§9 Success Criteria is a numbered list, not a table). Invoking /qa-task with code_review_blocking=true (standard mode).
- Step 7: /finalise invoked (this branch's own SKILL.md — first run through the publish boundary it introduces). Four DoD Explore subagents dispatched in parallel: AC (SC1–SC4 PASS with code + per-PR test citations; SC5 NOT_APPLICABLE deferred-by-design; pr_review_decision null — 5c advisory APPROVE stands in), Security (PASS; boundary true; 113 probes executed; 6 low reproduced evasions of advisory predicates → follow-up), Compliance (NOT_APPLICABLE all areas), Docs (PASS; CHANGELOG cites (task 115) ×2; bundle check 0 problems; catalog not required). Decision: ACCEPTED.
- Step 7: DoD summary — `task.115.dod.1.finalise-publish-time-checks.md` (header carries no status line; `**Final Status:** ✅ ACCEPTED` is its one status line; Artifacts Generated lists post-boundary outcomes as ⏳ by necessity — obs #81).
- Step 7: **CI reading 1: SUCCESS @ 0f3ca4e1af1e** (decision, 5/5) · **CI reading 2: SUCCESS @ 7d2c4fb177f5** (pushed acceptance head; background poll wrote the result after 90 s; sampled head == pushed head).
- Step 7: frontmatter `status: accepted`, `completed_date`, `pr_number: 402`; body `**Status:** Accepted` (both locations); Change Log row 1.2 `DoD passed — accepted (PR #402)`; registry-tick.js → `ticked` (line 157); DoD PASSED section added; sprint-review-summary.md written.
- Step 7: publish boundary — 6a `git add` exit 0 ×2, commit `7d2c4fb1` ("docs(task.115): accept — DoD, sprint review; registry ticked"), push exit 0; 6b: document, DoD summary, sprint review all tracked and on origin; pushed document reads `status: accepted`; 6c: PR head 7d2c4fb1 == pushed head; poll backgrounded (pid file written), later-turn read → SUCCESS; 6d: (task 115) cited under [Unreleased] ✓.
- Step 7: DoD body posted to PR — the canonical summary comment carries both readings: https://github.com/Gamaroff/agent-skills/pull/402#issuecomment-5651295160
- Step 7: GitHub Issue #401 — Document link re-pointed to develop; tracker-comment.js --stage done: posted; tracker-issue.js close: performed; state = CLOSED.
- Step 7: GitHub Issue #401 — board: done → already (GitHub's close automation moved the card first).
- Step 7: Task completed. Accept gap: journal empty → **Tracker debt: none**.
- Step 1: implementation report stashed before branch creation, restored after. Branch `feature/task.115.finalise-publish-time-checks` ← `develop` (fe3f045b). Work-started tracker signal skipped — no issue linked yet (Step 2 creates it).

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-09-13

**QA Review**: CONCERNS (80/100) — `task.115.qa.1.finalise-publish-time-checks.md` / `task.115.gate.1.finalise-publish-time-checks.yml`
**Findings**: 0 HIGH · 2 MEDIUM (CR-1 `skills/finalise/SKILL.md` 6d `BASH_REMATCH` empty under zsh; CR-2 6c foreground `sleep` poll to 1500s) · 2 LOW (registry-ticked suffix keyed on existence; drift test merge-commit assumption)
**Step 4b**: fired — 28 blocks, 0/3/25 runnable/placeholder/mutating (develop baseline 2/22, same structural finding); 4 new blocks `bash -n`/`zsh -n` clean; 6d regex executed in both shells → CR-1
**Code review (3b)**: in-line by the QA pass (no independent subagent — stated in the report); 2 bugs promoted via code_review_blocking
**PR comment**: https://github.com/Gamaroff/agent-skills/pull/402#issuecomment-5651056796 · issue #401 qa-gate comment: posted
**Convergence check**: n/a (cycle 1) · **Diminishing-returns exit**: n/a (cycle < 3) → **5b /qa-fix**
**changes-requested**: stage-disabled (not mapped on this board) · **Third-strike check**: n/a (no HIGH entries)
**Fixes Applied**: CR-1 — 6d `N=${STEM#task.}` + capture-free numeric guard (verified bash + zsh); CR-2 — 6c poll written to `.claude/state/finalise-ci-poll.sh` (column-0 heredoc), `nohup … &`, result read on a later turn; LOW — `; registry ticked` keyed on staged diff, own line; drift-test header states the merge-commit assumption. Shape test +2 assertions (comment-stripped fenced code), mutation-proved 3 ways.
**Fast gate (0a)**: ci:fast GATE_EXIT=0 — 3251 tests, 3250 pass; prettier clean
**Commit**: `d976a244` (fix + gate 1 + QA report 1; implementation report deferred) · pushed once
**qa-fix PR comment**: https://github.com/Gamaroff/agent-skills/pull/402#issuecomment-5651084302 · issue #401 qa-fix comment: posted
**PR Review**: — (5c not reached this cycle)

### QA Cycle 2 — 2026-09-13

**QA Review**: PASS (95/100) — `task.115.qa.2.finalise-publish-time-checks.md` / `task.115.gate.2.finalise-publish-time-checks.yml` — refute pass, whole-branch diff; SAFETY_REPROBE=false
**Re-Review Context**: CR-1 FIXED (6d executed under bash + zsh: cited silent / uncited warns / story skips); CR-2 FIXED (poll script written by column-0 heredoc, parses, `nohup … &`, later-turn read with head check); both LOWs fixed. Mutation-proofs re-run by QA: 3/3 red.
**New findings**: 1 LOW (unsubstituted `rollup()` placeholder waits MAX_WAIT before HALT) — documented, not gated
**Step 4b**: 28 blocks, 0/4/25; 5 new blocks bash -n / zsh -n clean · **Tests**: 99 targeted + ci:fast 3251/3250/0
**PR comment**: https://github.com/Gamaroff/agent-skills/pull/402#issuecomment-5651097460 · issue #401 qa-gate comment: `already` (per-stage marker dedupes the second cycle — observation logged)
**Path 1 commit**: `ba11efc1` (gate 2 + QA report 2 + task doc; implementation report deferred) · pushed once · 5c tracked-and-pushed assertion: both artefacts on origin
**PR Review (5c)**: `/review-pr --effort medium --comment` — both lenses dispatched as independent Explore subagents (code: 20 tool uses / 4m44s; conformance: 13 / 2m16s). Verdict per the deterministic table: **CONCERNS** — CR-1 medium/high (the new dirty-document HALT false-fires on every Jira project: `sync-jira-task` rewrites `jira_last_*` after the 6a commit — verified at sync-jira-task.js:313–356, 1007), CR-2 medium/high (6a's unconditional `git commit` reports nothing-to-commit as a rejection on re-run), CR-3 medium/medium (6c writes under `.claude/state/` without `mkdir -p`; later-turn read never HALTs), CR-4 low/high (suppression regex misses `|| :` at EOL — verified), CR-5 low cleanup (redundant alternative; case mismatch vs drift test — one `Task N` citation exists), PC-1 low consistency (Files Summary row stale: 9/6 vs 11/9). Report: `task.115.pr-review.1.finalise-publish-time-checks.md`; PR comment https://github.com/Gamaroff/agent-skills/pull/402#issuecomment-5651132199. CI on `ba11efc1`: SUCCESS 5/5.
**Orchestrator decision**: the table says CONCERNS (do not block) — this run **routes to 5b anyway** (autonomous: recommended option), because CR-1 as written breaks `/finalise` for every Jira consumer and one fix cycle is cheaper than the bug report; lens ratings kept as emitted. Cycle budget: this consumes cycle 3 of 5.
**5b (review-driven, cycle 3)**: `/qa-fix gate=…gate.2… pr_review=…pr-review.1…` — findings taken from the pr-review report (gate 2 top_issues empty: not the work). Fixes: CR-1 Jira `jira_last_{synced_at,body_hash,meta_hash}` residue exempted in step-7 + step-8 docs with a mechanical check (exercised: residue-only clean / status-changed HALT / stray-DoD HALT); CR-2 `git diff --cached --quiet` guard inside 6a; CR-3 `mkdir -p .claude/state`, pid file, `kill -0` liveness in the later-turn read; CR-4 regex `(true\b|:(?=[\s;)&|]|$))`; CR-5 `grep -qiE "\btask[ .]${N}\b"`; PC-1 Files Summary row. Shape test +3 assertions (14 total), mutation-proved 5 ways (exemption dropped, guard removed, mkdir dropped, kill -0 dropped, `|| :` injected → each red). Fast gate: 3254/3253/0, prettier clean. Bundle in sync.
**Commit**: `88c372dc` (fix + pr-review.1 report; implementation report deferred) — **not pushed**: cycle 3's push is spent at the next path-1 transition before 5c (one-push-per-cycle). qa-fix PR comment: https://github.com/Gamaroff/agent-skills/pull/402#issuecomment-5651157776 · issue #401: `already` (obs #80).

### QA Cycle 3 — 2026-09-13

**QA Review**: PASS (95/100) — `task.115.qa.3.finalise-publish-time-checks.md` / `task.115.gate.3.finalise-publish-time-checks.yml` — scope: files changed since gate 2; SAFETY_REPROBE=false
**Re-Review Context**: all six 5c findings FIXED (CR-1 exercised in a scratch repo; CR-2/3 parsed under bash + zsh; CR-4 regex probed; CR-5 both shells; PC-1) · 3 new assertions, 5/5 mutants caught · **New findings**: none · Tests: 102 targeted + ci:fast 3254/3253/0 · 4b: finalise 28 blocks 0/3/26, step-7 doc 11 blocks 0/2/9, 0 non-ok
**PR comment**: https://github.com/Gamaroff/agent-skills/pull/402#issuecomment-5651165473 · issue #401: `already` (obs #80)
**Path 1 commit**: `01ace56a` (gate 3 + QA report 3 + task doc) · pushed once (carries `88c372dc`) · 5c tracked-and-pushed assertion: both artefacts on origin
**PR Review (5c, pass 2)**: both lenses re-dispatched as Explore subagents (code 16 tool uses / 4m30s; conformance 15 / 2m28s). Pass-1 findings all confirmed fixed. New: CR-1 medium/high — 6a's `git add` has no exit check, so a failed add (bash 128 / zsh glob refusal, both verified in a scratch repo) presents as the guard's benign "already committed" path; CR-2 low/high — residue check's header filter drops `+- bullet` lines (verified); CR-3 low/medium — `git diff` vs `git diff HEAD` misses staged-only changes (verified 0 vs 7 lines); CR-4 low/medium — later-turn head check unset in a fresh shell / poll echoes its argument; PC-1..3 low — tree-derived counts in §7, §8 and the CHANGELOG entry drifted. Verdict per table: **CONCERNS**. Report `task.115.pr-review.2.*`; marker comment updated in place (ID 5651132199).
**Orchestrator decision**: route to 5b once more (cycle 4 of 5) — CR-1 inverts a safety check in the deliverable; fixes small and verified. Recorded that pass 1's CR-2 fix introduced pass 2's CR-1 (the qa-fix Step 3.5 class: a fix is new code).
**5b (review-driven, cycle 4)**: `/qa-fix gate=…gate.3… pr_review=…pr-review.2…`. Fixes: CR-1 both `git add` sites exit-checked before the guard (verified: bash 128 / zsh 1 both HALT); CR-2/3 residue check `git diff HEAD` + header-only filter (exercised: residue-only clean, bullet-only HALT, staged-only status HALT); CR-4 poll writes `sampled_head` from `gh pr view`, later turn re-derives `CI_HEAD_2`; PC-1..3 counts removed from §7/§8/CHANGELOG. Shape test +3 (17 total), 5/5 mutants caught. Fast gate 3257/3256/0. Bundle in sync.
**Commit**: `3b0d0d29` (fix + pr-review.2 report; implementation report deferred) — not pushed (path 1 pushes before the next 5c). qa-fix PR comment: https://github.com/Gamaroff/agent-skills/pull/402#issuecomment-5651212759 · issue #401: `already` (obs #80).

### QA Cycle 4 — 2026-09-13

**QA Review**: PASS (95/100) — `task.115.qa.4.*` / `task.115.gate.4.*` — scope: files changed since gate 3; SAFETY_REPROBE=false. All seven pass-2 findings FIXED (CR-1 add-failure path run under bash + zsh; CR-2/3 residue check exercised on three cases; CR-4 by inspection; PC-1..3) · 3 new assertions, 5/5 mutants caught · New findings: none · 105 targeted + ci:fast 3257/3256/0 · 4b: 29 + 11 blocks, 0 non-ok
**PR comment**: https://github.com/Gamaroff/agent-skills/pull/402#issuecomment-5651218905 · issue #401: not re-posted (`already`, obs #80)
**Path 1 commit**: `03c8f3c7` (gate 4 + QA report 4 + task doc) · pushed once (carries `3b0d0d29`) · 5c tracked-and-pushed assertion: both on origin
**PR Review (5c, pass 3)**: both lenses re-dispatched (code 9 tool uses / 3m15s; conformance 11 / 2m40s). Pass-2 fixes confirmed holding by execution. New: 4 LOW — CR-1 low/high residue header filter also drops `-- `/`++ ` body lines (verified; positional `sed '1,/^@@/d'` fixes it); CR-2 dead `EXPECTED_HEAD` arg; CR-3 first 6c block lacks the `CI_HEAD_2` re-derivation (spurious HALT in a fresh shell); PC-1 Key Findings sentence counts only pass 1. Verdict per table: **APPROVE** — loop exits to Step 7; the four LOWs are recorded in `task.115.pr-review.3.*` for the follow-up (with the `rollup()` placeholder and the `(bug N)` backfill). Marker comment updated in place. `ready-for-merge` → stage-disabled (not mapped on this board). Report committed (`0f3ca4e1`) and pushed.

---

## Completion

**Finished**: 2026-09-13 07:08
**Final Status**: Completed
**Branch**: `feature/task.115.finalise-publish-time-checks`
**PR**: https://github.com/Gamaroff/agent-skills/pull/402
**QA Iterations**: 4 QA cycles (CONCERNS 80 → PASS 95 ×3), 3 qa-fix cycles (1 gate-driven, 2 review-driven), 3 × 5c passes (CONCERNS, CONCERNS, APPROVE)
**DoD Summary**: docs/tasks/task.115.finalise-publish-time-checks/task.115.dod.1.finalise-publish-time-checks.md
**Tracker debt**: none

**Completion Summary**: Implemented `/finalise`'s publish boundary — the acceptance artefacts are committed and pushed inside Step 7 (6a), asserted tracked-and-on-origin (6b), CI is read a second time on that head with a backgrounded, head-bound poll (6c), and the CHANGELOG citation is checked (6d) — all before the PR comment, tracker comment, issue close and board move; the DoD running summary carries its status once; Step 8 commits the implementation report only; 5c asserts the gate and QA report are on the branch; the CHANGELOG box gained a citation convention, a CI-failing drift test with a non-vacuity floor, and an advisory owner with the blocking flip carried as a release-checklist line. Four QA cycles and three 5c passes closed 13 findings (two consumer-breaking on Jira/zsh, found by executing the prose), every shape assertion mutation-proved. This run was the first through the boundary it introduces: CI reading 1 SUCCESS @ 0f3ca4e1, reading 2 SUCCESS @ 7d2c4fb1. Follow-up (LOW): 5c pass-3 CR-1..3/PC-1, six security-probe evasions, `rollup()` fail-fast, `(bug 13)`/`(bug 15)` backfill, obs #80/#81.
