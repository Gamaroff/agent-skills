---
id: task.142
title: "[Task 142] Pin the hand-written reference docs to the skills they describe"
type: task
description: "docs/reference/commands.md and docs/reference/activation-phrases.md restate what 64 skills do, and nothing connects a skill's directory to the rows that cite it — qa-next's rows went stale within a day of the rework that invalidated them. Add tests/reference-doc-skill-pinning.test.js: every command a row names resolves to a skill, every --flag a row advertises is one that skill's SKILL.md documents, and every skill named in the activation table exists — each with a non-vacuity floor so a broken extractor cannot pass by finding nothing."
tags: [documentation, guard, reference-docs, drift, observation-159]
category: testing
status: ready-for-review
priority: Medium
created: 2026-09-22
updated: 2026-09-30
assignee:
estimated_effort_hours: 4
risk_level: low
github_issue: 467
---

# Technical Task: Pin the hand-written reference docs to the skills they describe

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.142.review.1.reference-doc-skill-pinning.md` implemented 2026-09-30

**GitHub Issue**: [#467](https://github.com/Gamaroff/agent-skills/issues/467)

---

## 1. Overview

A skill's behaviour is documented in four places: its `SKILL.md`, its `README.md`,
`docs/reference/commands.md` and `docs/reference/activation-phrases.md`. One of those four is
generated and guarded (`skill-catalog.md`, via `npm run check:generated`). The other three are
hand-written, and an author editing `skills/<name>/` sees only two of them. This task adds the
missing connection for the two `docs/reference/` files, as far as it can honestly be mechanised.

**Scope**: one new test file, `tests/reference-doc-skill-pinning.test.js`, plus the two small
documentation fixes its assertions surface. `tests/*.test.js` is already in the `npm test` glob, so
no `package.json` change is needed.

**Key deliverables**:

1. Three assertion groups — command resolution, flag existence, activation-table resolution — each
   with a measured non-vacuity floor.
2. The `/loop /<command>` wrapper and the four non-slash `run-loop.mjs` rows handled explicitly
   rather than by a silent skip.
3. An explicit, written statement of what the test **cannot** catch, so the next reader does not
   mistake a green run for "the reference docs are correct".

**Expected outcome**: a reference row that advertises a command or a flag the skill does not have
fails CI on the commit that introduces the mismatch, instead of being found by someone reading.

---

## 2. Motivation

### Current Problems

1. **Nothing reaches the reference docs from a skill change.** `qa-next` was re-indexed from stories
   to user functions on 2026-09-22 (`cd1a5ab4`, `1bb0e546`). That series rewrote `SKILL.md`, rewrote
   `README.md`, cited the rework in the changelog and regenerated the catalog. It left both reference
   rows untouched, so within a day of being written — same branch series, same author —
   `commands.md` described the skill's unit of work as a *story* and `activation-phrases.md` offered
   "UAT the next accepted **story**" as its trigger phrase (obs #159).
2. **A renamed or deleted skill leaves a row behind.** Nothing asserts that the 64 skills named
   across the two files still exist.
3. **A row can advertise a flag that does not exist.** 14 flag mentions are currently asserted by
   nothing; a reader copies the invocation and it fails.
4. **The obligation has nowhere to live.** It is being written into `create-skill` as a prose rule
   (obs #159, staged) — and that entry's own Principle is that a convention documented and not
   enforced drifts. The prose is the half that covers what no test can reach; this is the other half.

### Benefits

1. **The mismatch fails on the commit that introduces it**, not months later by inspection.
2. **A measured floor, not a hopeful one**: each group asserts how many assertions it ran, so a regex
   that stops matching turns the test red rather than green. Measured today: 75 command rows, 14 flag
   assertions, 67 activation-table skill mentions over 62 distinct skills.
3. **The edge cases become explicit.** `/loop /develop-next` and the four `run-loop.mjs` rows are
   currently invisible; the test names them.
4. **It is cheap and fast** — two file reads and a directory stat per row; no network, no spawn.
5. **It pairs with the `create-skill` rule** so the enforceable part is enforced and the rest is at
   least written down.

---

## 3. Technical Background

### Current Architecture

- `docs/reference/commands.md` — a set of Markdown tables. Every command row begins `` | ` `` and its
  first cell is a backticked invocation: `` `/develop-story <path>` ``, `` `/qa-next --dry-run` ``,
  `` `/loop /develop-next` ``, `` `run-loop.mjs status` ``. A first cell may itself contain an
  escaped pipe (`` `/review-pr [PR\|branch]` ``, line 60; `/tracker-reconcile`, line 116), and may
  quote a script path after the command (`/session-handoff`, line 143). Measured at `80f460bc` with
  the rule in § Target Architecture: 80 rows, 76 of them slash commands naming 63 distinct skills, 4
  non-skill rows, 20 flag assertions.
- `docs/reference/activation-phrases.md` — two-column tables; the right-hand cell backticks the skill
  name, and any flag as a **separate** backticked span in the same cell —
  `` `review-bug` (the second phrasing picks `--validate`) ``. Measured at `80f460bc`: 73 backticked
  spans in the right-hand cells, of which 67 are skill mentions naming 62 distinct skills, 2 are
  standalone flags, and 4 are other non-skill spans (`` `/develop-story` `` and `` `/develop-task` ``
  at line 32, the built-in `` `/security-review` `` at line 33, `` `handoff-verify.mjs` `` at line
  108) that the extractor must reject.
- `docs/reference/skill-catalog.md` — **generated** by
  `skills/create-skill/scripts/generate_catalog.py` and guarded by `npm run check:generated`. It is
  the control case: it tracked the `qa-next` rework without anyone remembering to update it.
- `tests/` — root-level suite, `tests/*.test.js` in the `npm test` glob. `node:test` + `node:assert`,
  no framework. Nearest neighbours in shape: `tests/bundled-links.test.js` (walks a corpus, asserts a
  property per item, floors the count) and `tests/mutation-call-site-coverage.test.js` (scans
  canonical sources for a forbidden invocation, with an allowlist).
- **Existing guards over the same two pages** (same-class inventory). `tests/skill-doc-coverage.test.js`
  asserts the **reverse** direction — every `skills/<name>/SKILL.md` is named in both pages, or sits
  on one of its two adoption lists. `tests/restricted-access-docs.test.js` reads both pages for the
  task.57 access labels only. The new file **sits beside** both: neither asserts that a name or flag
  the pages mention exists, and merging page → skill into the skill → page guard would couple two
  failure messages that point at different fixes (add a row vs. fix a row).

### Target Architecture

One new file, `tests/reference-doc-skill-pinning.test.js`, with three `describe` groups over a shared
row extractor:

```
extractCommandRows(md)  →  [{ raw, invocation, skill, flags, line }]
extractActivationSkills(md) → [{ skill, flags, line }]
```

The row is split on **unescaped** pipes (`/(?<!\\)\|/`), so `` `/review-pr [PR\|branch]` `` stays one
cell. `skill` resolution: of the `/<name>` tokens that begin at a **word start** in the first cell —
start of cell, whitespace, a backtick or `(` — take the **last**, so `` `/loop /develop-next` ``
resolves to `develop-next` rather than to the `/loop` built-in, and a quoted path such as
`.agents/skills/session-handoff/scripts/handoff-verify.mjs` contributes nothing (its `/` segments
follow a letter). Plain "last `/token` in the cell" resolves line 143 to `handoff-verify` — measured
during review. A cell with no word-start `/` token is a non-skill row, matched against a small named
allowlist (`run-loop.mjs …`) and counted, never silently dropped. Flags are every `--flag` in the
first cell.

### Important Clarifications

- **The test pins vocabulary, not meaning.** It would not have caught "story" → "function", because
  that is prose. Section 4 says so, and the test file says so in a header comment; a guard whose
  limits are not written down gets read as covering more than it does.
- **Only one direction is asserted.** Every flag the reference names must exist in the skill; a skill
  may have flags the reference does not list. The reverse assertion would demand the reference
  enumerate every flag, which is not what it is for.
- **The floors are the instrument check.** An empty result is a claim about the instrument: a scan
  that returns nothing means either there is nothing to find or the reader is broken, and those are
  byte-identical from the caller's side.

---

## 4. Scope

### In Scope

✅ `tests/reference-doc-skill-pinning.test.js` — three assertion groups plus floors.
✅ Explicit handling of the `/loop` wrapper and the `run-loop.mjs` rows.
✅ A header comment in the test stating what it does **not** catch.
✅ Any reference-doc fix the assertions surface on first run.

### Out of Scope

❌ **Prose accuracy** — that a row's *What it does* cell describes the skill correctly. No assertion
reaches it; the `create-skill` rule staged under obs #159 is the counterpart that covers it.
❌ **The skill `README.md`s** — the third hand-written restatement. Same argument, larger corpus, and
no stable row structure to extract; a separate question.
❌ **Generating `commands.md`** from the skills. It is a reasonable end state and a much bigger
change — it would supersede both halves of obs #159 rather than close them. Noted in § Notes.
❌ **`docs/reference/skill-catalog.md`** — already generated and guarded.

---

## 5. Breaking Changes

None — API stable. The change is one new test file. The only way it alters behaviour is by failing
CI on a reference row that is already wrong, which is the point.

---

## 6. Implementation Plan

> Detailed implementation guide:
> [task.142.plan.reference-doc-skill-pinning.md](task.142.plan.reference-doc-skill-pinning.md)

### Phase 1: The extractors

**Risk Level**: Low

**Files**:

- `tests/reference-doc-skill-pinning.test.js`

**Changes**:

- [x] `extractCommandRows(md)` — rows beginning `` | ` ``, split on unescaped pipes, first cell,
      last **word-start** `/<name>` token wins, `--flag` tokens collected, line number retained for
      the failure message. CommonJS (`require`), like every neighbour in `tests/` —
      `package.json` is `"type": "commonjs"`.
- [x] `extractActivationSkills(md)` — right-hand cell; each backticked span whose head token starts
      with a letter or digit and is `[a-z0-9-]+` is a skill mention. Spans starting `--`, `/` or
      carrying a `.` (a script name) are not, and are skipped.
- [x] `NON_SKILL_ROWS` — the named allowlist for `run-loop.mjs run|dry-run|status|watch`, asserted to
      be **exactly** what the extractor could not resolve, so a new unresolvable row fails rather than
      joining a silent bucket.

**Dependencies**: none.

---

### Phase 2: The assertions and their floors

**Risk Level**: Low

**Files**:

- `tests/reference-doc-skill-pinning.test.js`

**Changes**:

- [x] Every extracted command resolves to a `skills/<name>/SKILL.md` that exists.
- [x] Every `--flag` in a command row appears literally in that skill's `SKILL.md`.
- [x] Every skill named in `activation-phrases.md` resolves to `skills/<name>/`.
- [x] Floors, stated as *at least* and re-measured against the tree as built (the review measured
      80 rows, 20 flag assertions and 67 activation mentions at `80f460bc`): ≥ 70 command rows,
      ≥ 16 flag assertions, ≥ 58 activation-table skills. Each floor is its own assertion with a message saying
      the extractor is probably broken, not that the corpus shrank.
- [x] Failure messages name the **file and line** of the offending row and the skill it names.

**Dependencies**: Phase 1.

---

### Phase 3: First run, and what it surfaces

**Risk Level**: Low

**Files**:

- `docs/reference/commands.md`, `docs/reference/activation-phrases.md` (only if the run finds
  something)
- `tests/reference-doc-skill-pinning.test.js` (header comment)

**Changes**:

- [x] Run against the tree as it stands. Measured during review (at `80f460bc`, with the corrected
      rule): 0 unresolvable skills, exactly the 4 `run-loop.mjs` non-skill rows, and **one** real flag
      failure — `commands.md:143` advertises `/session-handoff --read`, and
      `skills/session-handoff/SKILL.md` never mentions `--read` (read mode is a mode, invoked by
      intent; its script is `handoff-verify.mjs`). Any other red means the extractor is wrong.
- [x] Fix row 143 to describe read mode without inventing a flag.
- [x] Fix anything it legitimately finds, in the same commit.
- [x] Write the header comment: what this test pins, and — explicitly — that prose drift is not
      pinned, with the `qa-next` story→function case named as the example it would have missed.
- [x] Mutation-prove all three groups.

**Dependencies**: Phases 1–2.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `tests/reference-doc-skill-pinning.test.js` — **new**. The whole task.

### Files to Modify (Tests)

Same file — this task *is* a test.

### Files to Modify (Dependencies)

None. `tests/*.test.js` is already in the `npm test` glob; confirm rather than edit.

### Files to Modify (Documentation)

2. ✅ `docs/reference/commands.md` — only if the first run finds a real defect.
3. ✅ `docs/reference/activation-phrases.md` — likewise.
4. ✅ `CHANGELOG.md` — `[Unreleased]`.

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: the extractors, against inline fixture strings rather than the live corpus, so their
behaviour is pinned independently of what the real documents happen to contain.

**Actions**:

- [x] A row with a plain command resolves to that skill.
- [x] `` `/loop /develop-next` `` resolves to `develop-next`, not `loop`.
- [x] A row with two flags yields both.
- [x] A non-slash row is returned as unresolvable, not dropped.
- [x] An activation cell of `` `review-bug --validate` `` yields skill `review-bug`, flag
      `--validate`.

**Command**: `npm test`

**Target**: every branch of both extractors.

---

### Integration Tests

**Scope**: the assertions against the live `docs/reference/` corpus — which is the test's actual job.

**Actions**:

- [x] All three groups green on the current tree.
- [x] Each floor assertion passes with the real counts, and fails when the extractor is stubbed to
      return `[]`.

**Command**: `npm test`

---

### Contract Tests

**Scope**: the surrounding suite.

**Actions**:

- [x] `npm test` overall result unchanged apart from the new file's cases.
- [x] `npm run check:generated` still green — this task touches nothing generated.

---

### Performance Tests

**Scope**: no performance dimension. The properties worth holding are cost properties.

**Metrics to Measure**: file reads per run (two reference documents, plus one `SKILL.md` per distinct
skill named, memoised), process spawns (zero), network calls (zero).

**Baselines**: the root suite runs at `--test-concurrency=4`; this file should be among its fastest.

**Expectations**: well under a second; no measurable effect on suite wall-clock.

---

### Consumer Tests

**Scope**: none — this test reads repository documentation and never ships to a consumer.

**Files to Test**: n/a.

**Command**: n/a.

---

## 9. Success Criteria

### Functional

- [x] Every command named in `commands.md` resolves to an existing skill, or to the named non-skill
      allowlist.
- [x] Every `--flag` a command row advertises exists in that skill's `SKILL.md`.
- [x] Every skill named in `activation-phrases.md` exists.
- [x] `/loop /develop-next` resolves to `develop-next`.
- [x] A row naming a deleted skill fails the test (proved by mutation).
- [x] A row advertising a non-existent flag fails the test (proved by mutation).

### Performance

- [x] No process spawn, no network call.
- [x] `SKILL.md` reads are memoised per skill, not per row.
- [x] No measurable change to `npm test` wall-clock.

### Code Quality

- [x] `node:test` + `node:assert` only, matching `tests/bundled-links.test.js`.
- [x] Three floor assertions, each with a message pointing at the extractor rather than the corpus.
- [x] Failure messages carry file, line and the offending token.
- [x] A header comment stating what the test does **not** catch, naming the story→function case.
- [x] Prettier clean; `npm test` green with the `.claude/skills` symlink moved aside.

### Migration

- [x] `CHANGELOG.md` `[Unreleased]` records the new guard.
- [ ] Observation #159 marked `actioned` once this merges **and** the staged `create-skill` rule is
      installed — the two halves close it together. _Post-merge: the `create-skill` half was installed
      2026-09-25 (PR #487), so the merge of this task is the last condition._
- [x] No consumer-facing change; nothing to migrate.

---

## 10. Risk Assessment

### High Risk Areas

None. One new test file, no production path.

### Medium Risk Areas

**1. A guard that reads as covering more than it does**

- **Risk**: a green run is taken as "the reference docs are correct", when the defect that motivated
  the task — prose describing the wrong unit of work — is exactly what it cannot see.
- **Probability**: Medium, and this is the failure mode the repository has hit before: a guard that
  passed on the exact regression it was named for.
- **Impact**: Major, because it would retire the human sweep that does catch prose.
- **Mitigation**: the limitation is written in three places that a reader actually hits — the test's
  header comment, § 4 Out of Scope, and the `create-skill` rule staged under obs #159, which stays
  even after this lands.
- **Rollback**: none needed; it is a documentation-of-limits problem, fixed by writing.

### Low Risk Areas

**1. Extractor brittleness**

- **Risk**: someone reformats a table and the regex stops matching, turning the test green by finding
  nothing.
- **Probability**: Medium. **Impact**: Minor, given the mitigation.
- **Mitigation**: the floors, which exist for exactly this and fail loudly with a message that names
  the extractor as the suspect.

**2. A legitimate new non-skill row**

- **Risk**: a future row that is not a slash command fails against the named allowlist.
- **Probability**: Low. **Impact**: Trivial — the failure message says to add it to `NON_SKILL_ROWS`.
- **Mitigation**: that is the intended behaviour; a silent bucket is what it is avoiding.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: the test is flaky, or it is red on `develop` for a reason nobody can localise.

**Steps**:

1. `git rm tests/reference-doc-skill-pinning.test.js` (or revert the merge commit).
2. `npm test` green.
3. Reopen observation #159 to `open` with a resolution line saying which half was reverted.

**Verification**: `npm test` passes and no other suite referenced the deleted file.

---

### Partial Rollback (1-2 hours)

**When to Use**: one of the three groups is wrong — most plausibly the flag assertion, if a skill
legitimately documents a flag only in its `README.md` or a `references/` file.

**Steps**:

1. Delete that `describe` block and its floor; keep the other two.
2. Note in the test header which group was removed and why, so it is not silently re-added.

---

### Forward Fix (< 4 hours)

**When to Use**: an extractor edge case, a floor set too high, a failure message that does not say
enough to act on. None of these is a reason to revert a guard.

**Approach**: fix in place and add the fixture case that would have caught it.

---

### Rollback Triggers

**Critical (Immediate Rollback)**: flaky results; red for an unlocatable reason.

**Non-Critical (Forward Fix)**: extractor edge cases, floor values, message wording, allowlist
additions.

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-30
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report

- **Full Report**: [task.142.qa.1.reference-doc-skill-pinning.md](./task.142.qa.1.reference-doc-skill-pinning.md)
- **Gate File**: [task.142.gate.1.reference-doc-skill-pinning.yml](./task.142.gate.1.reference-doc-skill-pinning.yml)

### Test Coverage Summary

- **Tests Executed**: 15 (9 fixture, 6 live-corpus); full `ci:fast` suite 4712 pass / 0 fail
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings

No critical issues. Two low advisory findings: CR-1 (the flag check is a substring match, so `--read` would pass on `--read-only`) and CR-2 (an unused activation `flags` field).

## Definition of Done - Gaps Identified

**Status:** IN PROGRESS (document status unchanged: `ready-for-review`)

### QA Gate Status

**QA Report**: `task.142.qa.1.reference-doc-skill-pinning.md`
**Gate File**: `task.142.gate.1.reference-doc-skill-pinning.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100

### Missing Criteria:

1. **Success Criteria — Performance (behaviour criteria with no test):**
   - [ ] AC7 — no process spawn, no network call: true by inspection, pinned by no test
   - [ ] AC8 — `SKILL.md` reads memoised per skill: true by inspection, pinned by no test
   - [ ] AC9 — no measurable `npm test` wall-clock change: measured ~133 ms, no test or budget asserts it

2. **Success Criteria — Migration (post-merge by construction):**
   - [ ] AC16 — observation #159 marked `actioned`: can only happen after the merge, so it cannot pass at `/finalise`

### Next Steps:

- [ ] Pin AC7 and AC8 with behavioural tests, or re-scope them
- [ ] Re-scope AC9 and AC16 out of the pre-merge Success Criteria (e.g. into Deferred Work)
- [ ] Re-run `/finalise`

**Estimated Effort:** Small (1-2 hours)

**Gap Report Generated:** 2026-09-30

**Detailed Verification Log:** See `task.142.dod.1.reference-doc-skill-pinning.md` for complete verification evidence.

## Implementation Notes

### Implementation Summary

- `tests/reference-doc-skill-pinning.test.js` (new, CommonJS): two extractors, a named
  `NON_SKILL_ROWS` list asserted exactly, three live-corpus groups with floors, nine fixture tests.
- `docs/reference/commands.md:143`: the one real finding — `/session-handoff --read` advertised a
  flag `skills/session-handoff/SKILL.md` never mentions. The row now describes read mode.
- `CHANGELOG.md` `[Unreleased]` › Added.

### Approach

Implemented inline from the plan, as corrected by `task.142.review.1`: split rows on unescaped
pipes; resolve the **last word-start** `/name` token of the first cell; collect every `--flag` in the
first cell; treat an activation span as a skill only when its head is `[a-z0-9][a-z0-9-]*`. Failures
are collected into one array per test and asserted empty, so a red run lists every offending row with
its file and line, not just the first.

### Testing Results

- `command node --test tests/reference-doc-skill-pinning.test.js`: 15 pass, 0 fail, ~170 ms, no
  process spawn, no network; `SKILL.md` reads memoised per skill.
- Live counts at `80f460bc` + this change: 80 command rows (76 slash, 63 skills), 4 non-skill rows,
  20 flag assertions, 67 activation mentions over 62 skills. Floors: ≥ 70 / ≥ 16 / ≥ 58.
- Mutation proofs — each turned the named assertion red and was restored:

  | Mutation | Red |
  | :--- | :--- |
  | Original row 143 (`/session-handoff --read`) restored | flag existence |
  | `/qa-next --dry-run --nope` | flag existence |
  | `run-loop.mjs watch` → `run-loop.mjs tail` | `NON_SKILL_ROWS` exact (both messages: unexpected + stale) |
  | `mv skills/qa-next skills/qa-next.bak` | command resolution + activation resolution |
  | `extractCommandRows` → `[]` | command floor, flag floor, `NON_SKILL_ROWS`, 6 fixtures |
  | `extractActivationSkills` → `[]` | activation floor, 2 fixtures |
  | First `/token` wins instead of last | command resolution (`/loop`), 1 fixture |
  | Plain `split("\|")` | the escaped-pipe fixture |
  | Any `/name`, not word-start | command resolution (row 143 → `handoff-verify`), 1 fixture |
  | Activation head check removed | activation resolution, 1 fixture |

- `npm run ci:fast` with both `.claude/skills` and `.agents/skills` symlinks moved aside: prettier
  clean; 4,713 tests, 4,712 pass, 0 fail, 1 skipped (pre-existing). `npm run check:generated` green.

### Completion Date

2026-09-30

### Deferred Work

- Observation #159 → `actioned` after merge (the `create-skill` half is already installed).
- Generating `commands.md` from skill frontmatter, and pinning the skills' `README.md`s — § Notes,
  Future Improvements; out of scope here.

<!-- change-log-start -->

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-22 | 1.0     | Initial draft | create-task |
| 2026-09-30 | 1.1     | Review 9/10 after fixes — resolver rule corrected (word-start `/name`, unescaped-pipe split), CommonJS, existing guards named, one real finding (`/session-handoff --read`) recorded for Phase 3, counts re-measured | review-task |
| 2026-09-30 |         | Status → ready-for-development | review-task |
| 2026-09-30 |         | Implemented — 1 new test file (15 tests), 1 reference-doc row fixed, CHANGELOG entry | develop |
| 2026-09-30 |         | QA gate PASS (100/100) — 0 blocking, 2 low advisory findings | qa-task |
| 2026-09-30 |         | DoD incomplete — 4 gaps identified | finalise |

<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: The extractors

- [x] `extractCommandRows`
- [x] `extractActivationSkills`
- [x] `NON_SKILL_ROWS` asserted exactly

### Phase 2: The assertions and their floors

- [x] Command resolution
- [x] Flag existence
- [x] Activation-table resolution
- [x] Three floors, with extractor-blaming messages

### Phase 3: First run, and what it surfaces

- [x] Green against the live corpus
- [x] Any real finding fixed in the same commit
- [x] Header comment naming what is not pinned
- [x] All three groups mutation-proved

---

## References

- **Observation**: #159 — "A skill rework sweeps SKILL.md and its README;
  `docs/reference/commands.md` and `activation-phrases.md` cite the same skill and nothing reaches
  them". The prose half is staged against `create-skill`; this task is the enforceable half.
- **Related documents**: `docs/reference/commands.md`, `docs/reference/activation-phrases.md`,
  `docs/reference/skill-catalog.md` (the generated control case)
- **Nearest test neighbours**: `tests/bundled-links.test.js`,
  `tests/mutation-call-site-coverage.test.js`
- **Related task**: task.141 — fixes the two stale `qa-next` rows. That is the instance; this is the
  mechanism.

---

## Notes

### Important Reminders

- **Floors are not decoration.** An empty result is a claim about the instrument. Every group asserts
  its own count, and the message blames the extractor, because that is the likelier cause.
- **Write the limits down.** The repository has shipped a guard that passed on the exact regression it
  named. The header comment is not optional polish.
- **Mutation-prove all three groups** — delete a skill directory in a scratch copy, add a fake flag to
  a row, stub an extractor to `[]`. A test that passes against the broken tree is holding nothing.
- **`command node`, never bare `node`.** Move the gitignored `.claude/skills → ../skills` symlink
  aside before trusting a local green.

### Known Issues

**Open** (non-blocking):

- ⚠️ `/loop` is a Claude Code built-in, not a skill; it appears only as the wrapper in
  `` `/loop /develop-next` ``. Handled by taking the last **word-start** `/` token.
- ⚠️ `activation-phrases.md` also backticks non-skill spans — `` `/develop-story` ``,
  `` `/develop-task` ``, the built-in `` `/security-review` ``, `` `handoff-verify.mjs` `` — which the
  head-token regex rejects. Correct, and silent; the header comment says so.
- ⚠️ Both `.claude/skills → ../skills` and `.agents/skills → ../skills` are gitignored symlinks;
  move both aside before trusting a local green.
- ⚠️ `activation-phrases.md` backticks the skill and its flag as two **separate** spans in one cell,
  so `--validate` and `--review` arrive as their own tokens. `[a-z0-9-]+` matches them — the head
  token must be required to start with a letter or digit, or the test is red on arrival at
  `activation-phrases.md:30` and `:105`.

### Future Improvements

- Generate `commands.md` from the skills' frontmatter, the way `skill-catalog.md` already is. That
  would make both halves of obs #159 unnecessary rather than enforced — a strictly better end state,
  and a much larger change, because the *What it does* column is editorial rather than derivable.
- Extend the same pinning to each skill's `README.md`, the third hand-written restatement.
