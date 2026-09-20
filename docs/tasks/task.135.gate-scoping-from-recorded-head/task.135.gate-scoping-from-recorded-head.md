---
id: task.135
title: "[Task 135] A gate's `updated:` is a typed claim that three consumers treat as a clock: record the reviewed head on the gate, scope the next cycle from that commit, and stamp the time from `date -u`"
type: task
description: "Stop deriving the QA loop's re-review scope and the re-review trigger from a hand-written gate timestamp — on task.130 four gates were stamped in local time labelled Z (up to three hours in the future), so `git log --since` matched nothing and silently widened to the whole branch, and a later gate preceded the commit it reviewed. Gates record `head:` (the commit reviewed); cycle N+1 scopes `git diff <head>..HEAD`; `updated:` is written by the clock and checked against the head's author time."
tags: [pipeline, qa-loop, qa-task, qa-story, scoping]
category: refactoring
status: planned
priority: Medium
created: 2026-09-20
updated: 2026-09-20
assignee:
estimated_effort_hours: 4
github_issue: 444
risk_level: medium
---

# Technical Task: Gate scoping from a recorded head, not a typed timestamp

**Status:** Planned
**GitHub Issue**: [#444](https://github.com/Gamaroff/agent-skills/issues/444)

---

## 1. Overview

Three places read a gate file's `updated:` as if it were a clock: the re-review **trigger** (`qa-task` Phase 0 step 3, `git log --since="$GATE_DATE"` and `DOC_DATE > GATE_DATE`), the cycle-3+ **scope** (`qa-re-review-scope.md` and both skills' Step 3b: `git log --since="$LAST_GATE_DATE" --name-only`), and the Step 5c conformance lens (*"`updated:` older than the newest artifact beside it"*). The value is typed by the agent writing the gate. On task.130 the seven gates read, against the author time of the commit each reviewed: gates 1–4 stamped `11:50Z … 14:10Z` for commits at `10:03Z … 11:14Z` — local time written with a `Z` suffix, up to **three hours in the future** — and gate 7 stamped `12:58Z` for a commit at `13:12Z`, fourteen minutes in the past. The first shape made cycle 4's `--since` match nothing, and the empty pathspec **silently widened the diff to the whole branch** (caught only by the scoped-diff non-vacuity guard, and rebuilt by hand from the fix commit); the second was found by the 5c re-check as PC-2. Every one of the seven cycles' scopes was in fact rebuilt from a commit hash by the orchestrator, because the hash was the only reliable input — which is the design this task makes official.

**Scope**: the gate template's frontmatter (`head:`), the two QA skills' gate writers and Phase 0 / Step 3b readers, `shared/resources/qa-re-review-scope.md` (the scope snippet and its table), the conformance prompt's consistency row, a gate-freshness test, bundled copies, CHANGELOG.

**Key deliverables**: (1) every gate carries `head: <40-hex>` — the commit the review was performed against — written from `git rev-parse HEAD` at gate-write time; `updated:` is written from `date -u +%Y-%m-%dT%H:%M:%SZ` in the same block, never typed. (2) Cycle N+1's scope is `git diff "<gate N head>"..HEAD --name-only` (files) and `git diff "<gate N head>"..HEAD -- <files>` (patch) — no `--since`; the re-review trigger's "code moved since the gate" is `git rev-list --count <head>..HEAD -- <paths>`. (3) A test that reads every gate in `docs/` and fails when `head:` is absent, is not an ancestor of the branch that carries the gate, or when `updated:` is earlier than the head's author time. (4) The 5c conformance row compares `updated:` to the head's author time, not to sibling mtimes.

**Expected outcome**: a gate says which commit it judged, and the next cycle's scope is derived from that fact; a typed timestamp can no longer widen a review to the whole branch or shrink it to nothing.

---

## 2. Motivation

### Current Problems

