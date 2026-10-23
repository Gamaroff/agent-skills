# Implementation Report: Migration engine: monolith and domain-less PRDs

**Task**: `task.211.migration-engine-monolith-and-domainless-prds.md`
**Run Number**: 1
**Started**: 2026-10-21 00:25
**Status**: Completed

---

## Summary

Fix the three migrate-doc-numbering.mjs engine defects found in task.204 gate 8 (frontmatter-less PRD, outside links to a moved monolith, domain-less PRD placement) and lift the matching refusals from review-prd's migration guard.

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
| Tracker Issue       | #676 (GitHub)                                                              |
| Board status        | In Progress ✅                                                              |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.211.*` exists in git                              | Branch created at `27725e92` | —                    | 2026-10-21T00:21Z |
| 2. review-task             | ✅ Done    | `task.211.review.{N}.{name}.md` exists (or skip logged)                | `task.211.review.1.…` — READY TO IMPLEMENT 8/10; Planned → Ready for Development | —                    | 2026-10-21T00:24Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline; 12/12 phases; ci:fast 6075 pass / 0 fail; 10 mutations red | `.summaries/step-3-iteration-audit.json` | 2026-10-21T00:40Z |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #712: https://github.com/Gamaroff/agent-skills/pull/712 | —                    | 2026-10-21T00:42Z |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.211.qa.{N}.*.md`; `task.211.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 6 cycles (cycle 6 granted after loop limit); gate 6 PASS 95, route 2b; 5c APPROVE | —                    | 2026-10-21T03:01Z |
| 7. finalise                | ✅ Done    | `task.211.dod.{N}.*.md`; task `status: accepted`                       | `task.211.dod.1.…` ACCEPTED; acceptance commit `8e93c47d`; CI reading 2 SUCCESS; #676 closed | —                    | 2026-10-21T03:16Z |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | Implementation report committed and pushed | —                    | 2026-10-21T03:17Z |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-10-21

- Invoked by `/develop-next` (registry fallback — task-registry, T211) with `--defaults`; autonomous run.
- Phase 0 run inline (no 0a-parallel agents dispatched): the task path came resolved from the selector; lite-mode inputs derived from the document — risk_level absent (risk_ok true), phase_count 3 (not < 3), single_module false (engine in shared/resources + review-prd skill + evals) → PIPELINE_MODE standard.
- Feature branch base: develop — source: recommended (`--defaults`, pipeline-answers.js; 0 questions asked)
- PR target branch: develop — source: recommended (`--defaults`)
- Mode: standard — source: detector; skips: none; refused: none
- qa-planning gate: skipped (auto — no prompt)
- Task status at start: `Planned` — proceed; Step 2 (`/review-task`) validates and promotes.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Tracker: github, issue #676.
- Branch: `feature/task.211.migration-engine-monolith-and-domainless-prds` from `develop` @ `27725e92`, pushed with tracking. Implementation report stashed before branch creation, restored after.
- Tracker work-started: comment `posted`; GitHub board: work-started → In Progress (transitioned). Priority P2 default block not run — the issue already carries a priority from create-task.
- review-task invoked (status Planned, no review report → run). Output: Comprehensive report (pipeline default). Step 8.5 auto-answered: Yes, apply all critical + important fixes. Step 9 auto-answered: Yes, fixes complete — pipeline proceeds autonomously.
- Review report: docs/tasks/task.211.migration-engine-monolith-and-domainless-prds/task.211.review.1.migration-engine-monolith-and-domainless-prds.md — READY TO IMPLEMENT 8/10; 0 Critical, 3 Important (Performance criterion untested; monolith `<domain>/<slug>` placement unstated; gate-9/10 test row unnamed), 3 Optional (drifted anchors, slug validation via docId.format, BLOCKER_CODES). All applied to the task document.
- Planned promoted to Ready for Development by review-task. Tracker key unchanged (#676) — no work-started re-fire.
- Review outcome comment skipped — review-task reported `posted` (stage review-task).

### Step 3 — Develop — 2026-10-21

- Pre-develop surface map: 6 files identified in shared/resources (migrate-doc-numbering.mjs + its test), skills/review-prd (SKILL.md, scripts/migration-guard.mjs, bundled engine copy), evals/shared/tests (prd-skill-numbering.test.mjs). Mapped inline from the review's verified anchors rather than by an Explore subagent — the independent second look was not taken.
- Plan file found: docs/tasks/task.211.migration-engine-monolith-and-domainless-prds/task.211.plan.migration-engine-monolith-and-domainless-prds.md — included as implementation context for /develop.
- Step 3 inline — /develop not invoked: the plan and review named every hunk (three engine sites, two eval rows, one SKILL.md block pair).
- Fast gate: `npm run ci:fast` (no `develop.fastGateCommand` configured). Run with `.agents/skills` moved aside: 6089 tests, 6075 pass, 0 fail. `npm run eval:all` 0; `npm run bundle:check` 0 problems; `npm run validate -- skills/review-prd/` ok.
- Phase 1: `frontmatterState()` exported; `editFrontmatter` writes a new block (all edits in order, plus `type: prd` as a `createOnly` edit) when line 0 is no fence; an unclosed fence is the `unclosed-frontmatter` plan blocker.
- Phase 2: move sources outside the root join the prefilter (by repo-relative path or the path relative to the reading file's directory, never a bare name) and the literal-pass gate; move sources also join the live set, so a link to an untracked monolith is re-pointed, not counted dead. Each outside candidate is still read exactly once.
- Phase 3: `--name <path>=<domain>/<slug>` (parseArgs refuses more than one `/` or an empty part, as usage); a named domain is validated with `docId.format` (bad → `bad-slug`) and wins placement, the monolith included; a legacy PRD landing at domain `.` is `needs-domain`. review-prd plan/apply blocks lose the guard; plan prose documents `needs-domain` and `unclosed-frontmatter`. `skills/review-prd/scripts/migration-guard.mjs` deleted (no code left in it).
- Breaking: task.203's L3 row now expects `needs-domain` for a bare `index.md=core`; CHANGELOG `### Changed` entry marked BREAKING.
- Mutation proof: 10 engine mutations (block creation, unclosed blocker, prefilter widening, literal gate, needs-domain, named domain, live set, prefilter disabled, createOnly, domain validation) each turn ≥1 row red. Two (live set, createOnly) were unheld on the first pass; a row was added for each.
- Implementation decision: `type: prd` is written only into a block the engine creates, never over an existing `type:`.
- Loop audit (iter 1): ready-for-review, 12/12 — loop exited.
- Development completion comment posted to github issue 676 (`posted`).

