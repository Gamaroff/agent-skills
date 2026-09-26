---
id: task.149
title: "[Task 149] QA evidence integrity: qa-task/qa-story claims that no check reads back"
type: task
description: "Close four places where qa-task and qa-story record a claim that no check ever reads back: the snippet engine cannot seed a path-addressed directory, so correct discovery blocks fail (obs #143); a module-private predicate is recorded as `boundary: false` instead of being exported and probed (obs #156); the one standards-named validation command `npm test` does not cover is run by no QA step (obs #163); and the task document is edited to link QA artifacts after the last check ran, so a missing report or a stale `updated:` ships green (obs #164)."
tags: [qa-task, qa-story, create-task, qa-execute-snippets, security-probe, doc-links, change-log, observation]
category: testing
status: ready-for-review
priority: Medium
created: 2026-09-24
updated: 2026-09-26
assignee:
estimated_effort_hours: 16
github_issue: 479
---

# Technical Task: QA evidence integrity — qa-task/qa-story claims that no check reads back

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.149.review.1.qa-evidence-integrity.md` implemented 2026-09-26

**GitHub Issue**: [#479](https://github.com/Gamaroff/agent-skills/issues/479)

---

## 1. Overview

`/qa-task` and `/qa-story` each produce four kinds of evidence that nothing downstream reads back: a
Step 4b snippet run that could not be seeded correctly, a `boundary: false` decision with no execution
behind it, a test run that omits the one standards-named command `npm test` does not cover, and a
document edit that links artifacts **after** the last check ran. This task gives each one a check that
executes, so the claim and its check can no longer disagree silently.

**Scope**: two engine extensions (`qa-execute-snippets.mjs`, `security-probe.mjs`), two engine
additions (`doc-links.js` link state, `change-log.js` coherence check), prose in `qa-task`, `qa-story`,
`create-task` and `probe-boundary-rule.md`, one new population test, CHANGELOG.

**Key deliverables**:

1. `qa-execute-snippets.mjs --copy-as <src>:<dest>` — seed a directory **at the path the blocks
   address** (obs #143).
2. An unexported predicate is a reason to export and probe, stated in both QA skills and named in the
   engine's decline detail (obs #156).
3. QA runs the validation commands the project's coding standards name, not only the test runner, and
   create-task's Code Quality prompt lists them (obs #163).
4. A post-edit read-back step in both QA skills: every link resolves (and says whether a failure is
   `missing` or `untracked`), and the newest Change Log row is not dated after `updated:` (obs #164).

**Expected outcome**: each of the four failure shapes the observations recorded — a correct block
reported as broken, a PASS with no probe behind it, a CI-only `validate` red, a CI-only link or §5
red — is caught by a QA step on the same run, or turns a named test red.

---

## 2. Motivation

### Current Problems

1. **A correct block fails because the harness cannot be seeded where the block looks** (obs #143,
   2026-09-21). `--copy <dir>` copies the directory's *contents* to the temp root
   (`shared/resources/qa-execute-snippets.mjs:1617`, `if (copyFrom) cpSync(copyFrom, tmp, …)`), so a
   block that runs `find docs/tasks …` (`skills/sync-github-task/SKILL.md:53`) finds nothing whatever
   is copied. Reproduced on current develop (`e04de749`): a one-block file running
   `ls docs/tasks` executed with `command node shared/resources/qa-execute-snippets.mjs --file
   <scratch>/probe143.md --copy docs --no-zsh` exits 1 with `ls: docs/tasks: No such file or
   directory`. On task.125 the QA step had to route that finding to `future` by hand every cycle.
2. **The branch that declines to probe is free, so the hard case takes it** (obs #156, 2026-09-22).
   On task.139 QA recorded `boundary: false, probes 0` for five cycles over `isWorkItemDocument`; the
   finalise agent applied the same rule to the same diff, got `entry-not-probeable` because the
   predicate was a module-private `const`, and the fix (`d25adf2e`, 2026-09-22) was to export it — at
   which point a null-byte hole surfaced. Step 3b step 3 already says "it is bash" and "it takes
   several flags" are never reasons for `boundary: false` (`skills/qa-task/SKILL.md:474–496`); it says
   nothing about "it is not exported", and the engine's decline reads only
   `export <name> is not a function` (`shared/resources/security-probe.mjs:247–251`).
3. **A standards-named check that no gate runs** (obs #163, 2026-09-22).
   `docs/architecture/concepts/coding-standards.md:69` lists `npm run validate -- skills/<changed-skill>/`
   first under *Validation before commit*; `npm test` does not run it (`package.json` `"validate"` is
   `quick_validate.py`, absent from the `"test"` script). qa-task Step 4 names only
   `nx test` / `nx build` / `nx lint` (`skills/qa-task/SKILL.md:622`), and qa-story Phase 4 points at a
   path that does not exist in this layout (`skills/qa-story/SKILL.md:1240`, `docs/coding-standards.md`).
   On task.141 every local gate was green and CI's `validate` job went red on an angle bracket in a
   `description`. Authoring does not compensate: of the 109 task documents (out of 146) that name a
   `skills/*/SKILL.md`, 23 name `npm run validate` or `quick_validate` — measured with the loop in
   § 8 *Baselines*.
4. **The last check runs before the last write** (obs #164, 2026-09-22, recurrence 2026-09-23).
   qa-task Step 12 edits the task document to link the QA report and gate
   (`skills/qa-task/SKILL.md:1157`) and appends a Change Log row, and nothing afterwards reads those
   claims back. On task.141 cycle 4 the linked report was never written (CI `link-check` red); on
   cycle 6 the row was dated a day after `updated:` (CI `tests/work-item-artifact-naming.test.js` §5
   red). The checklist item that should catch the first — "QA report file created and saved"
   (`skills/qa-task/SKILL.md:1489`, `skills/qa-story/SKILL.md:2052`) — is ticked from memory.

### Benefits of Solution

- A block that is correct can be made to pass, so a Step 4b execution failure means the prose is wrong
  rather than "the prose is wrong **or** the harness was mis-seeded".
- `boundary: false` stops being the cheap branch for an unexported predicate: the decline names the
  remedy, and the QA prose names it as not a reason to skip.
- The `validate` lane moves from "a human who remembers the list" to a QA step, for every run.
- The two CI reds task.141 hit (link, §5) become QA-time findings on the same run, and a missing
  artifact is told apart from an uncommitted one.

---

## 3. Technical Background

### Current Architecture

- **Snippet seeding** — `executeFile(filePath, { copyFrom })` creates `<tmpRoot>/work` and, when
  `copyFrom` is set, `cpSync(copyFrom, tmp, { recursive: true })`
  (`shared/resources/qa-execute-snippets.mjs:1617`). One `--copy <dir>`, not repeatable
  (`:1757`, `case "--copy":`). Documented at `shared/resources/qa-runnable-prose-detection.md:350` and
  in the Step 4b / Phase 1.7 paragraphs (`skills/qa-task/SKILL.md:665`,
  `skills/qa-story/SKILL.md:1100`). Existing test: `QA-11` (a failing `--copy` removes its temp
  directory) in `shared/resources/tests/qa-execute-snippets.test.mjs`.
- **Boundary decisions** — qa-task Step 3b step 3 (*Apply the boundary rule — execute, do not only
  read*, `skills/qa-task/SKILL.md:474`) and the identical qa-story Phase 1.6 step 3
  (`skills/qa-story/SKILL.md:982`) route bash, sourced-library and CLI boundaries to entry forms and
  call `boundary: false` "the common case and a legitimate skip" (`:506` / `:1014`). The decline
  vocabulary is `probe-boundary-rule.md` §4 (`shared/resources/probe-boundary-rule.md:139`,
  `entry-not-probeable` — "the module would not import, or the export is not a function"). The engine's
  child returns one message for an absent export and for a non-function export
  (`shared/resources/security-probe.mjs:247–251`).
- **Test/validation step** — qa-task Step 4 (`skills/qa-task/SKILL.md:622`) and qa-story Phase 4
  *Standards Compliance Check* (`skills/qa-story/SKILL.md:1238`). The coding standards are loaded on
  every pipeline run via `devLoadAlwaysFiles` (`docs/standards/architecture-docs.md:27`,
  `coding-standards.md` "Required — always loaded"). create-task's Section 9 prompt lists CODE QUALITY as
  coverage / lint / TypeScript (`skills/create-task/SKILL.md:817`), mirrored in
  `skills/create-task/resources/task-template.md:274`.
- **Link and timestamp checks** — `shared/resources/doc-links.js` resolves a document's relative links
  against the **tracked** tree (`checkDocument`, `:271–273`: `tracked.has(resolved) || dirs.has(resolved)`),
  so an artifact that exists but is uncommitted and one that was never written yield the same
  `✖ … (resolves to …)` line. It is bundled into `finalise`, `review-story` and `review-task` — neither QA skill
  carries a copy. With no tracked tree (not a git checkout) it falls back to `fs.existsSync`, so there every
  broken link can only be `missing`; `untracked` is reachable only when the tracked set is read. `shared/resources/change-log.js`
  exports `bumpUpdated()` (`:786`) but has no CLI (`grep -c "require.main"
  shared/resources/change-log.js` → 0) and no coherence check; the only `updated:`-vs-row check is the
  corpus test's private `changeLogRowDates` (`tests/work-item-artifact-naming.test.js:274`, §5 at
  `:291`).

### Target Architecture

- **`--copy-as <src>:<dest>`** (repeatable) copies `<src>` to `<tmp>/<dest>`. `<dest>` must be
  relative and resolve inside the working copy; an absolute or escaping `<dest>` is exit 2 with the
  temp root removed (same cleanup contract as `QA-11`). `--copy` is unchanged. The prose names
  `--copy-as docs:docs` as the seeding form for the `sync-github-*` discovery blocks.
- **Export-and-probe** — the engine's child distinguishes *absent* (`<name> is not exported by
  <path> — a module-private predicate is still a boundary: export it and re-run`) from *not a
  function*. §4's `entry-not-probeable` row and Step 3b / Phase 1.6 step 3 state that an unexported
  predicate is a reason to export it (one word) and probe, never a reason for `boundary: false`; and a
  `boundary: false` record names each predicate-shaped function the diff adds with the reason it is
  not a boundary.
- **Standards-named commands** — qa-task Step 4 and qa-story Phase 4 run every validation command the
  project's coding standards name that the test run does not already cover, and list each under
  *Test Commands Executed* (or record it as not run, with the reason). A non-zero result is a
  `category: bug` finding at `high` confidence — the shape Step 4b failures already take. Worked example
  in the prose: this repository's `npm run validate -- skills/<changed-skill>/`. qa-story Phase 4's
  path becomes the standards file the pipeline actually loads.
- **Read-back step** — qa-task **Step 12b** (between Step 12 and Step 13) and qa-story Review Completion
  item **3e** stage the artifacts this run wrote (task.152's convention), then run, against the
  document just edited:
  `doc-links.js --file <doc> --json` → each broken link now carries `state: missing | untracked`;
  `missing` halts before the PR comment (write the artifact), `untracked` lists files to commit.
  `change-log.js --check-updated --file <doc>` → exit 1 when the newest row is dated after
  `updated:`; the remedy is `bumpUpdated()`, which Step 12 now names. The self-assessed checklist item
  becomes "every artifact the document links to resolves (Step 12b)".
- `tests/work-item-artifact-naming.test.js` §5 imports the new `checkUpdatedCoherence` rather than
  keeping its own row reader, so the corpus guard and the QA read-back cannot disagree.

### Same-class mechanism inventory (obs #103)

- `doc-links.js` is the one link checker; this task **extends** it (a per-link `state`), it does not
  add a second. Its `✖` / `FAIL` output markers are read by `finalise-fix-and-recheck.mjs`
  (`RED_MARKER`, `:81`); the `state` is appended after the existing text, so the markers are unchanged.
- `change-log.js` is the one Change Log engine; `checkUpdatedCoherence` sits **beside** `bumpUpdated`
  (the writer) as its reader, and **replaces** the private `changeLogRowDates` in the corpus test.
- `--copy-as` sits **beside** `--copy`; it does not replace it, because `--copy <dir>`'s
  contents-at-root form is what existing callers (e.g. `copyFrom: cwd` in
  `qa-execute-snippets.test.mjs`) rely on.
- **Planned sibling, task.152** (status `planned`, not yet merged) adds a `doc-links.js` run to qa-task
  Step 11 and qa-story _Output 1_ over the **report** just written, stages it first with `git add`
  because the engine resolves against the index, and bundles `doc-links.js` into both QA skills. This
  task's Step 12b checks the other direction — the **document's** links **to** the report and gate
  after Step 12 — and **reuses** that staging convention: stage what this run wrote, then run
  `doc-links.js`, so a remaining broken link is `missing`. The `state` field is what makes the
  remainder self-describing when staging was skipped. Whichever task lands first owns the bundling;
  the second rebases onto it.

---

## 4. Scope

### In Scope

- ✅ `shared/resources/qa-execute-snippets.mjs` — `--copy-as`, repeatable, contained
- ✅ `shared/resources/security-probe.mjs` — absent-export decline detail
- ✅ `shared/resources/doc-links.js` — per-link `state`
- ✅ `shared/resources/change-log.js` — `checkUpdatedCoherence` + `--check-updated` CLI
- ✅ Prose: `skills/qa-task/SKILL.md` (Step 3b step 3, Step 4, Step 4b, Step 12, new Step 12b,
  checklist), `skills/qa-story/SKILL.md` (Phase 1.6 step 3, Phase 1.7, Phase 4, Review Completion,
  checklist), `skills/create-task/SKILL.md` Section 9 prompt, `skills/create-task/resources/task-template.md`,
  `shared/resources/probe-boundary-rule.md` §4, `shared/resources/qa-runnable-prose-detection.md`
- ✅ Tests (§ 8); `npm run bundle`; CHANGELOG `[Unreleased]`

### Out of Scope

- ❌ **A DoD line when QA and finalise disagree on `boundary:`** (obs #156's "mechanical floor"). QA's
  decision lives in QA-report prose, not in the gate; surfacing a disagreement needs a `boundary` field
  in the gate schema, which `qa-gate` owns. See Open Questions.
- ❌ **finalise's own read-back of the DoD artifacts it links** (obs #164's last line). Its commit
  blocks already halt on a missing DoD file (`skills/finalise/SKILL.md:1245`,
  `[ -n "$DOD_PATH" ] || { echo "HALT: …"`), and its Step 8a already runs `doc-links.js` on the
  document. A full post-Step-7 read-back is a follow-up.
- ❌ Changing `--copy <dir>`'s semantics.
- ❌ Back-filling `npm run validate` into existing task documents.
- ❌ Editing any `skills/*/references/` copy by hand — they are regenerated by `npm run bundle`.

---

## 5. Breaking Changes

None to any public contract.

- `qa-execute-snippets.mjs`: additive flag; `--copy` unchanged.
- `security-probe.mjs`: same `reason` (`entry-not-probeable`), a more specific `detail` string for one
  case. Tests assert `reason`; any that pin the old `detail` text are updated in the same commit.
- `doc-links.js`: an added `state` field in `--json` `broken[]` and an appended suffix on each `✖`
  line; exit codes and the `✖` / `FAIL doc-links:` prefixes unchanged, so
  `finalise-fix-and-recheck.mjs`'s `RED_MARKER` still matches.
- `change-log.js`: new export and a `require.main`-guarded CLI; the module stays side-effect-free on
  `require`.
- QA skills gain a step (12b) and a halt condition (`missing` link) — a QA run that previously posted
  a PR comment linking a report it never wrote now stops before posting. That is the fix.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.149.plan.qa-evidence-integrity.md](task.149.plan.qa-evidence-integrity.md)

Each phase is independently revertible; phases 1–4 have no dependency on each other. Phase 5 depends on
all four.

### Phase 1: seed at the addressed path (obs #143) (Risk: Low)

**Files**: `shared/resources/qa-execute-snippets.mjs`, `shared/resources/qa-runnable-prose-detection.md`,
`skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `shared/resources/tests/qa-execute-snippets.test.mjs`