- **The scope depends on a clock the agent sets by hand.** `LAST_GATE_DATE=$(grep -E '^updated:' "$LATEST_GATE" …)` → `git log --since="$LAST_GATE_DATE"`. A stamp in the future returns nothing; a stamp too far in the past returns everything since; neither is detectable from the output, and the second is indistinguishable from a legitimately wide cycle.
- **Timezones are a free variable.** Four of task.130's gates carry local time with a `Z` suffix. Nothing validates the suffix against the clock, and `git log --since` believes it.
- **An empty result is a claim about the instrument.** When `--since` matches nothing, `git diff … -- ` with an empty pathspec is the *whole* diff. Task.130 cycle 4 only noticed because the non-vacuity guard tripped on a diff far larger than the changed-file count implied (task.130 `qa.4` § Review Methodology).
- **The re-review trigger has the same input.** `qa-task` Phase 0 step 3's `CODE_MOVED=$(git log --since="$GATE_DATE" …)` decides whether a `PASS` gate may be skipped; a future-dated stamp makes every later commit invisible to it, which is the exact failure the step's own rationale (task.52) warns about, reached by a different road.
- **The 5c lens compares the stamp to mtimes.** `updated: older than the newest artifact beside it` compares two things neither of which is the commit; on task.130 it caught gate 7 only because the lens read the fix commit's author time by hand.
- **Every cycle already recorded the head informally.** The implementation report's Decisions Log names the fix commit each gate reviewed; the orchestrator rebuilt every scope from those hashes. The fact exists; it is not on the gate.

### Benefits

- Scoping is a function of two commits, which cannot be typed wrong in a way `git` accepts silently.
- The re-review trigger reads "has anything landed since the commit this gate judged" — the question it is asking.
- A gate's timestamp becomes checkable: it must not precede its own head.
- The Decisions Log's "scope rebuilt from `<hash>`" workaround, written five times on task.130, becomes the rule.

---

## 3. Technical Background

### Current Architecture

