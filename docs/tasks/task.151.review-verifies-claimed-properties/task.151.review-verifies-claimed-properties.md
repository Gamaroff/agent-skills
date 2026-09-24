---
id: task.151
title: "[Task 151] review-task: stack-neutral pre-pass, executed invariants, released-shape diff"
type: task
description: "Three review-task checks confirm that a thing exists but never that a claimed property of it holds. (1) The Phase 1.5 pre-pass Agent B compares a document against a hard-coded web-stack domain list and web-stack axes. On a shell/Node repository it answers 'aligned' unless someone rewrites the prompt by hand (obs #130). Derive the domains and axes from the consumer's own architecture docs using a small pure helper, and require Agent B to report the axes it actually checked. (2) Every Step 3 check and Anti-Hallucination Detection Rule verifies existence. None runs the property a document claims for an existing function under new inputs (obs #161). Add an Invariant verification check: execute the claim and report a falsified one as Critical. (3) Legacy and compatibility handling is scoped from the finding that prompted it instead of from the released artefact (obs #170). Add a Released-shape diff check: `git show <tag>:<path>`, diff the result against the target shape, and report every uncovered field as Important. Sites: review-task, review-story and create-task Step 3.5, held by two tests."
tags: [review-task, review-story, create-task, pre-pass, anti-hallucination, observation]
category: documentation
status: planned
priority: Medium
risk_level: low
created: 2026-09-24
updated: 2026-09-24
assignee:
estimated_effort_hours: 8
github_issue: 481
---

# Technical Task: review-task — stack-neutral pre-pass, executed invariants, released-shape diff

**Status:** Planned

