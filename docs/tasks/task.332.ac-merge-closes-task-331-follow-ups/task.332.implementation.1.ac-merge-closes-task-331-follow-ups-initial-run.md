# Implementation Report: The AC merge closes task 331's follow-ups

**Task**: `task.332.ac-merge-closes-task-331-follow-ups.md`
**Run Number**: 1
**Started**: 2026-11-27 19:36
**Status**: Completed
**Report format**: 2

---

## Summary

First run: make `finalise-rerun-scope.js merge` require `--doc` and a named `story_file`, key the scope and extract state files by work item, and split task 331's refusals by cause.

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
| Tracker Issue       | #963 (GitHub) — created by review-task at Step 2                           |
| Board status        | work-started → transitioned ✅                                              |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.332.*` exists in git                             | Branch created at `12baef381`; pushed with upstream | —                    | 2026-11-27T19:37Z |
| 2. review-task             | ✅ Done | `task.332.review.{N}.{name}.md` exists (or skip logged)               | `task.332.review.1.ac-merge-closes-task-331-follow-ups.md` — READY TO IMPLEMENT 9/10; Planned → Ready for Development | —                    | 2026-11-27T19:46Z |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | Inline, 1 iteration; 12/12 phases; 7 mutations proved; test:remote 8,972/8,976 (1 load-only timing failure, green alone) | `.summaries/step-3-iteration-audit-1.json` | 2026-11-27T22:04Z |
| 4. create-pr               | ✅ Done | PR URL; issue comment posted                                           | PR #964: https://github.com/Gamaroff/agent-skills/pull/964 | —                    | 2026-11-27T22:07Z |
| 5–6. qa-task / qa-fix loop | ✅ Done | `task.332.qa.{N}.*.md`; `task.332.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted | 3 cycles: CONCERNS 70 → CONCERNS 90 → PASS 100; 5c /review-pr APPROVE | —                    | 2026-11-28T00:08Z |
| 7. finalise                | ✅ Done | `task.332.dod.{N}.*.md`; task `status: accepted`                      | `task.332.dod.1` ACCEPTED; acceptance commit `ac7d529e0`; issue #963 closed | —                    | 2026-11-28T00:29Z |
| 8. commit-changes          | ✅ Done | All artifacts committed and pushed                                     | Implementation report only | —                    | 2026-11-28T00:29Z |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-27

- Feature branch base: develop — source: asked (Q1, Recommended taken)
- PR target branch: develop — source: asked (Q2, Recommended taken)
- Mode: standard — source: detector
- Skips: none
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 run inline (no 0a-parallel fan-out): the document path was given directly; lite-mode inputs derived from the document — risk_level low, phase_count 4, single_module false (engine, SKILL.md, eval test, CHANGELOG) → standard.
- Task status `planned` at start — Step 2 (`/review-task`) validates and promotes it.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Tracker: GitHub, no `github_issue` in frontmatter — tracker steps skipped.
- AskUserQuestion asked 2 questions (Q1, Q2), matching `questions[]`.
- Branch: `feature/task.332.ac-merge-closes-task-331-follow-ups` from `develop` (`12baef381`). Implementation report stashed before branch creation, restored after.
- Work-started signal skipped at Step 1: no tracker issue linked.

### Step 2 — review-task

- review-task invoked: output Comprehensive report (pipeline default); Step 8.5 auto-answered "Yes, apply all critical + important fixes"; Step 9 auto-answered "Yes, fixes complete".
- Pre-pass B: aligned (axes: What this repo produces, Cross-skill resources, File naming, Status lifecycle, Validation before commit, Do not), 1 low finding. Pre-pass C: not-implemented.
- Tracker sync: the user chose "Sync to GitHub" → issue #963 created by ensure-task-github-issue, on the board (P2, 8h).
- Review report: `docs/tasks/task.332.ac-merge-closes-task-331-follow-ups/task.332.review.1.ac-merge-closes-task-331-follow-ups.md` — READY TO IMPLEMENT, 9/10, 0 critical / 2 important (both fixed) / 2 optional.
- Fix applied: the new document checks run only on a result with an `acs` list, because `parseYamlSubset` returns `{}` (no throw) for the existing `result-unparseable` fixture at `finalise-rerun-scope.test.mjs:1885`.
- Planned promoted to Ready for Development by review-task.
- work-started re-fired at Step 2 — issue 963 created by the review; lock updated. Comment: posted; board: transitioned.
- Review outcome comment skipped — review-task reported posted (stage `review-task-1`, matching report 1).