- **Gate template** (`skills/qa-task/SKILL.md` § gate YAML, `skills/qa-story/SKILL.md` likewise): `schema: 1`, `task:`/`story:`, `gate:`, `status_reason:`, `reviewer:`, `updated: '{ISO-8601 timestamp}'`, `top_issues[]`, … — no head.
- **Re-review trigger** (`qa-task` Phase 0 step 3): `GATE_DATE`, `DOC_DATE`, `CODE_MOVED=$(git log --since="$GATE_DATE" --name-only --format="" -- apps packages …)`; skip only when `CODE_MOVED` is empty and `DOC_DATE ≤ GATE_DATE`.
- **Scope** (`shared/resources/qa-re-review-scope.md` § the fenced snippet; mirrored in both skills' Step 3b): `if PRIOR_GATES ≥ 2 && LAST_GATE_DATE && !SAFETY_REPROBE → FILES=$(git log --since="$LAST_GATE_DATE" --name-only --format="" | sort -u); git diff "$BASE...HEAD" -- "${FILES[@]}" > "$DIFF_FILE"`, with the non-vacuity HALT *"N files changed since … but the scoped diff is empty"*. The table's cycle-3+ row reads *"since `LAST_GATE_DATE`"*.
- **5c conformance** (`pr-conformance-prompt.md` § D): *"`updated:` older than the newest artifact beside it"*.
- **No test** reads gate timestamps.

### Target Architecture

- **Gate frontmatter**: `head: '<git rev-parse HEAD at write time>'` (required from this task; `schema: 2`), `updated:` written by `date -u`. The write block in both skills:
  ```bash
  GATE_HEAD=$(git rev-parse HEAD); GATE_UPDATED=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  ```
  substituted into the YAML — never a literal typed into the template.
- **Scope**: `LAST_GATE_HEAD=$(grep -E '^head:' "$LATEST_GATE" | …)`; `git cat-file -e "$LAST_GATE_HEAD^{commit}" || HALT "gate N names a head this checkout does not have"`; `git merge-base --is-ancestor "$LAST_GATE_HEAD" HEAD || HALT "gate N's head is not an ancestor of HEAD — the branch was rewritten"`; `FILES=$(git diff --name-only "$LAST_GATE_HEAD"..HEAD)`; the non-vacuity guard stays. The table row reads *"since gate N's `head:`"*. A `schema: 1` gate with no `head:` → the cycle runs **unscoped** and says so (`scope: unscoped — prior gate carries no head (schema 1)`), never `--since`.
- **Re-review trigger**: `CODE_MOVED=$(git rev-list --count "$GATE_HEAD"..HEAD -- apps packages shared skills …)`; the document-edited check becomes `git diff --quiet "$GATE_HEAD"..HEAD -- "$TASK_FILE"`.
- **5c row**: *"`updated:` earlier than `git log -1 --format=%aI <head>` — the gate claims to predate the commit it judged"*.
- **Test** `shared/resources/tests/gate-head-freshness.test.mjs`: for every `*.gate.*.yml` under `docs/` with `schema: 2`: `head:` present and 40-hex; `git cat-file -e`; `git merge-base --is-ancestor <head> <branch tip>`; `updated:` ≥ the head's author time; plus a non-vacuity floor (≥ 1 schema-2 gate once the first ships; the corpus test skips schema-1 gates and counts them).

### Important Clarifications

- **`head:` is the commit reviewed, not the commit the gate is committed in.** The gate file lands in a later commit (the fix commit, path 1/2 of *Where the gate and QA report get committed*); its `head:` names the tree the reviewer read.
- **Old gates are not backfilled.** They carry no head and cannot be given one honestly; readers treat `schema: 1` as "no head — unscoped".
- **`git diff <head>..HEAD` and `git diff <base>...HEAD -- <files>` differ.** The first is the change since the gate; the second is the branch's cumulative change on those files. Step 3b wants the second for the *patch* (the reviewer needs context) and the first for the *file list*; the plan keeps that split.

---

## 4. Scope

### In Scope

✅ `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` — gate template (`schema: 2`, `head:`), gate write block, Phase 0 trigger, Step 3b scope
✅ `shared/resources/qa-re-review-scope.md` — snippet + table
✅ `shared/resources/pr-conformance-prompt.md` § D
✅ 🆕 `shared/resources/tests/gate-head-freshness.test.mjs`
✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — the one sentence citing "files changed since the last gate's `updated:` date"
✅ `npm run bundle`; CHANGELOG

### Out of Scope

❌ Backfilling `head:` on existing gates
❌ The implementation report's Decisions Log format
❌ Route 2c (task.134); task.130 residue (task.133)
❌ `qa-gate` skill's standalone gate writer — verify it emits the same template; include only if it does (grep first)

---

## 5. Breaking Changes

### Breaking Change 1: gate `schema: 2` requires `head:`

**What Changed**: a gate written by `qa-task`/`qa-story` carries `schema: 2` and a required `head:`; the freshness test fails a schema-2 gate without one.

**Before**: `schema: 1`, `updated:` typed; scope from `--since`.

**After**: `schema: 2`, `head:` + `updated:` written from git and the clock; scope from `head..HEAD`.

**Impact on consumers**: readers that key on `schema: 1` (grep `schema:` across `shared/resources/*.js`, `evals/`) must accept 2; a consumer's own gate-reading tooling that hard-codes `1` breaks loudly, not silently.

**Migration Path**: none for existing gates (schema 1 stays valid and reads as "no head"); a consumer with custom gate tooling adds `2` to its accepted schemas.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.135.plan.gate-scoping-from-recorded-head.md](task.135.plan.gate-scoping-from-recorded-head.md)

### Phase 1: `head:` on the gate, timestamps from the clock

**Risk**: Low
**Files**: both SKILL.md gate templates + write blocks