### Step 4 — Create PR — 2026-10-21

- Scope: the task's 8 files (engine, its test, bundled copy, review-prd SKILL.md, deleted guard, eval test, CHANGELOG) plus the task directory. No out-of-scope files in the tree.
- Two commits: `b2cc4831` feat (code, tests, CHANGELOG, guard deletion), `0c4d6852` docs (task doc, review report, implementation report). Pushed.
- PR body written by the orchestrator from its own record, not by the summariser subagent — the change set was already fully described in this report.
- PR created: https://github.com/Gamaroff/agent-skills/pull/712 (base develop).
- Tracker comment in-review on #676: `posted`.
- GitHub board: in-review → stage-disabled (no `pipeline.in-review` moment configured).
- Post-PR state check: PR #712 state = OPEN (checked inline with `gh pr view`). errors = 0.

### Steps 5–6 — QA loop — 2026-10-21

- QA cycle 1: qa-task with `code_review_blocking=true`. Diff reviewer (Explore) returned 3 findings in 219744 ms; QA reproduced all three in memory. Gate CONCERNS 70/100.
- Convergence check: not applicable at cycle 1. Route classifier: no exit at cycle 1 (diminishing-returns needs cycle 3+; cosmetic-residue is PASS-only) → 5b.
- QA Cycle 1 — changes-requested: stage-disabled.
- QA cycle 2: qa-task refute pass over the whole branch diff, `code_review_blocking=true`. Diff reviewer (Explore) returned 5 findings in 266090 ms; QA reproduced all five on HEAD. Security probe recorded (`task.211.qa.2.security.run.json`, 20 executed, 0 escaped). Gate CONCERNS 70/100.
- Convergence check: not applicable at cycle 2. Route classifier: no exit at cycle 2 → 5b.
- Narrowing residue — every MEDIUM on gates 1 and 2 names shared/resources/migrate-doc-numbering.mjs (CR-1, QA-1, QA-2, CR-1, CR-2, CR-3); HIGH 0 on both. This is an OFFER to qa-fix Step 2.6, not a route and not an escalation.
- QA Cycle 2 — changes-requested: stage-disabled.
- QA cycle 3: qa-task scoped to the 11 files changed since gate 2 head 0379eb73 (safety re-probe not triggered), `code_review_blocking=true`. Diff reviewer (Explore) returned 5 findings in 232718 ms; QA reproduced the four bugs on HEAD and ran them at 0379eb73 (CR-1 `.mjs` is a regression). Security probe recorded (`task.211.qa.3.security.run.json`, 20 executed, 0 escaped). Gate CONCERNS 75/100.
- Convergence check: HIGH 0, 0, 0 — does not trip (HIGH_N = 0). Route classifier: continue (not-a-pass-gate; route 2 declined: product-defect-signal) → 5b.
- Narrowing residue — every MEDIUM on gates 2 and 3 names shared/resources/migrate-doc-numbering.mjs (CR-1, CR-2, CR-3, CR-1, CR-2); HIGH 0 on both. This is an OFFER to qa-fix Step 2.6, not a route and not an escalation.
- QA Cycle 3 — changes-requested: stage-disabled.
- QA cycle 4: qa-task scoped to the 10 files changed since gate 3 head 02d65ff4 (safety re-probe not triggered), `code_review_blocking=true`. Diff reviewer (Explore) returned 4 findings in 180005 ms; QA reproduced all four on HEAD and at 02d65ff4 (CR-1 and CR-2 are regressions from cycle 3). Security probe recorded (`task.211.qa.4.security.run.json`, 20 executed, 0 escaped). Gate CONCERNS 80/100.
- Convergence check: HIGH 0, 0, 0, 0 — does not trip. Route classifier: continue (not-a-pass-gate) → 5b.
- Narrowing residue — every MEDIUM on gates 3 and 4 names shared/resources/migrate-doc-numbering.mjs (CR-1, CR-2, CR-1); HIGH 0 on both. This is an OFFER to qa-fix Step 2.6, not a route and not an escalation.
- QA Cycle 4 — changes-requested: stage-disabled.
- QA cycle 5: qa-task scoped to the 9 files changed since gate 4 head 3e6f00cb (safety re-probe not triggered), `code_review_blocking=true`. Diff reviewer (Explore) returned 2 findings in 195150 ms; QA reproduced both on HEAD (CR-1 a regression from cycle 4). Security probe recorded (`task.211.qa.5.security.run.json`, 20 executed, 0 escaped). Gate CONCERNS 85/100.
- Convergence check: HIGH 0 ×5 — does not trip. Route classifier: continue (not-a-pass-gate) → 5b.
- Narrowing residue — every MEDIUM on gates 4 and 5 names shared/resources/migrate-doc-numbering.mjs; HIGH 0 on both. This is an OFFER to qa-fix Step 2.6, not a route and not an escalation.
- QA Cycle 5 — changes-requested: stage-disabled.
- Loop limit: budget spent after the cycle-5 fix `bce90253`. Gate-the-last-fix half-cycle (route 2c) evaluated with budgetSpent: continue (medium-not-falling) — MEDIUM reads 2, 1, 1 over cycles 3–5. Escalated.
- QA loop re-entry: 1 extra cycle granted; 0 cycle(s) run outside the loop back-filled from disk. Operator chose "Resume at 5a with 1 more cycle" on re-invocation. The lock survived the escalation (no halt snapshot on disk); `grant-qa-cycles.sh` wrote `qa_max_cycles` 6, `qa_phase` 5a.
- QA cycle 6 (granted): qa-task scoped to the 9 files changed since gate 5 head ca1c5bf5 (safety re-probe not triggered), `code_review_blocking=true`. No traceability matrix (the task's Success Criteria is a list, not a table — as in cycles 1–5). Diff reviewer (Explore) returned 2 low findings in 134169 ms; QA reproduced both on HEAD. Security probe recorded (`task.211.qa.6.security.run.json`, 20 executed, 0 escaped). Both cycle-5 fixes mutation-proven (covered). Gate PASS 95/100.
- Convergence check: HIGH 0 ×6 — does not trip. Route classifier: cosmetic-residue (route 2b) — CR-1 (LOW) carried to gate 6 `recommendations.future` and to the task's `## Deferred Work` → 5c.
- QA Cycle 6 — 5c: `/review-pr --effort medium --comment --no-code` → APPROVE (`task.211.pr-review.1.migration-engine-monolith-and-domainless-prds.md`; PR summary comment posted). One LOW conformance finding (PC-1) recorded, not fixed — the verdict is APPROVE, so nothing is fixed at 5c. GitHub #676 — ready-for-merge: stage-disabled.

### Step 7 — Finalise — 2026-10-21

- `/finalise` invoked. Four DoD agents were dispatched in parallel. Results: AC PARTIAL (9/10), security PASS, compliance NOT_APPLICABLE, docs PASS.
- AC8 ("every new row is mutation-proven"): the agent returned FAIL on a per-row reading. The orchestrator judged it met under the task's §8 definition ("revert each fix and name the row that goes red"), backed by the per-cycle mutation records (develop 10, cycles 1–6: 9, 11, 9, 7, 3, 2; all red or acted on). The DoD summary records this as a deviation, not as the agent's verdict.
- Security probe run by /finalise from the agent's plan: `parseNameValue`, `--sink path`, 31 cases. Result: engages, 0 reproduced, 0 escaped. Record: `task.211.dod.1.security.run.json`.
- DoD summary: `docs/tasks/task.211.migration-engine-monolith-and-domainless-prds/task.211.dod.1.migration-engine-monolith-and-domainless-prds.md` (ACCEPTED). Task `status: accepted`, Change Log row 1.2. Registry row 211 `ticked` (planned → accepted). Sprint review summary written.
- Acceptance commit `8e93c47d` (`docs(task.211): accept — DoD, sprint review; registry ticked; 5c review carried (#676)`). It carried the 5c PR review report and the DoD probe record. Pushed. 6b assertions passed (tracked, on origin, `status: accepted` on origin). 6d: CHANGELOG `[Unreleased]` cites task 211.
- CI reading 1: SUCCESS @ ee713f35c8eb (5 checks); CI reading 2: SUCCESS (tree-equivalent to ee713f35c8eb) @ 8e93c47d23a3 (5 checks, after 30s). The head's own rollup also read 5/5 SUCCESS once its run finished.
- The first CI-poll waiter exited early because the orchestrator wrote the wrong PID to the pidfile (pgrep matched the wrapper shell, not the poll). The poll itself was still running. The pidfile was corrected and the result was read from the poll's own file.
- DoD body posted to PR: https://github.com/Gamaroff/agent-skills/pull/712#issuecomment-6307127805 (canonical summary, marker comment, new).
- GitHub issue #676: Document link already on `develop` (no re-point needed). Comment `posted`. Close: CLOSED ✅ (confirmed with `gh issue view`).
- Board transition: `gh-stage.js --stage done` returned `already` (card in Done).
- Accept gap: the tracker journal is empty, so there is no tracker debt.
- Task completed: task.211 accepted.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- 2026-10-21 — Cycle 1's gate and QA report were committed (`f6932cc1`) and pushed before 5b, instead of riding in the cycle's `fix(...)` commit. Cycle 1 therefore pushes twice. Later cycles follow the one-commit, one-push rule.


### QA Loop Limit Reached — 2026-10-21

> **Superseded (history).** On re-entry the operator granted 1 extra cycle. Gate 6 at `efc34f08` passed (95/100) and the loop left on route 2b. The record below describes the escalation as it stood then.

The pipeline completed 5 qa-task/qa-fix cycles without a clean PASS. The gate-the-last-fix half-cycle was considered and declined: `medium-not-falling` (MEDIUM 2, 1, 1 over cycles 3–5), so the cycle-5 fix (`bce90253`) has not been gated.

**Final gate status**: CONCERNS (85/100), gate 5 at `ca1c5bf5`
**HIGH findings per cycle**: 0, 0, 0, 0, 0 — none at any cycle
**MEDIUM findings per cycle**: 3, 3, 2, 1, 1
**Remaining issues** (from final gate file; both fixed in `bce90253`, not yet re-gated):
- CR-1 (medium, `shared/resources/migrate-doc-numbering.mjs`): a path after an unrecognised template (`f"{ROOT}/…"`, `#{ROOT}`, a nested `$(…)`) was skipped as absolute — a regression from cycle 4. Fixed in `bce90253` by restoring the cycle-3 rule for `}` and `)`.
- CR-2 (low, `shared/resources/migrate-doc-numbering.mjs`): `YAML_KEY` backtracked on a long blank run. Fixed in `bce90253`.

**What was attempted per cycle**:
- Cycle 1: displaced-frontmatter blocker, a stale-reference residual scan (substring), one exported `parseNameValue`, a numbered-PRD domain refusal (`0379eb73`).
- Cycle 2: consolidated the scan into `outsideReferences` (tokenise and resolve) plus a non-literal file loop; `needs-domain` for a numbered PRD moving to the root; closing-fence condition for `displaced` (`02d65ff4`).
- Cycle 3: one predicate `scansForStale` for both loops, binary-extension skip, variable-rooted paths, YAML-key rule for `displaced` (`3e6f00cb`).
- Cycle 4: one extension helper `isLiteralType`, broader `YAML_KEY`, a quoted-variable lookback, non-repository variables skipped (`ca1c5bf5`).
- Cycle 5: restored the cycle-3 `}`/`)` rule (CR-1), linear `YAML_KEY` (CR-2) (`bce90253`).
- Route 2c: declined, `medium-not-falling`.

**Likely root cause**: The deliverable (phases 1–3) has been sound since cycle 2. Every finding from cycle 2 on sits in one place: the `stale-reference` scan in `shared/resources/migrate-doc-numbering.mjs`, which guesses which text in an arbitrary file is a path. That set is open (any language, any templating), so each fix narrowed or widened a closed list of shapes and the next review found a spelling on the other side; cycles 4 and 5 each found a regression from the previous fix. The loop was working (HIGH 0 throughout, MEDIUM falling 3 to 1), but it was refining a heuristic whose remaining errors are edge spellings, not a defect the gate can close.

**Recommended next steps**:
1. Grant the cycle-5 fix its gate by hand: re-run `/develop-task` and take Phase 0b's "Resume at 5a with 1 more cycle". If that gate is clean or LOW-only, the run exits through 5c and `/finalise`.
2. Or decide the model for the scan first: keep the shape list and document the residual as a known limitation, or make the scan refuse any path-shaped token whose basename matches a moved source unless it is provably elsewhere.
3. Or accept gate 5 as is: run Step 5c (`/review-pr --effort medium --comment --no-code`), then `/finalise`.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-10-21
**Gate Result**: CONCERNS (70/100)
**Issues Found**: 4 — CR-1 BOM/leading blank line gets a second frontmatter block (medium); QA-1 relative non-link mention of the moved monolith left stale, run reports ok (medium); QA-2 `--name` domain boundary has no probeable entry, 0 probes (medium); CR-3 named domain moves a numbered PRD (low)
**HIGH findings**: 0
**MEDIUM findings**: 3
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)
**Fix result**: 4 of 4 fixed in one engine change. CR-1 → `frontmatterState` gains `displaced` (a BOM or blank lines before the fence) and a `displaced-frontmatter` blocker. QA-1 → a residual repo-relative or self-relative path (one holding a `/`) to an outside move source is a `stale-reference` blocker. QA-2 → exported `parseNameValue(value)`, the one check used by `parseArgs` and `discover`; a bad name passed straight to the library is `bad-slug`. CR-3 → a domain for a numbered PRD is `bad-slug`, and the redundant `p.legacy &&` guard below it was dropped (mutation showed it unreachable). 5 new engine rows, 1 updated; 9 mutations, each red except the unreachable guard, which was then removed. Security probe on `parseNameValue` with `task.211.qa-fix.1.security.cases.json` (20 cases): `engages`, 16/16 hostile rejected, 4/4 legitimate accepted; calibrated on a mutant without the segment check (`present-but-inert`, 10 escaped). ci:fast 6094 tests 0 fail (`.agents/skills` aside), eval:all 0, bundle:check 0 problems, validate review-prd ok.

