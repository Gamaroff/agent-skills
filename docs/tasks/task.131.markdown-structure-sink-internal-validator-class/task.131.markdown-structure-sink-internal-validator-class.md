---
id: task.131
title: "[Task 131] A structural validator of a pipeline-authored artefact fires the boundary rule and no corpus sink can probe it: a markdown-structure sink with a --args entry form, and an explicit internal-artefact decision the security agent records instead of failing on the zero-guard"
type: task
description: "On task.124 the finalise security agent classed report-lint.js#lintReport a boundary, found no sink in security-input-corpus.mjs for a Markdown-structure validator, could not import a two-argument entry, and returned FAIL on the zero-guard — a verdict the operator then had to overrule by hand. Add a markdown-structure sink (hostile + legitimate report shapes), let the probe engine bind a fixed second argument, and make the rule name the outcome it reached."
tags: [security-probe, finalise, corpus, report-lint]
category: infrastructure
status: ready-for-review
priority: Medium
created: 2026-09-20
updated: 2026-09-30
assignee:
estimated_effort_hours: 6
risk_level: low
github_issue: 438
---

# Technical Task: A markdown-structure sink and an internal-artefact decision for the security probe

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.131.review.1.markdown-structure-sink-internal-validator-class.md` implemented 2026-09-30
**GitHub Issue**: [#438](https://github.com/Gamaroff/agent-skills/issues/438)

---

## 1. Overview

The finalise DoD security agent applies `probe-boundary-rule.md` § Step 1b: an exported verdict predicate fires probe mode, and a boundary with `probes_executed: 0` is a FAIL. On task.124 that rule met `report-lint.js#lintReport` — a validator of the pipeline's own implementation report — and had no way to run: no sink in `security-input-corpus.mjs` models Markdown structure, and the entry takes `(text, { sections })`, which `security-probe.mjs` (one-argument calls) records as `unverifiable`. The agent did the honest thing and failed; the operator overruled it by hand (task.124 DoD § Step 5). This task gives the rule a way to run and a way to say "internal artefact, not probeable by this engine" that is a recorded decision rather than a FAIL to be overruled.

**Scope**: `shared/resources/change-log.js` (`fencedRanges` CRLF fix — a defect the new probe found during development; regression tests in `change-log.test.mjs` and `report-lint.test.mjs`), `shared/resources/security-input-corpus.{mjs,md}` (new sink), `shared/resources/security-probe.mjs` (`--args-json` fixed extra arguments), `shared/resources/probe-boundary-rule.md` and `finalise-dod-security-prompt.md` (the internal-artefact decision), `qa-task`/`qa-story` Step 3b (same wording), tests.

**Key deliverables**: (1) `markdown-structure` sink — hostile cases are **inline** minimal report shapes, **each tripping exactly one** `lintReport` problem code (duplicated header block, second H1, trailing duplicate body, out-of-order section, duplicated section, heading swallowed by a fence, undetectable variant/empty document); legitimate cases are minimal valid task and story reports (inline, plus a CRLF variant and a `## Change Log` inside a fence that must not count); (2) `--args-json '[{"sections": <loadTemplate()>}]'` on the engine so a `(text, opts)` predicate is probeable, **and** a runner rule that reads a returned `{ ok: false }` as a rejection — without it every corrupt report scores `accepted`; (3) a third `boundary` value — `internal` — for a validator whose only input is an artefact the pipeline writes, rendered as an explicit skip with a reason, never as the zero-guard FAIL.

**Expected outcome**: `lintReport` probed by execution on the next finalise that touches it; a validator that genuinely has no sink is recorded as `boundary: internal` with the reason, and the operator decision task.124 needed becomes a rule.

---

## 2. Motivation

### Current Problems

