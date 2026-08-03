---
id: task.38
title: "Jira: walk the status ladder, and stop the terminal fallback firing on a retargeted done"
type: task
description: "Drive Jira transitions from the tracker-workflow ladder, walking intermediate rungs when the target is not directly reachable, and restrict the done-category fallback to the last rung."
tags: [jira, pipeline, transitions, workflow]
category: refactoring
status: planned
priority: High
created: 2026-08-03
updated: 2026-08-03
assignee:
estimated_effort_hours: 16
github_issue: 186
---

# Technical Task: Jira — walk the status ladder

**Status:** Planned

**GitHub Issue:** [#186](https://github.com/Gamaroff/agent-skills/issues/186)

---

## 1. Overview

Teach the Jira transition path to resolve its target from the `tracker-workflow.yaml` ladder
(task.37) and, when that target is not directly reachable, to walk the intermediate rungs the
ladder already declares. Also fix a live correctness bug: a `done` moment retargeted at a bespoke
column still unlocks the "single transition into the done category" fallback and will fire the
board's real Done transition.

**Scope**: `shared/resources/jira-sync.js`, `shared/resources/jira-stage.js`,
`shared/resources/jira-transition-protocol.md`, plus tests. No step-file or GitHub changes.

---

## 2. Motivation

### Current Problems

1. **One hop only.** `resolveTransition` (`jira-sync.js:2062`) matches against transitions available
   from where the card sits. A board where Done is reachable only via "Ready for Showcase" skips
   silently.
2. **A missed hop disables everything after it.** Moments resolve from the card's current position,
   so one skipped transition cascades. `jira-stage.js`'s `describeAlternatives` was written
   precisely to diagnose this after the fact — walking removes the cause.
3. **A retargeted `done` fires the wrong transition.** `resolveStage` returns
   `terminal: !!base.terminal` from `DEFAULT_STAGE_MAP` with no override path. Point `done` at
   "Ready for Showcase" and rule 4 of `resolveTransition` still fires the single done-category
   transition — a confident wrong transition, which the resolver's own comments call out as worse
   than a skip.
4. **Bespoke columns are unranked**, so the monotonicity guard has no opinion and a resumed run can
   drag a card back out of one.
5. **The MCP fallback cannot see any of this.** `jira-transition-protocol.md` hardcodes three
   candidate lists in prose and cannot read a ladder.

### Benefits

1. **A gate column works** — the "Ready for Showcase before Done" case, with no graph authored.
2. **Fewer silent skips**, and the remaining ones are genuinely "this board offers nothing".
3. **The terminal fallback stops misfiring** on retargeted boards.
4. **Bespoke columns become guarded**, because ladder order gives them a rank.
5. **The credential-free fallback gets the ladder** via a network-free `--print-plan`.

---

## 3. Technical Background

### Current Architecture

```
jira-stage.js --issue K --stage in-review
  └─ resolveStage(stage, issueType, record)      # jira-sync.js:1855 — JSON record
  └─ transitionToStatus({ targetStatus: candidates, minRank: spec.rank, … })   # :2174
       ├─ monotonicity guard                                                    # :2241
       └─ resolveTransition({ transitions, candidates, currentStatus, terminal }) # :2062
            1 already · 2 to.name · 3 t.name · 4 terminal-only statusCategory · 5 skip
```

### Target Architecture

```
jira-stage.js --issue K --stage in-review
  └─ resolveMoment(moment, workflow, { issueType })      # tracker-workflow.js (task.37)
  └─ walkLadder({ from, target, workflow, … })           # NEW, jira-sync.js
       for each rung in [ …planMove(from, target), target ]:
         ├─ already? continue
         ├─ getTransitions()          ← re-fetched after EVERY hop
         ├─ resolveTransition(rung)   ← unchanged
         └─ no match → stop, report landed + remaining
```

Transitions are position-dependent — the re-fetch after each hop is the entire point.

### Important Clarifications

- **A partial walk is not a success and not "nothing happened".** It reports
  `{ transitioned: false, reason: "walk-incomplete", landed: "<rung>", remaining: [...] }`, exit 0.
  A reader must be able to tell "the card is parked in the gate" from "the card never moved".
- **No rollback on a partial walk.** A reverse transition may not exist, and attempting one fights
  the guard.
- **The guard runs once, at walk entry**, against the target's rank; intermediate hops pass
  `allowRegress` internally. A per-hop guard against the final rank would refuse the gate itself.
- **Precedence**: ladder file > JSON record > built-in. Both older surfaces keep working.

---

## 4. Scope

### In Scope

✅ `walkLadder` in `jira-sync.js`, built on the existing `getTransitions` + `transitionToStatus`.
✅ `jira-stage.js` resolves its target via `tracker-workflow.js`, falling back to the JSON record.
✅ **Last-rung restriction** on `resolveTransition` rule 4 (the done-category fallback).
✅ Loop guards: one hop per rung; never re-enter a status visited in this walk.
✅ `--print-plan` — credential-free, network-free; prints the resolved hops as JSON.
✅ `--dry-run` states plainly that it verifies only the first hop.
✅ `jira-transition-protocol.md`: consume `--print-plan`; hard rule that the fallback walks one hop,
never a ladder.
✅ Tests, including ladder walking against the existing captured RAPP fixtures.

### Out of Scope

❌ **GitHub** — task.39 / task.40. No graph there, so no walking.
❌ **Step-file edits** — the Jira invocations already exist and their flags do not change.
❌ **New moments** (`changes-requested`, `pr-merged`) — task.41.
❌ **Removing the JSON workflow record** — it stays as a lower-precedence source.

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

**Files**: `shared/resources/jira-sync.js`

**Changes**:

- [ ] Thread an explicit `terminal` through from the caller instead of `!!base.terminal`
- [ ] `terminal` is true only when the resolved target is the ladder's last rung
- [ ] Preserve `jira-stage.js:249`'s `localStatus` behaviour — it currently yields `"done"`, which is
      in `TERMINAL_LOCAL_STATUSES`, so positive-resolution preference still applies. Do not "fix" it.
- [ ] Test the retarget case explicitly: a `done` pointed at a non-last rung must skip, not fall back

**Dependencies**: task.37 (needs the ladder to know what "last rung" means)

---

### Phase 2: `walkLadder`

**Risk Level**: High

**Files**: `shared/resources/jira-sync.js`

**Changes**:

- [ ] `walkLadder({ http, auth, issueKey, from, target, workflow, output, … })`
- [ ] Hop list = `planMove(from, target, workflow)` + the target itself
- [ ] Per hop: already-check → `getTransitions` (**re-fetched**) → `resolveTransition` → transition
- [ ] Stop at the first hop with no match; return `landed` + `remaining`
- [ ] Guards: one hop per rung; refuse a status already visited this walk
- [ ] Entry-only monotonicity guard; intermediate hops bypass it internally
- [ ] Reuse `transitionToStatus` for each hop so worklog retry, `buildTransitionFields` and the
      required-field refusal are shared, not reimplemented

**Dependencies**: Phase 1

---

### Phase 3: `jira-stage.js` wiring

**Risk Level**: Medium

**Files**: `shared/resources/jira-stage.js`

**Changes**:

- [ ] Resolve target via `tracker-workflow.js`; fall back to `resolveStage` + the JSON record
- [ ] Emit `landed` / `remaining` / `hops` in `--json`
- [ ] `--print-plan`: resolve and print hops, **no credentials, no network**, exit 0
- [ ] `--dry-run`: resolve hop 1 against live transitions; print later hops as
      `unverified (depends on hop 1)` — do not claim a destination it cannot observe
- [ ] Amend the file header, which currently promises the whole ladder is re-verifiable without
      moving anything
- [ ] Exit codes unchanged: `walk-incomplete` is exit 0, or 1 under `--strict`

**Dependencies**: Phase 2

---

### Phase 4: MCP fallback prose

**Risk Level**: Low

**Files**: `shared/resources/jira-transition-protocol.md`

**Changes**:

- [ ] Take candidates from `--print-plan` rather than the prose literals; keep the literals as the
      no-file default so the parity test still applies
- [ ] Hard rule: **one hop, never a ladder**. More than one hop → log and leave for a human
- [ ] Add to "What this fallback cannot do": ladders, and the terminal override (a retargeted `done`
      must not use rule 4)

**Dependencies**: Phase 3

---

### Phase 5: Tests

**Risk Level**: Low

**Files**: `shared/resources/tests/jira-stage.test.mjs`,
`shared/resources/tests/jira-stage-fixtures.test.mjs`,
`evals/shared/tests/transition-protocol-parity.test.mjs`

**Changes**:

- [ ] Walking, partial walks, loop guard, entry-only guard
- [ ] Fixtures: `In Progress → Ready for Showcase → Waiting for Review` — **both hops already exist**
      in the captured RAPP payloads (ids 21 and 151), so this is assertable against real data
- [ ] Retargeted `done` skips rather than falling back
- [ ] Existing fixture assertions pass **unchanged**
- [ ] Parity test covers `--print-plan`'s default output

**Dependencies**: Phases 1-4

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/jira-sync.js` — `walkLadder`, last-rung `terminal`
2. ✅ `shared/resources/jira-stage.js` — ladder resolution, `--print-plan`, `--dry-run` honesty

### Files to Modify (Tests)

3. ✅ `shared/resources/tests/jira-stage.test.mjs`
4. ✅ `shared/resources/tests/jira-stage-fixtures.test.mjs`
5. ✅ `evals/shared/tests/transition-protocol-parity.test.mjs`

### Files to Modify (Documentation)

6. ✅ `shared/resources/jira-transition-protocol.md`
7. ✅ `docs/reference/tracker-workflow.md` — the Jira execution semantics section
8. ✅ `CHANGELOG.md`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: `walkLadder` and the narrowed terminal rule against hand-built transition lists

**Actions**:

- [ ] Target directly reachable → one hop, identical to today
- [ ] Target two rungs up, both reachable → two hops, transitions re-fetched between
- [ ] Second hop unreachable → `walk-incomplete`, `landed` names the gate, exit 0
- [ ] A cycle in the offered transitions → loop guard stops it
- [ ] Retargeted `done` (target ≠ last rung) → skip, no category fallback
- [ ] Target *is* last rung → fallback still available

**Command**: `node --test 'shared/resources/tests/*.test.mjs'`

---

### Integration Tests

**Scope**: replay against real captured board payloads

**Actions**:

- [ ] `In Progress → Ready for Showcase → Waiting for Review` on the RAPP Story fixtures
- [ ] Every existing fixture assertion passes unchanged
- [ ] `--print-plan` with no credentials returns hops and exits 0

**Command**: `npm test`

---

### Contract Tests

**Scope**: the CLI contract other steps depend on

**Actions**:

- [ ] Exit codes unchanged for every documented reason; `walk-incomplete` is 0 (1 under `--strict`)
- [ ] An unhandled throw still exits 0
- [ ] `--dry-run` issues **no** POST

---

### Performance Tests

**Scope**: API call count

**Metrics**: calls per moment.

**Baselines**: today, 1 × `getTransitions` + 1 × transition.

**Expectations**: `1 + 2n` for an n-hop walk. A one-rung ladder must remain exactly at the baseline
— assert the call count for the default ladder.

---

### Consumer Tests

**Scope**: a real board, without moving cards

**Actions**:

- [ ] `--dry-run` across one real issue in each real column, diffed against the ladder
- [ ] `--print-plan` for every moment, offline

---

## 9. Success Criteria

### Functional

- [ ] A ladder with an intermediate rung walks through it and lands on the target
- [ ] A blocked second hop reports `walk-incomplete` with `landed` and `remaining`, exit 0
- [ ] Retargeted `done` skips instead of firing the done-category transition
- [ ] `--print-plan` works with no credentials and no network
- [ ] All existing fixture assertions pass unchanged

### Performance

- [ ] Default (one-rung) path makes exactly the same API calls as today
- [ ] `getTransitions` re-fetched once per hop, never speculatively

### Code Quality

- [ ] `walkLadder` reuses `transitionToStatus`; no second copy of worklog retry or field-filling
- [ ] Never throws; exit codes unchanged
- [ ] `jira-stage.js`'s header no longer overpromises about `--dry-run`

### Migration

- [ ] `CHANGELOG.md` records both behavioural changes, including why narrowing rule 4 is correct
- [ ] `jira-transition-protocol.md` states the one-hop limit
- [ ] `docs/reference/tracker-workflow.md` documents Jira execution semantics

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

- [ ] `terminal` threaded from the caller
- [ ] Retarget case tested

### Phase 2: `walkLadder`

- [ ] Hop loop with per-hop re-fetch
- [ ] Loop and monotonicity guards
- [ ] `walk-incomplete` reporting

### Phase 3: `jira-stage.js`

- [ ] Ladder resolution with JSON-record fallback
- [ ] `--print-plan`
- [ ] Honest `--dry-run` + header amendment

### Phase 4: MCP fallback prose

- [ ] Consumes `--print-plan`
- [ ] One-hop rule stated

### Phase 5: Tests

- [ ] Unit + fixture + parity coverage

---

## References

- **Depends on**: task.37 (`tracker-workflow.js`, the ladder and `planMove`)
- **Related**: task.39 (GitHub engine — no walking, no graph), task.41 (new moments)
- **Key code**: `jira-sync.js:2062` (`resolveTransition`), `:2174` (`transitionToStatus`), `:2241`
  (monotonicity guard); `jira-stage.js:87-110` (`describeAlternatives`), `:196-239` (`--dry-run`)
- **Fixtures**: `shared/resources/tests/fixtures/rapp-story-*.json` — already contain
  `Ready for Showcase` (ids 21, 151) as a reachable destination no moment targets

---

## Notes

### Important Reminders

- Re-fetch transitions after **every** hop. Caching the first list defeats the entire feature —
  transitions are position-dependent.
- Do not "fix" `jira-stage.js:249`'s `localStatus` expression; it is correct and a naive change
  breaks resolution filling on retargeted terminals.
- A partial walk is a distinct outcome from both success and no-op. Three states, three messages.

### Known Issues

**Open** (non-blocking):

- ⚠️ The MCP fallback remains one-hop-only by design. A ladder consumer without API credentials
  moves gated cards by hand.