### QA Cycle 2 — 2026-10-21
**Gate Result**: CONCERNS (70/100)
**Issues Found**: 5. CR-1: the stale-reference scan skips non-literal file types (medium). CR-2: a numbered root PRD lands outside a domain and cannot be given one (medium). CR-3: the unbounded substring match blocks correct references (medium). CR-4: `./prd.md` is never flagged (low). CR-5: a thematic break after a blank line reads as displaced (low)
**HIGH findings**: 0
**MEDIUM findings**: 3
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)
**Fix result**: 5 of 5 fixed. Step 2.6 answered the narrowing-residue offer. **Consolidate** for CR-1, CR-3 and CR-4: the substring test became one exported `outsideReferences(file, text, sources)`. It tokenises path-shaped occurrences (a path boundary, at least one `/`) and resolves each against the file's directory and the root, and it now runs over every in-scope tracked text file when an outside source exists (a NUL byte skips binaries). **Scope the claim** for CR-2: `needs-domain` fires for any PRD that moves to directly under the root, and a numbered one gets a hand-move remedy because its registry Folder is not rewritten. CR-5: `displaced` applies only when the late fence closes. A timing probe found `path.join` quadratic on a long `../` chain, so tokens are capped at PATH_MAX (4096). 5 new engine rows; 11 mutations, all red. One redundant filter that a mutation left unheld was removed. `tests/load-sensitive-marker.test.js` caught the new timing row without the marker; fixed, and the file was added to traps.md. ci:fast 6099 tests 0 fail (`.agents/skills` aside), eval:all 0, bundle:check 0 problems, validate review-prd ok.

