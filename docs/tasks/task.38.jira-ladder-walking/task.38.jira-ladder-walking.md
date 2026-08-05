---
id: task.38
title: "Jira: walk the status ladder, and stop the terminal fallback firing on a retargeted done"
type: task
description: "Drive Jira transitions from the tracker-workflow ladder, walking intermediate rungs when the target is not directly reachable, and restrict the done-category fallback to the last rung."
tags: [jira, pipeline, transitions, workflow]
category: refactoring
status: ready-for-review
priority: High
created: 2026-08-03
updated: 2026-08-05
assignee:
estimated_effort_hours: 22
github_issue: 186
---

# Technical Task: Jira — walk the status ladder

**Status:** Ready for Review

**Review**: ⚠️ Revised against `task.38.review.1.jira-ladder-walking.md` — all critical + important
recommendations implemented 2026-08-05.

**GitHub Issue:** [#186](https://github.com/Gamaroff/agent-skills/issues/186)

---

## 1. Overview

Teach the Jira transition path to resolve its target from the `tracker-workflow.yaml` ladder
(task.37) and, when that target is not directly reachable, to walk the intermediate rungs the
ladder already declares. Also fix a live correctness bug: a `done` moment retargeted at a bespoke
column still unlocks the "single transition into the done category" fallback and will fire the
board's real Done transition.

**Scope**: `shared/resources/jira-sync.js`, `shared/resources/jira-stage.js`,
`shared/resources/tracker-workflow.js` (one additive return field),
`shared/resources/jira-transition-protocol.md`, plus tests. No step-file or GitHub changes.

---

## 2. Motivation

### Current Problems

1. **One hop only.** `resolveTransition` (`jira-sync.js:2194`) matches against transitions available
   from where the card sits. A board where Done is reachable only via "Ready for Showcase" skips
   silently.
2. **A missed hop disables everything after it.** Moments resolve from the card's current position,
   so one skipped transition cascades. `jira-stage.js`'s `describeAlternatives` was written
   precisely to diagnose this after the fact — walking removes the cause.
3. **A retargeted `done` fires the wrong transition.** `resolveStage` returns
   `terminal: !!base.terminal` (`jira-sync.js:2028`) from `DEFAULT_STAGE_MAP` with no override path.
   Point `done` at "Ready for Showcase" and rule 4 of `resolveTransition` still fires the single
   done-category transition — a confident wrong transition, which the resolver's own comments call
   out as worse than a skip.
4. **Bespoke columns are unranked**, so the monotonicity guard has no opinion and a resumed run can
   drag a card back out of one. The guard reads `resolveStatusRank` (`jira-sync.js:2035`), which
   consults the JSON record's `statusRank` then `DEFAULT_STATUS_RANK` — and that constant's own
   comment (`:1421-1423`) names "READY FOR SHOWCASE" as the example it deliberately leaves unranked.
   **The ladder is not consulted at all**, so declaring a rung is not currently enough to guard it.
5. **The MCP fallback cannot see any of this.** `jira-transition-protocol.md` hardcodes three
   candidate lists in prose and cannot read a ladder.

### Benefits

1. **A gate column works** — the "Ready for Showcase before Done" case, with no graph authored.
2. **Fewer silent skips**, and the remaining ones are genuinely "this board offers nothing".
3. **The terminal fallback stops misfiring** on retargeted boards.
4. **Bespoke columns become guarded**, because the guard learns to read ladder order as rank.
5. **The credential-free fallback gets the ladder** via a network-free `--print-plan`.

---

## 3. Technical Background

### Current Architecture

```
jira-stage.js --issue K --stage in-review
  └─ resolveStage(stage, issueType, record)      # jira-sync.js:1987 — JSON record
  └─ transitionToStatus({ targetStatus: candidates, minRank: spec.rank, … })   # :2306
       ├─ monotonicity guard (rank via resolveStatusRank — ladder-blind)        # :2373
       └─ resolveTransition({ transitions, candidates, currentStatus, terminal }) # :2194
            1 already · 2 to.name · 3 t.name · 4 terminal-only statusCategory · 5 skip
```

### Target Architecture

```
jira-stage.js --issue K --stage in-review
  └─ resolveMoment(moment, workflow, { issueType })      # tracker-workflow.js (task.37)
  │    → { targets: [...], rank, offLadder, isLastRung }   ← isLastRung is NEW
  └─ walkLadder({ from, targets, workflow, … })          # NEW, jira-sync.js
       hops = [ ...planMove(from, targets[0], workflow).map(r => r.names), targets ]
       for each rung (an ARRAY of candidate names) in hops:
         ├─ already? continue
         ├─ getTransitions()          ← re-fetched after EVERY hop
         ├─ resolveTransition(rung)   ← unchanged; rung is its `candidates`
         └─ no match → stop, report landed + remaining
```

Transitions are position-dependent — the re-fetch after each hop is the entire point.

**Every rung is a list of names, never one name.** `resolveMoment` returns `targets` (plural) and
`planMove` returns `{ names: [...] }` per rung, both in preference order. Collapsing either to
`names[0]` makes every alternative spelling unreachable — a board whose column is "Waiting for
Review" would be sent to "In Review", which is the regression task.37's `targets` exists to prevent.
`resolveTransition` already accepts an ordered candidate list, so the array passes straight through.

### Important Clarifications

- **A partial walk is not a success and not "nothing happened".** It reports
  `{ transitioned: false, reason: "walk-incomplete", landed: "<rung>", remaining: [...] }`, exit 0.
  A reader must be able to tell "the card is parked in the gate" from "the card never moved".
  **A walk aborted by the loop guard reports the same shape** — a cycle is a blocked walk, not a
  completed one, and must never fall through to the success return.
- **No rollback on a partial walk.** A reverse transition may not exist, and attempting one fights
  the guard.
- **The guard runs once, at walk entry**, against the target's rank; intermediate hops pass
  `allowRegress` internally. A per-hop guard against the final rank would refuse the gate itself.
- **Terminality is two conditions, both required.** The moment must be one `DEFAULT_STAGE_MAP` marks
  terminal — today `done` and only `done` (`jira-sync.js:1409-1414`) — **and** its resolved target
  must be the ladder's last rung. Either alone is not enough.
- **Last-rung is decided inside `tracker-workflow.js`, not at the call site.** The ladder in play is
  `ladderFor(workflow, issueType)`, which a `byIssueType` overlay may replace with a ladder of a
  different length. `workflow.ladder` is the *base* ladder and is the wrong thing to measure
  against. `resolveMoment` already resolves the correct ladder, so it returns the answer.
- **Precedence**: ladder file > JSON record > built-in. Both older surfaces keep working.

---

## 4. Scope

### In Scope

✅ `walkLadder` in `jira-sync.js`, built on the existing `getTransitions` + `transitionToStatus`.
✅ An optional `transitions` parameter on `transitionToStatus`, so a walk can supply the list it has
already fetched instead of provoking a second GET per hop.
✅ **Ladder-aware ranking** in the monotonicity guard: ladder first, JSON record second,
`DEFAULT_STATUS_RANK` last — so a declared bespoke rung is finally guarded.
✅ `resolveMoment` additionally returns `isLastRung` (`tracker-workflow.js`) — the one change to the
task.37 engine, additive and computed against the ladder it has already resolved.
✅ `jira-stage.js` resolves its target via `tracker-workflow.js`, falling back to the JSON record.
✅ **Last-rung restriction** on `resolveTransition` rule 4 (the done-category fallback).
✅ Loop guards: one hop per rung; never re-enter a status visited in this walk.
✅ `--print-plan` — credential-free, network-free; prints the resolved hops as JSON.
✅ `--from <status>` — tells `--print-plan` where the card is, without a network call.
✅ `--dry-run` states plainly that it verifies only the first hop.
✅ `jira-transition-protocol.md`: consume `--print-plan`; hard rule that the fallback walks one hop,
never a ladder.
✅ Tests, including a two-hop walk against captured RAPP fixtures — one of which must be captured as
part of this task (see §7 Files to Add).

### Out of Scope

❌ **GitHub** — task.39 / task.40. No graph there, so no walking.
❌ **Step-file edits** — the Jira invocations already exist and their flags do not change.
❌ **New moments** (`changes-requested`, `pr-merged`) — task.41.
❌ **Removing the JSON workflow record** — it stays as a lower-precedence source.
❌ **Any other change to `tracker-workflow.js`** — the additive `isLastRung` field is the whole of
it. Ladder parsing, precedence and validation are task.37's and stay untouched.

---

## 5. Breaking Changes

**None for a consumer with no `tracker-workflow.yaml`** — the built-in default ladder reproduces
current behaviour, and a one-rung walk is byte-identical to today's single hop.

### Behavioural change 1: the done-category fallback narrows

**What changed**: rule 4 of `resolveTransition` now applies only when the target is the ladder's
last rung.

**Before**: `done` retargeted at "Ready for Showcase" → showcase not directly reachable → falls back
to the single done-category transition → **card goes to Done**.

**After**: → no match → skip, with the available transitions listed.

**Impact**: only boards that retargeted `done`, which is the case this narrowing exists to protect.
A skip is recoverable; a wrong terminal transition is not.

**Migration path**: none. If a board genuinely wants the fallback, its target *is* the last rung.

### Behavioural change 2: a previously-skipped moment may now move a card further

**What changed**: where the target was unreachable in one hop, the card now walks to it.

**Impact**: this is the feature. Only affects boards with a ladder declaring intermediate rungs —
i.e. only consumers who authored the file.

**Migration path**: `--dry-run` before adopting; `--print-plan` shows the hops with no network call.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.38.plan.jira-ladder-walking.md](task.38.plan.jira-ladder-walking.md)

