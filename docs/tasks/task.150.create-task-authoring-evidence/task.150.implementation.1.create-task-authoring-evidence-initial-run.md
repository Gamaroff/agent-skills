# Implementation Report: create-task — anchored claims, a bounded title, and a --from-observation entry

**Task**: `task.150.create-task-authoring-evidence.md`
**Run Number**: 1
**Started**: 2026-09-28 18:46
**Status**: Escalated

---

## Summary

Close five create-task authoring gaps (obs #124, #127, #128, #135, #147): grep-anchored current-state claims, per-member witnesses, a discriminator rule for single-statement tests, a bounded card title, and a `--from-observation` entry. Dispatched autonomously by `/develop-next` (roadmap item T150).

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
| Board status        | In Progress ✅ (gh-stage work-started: transitioned)                        |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.150.*` exists in git                              | Branch created at `f88a997f` | —                    |
| 2. review-task             | ✅ Done    | `task.150.review.{N}.{name}.md` exists (or skip logged)                | `task.150.review.1.create-task-authoring-evidence.md`: READY TO IMPLEMENT 9/10; Planned → Ready for Development | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline, 1 iteration; 5/5 phases; ci:fast 4385/0; 15 mutation proofs | —                    |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #512: https://github.com/Gamaroff/agent-skills/pull/512 | —                    |
| 5–6. qa-task / qa-fix loop | ❌ Failed  | `task.150.qa.{N}.*.md`; `task.150.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | Escalated: loop not converging at cycle 3 (HIGH 1, 1, 1); gates 1–3 FAIL 70 | `task.150.qa.3.security.run.json` |
| 7. finalise                | ⏳ Pending | `task.150.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-28

- Feature branch base: develop — auto-answered (AUTONOMOUS RUN, develop-next); Recommended option while on `develop`
- PR target branch: develop — auto-answered (AUTONOMOUS RUN, develop-next); Recommended option
- Questions asked: 0 of the 2 required (Q1, Q2). Both were auto-answered by the develop-next directive, so the required-count check is met
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 ran inline: the path came from the develop-next selector, so no Explore agents were dispatched (Agents 1–3 not dispatched; inline is a first-class case)
- PIPELINE_MODE = standard. Inputs: risk_level absent (risk_ok = true), phase_count 5 (not < 3), single_module false (shared/resources, create-task, review-task)
- Always-load files resolved: 3 files, from skills-config.yaml `devLoadAlwaysFiles`
- Task status at start: `Planned`. Step 2 (`/review-task`) validates it and promotes it
- Tracker: github, issue #480
- Branch: `feature/task.150.create-task-authoring-evidence` from `develop` at `f88a997f`, pushed with tracking. Implementation report stashed before branch creation and restored after
- Tracker comment (work-started): posted. GitHub board: work-started → transitioned. Priority P2 default block not run: board Priority already reads `P2 Medium` (verified by GraphQL)

### Step 2 — review-task

- review-task output: Comprehensive report (auto-answered; required for the pipeline audit trail). Step 0a skipped: already on `feature/task.150.*`
- Review report: `docs/tasks/task.150.create-task-authoring-evidence/task.150.review.1.create-task-authoring-evidence.md`. READY TO IMPLEMENT, 9/10, 0 critical / 2 important / 3 optional
- review-task Step 8.5 auto-answered: Yes, apply all critical + important fixes. All 5 findings were applied to the task and plan docs, including the optionals
- review-task Step 9 auto-answered: Yes, fixes complete. Planned promoted to Ready for Development
- Open Questions 1–4 took the task's own stated defaults (bound 100; the review-time gate is a follow-up; one task; write the rubric effort)
- Pre-pass Agents B/C not dispatched; the review ran inline, so there was no independent reader (independence loss recorded in the review report)
- Tracker key unchanged at re-read (#480); work-started not re-fired
- Review outcome comment posted to github issue 480 (stage `review-task` posted; stage `review` posted)
- Key design correction for Step 3: `describeCardScope` keys on `result.titleChecked`, not an options argument (review I1); the new review-task check is **13**

### Step 3 — develop

- Pre-develop surface map: 11 authored files identified in shared/resources (jira-sync.js, card-preflight.js, authoring-card-preflight.md, 2 tests), create-task (SKILL.md, scripts/lib.js, tests/), review-task (SKILL.md), tests/, CHANGELOG. Built inline during Step 2's anchor verification. No Explore agent was dispatched (independence loss recorded)
- Plan file found: `task.150.plan.create-task-authoring-evidence.md`, included as implementation context for /develop
- Step 3 inline — /develop not invoked: the plan names every hunk and the surface map was already recorded (both preconditions of §"Inline implementation" hold). The Task Completion Checklist was satisfied inline, including the one Change Log row
- Fast gate: `develop.fastGateCommand` unset, so the default `npm run ci:fast` applies. The precondition passed (the script is defined)
- Planned/Draft gate: n/a (status Ready for Development from Step 2)
- Deviation: the legacy-title allowlist has 43 ids (M1 re-run at `f88a997f`; task.158 is new), not the plan's 42
- Deviation: review-task gains check **13** (task.151 added 10–12). The § 3.5 bullets go after obs #170, the last Critical bullet
- Loop audit run inline (no Explore dispatch): all 38 checkboxes are `[x]` and status is `ready-for-review`, so the loop exited at iteration 1
- Development completion comment posted to github issue 480 (see below)

#### Mutation proofs (each: snapshot → mutate → named test red → restore → green)

| # | Fix | Mutation | Red test | Restored |
| - | --- | -------- | -------- | -------- |
| 1 | title check wired into `preflight()` | drop the `checkCardTitle` append | `card-preflight.test.mjs` 101-char, `--strict`, story/epic cases | green |
| 2 | bound is `>` not `>=` | `<=` → `<` in `checkCardTitle` | `card-preflight.test.mjs` exactly-100 boundary | green |
| 3 | legacy ratchet: new long title | drop id 158 from `LEGACY_LONG_TITLES` | `card-preflight-corpus.test.mjs` ratchet (names task.158) | green |
| 3b | legacy ratchet: list only shrinks | add id 150 (a short title) | same ratchet (stale half) | green |
| 4a | § 3.5 obs #127 rule | remove its key | `create-task-authoring-evidence.test.js` § 3.5 #127 | green |
| 4b | § 3.5 obs #124 rule | remove its key | same file, § 3.5 #124 | green |
| 4c | § 3.5 obs #135 rule | remove its key | same file, § 3.5 #135 | green |
| 4d | Section 3 obs #127 paragraph | remove its key | same file, Section 3 #127 | green |
| 4e | review-task check 13 | remove its key | same file, Step 3 #135 | green |
| 5 | section-scoped, not file-scoped | move the obs #135 bullet into § 4 | same file, § 3.5 #135 | green |
| 6 | park vector carries `--parked-until` | drop it from `park[]` | `from-observation.test.js` round trip | green |
| 7 | non-open entry refused | disable the status guard | `from-observation.test.js` refusal | green |
| I1 | scope line keys on `titleChecked` | `const what = false` | `card-preflight.test.mjs` scope tests | green |

Mutation 2 and I1 also turned `every generated copy … identical` red, because the mutated source differed from its bundled copies. That is incidental: the named test went red too.

#### Behavioural evidence (hand run — not held by CI)

task.123's first committed draft is `e0881adb` (`git log --diff-filter=A`). It names `qa_cycles_completed` at lines 55, 81 and 95. `git grep -n qa_cycles_completed e0881adb -- ':!docs/tasks'` returns 0 hits, so applying the new § 3.5 obs #127 bullet ("Grep each one now") flags all three as `(unverified)`. At HEAD the only hit outside `docs/tasks` is the new rule's own worked example in `skills/create-task/SKILL.md`.

### Step 4 — create-pr

- SCOPE_PATHS (33): the work-item dir, CHANGELOG.md, docs/reference, shared/resources (+ tests), skills/create-task (+ scripts, references), skills/review-task, and the 23 skills' `references/` dirs that carry a bundled `jira-sync.js` / `card-preflight.js` / `authoring-card-preflight.md`. The two new test files sit in directories with no tracked change, so they were named explicitly as extra `--scope` paths, per the Step 4 doc
- Pre-flight guard: 0 out-of-scope untracked files held
- /commit-changes (via /create-pr, scope mode): 3 commits. `39d4a3d8` feat(card-preflight), `5e682223` feat(create-task), `3284b7a6` docs(task.150). The pre-commit bundle reported the known `shared/resources/<name>` warning, which was already there before this change
- PR created: https://github.com/Gamaroff/agent-skills/pull/512 (base `develop`, `Closes #480`)
- Leak check over the 3 commits: OK (no path outside SCOPE_PATHS)
- Issue #480 PR-opened comment: posted. GitHub board: in-review → stage-disabled (the `in-review` moment is not configured in this repo's ladder)
- Post-PR state check (inline `gh pr view`): PR #512 state = OPEN, errors = 0
- Lock `pr_url` set

### Steps 5–6 — QA loop

- Traceability mapper not dispatched: `HAS_SUCCESS_CRITERIA_TABLE = false` (Success Criteria is a checklist)
- QA-start board re-assert: `in-review` → stage-disabled
- QA Cycle 1 — changes-requested: stage-disabled
- Cycle 1 third-strike and narrowing checks: n/a at cycle 1 (below-cycle-floor)
- qa-fix cycle 1: findings ingested inline, not by the ingester subagent. The same session wrote gate 1, so the ingester would have re-read what was already in context (independence loss recorded). The Change Log row is deferred to loop exit (one row per loop, the task.151 precedent)
- The commit followed `/commit-changes`' scope-mode procedure inline (explicit paths, implementation report unstaged) instead of re-invoking the skill
- Post-fix PR state (inline `gh pr view`): OPEN at `f471f3fd`
- QA Cycle 2 — changes-requested: stage-disabled. Third strike: `lib.js` HIGH in gates 1 and 2 (2 strikes, not 3). Chose to replace, not patch, to avoid a third. Narrowing offer: false (HIGH not 0)
- QA cycle 2 ran as a refute pass (REFUTE_PASS) plus a safety re-probe (SAFETY_REPROBE by judgement, clause 2: the prior gate failed on a boundary). Run record `task.150.qa.2.security.run.json` (30 probes)
- qa-fix cycle 2: findings ingested inline (same session wrote gate 2). The Change Log row is still deferred to loop exit
- Post-fix PR state (inline `gh pr view`): OPEN at `701e5e4e`

### Operator decision after the escalation — 2026-09-28

- The operator chose option 1: "go ahead". Fix the root in `observation-log.js`, key create-task on `file`, and resume at 5a with 2 more cycles
- The fix was made **outside the QA loop**, as an operator-directed fix (HALT option 1). It is not a QA cycle, writes no gate, and its evidence is in bug 4's Developer Fix Cycle. The next QA cycle (4) reviews it
- Engine: `findAllById`; `set-status` refuses `ambiguous-id` and takes `--expect-status` (`status-changed`); contract table updated. Seed: `--expect-status open` on every vector; the agreement check reads the raw id from the file text. Prose: § 1.1 selects by `file`, and § 5 relies on the engine check
- Tests: 2 engine and 2 seed, all mutation-proved (5 mutations). `ci:fast` 4393 pass / 0 fail; `bundle:check` 0 problems; `validate` passes on create-task and observe-work
- Scope note: `shared/resources/observation-log.js` is outside the task's original file list. It is recorded in the task's Files Summary (5a) and Implementation Summary

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- QA Cycle 3: the convergence check tripped (HIGH 1, 1, 1). This is a terminal HALT, handed to the operator; see the escalation entry in QA Iteration History. Tracker `blocked` stage signalled
- The code-review subagents (3) and the security probes ran independently. The findings ingester and pre-develop Explore were run inline (independence loss recorded in each step's Decisions Log)

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-09-28
**Gate Result**: FAIL
**Issues Found**: 2. TASK-150-BUG-1 (HIGH): the seed id guard is present but inert, and 6 malformed ids are accepted and converted. TASK-150-BUG-2 (MEDIUM): the seed's status read diverges from the engine's `statusOf`. Also 4 advisory code-review bugs and 2 cleanups
**HIGH findings**: 1
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)
**Fixes Applied**: BUG-1: the strict `observationId()` guard (12 refused and 3 accepted ids tested). BUG-2: the engine's `statusOf` is reused. CR-3: the § 5 park block runs the seed's vector verbatim. CR-4: § 1.1 step 3 re-sources the resolver. Both new tests were mutation-proved red on the pre-fix `lib.js`. Fast gate: `ci:fast` 4387 pass / 0 fail on attempt 1
**Commit**: `f471f3fd`

### QA Cycle 2 — 2026-09-28
**Gate Result**: FAIL
**Issues Found**: 1. TASK-150-BUG-3 (HIGH): on the scan path the seed's id is not the id `set-status` parks. Scan `parseInt`s the id and `findById` keys on the filename prefix; reproduced with real scan output. BUG-1 and BUG-2 are closed for their stated inputs. Advisory: CR-3 (park overwrites an entry that changed since selection), CR-4, CR-5, CR-6
**HIGH findings**: 1
**MEDIUM findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)
**Fixes Applied**: BUG-3, a **replace move** (the frontmatter-id mechanism had HIGH in gates 1 and 2): identity is the scan entry's `file` prefix, the frontmatter id must agree, and duplicates and unsafe integers are refused. A test driven by real scan output was added. Mutation-proved 4 ways. Also refute CR-3 (re-scan before parking), CR-4, and CR-6 (the ratchet uses `checkCardTitle`). Fast gate: `ci:fast` 4389 pass / 0 fail on attempt 1
**Commit**: `701e5e4e`