- **The zero-guard has no third outcome.** `finalise-dod-security-prompt.md` renders `boundary: true` + `probes_executed: 0` as `probe mode executed no candidates` FAIL. That is right for a boundary the engine *could* have probed; it is wrong for one it structurally cannot, and the prompt's own summary on task.124 said so ("a human should either accept the NOT-probeable classification … or add a sink"). A rule that ends in "a human should decide" every time it meets this shape is a rule with a missing branch.
- **The runner cannot read a result object.** `security-probe.mjs`'s JS runner rejects only on a throw or a `null`/`undefined`/`false` return. `lintReport` answers `{ ok: false, problems }` for a corrupt report — an object, so it scores `accepted`. Measured (review 1): `lintReport(corrupt-task117.md, { sections: loadTemplate() })` → `ok: false`, which the runner's predicate scores `accepted`; every hostile case would reproduce and the verdict would read `absent` for a validator that works.
- **No sink models a document validator.** `SINKS` is `url-authority | sql-orm | shell-exec | path | template-render` — all "where does untrusted input go". A structural linter's input is a document; its hostile cases are malformed documents, and `report-lint.test.mjs` already pins these shapes — one fixture file (`corrupt-task117.md`, which carries five problem codes at once) and inline strings for the rest.
- **The engine calls with one argument.** `lintReport(text, opts)` requires `opts.sections` and throws `TypeError: opts.sections is required` without it; the runner scores a throw as `rejected`, so every case — legitimate ones included — is rejected and the verdict is `unverifiable` (`rejects-every-input`). Any predicate with a configuration argument is unreachable, which is most validators in this repository (`checkCardSections`, `lintReport`).
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