### Step 3 — develop

- Pre-develop surface map: inline (no Explore fan-out). The review had already verified every anchor, and the plan names the 6 files (engine, unit test, SKILL.md, eval test, AC prompt, CHANGELOG).
- Plan file found: `task.332.plan.ac-merge-closes-task-331-follow-ups.md`, followed phase by phase.
- Step 3 inline — /develop not invoked: the session already held the review's anchor map, and a fresh /develop load would re-derive it. Independence lost: no separate develop-skill pass over the plan. QA (Step 5) and review-pr (5c) are the independent reads.
- Engine: one `readAnswer` predicate shared by `merge()` and the CLI's document checks, so `result-document-unnamed` fires only on a result with an `acs` list and `result-unparseable` stays reachable (the review's fix).
- Test order deviation: the engine change came before the new tests. The 8 existing tests it reversed went red first (66 pass / 8 fail). Each new test's red was then shown by its mutation, not by test-first.
- Mutation proofs (each reverted, and the suite then green again):

  | # | Mutation | Red test |
  | - | -------- | -------- |
  | 1 | `--doc` optional | merge with no --doc is a usage error |
  | 2 | `result-document-unnamed` removed | a result with no story_file is refused as result-document-unnamed |
  | 3 | root `story_file` fallback removed | a root story_file beside an ac_traceability block that lacks one is checked |
  | 4 | `scope-document-missing` → `-mismatch` | a scope with no document is scope-document-missing |
  | 5 | realpath branch removed | story_file naming the document through a symlink merges |
  | 6 | Step 3a scope path reverted | 10 eval cases (bash + zsh), incl. the stem-keyed scope test |
  | 7 | unnamed check on every parsed result | unparseable output writes no record |

- Eval fixtures: `AGENT_NAMED` (names this document) replaces the unnamed answer in the two merge-success cases; the "another document's result" case now creates `task.8.other` so it tests a real other document, not the new does-not-exist message.
- Local: 96/96 across the two task files; `bundle:check` 0 problems; `quick_validate` finalise ✓; prettier clean.
- CHANGELOG placement: `[Unreleased]` → `### Changed`, above task 331's entry. Step 3d checked first: it reads only Step 3c's outputs, so it needs no resume step.
- `test:remote` on .249 (`CI=true`), with the server loaded by a game: run 1 hit the 30-min limit at 8,135 ok / 0 not ok. Run 3 (90-min limit) finished 8,972 pass / 1 fail / 8,976 in 1,806 s. The failure was `call-sites.test.mjs:771` AC4 (2,876 ms vs a 2,000 ms bound), which flags itself LOAD-SENSITIVE. Re-run alone on the idle server with the runner's docker flags, 3 times: 32/32 each. Treated as load, not a defect.
- Loop audit (Explore, iteration 1): `ready-for-review`, 12/12, exit loop. Artifact `.summaries/step-3-iteration-audit-1.json`.
- Development completion comment posted to GitHub issue 963 (stage `develop-complete`, `count=12`).
- Run 2 was stopped by hand. Its lock (owner this laptop, pid 921814, dead, no container) was removed by hand, because `--unlock` would not clear it for about 60 min.

### Step 4 — create-pr

- SCOPE_PATHS: `docs/tasks/task.332.ac-merge-closes-task-331-follow-ups`, `CHANGELOG.md`, `evals/shared/tests`, `shared/resources`, `shared/resources/tests`, `skills/finalise/references`, `skills/finalise`, `skills/review-story/references`, `skills/review-task/references`.
- Pre-flight guard: 0 files held. Report links: 0 relative links, ok.
- create-pr: base pre-supplied (develop), `--issue 963`. Two commits: `74e517986` feat(finalise), `239beaaed` docs(task.332). Pushed.
- PR body written in-session, not by the diff-summariser Explore agent: the session held the full change context. Independence loss: none that matters, since the body is descriptive.
- PR #964: https://github.com/Gamaroff/agent-skills/pull/964 (one PR for the branch, checked).
- In-review comment on #963: posted. Leak check over both commits: OK. Held files: none.
- Post-PR state check (inline `gh pr view`, not the poller subagent): PR #964 state = OPEN. errors = 0.
- GitHub board: in-review → stage-disabled.

### Steps 5–6 — QA loop

