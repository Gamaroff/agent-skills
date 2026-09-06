---
id: task.79
title: "[Task 79] Write down the inputs that defeat each sink, once"
type: task
description: "Every security check in this repo generates its own candidate inputs from scratch, in prose, at the moment it runs. Ship the adversarial corpus as one source of truth — readable and machine-readable — so a probe tests the inputs that are known to defeat a sink rather than the ones an agent thought of."
tags: [security, corpus, probe, shared-resources]
category: infrastructure
status: ready-for-review
priority: High
risk_level: low
created: 2026-09-02
updated: 2026-09-06
assignee:
estimated_effort_hours: 5
---

# Technical Task: Write down the inputs that defeat each sink, once

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.79.review.1.security-input-corpus.md` implemented 2026-09-06

---

## 1. Overview

`shared/resources/finalise-dod-security-prompt.md` Step 4 asks the agent to generate candidate inputs
across five named axes — alternative spellings, position, composition, the unparseable case, flag forms —
and then execute them. That is the right method. But the candidates are re-invented on every run, from
prose, by whichever agent is holding the work item.

This task ships the corpus those candidates should come from: the inputs already known to defeat each
sink, stated once, in a readable document **and** a machine-readable module.

**Scope**: a new shared resource pair plus its schema test, and one edit folding the existing prompt's
hand-rolled axes table into a reference to it. No executor, no skill, no QA wiring.

---

## 2. Motivation

### Current Problems

1. **The candidate set is regenerated from prose every run.** Two runs of the same probe against the same
   boundary can test different inputs and reach different verdicts, and nothing records which inputs were
   tried. `probes_executed: 12` does not say *which* twelve.
2. **Knowledge found the hard way is not retained.** [`task.67.bug.3`](../task.67.execute-the-skill-qa-gate/task.67.bug.3.obfuscated-names-and-flag-writes.md)
   documented 14 fail-open inputs; [`bug.6`](../../bugs/bug.6.snippet-classifier-ten-more-fail-open-routes/bug.6.snippet-classifier-ten-more-fail-open-routes.md)
   documented 13 more, plus 2 over-refusals. They live in `evals/shared/tests/snippet-classifier-fail-open-replay.test.mjs` as
   a replay corpus for **one** classifier — correct for that test, but unavailable to any other probe.
3. **The negative direction is easy to forget.** A boundary that refuses everything passes any
   hostile-input-only corpus. `finalise-dod-security-prompt.md:135-137` already requires probing the
   legitimate direction; nothing makes that structural.
4. **There is no shared vocabulary for what a sink is.** "URL", "shell", "path" are used informally across
   the security prompt and the QA NFR criteria without a definition either can point at.

### Benefits

1. **A probe tests what is known to defeat the sink**, not what the agent recalled.
2. **The corpus is versioned and reviewable.** Adding a case is a diff, not a prompt edit.
3. **`legitimate` cases become structural**, so over-refusal is caught by construction rather than by an
   instruction the model may skip.
4. **It is the substrate both remaining paths need** — the engine (`task.80`) and the skill (`task.81`)
   consume it, and `finalise`'s existing probe mode gets it for free.

---

## 3. Technical Background

### Current architecture

`shared/resources/finalise-dod-security-prompt.md:110-118` holds a table of five candidate **axes**, and
instructs the agent to generate inputs along them per run. `shared/resources/qa-execute-snippets.mjs` has
its own hard-coded allow/deny lists, which are the *subject* of a corpus rather than a corpus themselves.
`evals/shared/tests/snippet-classifier-fail-open-replay.test.mjs:52-66` holds 14 verbatim hostile inputs
— the closest thing to a corpus that exists, and it is scoped to one classifier.

### Prior art in this repo

- **`task.73`** established that a security check must execute candidates rather than grep for controls,
  and defined the `boundary` gating rule and the `probes[]` / `probes_executed` envelope. This task
  supplies the inputs that method consumes.
- **`task.67`** established the pattern of stating a rule once in `shared/resources/` and referencing it
  from every consumer (`qa-runnable-prose-detection.md` beside `qa-execute-snippets.mjs`).
- **`task.74`** found a *third* stale copy of a scoping rule at its DoD gate. Folding the axes table into
  a reference (Phase 4) is what stops this becoming a third copy of the candidate knowledge.

### Target architecture

Two paired files in `shared/resources/`, following the existing prose-beside-mechanism convention: a
document that argues and defines, and a module that the engine can import.

### Important clarifications

- **This is a bounded corpus, not a fuzzer.** `task.73` put "property-based testing or fuzzing
  infrastructure" explicitly out of scope and that holds here.
- **The corpus does not decide verdicts.** It supplies inputs and their expected handling; the engine
  (`task.80`) computes verdicts.

---

## 4. Scope

### In Scope

✅ **`shared/resources/security-input-corpus.md`** — what a sink is; per-sink entries; the method ordering
✅ **`shared/resources/security-input-corpus.mjs`** — `SINKS`, `corpusFor(sink)`, a frozen case shape
✅ **Both directions per sink** — `hostile` and `legitimate`, the latter required
✅ **`shared/resources/tests/security-input-corpus.test.mjs`** — schema, coverage floors, both-directions
✅ **Folding `finalise-dod-security-prompt.md`'s axes table into a reference**

### Out of Scope

❌ **Any executor** — that is `task.80`
❌ **Any skill** — that is `task.81`
❌ **Touching `qa-execute-snippets.mjs`** — its allow-list is a different concern, and `task.80` owns it
❌ **QA wiring or gate-schema change** — that is `task.82`
❌ **Fuzzing or generated inputs** — a bounded, named set

---

## 5. Breaking Changes

None. Two new files plus one prompt edit that replaces a restated table with a reference to the same
content. The DoD security agent's returned YAML shape is unchanged.

---

## 6. Implementation Plan

### Phase 1: Define what a sink is, and write the prose

**Risk Level**: Low

**Files**: `shared/resources/security-input-corpus.md` (new)

**Changes**:
- [x] Define **sink**: a place where a value constructed from parts the code does not control is handed to
      a parser or interpreter that assigns it meaning — a URL parser, a SQL engine, a shell, a filesystem
      API, a template renderer
- [x] State the **method ordering** once, strongest first: execute the property against a hostile input >
      read the dependency's own source for the condition that activates the control > mutate the control
      and re-run the tests > grep. Grep establishes presence, which is the thing that misleads
- [x] Per sink, for each case: the input, **why it is dangerous**, and **what a correct implementation does
      to it**. The third is what makes the corpus usable as an oracle rather than a list

**Dependencies**: none

---

### Phase 2: The machine-readable module

**Risk Level**: Low

**Files**: `shared/resources/security-input-corpus.mjs` (new)

**Changes**:
- [x] Export `SINKS` — `url-authority`, `sql-orm`, `shell-exec`, `path`, `template-render`
- [x] Export `corpusFor(sink)` returning frozen cases; unknown sink throws rather than returning `[]`, so a
      typo cannot silently produce a zero-case probe
- [x] Case shape: `{ id, sink, input, why, correct, direction }` where `direction` is `'hostile' |
      'legitimate'`
- [x] Seed from evidence already in this repo and from the two measured defects:
      - `url-authority` — `evil.example.com/x` (host containing `/`; the port is **silently lost**),
        `db?sslmode=disable` (a query appended to what the author thought was a path segment), a
        base64-alphabet secret `a/b+c=d` (generated secrets routinely contain `/` and `+`), plus `@ : # [ ]`,
        a space, and the empty string
      - `shell-exec` — draw from `task.67.bug.3` (14 routes, verbatim at
        `evals/shared/tests/snippet-classifier-fail-open-replay.test.mjs:52-65`) and `bug.6` (13 routes):
        `who'am'i`, `to"u"ch`, `g\h`, `echo pwned>/tmp/x`, `if touch /tmp/x; then`, `$( )`, backtick,
        `;`, newline. **`bug.6`'s 2 over-refusals seed the `legitimate` direction** — measured accept
        cases rather than invented ones
      - `path` — `../`, an absolute path, a symlink, a null byte
      - `sql-orm` — quote, comment introducer, `;`, a unicode homoglyph
      - `template-render` — `<script>`, `{{ }}`, `${ }`