- [ ] `schema: 2`; `head: '{GATE_HEAD}'`; `updated: '{GATE_UPDATED}'`; the write block binds both from `git rev-parse HEAD` / `date -u`
- [ ] Grep every `schema: 1` reader (`shared/resources/*.js`, `evals/`, tests) and accept 2
- [ ] Eval fixtures that assert gate content: re-record or widen to accept `head:`

### Phase 2: Scope and trigger from the head

**Risk**: Medium (every cycle-3+ review's input changes)
**Files**: `qa-re-review-scope.md`, both SKILL.md Step 3b + Phase 0

- [ ] Snippet: `LAST_GATE_HEAD` read; `cat-file -e` and `merge-base --is-ancestor` HALTs; `FILES` from `git diff --name-only <head>..HEAD`; schema-1 gate → unscoped with the stated reason; table row updated
- [ ] Phase 0 trigger: `rev-list --count <head>..HEAD -- <paths>`; document-edited via `git diff --quiet <head>..HEAD -- <doc>`
- [ ] Step 5-6 file: the "since the last gate's `updated:` date" sentence → "since gate N's `head:`"
- [ ] Executed test of the snippet (bash + zsh): a gate whose `updated:` is three hours in the future and whose `head:` is two commits back scopes to exactly the two commits' files (today: empty → whole branch)

### Phase 3: Freshness test and the 5c row

**Risk**: Low
**Files**: 🆕 `tests/gate-head-freshness.test.mjs`, `pr-conformance-prompt.md`

- [ ] Corpus test over `docs/**/*.gate.*.yml`: schema-2 gates carry a 40-hex `head:` that exists, is an ancestor of the branch tip, and whose author time ≤ `updated:`; schema-1 gates counted and skipped; non-vacuity floor
- [ ] Mutation: a fixture gate with `updated:` before its head's author time → red; `head:` absent → red
- [ ] 5c § D row rewritten to compare against the head's author time

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/qa-task/SKILL.md` — gate template, write block, Phase 0 step 3, Step 3b
2. ✅ `skills/qa-story/SKILL.md` — same
3. ✅ `shared/resources/qa-re-review-scope.md` — snippet, table
4. ✅ `shared/resources/pr-conformance-prompt.md` — § D row
5. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — one sentence

### Files to Modify (Tests)

6. 🆕 `shared/resources/tests/gate-head-freshness.test.mjs`
7. ✅ `evals/develop-task/step-isolation/*` fixtures asserting gate frontmatter (grep `updated:`/`schema:` in `scenario.json`)
8. ✅ any test reading `schema: 1`

### Files to Modify (Documentation)

9. ✅ `CHANGELOG.md` — [Unreleased], Breaking (schema 2)
10. ✅ `skills/*/references/` — regenerated

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: the freshness corpus test; the executed scope snippet under both shells with a future-dated gate; the trigger's `rev-list` form with a future-dated gate (today: skip; after: re-review).
- **Mutation proofs**: `updated:` before head → red; `head:` absent → red; scope snippet reverted to `--since` → the future-dated fixture yields an empty file list.
- **Command**: `npm run ci:fast`; `command node --test shared/resources/tests/gate-head-freshness.test.mjs`.

### Integration Tests

- `npm run eval:develop-task` / `eval:develop-story` — fixtures that replay a QA cycle assert `head:` present on the recorded gate.

### Contract Tests

- `bundle:check` 0; the step-5-6 sentence, the scope table and both Step 3b blocks name the same input (`head:`), asserted by grep in the freshness test (no `--since=` under `skills/qa-*/SKILL.md` Step 3b or `qa-re-review-scope.md`).

### Performance Tests

Not applicable — two `git` reads per cycle.

### Consumer Tests

- A consumer with schema-1 gates only: cycle 3+ runs unscoped with the stated reason; nothing HALTs.

---

## 9. Success Criteria

### Functional

- [ ] A gate written by either skill carries `schema: 2`, a 40-hex `head:` equal to the reviewed commit, and an `updated:` from the clock
- [ ] Cycle N+1's file list equals `git diff --name-only <gate N head>..HEAD` regardless of the gate's `updated:`; a future-dated gate no longer yields an empty list or the whole branch
- [ ] The re-review trigger re-reviews after a commit that a future-dated gate would have hidden
- [ ] A schema-1 prior gate produces an unscoped cycle with the reason printed, never `--since`

### Performance

- [ ] Not applicable

### Code Quality

- [ ] Freshness test green over the corpus; three mutation proofs recorded; no `--since=` remains in the scope paths

### Migration

- [ ] CHANGELOG names schema 2 as Breaking with the reader migration; schema-1 gates untouched

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **A rewritten branch orphans a gate's head**
   - **Risk**: after a rebase, `head:` is not an ancestor of HEAD; the ancestor check HALTs every later cycle.
   - **Probability**: Low (the pipeline never rebases) · **Impact**: Medium
   - **Mitigation**: the HALT names the cause and the remedy (run the cycle unscoped by deleting nothing — pass `SAFETY_REPROBE=true` semantics, or re-record the gate's head); document in the scope file.
2. **Schema bump breaks an unknown reader**
   - **Mitigation**: Phase 1's grep across `shared/resources`, `evals`, `skills/*/scripts`; the freshness test's floor ensures at least one schema-2 gate is exercised by CI once the first ships.

### Low Risk Areas

1. **The 5c row now needs a git read** — the lens already runs `git show`; one `git log -1 --format=%aI` more.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: cycle 3+ HALTs on a valid gate (ancestor or cat-file check wrong); a schema-2 gate fails to write.
- **Steps**: revert Phase 2 (scope/trigger) — Phase 1's `head:` field is harmless alone; `npm run bundle`; push.
- **Validation**: a cycle-3 replay scopes as before.

### Partial Rollback (1-2 hours)

- **When to use**: the freshness test misreads timezones on CI (Linux `date` vs macOS) — revert Phase 3 only, keep `head:` and the scope.

### Forward Fix (< 4 hours)

- **When to use**: a reader accepting only schema 1 is found after merge — add `2` to its accepted set.

### Rollback Triggers

- **Critical**: any QA cycle blocked by the new checks on a healthy branch.
- **Non-critical**: test timezone handling; wording.

---

## Change Log

<!-- change-log-start -->

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-09-20 | 1.0 | Initial draft — obs #136; task.130 cycle 4 `--since` widening, 5c PC-2; gates 1–4 stamped local-as-Z | create-task |

<!-- change-log-end -->

## Progress Tracking

- [ ] Phase 1: `head:` on the gate
- [ ] Phase 2: scope and trigger from the head
- [ ] Phase 3: freshness test + 5c row
- [ ] QA: `task.135.qa.[N].gate-scoping-from-recorded-head.md`
- [ ] Gate: `task.135.gate.[N].gate-scoping-from-recorded-head.yml`

## References

- Observation #136
- `docs/tasks/task.130.…/task.130.qa.4.…md` § Review Methodology (the widening); `task.130.pr-review.1.…md` § Re-check PC-2
- Task.130's seven gates vs their reviewed commits: gates 1–4 `11:50Z–14:10Z` for commits `10:03Z–11:14Z`; gate 7 `12:58Z` for `13:12Z` (`git log --format=%aI 3479b14a fdba78d9 fa3e3fdc b07373df a9bccb13 8b4c0e60`)
- `shared/resources/qa-re-review-scope.md`; task.52 (the re-review trigger's rationale)

## Notes

- QA artifacts land beside this file: `task.135.qa.[N].*.md`, `task.135.bug.[N].*.md`, `task.135.gate.[N].*.yml`.
- Independent of tasks 133 and 134. Its own first gate will be the first schema-2 gate in the corpus, which is what makes the freshness test's floor non-vacuous from the day it ships.
