# Implementation Report: Four authoring rules the corpus already obeys by accident

**Task**: `task.119.create-skill-authoring-guards.md`
**Run Number**: 1
**Started**: 2026-09-17 (see git log for exact time)
**Status**: Completed

---

## Summary

First automated run of task.119: a guard test for positional-parameter tokens in fenced bash, a bundler warning + guard for comment-only `shared/resources/` origins, three authoring rules in `create-skill`, and a "One task or several?" step in `create-task`.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | low                                                                        |
| Pipeline mode       | standard (risk_ok=true, phase_count=4 ≥ 3, single_module=false)            |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Tracker Issue       | #419 (GitHub)                                                              |
| Board status        | In Progress ✅ (Todo → In Progress, verified; Priority already P2)         |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.119.*` exists in git                              | Branch pre-existed on develop's tip `f8c4ce5c`; pushed + tracking set this run | — |
| 2. review-task             | ✅ Done    | `task.119.review.{N}.{name}.md` exists (or skip logged)                | **Skipped** — status `Ready for Development` + `review.1` exists (fixes applied 2026-09-17) | — |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 1 iteration; 8/9 phases (close-out post-PR); ci:fast green 3409/0; bundle --check clean | — |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #420: https://github.com/Gamaroff/agent-skills/pull/420 — 4 commits; in-review comment posted; board stage-disabled | — |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.119.qa.{N}.*.md`; `task.119.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 3 cycles: CONCERNS→fix, CONCERNS (refute)→fix, PASS 100; 5c APPROVE (5 low) | — |
| 7. finalise                | ✅ Done    | `task.119.dod.{N}.*.md`; task `status: accepted`                       | ACCEPTED; dod.1 + sprint review; CI 1 SUCCESS @ 9dfc8586, CI 2 SUCCESS @ 01628e12; PR canonical comment; #419 closed; board Done | — |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | Committed in `e9634f7b`, pushed; PR #420 | — |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-17

- Input `119` resolved as task id (branch `feature/task.119.*` already checked out; `docs/tasks/task.119.create-skill-authoring-guards/` exists) rather than GitHub issue #119.
- Phase 0 fan-out run inline rather than via Explore subagents (resolver not needed — path known; tracker poll = `gh issue view 419` → OPEN, board `Todo`; lite-mode inputs read from the document: `risk_level: low`, 4 phases, multi-module). Reason: Explore subagents have hung repeatedly in this repo; inline reads are deterministic.
- PIPELINE_MODE = standard — risk_ok=true, phase_count=4 (not < 3), single_module=false (create-skill, create-task, qa-task, bundler, tests).
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md (all exist).
- Prior run detected (branch + uncommitted `review.1`, no report): user chose **Resume on existing branch**.
- Q1 Feature branch base: develop — branch already sits on develop's tip (f8c4ce5c).
- Q2 PR target branch: develop — standard Gitflow.
- qa-planning gate: skipped (auto — no prompt).
- Step 1: existing branch reused (user decision); `git push -u` set tracking. Lock written (`current_step: 2`). Tracker: work-started comment posted (#419, reason `posted`); board Todo → In Progress (verified).
- Step 2: skipped per gate table (`Ready for Development` + review report present — status itself asserts a completed review). Review.1 outcome: NEEDS REVISION → all fixes applied → promoted.
- Pre-develop surface map: 12 files identified in create-skill / create-task / qa-task / bundler / tests — performed **inline** (no Explore dispatch; independent review did not run — the task's §7 Files Summary already enumerates every target, and Explore subagents have hung in this repo). Files: `tests/fenced-bash-positional-params.test.js` (new), `tests/bundle-comment-origin.test.js` (new), `tests/bundle-check-mode.test.js` (shape: JS driving Python via child_process), `skills/create-skill/SKILL.md` (§Signal Design Principle L133, §Step 5 Packaging L261), `skills/create-skill/scripts/bundle_skill.py` (`SHARED_REF_RE` L35, applied L146), `shared/resources/qa-execute-snippets.mjs` (`zshAvailable()` L1328), `skills/qa-task/SKILL.md` (Step 4b L581), `skills/create-task/SKILL.md` (§1 L161 → §1.5 L178), `docs/architecture/concepts/coding-standards.md` (§Cross-skill resources L35), `docs/tasks/task-registry.md` (notes rows 51–58, 62–64, 93–95), `CHANGELOG.md`, `package.json` (`tests/*.test.js` glob — verify, no edit).
- Plan file found: docs/tasks/task.119.create-skill-authoring-guards/task.119.plan.create-skill-authoring-guards.md — included as implementation context for /develop.
- Fast gate: `develop.fastGateCommand` unset → fallback `npm run ci:fast`; script exists (precondition passed).
- Step 3 Phase 0 (probes, Claude Code 2.1.274): only the invoked SKILL.md is rendered (Read-loaded reference verbatim); substitution zero-indexed, tokens past arg count untouched; `\$N` survives delivery but breaks on-disk awk; `${N}` / `$(N)` / `${BASH_SOURCE[0]}` untouched → guard scope `skills/*/SKILL.md`, lookbehind kept, rewrites use braced/paren forms.
- Step 3: 22 hits / 12 files / 478 blocks rewritten (equivalence verified under bash + zsh; qa-execute-snippets before/after identical — every hit block is classified mutating/placeholder and skipped by the executor, so the direct equivalence check is the evidence). Guard allowlist empty.
- Step 3: comment-origin guard scope widened from "shared/resources/*.js" to exactly what the bundler reads (shared/resources/** + skills/** minus references/); self-references excluded by rule (bundler + test) rather than allowlisted; 12 live hits resolved with zero allowlist entries; `bundle-dependency:` declaration form introduced for defer-mutation.js's two deliberate runtime dependencies.
- Step 3: create-skill rule 1 written without literal tokens (the file is rendered on invocation); the token table lives in Read-loaded `references/runnable-prose.md`.
- Step 3: loop audit performed inline (checkbox count + status + last commit) — no Explore dispatch. Status Ready for Review → loop exit. Close-out phase (observations → actioned naming PR) deferred to after Step 4 because it needs the PR number.
- Development completion comment posted to github issue 419.
- Step 4: SCOPE_PATHS = docs/tasks/task.119.create-skill-authoring-guards, docs/architecture, shared, skills, tests, CHANGELOG.md; no out-of-scope untracked files (nothing held). Four logical commits (560e67d0 guard+rewrites; 763db765 bundler+comment guard; a01a9447 rules; ec81234f task docs+report). PR body written inline (no Explore dispatch — full diff context already in hand). Leak check: all committed paths in scope.
- Step 4: PR #420 opened → in-review comment `posted`; post-PR state check: OPEN, 0 errors (inline `gh pr view`); GitHub board in-review → `stage-disabled`.
- Step 4 (deferred close-out): observations #23, #24, #36, #39 set to `actioned` naming PR #420; task Close-out box ticked; task doc PR link added.
- Step 5 setup: QA cycle counter = 1 (limit 5). GitHub board QA-start re-assert → stage-disabled. Traceability mapper skipped: HAS_SUCCESS_CRITERIA_TABLE=false (§9 Success Criteria is a numbered list, not a table). Invoking /qa-task with code_review_blocking=true (standard mode).
- Step 5a cycle 1: Step 3b reviewer dispatched 17:56 → returned 18:00 (3 findings; 1 bug promoted to gate under code_review_blocking). Step 4b fired over 15 SKILL.md files — every edited block is awk, refused fail-closed by the executor; equivalence evidence is direct bash+zsh execution. boundary: false (no security-sink accept/reject function). Gate CONCERNS 90 with one open entry → Convergence check n/a (cycle 1), Diminishing-returns n/a → 5b. QA PR comment + issue comment posted.
- QA Cycle 1 — changes-requested: stage-disabled. qa-fix findings ingest performed inline (the gate and report were authored this cycle and their one open entry was already in hand — no Explore dispatch). Fix-summary comments posted (PR + issue 419). Post-fix PR state: OPEN (inline `gh pr view`). Cycle counter → 2.
- Step 5a cycle 2: refute pass over the whole-branch diff, reviewer `dispatched 18:12 → returned 18:19`. SAFETY_REPROBE=false (security OK reasoned). Step 4b not applicable this cycle (no runnable prose changed since gate 1). Gate CONCERNS 90, one open entry → Convergence check n/a (cycle 2) → 5b.
- QA Cycle 2 — changes-requested: stage-disabled. Fix ingest inline (findings authored this cycle). Post-fix PR state: OPEN. Cycle counter → 3.
- Step 5a cycle 3: narrowed scope (files since gate 2), reviewer `dispatched 18:28 → returned 18:31`. Convergence check: HIGH sequence [0,0,0] — not tripped. Diminishing-returns exit: not evaluated — gate has no open entry (clean gate leaves via route 1). Gate 3 + report committed before 5c; one push for the cycle.
- Step 5c: `/review-pr --effort medium --comment` — both lenses dispatched 18:36, returned 18:39/18:40. Verdict APPROVE (5 low findings). PR review comment posted (marker-idempotent). Acted on the review's first recommended action before Step 7: PC-1/PC-2/PC-3 are three text reconciliations of the task doc and guard header with the shipped guard, committed with the review report as `9dfc8586`. CR-1 (bundler comment classifier misses `code; // shared/resources/x` and asterisk-less `/* */` interiors) and CR-2 (the guard's JS re-implementation of `comment_only_refs` is never checked against the Python) are follow-ups, not in this PR.
- Step 5c: `ready-for-merge` → stage-disabled. Loop exit → Step 7.
- Step 7: four DoD agents dispatched in parallel (AC, security, compliance, docs) — all returned (~19s–56s): AC 5/5 PASS (both guards run per-PR via the `tests/*.test.js` glob), security PASS with `boundary: false`, compliance NOT_APPLICABLE, docs PASS (catalog current — no `description` changed). QA gate PASS 100; 5c APPROVE; no human review required on this repo (`reviewDecision` empty). CI reading 1: SUCCESS @ `9dfc8586a295` (test job was IN_PROGRESS at first sample; waited via background poll). Decision: ACCEPTED.
- Step 7: frontmatter `status: accepted`, `completed_date: 2026-09-17`, `pr_number: 420`; Change Log row 1.2; registry-tick → `ticked`; DoD section + sprint-review-summary written. Acceptance commit `01628e12` pushed; document, DoD, sprint review and registry asserted tracked and on origin; pushed doc reads `status: accepted`; PR head == pushed head. CHANGELOG cites (task 119). CI reading 2: background poll on `01628e12` — result recorded below once read.
- Step 7: CI reading 2: SUCCESS @ `01628e12d5af` after 90s (background poll; PR head == pushed head). Canonical PR comment posted (marker). Document link on issue #419 already on `develop`. `done` comment posted; issue closed (`performed`, state CLOSED); board `done` → `already` (column reads Done). Task completed.
- Task status at start: `ready-for-development` (review.1 recommendations applied 2026-09-17).

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- Step 5b cycle 2: `tracker-comment.js --stage qa-fix` also returned `already` (the qa-fix skill passes the unscoped stage `qa-fix`, while the orchestrator's own 4a template uses `qa-fix-{N}` — the two disagree; observation candidate).
- Step 5a cycle 2: `tracker-comment.js --stage qa-gate` returned `already` — the stage marker is not cycle-scoped, so the cycle-2 verdict did not reach issue #419 (the PR carries every cycle's comment). Per the contract `already` needs nothing; noted as an engine limitation.

- Step 3: the Skill tool did not discover the throwaway probe skills until the next Bash call ran (discovery lag); `probe-render-b` re-invoked served a cached copy, so the braced-form probe ran as `probe-render-c`. Probes deleted after use.
- Step 3: `npm run bundle` rewrote two `shared/resources/…` mentions in the new create-skill prose in place and vendored `qa-execute-snippets.mjs` + `tracker-card-summary.md` into `create-skill/references/` — the exact mechanism rule 3 describes, in `.md` where it is by design. Prose reworded to bare filenames; vendored copies removed.
- Step 3: `ci:fast` failed once on Prettier (new tests unformatted) and once on the tracked-tree link test (`references/runnable-prose.md` untracked) — formatted and staged; green on the third run.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-09-17
**Gate Result**: CONCERNS
**Issues Found**: 1 medium (CR-1: `runnableLines()` fence parser loses state on a nested fence inside a ```markdown template — 4 skills under-scanned), 2 low advisory (CR-2 docstring scope claim; CR-3 duplicate warnings under `--all`)
**HIGH findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)
**Fixes Applied**: CR-1 stack-based fence tracking in `runnableLines()` + nested fixtures + §5 naive-opener parity (485 blocks, was 477; mutation-proved); CR-2 docstring as deliberate superset + `references/` skipped at any depth; CR-3 `_WARNED_COMMENT_ORIGINS` dedupe. ci:fast 3410/0.
**Commit**: `82451576` (pushed; PR + issue commented)

### QA Cycle 2 — 2026-09-17
**Gate Result**: CONCERNS
**Issues Found**: 1 medium (CR-4: §5 parity test tautological — counts pushes, not scanned lines), 2 advisory (CR-5 info-string fence inside a runnable heredoc; CR-6 orphaned vendored copy `develop-next/references/document-status-lifecycle.md`). Cycle-1 CR-1/2/3 verified FIXED.
**HIGH findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)
**Fixes Applied**: CR-4 §5 rewritten as a per-opener line-level coverage assertion (mutation: original CommonMark reader → §5 red naming `create-epics-from-shards:357/:364`; note a pop-removed reader over-scans and is caught by §2/§4, not §5); CR-5 fence-shaped lines inside a runnable block are content + heredoc fixture (mutation reds §4); CR-6 orphaned `develop-next/references/document-status-lifecycle.md` removed. ci:fast 3410/0.
**Commit**: `3159b44b` (pushed; PR commented; issue comment `already` — see Issues Log)

### QA Cycle 3 — 2026-09-17
**Gate Result**: PASS
**Issues Found**: none gating; 3 advisory (§5 opener regex `\b` vs `runnableLines()` tokeniser — latent, no live instance; task doc §5 wording/478 count stale; guard header file count 100 vs 128). CR-4/5/6 verified FIXED.
**HIGH findings**: 0
**PR Review**: APPROVE — `task.119.pr-review.1.create-skill-authoring-guards.md`; 5 low findings (PC-1/2/3 doc drift — reconciled in `9dfc8586`; CR-1 comment classifier misses trailing/block-interior comments and CR-2 JS/Python reader parity — follow-ups)
**Loop exit**: n/a — this exit not taken (route 1: PASS with no open entry)
**Action**: Proceeding to 5c (PR conformance review)

---

## Completion

**Finished**: 2026-09-17 21:36
**Final Status**: Completed
**Branch**: feature/task.119.create-skill-authoring-guards
**PR**: https://github.com/Gamaroff/agent-skills/pull/420
**QA Iterations**: 3 (CONCERNS → fix; CONCERNS refute → fix; PASS 100) + 5c APPROVE
**DoD Summary**: docs/tasks/task.119.create-skill-authoring-guards/task.119.dod.1.create-skill-authoring-guards.md
**Tracker debt**: none — `access.tracker: full`; every mutation performed (work-started, in-review, qa-gate ×1 marked, qa-fix ×1 marked, done; issue closed; board Done)

### Completion Summary

Implemented the four authoring rules and two guards task.119 asked for. Phase 0 settled the harness mechanism with three throwaway skills before any guard was written (only the invoked `SKILL.md` is rendered; substitution is zero-indexed and leaves tokens past the argument count alone; `\$N` is delivery-safe but disk-unsafe in awk; `${N}` / `$(N)` are safe everywhere), and the guard's scope and regex came from that evidence. `tests/fenced-bash-positional-params.test.js` scans every `skills/*/SKILL.md` (485 blocks, floor 50, reason-checked allowlist — empty); the 22 shipped hits in 12 files were rewritten to equivalent token-free forms verified under bash and zsh. `bundle_skill.py` warns on a `shared/resources/` path that lives only in a `.js` comment and accepts an explicit `// bundle-dependency:` declaration; `tests/bundle-comment-origin.test.js` proves the warning fires and that the live tree has no undeclared origin (12 sites resolved, bundle graph unchanged, one orphaned vendored copy removed). `create-skill` states the three rules token-free with the literal table in a Read-loaded reference; `qa-task` 4b states its from-disk limit; `create-task` gains §1.2 "One task or several?". Observations #23/#24/#36/#39 actioned naming PR #420.

QA took three cycles, each of which found something real: cycle 1 a fence-state loss on nested template fences (fixed with a stack reader), cycle 2 — the refute pass — that the new parity test could not fail (fixed with a per-opener line-level assertion, mutation-proved against the original reader) plus a heredoc edge and an orphaned copy, cycle 3 clean with three advisory items. 5c `/review-pr` returned APPROVE with five low findings; the three documentation reconciliations were applied before finalise read the trail, and two (comment classifier blind spot for trailing/block-interior comments; JS/Python reader parity) are recorded as follow-ups. Notable decisions: Phase 0 probes and loop audits performed inline rather than by Explore dispatch where the answer was a deterministic read; the `bundle-dependency:` declaration form introduced so a runtime-loaded dependency can be declared in a comment without the warning treating it as an accident; self-references excluded by rule rather than allowlisted. Two engine limitations surfaced for observation: the `qa-gate` and `qa-fix` tracker-comment stages are not cycle-scoped (cycles 2–3 returned `already`), and 12 skills carry bundled copies no discovery rule reaches.