- [x] **Prettier covers this file.** `.prettierignore` excludes `*.md`, `*.yml`, `*.json` and
      `skills/*/references/`, but **not** `shared/resources/*.mjs`, and `npm run ci:fast` runs
      `prettier --check .` before the tests. Satisfy `printWidth: 80`, `singleQuote: false`,
      `semi: true`, `trailingComma: "all"`

**Dependencies**: Phase 1

---

### Phase 3: Hold the shape with tests

**Risk Level**: Low

**Files**: `shared/resources/tests/security-input-corpus.test.mjs` (new)

**Changes**:
- [x] Every case satisfies the frozen shape; `why` and `correct` are non-empty strings
- [x] **Every sink has at least one `legitimate` case** — the assertion that stops the corpus becoming a
      hostile-only list an over-strict implementation would pass
- [x] Per-sink minimum case counts, so a sink cannot be added as an empty stub
- [x] `corpusFor` on an unknown sink throws
- [x] Ids are unique across the whole corpus
- [x] **No `package.json` edit needed** — `shared/resources/tests/*.test.mjs` is already in the `test` glob.
      Confirm it actually ran in the gate log, which in this repo is distinct from being registered

**Dependencies**: Phase 2

---

### Phase 4: Fold the prompt's axes table into a reference

**Risk Level**: Low