### Phase 1: Last-rung restriction on the terminal fallback

**Risk Level**: Medium

**Files**: `shared/resources/tracker-workflow.js`, `shared/resources/jira-sync.js`

**Changes**:

- [x] `resolveMoment` additionally returns `isLastRung` — `rank === ladder.length - 1` measured
      against `ctx().ladder`, the ladder it has already resolved for this issue type. `false` when
      `offLadder`. Additive only; every existing field keeps its shape.
- [x] Extend task.37's `resolveMoment` unit + snapshot tests to cover `isLastRung`, including a
      `byIssueType` overlay whose ladder is a different length from the base
- [x] Thread an explicit `terminal` through from the caller instead of `!!base.terminal`
- [x] `terminal = isTerminalMoment && moment.isLastRung`, where `isTerminalMoment` is what
      `DEFAULT_STAGE_MAP` marks terminal — today `done` alone (`jira-sync.js:1409-1414`)
- [x] Preserve `jira-stage.js:249`'s `localStatus` behaviour — it currently yields `"done"`, which is
      in `TERMINAL_LOCAL_STATUSES` (`jira-sync.js:1478`), so positive-resolution preference still
      applies. Do not "fix" it.
- [x] Test the retarget case explicitly: a `done` pointed at a non-last rung must skip, not fall back

**Dependencies**: task.37 (needs the ladder to know what "last rung" means)

---

### Phase 2: `walkLadder`

**Risk Level**: High

**Files**: `shared/resources/jira-sync.js`

**Changes**:

- [x] `walkLadder({ http, auth, issueKey, from, targets, workflow, issueType, output, … })` —
      `targets` is the plural rung from `resolveMoment`, never a single name
- [x] Hop list = `planMove(from, targets[0], workflow, { issueType }).map(r => r.names)` with
      `targets` appended — **a uniform array of name-arrays**, so every element is a candidate list
      `resolveTransition` can consume directly
- [x] Per hop: already-check → `getTransitions` (**re-fetched**) → `resolveTransition` → transition
- [x] Stop at the first hop with no match; return `landed` + `remaining`
- [x] Guards: one hop per rung; refuse a status already visited this walk. Membership is keyed on
      `stripStatusEmoji(name).toLowerCase()` — there is no `norm` helper
- [x] The loop guard `return`s the `walk-incomplete` shape. It must **not** `break` into the success
      return: an aborted cycle is a blocked walk, and reporting it as `walked` erases the distinction
      §3 exists to preserve