- [x] `--copy-as <src>:<dest>`, repeatable; `executeFile` option `copyAs: [{ src, dest }]`
- [x] Reject an absolute `<dest>` or one resolving outside the working copy — exit 2, temp root removed
- [x] Usage string, header comment and `qa-runnable-prose-detection.md` document the form
- [x] qa-task Step 4b and qa-story Phase 1.7 name `--copy-as docs:docs` for the `sync-github-*`
      discovery blocks, citing obs #143

### Phase 2: an unexported predicate is exported and probed (obs #156) (Risk: Low)

**Files**: `shared/resources/security-probe.mjs`, `shared/resources/probe-boundary-rule.md`,
`skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `shared/resources/tests/security-probe.test.mjs`

- [x] Child: `!(spec.exportName in mod)` → `<name> is not exported by <path> — … export it and re-run`;
      a present non-function keeps `is not a function`
- [x] §4 table: the `entry-not-probeable` row names the unexported case and its remedy
- [x] Step 3b / Phase 1.6 step 3: "it is not exported" joins "it is bash" and "it takes several flags"
      as never a reason for `boundary: false`, with task.139's `isWorkItemDocument` as the example
- [x] A `boundary: false` record lists each predicate-shaped function the diff adds and the reason it
      is not a boundary

### Phase 3: run the standards-named validation commands (obs #163) (Risk: Low)

**Files**: `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `skills/create-task/SKILL.md`,
`skills/create-task/resources/task-template.md`

