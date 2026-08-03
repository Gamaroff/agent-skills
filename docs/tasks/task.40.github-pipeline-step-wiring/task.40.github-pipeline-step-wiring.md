---
id: task.40
title: "Replace the five inline GitHub GraphQL board blocks with gh-stage.js calls"
type: task
description: "Rewrite the hardcoded gh api graphql board-move blocks in the develop pipeline step files and finalise as one-line gh-stage.js invocations, fixing the false-pass post-condition and the case-sensitive Done match on the way."
tags: [github, pipeline, refactoring, step-files]
category: refactoring
status: planned
priority: High
created: 2026-08-03
updated: 2026-08-03
assignee:
estimated_effort_hours: 16
---

# Technical Task: Wire `gh-stage.js` into the pipeline step files

**Status:** Planned

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
| `develop-pipeline-step-0-resolve-and-prepare.md` | 364-504 | `ascii_downcase == "in progress"` |
| `develop-pipeline-step-4-create-pr.md` | 178-238 | `ascii_downcase == "in review"` |
| `develop-pipeline-step-5-6-qa-loop.md` | 43-106 | `ascii_downcase == "in review"` |
| `develop-pipeline-step-7-finalise.md` | 165 | prose: "same pattern but `ascii_downcase == "done"`" |
| `skills/finalise/SKILL.md` | 1023-1093 | `name == "Done"` (**case-sensitive**) |

Step 0's block additionally carries three concerns the others do not: `gh project item-add` with a
propagation retry, a Priority-→-P2-when-unset mutation, and the post-condition check.

### Target Architecture

```bash
node .agents/skills/{develop-story|develop-task|develop-bug}/references/gh-stage.js \
  --issue {TRACKER_ISSUE} --stage in-review --json
```

Identical in shape to the adjacent `jira-stage.js` calls, so a reader sees one pattern for both
trackers.

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

- [ ] Replace L178-238 with `--stage in-review --json`
- [ ] Delete the hand-edit paragraph at L237; replace with a pointer to `tracker-workflow.yaml` and
      `--probe-board`
- [ ] Delete the unused `BOARD_NUM` at L182
- [ ] Update the Decisions Log line to report the CLI's reason

**Dependencies**: task.39

---

### Phase 2: Step 5-6 — idempotent re-assert

**Risk Level**: Low

**Files**: `shared/resources/develop-pipeline-step-5-6-qa-loop.md`

**Changes**:

- [ ] Replace L43-106 with `--stage in-review --json`; **no `--allow-regress`**
- [ ] Drop the hand-rolled `if [ "$CURRENT_STATUS" = "in review" ]` short-circuit — now `already`
- [ ] State in prose that a card a human advanced further will correctly refuse to be pulled back

**Dependencies**: Phase 1 (proves the shape). Step 4 already performs this move, so a failure here
is masked — which is why it goes second.

---

### Phase 3: Step 0 — the largest block

**Risk Level**: High

**Files**: `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`

**Changes**:

- [ ] Replace the Status half of L364-504 with `--stage work-started --add-to-board --json`
- [ ] Move `item-add` + `sleep 3` + retry-after-5s into `gh-stage.js`'s `ensureOnBoard` (task.39)
- [ ] Keep the Priority-→-P2 mutation as a separate step or delegate to
      `set-github-project-priority.sh`
- [ ] Delete the post-condition block at L493-500
- [ ] Update the report table row

**Dependencies**: Phase 2

---

### Phase 4: Step 7 and `/finalise`

**Risk Level**: High

**Files**: `shared/resources/develop-pipeline-step-7-finalise.md`,
`skills/finalise/SKILL.md`, `shared/resources/develop-pipeline-lite-mode.md`

**Changes**:

- [ ] Step 7 L165 prose → an explicit `--stage done --json` call
- [ ] `finalise/SKILL.md` L1023-1093 → the same call; case-sensitivity fixed by construction
- [ ] Branch on `reason: "not-on-board"` to keep the PR-comment escalation — `/finalise` is the one
      caller that treats a board miss as noteworthy, and that decision belongs in the skill
- [ ] Reorder `/finalise` so the stage call runs **before** the `sync-jira-{story,task}.js` re-run,
      so the sync's own transition resolves to `already`; the workflow file becomes the single
      resolver
- [ ] `lite-mode.md:32` prose names the CLI

**Dependencies**: Phase 3

---

### Phase 5: Guards, bundle, docs

**Risk Level**: Low