- GitHub board: QA-start re-assert → stage-disabled.
- Traceability mapper skipped: HAS_SUCCESS_CRITERIA_TABLE false (§ 9 is checkbox lists, not a table; Phase 0 ran inline so the lock has no detector value).
- Record criteria: 1 listed (the mutation record, "recorded in the QA report"), state location-absent — expected before qa-task writes the report.
- QA Cycle 1 (qa-task inline): gate CONCERNS 70/100, 3 open MEDIUM. Code reviewer (Explore) returned 4 findings; anchors all ok; CR-1 and CR-2 reproduced by QA via the merge CLI in a scratch repo, so promoted. Security boundary internal (same decision as task 331 gate 4). CI pending at gate time. PR comment and `qa-gate-1` issue comment posted.
- QA Cycle 1 — changes-requested: disabled (stage-disabled).
- QA Cycle 2 (qa-task inline, refute pass over the whole branch diff): gate CONCERNS 90/100, 1 open MEDIUM. Reviewer returned 1 bug (medium confidence) and 1 cleanup; anchors ok; the bug reproduced by QA with a control in a scratch repo, so promoted (5d). Convergence: 3 → 1 findings, no repeat — converging; route 5b.
- QA Cycle 3: gate PASS 100/100; 5c `/review-pr --effort medium --comment --no-code` → APPROVE, report staged and carried into the acceptance commit.

### Step 7 — finalise

- `/finalise` invoked as a skill (push-held finalise-entry: nothing held). DoD run 1: AC PASS 8/8 (full scope, no prior record; AC YAML extracted, verified), security PASS (`boundary: internal`, `finalise-rerun-scope.js#main`), compliance NOT_APPLICABLE, docs PASS. Record criterion #5 confirmed; re-run at head not-configured.
- CI reading 1: SUCCESS @ 4b87a42c120d54a51af1553ad462d23c64f66e83; CI reading 2: SUCCESS (tree-equivalent to 4ccb29fcdbb3) @ ac7d529e0856a5e848d6b9b643280d406022ec27 over 6 checks after 30s.
- Acceptance commit `ac7d529e0` ("accept — DoD, sprint review; registry ticked; 5c review carried"), pushed; 6b assertions ok; 6d `cites (task 332)`.
- Publish boundary: after /finalise only this report was dirty ✅.
- Canonical summary comment: https://github.com/Gamaroff/agent-skills/pull/964#issuecomment-7230934691
- DoD body posted to PR — comment URL: https://github.com/Gamaroff/agent-skills/pull/964#issuecomment-7230946126
- Document link re-pointed to develop; `done` comment posted (orchestrator re-post answered `already`).
- Post-close state check (inline `gh issue view`, not the poller subagent): issue #963 state = CLOSED. errors = 0.
- GitHub Issue #963 — close: CLOSED ✅.
- GitHub Issue #963 — board: done → already.
- Task completed.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-11-27
**Gate Result**: CONCERNS
**Issues Found**: 3 open: T332-QA-1 (CHANGELOG cites "(task 332)" across a line break), T332-CR-1 (a nonexistent story_file shares result-document-mismatch and an uncleared remedy), T332-CR-2 (the result-document-unnamed remedy misses an agent-omitted story_file). CR-3 (pre-existing) and CR-4 (cleanup) routed to recommendations.future.
**HIGH findings**: 0
**MEDIUM findings**: 3
**Traceability**: skipped (no Success Criteria table)
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)

#### qa-fix (5b)
- Findings read inline from gate 1 (this session wrote it), not by the ingester subagent. Independence loss: none that matters, the gate is the source either way.
- T332-QA-1: CHANGELOG rewrapped so "(task 332)" sits on one line; `changelog-cites.sh` now `cites (task 332)`, rc 0 (it answered `missing` before). Claim narrowed to the scope, extract, result and merged files; rerun-at-head named as still DOD_N-keyed.
- T332-CR-1 / CR-2: the reason was kept, per the task's Target Architecture ("keeps the reason `result-document-mismatch` … The Step 3c arm needs no new branch"). The defect was the remedy, so both arms now add: "if the agent's own answer names a wrong or missing file / no story_file, re-run the AC agent (story_file must be exactly $DOC_PATH), then the extract". Prose under Step 3c says why.
- Tests: new blocks case (basename `story_file` → the arm names the re-run with the exact path), and the unnamed case asserts the agent re-run remedy. Blocks 18/18, unit 80/80.
- Mutation-proven: mismatch remedy reverted → 4 red (bash+zsh: the task-331 arm test and the new CR-1 case); unnamed remedy reverted → 2 red (bash+zsh unnamed case). Restored → green.
- Probe: population command, phrases "never merge it" (0: the only site was the edited arm, and it is gone), "hand-copy THIS item" (1: skills/finalise/SKILL.md — updated). Task doc §5 Breaking Change 2 (line 188) states the two old routes: unaffected — still true, and outside qa-fix's authorised sections. Population 1, move: patch.
- Bundle 0 problems, quick_validate ✓, prettier clean.
- Full `ci:fast` on .249: first run hit its 60-minute limit under load (6 failures, none in touched files); re-run green, 8975/8978, 0 fail. Commit `ce71df6aa`, pushed (push-policy: code changed). PR and `qa-fix-1` issue comments posted.

