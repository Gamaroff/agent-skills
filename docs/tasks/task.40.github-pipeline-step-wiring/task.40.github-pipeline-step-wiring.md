---
id: task.40
title: "Replace the five inline GitHub GraphQL board blocks with gh-stage.js calls"
type: task
description: "Rewrite the hardcoded gh api graphql board-move blocks in the develop pipeline step files and finalise as one-line gh-stage.js invocations, fixing the false-pass post-condition and the case-sensitive Done match on the way."
tags: [github, pipeline, refactoring, step-files]
category: refactoring
status: ready-for-review
priority: High
created: 2026-08-03
updated: 2026-08-12
assignee:
estimated_effort_hours: 16
github_issue: 188
---

# Technical Task: Wire `gh-stage.js` into the pipeline step files

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.40.review.1.github-pipeline-step-wiring.md` implemented 2026-08-12

**GitHub Issue:** [#188](https://github.com/Gamaroff/agent-skills/issues/188)

**⚠️ This is the first task in the series that changes live pipeline behaviour.** Everything before
it is inert.

---

## 1. Overview

Replace the five hardcoded `gh api graphql` board-move blocks — roughly 240 lines of duplicated
prose across the develop pipeline step files and `skills/finalise/SKILL.md` — with one-line
`gh-stage.js` invocations. This is what makes a GitHub consumer's `tracker-workflow.yaml` actually
drive its board.

**Scope**: `shared/resources/develop-pipeline-step-{0,4,5-6,7}*.md`,
`shared/resources/develop-pipeline-lite-mode.md`, `skills/finalise/SKILL.md`, plus the regenerated
`skills/*/references/` bundles.

---

## 2. Motivation

### Current Problems

1. **Five copies of the same two GraphQL calls**, each independently edited, each able to drift.
2. **Three different matching disciplines across them.** Steps 0/4/5-6/7 use `ascii_downcase`;
   `skills/finalise/SKILL.md:1061` uses case-**sensitive** `name == "Done"`, so a board with a
   lowercase `done` option silently skips there and works everywhere else.
3. **The step files tell users to edit them.** `develop-pipeline-step-4-create-pr.md:237` instructs
   the reader to hand-edit `select(.name == "In Review")`. Its removal is the acceptance criterion
   for this task.
4. **The post-condition check can report success on failure.**
   `develop-pipeline-step-0-resolve-and-prepare.md:497` tests `[ "$BOARD_STATUS" = "Todo" ]`, so a
   board whose first column is "Backlog" gets "✅ Post-condition verified" after a failed move.
5. **Dead code.** `develop-pipeline-step-4-create-pr.md:182` computes `BOARD_NUM` and never uses it.
6. **No board move is retried.** `tracker_call_with_retry` wraps `gh issue` calls but not a single
   board mutation.

### Benefits

1. **A consumer's declared ladder finally drives its GitHub board.**
2. **One matching discipline**, so the finalise case-sensitivity bug disappears.
3. **~240 lines of prose deleted**, and the remaining calls read identically to the Jira ones.
4. **A real post-condition** — did we land on the option we asked for — instead of a literal
   comparison against one board's first column.
5. **Board mutations gain retries** for the first time.

---

## 3. Technical Background

### Current Architecture

| Site | Lines | Target literal |
| --- | --- | --- |
| `develop-pipeline-step-0-resolve-and-prepare.md` | 362-513 | `ascii_downcase == "in progress"` |
| `develop-pipeline-step-4-create-pr.md` | 174-239 | `ascii_downcase == "in review"` |
| `develop-pipeline-step-5-6-qa-loop.md` | 39-106 | `ascii_downcase == "in review"` |
| `develop-pipeline-step-7-finalise.md` | 165 | prose: "same pattern but `ascii_downcase == "done"`" |
| `skills/finalise/SKILL.md` | 1114-1190 | `name == "Done"` (**case-sensitive**, at `:1152`) |

> **Line numbers verified 2026-08-12** (review 1). They were authored on 2026-08-03 and had drifted —
> the `finalise/SKILL.md` citation was wrong by ~90 lines and pointed at a *Jira* candidates list.
> Re-verify before each phase: Phase 1's own edits shift the numbers for Phases 2-5.

Step 0's block additionally carries three concerns the others do not: `gh project item-add` with a
propagation retry, a Priority-→-P2-when-unset mutation, and the post-condition check.

### Target Architecture

```bash
node .agents/skills/{develop-story|develop-task|develop-bug}/references/gh-stage.js \
  --issue {TRACKER_ISSUE} --stage in-review --json
```

Identical in shape to the adjacent `jira-stage.js` calls, so a reader sees one pattern for both
trackers.

> **`skills/finalise/SKILL.md` is the exception and must use its own path:**
>
> ```bash
> node .agents/skills/finalise/references/gh-stage.js \
>   --issue {github_issue} --stage done --json
> ```
>
> `finalise` is a standalone skill with its own `references/` bundle — the brace list above does not
> cover it. Note that `jira-stage.js` reaches `skills/finalise/references/` only *transitively* (via
> `jira-transition-protocol.md` and `tracker-workflow.js`); `finalise/SKILL.md` never names it. So
> `gh-stage.js` will only be bundled into `finalise` because Phase 4 makes the skill reference
> `shared/resources/gh-stage.js` directly. Verify it lands there after `npm run bundle`.

### Important Clarifications

- **The Priority-→-P2 mutation is a different concern** that merely shares a GraphQL response. Do
  not fold it into `gh-stage.js`. Either delegate it to `set-github-project-priority.sh` (which
  already derives priority from labels and needs only a skip-if-already-set path) or leave that
  block inline and strip out only the Status half.
- **`item-add` belongs at `work-started` only**, behind `--add-to-board`. Board membership is not
  board status.
- **Step 5-6 must not pass `--allow-regress`.** Today it force-writes "In Review" over whatever the
  card is on. With the guard, a card a human already advanced to "Ready for Showcase" correctly
  refuses to be pulled back. That is a behaviour change and it is the desired one.

---

## 4. Scope

### In Scope

✅ All five sites rewritten as `gh-stage.js` calls, in rising blast-radius order.
✅ Delete the hand-edit instruction at step-4:237 and the dead `BOARD_NUM` at :182.
✅ Delete the false-pass post-condition at step-0:497; `gh-stage.js` re-reads and reports.
✅ Fix the case-sensitive `"Done"` at `finalise/SKILL.md:1061` by construction.
✅ Preserve `/finalise`'s "not on any board → post a PR comment" escalation, branching on
`reason: "not-on-board"`.
✅ `develop-pipeline-lite-mode.md:32` prose updated to name the CLI.
✅ A grep guard test: zero co-occurrences of `updateProjectV2ItemFieldValue` with a `"Status"`
literal in shipped markdown, paired with positive assertions that each step invokes the CLI.
✅ `npm run bundle` and the regenerated `references/` copies committed.

### Out of Scope

❌ **Jira invocations** — unchanged; their flags do not change.
❌ **New moments** — task.41.
❌ **The Priority / Estimate board fields** — see the clarification above.
❌ **`project.yml` migration.**

---

## 5. Breaking Changes

### Behavioural change 1: backward moves are now refused

**What changed**: every GitHub board move is guarded by ladder rank.

**Before**: step 5-6 unconditionally force-wrote "In Review" at QA start.

**After**: a card already at a higher-ranked column stays put and logs `would-regress`.

**Impact**: any consumer whose humans move cards ahead of the pipeline. This is the desired
behaviour and the reason the guard exists on a tracker with no workflow to refuse anything.

**Migration path**: `--allow-regress` exists for a deliberate reset. Document the new log line.

### Behavioural change 2: `finalise`'s Done match becomes case-insensitive

**What changed**: `name == "Done"` → the shared case-insensitive matcher.

**Impact**: strictly widening — it can only start working where it used to skip, never move a card
somewhere different. No migration needed.

### Behavioural change 3: the post-condition no longer false-passes

**What changed**: "is the board status literally `Todo`?" → "did we land on the option we asked
for?".

**Impact**: boards whose first column is not "Todo" stop reporting success after a failed move.
Some runs that looked clean will now correctly warn.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.40.plan.github-pipeline-step-wiring.md](task.40.plan.github-pipeline-step-wiring.md)

### Phase 1: Step 4 — smallest blast radius

**Risk Level**: Low

**Files**: `shared/resources/develop-pipeline-step-4-create-pr.md`

**Changes**:

- [x] Replace L174-239 with `--stage in-review --json`
- [x] Delete the hand-edit paragraph at L237; replace with a pointer to `tracker-workflow.yaml` and
      `--probe-board`
- [x] Delete the unused `BOARD_NUM` at L182
- [x] Update the Decisions Log line to report the CLI's reason

**Dependencies**: task.39

---

### Phase 2: Step 5-6 — idempotent re-assert

**Risk Level**: Low

**Files**: `shared/resources/develop-pipeline-step-5-6-qa-loop.md`

**Changes**:

- [x] Replace L39-106 with `--stage in-review --json`; **no `--allow-regress`**
- [x] Drop the hand-rolled `if [ "$CURRENT_STATUS" = "in review" ]` short-circuit at L76-77 — now `already`
- [x] State in prose that a card a human advanced further will correctly refuse to be pulled back

**Dependencies**: Phase 1 (proves the shape). Step 4 already performs this move, so a failure here
is masked — which is why it goes second.

---

### Phase 3: Step 0 — the largest block

**Risk Level**: High

**Files**: `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`

**Changes**:

- [x] Replace the Status half of L362-513 with `--stage work-started --add-to-board --json`
- [x] ~~Move `item-add` + `sleep 3` + retry-after-5s into `gh-stage.js`'s `ensureOnBoard`~~ — **already
      done by task.39**. `ensureOnBoard` is at `shared/resources/gh-stage.js:498` and ports the dance
      verbatim (`sleepMs(3000)` at :525, the single retry `sleepMs(5000)` at :528). `--add-to-board` is
      all this phase needs; **Phase 3 is markdown-only**, no JS edits.
- [x] Keep the Priority-→-P2 mutation as a separate step or delegate to
      `set-github-project-priority.sh` (confirmed: `gh-stage.js` contains zero references to
      `Priority`, so the CLI will not do this for you)
- [x] Delete the post-condition block at L492-503 (the false-pass `[ "$BOARD_STATUS" = "Todo" ]` is
      at L497)
- [x] Update the report table row

**Dependencies**: Phase 2

---

### Phase 4: Step 7 and `/finalise`

**Risk Level**: High

**Files**: `shared/resources/develop-pipeline-step-7-finalise.md`,
`skills/finalise/SKILL.md`, `shared/resources/develop-pipeline-lite-mode.md`

**Changes**:

- [x] Step 7 L165 prose → an explicit `--stage done --json` call
- [x] `finalise/SKILL.md` L1114-1190 → the same call (using the `finalise`-local path, see §3);
      the case-sensitive `name == "Done"` at **L1152** is fixed by construction
- [x] Branch on `reason: "not-on-board"` to keep the PR-comment escalation currently at
      `finalise/SKILL.md:1154` — `/finalise` is the one caller that treats a board miss as
      noteworthy, and that decision belongs in the skill
- [x] Reorder `/finalise` so the stage call runs **before** the `sync-jira-{story,task}.js` re-run,
      so the sync's own transition resolves to `already`; the workflow file becomes the single
      resolver
- [x] `lite-mode.md:32` prose names the CLI

**Dependencies**: Phase 3

---

### Phase 5: Guards, bundle, docs

**Risk Level**: Low

**Files**: `evals/shared/tests/transition-protocol-parity.test.mjs`, `CHANGELOG.md`, all
`skills/*/references/` bundles

**Changes**:

- [x] Grep guard: zero `updateProjectV2ItemFieldValue` + `"Status"` co-occurrences in shipped
      markdown, **paired** with positive assertions that each step invokes `gh-stage.js --stage X`
- [x] Extend the `--stage` literal scan to cover the new call sites
- [x] `npm run bundle`; commit regenerated `references/`
- [x] `CHANGELOG.md` `### Changed` + `### Fixed`