### QA Cycle 3 — 2026-09-28
**Gate Result**: FAIL
**Issues Found**: 2. TASK-150-BUG-4 (HIGH): `set-status` parks the first same-prefix file in the whole log, so an actioned sibling is overwritten while the target stays open (reproduced). CR3-2 (MEDIUM): the § 1.1 selection and the § 5 re-check key on the scan `id`, not the `file`. BUG-3 is closed (the real-scan re-probe engages 12/12)
**HIGH findings**: 1
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop not converging

### QA Loop Not Converging — 2026-09-28

The pipeline stopped after 3 qa-task/qa-fix cycles: the HIGH finding
count failed to strictly decrease across two consecutive cycles, so the
loop was no longer converging. The remaining findings are NOT accepted —
they are handed over below.

**Final gate status**: FAIL (70/100)
**HIGH findings per cycle**: 1, 1, 1 — flat from cycle 1 onward
**Remaining issues** (from final gate file):
- TASK-150-BUG-4 (high, `skills/create-task/scripts/lib.js`): the duplicate refusal covers only the selected entries. `findById` returns the first file in the whole log whose prefix matches, so `0005-a-actioned.md` is overwritten to `parked` while `0005-b-target.md` stays open, and `set-status` reports `ok`
- TASK-150-CR3-2 (medium, `skills/create-task/SKILL.md`): the § 1.1 selection and the § 5 step 2b re-check match on the scan `id` (the frontmatter, `parseInt`-ed), while the vector resolves by file prefix

