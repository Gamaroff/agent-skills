---
id: task.89
title: "[Task 89] Lint for prose-matching assertions that claim a relationship but test only co-occurrence"
type: task
description: "Six times in one task, an assertion claimed a relationship — X routes to Y, X fires at Y, X owns Y — while testing only that both names appear somewhere in the haystack. Each passed on the exact regression it named, on six different surfaces, twice inside the fix for the previous instance. Add a lint that flags the shape so the seventh is caught by CI rather than by a reviewer."
tags: [evals, test-strength, lint, static-analysis]
category: infrastructure
status: ready-for-review
priority: High
risk_level: low
created: 2026-09-04
updated: 2026-09-04
assignee: Claude
estimated_effort_hours: 6
---

# Technical Task: Lint for prose-matching assertions that claim a relationship but test only co-occurrence

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.89.review.1.relationship-assertion-lint.md` implemented 2026-09-04

---

## 1. Overview

Task 77 produced **six instances of one bug class** across eleven independent gates. In each, a test
asserted a *relationship* — `REQUEST CHANGES` routes to `5b`, `ready-for-merge` fires at `5c`, this
row owns that action — while the assertion only established that both names occur in the same slice
of prose. Every one passed against the mutation it was written to catch.

They were found one at a time, by adversarial reviewers, over roughly a dozen review cycles. **Two of
the six were introduced by the fix for the previous instance.** The pattern is not carelessness; it
is what a regex over documentation looks like when the property under test is a mapping.

---

## 2. Motivation

### Current Problems

- **The class is not caught by anything.** A repo-wide search finds no lint, test or review checklist
  item that watches for it. It has been caught six times by human adversarial review and zero times by
  CI, which means the seventh is a coin-flip on reviewer attention.
- **The fix reintroduces the bug.** Instances 2 and 6 were each written *inside* the commit that closed
  the previous instance, in the same edit. Widening a regex is the natural fix and it is the defect.
- **It is invisible in the one place people look.** These assertions pass, and their failure messages
  claim the strong property — "must route back to 5b, not merely prose mentioning both". A reader
  auditing the suite sees a test that says it checks a mapping.
- **The blast radius grows with the corpus.** There are ~1742 `match`/`doesNotMatch`/`includes`
  assertions across 81 test files today. Every parity test written over prose is a candidate.

### Benefits

- The seventh instance is caught by `npm run ci` in seconds, not by a reviewer eleven gates in.
- The lint's suggested replacement teaches the mechanism that actually survived attack — parse the
  structure, key on the cell that carries the relationship — rather than "make the regex tighter".
- The false-positive triage in Phase 3 is itself an audit of the existing suite's strength.

---

## 3. Technical Background

### The six instances, as the corpus to test a lint against

Each row is pinned to the gate finding that named it and the commit that closed it, so every fixture is
reconstructible with `git show <sha> -- evals/shared/tests/pr-review-loop-parity.test.mjs`. The guard
family's full history is the twelve commits on that file
(`git log -- evals/shared/tests/pr-review-loop-parity.test.mjs`).

| # | Surface | The assertion | Why it passed the regression | Gate finding | Closed by |
| --- | --- | --- | --- | --- | --- |
| 1 | Resume sub-state table | `resume.includes(v)` over the whole file | The artifact-table sentences at `:82`/`:92` name every value in passing | CY8-5 (gate 8) | `87e5bf9` |
| 2 | Same, narrowed to the table | `subState.includes(v)` | `` `not reached` `` appears inside the `pending` row's own prose | CY9-3 (gate 9) | `8293765` |
| 3 | 5c verdict table | `/\|[^\|\n]*REQUEST CHANGES[^\|\n]*\|[^\|\n]*5b[^\|\n]*\|/` | The action cell contains "5b's step 7 increments it", so `5b` is present wherever the row routes | CY10-1 (gate 10) | `ef3a0c1` |
| 4 | Resume table, per-value | destination asserted for 4 of 5 values | The terminal `APPROVE`/`CONCERNS` exit arm was omitted while the comment claimed "each is asserted specifically" | CY11-1 (gate 11) | `18dd5b5` |
| 5 | `ready-for-merge` placement | `indexOf(stage) > indexOf("### 5c.")` | Ordering, not containment — satisfied by any position after 5c begins, including Loop Escalation | CY11-2 (gate 11) | `18dd5b5` |
| 6 | The fix for #5 | `/--stage ready-for-merge/` | A **prefix** of `--stage ready-for-merge-RELOCATED`, so a renamed call satisfied it | found inside #5's fix | `18dd5b5` |

Instance 6 is the sharpest: it appeared *inside the fix for instance 5*, in the same edit, and needed
a negative lookahead.

### Current architecture

`npm run ci` → `npm run ci:fast` (`prettier --check` + `npm test`) → `npm run eval:all`. `npm test`
already globs `'tests/*.test.js'`, so the repository's two existing repo-wide lints
(`tests/mutation-call-site-coverage.test.js`, `tests/executable-instructions.test.js`) run in CI purely
by living in that directory. There is no lint of any kind watching assertion strength.

### Target architecture

One new repo-wide lint at `tests/relationship-assertion-lint.test.js`, picked up by the existing glob
with **no `package.json` change**, over a pure analyser at `tests/lib/relationship-assertion-lint.js`.
The analyser is split out so the test can feed it fixture *source text* without executing it. It walks
the four test roots, parses each candidate assertion structurally, and fails with a message naming the
file, line, rule and the structural replacement to use. Historical fixtures live beside it under
`tests/fixtures/relationship-assertion/`.

> Placing it anywhere else would require adding a hand-maintained glob to `package.json` — the exact
> mechanism that once left 232 skill tests running nowhere.

---

## 4. Scope

In scope:

- A lint over `evals/**/*.test.mjs`, `tests/**/*.test.js`, `shared/resources/tests/*.test.mjs` and
  `skills/*/tests/*.test.js` that flags assertions matching the **shape**: a
  `match`/`includes`/`doesNotMatch` whose pattern contains two or more domain identifiers, or whose
  assertion *message* claims a relationship verb (routes, fires, owns, sits inside, points at, maps to,
  resumes at) while the pattern is a substring or co-occurrence test.
- A suggested-replacement note: parse the structure (table → rows → cells) and key on the cell that
  carries the relationship, which is the mechanism that survived attack in task 77.
- **Substring-prefix detection**: flag a bare `includes`/`match` on a token that is a prefix of
  another token appearing in the same corpus (instance 6).
- Validation against all six instances above, reconstructed from the commits in §3 as fixtures.

Out of scope:

- Rewriting existing assertions beyond what validation requires.
- Any change to pipeline behaviour.
- Any change to `package.json` — the lint's location is what wires it into CI.

---

## 5. Breaking Changes

None. The lint is additive: a new test file in an already-globbed directory. It changes no runtime
behaviour, no skill prose and no public interface. The only way it affects an existing workflow is by
failing CI on an assertion it flags — which is the point, and which Phase 3 drives to zero before
Phase 4 wires it in.

---

## 6. Implementation Plan

### Phase 1 — The detector (Risk: Low)

**Files**

- Add `tests/lib/relationship-assertion-lint.js` (the analyser)
- Add `tests/relationship-assertion-lint.test.js` (the guard)

**Changes**

- [x] Scan each file with a state machine that understands strings, template literals, regex literals
      and comments, then extract each assertion's top-level arguments. Structural, not line-oriented —
      a lint against co-occurrence matching must not itself be a co-occurrence match, and this
      repository's test files quote replaced assertions in comments constantly.
- [x] Rule A — **verb-without-mapping**: the message claims a relationship (`routes`, `fires at`,
      `owns`, `sits inside`, `points at`, `maps to`, `resumes at`, `must route`, `must exit`) and the
      pattern is a plain substring, or a regex joining two or more identifiers with a wildcard gap and
      no anchor.
- [x] Rule B — **prefix-satisfiable**: an unanchored plain literal ending on a renameable token
      (`--flag` or a kebab/snake identifier) with no boundary assertion, under a placement claim.
- [x] Rule C — **ordering-as-containment**: an `indexOf(a) > indexOf(b)` comparison whose message says
      "inside", "within" or "contained".
- [x] Rule D — **under-enumeration**: a non-vacuity guard promising `rows.length >= N` followed by an
      enumeration of `M < N` values keyed back into those rows.
- [x] Emit a failure per finding naming file:line, the rule, and the structural replacement.

> **Rule D was added during implementation and is not in the original filing.** Instance 4 is an
> *omission* (4 of 5 values enumerated), not a pattern shape, so rules A–C cannot reach it and success
> criterion 1 would have been unmeetable with three rules. Recorded rather than folded in silently.

**Dependencies**: none.

### Phase 2 — The historical fixture corpus (Risk: Low)

**Files**

- Add `tests/fixtures/relationship-assertion/instance-{1..6}.fixture.js`
- Add `tests/fixtures/relationship-assertion/survivor-{1,2}.fixture.js`

**Changes**

- [x] Reconstruct each of the six instances verbatim from the commit named in §3.
- [x] Reconstruct the two **negative controls**: the parsed-row keying in
      `pr-review-loop-parity.test.mjs` (rows split on `|`, keyed on the first cell), and
      `advance-pipeline-lock.test.sh`'s pattern of *running* the script and asserting the resulting step.
- [x] Assert the detector flags all six and neither survivor.

**Dependencies**: Phase 1.

### Phase 3 — False-positive triage against the live suite (Risk: Medium)

**Files**

- Modify `tests/relationship-assertion-lint.test.js` (rule narrowing)
- Add `tests/fixtures/relationship-assertion/README.md` (the measurement record)

**Changes**

- [x] Run the detector over the full current suite (measured: **2188 candidate assertions in 89 files**
      — the filing's ~1742/81 was a `grep -c` estimate that undercounted multi-line call sites).
- [x] Triage **every** flag: true positive (fix it), or false positive (narrow the rule, or suppress).
- [x] Record the final count and the reasoning in the README — measured, not assumed.
      **61 → 11 → 4 suppressed → 0 unsuppressed.**
- [x] An assertion that is genuinely fine but trips a rule gets an inline suppression comment carrying
      the reason; a bare suppression is not acceptable (mutation-proved).

**Dependencies**: Phase 2. **This phase gates Phase 4** — do not wire into CI while untriaged flags remain.

### Phase 4 — CI and documentation (Risk: Low)

**Files**

- Modify `shared/resources/mutation-proving.md`
- Modify `docs/development/project-completion-roadmap.md` (tick T89)

**Changes**

- [x] Confirm `npm run ci` picks the lint up via the existing `tests/*.test.js` glob — verify, don't assume.
- [x] Add a short section to `mutation-proving.md` naming this bug class and pointing at the lint
      (shape 6 of six), then `npm run bundle` so the 30-odd bundled copies do not drift.
- [x] `npm run ci` exits 0.

**Dependencies**: Phase 3.

---

## 7. Files Summary

**Add**

- `tests/lib/relationship-assertion-lint.js` — the pure analyser
- `tests/relationship-assertion-lint.test.js` — the guard
- `tests/fixtures/relationship-assertion/instance-{1..6}.fixture.js` — the six historical instances
- `tests/fixtures/relationship-assertion/survivor-{1,2}.fixture.js` — the two negative controls
- `tests/fixtures/relationship-assertion/README.md` — the false-positive measurement record

**Modify**

- `shared/resources/mutation-proving.md` — name the bug class as shape 6, point at the lint
- `docs/development/project-completion-roadmap.md` — tick T89
- `evals/shared/tests/pr-review-loop-parity.test.mjs` — 3 true positives fixed, 2 suppressions
- `evals/shared/tests/transition-protocol-parity.test.mjs` — 1 true positive fixed
- `evals/shared/tests/remaining-work-banner-parity.test.mjs` — 1 suppression
- `shared/resources/tests/setup-consumer-config.test.mjs` — 1 true positive fixed
- `shared/resources/tests/access-config-parity.test.mjs` — 1 suppression
- `skills/review-code/tests/review-code.test.js` — 1 true positive fixed
- `skills/*/references/mutation-proving.md` — bundled copies (`npm run bundle`)

**Delete**

- none

---

## 8. Testing Strategy

- **Positive fixtures (must flag)** — the six instances from §3, each reconstructed verbatim from its
  commit. A fixture that the detector does not flag is a detector bug, not a fixture bug.
- **Negative controls (must NOT flag)** — the parsed-row keying in `pr-review-loop-parity.test.mjs` and
  `advance-pipeline-lock.test.sh`. Gate 11 verified both are real mapping checks: the first parses rows
  and reads each destination off its own action cell; the second *runs* the script and asserts the
  resulting step. Flagging either would mean the lint punishes the mechanism it exists to recommend.
- **Rule-level unit tests** — one per rule (A verb-without-mapping, B prefix-satisfiable,
  C ordering-as-containment, D under-enumeration), each with a matched and an unmatched input, plus
  one asserting that assertions quoted inside comments and strings are not call sites.
- **Non-vacuity guard** — assert the fixture corpus parses to the expected count before asserting on it,
  the same guard `pr-review-loop-parity.test.mjs:168` uses. A corpus that silently parses to zero would
  make every assertion above pass while testing nothing — which is this task's own bug class.
- **Mutation proof** — for each of the three rules, revert the rule and confirm the corresponding
  fixtures go red. Per `shared/resources/mutation-proving.md`, record what the proof does *not* cover.
- **Full-suite run** — `npm run ci` exits 0.

---

## 9. Success Criteria

- [x] The lint flags all six historical instances, reconstructed as fixtures from the commits named in
      §3's table.
- [x] It does **not** flag the mechanisms that survived attack — the parsed-row keying in
      `pr-review-loop-parity.test.mjs`, and `advance-pipeline-lock.test.sh`, which gate 11 verified is a
      real mapping check because it *runs* the script and asserts the resulting step.
- [x] False-positive rate measured against the current suite (measured at **2188 candidate assertions
      across 89 files**) and **reported in `tests/fixtures/relationship-assertion/README.md`**, not
      assumed. Every flag on the current suite is triaged: fixed, filed, or suppressed with a written
      reason.
- [x] Each of the four rules is mutation-proved — reverting the rule turns its fixtures red (M1–M4),
      plus M5 (the live gate is live) and M6 (a bare suppression does not suppress).
- [x] Runs in `npm run ci` via the existing `tests/*.test.js` glob, with no `package.json` change.
- [x] `npm run ci` exits 0 — `ci:fast` 2311 tests / 2310 pass / 0 fail / 1 skipped, `eval:all` exit 0.

---

## 10. Risk Assessment

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **The lint is noisy and gets disabled.** Rule B in particular (prefix-satisfiable) will fire on ordinary correct assertions unless narrowed hard. `tests/mutation-call-site-coverage.test.js` states the rule in its own header: *"a guard that cries wolf gets disabled."* | Medium | High — a disabled lint is worse than no lint, because it looks like coverage | Phase 3 gates Phase 4: measure against the full suite and drive untriaged flags to zero **before** wiring into CI. Ship narrow; widening later is cheap, regaining trust is not. |
| R2 | **The lint has the bug it lints for.** A detector that greps for a verb near a pattern is itself a co-occurrence test. | Medium | Medium — self-defeating, and embarrassing in exactly this task | Rules parse the call site (pattern source and message as separate captured fields) rather than matching the raw line. The non-vacuity guard in §8 is the specific defence. |
| R3 | **Fixtures drift from history.** A reconstructed fixture that does not match what the commit actually contained validates nothing. | Low | Medium | Each fixture carries its commit SHA in a header comment; reconstruct with `git show`, do not retype from §3's table. |
| R4 | **CI time.** Walking 81 files on every push. | Low | Low | Pure file reads and regex; the comparable `mutation-call-site-coverage.test.js` walks a similar corpus in well under a second. Measure in Phase 4. |
| R5 | **Rule C is too narrow to be worth it.** Only one historical instance (5) exercises it. | Medium | Low | Acceptable — instance 5 is real and the rule is ~10 lines. If Phase 3 shows it firing on nothing else, keep it anyway as a regression pin. |

---

## 11. Rollback Plan

**Trigger**: the lint fails CI on assertions that are correct, and triage cannot narrow the rule within
the task's budget; or it materially slows CI.

**Procedure**

1. Delete `tests/relationship-assertion-lint.test.js`. The `tests/*.test.js` glob stops picking it up
   immediately — there is no registration to unwind and no `package.json` entry to revert.
2. Optionally keep `tests/fixtures/relationship-assertion/` — it is inert without the lint and is a
   useful record of the six instances either way.
3. Revert the `shared/resources/mutation-proving.md` paragraph and untick T89.

**Verification**: `npm run ci` exits 0. **Estimated time**: under 5 minutes. Nothing depends on the
lint, so rollback is a deletion rather than a migration.

---

## Dev Agent Record — QA Fix Cycle 1

**Finding closed**: CY1-1 (MEDIUM) — `regexCanStartAfter` rejected `>`, so a regex literal after `=>`
was scanned as code; a quote inside it opened a phantom string that, with an odd count, ran to end of
file and made every later assertion invisible to every rule.

**Fix (both halves — the second matters more)**

1. `tests/lib/relationship-assertion-lint.js` — added `>` and `<` to the value-position set, and a
   keyword arm (`return`, `typeof`, `case`, `throw`, `await`, `in`, `of`, …) so the rest of the class
   is closed too. `prevWord` tracking was added to distinguish `return /re/` from `median / 2`, and is
   cleared after a string or regex so it cannot go stale.
2. `tests/relationship-assertion-lint.test.js` — added a **reachability guard**: a bait assertion
   (a textbook rule-A defect) is appended to each probe and to **every file in the live corpus**, and
   must be found. Silent per-file blindness is now a named failure.

**A defect was found in the fix's own guard, by mutation-proving it.** The first version put all seven
value-position shapes in one probe file. The apostrophe in `return /it's/` was closed by the
apostrophe in a *later* line, re-syncing the mask — so reverting the keyword arm left the suite green
and that arm was unproven. That is instance 2 and instance 6 of this task's own corpus, one level
down, inside the fix for the finding. The shapes are now asserted **one at a time**, with the combined
probe kept as a separate interaction check.

**Mutation proofs added** (baseline 31 pass / 0 fail; each mutation confirmed applied via `diff`
before its result was read):

| # | Mutation | Result | Proves |
| - | --- | --- | --- |
| M11 | Revert the `>` addition | 26 / **5 fail** | `=>`, `>`, backtick and escaped-slash arms |
| M12 | Revert the keyword arm | 28 / **3 fail** | `return`, `typeof`, `case` arms |

**Files modified**

- `tests/lib/relationship-assertion-lint.js`
- `tests/relationship-assertion-lint.test.js`
- `tests/fixtures/relationship-assertion/scanner-hostile.probe.js` (added)

**Verification**: 31/31 lint tests; `npm run ci:fast` exit 0. Live corpus reachability: 0 blind of 89.

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-04
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report

- **Full Report**: [task.89.qa.1.relationship-assertion-lint.md](./task.89.qa.1.relationship-assertion-lint.md)
- **Gate File**: [task.89.gate.1.relationship-assertion-lint.yml](./task.89.gate.1.relationship-assertion-lint.yml)

### Test Coverage Summary

- **Tests Executed**: 22 (lint) / 2311 (full suite)
- **Phases Verified**: 4/4
- **Critical Issues**: 0 HIGH, 1 MEDIUM, 1 LOW
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: CONCERNS, Maintainability: PASS

### Key Findings

Every numeric claim re-derived independently and reproduced (89 files / 2188 call sites counted three
ways; 61 → 0 unsuppressed; all six mutation proofs re-run with the mutation confirmed applied first).
The suite is non-vacuous under an always-flagging analyser, a broken corpus walk, and a deleted
fixture. **CY1-1 (MEDIUM)**: `regexCanStartAfter` omits `>`, so a regex after `=>` is scanned as code
and an odd quote count inside it silently blinds the analyser to the rest of the file. 0 of 89 files
affected today, so no coverage is lost — but the failure is silent, which is the one mode this
deliverable cannot ship with.

---

## 12. References

- `evals/shared/tests/pr-review-loop-parity.test.mjs` — all six instances and their fixes
- `docs/tasks/task.77.review-pr-in-pipeline/task.77.gate.{10,11}.review-pr-in-pipeline.yml` — CY10-1 and
  CY11-1, the two found by adversarial mutation
- `docs/tasks/task.77.review-pr-in-pipeline/task.77.qa.11.review-pr-in-pipeline.md` — the 71-mutation table
- `shared/resources/mutation-proving.md`
- `tests/mutation-call-site-coverage.test.js` — the closest comparable repo-wide lint; its header states
  the narrow-scope rule this task inherits

---

## Progress Tracking

- [x] Phase 1 — detector implemented, **four** rules (D added; see the note in §6)
- [x] Phase 2 — six instance fixtures + two negative controls, all passing (22 tests, 0 fail)
- [x] Phase 3 — full-suite false-positive triage complete and recorded: 61 → 0 unsuppressed
- [x] Phase 4 — CI verified, `mutation-proving.md` updated (shape 6 of six) + bundled, `npm run ci` exit 0

---

## Change Log

| Date       | Version | Description                                                      | Author      |
| ---------- | ------- | ---------------------------------------------------------------- | ----------- |
| 2026-09-04 | 1.0     | Filed from task 77's retrospective — six instances of one bug class across eleven gates | create-task |
| 2026-09-04 | 1.1     | Review passed (9/10 post-fix) — added the 9 missing mandatory sections (Motivation, Technical Background, Breaking Changes, Implementation Plan, Files Summary, Testing Strategy, Risk Assessment, Rollback Plan, Progress Tracking); pinned each of the six instances to its gate finding and closing commit, which criterion 1 referenced but §2 did not carry; gave the false-positive criterion a denominator (1742 assertions / 81 files) and a reporting location; added `shared/resources/tests/` to the target globs; named the lint's path and its no-package.json-change CI wiring | review-task |
| 2026-09-04 |         | Status → ready-for-development                                    | review-task |
| 2026-09-04 |         | QA findings fixed — CY1-1 closed (scanner value positions + reachability guard), 1 iteration | qa-fix |
| 2026-09-04 |         | QA gate CONCERNS (90/100) — 1 MEDIUM (CY1-1, silent scanner desync), 1 LOW | qa-task |
| 2026-09-04 |         | Implemented: 4-rule lint + 8 fixtures; FP rate 61 → 0 unsuppressed over 2188 call sites; 6 live true positives fixed; 6 mutation proofs; status → ready-for-review | develop |