**Dependencies**: Phases 1-4

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/develop-pipeline-step-4-create-pr.md`
2. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md`
3. ✅ `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`
4. ✅ `shared/resources/develop-pipeline-step-7-finalise.md`
5. ✅ `shared/resources/develop-pipeline-lite-mode.md`
6. ✅ `skills/finalise/SKILL.md`

### Files Modified — Actual (2026-08-12)

Beyond the six above, this run also touched:

7. ✅ `evals/shared/tests/transition-protocol-parity.test.mjs` — 4 new guards (all mutation-tested)
8. ✅ `CHANGELOG.md` — `### Changed` (3 entries) + `### Fixed` (3 entries)
9. ✅ `skills/develop-task/README.md`, `skills/develop-story/README.md` — tracker-integration tables
10. ✅ `.github/workflows/validate.yml` — bundle-freshness check (mitigates the Critical bundle-drift risk in §10)
11. ✅ `tracker-workflow.yaml` — header comment said the GitHub path was "not live yet"; it is now
12. ✅ 20 regenerated `skills/*/references/*` bundle copies across `develop-{story,task,bug}`, `qa-{story,task}`, `finalise`

### Files to Modify (Tests)

7. ✅ `evals/shared/tests/transition-protocol-parity.test.mjs`
8. ✅ `evals/develop-story/protocol/*.test.mjs`, `evals/develop-task/protocol/*.test.mjs` — keyword
   expectations for the rewritten steps