- [x] qa-task Step 4: run each validation command the coding standards name that the test run does
      not cover; record each; non-zero → `category: bug`, `high`
- [x] qa-story Phase 4: the same, and replace `docs/coding-standards.md` with the loaded standards path
- [x] create-task Section 9 CODE QUALITY and `task-template.md` Code Quality: "every validation command
      the coding standards name for the files this task touches"

### Phase 4: read the claims back after the write (obs #164) (Risk: Medium)

**Files**: `shared/resources/doc-links.js`, `shared/resources/change-log.js`, `skills/qa-task/SKILL.md`,
`skills/qa-story/SKILL.md`, `tests/work-item-artifact-naming.test.js`,
`shared/resources/tests/doc-links.test.mjs`, `shared/resources/tests/change-log.test.mjs`

- [x] `doc-links.js`: each broken link carries `state` — `untracked` (on disk, not tracked) or
      `missing`; the `✖` line appends it. With no tracked tree every broken link is `missing`
- [x] `change-log.js`: `checkUpdatedCoherence(content)` and `--check-updated --file <doc> [--json]`
      (exit 0 `ok`, 1 `stale-updated`, 2 `usage`)
- [x] qa-task Step 12 names `bumpUpdated()` for the `updated:` bump
- [x] qa-task **Step 12b** and qa-story Review Completion **3e**: run both CLIs on the edited document;
      `missing` or `stale-updated` halts before the PR comment; `untracked` is listed for commit