- [x] `landed` is always a status **string** — take `res.to`, falling back to the rung's first name
- [x] Entry-only monotonicity guard; intermediate hops bypass it internally
- [x] Add an optional `transitions` parameter to `transitionToStatus` (it currently has none and
      always fetches its own at `jira-sync.js:2388`). Without it each hop costs two GETs and the
      §8 baseline of `1 + 2n` is unreachable
- [x] Teach the monotonicity guard to rank from the ladder: ladder first (`rankOf(status, workflow,
      { issueType })`), JSON record second, `DEFAULT_STATUS_RANK` last. This is what finally makes
      §2 Benefit 4 true — without it a declared bespoke rung stays unranked and the guard still
      waves it through
- [x] Reuse `transitionToStatus` for each hop so worklog retry, `buildTransitionFields` and the
      required-field refusal are shared, not reimplemented

**Dependencies**: Phase 1

---

### Phase 3: `jira-stage.js` wiring

**Risk Level**: Medium

**Files**: `shared/resources/jira-stage.js`

**Changes**:

- [x] Resolve target via `tracker-workflow.js`; fall back to `resolveStage` + the JSON record. Use
      `moment.targets` (plural) — there is no `target` field on the result
- [x] Emit `landed` / `remaining` / `hops` in `--json`
- [x] `--from <status>`: new flag in `parseArgs` (`jira-stage.js:34-43`). `planMove` needs a starting
      point, and `--print-plan` cannot fetch one — without this flag every plan is one hop and
      Phase 4's multi-hop rule can never fire
- [x] `--print-plan`: resolve and print hops, **no credentials, no network**, exit 0. With `--from`
      the plan spans the real distance; without it, it reports the target rung alone and says so
- [x] Add `--print-plan` and `--from` to the `USAGE` const (`:84-85`) and to the header's usage and
      exit-code block (`:16-27`)
- [x] `--dry-run`: resolve hop 1 against live transitions; print later hops as
      `unverified (depends on hop 1)` — do not claim a destination it cannot observe
- [x] Amend the file header, which currently promises the whole ladder is re-verifiable without
      moving anything
- [x] Exit codes unchanged: `walk-incomplete` is exit 0, or 1 under `--strict`

**Dependencies**: Phase 2

---

### Phase 4: MCP fallback prose

**Risk Level**: Low

**Files**: `shared/resources/jira-transition-protocol.md`

**Changes**:

- [x] Take candidates from `--print-plan` rather than the prose literals; keep the literals as the
      no-file default so the parity test still applies
- [x] Instruct the fallback to read the card's current status via its MCP connector and pass it as
      `--from` — a plan without `--from` cannot span more than one rung, so the rule below would
      otherwise never fire
- [x] Hard rule: **one hop, never a ladder**. More than one hop → log and leave for a human
- [x] Add to "What this fallback cannot do": ladders, and the terminal override (a retargeted `done`
      must not use rule 4)

**Dependencies**: Phase 3

---

### Phase 5: Tests

**Risk Level**: Low

**Files**: `shared/resources/tests/jira-stage.test.mjs`,
`shared/resources/tests/jira-stage-fixtures.test.mjs`,
`evals/shared/tests/transition-protocol-parity.test.mjs`

**Changes**:

- [x] Walking, partial walks, loop guard (asserting it reports `walk-incomplete`, not `walked`),
      entry-only guard
- [x] Ladder-aware rank: a status on the ladder but absent from `DEFAULT_STATUS_RANK` is now ranked,
      and a resumed run is refused when it would drag a card back out of it
- [ ] ⛔ **BLOCKED (external)** — **Capture `rapp-story-ready-for-showcase.json` first** — see §7 Files to Add. Only hop 1 of the
      demo walk is in the existing payloads; hop 2 is not captured anywhere (see the correction
      below), so Phase 5 cannot start until this exists
- [ ] ⛔ **Blocked on the capture above.** Fixtures: `In Progress → READY FOR SHOWCASE → Waiting for Review`. Hop 1 is `id=21` in
      `rapp-story-in-progress.json`. Hop 2 comes from the newly captured showcase payload
- [x] Note the destination is **UPPERCASE** on this board — that is the case-insensitivity
      assertion, not an incidental detail
- [x] Retargeted `done` skips rather than falling back
- [x] Existing fixture assertions pass **unchanged**
- [x] Parity test covers `--print-plan`'s default output, both with and without `--from`

> **Correction (review.1)**: an earlier draft claimed both hops were already captured, citing
> transition ids 21 and 151. `id=151` lives in `rapp-story-waiting-for-review.json` and runs
> *from* Waiting for Review *to* READY FOR SHOWCASE — the wrong source column, pointing the wrong
> way along this walk. The transitions available *from* the showcase column are not captured, and
> whether that column offers any route onward to Waiting for Review is unverified until the new
> fixture is taken.