### QA Cycle 3 — 2026-10-21
**Gate Result**: CONCERNS (75/100)
**Issues Found**: 5. CR-1: a variable-rooted path is skipped as absolute (medium). CR-2: a non-literal file under the PRD root is read by neither loop (medium). CR-3: example copies not exempt in the non-literal loop (low). CR-4: two thematic breaks still read as displaced (low). CR-5: binaries read in full (low).
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 3 of 5)
**Fix result**: 5 of 5 fixed. Step 2.6 answered the narrowing-residue offer with **consolidate**: the two scan loops now share one predicate (`scansForStale`: in rewrite scope, not an example copy), and the non-literal loop reads exactly the tracked files the literal loop does not, under the PRD root too, so each file is read once (CR-2, CR-3). Known binary types are skipped before the read (CR-5). CR-1: `outsideReferences` drops a leading variable (`$VAR/`, `}/`, `)/`) and resolves the rest; only a bare `/` is absolute. CR-4: a late fence is `displaced` only when it closes over YAML keys. 2 new rows and 4 must-flag/must-not cases; 9 mutations, all red. ci:fast 6101 tests 0 fail (`.agents/skills` aside), eval:all 0, bundle:check 0 problems, validate review-prd ok.

### QA Cycle 4 — 2026-10-21
**Gate Result**: CONCERNS (80/100)
**Issues Found**: 4. CR-1: the scan loops disagree on extension case, so README.MD is read by neither (medium, regression). CR-2: spaced/quoted YAML keys not read as a displaced block (low, regression). CR-3: a quoted variable is skipped as absolute (low). CR-4: $HOME paths refused as stale (low).
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 4 of 5)
**Fix result**: 4 of 4 fixed. Step 2.6 answered the narrowing-residue offer with **consolidate** for CR-1: both scan loops ask one helper, `isLiteralType` (exact extension), so every tracked file falls into exactly one loop. CR-2, CR-3 and CR-4 were patched with a stated reason (one condition each in an already-consolidated function). CR-2: `YAML_KEY` accepts quoted, spaced and dotted keys but not Markdown openers. CR-3: a variable closing right before the `/`, quoted or not, is read through one bounded lookback (`VARIABLE_BEFORE`, 128 chars). CR-4: `HOME`, `TMPDIR`, `XDG_*` and the like are skipped as `~` is. 1 new row and 3 extended; 7 mutations, all red (the unbounded-lookback mutant fails the linearity row). ci:fast 6102 tests 0 fail (`.agents/skills` aside), eval:all 0, bundle:check 0 problems, validate review-prd ok.