- `shared/resources/security-input-corpus.mjs` — `SINKS` (six — task.128's `filename` has landed), `DIRECTIONS` (`hostile`, `legitimate`), `sinkCases(sink, cases)`, `corpusFor(sink)` which throws on an unknown sink (`unknown-sink` decline). Every sink carries both directions; a schema test enforces it.
- `shared/resources/security-probe.mjs` — `--sink --entry path#export --repo-root --record`; imports the entry in a sandboxed child and calls `fn(candidate.input)`; `verdict: unverifiable` with `executed: 0` when the export needs more than one argument or will not import (probe-boundary-rule § 4).
- `shared/resources/probe-boundary-rule.md` — § Step 1b signals (exported verdict predicate; allow/deny list; "X is refused" tests; SC with *never/must not/refused*); the explicit negative case ("a report writer, a formatter … are not boundaries"); § 4 `declined` is its own state.
- `shared/resources/finalise-dod-security-prompt.md` — `boundary: true|false`, `probes_executed`, `probes[]`; the zero-guard FAIL; the rendering in `finalise/SKILL.md` Step 3d (three absences are three things).
- `shared/resources/report-lint.js` — `lintReport(text, { sections })` → `{ ok, variant, problems }`; fixtures under `shared/resources/tests/fixtures/report-lint/` (`corrupt-task117.md`, green task.118/119/121/122/123).
- `shared/resources/security-input-corpus.md` — the case tables are **generated** by `renderCorpusTables()` (parity-tested), and each sink's heading prose is `SINK_BLURB` in the `.mjs`; the `.md` is regenerated, never hand-edited in those sections.
- `shared/resources/probe-boundary-signals.mjs` — returns `{ boundary: boolean }`: the Step 1b **signal detector** (does the rule fire?), not the recorded decision. It stays boolean.
- Task.128 (merged) added the `filename` sink and the `shell:` entry form — orthogonal.

### Target Architecture

**Components**:

- `SINKS` gains `markdown-structure`. Cases are **inline strings** (the corpus stays pure data — no filesystem, nothing bundled beyond itself), each hostile case built from a minimal valid report with **one** defect so it trips exactly one problem code: `duplicated-header-block`, `second-h1`, `trailing-duplicate-body`, `section-out-of-order`, `section-duplicated`, `heading-inside-fence` (a required section present only inside a fence → missing), `empty-document`; legitimate — a minimal valid task report, a minimal valid story report, the task report with CRLF line endings, and the task report with a `## Change Log` inside a fenced block. The sink's `SINK_BLURB` states what it models — **an implementation report consumed by a pipeline decision** — and why "refuse everything" is also a defect here; `security-input-corpus.md` is regenerated.
- `security-probe.mjs` gains `--args-json <json-array>`: extra positional arguments appended after the candidate on every call (`fn(input, ...extra)`), JS entry form only (declined `bad-args` with a `shell:`/`shell-fn:`/`cli:` entry, like `--argv`). Recorded in the run record as `args`. Without it, behaviour is unchanged; with it, a `(text, opts)` predicate is probeable. A throw is still scored `rejected` as today.
- The JS runner gains **one rejection rule**: a returned non-null, non-array object whose **own** `ok` property is `false` is a rejection. `{ ok: true, … }` and every other value keep today's scoring. This is the result shape `lintReport` (and `checkCardSections`-style validators) answer with.
- `probe-boundary-rule.md` § Step 1b gains a third decision: **`boundary: internal`** — the predicate's only input is an artefact this repository's own pipeline writes (implementation report, DoD summary, gate) *and* no sink models its shape. Recorded with a `reason`; rendered by finalise as an explicit skip line ("internal artefact — `<reason>`; not the zero-guard"), never as FAIL, never as `false`. Once a sink exists for the shape, `internal` is no longer available for it — the rule says which sinks disqualify it: a sink disqualifies `internal` only when **its legitimate cases are documents the predicate is meant to accept** (probing a validator of a different document through `markdown-structure` would report its legitimate cases `overblocked`, which is a mis-fitted sink, not a finding).
- `finalise-dod-security-prompt.md` output schema: `boundary: true | false | internal`; `internal` requires `internal_reason`. `finalise/SKILL.md` Step 3d renders the three cases; the "three absences" note becomes four.
- `qa-task`/`qa-story` Step 3b: same vocabulary in the `## Code Review` boundary line.

### Important Clarifications

- **`internal` is not a loophole for the zero-guard.** It is available only when *no* sink models the input shape — and this task adds the sink for Markdown structure, so `lintReport` itself becomes `true` + probed, not `internal`. The class exists for the next validator, and its reason is recorded.
- **The engine's arity constraint is kept as a verdict**, not loosened: `--args-json` binds *fixed* extra arguments the caller states; the engine never guesses them.
- **Corpus cases are inline, not fixture paths.** The corpus is pure data and is bundled into skills; a `shared/resources/tests/…` path would break its no-filesystem contract, bundle test fixtures into consumer installs, and decline there anyway. The one definition of "a corrupt report" stays in `report-lint.test.mjs` + `corrupt-task117.md`; the engine test (Phase 2) runs those fixtures through `lintReport` as well, so the corpus's minimal shapes and the real fixtures are both exercised.
- **Each hostile case isolates one problem code.** `corrupt-task117.md` trips five; a mutant that drops one check still returns `ok: false` on it and survives. Mutation proof needs an isolated case.

---

## 4. Scope

### In Scope

✅ `markdown-structure` sink in `security-input-corpus.mjs` (+ `SINK_BLURB`), `security-input-corpus.md` regenerated; schema test extended.
✅ `--args-json` on `security-probe.mjs`; recorded in the run record; the `ok === false` runner rule; tests for both.
✅ `boundary: internal` + `internal_reason` in `probe-boundary-rule.md`, `finalise-dod-security-prompt.md`, `finalise/SKILL.md` Step 3d rendering, `qa-task`/`qa-story` Step 3b.
✅ An engine test running `lintReport` through the new sink with `--args-json` → verdict `engages` (every hostile rejected, every legitimate accepted); the real fixtures (`corrupt-task117.md` refused, the five green fixtures accepted) through the same runner; a mutant `lintReport` that no longer reports `header-block-duplicated` → `markdown-structure.duplicated-header-block` in `reproduced`.
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

**Impact**: `finalise/SKILL.md` Step 3d rendering and any consumer that switches on the recorded decision. A bare `grep -rn 'boundary:'` is **not** the enumeration — it matches 16 files, most unrelated (`loop-supervisor` "both sides of their boundary:", `develop-pipeline-on-precompact.sh` "Last step boundary:", green report fixtures). Enumerate with the compound keys `boundary: true | false` (the schema literal), `security_result.boundary` (the finalise render) and `boundary: internal`. `probe-boundary-signals.mjs`'s `{ boundary: boolean }` is the signal detector and stays boolean. `review-security` is named as a consumer in the original draft; its `SKILL.md` has no `boundary` field — confirm or drop it in Phase 3.

**Migration Path**: consumers treat an unknown value as "not answered" (the existing three-absences rule) until updated; this task updates every consumer the compound keys enumerate and adds a test that every file carrying one of them also names `internal`.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.131.plan.markdown-structure-sink-internal-validator-class.md](task.131.plan.markdown-structure-sink-internal-validator-class.md)