### QA Cycle 2 — 2026-11-28
**Gate Result**: CONCERNS
**Issues Found**: 1 open: T332-CR2-1 (after a successful extract, the hand-copy remedy in both Step 3c document arms is refused as result-hash-mismatch, which had no arm). CR-2 (prompt wording over-claims, low) routed to recommendations.future. Gate 1's three findings verified fixed.
**HIGH findings**: 0
**MEDIUM findings**: 1
**Traceability**: skipped (no Success Criteria table)
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)

#### qa-fix (5b)
- T332-CR2-1: Step 3c binds `AC_EXTRACT_FILE`; both document arms' hand-copy remedy now says "and remove $AC_EXTRACT_FILE"; a new `result-hash-mismatch` arm names re-running the extract or, for a deliberate hand copy, removing the record. Prose under the extract says why.
- T332-CR2-2 (found by the new test): under zsh `${AC_SHA256:+--sha256 "$AC_SHA256"}` is one word, so merge read `--sha256 <hex>` as one unknown flag on every extracted run. Pre-existing since task 269; fixed here with an array because the new case needs both shells. Two more copies of the pattern in `skills/review-story/SKILL.md` (2398, 2483) are out of scope: follow-up.
- Tests: new blocks case (extracted wrong answer → corrected hand copy refused in the hash arm with its remedy → remedy followed → merged and recorded); two arm assertions extended. Blocks 20/20.
- Mutation-proven: old `${…:+…}` expansion restored → 1 red (zsh new case); hash arm removed → 2 red (bash+zsh new case); "and remove" dropped from the mismatch arm → 4 red (bash+zsh task-331 arm test and new case). Restored → green.
- CHANGELOG entry extended; `changelog-cites.sh` cites (task 332). Bundle 0 problems, quick_validate ✓.
- Full `ci:fast` on .249: 8977/8980, 0 fail. Commit `4ccb29fcd`, pushed. PR and `qa-fix-2` issue comments posted.

### QA Cycle 3 — 2026-11-28
**Gate Result**: PASS
**Issues Found**: 0 open. Reviewer (scoped to files changed since gate 2) returned 1 low bug and 1 cleanup, both advisory (not high confidence, not reproduced), routed to recommendations.future. QA mutation: never pass `--sha256` → 2 red.
**HIGH findings**: 0
**MEDIUM findings**: 0
**Traceability**: skipped (no Success Criteria table)
**PR Review**: APPROVE — task.332.pr-review.1.ac-merge-closes-task-331-follow-ups.md (conformance lens only, `--no-code`; 0 findings; staged for the acceptance commit)
**Loop exit**: PASS gate → 5c APPROVE → Step 7
**Action**: Proceeding to 5c — gate + report committed (`4b87a42c1`) and pushed (qa-pre-5c); 5c returned APPROVE

---

## Completion

**Finished**: 2026-11-28T00:29Z
**Final Status**: Completed
**Branch**: feature/task.332.ac-merge-closes-task-331-follow-ups
**PR**: https://github.com/Gamaroff/agent-skills/pull/964
**QA Iterations**: 3
**DoD Summary**: task.332.dod.1.ac-merge-closes-task-331-follow-ups.md
**Tracker debt**: none

**Completion Summary**: `finalise-rerun-scope.js merge` now requires `--doc` and refuses an AC answer that names no `story_file` (`result-document-unnamed`). It splits a scope with no document (`scope-document-missing`) from another document's scope. /finalise keys its scope, extract, result and merged files by work-item stem. QA took 3 cycles. Cycle 1 added the CHANGELOG citation and two Step 3c remedies. Cycle 2 fixed the hand copy after an extract, which was refused by the old hash. It also fixed a zsh defect, dating from task 269, that passed `--sha256 <hex>` as one argument. The full suite was run on the LAN server, as the operator asked, rather than relying on hosted CI. Gate 3's advisories stay open as follow-ups. The main one is the same zsh pattern in review-story SKILL.md:2398 and :2483.