### Files to Modify (Documentation)

9. ✅ `CHANGELOG.md`
10. ✅ `skills/develop-{story,task}/README.md` — the tracker-integration tables still describe the
    pre-v0.34.0 world

### Files to Delete

None outright — the deletions are prose blocks inside the files above. Roughly 240 lines removed.

### Bundle Fan-out (verified 2026-08-12)

The phase lists name only `shared/resources/*`, but each edited step file is bundled into several
skills, so `npm run bundle` regenerates more than the phases suggest. Current counts of
`develop-pipeline-step-*` files per skill:

| Skill | step files bundled |
| --- | --- |
| `develop-story` | 8 |
| `develop-task` | 8 |
| `develop-bug` | 6 (includes step-4 and step-7 — inherits two of the five rewrites) |
| `qa-story` | 3 |
| `qa-task` | 3 |
| `finalise` | 0 (gains `gh-stage.js` only once Phase 4 references it — see §3) |

`develop-bug` has its own `develop-bug-step-5-6-verify-loop.md` rather than the shared QA-loop file,
which is exactly why it never signals `in-qa` (see Known Issues).

---

## 8. Testing Strategy

### Unit Tests

**Scope**: markdown-level guards (there is no unit-testable code in a step file)

**Actions**:

- [x] No `updateProjectV2ItemFieldValue` + `"Status"` co-occurrence in shipped markdown
- [x] Each of the five sites invokes `gh-stage.js --stage <known moment>`
- [x] The step-4 hand-edit paragraph is gone
- [x] `tests/executable-instructions.test.js` accepts the `{a|b|c}` brace form for the new path, as
      it already does for `jira-stage.js`