### Phase 1: the sink

**Risk Level**: Low

**Files**: `shared/resources/security-input-corpus.mjs`, `security-input-corpus.md`, its schema test.

**Changes**:
- [x] Add `markdown-structure` to `SINKS` with both directions
- [x] Hostile cases: nine inline shapes, each tripping the one `lintReport` problem code it is named for (`trailing-duplicate-body` also trips `section-duplicated`, which the shape implies), including a CRLF fenced-only section; legitimate: six — valid task and story reports, a fenced quoted report (LF and CRLF), the optional section, an untemplated heading after Completion (the fenced `## Change Log` variant was dropped: `Change Log` is not a template section, so it tested nothing)
- [x] `SINK_BLURB` entry; regenerate the `.md` case tables from `renderCorpusTables()`; schema + parity tests green

**Dependencies**: none (task.128 has landed; `SINKS` already carries `filename`)

### Phase 2: fixed extra arguments on the engine

**Risk Level**: Low

**Files**: `shared/resources/security-probe.mjs` + its test.

**Changes**:
- [x] `--args-json` parsed once, validated as a JSON array (else usage, exit 2), JS entry form only, passed to the child in the stdin spec, appended on every call
- [x] Runner rule: an own `ok === false` on a returned plain object → `rejected`; test both directions (`{ok:false}` rejected, `{ok:true}` accepted) and that existing sinks' engine tests are unchanged
- [x] Recorded in the run record (`args`)
- [x] Test: `lintReport` with `--args-json '[{"sections": <loadTemplate()>}]'` → `engages`, `executed` = corpus size, `reproduced: []`, `overblocked: []`; `corrupt-task117.md` refused and the five green fixtures accepted via the same runner; a mutant that drops the `header-block-duplicated` check → the isolated case reproduced

**Dependencies**: Phase 1

### Phase 3: the `internal` decision

**Risk Level**: Medium

**Files**: `probe-boundary-rule.md`, `finalise-dod-security-prompt.md`, `skills/finalise/SKILL.md` Step 3d, `qa-task`/`qa-story` SKILL.md Step 3b, `docs/reference/anti-patterns.md` (a paragraph: a rule that ends in "a human decides" on a recurring shape is a rule with a missing branch).