**GitHub Issue**: [#481](https://github.com/Gamaroff/agent-skills/issues/481)

---

## 1. Overview

`/review-task` asks whether the things a task names **exist**. It does not ask whether the
**properties** the task claims for them **hold**. Three observations recorded the same gap from three
different angles. This task closes all three in review-task, in its story sibling (review-story), and
in create-task Step 3.5, where each defect is first introduced.

**Scope**: one small pure helper (`shared/resources/prepass-axes.js`), the two pre-pass prompt files,
prose checks in three `SKILL.md` files, two tests and a CHANGELOG entry.

**Key deliverables**:

1. **Stack-neutral pre-pass (obs #130).** Agent B's domain list and pattern axes are slots,
   `{arch_domains}` and `{arch_axes}`. `prepass-axes.js` fills them from the consumer's
   `concepts/tech-stack.md` and `concepts/coding-standards.md`. The web-stack list is used only
   when neither file exists. Agent B returns an `axes_checked` list, so an `aligned` verdict names
   the axes it was measured against.
2. **Invariant verification (obs #161).** A Step 3 check and an Anti-Hallucination Detection Rule
   for claims that an existing function has a property (ordering, uniqueness, idempotence,
   round-trip) under the inputs the document proposes. The reviewer runs the claim on those inputs
   rather than reasoning about it. A falsified invariant is reported as **Critical**.
3. **Released-shape diff (obs #170).** A Step 3 check for legacy, compatibility and migration
   handling. The reviewer derives the legacy shape from the last release tag with
   `git show <tag>:<path>` and diffs it against the target shape. Every field the document does not
   cover is **Important**, and the document must cite the tag it compared against.

**Expected outcome**: the three worked examples fail at review. Each is a real defect that passed a
review.

- Agent B no longer returns `aligned` on this repository by comparing it against
  "backend / frontend / auth / payments / real-time".
- task.141's claim that zero-padding keeps runs in chronological order is run during review and
  reported as Critical.
- task.143's one-field legacy handling is diffed against `v0.51.0` and reported as missing
  `targeted` and `filedBug`, plus `bug` (per obs #170).

---

## 2. Motivation

### Current Problems

1. **A web-stack prompt passes a shell/Node repository (obs #130).**
   `shared/resources/review-task-prepass-prompts.md:24` _("backend / frontend / auth / payments /
   real-time")_ sets Agent B's domain list. Its axes (lines 26–30) are libraries, naming/layering
   patterns, "API endpoints or payloads" and auth/crypto. On review-task 124 (2026-09-19) the prompt
   had to be rewritten by hand at dispatch before it returned anything usable. The rewrite added this
   repository's actual axes: one-writer lock fields, the `--json reason` contract and the
   bundle-comment origin rule. Once rewritten, Agent B found that review's one medium finding.
   Unadapted, it would have returned `aligned` on a document that had real drift. The same literal
   is in `shared/resources/review-story-prepass-prompts.md:58`
   (`grep -ln "backend / frontend / auth / payments / real-time" shared/resources/*.md` → 2 files).
2. **The story sibling does not use its prompt file at all.** `skills/review-story/SKILL.md:511`
   _(`Subagent 3 (Architecture Alignment)`)_ dispatches Agent B from a one-line inline description
   with no axes at all. `grep -c prepass skills/review-story/SKILL.md` → `0`. The file
   `review-story-prepass-prompts.md` ships only inside `skills/review-task/references/`, which the
   task prompt file's sibling note (line 10) reaches.
3. **Every detection rule checks existence (obs #161).**
   - The Anti-Hallucination Protocol in `skills/review-task/SKILL.md:1901` _(`### Detection Rules`)_
     has six rules: technology, path, pattern, API, schema and config key. Command:
     `sed -n '/^### Detection Rules/,/^### Reporting Hallucinations/p' skills/review-task/SKILL.md | grep -c '^[0-9]\. '`
     → `6`.
   - Step 3's validation checks (`skills/review-task/SKILL.md:757`, nine numbered checks by
     `sed -n '/^### Step 3: Technical Accuracy/,/^\*\*Common Hallucination/p' … | grep -c '^[0-9]\+\. \*\*'`)
     all ask whether a named thing exists or has a reader.
   - On task.141 (reviewed 2026-09-22) the document said zero-padding keeps `listRunFiles`'
     basename sort chronological past nine runs. Every existence check passed. The claim is false,
     because run 1 has no suffix and `.` sorts after `-`: `command node -e 'console.log(["a-lan.md","a-lan-02.md"].sort())'`
     → `["a-lan-02.md","a-lan.md"]`. Running one line in seconds would have caught it. Reading the
     function could not.
4. **Compatibility scope comes from the bug report (obs #170).** task.143 as created (commit
   `82c61b33`, line 145 _("Legacy state file (no `priorRuns`)")_) specified legacy handling for
   exactly one missing field: the one the originating QA finding happened to name. Obs #170 records
   that the released shape at `v0.51.0` lacks four fields: `targeted`, `priorRuns`, `bug` and
   `filedBug`. A missing `bug` would have made a repeat failure file a duplicate bug. Three of the
   four have zero word matches at the tag: `git show v0.51.0:skills/qa-next/SKILL.md | grep -c '\btargeted\b'`
   → `0`, and the same for `priorRuns` and `filedBug`. `bug` is a common word and cannot be measured
   this way. Nothing in review-task or create-task asks what the _released_ shape was. The gap was
   caught only because the reviewer diffed against the tag by hand.

### Benefits of Solution

- On a stack other than the default, Agent B compares the document against that repository's own
  standards. It also reports what it checked, so an `aligned` measured against the wrong axes can be
  seen in the review report.
- review-story's pre-pass is fixed along with review-task's, because review-story starts citing its
  prompt file.
- A property claim is run while the function is already open for Step 3. A few seconds at review
  replaces a confusing red test at develop, where the test fails against code that matches its spec.
- Compatibility work is specified from the artefact that was released, not from the one symptom a
  report happened to see.
- All three checks are held by tests. A later edit that drops a check from one site turns that test
  red and names the site.

---

## 3. Technical Background

### Current Architecture

**Pre-pass (obs #130)**

- `skills/review-task/SKILL.md:399` _(`### Phase 1.5: Pre-pass (2 Parallel Explore Subagents)`)_
  resolves `{task_path}` and `{arch_location}` (lines 407–409). It dispatches Agents B and C from
  `references/review-task-prepass-prompts.md` and validates only the top-level key (`alignment` for
  B) at line 415.
- `skills/review-task/SKILL.md:298` _(`## Pre-pass Summary Consumption`)_ surfaces `PREPASS_B`
  findings only when `alignment` is `drift` or `conflict`. An `aligned` produces no question.
- `shared/resources/review-task-prepass-prompts.md`:
  - The Agent B template (lines 21–40) hard-codes the domain list (line 24) and four axes (lines
    27–30).
  - The output enum is `library | pattern | api-contract | security` (line 36).
  - The variable table (lines 100–105) lists only `{task_path}` and `{arch_location}`.
- `shared/resources/review-story-prepass-prompts.md` has the same Agent B at lines 55–74, with the
  same literal at line 58. review-story never cites the file (see Problem 2).
- This repository's architecture docs exist and are specific:
  - `docs/architecture/concepts/tech-stack.md`, with H2s `Runtimes`, `Languages`,
    `Package management`, `Distribution`, `Test and eval harness`, `Infrastructure and CI`,
    `Skill-bundled assets` and `See also`.
  - `docs/architecture/concepts/coding-standards.md`, with H2s `What this repo produces`,
    `SKILL.md authoring`, `File naming`, `Status lifecycle`, `Cross-skill resources`,
    `Platform branching`, `Plan files`, `Registries`, `Validation before commit`, `Do not` and
    `See also`.
  - Both lists come from `grep -n "^## " docs/architecture/concepts/{tech-stack,coding-standards}.md`.
  - The prompt reads these files and then compares against axes they do not define.

**Existence-only checks (obs #161, #170)**

- `skills/review-task/SKILL.md:757` _(`### Step 3: Technical Accuracy and Anti-Hallucination Review`)_
  has nine numbered checks. `Common Hallucination Patterns to Detect` is at line 852 and
  `Issues to Flag` at line 861.
- `skills/review-task/SKILL.md:1897` _(`## Anti-Hallucination Protocol`)_ has six Detection Rules.
- `skills/review-story/SKILL.md:872` _(`### Step 4: Technical Accuracy and Anti-Hallucination Review`)_
  has six numbered checks, with `Common Hallucination Patterns to Detect` at line 946.
  `## Anti-Hallucination Protocol` at line 2534 has five Detection Rules (same `sed | grep -c`
  command → `5`).
- `skills/create-task/SKILL.md:418` _(`### 3.5 Adversarial Quality Review`)_ has a _🚨 Critical_
  list that carries the authoring-time twins of review-task checks 6–8 (obs #103, #117, #102, at
  lines 430–432). None of the three is a property or release check.
- Nothing in review-task, review-story or create-task mentions a release tag or `git show <tag>:`.
  Command: `grep -n "released\|git show v\|latest tag" skills/{review-task,review-story,create-task}/SKILL.md`
  → no matches.

### Target Architecture

```text
shared/resources/prepass-axes.js      deriveAxes({ archDir }) → { reason, source, domains[], axes[], read[] }
                                      source: architecture | partial | fallback
                                      domains ← H2s of concepts/tech-stack.md      (minus "See also")
                                      axes    ← H2s of concepts/coding-standards.md (minus "See also")
                                      fallback (neither file) ← today's web-stack list and four axes
                                      CLI: --arch <dir> [--json]; exit 0 ok, 2 usage; no writes, no network
review-{task,story}-prepass-prompts   Agent B: "{arch_domains}", "for each of {arch_axes}"; returns axes_checked[]
review-task Phase 1.5                 runs prepass-axes.js; B is valid only with alignment + axes_checked
review-story Step 1 Subagent 3        dispatches Agent B from review-story-prepass-prompts.md (today: inline one-liner)
review-task Step 3                    + Invariant verification (obs #161)   falsified → Critical
                                      + Released-shape diff    (obs #170)   uncovered field → Important
review-task Detection Rules           + 7. Invariant Verification
review-story Step 4 / Detection Rules the same two checks; + 6. Invariant Verification
create-task Step 3.5 Critical         + two authoring twins
```

### Relationship to tasks 145 and 129 (boundary)

- **task.145**
  ([`task.145.review-outcome-reachability-check.md`](../task.145.review-outcome-reachability-check/task.145.review-outcome-reachability-check.md),
  planned) adds _Outcome reachability_. When a success criterion states **one outcome** (a verdict,
  exit code or status) that a named function returns for a stated input, the reviewer **reads** that
  input through the function's decision branches.
  - Invariant verification is a different claim: a **property over a set of inputs** (ordering,
    uniqueness, idempotence, round-trip). It can appear anywhere in the document, including the
    Technical Background and code comments in the plan, and it is checked by **executing** it.
  - Where one sentence fits both checks, running it answers the reading question as well. Report it
    once, under Invariant verification.
  - task.145's examples (verdicts and exit codes) stay with task.145. This task adds nothing to its
    four sites except the shared Step 3 list both append to.
- **task.129**
  ([`task.129.review-call-site-population-check.md`](../task.129.review-call-site-population-check/task.129.review-call-site-population-check.md),
  planned) measures the **population of call sites** of a shared engine and diffs it against the
  document's list.
  - Released-shape diff also treats a document's list as recall rather than measurement, but its
    population is the **fields of a data shape at a release tag**, not invocations. It uses
    `git show <tag>:<path>`, not `call-sites.js`.
  - task.129 also edits the pre-pass Agent C prompt. This task edits only Agent B, the dispatch table
    and the schema validation. The two edits are to different sections of the same two files.
- **Numbering collision (all three tasks).** task.129 plans "check 9" and task.145 plans "check 10",
  and Step 3 already has a check 9 (_Configuration Key Accuracy_, `skills/review-task/SKILL.md:847`).
  This task therefore names its checks by **name and obs citation**, and its tests anchor on the obs
  citation, not on a number. Whichever task lands later appends after the last check present at that
  time.

### Same-class mechanism inventory (obs #103)

- **Heading readers.** `prepass-axes.js` reads H2 headings and must skip fenced blocks.
  `shared/resources/jira-sync.js` already has a CommonMark fence tracker, `makeFenceTracker()` at
  line 1204 (not exported). It also exports `matchCodeFence` (exported at line 5808). The helper
  **extends** that mechanism: export `makeFenceTracker` and require it. It must not add another fence
  parser beside the ones in `jira-sync.js` and `doc-links.js`.
- **Architecture-doc readers.** Nothing else reads the architecture docs. `resolve-paths.sh` resolves
  only the directory (`ARCH_ROOT`), and `qa-diminishing-returns.js:114` mentions `tech-stack.md` in a
  comment only. The helper **sits beside** `resolve-paths.sh`: that script supplies the directory,
  and the helper reads inside it.
- **Checks.** The two new Step 3 checks **sit beside** checks 2 (File Path Accuracy), 5 (Code
  Example Accuracy) and 9 (Configuration Key Accuracy). Those three verify that a thing exists or has
  a reader. The new checks verify a property of a thing that exists.

---

## 4. Scope

### In Scope

- ✅ `shared/resources/prepass-axes.js`, a pure `deriveAxes` plus a thin CLI.
- ✅ Agent B in both pre-pass prompt files: the slots, contract-neutral axis wording,
  `axes_checked`, and new dispatch-table rows.
- ✅ review-task Phase 1.5 (run the helper, validate `axes_checked`) and Pre-pass Summary Consumption
  (report `axes_checked` when the verdict is `aligned`).
- ✅ review-story Step 1 Subagent 3 dispatches from `review-story-prepass-prompts.md`.
- ✅ Invariant verification: review-task Step 3 check, Detection Rule 7 and pattern line;
  review-story Step 4 check and Detection Rule 6; create-task Step 3.5 Critical bullet.
- ✅ Released-shape diff: review-task Step 3 check; review-story Step 4 check; create-task Step 3.5
  Critical bullet.
- ✅ `shared/resources/tests/prepass-axes.test.mjs` and `tests/review-property-checks.test.js`.
- ✅ `npm run bundle`; CHANGELOG `[Unreleased]`.

### Out of Scope

- ❌ **Outcome reachability.** Reading one stated outcome through the deciding function is task.145.
- ❌ **Call-site population enumeration and the Agent C prompt.** These are task.129.
- ❌ **review-epic and review-prd.** Obs #161 names them. Their `Key Anti-Hallucination Rules`
  (`skills/review-epic/SKILL.md:819`, `skills/review-prd/SKILL.md:801`) check PRD and epic claims
  against the codebase, and they have no numbered technical-accuracy checks of this shape. task.145
  made the same call for the same two skills. This is recorded as an Open Question (§ 10) so it can
  be revisited when an instance appears.
- ❌ **review-bug.** Obs #161 states it has no anti-hallucination block and needs no change. Its
  pre-pass (`skills/review-bug/SKILL.md:56`) runs duplicate and staleness scans, not an architecture
  axis, so obs #130 does not apply.
- ❌ **A mechanical engine for invariants or released shapes.** Deciding which sentence is a
  property claim, and which file defines a shape at a tag, is a reading judgement. Both stay reviewer
  steps. The tests hold that the steps are present, and § 8 records the behavioural evidence.
- ❌ **Re-reviewing existing planned tasks against the new checks.**

---

## 5. Breaking Changes

### 1. Agent B's output adds a required `axes_checked`

- **Before**: an Agent B block is valid when it has `alignment`
  (`skills/review-task/SKILL.md:415`).
- **After**: it is valid when it has `alignment` and `axes_checked`. An `aligned` with an empty or
  missing `axes_checked` is treated as a **failed** agent: the review logs the standard warning and
  performs the pass inline. `unknown` (architecture docs not found) may still carry
  `axes_checked: []`.
- **Who is affected**: only the review skills. The prompt and its validator ship in the same skill
  directory, and no consumer parses `PREPASS_B`. Evidence:
  `grep -rn "PREPASS_B" skills/*/SKILL.md shared/resources/*.md` → only review-task and
  review-story.
- **Migration**: none needed. A consumer on the old prompt runs the old validator.

### 2. review-story's Agent B changes from an inline one-liner to the prompt file

- **Before**: `Subagent 3` is dispatched with "Evaluate the story's technical details against core
  system architecture" (`skills/review-story/SKILL.md:511`).
- **After**: it is dispatched with the Agent B template in `review-story-prepass-prompts.md`, with
  the same substitution as review-task. `npm run bundle` copies the prompt file and `prepass-axes.js`
  into `skills/review-story/references/`.
- **Migration**: none. This changes what the pre-pass checks, not any interface.

The enum value `api-contract` stays unchanged. Its axis wording broadens from "API endpoints or
payloads" to "interfaces the architecture docs define (endpoints, CLI flags, exit codes, output
schemas)", so the value still fits a CLI repository.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.151.plan.review-verifies-claimed-properties.md](task.151.plan.review-verifies-claimed-properties.md)

### Phase 1: Stack-neutral pre-pass (obs #130) (Risk: Low)

**Files**: `shared/resources/prepass-axes.js`, `shared/resources/jira-sync.js` (export only),
`shared/resources/review-task-prepass-prompts.md`, `shared/resources/review-story-prepass-prompts.md`,
`skills/review-task/SKILL.md`, `skills/review-story/SKILL.md`,
`shared/resources/tests/prepass-axes.test.mjs`

- [ ] `prepass-axes.js`:
  - `deriveAxes({ archDir })` reads `concepts/tech-stack.md` and `concepts/coding-standards.md`. It
    collects H2s with the fences skipped (reusing `makeFenceTracker`) and drops `See also`.
  - It returns `source`: `architecture` when both files are present, `partial` when one is, and
    `fallback` when neither is. A missing half takes today's list for that half.
  - CLI: `--arch <dir> [--json]`, with `reason` equal to `source`. It exits 2 on a missing `--arch`
    or an unknown flag, with nothing on stdout. Guard: `require.main === module`.
- [ ] Export `makeFenceTracker` from `jira-sync.js`. This is additive, and no behaviour changes.
- [ ] Both prompt files, Agent B:
  - Domain parenthetical → `{arch_domains}`.
  - Axis 2 → "for each of `{arch_axes}`".
  - Axis 3 → contract-neutral wording.
  - New output key `axes_checked: [<axis names compared>]`.
  - Variable table rows for `{arch_domains}` and `{arch_axes}`, sourced from `prepass-axes.js`.
  - Summary-schema validation requires `axes_checked` for B.
- [ ] review-task Phase 1.5, step 1: run the helper from the repository root
      (`.agents/skills/review-task/references/prepass-axes.js`) and substitute its output. Step 3 of
      Phase 1.5 and the prompt file's § Summary schema validation state the `axes_checked` rule.
- [ ] review-task § Pre-pass Summary Consumption: when `PREPASS_B` is `aligned`, the report's
      Technical Accuracy section records `axes_checked` in one line.
- [ ] review-story Step 1 Subagent 3: cite `shared/resources/review-story-prepass-prompts.md`
      Agent B and run the same helper.
- [ ] `prepass-axes.test.mjs` (see § 8).

**Dependencies**: none.

### Phase 2: Invariant verification (obs #161) (Risk: Low)

**Files**: `skills/review-task/SKILL.md`, `skills/review-story/SKILL.md`,
`skills/create-task/SKILL.md`

- [ ] review-task Step 3: append **Invariant verification** (obs #161) after the last numbered
      check.
  - Trigger: the document asserts a property of an **existing** function under **new** inputs
    (ordering, uniqueness, idempotence, round-trip).
  - Action: import the function, or re-implement the two lines, and run it on the inputs the
    document proposes. Only pure and local: no network, no writes outside a temp directory.
  - Worked example: task.141's `a-lan.md` / `a-lan-02.md` sort.
  - Severities: falsified → **Critical**; cannot be run in the review environment → **Optional**,
    recording what it needs.
- [ ] review-task _Common Hallucination Patterns_: "❌ A property of an existing function asserted
      for new inputs and not run on them".
- [ ] review-task `### Detection Rules`: **7. Invariant Verification**. Existence and behaviour are
      different instruments.
- [ ] review-task _Issues to Flag_ → Critical: add "falsified invariant".
- [ ] review-story Step 4: the same check, worded for Dev Notes and acceptance criteria. Add
      `### Detection Rules` **6. Invariant Verification**.
- [ ] create-task Step 3.5 _🚨 Critical_: **A property claimed, not run** (obs #161).

**Dependencies**: none. This phase is independent of Phase 1.

### Phase 3: Released-shape diff (obs #170) (Risk: Low)

**Files**: `skills/review-task/SKILL.md`, `skills/review-story/SKILL.md`,
`skills/create-task/SKILL.md`

- [ ] review-task Step 3: append **Released-shape diff for compatibility handling** (obs #170).
  - Trigger: the document defines backward-compatibility, migration, "legacy" or old-format
    handling for a file, record, state file, schema or config shape.
  - Action:
    1. Find the latest release tag: `git tag --list 'v*' --sort=-v:refname | head -1`, or the
       project's own release-tag pattern.
    2. Read the file that **defines or writes** the shape at that tag: `git show <tag>:<path>`.
    3. Diff that field list against the target shape.
  - Every field or key the document does not cover is **Important**. The document must **cite the
    tag** it compared against, and a missing citation is **Important** too.
  - No release tag exists → **Optional** ("state the baseline").
  - The path did not exist at the tag → no released legacy exists. Say so, and the handling covers
    unreleased states only.
- [ ] review-story Step 4: the same check.
- [ ] create-task Step 3.5 _🚨 Critical_: **Compatibility scoped from a finding, not from the
      release** (obs #170). Derive the legacy shape from the tag and cite it.

**Dependencies**: none. This phase is independent of Phases 1 and 2.

### Phase 4: Population test, bundle, docs (Risk: Low)

**Files**: `tests/review-property-checks.test.js`, `CHANGELOG.md`, `skills/*/references/`
(generated)

- [ ] `tests/review-property-checks.test.js` (see § 8).
- [ ] `npm run bundle`. `bundle:check` must report no `UNREACHED`.
- [ ] CHANGELOG `[Unreleased]` › Changed cites `(task 151)`.
- [ ] Hand runs recorded in the implementation report (§ 8).

**Dependencies**: Phases 1–3.

---

## 7. Files Summary

### Files to Add

1. ✅ `shared/resources/prepass-axes.js`: `deriveAxes` plus the CLI.
2. ✅ `shared/resources/tests/prepass-axes.test.mjs`: the helper, both prompt files, and the two
   dispatch sites. Already inside the `shared/resources/tests/*.test.mjs` glob in `package.json`.
3. ✅ `tests/review-property-checks.test.js`: section-scoped population test for obs #161 and obs
   #170. Already inside the `tests/*.test.js` glob.

### Files to Modify (Core Implementation)

4. ✅ `shared/resources/review-task-prepass-prompts.md`: Agent B, variable table, schema validation.
5. ✅ `shared/resources/review-story-prepass-prompts.md`: the same edits.
6. ✅ `shared/resources/jira-sync.js`: export `makeFenceTracker`.
7. ✅ `skills/review-task/SKILL.md`: Phase 1.5, Pre-pass Summary Consumption, Step 3 (two checks,
   pattern line, Issues to Flag), Detection Rule 7.
8. ✅ `skills/review-story/SKILL.md`: Step 1 Subagent 3, Step 4 (two checks), Detection Rule 6.
9. ✅ `skills/create-task/SKILL.md`: two Step 3.5 Critical bullets.

### Files to Modify (Documentation)

10. ✅ `CHANGELOG.md`.

### Generated (never hand-edited)

11. ✅ `skills/review-task/references/` and `skills/review-story/references/`, regenerated by
    `npm run bundle`. `review-story/references/` gains `review-story-prepass-prompts.md` and
    `prepass-axes.js`, plus `jira-sync.js` if it is not already present.

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests: `shared/resources/tests/prepass-axes.test.mjs`

- **Behaviour on this repository's docs.**
  - `deriveAxes({ archDir: "docs/architecture" })` returns `source: "architecture"`. Its `domains`
    equal the tech-stack H2s and its `axes` equal the coding-standards H2s, minus `See also` in both.
  - The result contains none of `payments`, `real-time` or `frontend`.
  - The expected lists are read from the files by the test's own `^## ` scan, not restated. A later
    heading edit therefore does not break the test.
- **Fallback and partial.** The fixtures are built in `mkdtempSync` directories, not committed.
  - With no `concepts/` directory → `fallback`, with today's five domains and four axes.
  - With only `coding-standards.md` → `partial`: the axes come from the file and the domains fall
    back.
- **Fences.** A `## Heading` inside a fenced block is not an axis.
- **CLI.**
  - `--json` prints `{ reason, source, domains, axes, read }` and exits 0. `read.length ≤ 2`.
  - An unknown flag or a missing `--arch` exits 2 with an empty stdout.
  - Invoked through a symlinked directory, it still prints. This matches the obs #126 guard class
    that `entrypoint-guard-realpath.test.mjs` holds.
- **Prompt files.** In each file, the heading-bounded `## Agent B` section (fences **not** skipped,
  because the template is itself fenced):
  - contains `{arch_domains}`, `{arch_axes}` and `axes_checked`;
  - contains no `payments` or `real-time`;
  - has numbered axis lines identical across the two files once `task`/`story` is normalised.
- **Dispatch sites.**
  - review-task `### Phase 1.5` names `prepass-axes.js` and `axes_checked`.
  - review-story `### Step 1: Context Discovery` names `review-story-prepass-prompts.md` and
    `prepass-axes.js`. This is red today: `grep -c prepass skills/review-story/SKILL.md` → 0.
- **Command**: `command node --test shared/resources/tests/prepass-axes.test.mjs`.

### Unit Tests: `tests/review-property-checks.test.js`

- **Sites.** One array holds `{ file, heading, obs }` for eight sites.
  - obs #161: review-task Step 3, review-task `### Detection Rules`, review-story Step 4,
    review-story `### Detection Rules` and create-task `### 3.5 Adversarial Quality Review`.
  - obs #170: review-task Step 3, review-story Step 4 and create-task 3.5.
- **Extraction.** Each section runs from its heading to the next heading of the same or higher
  level, with fences skipped. A mention elsewhere in the file therefore cannot satisfy a site. This
  is task.144's CR-4 lesson, and the pattern is in
  `shared/resources/tests/probe-boundary-signals.test.mjs`.
- **Assertions per site.**
  - obs #161: the citation `obs #161`, a run/execute verb, "existing function", "inputs", and
    `Critical`. The two Detection Rules sites carry no obs numbers today, so they assert the rule name `Invariant Verification` and the verb instead of the citation.
  - obs #170: the citation `obs #170`, `git show`, `tag`, "diff" and `Important`.
- **Floor.** The extractor must find all 8 headings, so a renamed heading is red, not a silent pass.
- **Command**: `command node --test tests/review-property-checks.test.js`.

### Mutation Proofs (recorded in the implementation report)

1. Force `deriveAxes` to return the fallback → the this-repository test goes red.
2. Remove the fence skip → the fence test goes red.
3. Restore the web-stack parenthetical in either prompt file → the prompt test goes red and names
   the file.
4. Drop the `axes_checked` rule from review-task Phase 1.5 → the dispatch-site test goes red.
5. For each of the 8 sites, delete the check → red, naming the file and section.

### Behavioural Evidence (recorded, not automated)

The population test shows each check is **stated**. It does not show that a reviewer **applies** it.
This repository has no eval layer for the review skills: `ls evals` lists no `review-*` directory.
The implementation report therefore records three hand runs:

1. `/review-task --validate` on a scratch copy of task.141 as created (`git show cd0c9804:docs/tasks/task.141.qa-next-targeted-item/task.141.qa-next-targeted-item.md`).
   The review reports the zero-padding sort claim as **Critical** and quotes the one-line run.
2. `/review-task --validate` on a scratch copy of task.143 as created (`82c61b33`). The review
   reports the legacy handling as **Important**, cites `v0.51.0`, and names the uncovered fields.
3. The Phase 1.5 pre-pass on any task in this repository. `axes_checked` lists coding-standards
   headings, not web-stack axes.

### Regression

- `npm test`. `executable-instructions.test.js` checks that the new fenced `prepass-axes.js` command
  resolves once bundled. The fenced-bash guards (`fenced-bash-positional-params`,
  `fenced-bash-optional-file-globs`) cover the new fence.
- `npm run bundle:check` and `npm run validate`.

---

## 9. Success Criteria

### Functional

- [ ] **SC1.** `deriveAxes` on `docs/architecture` returns `source: "architecture"`. Its domains and
      axes match the two files' H2s (minus `See also`) and contain no web-stack literal.
      Test: `shared/resources/tests/prepass-axes.test.mjs`.
- [ ] **SC2.** With no concepts files `deriveAxes` returns `fallback` with today's lists. With one
      file it returns `partial`. A fenced heading is never an axis.
      Test: `prepass-axes.test.mjs`.
- [ ] **SC3.** The CLI prints the `--json` shape and exits 0. It exits 2 with an empty stdout on a
      usage error, and it runs through a symlinked directory. Test: `prepass-axes.test.mjs`.
- [ ] **SC4.** Both prompt files' Agent B sections carry `{arch_domains}`, `{arch_axes}` and
      `axes_checked`, carry no `payments` or `real-time`, and have identical axis lines.
      Test: `prepass-axes.test.mjs`.
- [ ] **SC5.** review-task Phase 1.5 runs the helper and requires `axes_checked`. review-story
      Step 1 dispatches from `review-story-prepass-prompts.md`, which is red on today's tree.
      Test: `prepass-axes.test.mjs`.
- [ ] **SC6.** Invariant verification (obs #161) is present, with its load-bearing terms, in all 5
      sites. Test: `tests/review-property-checks.test.js`.
- [ ] **SC7.** Released-shape diff (obs #170) is present, with its load-bearing terms, in all 3
      sites. Test: `tests/review-property-checks.test.js`.

### Performance

- [ ] **SC8.** Each of the two test files runs in under one second without network access.
- [ ] **SC9.** The helper reads at most two files (`read.length ≤ 2`, asserted in
      `prepass-axes.test.mjs`).

### Code Quality

- [ ] **SC10.** All five mutation proofs in § 8 are recorded, each red before the fix and green
      after.
- [ ] **SC11.** `npm test`, `npm run format:check`, `npm run bundle:check` (no `UNREACHED`) and
      `npm run validate` are clean.
- [ ] **SC12.** The helper follows the engine conventions: pure export, thin CLI, `--json` with a
      `reason`, exit 2 on usage, no `process.exit` after an async write.

### Migration

- [ ] **SC13.** CHANGELOG `[Unreleased]` cites `(task 151)` and names the three observations.
- [ ] **SC14.** The implementation report records the three hand runs in § 8, with their outputs.
- [ ] **SC15.** Bundled copies in `skills/review-task/references/` and
      `skills/review-story/references/` are regenerated by `npm run bundle` and not hand-edited.

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **Step 3 numbering collides with tasks 129 and 145**
   - Risk: all three tasks append to the same numbered list. task.129's planned "check 9" already
     collides with the existing check 9. Merge order changes the numbers.
   - Probability: High · Impact: Low
   - Mitigation: the checks are named and cited by obs number, and the tests anchor on the citation.
     The later task renumbers on rebase.
2. **The invariant check runs code during a review**
   - Risk: a reviewer imports a function that has side effects (writes, network) in order to run a
     property.
   - Probability: Low · Impact: Medium
   - Mitigation: the check says _pure and local only_. If the function has side effects, the
     reviewer re-implements the two lines under test instead of importing it. Anything that needs a
     live service is **Optional**, recorded as "unverified — needs X".
3. **Headings are imperfect axes**
   - Risk: a consumer's coding-standards H2s are coarse ("Do not") or many.
   - Probability: Medium · Impact: Low
   - Mitigation: Agent B is told to pick the axes the document touches and to list them in
     `axes_checked`. A poor axis is then visible in the report, not silent. Headings are the
     structure the architecture-docs standard already requires
     (`docs/standards/architecture-docs.md`).

### Low Risk Areas

1. **No release tags in a consumer repository.** The check degrades to an Optional "state the
   baseline" finding. It never blocks.
2. **A path renamed since the tag.** The check tells the reviewer to find the path at the tag
   (`git log --follow`), and the document cites both the tag and that path.
3. **Section drift.** A renamed Step heading breaks the extractor. The floor makes that a red test.

### Open Questions (recorded, not asked; defaults taken)

1. **review-epic and review-prd.** Obs #161 lists both as needing the invariant rule.
   **Default: out of scope**, matching task.145's decision on the same two skills. Revisit when an
   epic or PRD states a function property.
2. **Is a missing `axes_checked` fatal?** **Default: fatal only for `aligned`**, which is treated as
   a failed agent and the pass runs inline. `drift` and `conflict` without it are accepted, because
   their findings already name the areas.
3. **Helper versus prose-only substitution.** Obs #130 would accept a prose instruction to "adapt
   the axes". **Default: the helper.** A prose instruction is the unenforced-convention shape that
   AGENTS.md § Stakeholder Summaries records drifting, and the helper is what makes SC1–SC3
   behavioural rather than source-text tests.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: the pre-pass fails on every review (for example, the helper exits non-zero on a
  normal layout), or the new checks produce false Critical findings on correct documents.
- **Steps**: revert the PR. The change is prose, one helper and two tests, with no stored state.
- **Validation**: `npm test` and `npm run bundle:check` are green on the reverted tree.

### Partial Rollback (1–2 hours)

- The phases are independent. Revert Phase 1 alone (helper, prompts and dispatch) if the pre-pass
  misbehaves, and keep Phases 2 and 3. Revert one sibling site if its wording misfires.

### Forward Fix

- Tighten the trigger wording at the site that misfires, and add the counter-example to the check's
  text.

### Rollback Triggers

- **Critical**: the pre-pass fails for every consumer, or a review blocks on a false Critical.
- **Non-critical**: noisy Optional or Important findings. Fix forward.

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                                                            | Author      |
| ---------- | ------- | -------------------------------------------------------------------------------------- | ----------- |
| 2026-09-24 | 1.0     | Initial draft — cut from observations #130, #161, #170 (2026-09-24 observation review) | create-task |
<!-- change-log-end -->

---

## Progress Tracking

- [ ] Phase 1: Stack-neutral pre-pass (obs #130)
- [ ] Phase 2: Invariant verification (obs #161)
- [ ] Phase 3: Released-shape diff (obs #170)
- [ ] Phase 4: Population test, bundle, docs

---

## References

- Observation #130: review-task pre-pass Agent B prompt is web-stack-specific
- Observation #161: review-task verifies that things exist, never that a claimed property holds
- Observation #170: legacy/compat handling scoped from the finding, not diffed against the released
  shape
- task.145 ([`task.145.review-outcome-reachability-check.md`](../task.145.review-outcome-reachability-check/task.145.review-outcome-reachability-check.md)):
  outcome reachability. Adjacent and out of scope (see § 3 boundary).
- task.129 ([`task.129.review-call-site-population-check.md`](../task.129.review-call-site-population-check/task.129.review-call-site-population-check.md)):
  call-site population. Adjacent and out of scope.
- task.141 as created, commit `cd0c9804`: the zero-padding sort claim
- task.143 as created, commit `82c61b33`: the one-field legacy handling. Release tag `v0.51.0`.
- `docs/standards/architecture-docs.md`: the required `concepts/` files the helper reads

---

## Notes

### Important Reminders

- QA artifacts land in this directory: `task.151.qa.{N}.review-verifies-claimed-properties.md`,
  `task.151.gate.{N}.review-verifies-claimed-properties.yml`, and bug reports
  `task.151.bug.{N}.{name}.md`.
- Edit the `shared/resources/` sources, never `skills/*/references/`. `npm run bundle` regenerates
  the copies and would revert a hand edit.
- When this task's PR merges, resolve observations #130, #161 and #170 with
  `set-status --status actioned`.
