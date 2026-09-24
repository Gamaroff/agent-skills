---
id: task.150
title: "[Task 150] create-task: anchored claims, a bounded title, and a --from-observation entry"
type: task
description: "Close five create-task authoring gaps found in the 2026-09-24 observation review: a current-state name must carry the grep that found it (obs #127); a categorised population must carry one witness per member (obs #124); a proposed single-statement test must show its key is not shared and name the restatement it would miss, in create-task and review-task (obs #135); the frontmatter title is bounded and the card preflight reports one over the bound (obs #128); and create-task gains a --from-observation entry that seeds the document from log entries and parks them itself (obs #147)."
tags:
  [
    create-task,
    review-task,
    card-preflight,
    observe-work,
    anti-hallucination,
    observation,
  ]
category: other
status: planned
priority: Medium
created: 2026-09-24
updated: 2026-09-24
assignee:
estimated_effort_hours: 16
github_issue: 480
---

# Technical Task: create-task — anchored claims, a bounded title, and a --from-observation entry

**Status:** Planned

**GitHub Issue**: [#480](https://github.com/Gamaroff/agent-skills/issues/480)

---

## 1. Overview

`/create-task` is the step where a task document's claims about the current code are written down.
Five observations logged between 2026-09-18 and 2026-09-21 each describe a defect that got past it
and was caught later, by review, by QA or by a tracker. This task adds each fix to create-task, at the
point where the defect is written. Where review is the only other place the defect can be caught, it
also adds the fix to review-task.

**Scope**: prose rules in `skills/create-task/SKILL.md` and `skills/review-task/SKILL.md`; a title
check in the shared card-preflight engine; a pure seed helper in `skills/create-task/scripts/lib.js`;
four test files; CHANGELOG and the preflight contract.

**Key deliverables**:

1. **Evidence rules** (obs #127, #124): each field name, function or file location the document states
   about the *current* code carries the `grep` hit that found it, or is marked `(unverified)`. A
   categorised population carries one witness per member.
2. **Discriminator rule** (obs #135): a proposed single-statement or population test must show that
   its key belongs to no other rule, and must name a restatement that does not match the key. The rule
   goes into create-task § 3.5 and into review-task Step 3.
3. **Title bound** (obs #128): the card preflight reports a frontmatter `title` over
   `CARD_TITLE_MAX`, and create-task § 4 tells the author to use the H1 as the title and move the extra
   text into `description`.
4. **`--from-observation <id>[,<id>…]`** (obs #147): create-task seeds the document from log entries,
   asks only the questions that are still open, cites the ids, and parks each entry through
   `observation-log.js set-status`.

**Expected outcome**: a task cut from an observation cites the code rather than the observation. Its
proposed tests say what they cannot see. Its title fits on a card. The observations it came from are
parked by the skill, not by whichever session remembers to do it.

---

## 2. Motivation

### Current Problems

1. **A current-state name nobody grepped (obs #127).** task.123 named a snapshot field,
   `qa_cycles_completed`, that exists nowhere in the code. `git grep -n qa_cycles_completed -- ':!docs/tasks'`
   returns 0 hits on develop at `e04de749`. task.123 also put the snapshot writer in the wrong file.
   review-task found both only because its reviewer grepped each name. The create-task Section 3
   prompt (`skills/create-task/SKILL.md:692`, *"Cite by identity, not by coordinate"*, obs #22) says
   how to cite a claim once it is found. It does not require anyone to look.
2. **A categorisation with no witnesses (obs #124).** task.122's count was right: 15 copies across 12
   skills. Its categorisation was wrong for 7 of the 15, and Phase 2's regex, its "eight" criterion
   and its deletion list were all built on that categorisation. create-task § 3.5
   (`SKILL.md:431`, *A figure the test will re-measure*, obs #117) covers the **count**. Nothing covers
   the **categorisation**.
3. **A single-statement test keyed on a shared token (obs #135).** task.130 proposed a test keyed on
   `loop-limit|not-converging`, a token another rule also uses. The test would have been red at the
   wrong site and would have missed the token-free restatement that caused task.124 bug 13. The same
   document asked for a site to be added to a population that is derived from directories. Neither
   create-task § 3.5 nor review-task Step 3 (`skills/review-task/SKILL.md:757`, checks 1–9) asks
   either question.
4. **No bound on the title (obs #128).** 42 of the 146 task card documents have a frontmatter `title`
   over 100 characters. The longest is 368, and 9 are over 255. (Command: Plan § *Measurements* M1;
   the definition is `card-preflight-corpus.test.mjs` `taskCardDocuments()`.) These titles are
   published as they are: issue #464 (task.140) has a 368-character title and #450 (task.138) has a
   357-character title (M2). `card-preflight.js` keeps only the body. `preflight()` at
   `shared/resources/card-preflight.js:115`
   (*`const { body } = lib.parseFrontmatter(`*) discards the frontmatter, so no finding is ever
   raised about the title.
5. **Tasks from observations have no entry point (obs #147).** 30 task card documents on
   develop cite an observation by number (M3). Each was cut by a session
   that improvised through create-task's mandatory prompts (`SKILL.md:108`,
   *USER COLLABORATION IS MANDATORY*). Then the entries were parked by hand: 9 log entries have a
   `parked_until` of the form `task.N merged to develop` (M4). Parking is the step a session can forget,
   and a forgotten one leaves an entry that already has a task on the open review queue.

### Benefits of Solution

- Each defect is caught while the document is being written. Today it is caught one to three steps
  later, at review, at QA, or when the tracker publishes the title.
- The title bound is defined once, in `jira-sync.js`, next to the card spec. The authoring preflight,
  the corpus ratchet and the `--from-observation` seed all read it from there.
- Observation parking becomes part of the skill, and a round-trip test runs it through the real
  engine.
- A presence test covers every prose rule and names the section each belongs in. The two engine
  changes get behavioural tests that are mutation-proved.

---

## 3. Technical Background

### Current Architecture

Every claim below was grepped on develop at `e04de749` (2026-09-24).

- **create-task § 1** (`skills/create-task/SKILL.md:161`, *Initial Information Gathering*) prompts for
  title, category, priority, assignee and effort. `SKILL.md:108`, *USER COLLABORATION IS MANDATORY*,
  Key Principle 1 at `:935` and skill success criterion 2 at `:958` (*User-Validated Content*) make
  every prompt mandatory. There is no source-driven entry: `git grep -n from-observation` returns
  nothing.
- **create-task § 3.5** (`SKILL.md:418`, *Adversarial Quality Review*) lists these *Critical* items:
  obs #103 (`:430`), obs #117 (`:431`) and obs #102 (`:432`). None of them mentions obs #124, #127 or
  #135. `git grep -n -E 'obs #(124|127|135)\b' -- skills shared` returns nothing.
- **create-task Section 3 prompt** (`SKILL.md:692`, *Cite by identity, not by coordinate*): covers
  how to cite, not whether the citation was verified.
- **create-task § 4** (`SKILL.md:460`, *Emit a YAML frontmatter block*) lists the `title` field and
  says nothing about its length. `populateTaskTemplate` (`skills/create-task/scripts/lib.js:131`)
  substitutes `[TASK_TITLE]` into the frontmatter and the H1 (`:156`) without a bound.
- **create-task § 4.4** (`SKILL.md:542`, *Do **not** silently write a value without prompting*): the
  effort estimate always prompts.
- **create-task § 4.6** runs `references/card-preflight.js --file …`. Its callers are create-task,
  create-story and create-epic (`git grep -l 'card-preflight.js' -- 'skills/*/SKILL.md'`).
- **Card preflight**: `preflight()` (`shared/resources/card-preflight.js:90`) keeps only the body
  (`:115`) and returns `checkCardSections(body, specs)` (`shared/resources/jira-sync.js:1785`). The
  section spec is `CARD_SECTIONS_BY_KIND` (`jira-sync.js:1662`). `describeCardScope`
  (`jira-sync.js:1951`) states what a clean result covers: *"checks the card sections only"*.
- **Where the title is published**: `ensure-task-github-issue` removes any `[Task N] ` or `Task N: `
  prefix and adds `[Task {N}] ` again (`skills/ensure-task-github-issue/SKILL.md:36`, `:173`
  *`--title "[Task ${TASK_N}] ${TASK_TITLE}"`*). `sync-jira-task.js` builds the summary from
  `args.summary || frontmatter.summary || frontmatter.title` (`skills/sync-jira-task/scripts/sync-jira-task.js:566`).
- **Parity guard**: `card-preflight.test.mjs` (`shared/resources/tests/card-preflight.test.mjs:356`,
  *"the two paths resolved DIFFERENT bodies"*) asserts that the authoring path and the sync path give
  the same `ok` and the same findings. None of its fixture shapes has a `title`.
- **Corpus guard**: `card-preflight-corpus.test.mjs` calls `checkCardSections` directly (`:79`), not
  `preflight()`, over `taskCardDocuments()`, and applies a `CORPUS_FLOOR` of 100 (`:67`).
- **review-task Step 3** (`skills/review-task/SKILL.md:757`): checks 1–9. Check 7 is *Figures that a
  test will re-measure* (obs #117, `:833`) and check 9 is *Configuration Key Accuracy* (`:847`),
  followed by *Common Hallucination Patterns to Detect* (`:852`). None of them looks at a proposed
  test's discriminator.
- **Observation log engine**: `shared/resources/observation-log.js`. `scan --json` returns `file`,
  `id`, `title`, `status`, `skill[]` and the other fields per entry (`cmdScan`, `:666`).
  `set-status --id N --status parked` requires `--parked-until` (`:1028`,
  *"--status parked requires --parked-until"*). The workspace comes from
  `resolve-observation-workspace.sh`, sourced with `|| exit 1`. The body is passed through verbatim
  (`renderObservation`, `:798`), and no function reads the `## Issue` / `## Improvement` /
  `## Principle` sections back.

### Target Architecture

- **`jira-sync.js`**: `CARD_TITLE_MAX = 100` and `checkCardTitle(frontmatter, body)` sit beside
  `checkCardSections`. The check returns one finding, `{severity: "important", section: "(title)",
  code: "title-too-long", message, fix}`, when `String(frontmatter.title).length > CARD_TITLE_MAX`.
  The `fix` names the body H1 and its length when the H1 is within the bound. It returns no finding
  when there is no title.
- **`card-preflight.js`**: `preflight()` also reads `frontmatter` and appends
  `checkCardTitle(frontmatter, body)` to the section findings, then recomputes `ok`. `--strict` makes
  a title finding exit 1, as it does for any other finding. The clean-result scope line says that the
  preflight read the title as well as the card sections.
- **create-task § 4**: the `title` bullet says a title is a name, not a summary. When the § 4.6
  preflight reports `title-too-long`, the author uses the H1 as the title and moves the extra text
  into `description`. The number is not repeated in the prose.
- **create-task § 3.5 *Critical*** gets three bullets:
  - *A current-state name nobody grepped* (obs #127)
  - *A categorised population without a witness per member* (obs #124)
  - *A single-statement test keyed on a shared token* (obs #135)
- **create-task Section 3 prompt** gets one paragraph (obs #127) after *Cite by identity*.
- **review-task Step 3** gets a new numbered check, **Single-statement test discriminator**
  (obs #135), placed after the last numbered check (see § 10, Medium risk 1), plus one line under *Common
  Hallucination Patterns*.
- **create-task § 1.1** (new), *Entry from the observation log (`--from-observation`)*:
  1. Resolve the workspace.
  2. Run `scan --json` and select the entries by id. Refuse an id that is missing or whose status is
     not `open`, and name the status.
  3. Seed the document through `lib.js` `seedFromObservations`.
  4. Ask only the questions that are still open.
  5. After both files are written, park each id.

  Lines `:108`, `:935` and `:958` and the § 4.4 rule at `:542` each get a one-sentence exception for
  this entry.
- **`lib.js`**: `parseObservationBody(text)` splits the body into `{issue, improvement, principle}`.
  `seedFromObservations(entries, {taskId})` returns:
  - `title`, set to `null` with a `titleReason` when the source title is over the bound
  - `description`, `tags` and `references`
  - `changeLogDescription`
  - `park[]`, argument vectors for `observation-log.js`

  `CARD_TITLE_MAX` comes from `../references/jira-sync.js`.

### Same-class mechanism inventory (obs #103)

- `checkCardTitle` **sits beside** `checkCardSections`. The inputs do not overlap: `checkCardSections`
  receives only the body and never sees frontmatter. Folding the title check into it would change its
  signature for every sync caller.
- The parking step **reuses** `observation-log.js set-status` and does not write frontmatter itself.
- `parseObservationBody` is **new**. The engine has no body reader, and `renderObservation` treats the
  body as opaque. It lives in create-task `lib.js` because create-task is its only consumer. If a
  second consumer appears, it should move into the engine.

---

## 4. Scope

### In Scope

- ✅ create-task: § 1.1 (new), § 3.5 (three bullets), Section 3 prompt, § 4 title bullet, § 4.4
  exception, and the `:108` / `:935` / `:958` exceptions
- ✅ review-task Step 3: the discriminator check and a *Common Hallucination Patterns* line
- ✅ `shared/resources/jira-sync.js` (`CARD_TITLE_MAX`, `checkCardTitle`) and
  `shared/resources/card-preflight.js`
- ✅ `skills/create-task/scripts/lib.js` (`parseObservationBody`, `seedFromObservations`)
- ✅ Tests: `card-preflight.test.mjs`, `card-preflight-corpus.test.mjs`,
  `tests/create-task-authoring-evidence.test.js`, `skills/create-task/tests/from-observation.test.js`
- ✅ `shared/resources/authoring-card-preflight.md`, CHANGELOG, `npm run bundle`,
  `npm run generate-catalog`

### Out of Scope

- ❌ **Renaming the 42 legacy long titles** and their published issues. That would change tracker
  state, which is the owner's decision. The corpus test's allowlist records them and can only shrink.
- ❌ **The title check in `sync-jira-* --check-card`**, the path review-* uses as its gate. See Open
  Question 2.
- ❌ **create-story and create-epic prose rules** for obs #124, #127 and #135. The observations list
  them as siblings but did not check them. create-story and create-epic do get the title finding,
  because they run the same preflight: 0 of 23 story and epic documents are over 100 characters today
  (M5).
- ❌ **A `show` subcommand in `observation-log.js`**. `scan --json` plus a read of `${OBS_LOG_DIR}/<file>`
  covers what is needed.
- ❌ **observe-work's review cycle calling `--from-observation`**. That is observe-work's change, and
  it can be made once this entry exists.

---

## 5. Breaking Changes

None to any API. There are two changes a caller can see:

1. **`card-preflight.js` can now report `title-too-long`.** A document that passed cleanly before now
   gets an advisory finding (exit 0) when its title is over the bound, and exits 1 under `--strict`.
   No shipped caller passes `--strict`: `git grep -n -- '--strict' -- 'skills/*/SKILL.md' | grep card-preflight`
   returns nothing. **Migration**: shorten the title as the finding's `fix` line says.
2. **create-task no longer asks every prompt in `--from-observation` mode.** Nothing changes without
   the flag.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.150.plan.create-task-authoring-evidence.md](task.150.plan.create-task-authoring-evidence.md)

### Phase 1: Title bound in the card preflight (obs #128) (Risk: Low)

**Files**: `shared/resources/jira-sync.js`, `shared/resources/card-preflight.js`,
`skills/create-task/SKILL.md`, `shared/resources/authoring-card-preflight.md`, the two preflight
tests

- [ ] Add `CARD_TITLE_MAX` and `checkCardTitle(frontmatter, body)` beside `checkCardSections`, and export both
- [ ] In `preflight()`, read the frontmatter and append the title finding. `ok` covers both
- [ ] Update the scope line so a clean result says it read the title
- [ ] create-task § 4 title bullet, which points to the § 4.6 finding and does not repeat the number
- [ ] Add a unit test, a parity shape and a corpus ratchet with a 42-id legacy allowlist

### Phase 2: Evidence rules (obs #127, #124) (Risk: Low)

**Files**: `skills/create-task/SKILL.md`

- [ ] Section 3 prompt: add the *Every current-state name carries its grep* paragraph (obs #127)
- [ ] § 3.5 *Critical*: add *A current-state name nobody grepped* (obs #127)
- [ ] § 3.5 *Critical*: add *A categorised population without a witness per member* (obs #124)

### Phase 3: Discriminator rule (obs #135) (Risk: Low)

**Files**: `skills/create-task/SKILL.md`, `skills/review-task/SKILL.md`

- [ ] § 3.5 *Critical*: add *A single-statement test keyed on a shared token* (obs #135)
- [ ] review-task Step 3: add the **Single-statement test discriminator** check after the last numbered check
- [ ] review-task *Common Hallucination Patterns*: add one line
- [ ] Add `tests/create-task-authoring-evidence.test.js`, covering Phases 2 and 3

### Phase 4: `--from-observation` entry (obs #147) (Risk: Medium)

**Files**: `skills/create-task/SKILL.md`, `skills/create-task/scripts/lib.js`,
`skills/create-task/tests/from-observation.test.js`

- [ ] Add § 1.1 *Entry from the observation log*: resolve, select, refuse non-open entries, seed, ask what is still open, park
- [ ] Add one-sentence exceptions at `:108`, `:935`, `:958` and § 4.4 `:542`
- [ ] Add `parseObservationBody` and `seedFromObservations` to `lib.js`, using `CARD_TITLE_MAX` from `jira-sync.js`
- [ ] Add § 5 *Post-Generation* step 2b: park each id after both files exist, read `reason`, and report a failure without blocking
- [ ] Cite `shared/resources/observation-log.js` and `resolve-observation-workspace.sh`, then run `npm run bundle:skill skills/create-task`
- [ ] Update the frontmatter `description` to mention the entry, then run `npm run generate-catalog`

### Phase 5: Documentation and validation (Risk: Low)

**Files**: `CHANGELOG.md`

- [ ] Add a CHANGELOG `[Unreleased]` › Changed entry citing `(task 150)` and obs #124, #127, #128, #135 and #147
- [ ] Run `npm run ci:fast`, `npm run bundle:check`, and `npm run validate` on create-task and review-task
- [ ] Mutation-prove every new assertion (see § 8)

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/jira-sync.js`: `CARD_TITLE_MAX`, `checkCardTitle`, and the scope-line option
2. ✅ `shared/resources/card-preflight.js`: read the frontmatter and append the title finding
3. ✅ `skills/create-task/SKILL.md`: § 1.1, § 3.5, Section 3 prompt, § 4, § 4.4, § 5, and the three
   interactivity exceptions
4. ✅ `skills/create-task/scripts/lib.js`: `parseObservationBody`, `seedFromObservations`
5. ✅ `skills/review-task/SKILL.md`: the Step 3 check and the patterns line

### Files to Add / Modify (Tests)

6. ✅ `shared/resources/tests/card-preflight.test.mjs`: title unit tests and the parity shape
7. ✅ `shared/resources/tests/card-preflight-corpus.test.mjs`: the legacy-title ratchet
8. ✅ `tests/create-task-authoring-evidence.test.js` (new): section-scoped presence for obs #124,
   #127 and #135 (inside the `tests/*.test.js` glob in `package.json`)
9. ✅ `skills/create-task/tests/from-observation.test.js` (new): seed and park round trip (inside
   `skills/create-task/tests/*.test.js`)

### Files to Modify (Documentation / Generated)

10. ✅ `shared/resources/authoring-card-preflight.md`: the title finding in the contract
11. ✅ `CHANGELOG.md`
12. ✅ `skills/*/references/` copies, **generated** by `npm run bundle`. Never edit them by hand.
13. ✅ `docs/reference/skill-catalog.md`, **generated** by `npm run generate-catalog`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **`shared/resources/tests/card-preflight.test.mjs`**:
  - A task document with a 101-character title gets exactly one `title-too-long` finding with
    severity `important`, and its `fix` names the H1.
  - 100 characters gets none, which pins the boundary.
  - No `title` gets none.
  - The same finding appears for `story` and `epic` kinds.
  - The CLI exits 0 by default and 1 under `--strict`.
  - Parity gets one new shape, a long title: the section findings still match the sync path
    exactly, and the title finding is the only extra.
- **`shared/resources/tests/card-preflight-corpus.test.mjs`**: every task card document outside a
  frozen `LEGACY_LONG_TITLES` list (the 42 ids from M1) has `title.length <= CARD_TITLE_MAX`. Every
  listed id is still over the bound, so a shortened title fails until its id is removed and the list
  only shrinks. The existing `CORPUS_FLOOR` applies.
- **`tests/create-task-authoring-evidence.test.js`**: the test extracts each site section by
  heading, bounded by the next heading of the same level and skipping fences. It asserts that the
  section carries the rule's obs cite and the rule's load-bearing words:
  - § 3.5: `obs #127` with `grep` and `(unverified)`, `obs #124` with `per member` and a witness
    (`file:line`), and `obs #135` with the shared-key grep, the token-free restatement and the
    directory-derived population
  - The Section 3 prompt: `obs #127`
  - review-task Step 3: `obs #135`

  A floor asserts that every heading was found. The key is `obs #1NN\b`, and the obs #135 rule
  applies to this test itself: `git grep -n -E 'obs #(124|127|135)\b' -- skills shared` returns
  nothing on develop today, so the key is not shared.
- **`skills/create-task/tests/from-observation.test.js`**:
  - `parseObservationBody` on a real-shaped fixture.
  - `seedFromObservations`: references and the Change Log description list the ids in ascending
    order. Tags are the union of `skill[]` plus `observation`. An entry title over the bound gives
    `title: null` with `titleReason: "over-bound"`, and the fixture is obs #128's own 144-character
    title. Two or more entries give `titleReason: "multiple-entries"`. An entry that is not `open`
    throws an error naming its status.
  - **Park round trip**: in a repo-local scratch workspace, `observation-log.js` `run()` runs `init`,
    `write` and then each `park[]` vector. `scan` then shows `status: parked` with `parked_until`
    of `task.150 merged to develop`.

### Mutation proof (each fix goes red without it)

| Fix                                          | Mutation                                             | Red test                                     |
| -------------------------------------------- | ---------------------------------------------------- | -------------------------------------------- |
| title check wired into `preflight()`         | remove the `checkCardTitle` append                   | `card-preflight.test.mjs` 101-char case      |
| bound is `>`, not `>=`                       | change to `>=`                                       | `card-preflight.test.mjs` 100-char boundary  |
| legacy ratchet                               | drop one id from `LEGACY_LONG_TITLES`                | `card-preflight-corpus.test.mjs` names it    |
| each § 3.5 / Section 3 / Step 3 rule         | delete the rule from its section (one at a time)     | `create-task-authoring-evidence.test.js`     |
| rule moved out of its section                | move the obs #135 bullet to § 4                      | same file (section-scoped, not file-scoped)  |
| park vector carries `--parked-until`         | drop it from `park[]`                                | `from-observation.test.js` round trip        |
| non-open entry refused                       | remove the status guard                              | `from-observation.test.js` refusal case      |

### Behavioural evidence (recorded, not automated)

The presence test shows that a rule is **stated** in the right section. It does not show that an
author **applies** it: this repository has no eval layer for authoring skills, and a presence test
checks the source text rather than the behaviour. The implementation report therefore records one
hand run of the § 3.5 review over task.123's first committed draft, found with
`git log --diff-filter=A` on its task document. The run shows the obs #127 bullet flagging
`qa_cycles_completed`, whose grep returns 0 hits outside `docs/tasks`. The report states that CI
does not hold this run.

### Regression

- `npm run ci:fast` runs the full suite and `format:check`. The existing `card-preflight.test.mjs`
  cases on task.102's document are unaffected, because its title is within the bound (M1).

---

## 9. Success Criteria

### Functional

- [ ] `card-preflight.js --file` on a document whose title is over `CARD_TITLE_MAX` prints one
      `title-too-long` finding naming the H1. It exits 0, and exits 1 under `--strict`. Held by
      `shared/resources/tests/card-preflight.test.mjs`
- [ ] No task card document outside `LEGACY_LONG_TITLES` has a title over the bound, and every listed
      id is still over it. Held by `shared/resources/tests/card-preflight-corpus.test.mjs`
- [ ] create-task § 3.5 carries the obs #127, #124 and #135 rules, the Section 3 prompt carries the
      obs #127 paragraph, and review-task Step 3 carries the obs #135 check. Each is section-scoped.
      Held by `tests/create-task-authoring-evidence.test.js`
- [ ] `seedFromObservations` refuses a non-`open` entry, returns `title: null` for an over-bound
      source title, and produces park vectors that the real engine accepts. Held by
      `skills/create-task/tests/from-observation.test.js`

### Performance

- [ ] All four test files run offline, with no network or `gh` calls
- [ ] The corpus ratchet adds one frontmatter parse per document to a walk that already reads each
      file

### Code Quality

- [ ] Every row of the § 8 mutation table was run and recorded red, then green on restore, in the
      implementation report
- [ ] `CARD_TITLE_MAX` is defined once. `git grep -n 'CARD_TITLE_MAX *=' -- shared skills` returns only
      `shared/resources/jira-sync.js` and its generated `references/` copies
- [ ] `npm run ci:fast`, `npm run bundle:check` (no `UNREACHED` copies) and `npm run validate` on
      create-task and review-task are clean

### Migration

- [ ] CHANGELOG `[Unreleased]` cites `(task 150)` and the five observation ids
- [ ] `shared/resources/authoring-card-preflight.md` documents the title finding and its fix
- [ ] The implementation report records the task.123 hand run from § 8

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **Numbering collision with task.145 and task.151 in the same two lists**
   - Risk: task.145 (planned) adds check 10 to review-task Step 3. task.151 (drafted alongside this
     task) adds checks to review-task Step 3 and bullets to create-task § 3.5 *Critical*. Whichever
     task merges later has to renumber and resolve a textual conflict in both lists.
   - Probability: High · Impact: Low
   - Mitigation: add the check after whichever numbered check is last at implementation time, and
     rebase onto develop before editing either list. The test keys on the bold name and `obs #135`,
     never on a number or a position.
2. **Parity-test drift**
   - Risk: the title finding makes the authoring and sync results differ for a long-title document.
     `card-preflight.test.mjs:356` asserts that the two are equal.
   - Probability: Medium · Impact: Medium
   - Mitigation: the parity test compares section findings, filtering on `code !== "title-too-long"`,
     and a new shape asserts that the title finding is the **only** difference. See Open Question 2
     for closing the gap on the sync side.
3. **`--from-observation` parks and the task is then abandoned**
   - Risk: an entry is parked on a task that never merges.
   - Probability: Low · Impact: Medium
   - Mitigation: `parked_until` names the merge, and a parked entry never archives (AGENTS.md
     § Observation Log), so the next review cycle sees it. Parking runs only after both files exist.

### Low Risk Areas

1. **Prose rules add authoring cost.** Each rule asks for one grep per claim, and only for claims
   about the current state.
2. **Bundle churn.** Citing `observation-log.js` from create-task copies it into
   `skills/create-task/references/`, and `bundle:check` catches a missed run.
3. **Scratch workspace refused as ephemeral.** `observation-log.js` refuses a workspace under `/tmp`
   (`EPHEMERAL_PATTERNS`), so a round-trip test built on `os.tmpdir()` passes on macOS and fails in
   Linux CI. Mitigation: use the repo-local `SCRATCH_ROOT` pattern from
   `shared/resources/tests/observation-log.test.mjs:66` (plan, Phase 4).

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: the title finding fires on titles within the bound, or `--from-observation` parks an
  entry that it did not cut a task from.
- **Steps**: revert the PR. It changes prose, one pure helper, two engine lines and tests. No data
  migrates, and a parked entry is restored with `set-status --status open`.
- **Validation**: `npm test` is green on the reverted tree.

### Partial Rollback (1–2 hours)

- Each phase can be reverted on its own. Phase 4 depends only on `CARD_TITLE_MAX` from Phase 1.
  Revert Phase 4 alone if the seed misbehaves, and keep the rules and the bound.

### Forward Fix

- A noisy prose rule is fixed by tightening its trigger wording. A wrong bound is a one-constant
  change, and the ratchet list is re-measured with M1.

### Rollback Triggers

- **Critical**: an entry is parked without a task file, or `card-preflight.js` exits non-zero
  without `--strict`.
- **Non-critical**: wording of findings or rules. Fix forward.

---

<!-- change-log-start -->

## Change Log

| Date       | Version | Description                                                                                          | Author      |
| ---------- | ------- | ---------------------------------------------------------------------------------------------------- | ----------- |
| 2026-09-24 | 1.0     | Initial draft — cut from observations #124, #127, #128, #135, #147 (2026-09-24 observation review) | create-task |

<!-- change-log-end -->

---

## Progress Tracking

- [ ] Phase 1: Title bound in the card preflight
- [ ] Phase 2: Evidence rules
- [ ] Phase 3: Discriminator rule
- [ ] Phase 4: `--from-observation` entry
- [ ] Phase 5: Documentation and validation

---

## References

- Observation #124: a measured population's categorisation ships without per-member evidence
- Observation #127: current-state claims asserted without a grep anchor
- Observation #128: frontmatter title unbounded, and the card preflight does not read it
- Observation #135: a single-statement test keyed on a shared token is red at the wrong site and
  misses the right one
- Observation #147: create-task has no `--from-observation` entry
- task.122, the obs #124 instance:
  [`task.122.bundle-check-unreached-copies.md`](../task.122.bundle-check-unreached-copies/task.122.bundle-check-unreached-copies.md)
- task.123, the obs #127 and #128 instance:
  [`task.123.qa-loop-exits-and-re-entry.md`](../task.123.qa-loop-exits-and-re-entry/task.123.qa-loop-exits-and-re-entry.md)
- task.102, which introduced the authoring-time preflight:
  [`task.102.authoring-time-card-preflight.md`](../task.102.authoring-time-card-preflight/task.102.authoring-time-card-preflight.md)
- task.145, which works on the same review-task Step 3 list (§ 10, Medium risk 1)

---

## Notes

### Observation re-check (2026-09-24, develop `e04de749`)

All five observations still hold on develop. None is fixed:

- **#124**: `git grep -n -E 'obs #124\b|per.member|witness' -- skills/create-task skills/review-task`
  returns nothing.
- **#127**: § 3.5 and the Section 3 prompt have no rule requiring a grep. The task.123 example still
  holds: `qa_cycles_completed` has 0 hits outside `docs/tasks`.
- **#128**: the observation's own instance was fixed by hand, because task.123's title is now 89
  characters. The class is not fixed: there are 42 over 100 (M1), and `preflight()` still discards the
  frontmatter. The observation says *"GitHub truncates issue titles at 256"*, but the measurements
  show otherwise: #464 has a 368-character title (M2). Jira's 255-character summary limit is an
  external constraint that was not measured here **(unverified)**.
- **#135**: neither create-task § 3.5 nor review-task Step 3 names a discriminator check.
- **#147**: `git grep -n from-observation` returns nothing. The observation says "eighteen" tasks.
  Measured across the whole committed corpus (tasks 95–146) rather than the 121–138 range, the figure is 30 (M3).

### Open Questions (recorded, not asked, because this task was authored non-interactively)

1. **Bound value.** This task uses 100, following obs #128. The measured median is 82 (M1). A
   tighter bound such as 90 would add more ids to the legacy list. Default: 100.
2. **Review-time gate.** review-task blocks on `sync-jira-task --check-card`, which does not read the
   title. Should `checkCardTitle` also be added to the four `sync-jira-* --check-card` paths so that a
   long title blocks at review? That would be advisory at authoring and blocking at review, the same
   as the section spec. Default: a follow-up task, because it touches four sync scripts and their
   `--json` contract.
3. **One task or several (§ 1.2).** Phases 1–4 each pass the splitting test on their own. The caller
   asked for one document, so they are written as independently revertible phases (§ 11 *Partial
   Rollback*). An implementer may split out Phase 4 if review prefers.
4. **Effort without a prompt.** In `--from-observation` mode, § 4.4 writes the rubric value and
   reports it. The alternative is to keep the one prompt. Default: write and report, because obs #147
   lists effort as derivable.

### Important Reminders

- QA artifacts land in this directory:
  - `task.150.qa.{N}.create-task-authoring-evidence.md`
  - `task.150.gate.{N}.create-task-authoring-evidence.yml`
  - bug reports: `task.150.bug.{N}.{name}.md`
- When this task's PR merges, observations #124, #127, #128, #135 and #147 are set to
  `set-status --status actioned`.