**Changes**:
- [x] Define `internal` with its precondition (no sink whose legitimate cases are the predicate's documents) and required `internal_reason`
- [x] Render it in finalise Step 3d as a skip line; keep the zero-guard for `true`
- [x] Test: a prompt-rendering fixture where `boundary: internal` without `internal_reason` is a FAIL (absence of the reason is the finding)
- [x] `npm run bundle`; CHANGELOG

**Dependencies**: Phases 1–2 (so `lintReport` is `true`, not `internal`, when the docs land)

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/security-input-corpus.mjs` — sink
2. ✅ `shared/resources/security-input-corpus.md` — regenerated from `renderCorpusTables()` (prose lives in `SINK_BLURB`)
3. ✅ `shared/resources/security-probe.mjs` — `--args-json` + the `ok === false` runner rule
4. ✅ `shared/resources/probe-boundary-rule.md` — `internal`
5. ✅ `shared/resources/finalise-dod-security-prompt.md` — schema + zero-guard wording
6. ✅ `skills/finalise/SKILL.md` — Step 3d rendering
7. ✅ `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` — Step 3b vocabulary

8a. ✅ `shared/resources/change-log.js` — `fencedRanges` CRLF fix (found by the new probe; see Scope)

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

**Scope**: corpus schema (both directions present for the new sink; each hostile case trips exactly one `lintReport` code); engine `--args-json`; the `ok === false` runner rule.

**Actions**: run `lintReport` through the sink; assert `verdict: engages`, `executed === hostile + legitimate`, `reproduced: []`, `overblocked: []`; mutate `lintReport` (drop `header-block-duplicated`) → the isolated `duplicated-header-block` case reproduces; revert the runner rule → every hostile case reproduces (`absent`).

**Command**: `npm test`; **Target**: the mutant is red, recorded.

### Integration Tests

**Scope**: finalise Step 3d rendering of the three `boundary` values from fixture YAML.

### Contract Tests

`bundle:check`; enumeration test over the compound `boundary` keys (every file carrying one also names `internal`).

### Performance Tests

Not applicable.

### Consumer Tests

`review-security`'s liftable block still parses (its fields are unchanged; `internal` is additive).

---

## 9. Success Criteria

### Functional

- [x] `corpusFor("markdown-structure")` returns both directions; every hostile case trips exactly the code(s) it is named for — one each, except `trailing-duplicate-body` (+ `section-duplicated`, implied by the shape; a section reappearing after the last has appeared twice)
- [x] `security-probe.mjs --sink markdown-structure --entry shared/resources/report-lint.js#lintReport --args-json '[{"sections": <loadTemplate()>}]'` executes every case and returns `engages`; `corrupt-task117.md` refused and the green fixtures accepted through the same runner
- [x] A finalise run whose security agent returns `boundary: internal` renders a skip with the reason; without a reason it is a FAIL

### Performance

- [x] Probe run under 10 s for the sink (fixture reads)

### Code Quality

- [x] Mutation proof for the engine path; schema test non-vacuous; `bundle:check` 0 problems

### Migration

- [x] CHANGELOG entry; the `boundary` consumers enumerated by grep and updated; task.124 DoD § Step 5 cited as the motivating case

---

## 10. Risk Assessment

### High Risk Areas

None — additive corpus and an additive field.

### Medium Risk Areas

**1. `internal` used to dodge a probe that could run**
- Mitigation: precondition is "no sink for the shape", and this task adds the sink for the only shape seen so far; the rule names the sinks that disqualify the class.

**2. The `ok === false` runner rule changes scoring for existing JS probes**
- A JS export that already answered `{ ok: false }` to a hostile input moved from `accepted` to `rejected`.
- Mitigation: the rule reads only an own `ok === false` on a plain object; a test pins both directions; every existing sink's engine test re-runs under `npm test`.

**3. Conflict with task.128 on `SINKS`** — resolved: task.128 has landed.

### Low Risk Areas

**1. The engine test's fixture paths break if report-lint fixtures move** — the test reads them directly, so a move is red at once.

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

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-30
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.131.qa.4.markdown-structure-sink-internal-validator-class.md](./task.131.qa.4.markdown-structure-sink-internal-validator-class.md)
- **Gate File**: [task.131.gate.4.markdown-structure-sink-internal-validator-class.yml](./task.131.gate.4.markdown-structure-sink-internal-validator-class.yml)