### QA Cycle 5 — 2026-10-21
**Gate Result**: CONCERNS (85/100)
**Issues Found**: 2. CR-1: a path after an unrecognised template (f-string, #{}, nested $(...)) is skipped as absolute (medium, regression). CR-2: YAML_KEY backtracks on a long blank run (low).
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop limit reached
**Fix result**: 2 of 2 fixed. Step 2.6 narrowing offer answered with **patch**, with a stated reason: CR-1 reverts the cycle-4 over-reach rather than adding a shape. A path after `}` or `)` is rooted whatever opened it, as in cycle 3; `VARIABLE_BEFORE` now decides only the quoted case and names the variable for the non-repository check. CR-2: `[ \t]*` kept only after the quoted keys, so `YAML_KEY` is linear. 1 new row (YAML linearity) and 1 extended (4 must-flag, 1 must-not); 3 mutations, all red. ci:fast 6103 tests 0 fail (`.agents/skills` aside), eval:all 0, bundle:check 0 problems, validate review-prd ok.

### QA Cycle 6 — 2026-10-21
**Gate Result**: PASS (95/100)
**Issues Found**: 2. CR-1: a root-relative path into a dot-directory is resolved against the file's directory only (low, promoted). CR-2: editFrontmatter writes above a displaced block on a direct call (low, medium confidence, advisory).
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: APPROVE — `task.211.pr-review.1.migration-engine-monolith-and-domainless-prds.md` (conformance lens only, `--no-code`); 1 finding recorded, not fixed: PC-1 (scope, low, medium confidence) — the task's §3 Target names only `unclosed-frontmatter` and `needs-domain`, not the shipped `displaced-frontmatter` and `stale-reference` blocker codes
**Carried to 6a**: docs/tasks/task.211.migration-engine-monolith-and-domainless-prds/task.211.pr-review.1.migration-engine-monolith-and-domainless-prds.md
**Loop exit**: Cosmetic-residue exit taken — PASS gate at cycle 6 with HIGH 0 for cycles 5 and 6; all 1 open findings are LOW and are carried to the gate's recommendations.future by id (CR-1). This is a CLEAN exit, not a stall: nothing is blocked and nothing is being accepted over; a full qa-fix cycle for cosmetic findings is what this route exists to avoid.
**Action**: Proceeding to 5c (PR conformance review)

---

## Completion

**Finished**: 2026-10-21 03:17 UTC
**Final Status**: Completed
**Branch**: feature/task.211.migration-engine-monolith-and-domainless-prds
**PR**: https://github.com/Gamaroff/agent-skills/pull/712
**QA Iterations**: 6 (5 within the loop limit, plus 1 granted on re-entry)
**DoD Summary**: `docs/tasks/task.211.migration-engine-monolith-and-domainless-prds/task.211.dod.1.migration-engine-monolith-and-domainless-prds.md` (ACCEPTED)
**Tracker debt**: none

**Completion Summary**: The task changed `migrate-doc-numbering.mjs` so that it migrates three legacy PRD shapes review-prd's guard used to refuse: a PRD with no frontmatter, a `docs/prd.md` that files outside the PRD root link to, and a PRD with no domain. `migration-guard.mjs` is deleted. Its refusals are now four engine blockers (`unclosed-frontmatter`, `displaced-frontmatter`, `stale-reference` and `needs-domain`) and one `--name <path>=<domain>/<slug>` check, `parseNameValue`. The QA loop took six cycles. HIGH was 0 every cycle, and MEDIUM went 3, 3, 2, 1, 1, 0. Cycles 2–5 refined the stale-reference path heuristic. Cycle 5 hit the loop limit and the run escalated. The operator granted one more cycle, which gated the cycle-5 fix at PASS 95/100 and left on the cosmetic-residue route. Notable decisions: QA findings were consolidated rather than patched (one `outsideReferences` tokeniser, one stale-scan predicate, one extension test). The orchestrator judged AC8 met per fix rather than per row, and recorded that in the DoD. Three low follow-ups are open: CR-1, CR-2 and PC-1.
