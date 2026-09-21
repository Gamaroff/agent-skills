---
id: task.131
title: "[Task 131] A structural validator of a pipeline-authored artefact fires the boundary rule and no corpus sink can probe it: a markdown-structure sink with a --args entry form, and an explicit internal-artefact decision the security agent records instead of failing on the zero-guard"
type: task
description: "On task.124 the finalise security agent classed report-lint.js#lintReport a boundary, found no sink in security-input-corpus.mjs for a Markdown-structure validator, could not import a two-argument entry, and returned FAIL on the zero-guard — a verdict the operator then had to overrule by hand. Add a markdown-structure sink (hostile + legitimate report shapes), let the probe engine bind a fixed second argument, and make the rule name the outcome it reached."
tags: [security-probe, finalise, corpus, report-lint]
category: infrastructure
status: planned
priority: Medium
created: 2026-09-20
updated: 2026-09-20
assignee:
estimated_effort_hours: 4
risk_level: low
github_issue: 438
---

# Technical Task: A markdown-structure sink and an internal-artefact decision for the security probe

**Status:** Planned
**GitHub Issue**: [#438](https://github.com/Gamaroff/agent-skills/issues/438)

---

## 1. Overview

The finalise DoD security agent applies `probe-boundary-rule.md` § Step 1b: an exported verdict predicate fires probe mode, and a boundary with `probes_executed: 0` is a FAIL. On task.124 that rule met `report-lint.js#lintReport` — a validator of the pipeline's own implementation report — and had no way to run: no sink in `security-input-corpus.mjs` models Markdown structure, and the entry takes `(text, { sections })`, which `security-probe.mjs` (one-argument calls) records as `unverifiable`. The agent did the honest thing and failed; the operator overruled it by hand (task.124 DoD § Step 5). This task gives the rule a way to run and a way to say "internal artefact, not probeable by this engine" that is a recorded decision rather than a FAIL to be overruled.

**Scope**: `shared/resources/security-input-corpus.{mjs,md}` (new sink), `shared/resources/security-probe.mjs` (`--args-json` fixed extra arguments), `shared/resources/probe-boundary-rule.md` and `finalise-dod-security-prompt.md` (the internal-artefact decision), `qa-task`/`qa-story` Step 3b (same wording), tests.

**Key deliverables**: (1) `markdown-structure` sink — hostile cases are the corrupt shapes `report-lint.test.mjs` already pins (duplicated header block, spliced H1, trailing duplicate body, out-of-order section) plus new ones (fence-swallowed heading, CRLF, a `## Change Log` inside a fence); legitimate cases are the green fixtures; (2) `--args-json '[{"sections":[…]}]'` on the engine so a `(text, opts)` predicate is probeable; (3) a third `boundary` value — `internal` — for a validator whose only input is an artefact the pipeline writes, rendered as an explicit skip with a reason, never as the zero-guard FAIL.

**Expected outcome**: `lintReport` probed by execution on the next finalise that touches it; a validator that genuinely has no sink is recorded as `boundary: internal` with the reason, and the operator decision task.124 needed becomes a rule.

---

## 2. Motivation

### Current Problems

- **The zero-guard has no third outcome.** `finalise-dod-security-prompt.md` renders `boundary: true` + `probes_executed: 0` as `probe mode executed no candidates` FAIL. That is right for a boundary the engine *could* have probed; it is wrong for one it structurally cannot, and the prompt's own summary on task.124 said so ("a human should either accept the NOT-probeable classification … or add a sink"). A rule that ends in "a human should decide" every time it meets this shape is a rule with a missing branch.
- **No sink models a document validator.** `SINKS` is `url-authority | sql-orm | shell-exec | path | template-render` — all "where does untrusted input go". A structural linter's input is a document; its hostile cases are malformed documents, and `report-lint.test.mjs` already holds four of them as fixtures the corpus does not know about.
- **The engine calls with one argument.** `lintReport(text, opts)` requires `opts.sections`; the engine records `entry-not-probeable`/`unverifiable`, `executed: 0`. Any predicate with a configuration argument is unreachable, which is most validators in this repository (`checkCardSections`, `lintReport`).
- **Six QA gates and one DoD each re-derived the same reasoning** ("no corpus sink fits a Markdown validator → reasoned") — the same paragraph, seven times, with no mechanism behind it.

### Benefits

- One more class of deliverable probed by execution instead of inspection.
- Two-argument predicates become probeable without a hand-written harness (which the prompt forbids for good reason).
- The "internal artefact" case is a recorded classification with a stated reason, auditable in the DoD, not an operator override.
- Task.128 (shell entry form) and this task together cover the two shapes the engine declined on tasks 121 and 124.

---

## 3. Technical Background

### Current Architecture

**Components**:

- `shared/resources/security-input-corpus.mjs` — `SINKS` (five), `DIRECTIONS` (`hostile`, `legitimate`), `sinkCases(sink, cases)`, `corpusFor(sink)` which throws on an unknown sink (`unknown-sink` decline). Every sink carries both directions; a schema test enforces it.
- `shared/resources/security-probe.mjs` — `--sink --entry path#export --repo-root --record`; imports the entry in a sandboxed child and calls `fn(candidate.input)`; `verdict: unverifiable` with `executed: 0` when the export needs more than one argument or will not import (probe-boundary-rule § 4).
- `shared/resources/probe-boundary-rule.md` — § Step 1b signals (exported verdict predicate; allow/deny list; "X is refused" tests; SC with *never/must not/refused*); the explicit negative case ("a report writer, a formatter … are not boundaries"); § 4 `declined` is its own state.
- `shared/resources/finalise-dod-security-prompt.md` — `boundary: true|false`, `probes_executed`, `probes[]`; the zero-guard FAIL; the rendering in `finalise/SKILL.md` Step 3d (three absences are three things).
- `shared/resources/report-lint.js` — `lintReport(text, { sections })` → `{ ok, variant, problems }`; fixtures under `shared/resources/tests/fixtures/report-lint/` (`corrupt-task117.md`, green task.118/119/121/122/123).
- Task.128 (planned) adds a `filename` sink and a `shell:` entry form — orthogonal.

### Target Architecture

**Components**:

- `SINKS` gains `markdown-structure`. Cases: hostile — `duplicated-header-block`, `spliced-h1`, `trailing-duplicate-body`, `section-out-of-order` (lifted from the report-lint fixtures by reference, not copied), `heading-inside-fence`, `crlf-line-endings`, `change-log-inside-fence`, `empty-document`; legitimate — the five green report fixtures (by path) and a minimal valid task report. `security-input-corpus.md` gains the sink's paragraph: what it models (a document consumed by a decision), why "refuse everything" is also a defect here.
- `security-probe.mjs` gains `--args-json <json-array>`: extra positional arguments appended after the candidate on every call (`fn(input, ...extra)`). Recorded in the run record as `args`. Without it, behaviour is unchanged; with it, a `(text, opts)` predicate is probeable. `unverifiable` remains the verdict when the export still throws on arity.
- `probe-boundary-rule.md` § Step 1b gains a third decision: **`boundary: internal`** — the predicate's only input is an artefact this repository's own pipeline writes (implementation report, DoD summary, gate) *and* no sink models its shape. Recorded with a `reason`; rendered by finalise as an explicit skip line ("internal artefact — `<reason>`; not the zero-guard"), never as FAIL, never as `false`. Once a sink exists for the shape, `internal` is no longer available for it — the rule says which sinks disqualify it.
- `finalise-dod-security-prompt.md` output schema: `boundary: true | false | internal`; `internal` requires `internal_reason`. `finalise/SKILL.md` Step 3d renders the three cases; the "three absences" note becomes four.
- `qa-task`/`qa-story` Step 3b: same vocabulary in the `## Code Review` boundary line.

### Important Clarifications

- **`internal` is not a loophole for the zero-guard.** It is available only when *no* sink models the input shape — and this task adds the sink for Markdown structure, so `lintReport` itself becomes `true` + probed, not `internal`. The class exists for the next validator, and its reason is recorded.
- **The engine's arity constraint is kept as a verdict**, not loosened: `--args-json` binds *fixed* extra arguments the caller states; the engine never guesses them.
- **Corpus cases reference the report-lint fixtures by path**, not by copy — one definition of "a corrupt report" (`report-lint.test.mjs` already owns it).

---

## 4. Scope

### In Scope

✅ `markdown-structure` sink in `security-input-corpus.{mjs,md}`; schema test extended.
✅ `--args-json` on `security-probe.mjs`; recorded in the run record; test.
✅ `boundary: internal` + `internal_reason` in `probe-boundary-rule.md`, `finalise-dod-security-prompt.md`, `finalise/SKILL.md` Step 3d rendering, `qa-task`/`qa-story` Step 3b.
✅ An engine test running `lintReport` through the new sink with `--args-json` (green fixture accepted, corrupt fixture refused; a mutant `lintReport` that accepts a duplicated header block → `reproduced`).
✅ `npm run bundle`; CHANGELOG.

### Out of Scope

❌ Task.128's `filename` sink and `shell:` entry form (independent; both touch `SINKS` — land 128 first or rebase).
❌ Retro-fitting task.124's DoD — the operator decision stands as recorded.
❌ Probing predicates that need a live object (a `git` repo, a network) as their second argument.

---

## 5. Breaking Changes

### Breaking Change 1: `boundary` is a three-valued field

**What Changed**: `finalise-dod-security-prompt.md` may return `boundary: internal`.

**Before**: `true | false`; a missing value renders "no boundary decision".

**After**: `true | false | internal`; `internal` requires `internal_reason` and renders as an explicit skip.

**Impact**: `finalise/SKILL.md` Step 3d rendering and any consumer that switches on the boolean (`review-security`'s liftable block; check with `grep -rn 'boundary:' shared/resources skills/*/SKILL.md`).

**Migration Path**: consumers treat an unknown value as "not answered" (the existing three-absences rule) until updated; this task updates every consumer it can enumerate and adds a test that the enumeration is the grep above.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.131.plan.markdown-structure-sink-internal-validator-class.md](task.131.plan.markdown-structure-sink-internal-validator-class.md)

### Phase 1: the sink

**Risk Level**: Low

**Files**: `shared/resources/security-input-corpus.mjs`, `security-input-corpus.md`, its schema test.

**Changes**:
- [ ] Add `markdown-structure` to `SINKS` with both directions
- [ ] Hostile cases: four by fixture path + four new inline shapes; legitimate: five fixtures by path + one minimal
- [ ] Prose paragraph in the `.md` peer; schema test green

**Dependencies**: none (rebase over task.128 if it lands first)

### Phase 2: fixed extra arguments on the engine

**Risk Level**: Low

**Files**: `shared/resources/security-probe.mjs` + its test.

**Changes**:
- [ ] `--args-json` parsed once, validated as a JSON array, passed to the child, appended on every call
- [ ] Recorded in the run record (`args`); `unverifiable` unchanged when arity still fails
- [ ] Test: `lintReport` with `--args-json '[{"sections":[…]}]'` → executed > 0; corrupt fixture refused; green accepted; a mutant that drops the duplicate-header check → reproduced

**Dependencies**: Phase 1

### Phase 3: the `internal` decision

**Risk Level**: Medium

**Files**: `probe-boundary-rule.md`, `finalise-dod-security-prompt.md`, `skills/finalise/SKILL.md` Step 3d, `qa-task`/`qa-story` SKILL.md Step 3b, `docs/reference/anti-patterns.md` (a paragraph: a rule that ends in "a human decides" on a recurring shape is a rule with a missing branch).

**Changes**:
- [ ] Define `internal` with its precondition (no sink for the shape) and required `internal_reason`
- [ ] Render it in finalise Step 3d as a skip line; keep the zero-guard for `true`
- [ ] Test: a prompt-rendering fixture where `boundary: internal` without `internal_reason` is a FAIL (absence of the reason is the finding)
- [ ] `npm run bundle`; CHANGELOG

**Dependencies**: Phases 1–2 (so `lintReport` is `true`, not `internal`, when the docs land)

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/security-input-corpus.mjs` — sink
2. ✅ `shared/resources/security-input-corpus.md` — sink prose
3. ✅ `shared/resources/security-probe.mjs` — `--args-json`
4. ✅ `shared/resources/probe-boundary-rule.md` — `internal`
5. ✅ `shared/resources/finalise-dod-security-prompt.md` — schema + zero-guard wording
6. ✅ `skills/finalise/SKILL.md` — Step 3d rendering
7. ✅ `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` — Step 3b vocabulary

### Files to Modify (Tests)

8. ✅ corpus schema test (`shared/resources/tests/security-input-corpus*.test.mjs`)
9. ✅ `shared/resources/tests/security-probe*.test.mjs` — `--args-json` + `lintReport` run
10. ✅ a rendering test for `internal` without reason

### Files to Modify (Documentation)

11. ✅ `docs/reference/anti-patterns.md`; `CHANGELOG.md`; `skills/*/references/` regenerated

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: corpus schema (both directions present for the new sink; fixture paths resolve); engine `--args-json`.

**Actions**: run `lintReport` through the sink; assert `executed === hostile + legitimate`, `reproduced: []`, `overblocked: []`; mutate `lintReport` (drop `header-block-duplicated`) → the fixture case reproduces.

**Command**: `npm test`; **Target**: the mutant is red, recorded.

### Integration Tests

**Scope**: finalise Step 3d rendering of the three `boundary` values from fixture YAML.

### Contract Tests

`bundle:check`; `grep -rn 'boundary:'` enumeration test for consumers.

### Performance Tests

Not applicable.

### Consumer Tests

`review-security`'s liftable block still parses (its fields are unchanged; `internal` is additive).

---

## 9. Success Criteria

### Functional

- [ ] `corpusFor("markdown-structure")` returns both directions; every path-referenced fixture exists
- [ ] `security-probe.mjs --sink markdown-structure --entry shared/resources/report-lint.js#lintReport --args-json '[…]'` executes every case; green accepted, corrupt refused
- [ ] A finalise run whose security agent returns `boundary: internal` renders a skip with the reason; without a reason it is a FAIL

### Performance

- [ ] Probe run under 10 s for the sink (fixture reads)

### Code Quality

- [ ] Mutation proof for the engine path; schema test non-vacuous; `bundle:check` 0 problems

### Migration

- [ ] CHANGELOG entry; the `boundary` consumers enumerated by grep and updated; task.124 DoD § Step 5 cited as the motivating case

---

## 10. Risk Assessment

### High Risk Areas

None — additive corpus and an additive field.

### Medium Risk Areas

**1. `internal` used to dodge a probe that could run**
- Mitigation: precondition is "no sink for the shape", and this task adds the sink for the only shape seen so far; the rule names the sinks that disqualify the class.

**2. Conflict with task.128 on `SINKS`**
- Mitigation: land after 128 or rebase; the array is additive.

### Low Risk Areas

**1. Fixture-path cases break if report-lint fixtures move** — the schema test resolves paths, so a move is red at once.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: the corpus schema test red on `develop`; finalise renders `internal` wrongly.

**Steps**: revert the merge commit; `npm run bundle`.

**Verification**: `npm test` green; `boundary` two-valued again.

### Partial Rollback (1-2 hours)

**When to Use**: only the `internal` rendering misbehaves — revert Phase 3, keep the sink and `--args-json`.

### Forward Fix (< 4 hours)

**When to Use**: a case's expected direction is wrong.

**Approach**: fix the case with the schema test as the guard.

### Rollback Triggers

**Critical**: a finalise run accepts on `internal` where a sink existed. **Non-Critical**: wording.

---

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-09-20 | 1.0 | Initial draft — from task.124 DoD § Step 5 (security probe zero-guard on lintReport) | create-task |
<!-- change-log-end -->

## Progress Tracking

- [ ] Phase 1: the sink
- [ ] Phase 2: `--args-json`
- [ ] Phase 3: `internal`
- [ ] QA: `task.131.qa.[N].markdown-structure-sink-internal-validator-class.md`
- [ ] Gate: `task.131.gate.[N].markdown-structure-sink-internal-validator-class.yml`

## References

- `docs/tasks/task.124.pipeline-resume-lifecycle-hygiene/task.124.dod.1.pipeline-resume-lifecycle-hygiene.md` § Step 3 / Step 5
- `shared/resources/probe-boundary-rule.md`; `security-input-corpus.md`
- Task.128 (shell entry form) — sibling, independent

## Notes

- QA artifacts land beside this file: `task.131.qa.[N].*.md`, `task.131.bug.[N].*.md`, `task.131.gate.[N].*.yml`.