**Command**: `npm test`

---

### Integration Tests

**Scope**: the pipeline protocol evals

**Actions**:

- [x] `evals/develop-{story,task}/protocol/` step-contract expectations pass unchanged
- [x] Bundled `references/` copies are regenerated and the bundle is idempotent

---

### Contract Tests

**Scope**: nothing regresses for a consumer without a ladder

**Actions**:

- [x] With no `tracker-workflow.yaml`, the default ladder targets the same three columns the
      literals used to name
- [x] Exit codes: every documented skip keeps the pipeline running

---

### Performance Tests

**Scope**: `gh` invocations per pipeline run

**Baselines**: today ≈ 6-8 `gh` calls across the five sites, plus a post-condition read.

**Expectations**: a net reduction — one read + one mutation + one verify per move, `item-add` once.

---

### Consumer Tests

**Scope**: a real end-to-end run

**Actions**:

- [x] `--dry-run` at each of the five sites against a real issue (#188), before any real run —
      all three moments exit 0; `work-started` → `already` (card was on In Progress), `in-review` →
      `stage-disabled`, `done` → resolves to `Done`
- [x] `--probe-board --issue 188` against the live "Agent Skills" board (#1) reproduces this repo's
      own `tracker-workflow.yaml` exactly: `work-started → "In Progress"`, `done → "Done"`, and the
      six unmapped moments reported `disabled`. **This is the headline criterion demonstrated on a
      real board** — the ladder, not a step-file literal, decides where a card lands
- [ ] One full `/develop-task` run against a *scratch* board with deliberately bespoke column names
      (`Backlog / In Development / Ready for Showcase / Shipped`) — **deferred**, needs a throwaway
      Projects v2 board that does not exist yet. The three-column live board above exercises the same
      code path; what the scratch board would add is proof against *non-default* column names
- [ ] Confirm a card manually advanced past the pipeline is not pulled back at QA start —
      **deferred with the scratch board**; requires a board with a rung above `in-review` to advance
      a card to, and this board has none (`in-review` is disabled here)

---

## 9. Success Criteria

### Functional

- [x] All five sites call `gh-stage.js`; no inline board Status GraphQL remains in shipped markdown
- [x] The hand-edit instruction at step-4:237 is gone
- [x] A consumer's `tracker-workflow.yaml` demonstrably changes where cards land
- [x] `/finalise` still escalates on `not-on-board`
- [x] A backward move is refused at QA start

### Performance

- [x] Fewer `gh` invocations per run than today
- [x] `item-add` fires once, at `work-started`

### Code Quality

- [x] Edits made in `shared/resources/` only (plus skill-native `skills/finalise/SKILL.md`); `references/` regenerated by `npm run bundle`
- [x] The grep guard is paired with a positive assertion — v0.33 records a guard that failed by
      asserting absence alone and flagged the sentence that got it right
- [x] Step files read identically for both trackers

### Migration

- [x] `CHANGELOG.md` records all three behavioural changes and why each is correct
- [x] The two stale READMEs updated
- [x] Regenerated bundles committed in the same commit as their sources

---

## 10. Risk Assessment

### High Risk Areas

**1. Step 0 carries three concerns, and untangling them breaks one**

- **Risk**: `item-add`, the Priority side-effect and the post-condition all share one GraphQL
  response. Separating them can silently drop the Priority default or the propagation retry.
- **Probability**: Medium
- **Impact**: Critical (a card never added to the board gets no tracker updates at all)
- **Mitigation**: Step 0 goes third, after the shape is proven twice. Keep the Priority block inline
  if delegating it proves invasive. Port the `item-add` dance verbatim rather than reinventing it.
- **Rollback**: revert the step-0 hunk alone; each site is a self-contained fenced block.

**2. Bundle drift ships a broken install**

- **Risk**: `shared/resources/` edited without `npm run bundle`, so shipped skills reference a file
  that is not in their `references/`. CI checks the catalog, not bundle freshness;
  `scripts/release.sh:184` catches it only at release time.
- **Probability**: Medium
- **Impact**: Critical
- **Mitigation**: bundle in the same commit; add
  `npm run bundle && git diff --exit-code -- 'skills/*/references/*'` to CI.

### Medium Risk Areas

**1. The guard surprises users mid-run**

- **Risk**: cards stop being force-moved at QA start; a team reads that as the pipeline breaking.
- **Probability**: Medium
- **Impact**: Minor
- **Mitigation**: `would-regress` is an explicit, self-explaining log line; state the change in the
  step file prose and the changelog.

**2. `/finalise` reordering changes an observable sequence**

- **Risk**: moving the stage call before the sync re-run changes which component reports Done first.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: the second caller resolves to `already` and no-ops. Assert that finalise and
  step 7 name the same moment — that drift has already happened once (v0.34.0 records step 7
  double-firing Done).

### Low Risk Areas

**1. Protocol eval keyword expectations go stale**

- **Mitigation**: update them in the same commit; they are the mechanism that catches this class.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: cards not moving on a board that worked before; a card moved to the wrong column; a
non-zero exit killing a pipeline step.

**Steps**:

1. `git revert` the offending phase's commit — each site is a self-contained block
2. `npm run bundle`
3. `npm test`
4. Re-run one pipeline against a scratch board

**Verification**: a full `/develop-task` run moves the card through the expected columns.

---

### Partial Rollback (1-2 hours)

**When to Use**: one site misbehaves. Revert that phase only; the phases are independent and were
sequenced for exactly this.

---

### Forward Fix (< 4 hours)

**When to Use**: log wording, Decisions Log phrasing, doc gaps, eval keyword updates.

---

### Rollback Triggers

**Critical**: a card in the wrong column; a killed pipeline step; a shipped bundle referencing a
missing file.

**Non-Critical**: log wording, report-table text, README staleness.

---

## Progress Tracking

### Phase 1: Step 4

- [x] CLI call in place; hand-edit paragraph and dead `BOARD_NUM` deleted

### Phase 2: Step 5-6

- [x] CLI call, no `--allow-regress`; short-circuit dropped

### Phase 3: Step 0

- [x] Status half replaced; `item-add` handled by the CLI's `--add-to-board`
- [x] Priority side-effect preserved; false-pass post-condition deleted

### Phase 4: Step 7 + finalise

- [x] Both call the CLI; `not-on-board` escalation preserved
- [x] `/finalise` reordered so the stage call runs first

### Phase 5: Guards, bundle, docs

- [x] Grep guard + positive assertions (each mutation-tested to prove it bites)
- [x] `npm run bundle`; bundles committed
- [x] CHANGELOG + READMEs

---

## References

- **Depends on**: task.39 (`gh-stage.js`), which depends on task.37
- **Related**: task.41 (new moments wire into these same files)
- **Key sites** (line numbers verified 2026-08-12):
  `develop-pipeline-step-0-resolve-and-prepare.md:362-513` (false-pass post-condition at :497,
  block to delete :492-503), `-step-4-create-pr.md:174-239` (esp. dead `BOARD_NUM` :182, hand-edit
  instruction :237), `-step-5-6-qa-loop.md:39-106` (short-circuit :76-77),
  `-step-7-finalise.md:165`, `skills/finalise/SKILL.md:1114-1190` (case-sensitive `"Done"` at :1152,
  `not-on-board` escalation at :1154)
- **Bundling**: `AGENTS.md` — never edit `skills/*/references/`; `npm run bundle` regenerates

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-08-12
**Quality Score**: 100/100
**Gate Decision**: PASS (cycle 2)
**QA Cycles**: 2

### QA Reports
- **Cycle 1**: [task.40.qa.1.github-pipeline-step-wiring.md](./task.40.qa.1.github-pipeline-step-wiring.md) — CONCERNS 90/100 · [gate.1](./task.40.gate.1.github-pipeline-step-wiring.yml)
- **Cycle 2**: [task.40.qa.2.github-pipeline-step-wiring.md](./task.40.qa.2.github-pipeline-step-wiring.md) — **PASS 100/100** · [gate.2](./task.40.gate.2.github-pipeline-step-wiring.yml)

### Test Coverage Summary
- **Tests Executed**: 1070 passing, 0 failing (baseline 1065; +5 new guards)
- **Phases Verified**: 5/5
- **Critical Issues**: 0
- **NFR Status**: Security PASS, Performance PASS, Reliability PASS, Maintainability PASS

### Key Findings
Cycle 1 found one MEDIUM (`finalise` reason table documented 7 of 13 reachable reasons while the prose told the agent to read `reason`) and three LOW. All addressed in qa-fix cycle 1; cycle 2 verified each and upgraded Reliability CONCERNS → PASS.

Two consumer tests remain deliberately **deferred and unchecked** in §8 — they need a scratch board with bespoke column names; board #1 has three columns and no rung above review, so neither non-default column names nor a live backward-move refusal can be demonstrated here.

---

## Implementation Record## Implementation Record

**Started**: 2026-08-12 · **Completed**: 2026-08-12 · **Branch**: `feature/task.40.github-pipeline-step-wiring`

### Summary

All five inline board blocks now call `gh-stage.js`. Phases ran in the specified blast-radius order (4 → 5-6 → 0 → 7 → guards), with `npm run bundle && npm test` after each — never batched.

### Approach, phase by phase

- **Phase 1 (step 4)** — L174-239 → `--stage in-review --json`. The hand-edit paragraph and the dead `BOARD_NUM` went with it.
- **Phase 2 (step 5-6)** — L39-106 → the same call, deliberately **without** `--allow-regress`. The hand-rolled `CURRENT_STATUS = "in review"` short-circuit is dropped; the CLI's `already` reason covers it.
- **Phase 3 (step 0)** — the three concerns separated. Status → `--stage work-started --add-to-board`. `item-add` + propagation retry needed no work: task.39 already ported it verbatim into `ensureOnBoard`. **Priority kept inline with its own query**, taking the plan's "Acceptable" branch — delegating to `set-github-project-priority.sh` would have swapped P2-when-unset for mirror-the-label, an undocumented fourth behavioural change, and the risk section explicitly prefers keeping it inline over widening scope on the riskiest phase. The false-pass post-condition is deleted, not repaired.
- **Phase 4 (step 7 + finalise)** — both call the CLI; the case-sensitive `"Done"` is fixed by construction. The `not-on-board` escalation is preserved and now branches on `reason`, alongside a table mapping all seven reasons to an action. `/finalise` reordered so the ladder resolves Done before the `sync-jira-*` re-link.
- **Phase 5 (guards, bundle, docs)** — four new tests, CHANGELOG, both READMEs, and a CI bundle-freshness step.

### Discovered during implementation

**The bundler cannot see `.agents/skills/…/references/X` paths.** Writing the call alone left `gh-stage.js` out of every bundle, shipping skills that referenced a file not present in their install — precisely the "bundle drift ships a broken install" risk this task rated Critical, arriving by a route nobody predicted. `bundle_skill.py:178` runs only `collect_shared_refs` (the `shared/resources/X` form) when recursing into shared files; the `references/X` form is matched on *skill* files only. `jira-stage.js` had never hit this because `jira-transition-protocol.md` happens to name its `shared/resources/` path in prose. Each site now names the engine source explicitly, and a fifth guard asserts that any skill invoking the CLI actually bundles it.

**Guards were mutation-tested rather than trusted.** The task warned that v0.33 shipped an absence-only guard that passed vacuously. Each new assertion was verified by injecting the violation it is meant to catch and confirming the suite goes red — inline Status mutation, missing `--stage`, restored hand-edit selector, and deleted bundle each produced exactly one failure, and the baseline restored to 16/16.

### Testing results

| Check | Result |
| --- | --- |
| `npm test` baseline (pre-change) | 1065 passing |
| `npm test` after every phase | green at each of the five gates |
| `npm test` final | **1069 passing, 0 failing** (+4 new guards) |
| Guard mutation tests | 4/4 confirmed to fail on violation |
| Bundle idempotency | re-running `--all` produces a byte-identical diff |
| Live `--dry-run` (issue #188) | all three moments exit 0 with correct reasons |
| Live `--probe-board` | reproduces this repo's ladder exactly against board #1 |

### Deferred

Two consumer tests need a throwaway Projects v2 board with bespoke column names, which does not exist. The live board proved the code path but has only three columns, so it cannot demonstrate non-default column names or a backward-move refusal (`in-review` is disabled here, leaving no rung above it to advance a card to). Both are recorded unchecked in §8 rather than quietly ticked.

---

## Notes

### Important Reminders

- Edit **only** `shared/resources/`. A fix applied to a `references/` copy is silently reverted by
  the next `npm run bundle` — this has happened before.
- Order matters: step 4 → step 5-6 → step 0 → step 7. The first two perform the *same* move, so a
  failure in either is masked by the other. That is why they go first.
- Bundle in the same commit as the source edit.

### Known Issues

**Open** (non-blocking):

- ⚠️ `develop-bug` has no QA-loop step file, so it never signals `in-qa` or `ready-for-merge`.
  Addressed in task.41.
