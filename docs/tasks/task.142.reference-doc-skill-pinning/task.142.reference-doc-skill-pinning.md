---
id: task.142
title: "[Task 142] Pin the hand-written reference docs to the skills they describe"
type: task
description: "docs/reference/commands.md and docs/reference/activation-phrases.md restate what 64 skills do, and nothing connects a skill's directory to the rows that cite it — qa-next's rows went stale within a day of the rework that invalidated them. Add tests/reference-doc-skill-pinning.test.js: every command a row names resolves to a skill, every --flag a row advertises is one that skill's SKILL.md documents, and every skill named in the activation table exists — each with a non-vacuity floor so a broken extractor cannot pass by finding nothing."
tags: [documentation, guard, reference-docs, drift, observation-159]
category: testing
status: planned
priority: Medium
created: 2026-09-22
updated: 2026-09-22
assignee:
estimated_effort_hours: 4
risk_level: low
github_issue: 467
---

# Technical Task: Pin the hand-written reference docs to the skills they describe

**Status:** Planned

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
  `` `/loop /develop-next` ``, `` `run-loop.mjs status` ``. Measured: 79 rows, 75 of them slash
  commands naming 64 distinct skills, 11 rows carrying at least one `--flag`.
- `docs/reference/activation-phrases.md` — two-column tables; the right-hand cell backticks the skill
  name, and any flag as a **separate** backticked span in the same cell —
  `` `review-bug` (the second phrasing picks `--validate`) ``. Measured: 69 backticked tokens, of
  which 67 are skill mentions naming 62 distinct skills and 2 are standalone flags that the
  extractor must reject.
- `docs/reference/skill-catalog.md` — **generated** by
  `skills/create-skill/scripts/generate_catalog.py` and guarded by `npm run check:generated`. It is
  the control case: it tracked the `qa-next` rework without anyone remembering to update it.
- `tests/` — root-level suite, `tests/*.test.js` in the `npm test` glob. `node:test` + `node:assert`,
  no framework. Nearest neighbours in shape: `tests/bundled-links.test.js` (walks a corpus, asserts a
  property per item, floors the count) and `tests/mutation-call-site-coverage.test.js` (scans
  canonical sources for a forbidden invocation, with an allowlist).

### Target Architecture

One new file, `tests/reference-doc-skill-pinning.test.js`, with three `describe` groups over a shared
row extractor:

```
extractCommandRows(md)  →  [{ raw, invocation, skill, flags, line }]
extractActivationSkills(md) → [{ skill, flags, line }]
```

`skill` resolution: take the **last** `/<name>` token in the cell, so `` `/loop /develop-next` ``
resolves to `develop-next` rather than to the `/loop` built-in. A cell with no `/` token is a
non-skill row, matched against a small named allowlist (`run-loop.mjs …`) and counted, never silently
dropped.

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