- [x] Both checklists: "QA report file created and saved" → "every artifact the document links to
      resolves (Step 12b)"
- [x] §5 of `tests/work-item-artifact-naming.test.js` uses `checkUpdatedCoherence`

### Phase 5: population test, bundle, docs (Risk: Low)

**Files**: `tests/qa-evidence-integrity.test.js` (new), `CHANGELOG.md`, bundled `references/` (generated)

- [x] Section-scoped population test over the eleven prose sites (§ 8)
- [x] `npm run bundle` — `doc-links.js` now reaches `qa-task` and `qa-story`
- [x] CHANGELOG `[Unreleased]` › Changed cites `(task 149)`

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/qa-execute-snippets.mjs` — `--copy-as`
2. ✅ `shared/resources/security-probe.mjs` — absent-export detail
3. ✅ `shared/resources/doc-links.js` — per-link `state`
4. ✅ `shared/resources/change-log.js` — `checkUpdatedCoherence`, `--check-updated` CLI
5. ✅ `skills/qa-task/SKILL.md` — Step 3b step 3, Step 4, Step 4b, Step 12, Step 12b, checklist
6. ✅ `skills/qa-story/SKILL.md` — Phase 1.6 step 3, Phase 1.7, Phase 4, Review Completion 3e, checklist
7. ✅ `skills/create-task/SKILL.md` — Section 9 CODE QUALITY prompt
8. ✅ `skills/create-task/resources/task-template.md` — Code Quality criteria
9. ✅ `shared/resources/probe-boundary-rule.md` — §4 `entry-not-probeable` row
10. ✅ `shared/resources/qa-runnable-prose-detection.md` — `--copy-as`

### Files to Modify / Add (Tests)

11. ✅ `shared/resources/tests/qa-execute-snippets.test.mjs`
12. ✅ `shared/resources/tests/security-probe.test.mjs`
13. ✅ `shared/resources/tests/doc-links.test.mjs`
14. ✅ `shared/resources/tests/change-log.test.mjs`
15. ✅ `tests/work-item-artifact-naming.test.js` — §5 uses the engine
16. ✅ `tests/qa-evidence-integrity.test.js` — **new**, inside the existing `tests/*.test.js` glob in
    `package.json` `"test"`

### Files to Modify (Documentation / Generated)

17. ✅ `CHANGELOG.md`
18. ✅ `skills/*/references/*` — regenerated by `npm run bundle`, never hand-edited

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests (engine behaviour — each one red without its fix)

- **`qa-execute-snippets.test.mjs`**: (a) a fixture tree `<fixture>/docs/tasks/a.md` seeded with
  `copyAs: [{ src: "<fixture>/docs", dest: "docs" }]` makes a block running `ls docs/tasks` exit 0 with
  no finding, and the same block with `copyFrom` still fails — the obs #143 shape, both directions;
  (b) two `--copy-as` pairs both land; (c) `dest` of `../escape` and an absolute `dest` are exit 2,
  nothing is written outside the temp root, and the temp root is removed.
- **`security-probe.test.mjs`**: a fixture module with a module-private `const isX = …` probed as
  `<path>#isX` → `reason: entry-not-probeable`, `detail` matches `/not exported/` and `/export it/`; a
  fixture exporting a non-function keeps `/is not a function/`.
- **`doc-links.test.mjs`**: in a scratch git repo, a link to an untracked file on disk → `state:
  "untracked"`; a link to no file → `state: "missing"`; the `✖` line still starts with `✖` and the
  summary with `FAIL doc-links:`.
- **`change-log.test.mjs`**: newest row after `updated:` → `{ ok: false }` and CLI exit 1; equal or
  older → exit 0; a fenced example row is ignored; no Change Log → exit 0 with `reason: "no-log"`.

### Population test (prose sites)

- **`tests/qa-evidence-integrity.test.js`**: one `SITES` array — for each, extract the named section
  (heading to the next heading of the same or higher level, fences skipped, the pattern of
  `shared/resources/tests/probe-boundary-signals.test.mjs`) and assert its load-bearing text. Sites:
  qa-task Step 4b and qa-story Phase 1.7 (`--copy-as`, obs #143); qa-task Step 3b and qa-story
  Phase 1.6 (`not exported` / `export it`, obs #156); qa-task Step 4 and qa-story Phase 4
  (standards-named commands, obs #163); create-task Section 9 prompt (obs #163); qa-task Step 12b and
  qa-story Review Completion (`doc-links`, `--check-updated`, `missing`, `untracked`, obs #164); both
  checklists (the measured item present, the self-assessed wording absent). Floor: all eleven sites
  found — ten sections, since qa-story's checklist sits inside its _Review Completion_ — or the test
  fails naming the heading it could not find.
- The population test proves the rule is **stated**; the engine tests above prove the mechanisms it
  names **work**. Neither proves a QA agent applies the rule — see *Behavioural evidence*.

### Behavioural evidence (recorded in the implementation report, not held by CI)

- `qa-execute-snippets.mjs --file skills/sync-github-task/SKILL.md --copy-as docs:docs --json`: the
  `find docs/tasks` discovery block at `:53` is not an `execution-failure` (it is one on
  `--copy docs` today).
- `doc-links.js --file <a task doc>` run immediately after a QA Step 12 edit on a scratch branch shows
  the new report and gate as `untracked`, and after deleting the report, as `missing`.

### Baselines (commands that produced the figures in § 2)

- 146 / 109 / 23:
  `for d in docs/tasks/task.*/; do n=$(basename "$d"); f="$d$n.md"; …; done` — counts main task
  documents, those naming `skills/[a-z-]*/SKILL.md`, and of those, those naming `npm run validate` or
  `quick_validate` (run 2026-09-24 on `e04de749`). The figure is context, not a success criterion;
  no test re-measures it.

### Regression

- `npm test` (whole suite): `finalise-fix-and-recheck` tests confirm the `✖` marker still reads red;
  §5 of `work-item-artifact-naming.test.js` keeps its non-vacuity floor after the switch.

---

## 9. Success Criteria

### Functional

- [x] `--copy-as docs:docs` makes an `ls docs/tasks` block pass that `--copy docs` fails, and an
      escaping or absolute `dest` is exit 2 with no temp leak — `shared/resources/tests/qa-execute-snippets.test.mjs`
- [x] Probing an unexported predicate yields `entry-not-probeable` with a `detail` naming "not exported"
      and "export it"; a non-function export keeps its message — `shared/resources/tests/security-probe.test.mjs`
- [x] `doc-links.js --json` labels each broken link `untracked` or `missing` correctly, markers
      unchanged — `shared/resources/tests/doc-links.test.mjs`
- [x] `change-log.js --check-updated` exits 1 on a row dated after `updated:`, 0 otherwise, and ignores
      fenced rows — `shared/resources/tests/change-log.test.mjs`
- [x] All eleven prose sites carry their rule, section-scoped — `tests/qa-evidence-integrity.test.js`

### Performance

- [x] `tests/qa-evidence-integrity.test.js` runs in under one second (file reads only, no network)
- [x] The new engine tests add no network access and clean every temp directory they create

### Code Quality

- [x] Every new assertion mutation-proved: revert each engine change and remove each prose site in turn
      → the named test goes red naming it; the runs are recorded in the implementation report
- [x] `npm run ci:fast`, `npm run bundle -- --check`, `npm run check:generated` clean
- [x] `npm run validate -- skills/qa-task/`, `skills/qa-story/`, `skills/create-task/` clean — the
      command this task makes QA run

### Migration

- [x] CHANGELOG `[Unreleased]` cites `(task 149)`
- [x] §5 of `tests/work-item-artifact-naming.test.js` reports the same `checked` count before and after
      switching to `checkUpdatedCoherence` (both recorded in the implementation report) — 130 before, 132 after:
      the two are documents the old reader missed (task.42, task.44), explained per Risk 1's mitigation
- [ ] Observations #143, #163 and #164 set to `actioned` on merge; #156 per Open Question 2

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **§5 changes scope when it switches reader**
   - Risk: `extractEntries` (engine) and `changeLogRowDates` (test) read rows differently — heading
     level, markers, fence handling — so §5 silently checks more or fewer documents.
   - Probability: Medium · Impact: Medium
   - Mitigation: record §5's `checked` count and offender list before and after; any difference is
     explained in the implementation report before merge, or the switch is dropped from this task.
2. **Step 12b halts a QA run that used to finish**
   - Risk: a `missing` link to something other than a QA artifact (a pre-existing dead link) now stops
     the PR comment.
   - Probability: Low · Impact: Medium
   - Mitigation: that link is already a CI red; the halt message names the link, and the remedy
     (write or fix it) is the same one CI would demand one push later.
3. **Conflicts with siblings** — task.146 (edits Step 3b step 2 of both QA skills; this task edits step 3)
   is **merged** (`status: accepted`, `b6bf41d5`), so its edits are already in the base; task.152 adds `doc-links.js` to qa-task Step 11 / qa-story *Output 1*, bundles it
   into both QA skills and widens `doc-links.test.mjs`; task.153 adds a marker at
   `shared/resources/tests/qa-execute-snippets.test.mjs:795`. Found with
   `grep -n -e qa-execute-snippets -e doc-links -e change-log.js -e security-probe` over the
   task.146–154 documents. Rebase whichever lands second; with task.152, keep one bundling commit and
   one staging convention (§ 3).

### Low Risk Areas

1. **`--copy-as` is itself a boundary** — a `dest` that escapes writes outside the sandbox. The
   containment check is tested (§ 8), and QA's own boundary rule will fire on it.
2. **Consumers with no coding standards file** — Phase 3's rule reads "the commands the standards
   name"; with none named, the step records "no standards-named validation commands" and continues.

### Open Questions

1. **`--copy-as` vs. changing `--copy`** — obs #143 offered either. This task takes the additive flag
   (no existing caller changes). Revisit only if `--copy`'s contents-at-root form turns out to have no
   caller that needs it.
2. **obs #156's QA-vs-finalise disagreement line** is out of scope (the gate has no `boundary` field).
   Either resolve #156 as `actioned` and log the remainder as a new observation against `qa-gate`, or
   leave #156 open until that lands. Default taken: the former.
3. **One task or four** — by create-task § 1.2 each observation's fix is independently shippable,
   revertible and valuable. This document groups them as the caller directed; the phases are written so
   any one can be reverted alone, and a reviewer may split them before development.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: Step 12b halts QA runs on correct documents; `doc-links.js` output change breaks
  finalise Step 8a; `--copy-as` writes outside the temp root.
- **Steps**: revert the PR; run `npm run bundle` if the revert does not include the regenerated copies.
- **Validation**: `npm test` and `npm run bundle -- --check` green on the reverted tree.

### Partial Rollback (1–2 hours)

- Revert one phase's commit alone — phases 1–4 share no code. Phase 5's population test loses the
  reverted phase's sites in the same revert.

### Forward Fix

- A false `missing` from Step 12b: fix the classification in `doc-links.js` and add the case to its test.
- A consumer whose standards name a command QA cannot run: the step records it as not run with the
  reason, which is already the specified behaviour.

### Rollback Triggers

- **Critical**: any write outside the snippet sandbox; finalise's `RED_MARKER` no longer matching.
- **Non-critical**: noisy Step 4 findings from standards commands — fix forward.

---

## QA Testing Results

**QA Status**: FAIL
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-26
**Quality Score**: 60/100
**Gate Decision**: FAIL

### QA Report
- **Full Report**: [task.149.qa.2.qa-evidence-integrity.md](./task.149.qa.2.qa-evidence-integrity.md)
- **Gate File**: [task.149.gate.2.qa-evidence-integrity.yml](./task.149.gate.2.qa-evidence-integrity.yml)

### Test Coverage Summary
- **Tests Executed**: 4202 (4201 pass, 0 fail, 1 skipped); 32 boundary probes
- **Phases Verified**: 5/5
- **Critical Issues**: 1
- **NFR Status**: Security: FAIL, Performance: PASS, Reliability: CONCERNS, Maintainability: PASS

### Key Findings
- HIGH — [TASK-149-BUG-1](./task.149.bug.1.copy-as-symlink-escape.md) reopened: merging into an existing DEST follows a seeded symlink (probe 16/18).
- MEDIUM — [TASK-149-BUG-3](./task.149.bug.3.read-back-decision-gaps.md): read-back passes on empty output under zsh; untracked residue exempted.
- MEDIUM — [TASK-149-BUG-4](./task.149.bug.4.link-state-misclassifies.md): case-mismatch and outside-repo links read `untracked`.
- Closed — [TASK-149-BUG-2](./task.149.bug.2.step-12b-no-mechanical-halt.md).
- LOW — CR-6 (block input binding), CR-7 (§5 shares its reader), QA-2-M1 (staging untested).

---

## Change Log

| Date       | Version | Description                                                                                          | Author      |
| ---------- | ------- | ---------------------------------------------------------------------------------------------------- | ----------- |
| 2026-09-24 | 1.0     | Initial draft — cut from observations #143, #156, #163, #164 (2026-09-24 observation review) | create-task |
| 2026-09-26 | 1.1     | Review passed (9/10) — doc-links bundling claim and task.146 status corrected, 14 line anchors re-pointed, no-tracked-tree `state` stated | review-task |
| 2026-09-26 |         | Status → ready-for-development | review-task |
| 2026-09-26 |         | Implemented — 4 engines, 11 prose sites, 1 new population test + shared section reader; 26 tests added | develop |
| 2026-09-26 |         | QA gate FAIL (70/100) — 1 high, 1 medium, 2 low | qa-task |
| 2026-09-26 |         | QA gate FAIL (60/100) — 1 high (reopened), 2 medium, 3 low | qa-task |

---

## Progress Tracking

- [x] Phase 1: seed at the addressed path (obs #143)
- [x] Phase 2: an unexported predicate is exported and probed (obs #156)
- [x] Phase 3: run the standards-named validation commands (obs #163)
- [x] Phase 4: read the claims back after the write (obs #164)
- [x] Phase 5: population test, bundle, docs

---

## References

- Observation #143 — `qa-execute-snippets --copy` seeds contents at the temp root (2026-09-21, task.125)
- Observation #156 — Step 3b security axis read `boundary: false` on a diff finalise then probed
  (2026-09-22, task.139; fix commit `d25adf2e`)
- Observation #163 — `npm run validate` is named in the standards and run by no gate (2026-09-22, task.141)
- Observation #164 — qa-task links the QA report without checking it exists; recurrence on the
  Change Log date (2026-09-22 / 2026-09-23, task.141)
- task.146 — adjacent edit to Step 3b step 2 of both QA skills; merged, already in the base (see Risk 3)
- task.152 — `doc-links.js` at the QA report writer sites; staging convention reused by Step 12b
  (see § 3 and Risk 3)

---

## Notes

### Important Reminders

- QA artifacts land in this directory: `task.149.qa.{N}.qa-evidence-integrity.md`,
  `task.149.gate.{N}.qa-evidence-integrity.yml`, bug reports `task.149.bug.{N}.{name}.md`.
- Every current-state line in § 2–3 was re-checked against `e04de749` on 2026-09-24; all four
  observations still hold, none is dropped.
- Effort: the rubric (`effort-estimation-rubric.md`) gives 2 + 4 (criteria beyond 3, capped) + 4
  (plan tasks beyond 4, capped) + 1 (files > 5) + 2 (body names "migration") = 13 → **16h**.
