# Implementation Report: /review-pr accepts a Jira card or GitHub issue and resolves it to its PR

**Task**: `task.176.review-pr-tracker-issue-input.md`
**Run Number**: 1
**Started**: 2026-10-02 17:45
**Status**: Completed

---

## Summary

Teach `/review-pr` to start from a Jira key/URL or GitHub issue and resolve it to its PR, with a pure parser, per-kind host check, and the corrected shared §0a key → doc lookup.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | feature/task.176.review-pr-tracker-issue-input (existing branch, at develop tip) |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | low                                                                        |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Tracker Issue       | #553 (GitHub)                                                              |
| Board status        | In Progress ✅ (from Todo, verified)                                        |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.{id}.*` exists in git                             | Existing branch reused at `e8ed79a9`; pushed with tracking | —                    |
| 2. review-task             | ✅ Done    | `task.{id}.review.{N}.{name}.md` exists (or skip logged)               | Skipped — already reviewed (review.1) | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline (plan + map); 2 iterations of the fast gate — iter 1: 3 real failures fixed; iter 2: 5079 pass, 0 fail. Audit 18/18 | `.summaries/step-3-test-triage-1.json`, `.summaries/step-3-loop-audit-1.json` |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #554: https://github.com/Gamaroff/agent-skills/pull/554 | —                    |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.{id}.qa.{N}.*.md`; `task.{id}.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 4 cycles: CONCERNS 90 → FAIL 70 → CONCERNS 90 → PASS 100 (route 2b, cosmetic residue); 5c PR review CONCERNS (non-blocking) | `.summaries/step-5-traceability-mapper.json`, `task.176.pr-review.1.review-pr-tracker-issue-input.md` |
| 7. finalise                | ✅ Done    | `task.{id}.dod.{N}.*.md`; task `status: accepted`                      | Accepted via Step 8a (security zero-guard fixed in `a7484bb`); acceptance commit `011a90b`; CI reading 2 SUCCESS | —                    |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | Final report commit + push; lock removed by --complete after the checklist | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-10-02

- Feature branch base: feature/task.176.review-pr-tracker-issue-input — user chose the recommended option; the branch already exists at develop's tip (e8ed79a9).
- PR target branch: develop — user chose the recommended option.
- qa-planning gate: skipped (auto — no prompt)
- Questions asked (2, matches the required count): Q1 branch base → existing feature branch; Q2 PR target → develop.
- Phase 0b: branch `feature/task.176.*` exists but no PR and no implementation report — no prior pipeline run to resume. Treated as a fresh start; not asked.
- Phase 0 run inline (no Explore fan-out): file path given as task id, resolved directly. Tracker: `TRACKER=github` (`JIRA_URL` unset), `TRACKER_ISSUE=553`.
- Lite-mode inputs derived inline: risk_level=low (risk_ok), phase_count=4 (Phases 0–3; not < 3), single_module=false (review-pr + shared step-0 doc and its bundled copies) → PIPELINE_MODE=standard.
- Always-load files resolved: 3 files from `skills-config.yaml` `devLoadAlwaysFiles`.
- Task status at start: `ready-for-development`. A prior session already ran `/review-task` (review.1, 7/10 NEEDS REVISION, 9 important fixes applied, status promoted) but left the task doc, plan and review report uncommitted. Step 2 will check that review report's currency.
- Branch: `feature/task.176.review-pr-tracker-issue-input` reused (already at develop tip); pushed `-u`. Report stashed/restored around `/create-branch`.
- Tracker: work-started comment `posted`; GitHub board: work-started → transitioned Todo → In Progress (verified). Priority already P2 (set at review), so the unset-only default was not needed.
- review-task skipped — task status is `Ready for Development` and review report exists at `docs/tasks/task.176.review-pr-tracker-issue-input/task.176.review.1.review-pr-tracker-issue-input.md`. Skip notice posted to #553 (stage review).

### Step 3 — Develop

- Pre-develop surface map: 20 files identified in skills/review-pr, shared/resources (step-0 §0a), shared/resources/tests (bash/zsh idiom), 4 bundled step-0 copies. Explore subagent ran (~81 s).
- Plan file found: docs/tasks/task.176.review-pr-tracker-issue-input/task.176.plan.review-pr-tracker-issue-input.md — included as implementation context.
- Step 3 inline — /develop not invoked: plan file + surface map both recorded; the plan names every rung, the parser contract and the four findings.
- Always-load files read: coding-standards.md (shellcheck required after .sh edits; cite shared resources by path).
- Parser: `skills/review-pr/scripts/parse-target.sh` — pure, no env reads (`JIRA_URL` is judged by the skill, not the parser); known hosts (github.com, bitbucket.org, *.atlassian.net) decide first, unknown hosts fall back to disjoint shape arms so GHE / Bitbucket Server / self-hosted Jira PR URLs keep parsing as before.
- Rung 3 filter anchored on the branch's last segment (`== STEM` or ends `/STEM`), stricter than the plan's "contains" — a stem that prefixes a longer slug must not match. GitHub `--limit 1000`, not the plan's 100, so an older work item's PR does not drop off a short page.
- Closing references (`closedByPullRequestsReferences`) go through the selection rules; title/description key matches are always confirmed, even a single one.
- §0a: one shared "Key → document lookup" block; the four call sites link it; several matches HALT instead of `head -1`. Also fixed §0a's GitHub-issue URL extraction (`grep -oE '(?<=/issues/)…'` — PCRE lookbehind, never matched under -E). Small, same block, logged in CHANGELOG.
- review-pr Step 2 keeps its bare (dependency) link to the step-0 doc and adds a fragment citation — converting the bare link to a citation would shrink review-pr's closure and is out of scope.
- Description gains a card trigger (148 words, ≤150). `generate-catalog` produced no diff.
- Fast gate iter 1 (`npm run ci:fast`): 5076 pass, 3 fail — all real, all in SKILL.md: untracked `scripts/parse-target.sh` (bundled-links), bare `$1` in fenced bash (positional-params guard), new `${JIRA_URL:-}` read with no writer (unbound-default guard). Fixed: script staged, `${1}`, plain `$JIRA_URL`. Iter 2: 5079 pass, 0 fail.
- Loop audit: `ready-for-review`, 18/18 Implementation Plan checkboxes. Development completion comment posted to github issue 553.
- Mutation checks (all red, then restored green): board-URL arm, host-first ordering, §0a anchor, `.request.` exclusion, the host-check sed delimiter.

### Step 4 — Create PR

- SCOPE_PATHS: docs/tasks/task.176.review-pr-tracker-issue-input, CHANGELOG.md, shared/resources, skills/{develop-bug,develop-story,develop-task,review-pr}/references, skills/review-pr/scripts, skills/review-pr, skills/review-pr/tests. Pre-flight guard: no out-of-scope untracked files, nothing held.
- Commits: `2f3d2736` feat(review-pr) (9 files), `f3162293` docs(task.176) (2 files). Pre-commit bundle check: all in sync, closures +0. Leak check: both commits contain only scoped paths.
- PR body written directly rather than by the summariser subagent — the orchestrator held the full change in context; recorded as a deviation.
- PR created: https://github.com/Gamaroff/agent-skills/pull/554 (base develop). Post-PR state checked with `gh pr view` directly (not the poller subagent): OPEN, 13 files.
- Issue #553: in-review comment `posted`. GitHub board: in-review → stage-disabled (this board's tracker-workflow.yaml does not enable it). Lock `pr_url` set.

### Steps 5–6 — QA loop

- Traceability mapper dispatched (standard mode, Success Criteria table present): 11 criteria — 8 full, 2 partial, 1 n/a. The Explore agent is read-only, so the orchestrator wrote `.summaries/qa-traceability-matrix.md` from its returned content.
- GitHub board: QA-start re-assert → stage-disabled.
- QA cycle 1 (`/qa-task`, `code_review_blocking=true`): gate 1 CONCERNS 90/100 at head `f3162293`. 4 high-confidence code-review bugs promoted; 5 medium-confidence findings advisory. Parser hand-probed per probe-boundary-rule §5.1 (no engine entry form takes a one-string script): 30 hostile inputs × 2 shells, no command executed, newline forgery recorded as QA-1.
- QA Cycle 1 — changes-requested: stage-disabled.
- 5b /qa-fix (cycle 1): findings ingester not dispatched — the orchestrator wrote gate 1 in this session and held its findings; recorded as an independence loss. No ambiguity needed a user question. Step 3.5 population probe: `sprint-review-summary` → 5 executed docs (step-0 updated; step-7, step-8, finalise write/commit it and do no lookup — unaffected; review-pr updated); `jira_key: ${` → step-0 (updated), review-task (deferred, task Deferred Work). Move: patch — distinct defects, not one restated rule.
- A bash-only parse error (apostrophe inside `${KIND:?…}` in double quotes) was introduced and caught within the fix by the new `bash -n` test; zsh accepted it.
- Composed timestamps in `.summaries/*.json` (gitignored) replaced with "not measured".
- QA Cycle 2 — changes-requested: stage-disabled. 5b (cycle 2): Step 2.6 trigger (b) — CR2-2/CR2-3 touch cycle-1 edits; Move: patch (distinct defects). Ingester not dispatched (findings held from gate 2, written this session).
- QA cycle 3 convergence check: HIGH sequence [0, 1, 0] — HIGH does not remain, no trip. Route classifier: continue (not-a-pass-gate; route 2 declined: high-findings-remain). QA Cycle 3 — changes-requested: stage-disabled.
- 5b (cycle 3): Step 2.6 trigger (b) — the §0a exclusion was touched a third time; Move: consolidate (one rule in §0a, cited by review-pr Step 2; one owner/repo expression held equal at three sites by a test).
- QA cycle 4: convergence check — HIGH [0,1,0,0], no trip. Route classifier: cosmetic-residue (route 2b); CR4-2 carried to gate 4 `recommendations.future` and the task's Deferred Work; CR4-1 (pre-existing) also recorded there.
- 5c `/review-pr --effort medium --comment`: verdict CONCERNS (PC-1 low: task doc rung-3 text stale; CR-1 medium/medium: a docs-less repo makes /review-pr HALT via the §0a lookup; CR-2 low: scheme-less URL read as a branch). Report: `docs/tasks/task.176.review-pr-tracker-issue-input/task.176.pr-review.1.review-pr-tracker-issue-input.md`; PR comment posted. Not blocking: PC-1 fixed in the task doc (prose only); CR-1 and CR-2 added to the task's Deferred Work. GitHub board: ready-for-merge → stage-disabled.

### Step 7 — Finalise

- `/finalise` invoked (not inlined). DoD agents: AC PASS (11/11), Docs PASS, Compliance N/A, Security FAIL on first pass — zero-guard only (`parse-target.sh` is a boundary no probe-engine entry form reached; severity low).
- Step 8a fix-and-recheck: evaluator halted on `mutation-proved` only → fix `a7484bb` (decision moved into `parse_target()`, sourceable; `review-pr.test.js` runs the engine's `shell-fn:` probe per PR) → fast gate 5135 pass → mutation proof red on revert → evaluator exit 0 → commit → evaluator `--git-base a365abb` exit 0 → push. Security reproduction re-run: engages, `totals.executed` 32, 0 reproduced. Other three sections not re-run (fix inside Files Summary; recorded as a deviation in the DoD).
- CI reading 1: SUCCESS @ `a365abb98a4d`; retaken on the fix head: SUCCESS @ `a7484bbf1fbc`. CI reading 2: SUCCESS @ `011a90bbf667` (acceptance commit), 5 checks, 180 s.
- DoD summary: docs/tasks/task.176.review-pr-tracker-issue-input/task.176.dod.1.review-pr-tracker-issue-input.md. Registry row ticked. Change Log acceptance row 1.3. `pr_number: 554` added to frontmatter (the body's only `pull/N` match was an example URL).
- Canonical PR summary: https://github.com/Gamaroff/agent-skills/pull/554#issuecomment-5961217117. DoD body posted to PR — comment URL: https://github.com/Gamaroff/agent-skills/pull/554#issuecomment-5961229972.
- GitHub Issue #553 — close: CLOSED ✅ (Document link already on develop). Tracker `done` comment posted by /finalise; orchestrator's copy → `already`.
- GitHub Issue #553 — board: done → already (Done).
- Accept gap: tracker journal empty — Tracker debt: none.
- Task completed.

---

## Issues Log

- Step 3: the first draft of the host check used `|` as the sed delimiter **and** as the www/api alternation. sed failed to parse, both sides normalised to "", the pair compared equal and the HALT never fired — fail-open. Caught by running the Step 0b block under bash and zsh; fixed with `#` delimiters and an empty-side guard; held by a mutation.
- Step 3: `ci:fast` ran past the 600 s Bash timeout and was moved to the background.
- 5b cycle 2: the qa-fix Change Log row is written once per fix cycle here (two rows), not once per loop as qa-fix Step 5 asks — cycle 1's row was already committed, and the log is append-only. A rewrite of the committed row was made and reverted before commit.
- QA cycle 4: the first scoped patch was empty — a scalar file list did not word-split under zsh (the trap qa-task Step 3b documents); rebuilt from an array before dispatch. The cycle 3 commit message says review-pr.test.js went 175 → 189; it holds 187.
- 5b cycle 1: `bundle-missing-source.test.js` failed once in `ci:fast` on its own 10 s timing budget (20.8 s under load) and passed alone (7/7) — the file labels itself LOAD-SENSITIVE.

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-10-02
**Gate Result**: CONCERNS
**Issues Found**: 5 — CR-1 §0a lookup misses `sprint-review-summary.md` (finalised items halt as ambiguous); CR-2 rung-4 calls `bb_pr_search` defined in another block; CR-3 Step 0b host check binds none of its inputs; QA-1 newline in `target` forges parser output; CR-8 (low) owner/repo named `issues`/`pull`. Advisory: CR-4, CR-5, CR-6, CR-7, CR-9.
**HIGH findings**: 0
**MEDIUM findings**: 4
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)
**Fix**: `4583942` — all 5 queued + 5 advisory findings fixed; 161 tests (bash+zsh); 10/10 fixes mutation-proven; `ci:fast` 5108 pass, 1 load-sensitive timing failure that passes alone.

### QA Cycle 2 — 2026-10-02
**Gate Result**: FAIL
**Issues Found**: 4 — CR2-1 (high) Bitbucket PR URLs carry no `repo=`, so the documented owner/repo HALT never fires on bitbucket.org; CR2-2 SSH-alias arm skips the owner/repo check; CR2-3 rungs 3–4 block guards only `KIND`; CR2-7 (low) `JIRA_URL` unbound in an `.env`-only setup. Advisory: CR2-4, CR2-5, CR2-6, CR2-8, CR2-9. Gate 1: all 10 fixed.
**HIGH findings**: 1
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)
**Fix**: `41252c3` — 4 queued + 5 advisory fixed; 175 tests (bash+zsh); 7/7 mutation-proven; `ci:fast` 5122 pass, 0 fail.

### QA Cycle 3 — 2026-10-02
**Gate Result**: CONCERNS
**Issues Found**: 2 — CR3-1 Step 0 still parses an altssh Bitbucket remote with the old host-anchored sed (workspace `443`); CR3-3 (low) `.env` JIRA_URL read misses `export`/CRLF. Advisory: CR3-2 (cycle-2 numbered-kind exclusion lets unnumbered legacy artifacts through), CR3-4, CR3-5; cleanups CR3-6, CR3-7. Gate 2: all 9 fixed.
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 3 of 5)
**Fix**: `ebb9c60` — 2 queued + 5 advisory fixed; 189 tests (bash+zsh); 6/6 mutation-proven; 174/174 real `github_issue` lookups resolve to one doc; `ci:fast` 5134 pass, 0 fail.

### QA Cycle 4 — 2026-10-02
**Gate Result**: PASS
**Issues Found**: 1 — CR4-2 (low) `.env` inline `# comment` defeats the quote strip. Advisory: CR4-1 (pre-existing: rung 2 `pr_number` grep has no artifact filter), CR4-3, CR4-4. Gate 3: all 7 fixed.
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: CONCERNS
**Loop exit**: Cosmetic-residue exit taken — PASS gate at cycle 4 with HIGH 0 for cycles 3 and 4; all 1 open findings are LOW and are carried to the gate's recommendations.future by id (CR4-2). This is a CLEAN exit, not a stall: nothing is blocked and nothing is being accepted over; a full qa-fix cycle for cosmetic findings is what this route exists to avoid.
**Action**: Proceeding to 5c (PR conformance review)

---

## Completion Summary

Implemented `/review-pr` starting from a work item: a Jira key or URL, a GitHub issue URL or `#N`.
The new pieces are:

- a pure parser, `skills/review-pr/scripts/parse-target.sh` — host-first, positional, refusing
  malformed and control-character input
- a per-kind host and owner/repo check
- the card → PR ladder, with selection rules where a key match is never auto-picked
- one corrected, anchored and quote-tolerant key → document lookup in the shared step-0 §0a, which the
  develop pipelines and `/review-pr` now cite

QA took 4 cycles. A FAIL at cycle 2 found that Bitbucket PR URLs carried no repo. Cycle 3's
consolidation put the §0a artifact rule in one place and the remote → owner/repo expression in one
string. Every fix was mutation-proven.

`/finalise` took Step 8a once. The DoD security agent found that no probe-engine entry form reached
the parser — a zero-guard FAIL, severity low. `a7484bb` made the parser sourceable, so the engine's
`shell-fn:` form now probes it on every PR: 32 probes, and the boundary held.

Notable decisions:

- Each SKILL.md fenced block is self-contained and tested as delivered.
- The rung-3 branch match is anchored on the last segment, with `--limit 1000`.

The follow-ups are recorded in the task's Deferred Work: the `.env` inline-comment edge, the
docs-less repository fallback, scheme-less URLs, the rung-2 `pr_number` filter, and the restated
lookups in review-task and review-story.

---

## Completion

**Finished**: 2026-10-02 20:48 UTC
**Final Status**: Completed
**Branch**: feature/task.176.review-pr-tracker-issue-input
**PR**: https://github.com/Gamaroff/agent-skills/pull/554
**QA Iterations**: 4 (CONCERNS 90 → FAIL 70 → CONCERNS 90 → PASS 100, cosmetic-residue exit; Step 5c /review-pr CONCERNS)
**DoD Summary**: docs/tasks/task.176.review-pr-tracker-issue-input/task.176.dod.1.review-pr-tracker-issue-input.md
**Tracker debt**: none