**Dependencies**: Phases 1-4; the fixture capture (external — needs a real issue parked in
READY FOR SHOWCASE)

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/jira-sync.js` — `walkLadder`, last-rung `terminal`, optional `transitions`
   param, ladder-aware rank in the monotonicity guard
2. ✅ `shared/resources/jira-stage.js` — ladder resolution, `--print-plan`, `--from`, `--dry-run`
   honesty
3. ✅ `shared/resources/tracker-workflow.js` — `resolveMoment` also returns `isLastRung` (additive)

### Files to Modify (Tests)

4. ✅ `shared/resources/tests/jira-stage.test.mjs`
5. ✅ `shared/resources/tests/jira-stage-fixtures.test.mjs`
6. ✅ `shared/resources/tests/tracker-workflow.test.mjs` — `isLastRung`, including under a
   `byIssueType` overlay of different ladder length
7. ✅ `evals/shared/tests/transition-protocol-parity.test.mjs`

### Files to Modify (Documentation)

8. ✅ `shared/resources/jira-transition-protocol.md`
9. ✅ `docs/reference/tracker-workflow.md` — the Jira execution semantics section
10. ✅ `CHANGELOG.md`

### Files to Add

11. ➕ `shared/resources/tests/fixtures/rapp-story-ready-for-showcase.json` — the transitions
    available **from** the showcase column. Captured against the real board using the query in the
    `jira-stage-fixtures.test.mjs` header; needs an issue parked in READY FOR SHOWCASE. Phase 5
    blocks on it, so capture it early.

### Bundling

⚠️ `npm run bundle` is **mandatory before commit**. Every shared resource this task touches has
in-tree bundled copies that go stale otherwise: `jira-sync.js` (11 skills), `jira-stage.js` (6),
`jira-transition-protocol.md` (6). `tracker-workflow.js` currently has none — once `jira-stage.js`
requires it, `bundle_skill.py`'s sibling-require follower will bundle it too, but only if the
command is run. Editing a bundled `references/` copy instead of the `shared/resources/` source is
silently reverted by the next bundle.

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: `walkLadder` and the narrowed terminal rule against hand-built transition lists

**Actions**:

- [x] Target directly reachable → one hop, identical to today
- [x] Target two rungs up, both reachable → two hops, transitions re-fetched between
- [x] Second hop unreachable → `walk-incomplete`, `landed` names the gate, exit 0
- [x] A cycle in the offered transitions → loop guard stops it **and reports `walk-incomplete`** with
      `landed` and `remaining`, never `walked`
- [x] Retargeted `done` (target ≠ last rung) → skip, no category fallback
- [x] Target *is* last rung → fallback still available
- [x] `isLastRung` under a `byIssueType` overlay whose ladder is a different length from the base —
      terminality follows the overlay, not `workflow.ladder`
- [x] A rung declared only in the ladder (absent from `DEFAULT_STATUS_RANK`) is ranked, and the
      guard refuses a backwards move out of it
- [x] A rung with several names resolves via any of them, not just `names[0]`

**Command**: `node --test 'shared/resources/tests/*.test.mjs'`

---

### Integration Tests

**Scope**: replay against real captured board payloads

**Actions**:

- [ ] ⛔ **Blocked on the fixture capture.** `In Progress → READY FOR SHOWCASE → Waiting for Review` on
      the RAPP Story fixtures. Hop 1 uses the captured `id=21`; hop 2 uses the **newly captured**
      `rapp-story-ready-for-showcase.json` (§7 Files to Add) — it is not in the existing payloads.
      **Substituted**: a two-hop walk on a path this board *has* captured at both ends —
      `Waiting for Review → In Review → Ready for Testing` (`id=401` then `id=61`) — which proves the
      same property (per-hop re-fetch of position-dependent transitions) against real data. The
      UPPERCASE assertion is kept separately against the real `id=21`. See the implementation report.
- [x] Every existing fixture assertion passes unchanged
- [x] `--print-plan` with no credentials returns hops and exits 0
- [x] `--print-plan --from "In Progress"` spans the full ladder distance; without `--from` it
      reports the target rung alone

**Command**: `npm test`

---

### Contract Tests

**Scope**: the CLI contract other steps depend on

**Actions**:

- [x] Exit codes unchanged for every documented reason; `walk-incomplete` is 0 (1 under `--strict`)
- [x] An unhandled throw still exits 0
- [x] `--dry-run` issues **no** POST

---

### Performance Tests

**Scope**: API call count

**Metrics**: calls per moment.

**Baselines**: today, 1 × `getTransitions` + 1 × transition.

**Expectations**: `1 + 2n` for an n-hop walk. A one-rung ladder must remain exactly at the baseline
— assert the call count for the default ladder. **This target is only reachable with the optional
`transitions` parameter on `transitionToStatus` (Phase 2)**; without it every hop fetches twice and
the real figure is `1 + 3n`.

---

### Consumer Tests

**Scope**: a real board, without moving cards

**Actions**:

- [ ] ⛔ **Blocked** — needs live board credentials. `--dry-run` across one real issue in each real column, diffed against the ladder
- [x] `--print-plan` for every moment, offline — covered by the parity + CLI tests (no board needed)

---

## 9. Success Criteria

### Functional

- [x] A ladder with an intermediate rung walks through it and lands on the target
- [x] A blocked second hop reports `walk-incomplete` with `landed` and `remaining`, exit 0
- [x] A cycle-aborted walk reports the same shape, never `walked`
- [x] Retargeted `done` skips instead of firing the done-category transition
- [x] `isLastRung` is measured against the issue type's ladder, not `workflow.ladder`
- [x] A rung declared only in the ladder is ranked, and the guard refuses a regress out of it
- [x] Every rung resolves via any of its names, not only the first
- [x] `--print-plan` works with no credentials and no network, and honours `--from`
- [ ] ⛔ **BLOCKED (external)** — `rapp-story-ready-for-showcase.json` is captured and committed
- [x] All existing fixture assertions pass unchanged

### Performance

- [x] Default (one-rung) path makes exactly the same API calls as today
- [x] `getTransitions` re-fetched once per hop, never speculatively

### Code Quality

- [x] `walkLadder` reuses `transitionToStatus`; no second copy of worklog retry or field-filling
- [x] Never throws; exit codes unchanged
- [x] `jira-stage.js`'s header no longer overpromises about `--dry-run`

### Migration

- [x] `CHANGELOG.md` records both behavioural changes, including why narrowing rule 4 is correct
- [x] `jira-transition-protocol.md` states the one-hop limit
- [x] `docs/reference/tracker-workflow.md` documents Jira execution semantics
- [x] `npm run bundle` run, and the regenerated `references/` copies committed alongside the sources

---

## 10. Risk Assessment

### High Risk Areas

**1. A walk moves a card somewhere nobody intended**

- **Risk**: walking fires *multiple* transitions where one used to fire. A wrong ladder now has
  multiplied consequences, and transitions are not reliably reversible.
- **Probability**: Medium
- **Impact**: Critical
- **Mitigation**: walking only ever visits rungs the consumer *declared*, in order, and only
  forwards. Guards: entry monotonicity, no revisiting, one hop per rung. `--dry-run` and
  `--print-plan` before adoption. Land only after task.37's default-ladder snapshot exists.
- **Rollback**: revert Phase 2; Phase 1 stands alone.

**2. Partial walks leave cards parked mid-ladder**

- **Risk**: a board that gates a rung behind a human leaves every card in the gate, and later
  moments then resolve from there.
- **Probability**: High (it is the *intended* behaviour for a real gate)
- **Impact**: Major if unexpected
- **Mitigation**: `walk-incomplete` is a distinct reason with `landed` and `remaining`; the
  Decisions Log line must name where the card actually is. Document that a gate is a legitimate
  board shape and the pipeline stopping there is correct.

### Medium Risk Areas

**1. Narrowing rule 4 breaks a board relying on it**

- **Risk**: a board whose `done` was retargeted but which *wanted* the fallback.
- **Probability**: Low
- **Impact**: Major
- **Mitigation**: the fallback stays available when the target is the last rung, which is the
  honest expression of "this is the terminal". Skip is recoverable.

**2. Call-count growth against rate limits**

- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: walks are bounded by ladder length; typical ladders are 4-7 rungs and most moments
  are one hop.

**3. The ladder-aware rank change touches every caller of `transitionToStatus`**

- **Risk**: the monotonicity guard is shared by document sync, epic sync, story sync and task sync,
  not just the stage path. Teaching it to consult the ladder gives it an opinion where it previously
  had none, so a status those callers used to move freely can now be refused as a regress.
- **Probability**: Low
- **Impact**: Major
- **Mitigation**: ladder rank is consulted *first* but the existing chain is preserved beneath it, so
  any status already ranked keeps its rank and its behaviour. Only previously-unranked statuses
  change, and only on boards that declared them. The regression signal is the existing guard tests
  passing unchanged.
- **Rollback**: the rank resolution is one function; reverting it leaves walking intact.

### Low Risk Areas

**1. `--print-plan` drifts from `walkLadder`**

- **Mitigation**: both call the same `planMove`; assert equality in a test.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: a card lands somewhere the ladder does not declare; any existing fixture assertion
fails; exit-code contract violated.

**Steps**:

1. Revert the `jira-stage.js` wiring hunk — target resolution falls back to `resolveStage`
2. `npm test`
3. `--dry-run` one issue per column and diff against pre-change output

**Verification**: fixtures pass unchanged; dry-run output matches the pre-change ladder.

---

### Partial Rollback (1-2 hours)

**When to Use**: walking is wrong but the terminal narrowing is sound. Revert Phase 2 and 3, keep
Phase 1 — it is an independent correctness fix.

---

### Forward Fix (< 4 hours)

**When to Use**: reporting wording, `--print-plan` output shape, prose. Walking itself is guarded by
the ladder, so most issues are configuration rather than code.

---

### Rollback Triggers

**Critical**: a card moved to a status not on the ladder; a fixture assertion changed; a non-zero
exit from a documented skip.

**Non-Critical**: log wording, `remaining` formatting, doc gaps.

---

## Progress Tracking

### Phase 1: Last-rung terminal restriction

- [x] `resolveMoment` returns `isLastRung`
- [x] `terminal` threaded from the caller
- [x] Retarget case tested

### Phase 2: `walkLadder`

- [x] Hop loop with per-hop re-fetch, over a uniform array of name-arrays
- [x] Optional `transitions` param on `transitionToStatus`
- [x] Ladder-aware rank in the monotonicity guard
- [x] Loop and monotonicity guards
- [x] `walk-incomplete` reporting, including on a cycle abort

### Phase 3: `jira-stage.js`

- [x] Ladder resolution with JSON-record fallback, using `moment.targets`
- [x] `--print-plan` and `--from`, with USAGE + header updated
- [x] Honest `--dry-run` + header amendment

### Phase 4: MCP fallback prose

- [x] Consumes `--print-plan`, passing `--from`
- [x] One-hop rule stated

### Phase 5: Tests

- [ ] ⛔ **BLOCKED (external)** — `rapp-story-ready-for-showcase.json` captured
- [x] Unit + fixture + parity coverage

### Pre-commit

- [x] `npm run bundle` run and regenerated `references/` committed

---

## References

- **Depends on**: task.37 (`tracker-workflow.js`, the ladder and `planMove`)
- **Related**: task.39 (GitHub engine — no walking, no graph), task.41 (new moments)
- **Key code** (verified 2026-08-05 — earlier drafts cited pre-task.37 line numbers, ~130 lines low):
  - `jira-sync.js:1409-1414` (`DEFAULT_STAGE_MAP.done`, the only `terminal: true`), `:1421-1423`
    (`DEFAULT_STATUS_RANK`, and its note on unranked bespoke columns), `:1478`
    (`TERMINAL_LOCAL_STATUSES`), `:1987` (`resolveStage`), `:2028` (`terminal: !!base.terminal`),
    `:2035` (`resolveStatusRank`), `:2194` (`resolveTransition`), `:2306` (`transitionToStatus`),
    `:2373` (monotonicity guard), `:2388` (its internal `getTransitions`)
  - `jira-stage.js:19-27` (exit-code contract), `:34-43` (`parseArgs`), `:84-85` (`USAGE`),
    `:87-110` (`describeAlternatives`), `:196-239` (`--dry-run`), `:249` (`localStatus`)
  - `tracker-workflow.js:523` (`ladderFor`, unexported), `:567` (`rankOf`), `:583` (`resolveMoment`),
    `:645` (`describeTarget` — the `targets`/`rank`/`offLadder` return), `:681` (`planMove`),
    `:841` (exports)
- **Fixtures**: `shared/resources/tests/fixtures/rapp-story-*.json`. `READY FOR SHOWCASE` appears as
  a reachable destination no moment targets — `id=21` from `rapp-story-in-progress.json` and
  `id=151` from `rapp-story-waiting-for-review.json`. **Both are transitions *into* the column**; the
  transitions available *from* it are not captured (see §6 Phase 5).

---

## Notes

### Important Reminders

- Re-fetch transitions after **every** hop. Caching the first list defeats the entire feature —
  transitions are position-dependent.
- Do not "fix" `jira-stage.js:249`'s `localStatus` expression; it is correct and a naive change
  breaks resolution filling on retargeted terminals.
- A partial walk is a distinct outcome from both success and no-op. Three states, three messages.
- **`resolveMoment` returns `targets`, plural.** There is no `target` field. Never reduce a rung to
  `names[0]` anywhere in this task — that is the precise regression task.37's plural return was
  built to prevent, and its docstring names this task as the consumer that must honour it.
- **There is no `namesFor` and no `norm` in `tracker-workflow.js`.** The names come from
  `moment.targets` and `planMove(...)[i].names`; name comparison is `eqName` /
  `stripStatusEmoji(...).toLowerCase()`.
- **`workflow.ladder` is the base ladder, not necessarily the one in play.** A `byIssueType` overlay
  can replace it entirely. Anything measured against ladder length belongs inside
  `tracker-workflow.js`, where the resolved ladder is already in hand.
- Run `npm run bundle` before committing, and edit `shared/resources/` sources — never a bundled
  `references/` copy, which the next bundle silently reverts.

### Known Issues

**Open** (non-blocking):

- ⚠️ The MCP fallback remains one-hop-only by design. A ladder consumer without API credentials
  moves gated cards by hand.
- ⛔ **`rapp-story-ready-for-showcase.json` was not captured** — external dependency, see the
  Implementation Record below.

---

## Implementation Record

**Started**: 2026-08-05
**Completed**: 2026-08-05
**Status**: Ready for Review
**Branch**: `feature/task.38.jira-ladder-walking`

### Implementation Summary

All five phases implemented. Jira now resolves every moment's target from the `tracker-workflow.yaml`
ladder and walks the rungs between where a card sits and where the moment wants it, re-reading the
available transitions after every hop. The done-category fallback is restricted to the ladder's last
rung, and the monotonicity guard finally has an opinion about declared bespoke columns.

`npm test`: **870/870 passing**. Every pre-existing fixture assertion passes unchanged.

### Implementation Approach

**Phase 1 — last-rung terminality.** `describeTarget` in `tracker-workflow.js` now also returns
`isLastRung`, computed against the ladder it has already resolved for the issue type. This is the
whole of the change to the task.37 engine, as scoped. Terminality became the conjunction
`isTerminalMoment(moment) && moment.isLastRung`, with `isTerminalMoment` added and exported from
`jira-sync.js`.

> **Design correction found during implementation.** The plan assumed `spec.terminal` already
> controlled rule 4. It does not. `transitionToStatus` derives terminality from `localStatus`, and
> `jira-stage.js:249` maps a non-terminal `done` moment to the literal `"done"`, which is itself in
> `TERMINAL_LOCAL_STATUSES` — so rule 4 would still have fired for exactly the retargeted case this
> task exists to fix. Resolved by adding an explicit `terminal` override parameter to
> `transitionToStatus` that governs rule 4 **only**, leaving `localStatus` to keep choosing the
> resolution. That preserves the `jira-stage.js:249` behaviour the task explicitly says not to
> "fix", and is what makes the narrowing actually take effect.

**Phase 2 — `walkLadder`.** Built on `planMove` + `getTransitions` + `transitionToStatus`, so worklog
retry, `buildTransitionFields` and the required-field refusal stay in one place. Hops are a uniform
array of name-arrays; no rung is ever reduced to `names[0]`. The cycle guard `return`s the
`walk-incomplete` shape rather than breaking into the success return. `transitionToStatus` gained an
optional `transitions` parameter, which is what brings an n-hop walk to `1 + 2n` calls.

**Ladder-aware ranking — deviation from the plan, deliberate.** The plan's snippet put the ladder
first and let an off-ladder status fall through to the record and then `DEFAULT_STATUS_RANK`. That
mixes two incompatible scales: ladder ranks are rung **indices** (0..6) while the legacy ranks run
10..60, and in ladder mode `minRank` is an index. A status absent from the ladder but present in
`DEFAULT_STATUS_RANK` would therefore be compared at the wrong magnitude — "In Review" (30) against
a target rung of 2 reads as a regress — and **every forward move would be refused** on any board
whose ladder omits a column the defaults happen to name. Implemented instead as: supplying a
workflow switches the guard to ladder ranks wholesale, and off-ladder returns `null`. That is also
the semantically correct answer, matching `rankOf`'s documented "null means no opinion" and the
existing treatment of side-states. Pinned by a regression test naming the trap.

**Phase 3 — `jira-stage.js`.** Target resolution via `resolveMomentSpec` (ladder → JSON record),
`--print-plan` (credential-free, network-free, runs before the auth check), `--from`, `--issue-type`,
honest `--dry-run` labelling later hops `unverified (depends on hop 1)`, and `walk-incomplete`
reporting that names where the card actually stopped. Header, `USAGE` and the exit-code block all
updated. Exit codes unchanged.

**Phase 4 — MCP fallback prose.** Takes candidates from `--print-plan`, requires `--from`, keeps the
three literals as the no-file default so the parity test still binds, and adds the one-hop hard rule
plus the terminal-override rule to "What this fallback cannot do" and "MUST NOT".

**Phase 5 — tests.** 24 new tests across four suites.

### Testing Results

| Suite | Result |
| --- | --- |
| `shared/resources/tests/jira-stage.test.mjs` | 39 passing (24 → 39) |
| `shared/resources/tests/jira-stage-fixtures.test.mjs` | 12 passing (8 → 12), the original 8 unchanged |
| `shared/resources/tests/tracker-workflow.test.mjs` | 82 passing (79 → 82) |
| `evals/shared/tests/transition-protocol-parity.test.mjs` | 11 passing (5 → 11) |
| `npm test` (full) | **870/870**, exit 0 |

Coverage of the §8 matrix: one-hop identical to today (with call counts asserted), two-hop with
re-fetch verified, blocked second hop, cycle guard reporting `walk-incomplete` never `walked`,
retargeted `done` skipping, last-rung fallback still working, `isLastRung` under overlays that both
lengthen and shorten the ladder, a ladder-only rung being ranked and guarding a regress, and a rung
resolving via a non-first name.

### Deferred Work

**`rapp-story-ready-for-showcase.json` was not captured.** It needs a live authenticated request
against the RAPP board with an issue parked in `READY FOR SHOWCASE`; this environment has no `.env`
and no `JIRA_*` variables. Fabricating the payload would defeat the purpose of the `rapp-*` fixtures,
which exist precisely because they are real.

Substituted, so the coverage is not lost:

- the **two-hop real-payload walk** runs on `Waiting for Review → In Review → Ready for Testing`
  (`id=401` then `id=61`), a path captured at both ends, proving the same position-dependence
  property — the test asserts explicitly that `id=61` is *not* offered from where hop 1 began;
- the **UPPERCASE case-insensitivity** assertion is kept against the real `id=21`
  `In Progress → READY FOR SHOWCASE` transition.

To close: park a RAPP Story in `READY FOR SHOWCASE`, run the capture query in the
`jira-stage-fixtures.test.mjs` header, commit the payload, and add the
`In Progress → READY FOR SHOWCASE → Waiting for Review` assertion. If that column offers no route
onward to Waiting for Review, §6 Phase 5 / §8 need rewriting around whatever the board actually
offers — the task already flags this as unverified.

The two **Consumer Tests** requiring a live board (`--dry-run` per real column) are blocked for the
same reason. The offline half (`--print-plan` for every moment) is covered by the parity and CLI
tests.

### Files Summary

**Modified — implementation**

1. `shared/resources/jira-sync.js` — `walkLadder`, `isTerminalMoment`, explicit `terminal` override,
   optional `transitions` param, ladder-aware `resolveStatusRank`, `require("./tracker-workflow.js")`
2. `shared/resources/jira-stage.js` — `resolveMomentSpec`, `planHops`, `--print-plan`, `--from`,
   `--issue-type`, walk wiring, `walk-incomplete` reporting, honest `--dry-run`, header + USAGE
3. `shared/resources/tracker-workflow.js` — `isLastRung` on `describeTarget` (additive; the only
   change to the task.37 engine)

**Modified — tests**

4. `shared/resources/tests/jira-stage.test.mjs`
5. `shared/resources/tests/jira-stage-fixtures.test.mjs`
6. `shared/resources/tests/tracker-workflow.test.mjs`
7. `evals/shared/tests/transition-protocol-parity.test.mjs`

**Modified — documentation**

8. `shared/resources/jira-transition-protocol.md`
9. `docs/reference/tracker-workflow.md` — new "Jira execution semantics" section; status caveat and
   "Order is the path" claim updated now that Jira reads the file
10. `CHANGELOG.md` — both behavioural changes, under Added and Changed

**Bundled** — `npm run bundle` run; 47 regenerated `references/` copies committed alongside the
sources. `tracker-workflow.js` and `yaml-subset.js` are now bundled into 11 skills each, followed
automatically by the bundler from the new `require`.

**Added** — none. (`rapp-story-ready-for-showcase.json` deferred, above.)

**Deleted** — none.

### Change Log

| Date | Change |
| --- | --- |
| 2026-08-05 | Phases 1–5 implemented; `npm test` 870/870; `npm run bundle` run; status → Ready for Review |


---

## QA Testing Results

**QA Status**: FAIL
**QA Engineer**: QA Engineer
**Testing Date**: 2026-08-05
**Quality Score**: 20/100
**Gate Decision**: FAIL

### QA Report

- **Full Report**: [task.38.qa.1.jira-ladder-walking.md](./task.38.qa.1.jira-ladder-walking.md)
- **Gate File**: [task.38.gate.1.jira-ladder-walking.yml](./task.38.gate.1.jira-ladder-walking.yml)

### Test Coverage Summary

- **Tests Executed**: 870 (870 passing)
- **Phases Verified**: 5/5 implemented; 3/5 clean, 2 with issues
- **Critical Issues**: 3 HIGH, 2 MEDIUM, 2 LOW
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: FAIL, Maintainability: CONCERNS

### Key Findings

Three high-confidence correctness bugs on the primary feature path, each reproduced by executing the
shipped code. The green suite does not contradict them: every new test calls the helpers directly,
and two of the three live in `jira-stage.run()`'s branch ordering — a path no test exercises end to
end.

- **CR-1** — a card already at the target reports `walk-incomplete` instead of `already`. The most
  common pipeline outcome, now warning nonsensically and exiting 1 under `--strict`.
- **CR-2** — a genuine partial walk is emitted as a success with no warning, because
  `res.transitioned` is true for it and that branch is tested first.
- **CR-3** — an authored ladder that omits a moment still fires the built-in default for it, so
  `--stage done` can fire a real Done transition on a board that switched `done` off.
- **CR-4** (medium) — with no yaml, the built-in default ladder bypasses the JSON workflow record,
  contradicting the documented precedence and the task's "no breaking changes" claim.
- **CR-5** (medium) — a hop-0 HTTP or required-fields failure is flattened to `walk-incomplete`,
  losing the diagnostics that are the only way such failures surface.

### QA Fix Cycle 1 — 2026-08-05

All five gate issues fixed; both cleanups and the test-coverage gap closed. Verified by executing the
shipped code, not just by the suite going green.

| ID | Fix | Verified |
| --- | --- | --- |
| CR-1 | Cycle guard skipped on the first hop (`i > 0`). `planMove` returns rungs *strictly between* from and to, so an intermediate rung can never be `from` — the guard is only meaningful from `i>=1`. | `already` ✅ |
| CR-1b | Follow-on found while fixing CR-1: with the guard skipped, an all-`already` walk fell through to the success return and reported `walked`. The final return now emits the legacy `already` shape when no hop fired. | `already` ✅ |
| CR-2 | `walk-incomplete` branch moved **above** the success branch in `run()`, since a partial walk that moved has `transitioned: true`. Warning text now distinguishes moved-and-parked from never-moved. | run() test ✅ |
| CR-3 | `resolveMomentSpec` returns `enabled: false` when an **authored** file omits the moment — omission is disablement. | `enabled=false` ✅ |
| CR-4 | The ladder branch is taken only when `workflow.source === "file"`, so the built-in default sits **below** `jira.workflowRecord` as documented. | record honoured ✅ |
| CR-5 | `incomplete()` carries the hop's own `cause` (plus `detail`/`unfillable`/`available`), and `run()` surfaces it — including re-running `describeAlternatives` on a `no-transition` cause. | `cause: http-500` ✅ |
| Cleanup | Hop construction de-duplicated into one exported `planHops` in `jira-sync.js`, used by both `walkLadder` and the print-plan/dry-run paths. The drift the parity test guards is now structurally impossible. | — |
| Cleanup | Exit-code comment corrected — the code was right (`--strict` → 1), the comment was wrong. | — |
| Coverage | Six `run()`-level tests added (already-at-target, partial walk, `--strict`, `--dry-run` issues no POST, unhandled throw exits 0), plus cause-propagation and precedence tests. This gap is why the original 24 tests passed with three bugs present. | 880/880 ✅ |

**Tests**: 870 → **880**, all passing. `npm run bundle` re-run.

### QA Fix Cycle 2 — 2026-08-05

Cycle 2's re-review confirmed CR-1, CR-1b, CR-2, CR-5 and the `planHops` de-duplication as genuinely
fixed, and found that **the cycle-1 fix for CR-4 was itself wrong**, plus a test that did not test
what its name claimed.

| ID | Finding | Fix | Verified |
| --- | --- | --- | --- |
| CR-6 (high) | The CR-4 fix keyed authorship on `workflow.source === "file"`, which is true for a file that exists but authors no `pipeline:` — an empty file, a malformed one, or the **documented `statuses:`-only shape**. In all three the pipeline IS the built-in default, so the bug was only half-fixed and a new one was added: a built-in `done` still outranked the record's `enabled: false` (firing the board's real Done), while `in-qa`/`ready-for-merge`/`blocked` — absent from the built-in pipeline — were read as deliberate omissions and **silently disabled a stage the consumer had opted into**. | Key on `workflow.pipelineAuthored === true`, the field `tracker-workflow.js` maintains for exactly this distinction. | all 4 workflow shapes ✅ |
| CR-7 (high, test) | The run() test named "a partial walk is reported as walk-incomplete" asserted `reason === "no-transition"` on a **single-rung** plan. `walk-incomplete` appeared in no run() test at all, so the CR-2 fix — the highest-severity bug of cycle 1 — had zero coverage, and reverting the branch order left the suite green. | Renamed to what it asserts, and added a real two-hop partial walk asserting `reason`, `transitioned: true`, `landed` and `cause`. Both branch orders exit 0, so the assertion is on `reason`, not the exit code. | ✅ |
| CR-8 (medium, test) | The run() tests read this repo's own committed `tracker-workflow.yaml` via `git rev-parse`, so their outcomes depended on a file whose comments invite editing. | `run()` takes an optional `repoRoot`; tests write their own ladder to a temp dir and clear the workflow cache. | ✅ |
| CR-9 (low) | The `getTransitions` + `describeAlternatives` block was duplicated verbatim across two branches, the copy also costing an extra API round-trip. | Extracted `explainNoTransition()`, called from both. | ✅ |
| CR-10 (low) | Two dead conditions left by the refactor. | `walked.length &&` dropped with a note on why `every` is not vacuous; the unreachable disjunct kept and labelled defensive. | ✅ |

Also added: a full two-hop `run()` walk asserting both transitions fire in ladder order.

**Tests**: 880 → **884**, all passing. `npm run bundle` re-run.

### QA Fix Cycle 3 — 2026-08-05

Cycle 3's re-review confirmed CR-1, CR-1b, CR-2, CR-5, CR-7, CR-8, CR-9, CR-10 and the `planHops`
de-duplication, and found that **the cycle-2 fix for CR-6 introduced a new high-severity regression**.

| ID | Finding | Fix | Verified |
| --- | --- | --- | --- |
| CR-11 (high) | `pipelineAuthored` is a **file-level** flag, set only from the top-level `pipeline:` block. A `byIssueType` overlay that authors a per-type `pipeline:` with no top-level block therefore read as unauthored, so an authored per-type target was ignored entirely: `done: Verified` for a Bug resolved to the built-in `["Done","Closed",…]` **with `terminal: true`**, unlocking rule 4 and firing the board's real Done. The documented per-type disable (`in-qa: ~`) also stopped disabling. | New exported `pipelineAuthoredFor(workflow, issueType)` in `tracker-workflow.js` — the call site cannot compute this because `overlayFor`'s case-insensitive matching is unexported, the same reason `isLastRung` lives there. | `["Verified"]`, terminal false ✅ |
| CR-12 (medium, test) | The test whose comment claimed to "pin the branch ordering" did not: both orders emit the same `res`, so every assertion passed with the fix reverted. The real discriminators are the `--strict` exit code (sibling test) and the warning output. The comment's stated reasoning was inverted. | Comment corrected to say what actually discriminates, and a test added that captures stderr and asserts the parked-mid-ladder warning — which the swapped order does not emit. | ✅ |
| CR-13 (low, test) | CR-8 pinned the ladder but not the record axis: `run()` still read this repo's `skills-config.yaml` / `jira-workflow.json` via `git rev-parse`. Temp dirs also leaked. | `repoRoot` threaded into `loadWorkflowRecord`/`loadDoneResolution`/`loadCancelledResolution`/`loadWorklogTimeSpent`; temp dirs removed on exit. | ✅ |
| CR-14 (medium, docs) | `docs/reference/tracker-workflow.md` contradicted the code in three places — including the "precedence is resolved **per moment**" paragraph added earlier in this same task, which is now exactly backwards. | Replaced with a "What 'opts in' actually means" section and a four-row table; the Jira-execution and terminality sections corrected. | ✅ |
| CR-15 (low, test) | A test named `run() — …` never called `run()` — the same defect cycle 2 flagged, reintroduced by the fix for it. | Renamed to `spec — …`. | ✅ |
| CR-16 (low) | `--print-plan` emitted `source: "file"` for a plan the file contributed nothing to. | Emits `source: moment ? workflow.source : "record"` plus an explicit `authored` field. | ✅ |

**Scope note**: CR-11 required a second additive export on `tracker-workflow.js`
(`pipelineAuthoredFor`), beyond the `isLastRung` field §4 scopes as "the whole of it". Taken
deliberately: the alternative is duplicating `overlayFor`'s case-insensitive matching at the call
site — the precise drift this codebase repeatedly warns against — and the alternative to fixing it at
all is shipping a known unrecoverable wrong-Done. Same justification the task itself gives for putting
`isLastRung` in the engine.

**Tests**: 884 → **886**, all passing. `npm run bundle` re-run.

Status remains Ready for Review for QA cycle 4.