### Test Coverage Summary
- **Tests Executed**: 4594
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
All earlier findings are fixed (bugs 1–7 closed). Four LOW residues were carried to the gate's `recommendations.future` through the Cosmetic-residue exit (see Deferred Work).

## Deferred Work

Carried from gate 4 by the Cosmetic-residue exit (route 2b); closed in `top_issues[]`, open in `recommendations.future`:

- **TASK-131-CR-4-1**: split the review-security sink-enumeration extract into its sentence and its table.
- **TASK-131-CR-4-2**: align the prompt's Omitting-a-field paragraph with the three FAIL shapes.
- **TASK-131-CR-4-3**: replace the redundant `>= 5` floor with an upper bound, or correct its comment.
- **TASK-131-CR-4-4**: indent one Step 3c continuation line.

Also carried from earlier gates: `args` is not in the JS control key; the ok-rule wording; the duplicated corpus-doc paragraph; CRLF fence detection in `jira-sync.js` and `doc-links.js` (pre-existing).

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-09-20 | 1.0 | Initial draft — from task.124 DoD § Step 5 (security probe zero-guard on lintReport) | create-task |
| 2026-09-30 | 1.1 | Review 1 (7/10 → 9/10 after fixes, 0 critical / 6 important applied): runner `ok === false` rule added (lintReport's `{ok:false}` scored `accepted`); hostile cases inline and isolated per problem code (mutant unreachable via the 5-code fixture); fixtures referenced from the engine test, not the corpus; compound `boundary` enumeration keys; `SINK_BLURB` + regenerated `.md`; `internal` disqualification scoped; effort 4h → 6h | review-task |
| 2026-09-30 |  | Status → ready-for-development | review-task |
| 2026-09-30 |  | Implemented — 20 source files (+ bundled copies), 13 new tests; also fixed `change-log.js#fencedRanges` on CRLF, found by the new probe | develop |
| 2026-09-30 |  | QA gate CONCERNS (80/100) — 3 findings (2 medium, 1 low) | qa-task |
| 2026-09-30 |  | QA gate CONCERNS (70/100) — cycle 2 refute pass: 4 findings (3 medium, 1 low) | qa-task |
| 2026-09-30 |  | QA gate CONCERNS (80/100) — cycle 3: 4 findings (2 medium, 2 low) | qa-task |
| 2026-09-30 |  | QA findings fixed — 3 iterations: cycle 1 BUG-1, BUG-2, CR-4 (+2 cleanups); cycle 2 BUG-3, BUG-4, BUG-5, QA-4; cycle 3 BUG-6, BUG-7, CR-3-3, QA-6 | qa-fix |
| 2026-09-30 |  | QA gate PASS (100/100) — cycle 4: 4 LOW carried to recommendations.future (Cosmetic-residue exit) | qa-task |
<!-- change-log-end -->

## Progress Tracking

- [x] Phase 1: the sink
- [x] Phase 2: `--args-json`
- [x] Phase 3: `internal`
- [x] QA: `task.131.qa.[N].markdown-structure-sink-internal-validator-class.md` — 4 cycles, latest `task.131.qa.4.markdown-structure-sink-internal-validator-class.md`
- [x] Gate: `task.131.gate.[N].markdown-structure-sink-internal-validator-class.yml` — latest `task.131.gate.4.markdown-structure-sink-internal-validator-class.yml` (PASS 100)

## References

- `docs/tasks/task.124.pipeline-resume-lifecycle-hygiene/task.124.dod.1.pipeline-resume-lifecycle-hygiene.md` § Step 3 / Step 5
- `shared/resources/probe-boundary-rule.md`; `security-input-corpus.md`
- Task.128 (shell entry form) — sibling, independent

## Notes

- QA artifacts land beside this file: `task.131.qa.[N].*.md`, `task.131.bug.[N].*.md`, `task.131.gate.[N].*.yml`.