- [ ] `extractCommandRows(md)` — rows beginning `` | ` ``, first cell, last `/<name>` token wins,
      `--flag` tokens collected, line number retained for the failure message.
- [ ] `extractActivationSkills(md)` — right-hand cell, first backticked token is the skill, the rest
      are flags.
- [ ] `NON_SKILL_ROWS` — the named allowlist for `run-loop.mjs run|dry-run|status|watch`, asserted to
      be **exactly** what the extractor could not resolve, so a new unresolvable row fails rather than
      joining a silent bucket.

**Dependencies**: none.

---

### Phase 2: The assertions and their floors

**Risk Level**: Low

**Files**:

- `tests/reference-doc-skill-pinning.test.js`

**Changes**:

- [ ] Every extracted command resolves to a `skills/<name>/SKILL.md` that exists.
- [ ] Every `--flag` in a command row appears literally in that skill's `SKILL.md`.
- [ ] Every skill named in `activation-phrases.md` resolves to `skills/<name>/`.
- [ ] Floors, from today's measurement and stated as *at least*: ≥ 70 command rows, ≥ 12 flag
      assertions, ≥ 58 activation-table skills. Each floor is its own assertion with a message saying
      the extractor is probably broken, not that the corpus shrank.
- [ ] Failure messages name the **file and line** of the offending row and the skill it names.

**Dependencies**: Phase 1.

---

### Phase 3: First run, and what it surfaces

**Risk Level**: Low

**Files**:

- `docs/reference/commands.md`, `docs/reference/activation-phrases.md` (only if the run finds
  something)
- `tests/reference-doc-skill-pinning.test.js` (header comment)

**Changes**:

- [ ] Run against the tree as it stands. Measured in advance: 0 flag failures, 0 unresolvable skills
      once `/loop` is handled — so a red first run means the extractor is wrong, not the corpus.
- [ ] Fix anything it legitimately finds, in the same commit.
- [ ] Write the header comment: what this test pins, and — explicitly — that prose drift is not
      pinned, with the `qa-next` story→function case named as the example it would have missed.
- [ ] Mutation-prove all three groups.

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

- [ ] A row with a plain command resolves to that skill.
- [ ] `` `/loop /develop-next` `` resolves to `develop-next`, not `loop`.
- [ ] A row with two flags yields both.
- [ ] A non-slash row is returned as unresolvable, not dropped.
- [ ] An activation cell of `` `review-bug --validate` `` yields skill `review-bug`, flag
      `--validate`.

**Command**: `npm test`

**Target**: every branch of both extractors.

---

### Integration Tests

**Scope**: the assertions against the live `docs/reference/` corpus — which is the test's actual job.

**Actions**:

- [ ] All three groups green on the current tree.
- [ ] Each floor assertion passes with the real counts, and fails when the extractor is stubbed to
      return `[]`.

**Command**: `npm test`

---

### Contract Tests

**Scope**: the surrounding suite.

**Actions**:

- [ ] `npm test` overall result unchanged apart from the new file's cases.
- [ ] `npm run check:generated` still green — this task touches nothing generated.

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

- [ ] Every command named in `commands.md` resolves to an existing skill, or to the named non-skill
      allowlist.
- [ ] Every `--flag` a command row advertises exists in that skill's `SKILL.md`.
- [ ] Every skill named in `activation-phrases.md` exists.
- [ ] `/loop /develop-next` resolves to `develop-next`.
- [ ] A row naming a deleted skill fails the test (proved by mutation).
- [ ] A row advertising a non-existent flag fails the test (proved by mutation).

### Performance

- [ ] No process spawn, no network call.
- [ ] `SKILL.md` reads are memoised per skill, not per row.
- [ ] No measurable change to `npm test` wall-clock.

### Code Quality

- [ ] `node:test` + `node:assert` only, matching `tests/bundled-links.test.js`.
- [ ] Three floor assertions, each with a message pointing at the extractor rather than the corpus.
- [ ] Failure messages carry file, line and the offending token.
- [ ] A header comment stating what the test does **not** catch, naming the story→function case.
- [ ] Prettier clean; `npm test` green with the `.claude/skills` symlink moved aside.

### Migration

- [ ] `CHANGELOG.md` `[Unreleased]` records the new guard.
- [ ] Observation #159 marked `actioned` once this merges **and** the staged `create-skill` rule is
      installed — the two halves close it together.
- [ ] No consumer-facing change; nothing to migrate.

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

<!-- change-log-start -->

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-22 | 1.0     | Initial draft | create-task |

<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: The extractors

- [ ] `extractCommandRows`
- [ ] `extractActivationSkills`
- [ ] `NON_SKILL_ROWS` asserted exactly

### Phase 2: The assertions and their floors

- [ ] Command resolution
- [ ] Flag existence
- [ ] Activation-table resolution
- [ ] Three floors, with extractor-blaming messages

### Phase 3: First run, and what it surfaces

- [ ] Green against the live corpus
- [ ] Any real finding fixed in the same commit
- [ ] Header comment naming what is not pinned
- [ ] All three groups mutation-proved

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
  `` `/loop /develop-next` ``. Handled by taking the last `/` token.
- ⚠️ `activation-phrases.md` backticks the skill and its flag as two **separate** spans in one cell,
  so `--validate` and `--review` arrive as their own tokens. `[a-z0-9-]+` matches them — the head
  token must be required to start with a letter or digit, or the test is red on arrival at
  `activation-phrases.md:30` and `:105`.

### Future Improvements

- Generate `commands.md` from the skills' frontmatter, the way `skill-catalog.md` already is. That
  would make both halves of obs #159 unnecessary rather than enforced — a strictly better end state,
  and a much larger change, because the *What it does* column is editorial rather than derivable.
- Extend the same pinning to each skill's `README.md`, the third hand-written restatement.