**Files**: `evals/shared/tests/transition-protocol-parity.test.mjs`, `CHANGELOG.md`, all
`skills/*/references/` bundles

**Changes**:

- [ ] Grep guard: zero `updateProjectV2ItemFieldValue` + `"Status"` co-occurrences in shipped
      markdown, **paired** with positive assertions that each step invokes `gh-stage.js --stage X`
- [ ] Extend the `--stage` literal scan to cover the new call sites
- [ ] `npm run bundle`; commit regenerated `references/`
- [ ] `CHANGELOG.md` `### Changed` + `### Fixed`

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

---

## 8. Testing Strategy

### Unit Tests

**Scope**: markdown-level guards (there is no unit-testable code in a step file)

**Actions**:

- [ ] No `updateProjectV2ItemFieldValue` + `"Status"` co-occurrence in shipped markdown
- [ ] Each of the five sites invokes `gh-stage.js --stage <known moment>`
- [ ] The step-4 hand-edit paragraph is gone
- [ ] `tests/executable-instructions.test.js` accepts the `{a|b|c}` brace form for the new path, as
      it already does for `jira-stage.js`

**Command**: `npm test`

---

### Integration Tests

**Scope**: the pipeline protocol evals

**Actions**:

- [ ] `evals/develop-{story,task}/protocol/` step-contract expectations updated and passing
- [ ] Bundled `references/` copies are byte-identical to their `shared/resources/` sources

---

### Contract Tests

**Scope**: nothing regresses for a consumer without a ladder

**Actions**:

- [ ] With no `tracker-workflow.yaml`, the default ladder targets the same three columns the
      literals used to name
- [ ] Exit codes: every documented skip keeps the pipeline running

---

### Performance Tests

**Scope**: `gh` invocations per pipeline run

**Baselines**: today ≈ 6-8 `gh` calls across the five sites, plus a post-condition read.

**Expectations**: a net reduction — one read + one mutation + one verify per move, `item-add` once.

---

### Consumer Tests

**Scope**: a real end-to-end run

**Actions**:

- [ ] `--dry-run` at each of the five sites against a real issue, before any real run
- [ ] One full `/develop-task` run against a scratch board with bespoke column names
- [ ] Confirm a card manually advanced past the pipeline is not pulled back at QA start

---

## 9. Success Criteria

### Functional

- [ ] All five sites call `gh-stage.js`; no inline board GraphQL remains in shipped markdown
- [ ] The hand-edit instruction at step-4:237 is gone
- [ ] A consumer's `tracker-workflow.yaml` demonstrably changes where cards land
- [ ] `/finalise` still escalates on `not-on-board`
- [ ] A backward move is refused at QA start

### Performance

- [ ] Fewer `gh` invocations per run than today
- [ ] `item-add` fires once, at `work-started`

### Code Quality

- [ ] Edits made in `shared/resources/` only; `references/` regenerated by `npm run bundle`
- [ ] The grep guard is paired with a positive assertion — v0.33 records a guard that failed by
      asserting absence alone and flagged the sentence that got it right
- [ ] Step files read identically for both trackers

### Migration

- [ ] `CHANGELOG.md` records all three behavioural changes and why each is correct
- [ ] The two stale READMEs updated
- [ ] Regenerated bundles committed in the same commit as their sources

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

- [ ] CLI call in place; hand-edit paragraph and dead `BOARD_NUM` deleted

### Phase 2: Step 5-6

- [ ] CLI call, no `--allow-regress`; short-circuit dropped

### Phase 3: Step 0

- [ ] Status half replaced; `item-add` moved into the CLI
- [ ] Priority side-effect preserved; false-pass post-condition deleted

### Phase 4: Step 7 + finalise

- [ ] Both call the CLI; `not-on-board` escalation preserved
- [ ] `/finalise` reordered so the stage call runs first

### Phase 5: Guards, bundle, docs

- [ ] Grep guard + positive assertions
- [ ] `npm run bundle`; bundles committed
- [ ] CHANGELOG + READMEs

---

## References

- **Depends on**: task.39 (`gh-stage.js`), which depends on task.37
- **Related**: task.41 (new moments wire into these same files)
- **Key sites**: `develop-pipeline-step-0-resolve-and-prepare.md:364-504`,
  `-step-4-create-pr.md:178-238` (esp. :182, :237), `-step-5-6-qa-loop.md:43-106`,
  `-step-7-finalise.md:165`, `skills/finalise/SKILL.md:1023-1093`
- **Bundling**: `AGENTS.md` — never edit `skills/*/references/`; `npm run bundle` regenerates

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