**Files**: `shared/resources/finalise-dod-security-prompt.md`

**Changes**:
- [x] Replace the restated axes table at `:110-118` with a reference to
      `shared/resources/security-input-corpus.md`, keeping the axes as a short summary and moving the
      inputs themselves to the corpus
- [x] **All five axis names must survive the edit.**
      `evals/shared/tests/finalise-dod-prompt-contract.test.mjs:126-140` already asserts each of
      `Alternative spellings`, `Position`, `Composition`, `The unparseable case` and `Flag forms` is
      present in the prompt source. The summary that replaces the table keeps them; dropping them turns
      an existing guard red for a reason this task never asked for
- [x] Preserve the accept-direction requirement at `:135-137` — it now names the corpus's `legitimate`
      cases rather than describing them
- [x] Extend `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` to assert the prompt references the
      corpus and **does not restate** its inputs — the same non-restatement guard
      `qa-re-review-scope-parity.test.mjs` applies to the scoping rule
- [x] `npm run bundle` — the bundler walks shared references **transitively**
      (`skills/create-skill/scripts/bundle_skill.py:135`), so linking the corpus from the prompt copies
      `security-input-corpus.md` into `skills/finalise/references/`. Commit the regenerated files;
      `validate.yml` gates bundle freshness
- [x] `CHANGELOG.md` — add the entry for this change

**Dependencies**: Phase 3

---

## 7. Files Summary

### Files to Create

1. `shared/resources/security-input-corpus.md`
2. `shared/resources/security-input-corpus.mjs`
3. `shared/resources/tests/security-input-corpus.test.mjs`

### Files to Modify

4. `shared/resources/finalise-dod-security-prompt.md`
5. `evals/shared/tests/finalise-dod-prompt-contract.test.mjs`
6. `CHANGELOG.md`

### Files Regenerated

7. `skills/finalise/references/finalise-dod-security-prompt.md` — `npm run bundle` output
8. `skills/finalise/references/security-input-corpus.md` — pulled in transitively once the prompt
   references it (`bundle_skill.py` walks shared refs recursively). `skills/finalise` is the **only**
   skill referencing the prompt, so no other skill directory changes
