---
id: task.79
title: "[Task 79] Write down the inputs that defeat each sink, once"
type: task
description: "Every security check in this repo generates its own candidate inputs from scratch, in prose, at the moment it runs. Ship the adversarial corpus as one source of truth — readable and machine-readable — so a probe tests the inputs that are known to defeat a sink rather than the ones an agent thought of."
tags: [security, corpus, probe, shared-resources]
category: infrastructure
status: ready-for-development
priority: High
risk_level: low
created: 2026-09-02
updated: 2026-09-02
assignee:
estimated_effort_hours: 5
---

# Technical Task: Write down the inputs that defeat each sink, once

**Status:** Ready for Development

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
2. **Knowledge found the hard way is not retained.** `bug.3` documented 14 fail-open inputs; `bug.6`
   documented 12 more. They live in `evals/shared/tests/snippet-classifier-fail-open-replay.test.mjs` as
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
✅ **`shared/resources/tests/security-corpus.test.mjs`** — schema, coverage floors, both-directions
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
- [ ] Define **sink**: a place where a value constructed from parts the code does not control is handed to
      a parser or interpreter that assigns it meaning — a URL parser, a SQL engine, a shell, a filesystem
      API, a template renderer
- [ ] State the **method ordering** once, strongest first: execute the property against a hostile input >
      read the dependency's own source for the condition that activates the control > mutate the control
      and re-run the tests > grep. Grep establishes presence, which is the thing that misleads
- [ ] Per sink, for each case: the input, **why it is dangerous**, and **what a correct implementation does
      to it**. The third is what makes the corpus usable as an oracle rather than a list

**Dependencies**: none

---

### Phase 2: The machine-readable module

**Risk Level**: Low

**Files**: `shared/resources/security-input-corpus.mjs` (new)

**Changes**:
- [ ] Export `SINKS` — `url-authority`, `sql-orm`, `shell-exec`, `path`, `template-render`
- [ ] Export `corpusFor(sink)` returning frozen cases; unknown sink throws rather than returning `[]`, so a
      typo cannot silently produce a zero-case probe
- [ ] Case shape: `{ id, sink, input, why, correct, direction }` where `direction` is `'hostile' |
      'legitimate'`
- [ ] Seed from evidence already in this repo and from the two measured defects:
      - `url-authority` — `evil.example.com/x` (host containing `/`; the port is **silently lost**),
        `db?sslmode=disable` (a query appended to what the author thought was a path segment), a
        base64-alphabet secret `a/b+c=d` (generated secrets routinely contain `/` and `+`), plus `@ : # [ ]`,
        a space, and the empty string
      - `shell-exec` — draw from `bug.3` and `bug.6`: `who'am'i`, `to"u"ch`, `g\h`, `echo pwned>/tmp/x`,
        `if touch /tmp/x; then`, `$( )`, backtick, `;`, newline
      - `path` — `../`, an absolute path, a symlink, a null byte
      - `sql-orm` — quote, comment introducer, `;`, a unicode homoglyph
      - `template-render` — `<script>`, `{{ }}`, `${ }`

**Dependencies**: Phase 1

---

### Phase 3: Hold the shape with tests

**Risk Level**: Low

**Files**: `shared/resources/tests/security-corpus.test.mjs` (new)

**Changes**:
- [ ] Every case satisfies the frozen shape; `why` and `correct` are non-empty strings
- [ ] **Every sink has at least one `legitimate` case** — the assertion that stops the corpus becoming a
      hostile-only list an over-strict implementation would pass
- [ ] Per-sink minimum case counts, so a sink cannot be added as an empty stub
- [ ] `corpusFor` on an unknown sink throws
- [ ] Ids are unique across the whole corpus
- [ ] **No `package.json` edit needed** — `shared/resources/tests/*.test.mjs` is already in the `test` glob.
      Confirm it actually ran in the gate log, which in this repo is distinct from being registered

**Dependencies**: Phase 2

---

### Phase 4: Fold the prompt's axes table into a reference

**Risk Level**: Low

**Files**: `shared/resources/finalise-dod-security-prompt.md`

**Changes**:
- [ ] Replace the restated axes table at `:110-118` with a reference to
      `shared/resources/security-input-corpus.md`, keeping the axes as a short summary and moving the
      inputs themselves to the corpus
- [ ] Preserve the accept-direction requirement at `:135-137` — it now names the corpus's `legitimate`
      cases rather than describing them
- [ ] Extend `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` to assert the prompt references the
      corpus and **does not restate** its inputs — the same non-restatement guard
      `qa-re-review-scope-parity.test.mjs` applies to the scoping rule
- [ ] `npm run bundle`

**Dependencies**: Phase 3

---

## 7. Files Summary

### Files to Create

1. `shared/resources/security-input-corpus.md`
2. `shared/resources/security-input-corpus.mjs`
3. `shared/resources/tests/security-corpus.test.mjs`

### Files to Modify

4. `shared/resources/finalise-dod-security-prompt.md`
5. `evals/shared/tests/finalise-dod-prompt-contract.test.mjs`
6. `CHANGELOG.md`

### Files Regenerated

7. `skills/finalise/references/*` — `npm run bundle` output

---

## 8. Testing Strategy

### Contract Tests

- [ ] Case shape frozen; `why` and `correct` present and non-empty
- [ ] Every sink carries at least one `legitimate` case
- [ ] Unknown sink throws
- [ ] The DoD prompt references the corpus and does not restate its inputs

**Command**: `node --test shared/resources/tests/security-corpus.test.mjs`

### Mutation Proving

- [ ] Delete every `legitimate` case from one sink → the both-directions test goes red
- [ ] Make `corpusFor` return `[]` for an unknown sink instead of throwing → that test goes red
- [ ] Re-add an input literal to the DoD prompt → the non-restatement guard goes red

Procedure: [`shared/resources/mutation-proving.md`](../../../shared/resources/mutation-proving.md).

---

## 9. Success Criteria

### Functional

- [ ] Five sinks defined, each with `hostile` **and** `legitimate` cases
- [ ] Every case states why it is dangerous and what a correct implementation does to it
- [ ] The corpus is importable and frozen; a typo'd sink throws rather than yielding zero cases
- [ ] The DoD security prompt references the corpus rather than restating candidate inputs

### Regression

- [ ] `finalise`'s returned `security_review` YAML shape is unchanged
- [ ] `npm run ci` green; the new suite confirmed to have **run**, not merely been registered

### Safety

- [ ] The corpus contains inputs only — no execution, no side effects on import
- [ ] Every hostile case names the sink it targets, so nothing is tested against the wrong parser

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

## Change Log

| Date       | Version | Description                                                                    | Author      |
| ---------- | ------- | ------------------------------------------------------------------------------ | ----------- |
| 2026-09-02 | 1.0     | Initial draft — filed from the rebirth-wallet security-review handover           | create-task |

---

## Progress Tracking

### Phase 1: Sink definition and prose
- [ ] Sink defined; method ordering stated once
- [ ] Per-sink entries with why + correct handling

### Phase 2: Machine-readable module
- [ ] `SINKS`, `corpusFor`, frozen case shape
- [ ] Seeded from bug.3, bug.6 and the two measured defects

### Phase 3: Tests
- [ ] Schema, coverage floors, both directions
- [ ] Confirmed to have run in the gate log

### Phase 4: Fold the prompt's table
- [ ] Reference replaces restatement
- [ ] Non-restatement guard added
- [ ] `npm run bundle`

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