**What was attempted per cycle**:
- Cycle 1: the seed's id guard was tightened from `Number()` to a strict positive-integer string check (BUG-1); status is read through the engine's `statusOf` (BUG-2); the park block uses the seed's vector, and the resolver is re-sourced (CR-3, CR-4)
- Cycle 2: a replace move. Identity is keyed on the scan entry's file prefix (what `findById` resolves), the frontmatter id must agree, and duplicates among the selected entries and unsafe integers are refused (BUG-3). A re-scan was added before parking (refute CR-3). The ratchet uses `checkCardTitle` (CR-6)
- Cycle 3: no fix. The convergence check tripped

**Likely root cause**: every HIGH was in one mechanism, `--from-observation`'s mapping from "the entry I selected" to "the entry `set-status --id N` changes". Each cycle closed the mapping one layer further out: the raw value, then scan's coercion, then whole-log ambiguity. The layer still open is in the **engine**, not the seed. `findById` silently picks the first of several matching files, and `set-status` never reads the current status. A seed-side check can only approximate that, because the seed sees the selected entries, not the log. Patching `lib.js` a fourth time would add another approximation.

**Recommended next steps**:
1. Fix the root in `shared/resources/observation-log.js`. `findById` reports every match, and `set-status` (and every `--id` command) refuses with `reason: ambiguous-id`, exit 1, when more than one file matches. Add the two-file fixture to `observation-log.test.mjs`. This protects observe-work's own `set-status` callers too, and they have the same exposure on develop today
2. In create-task § 1.1 and § 5 step 2b, key the selection and the re-check on the scan entry's `file`. Then resume with `/develop-task` → "Resume at 5a with 2 more cycles"
3. Alternatively, split Phase 4 (`--from-observation`) into its own task, as the task's Open Question 3 already allows, and land Phases 1–3 and 5, which QA has found clean for 3 cycles

---

## Completion

**Finished**: 2026-09-28 (halted at Steps 5–6)
**Final Status**: Escalated (QA loop not converging, cycle 3)
**Branch**: `feature/task.150.create-task-authoring-evidence`
**PR**: https://github.com/Gamaroff/agent-skills/pull/512
**QA Iterations**: 3 (2 qa-fix cycles)
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}