9. `skills/finalise/references/security-input-corpus.mjs` — the corpus doc links its machine-readable
   peer, so the bundler copies that too
10. `skills/finalise/references/mutation-proving.md` — a second transitive hop: the corpus doc links
    it from the method-ordering section. Confirmed by running the bundler, not predicted

---

## 8. Testing Strategy

### Contract Tests

- [x] Case shape frozen; `why` and `correct` present and non-empty
- [x] Every sink carries at least one `legitimate` case
- [x] Unknown sink throws
- [x] The DoD prompt references the corpus and does not restate its inputs

**Command**: `node --test shared/resources/tests/security-input-corpus.test.mjs`

### Mutation Proving

- [x] Delete every `legitimate` case from one sink → the both-directions test goes red
- [x] Make `corpusFor` return `[]` for an unknown sink instead of throwing → that test goes red
- [x] Re-add an input literal to the DoD prompt → the non-restatement guard goes red

Procedure: [`shared/resources/mutation-proving.md`](../../../shared/resources/mutation-proving.md).

---

## 9. Success Criteria

### Functional

- [x] Five sinks defined, each with `hostile` **and** `legitimate` cases
- [x] Every case states why it is dangerous and what a correct implementation does to it
- [x] The corpus is importable and frozen; a typo'd sink throws rather than yielding zero cases
- [x] The DoD security prompt references the corpus rather than restating candidate inputs

### Regression

- [x] `finalise`'s returned `security_review` YAML shape is unchanged
- [x] `npm run ci` green; the new suite confirmed to have **run**, not merely been registered

### Safety

- [x] The corpus contains inputs only — no execution, no side effects on import
- [x] Every hostile case names the sink it targets, so nothing is tested against the wrong parser

---

## 10. Risk Assessment

### Medium Risk Areas

**1. The corpus becomes a third copy of knowledge rather than the single one**

- **Risk**: the DoD prompt keeps its table "for convenience" and the two drift.
- **Impact**: Moderate — exactly the failure `task.74` found at its own DoD gate.
- **Mitigation**: Phase 4 is not optional, and the non-restatement guard is a test.

### Low Risk Areas

**1. Sink taxonomy is wrong or incomplete**

- **Risk**: five sinks is a judgement; a sixth will be wanted.
- **Mitigation**: additive by construction — a new sink is a new key plus cases. Nothing depends on the
  set being closed.

---

## 11. Rollback Plan

### Immediate Rollback (< 30 minutes)

**Triggers**: the corpus proves unusable by the engine designed in `task.80`.

**Steps**: revert the `finalise-dod-security-prompt.md` edit so the axes table is restored inline; the two
new files become inert and can be deleted. No consumer depends on them until `task.80`.

**Verification**: `node --test evals/shared/tests/finalise-dod-prompt-contract.test.mjs` green against the
restored table.

---

<!--
  Append-only. Newest row LAST. Four columns, exactly as below.
-->

## QA Testing Results

**QA Status**: FAIL
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-06
**Quality Score**: 80/100
**Gate Decision**: FAIL

### QA Report

- **Full Report**: [task.79.qa.1.security-input-corpus.md](./task.79.qa.1.security-input-corpus.md)
- **Gate File**: [task.79.gate.1.security-input-corpus.yml](./task.79.gate.1.security-input-corpus.yml)

### Test Coverage Summary

- **Tests Executed**: 2530 (2529 pass, 0 fail, 1 skipped) + `eval:all` exit 0
- **Phases Verified**: 4/4 completed, 2/4 with issues
- **Critical Issues**: 1 HIGH, 7 MEDIUM, 2 LOW promoted to the gate; 6 further advisory
- **NFR Status**: Security: CONCERNS, Performance: PASS, Reliability: PASS, Maintainability: CONCERNS

### Key Findings

Every success criterion verifies under execution and CI is green on the head commit. The gate fails
on one finding: **the non-restatement guard — the single mechanism Phase 4 exists to install — does
not detect the restatement it is named for.** Run against `origin/develop`'s prompt, the axis table
this change deletes, it reports zero findings and passes; the restatement that actually existed was
fragmentary (`g\h`, `-o`, `--output`, `a; b`), and the guard requires whole-input containment.
Seven medium issues follow: three `url-authority` `why` fields the WHATWG parser falsifies, a
documented import that throws `ERR_MODULE_NOT_FOUND`, two broken links in the bundled copy, no
parity test for the three transitively-bundled artefacts, and no assertion for the Safety criterion.

### Fix Cycle 1 — 2026-09-06

**Status**: ✅ Fixes complete — ready for QA re-review

All 10 promoted gate issues addressed, plus 6 advisory cleanups taken while in the same code.

**Files modified**

- `shared/resources/security-input-corpus.mjs` — six `why` fields corrected (CR-2/3/4/5 plus `fragment-delimiter` and `base64-secret-in-userinfo`, found by QA's own fact-check and of the same class); `allCases()` memoised (CR-16); **`renderInput` / `renderRow` / `renderCorpusTables` exported** so the document and its parity test share one renderer (CR-15).
- `shared/resources/security-input-corpus.md` — case tables **regenerated from `renderCorpusTables()`**, so inputs now render literally (`t\ouch`, `to"u"ch`, `safe.txt␀.png`) instead of JSON-escaped (CR-12); depth-sensitive `../../docs` links removed so the bundled copy has no broken links (CR-7); import example made resolvable with the temp-dir form shown (CR-6); a control-character legend and the regeneration command added.
- `shared/resources/finalise-dod-security-prompt.md` — import example replaced with an absolute `pathToFileURL(join(repoRoot, …))` form, because step 3 runs the script from a temp directory where no relative or bare specifier resolves (CR-6).
- `shared/resources/tests/security-input-corpus.test.mjs` — **purity assertions added** (source-level: no import, no side-effecting builtin outside string literals; observable: no exit listener, cwd or argv change on import) closing the unasserted Safety criterion (TASK79-001); parity rewritten against `renderCorpusTables()` and sliced by sink and direction (CR-9/10/12/15); vacuous `allCases` coverage test replaced with a FLOORS-independent assertion plus a memoisation check (CR-13/16); the shell shrink-guard removed as a restatement of FLOORS (CR-14).
- `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` — **the non-restatement guard rebuilt** (CR-1); bundled-copy marker check replaced with **byte parity across all four transitively-bundled references** (CR-8).

**The load-bearing fix.** The old guard asked whether a whole corpus input appeared in the prompt. Real restatement is fragmentary — the deleted axis table carried `cu'r'l`, `g\h` and `--output`, each a *piece* of an input — so it reported zero on the exact document it was named for. The detector now works on distinctive inline code spans (metacharacter-bearing or flag-shaped, ≥3 chars) that share text with a corpus input, and **the deleted axis table is kept as a fixture the detector must flag**. That second test is what makes the guard's power falsifiable: a future simplification back to uselessness turns it red instead of passing quietly. The `length >= 8` heuristic is gone, replaced by an explicit, reviewable `PROMPT_MAY_MENTION` allow-list (CR-11).

**Mutation proofs (all held)** — each with a pre-mutation `diff` confirming the edit landed:

| Mutation | Target assertion | Result |
|---|---|---|
| Revert the detector to whole-input equality (the old, vacuous rule) | `the non-restatement detector can see the restatement it is named for` | **RED** |
| Add `import { execSync } from "node:child_process"` to the module | `the module imports nothing and has no side-effecting builtin` | **RED** |
| Move a `legitimate` row into the `hostile` table in the doc | `the prose peer contains the generated tables verbatim` + `every case appears in the document, under its own sink and direction` | **RED** (both) |
| Edit a source without re-bundling | `every transitively-bundled reference is byte-identical to its source` | **RED** — observed live before the bundle ran |

**Verification**: `npm run ci:fast` exit 0 — 2533 tests, **2532 pass, 0 fail**, 1 skipped. Prettier clean, bundle idempotent.

---

## Change Log

| Date       | Version | Description                                                                    | Author      |
| ---------- | ------- | ------------------------------------------------------------------------------ | ----------- |
| 2026-09-02 | 1.0     | Initial draft — filed from the rebirth-wallet security-review handover           | create-task |
| 2026-09-06 | 1.1     | Review passed (8/10, READY TO IMPLEMENT) — 0 critical, 6 important fixed: `bug.3` requalified as `task.67.bug.3`, bug.6 count corrected to 13 + 2 over-refusals, Phase 4's pre-existing five-axis assertion declared, test renamed to `security-input-corpus.test.mjs`, transitive bundle output named, `CHANGELOG.md` assigned to Phase 4 | review-task |
| 2026-09-06 |         | Implemented — 3 files added, 3 modified, 6 regenerated; 73 corpus cases across 5 sinks; 19 new tests; 3 mutation proofs held | develop |
| 2026-09-06 |         | QA gate FAIL (80/100) — 10 findings promoted (1 high, 7 medium, 2 low): non-restatement guard vacuous, three url-authority `why` fields falsified by the reference parser, unresolvable documented import | qa-task |
| 2026-09-06 |         | QA findings fixed — 10 promoted issues closed in 1 iteration: non-restatement guard rebuilt on fragments with a must-fail fixture, six url-authority `why` fields corrected against the reference parser, import examples made resolvable, bundled-copy links de-pathed, byte-parity added for all 4 transitively-bundled refs, purity assertion added; 6 advisory cleanups also taken | qa-fix |

---

## Progress Tracking

### Phase 1: Sink definition and prose
- [x] Sink defined; method ordering stated once
- [x] Per-sink entries with why + correct handling

### Phase 2: Machine-readable module
- [x] `SINKS`, `corpusFor`, frozen case shape
- [x] Seeded from bug.3, bug.6 and the two measured defects

### Phase 3: Tests
- [x] Schema, coverage floors, both directions
- [x] Confirmed to have run in the gate log

### Phase 4: Fold the prompt's table
- [x] Reference replaces restatement; all five axis names kept
- [x] Non-restatement guard added
- [x] `npm run bundle` + regenerated `skills/finalise/references/` committed
- [x] `CHANGELOG.md` entry added

---

## References

- **The method this corpus feeds**: `shared/resources/finalise-dod-security-prompt.md` Step 4 (task.73)
- **Prose-beside-mechanism precedent**: `shared/resources/qa-runnable-prose-detection.md`
- **Existing hostile inputs to seed from**: `evals/shared/tests/snippet-classifier-fail-open-replay.test.mjs:52-66`,
  [`bug.6`](../../bugs/bug.6.snippet-classifier-ten-more-fail-open-routes/bug.6.snippet-classifier-ten-more-fail-open-routes.md)
- **Non-restatement guard precedent**: `evals/shared/tests/qa-re-review-scope-parity.test.mjs` (task.74)
- **Consumers**: `task.80` (engine), `task.81` (skill)

---

## Notes

### Why the `correct` field matters more than it looks

A list of hostile inputs tells a probe what to try. It does not tell it what a *pass* looks like. Recording
what a correct implementation does to each input is what lets the engine compute a verdict instead of
asking an agent to judge one — which is the whole difference this series is about.

### Why `legitimate` cases are required rather than encouraged

An implementation that refuses every input passes a hostile-only corpus perfectly. The DoD prompt already
asks for the accept direction in prose; making it a schema requirement is the difference between an
instruction and a guarantee.
