---
id: task.85
title: "[Task 85] Give /review-pr a machine-readable findings block"
type: task
description: "The qa-fix ingester parses /review-pr's rendered three-line finding format by prose description. That contract is the sole carrier of findings on the Step 5c REQUEST CHANGES path, and it currently rests on an LLM matching a format described in another file. Emit a structured findings block so the path is deterministic."
tags: [review-pr, qa-fix, pipeline, contracts]
category: infrastructure
status: ready-for-review
priority: Medium
risk_level: low
created: 2026-09-03
updated: 2026-09-09
assignee:
estimated_effort_hours: 4
---

# Technical Task: Give `/review-pr` a machine-readable findings block

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.85.review.1.review-pr-machine-readable-findings.md` implemented 2026-09-09

---

## 1. Overview

Task 77 wired `/review-pr` into the develop pipelines as Step 5c. On a `REQUEST CHANGES` verdict the
run returns to `/qa-fix`, and because 5c only runs on a gate that already reads `PASS`, the **PR
review report is the only artifact carrying that cycle's findings** — there are no gate `top_issues`
to travel in.

Task 77 made the ingester parse that report. It does so by **prose description of a rendered
format**: `[PC-1] coverage · high · confidence: high — AC-3`, finding on the next line, action after
a `→`. That works, but it is two files agreeing about a text shape, and task 77's own QA found them
already disagreeing once — the ingester originally described the *subagent YAML* field names
(`severity:`, `file:line`), which are consumed in memory and never written to disk.

A test now pins the two together, so they cannot drift silently. This task removes the need for that
pin by making the data structured: `/review-pr` writes a `findings:` YAML block into the report
beside the rendered text, and the ingester prefers it.

## 2. Motivation

### Current Problems

- The rendered format is for humans; the ingester is a machine consumer of the same file.
- `ref` is polymorphic — a `file:line` for code findings, an `AC-3` or a filename for conformance
  findings — so no single positional parse is reliable.
- The failure is **silent**: a parse miss means qa-fix ingests nothing, changes nothing, and 5b
  step 0 HALTs reporting the findings as *unfixable* when they were never delivered.
- The current safeguard is a text-shape assertion between two prose files. It catches drift; it does
  not remove the class of defect, because both files can still be internally consistent and jointly
  wrong about what a *third* party (the parsing agent) will do with the text.

### Benefits

- The `REQUEST CHANGES` path stops depending on an LLM matching a format described elsewhere.
- `severity` and `confidence` become typed values a consumer reads by key, not by position.
- `ref` stops being polymorphic-by-position: it is one named field whose contents are documented as
  free-form.
- Legacy reports keep working, so nothing already on disk becomes unparseable.

## 3. Technical Background

### Current Architecture

`/review-pr` dispatches two read-only Explore lenses whose YAML **never reaches disk** — it is parsed
in memory in Step 6 and rendered to a fixed three-line text shape. The two schemas are near-parallel
but **not field-identical**:

| Field | `code_review:` (`shared/resources/code-review-prompt.md:60-71`) | `pr_conformance:` (`shared/resources/pr-conformance-prompt.md:91-109`) |
| --- | --- | --- |
| `id` | `CR-{n}` | `PC-{n}` |
| `category` | `bug \| cleanup` | `coverage \| scope \| trail \| consistency` |
| `severity` | `low \| medium \| high` | `low \| medium \| high` |
| `confidence` | `low \| medium \| high` | `low \| medium \| high` |
| **location** | **`file_line:`** — `"src/x/y.ts:42"` | **`ref:`** — criterion id, artifact path, frontmatter field, or `path:line` |
| `finding` | one sentence | one sentence |
| `suggested_action` | one sentence | one sentence |
| `suggested_owner` | `dev` (constant) | — |
| `truncated_count` | per-lens integer | per-lens integer |

Step 6 renders both into one shape (`skills/review-pr/SKILL.md:266-298`), Step 7 writes the report
from a fixed template (`skills/review-pr/SKILL.md:300-360`) with `## Conformance Findings` and
`## Code Review Findings` sections, each holding an **untagged** ``` fence of rendered text — see the
real example at `docs/tasks/task.66.review-pr/task.66.pr-review.1.review-pr.md:60-125`.

`/qa-fix` Step 1a dispatches the ingester with `shared/resources/qa-findings-ingester-prompt.md`,
which describes that rendered shape in prose and warns *"there is no `severity:` key anywhere in the
file, so do not search for one"*.

### Target Architecture

Step 7's template gains **one** new section holding **one** `yaml`-tagged fence carrying **both**
lenses' findings, normalised. The rendered sections are untouched. The ingester prefers the block and
falls back to the rendered parse when it is absent.

> **The location field is normalised, not passed through.** `code_review` emits `file_line:` and
> `pr_conformance` emits `ref:`. The block carries **`ref:`** for both — a `CR-*` entry's `ref` is its
> `file_line` value verbatim. This is the single most likely thing to get wrong, because the two
> source schemas look interchangeable and are not; a block that emits `file_line` for `CR-*` entries
> re-creates the polymorphism the task exists to remove.

## 4. Scope

### In Scope

- `/review-pr` Step 7 emits a `## Machine-Readable Findings` section holding one ```` ```yaml ````
  fence, positioned **after** `## Code Review Findings` and **before** `## Recommended Actions`.
- The block's schema: a top-level `findings:` list of
  `{id, category, severity, confidence, ref, finding, suggested_action}`, plus a top-level
  `truncated_count:` integer (the sum of both lenses' counts).
- Conformance entries first, then code entries — the same order as the rendered sections, so a human
  diffing the two sees them line up.
- The ingester (`shared/resources/qa-findings-ingester-prompt.md`) reads the block when present and
  falls back to the rendered parse when absent, so reports written before this lands still work.
- Re-scope the ingester's `severity:` warning: after this change a `severity:` key **does** exist in
  the report, so the sentence must name the *rendered shape* rather than the whole file.
- Update `evals/shared/tests/pr-review-loop-parity.test.mjs` — both the assertion that pins the
  now-false sentence and new assertions covering the block and the fallback.
- Re-bundle (`npm run bundle`) so every skill carrying a copy of the ingester prompt is updated.

### Out of Scope

- Changing the rendered human-facing format — it stays exactly as it is.
- Any change to verdict semantics or Step 5c routing.
- Changing either subagent's own output schema (`code-review-prompt.md`,
  `pr-conformance-prompt.md`). The normalisation happens in `/review-pr`, at the point that already
  merges the two.
- Emitting the block when no work item resolved — Step 7 writes no file at all in that case, and that
  stays true.

## 5. Breaking Changes

None. The block is **additive**: the rendered sections, the report template's other sections, the
verdict table and the routing are all unchanged. Reports already on disk carry no block, and the
ingester's fallback is exactly the behaviour they were written for.

The one contract that changes wording rather than shape is the ingester's `severity:` warning, whose
current phrasing becomes false the moment a block exists. That is a documentation correction, not a
consumer-visible break — see §6 Phase 2.

## 6. Implementation Plan

### Phase 1 — Emit the block from `/review-pr` (Risk: Low)

**Files:**

- `skills/review-pr/SKILL.md`

**Changes:**

- [x] In Step 6, after the rendering example, state the normalisation rule: the structured block
      carries `ref` for both lenses, and a `CR-*` entry's `ref` is its subagent `file_line` verbatim.
- [x] In Step 7's report template, add `## Machine-Readable Findings` between `## Code Review
      Findings` and `## Recommended Actions`, containing a ```` ```yaml ```` fence with the schema
      from §4.
- [x] State that the section is written **even when both lenses returned nothing** — as
      `findings: []` with `truncated_count: 0`. An absent section must mean "legacy report", never
      "no findings", or the fallback fires on a report that had a block and simply had nothing in it.
- [x] State that `truncated_count` is the **sum** of the two lenses' counts, and that the rendered
      "omitted count" note stays as it is.

**Dependencies:** none.

### Phase 2 — Teach the ingester to prefer the block (Risk: Low)

**Files:**

- `shared/resources/qa-findings-ingester-prompt.md`

**Changes:**

- [x] Add a "Preferred: the machine-readable block" subsection ahead of the rendered-format
      description: read `## Machine-Readable Findings`, parse the `yaml` fence, map each entry
      straight onto the output schema's `findings[]` (`ref` → `file` when it looks like `path:line`,
      else leave `file: null` and carry `ref` in the description).
- [x] Keep the rendered three-line description, retitled as the **fallback** for reports written
      before this change, and say plainly which one wins when both are present (the block).
- [x] **Re-scope the `severity:` warning.** Replace *"there is no `severity:` key anywhere in the
      file"* with a sentence scoped to the rendered shape — e.g. *"in the rendered shape `severity`
      is the third bare field; that shape has no `severity:` key. The machine-readable block does
      carry one, and it is the block you should prefer."* The old sentence becomes **false** once a
      block exists, and it is currently asserted verbatim by a test (see Phase 3).
- [x] Keep the `ref` polymorphism note — it is still true of the block's `ref` field.
- [x] Run `npm run bundle` and commit the regenerated `references/` copies.

**Dependencies:** Phase 1 (the block must be specified before the ingester can describe it).

### Phase 3 — Re-pin the contract (Risk: Low)

**Files:**

- `evals/shared/tests/pr-review-loop-parity.test.mjs`

**Changes:**

- [x] In `"the ingester describes the format /review-pr actually renders"`, replace the assertion on
      `/there is no `severity:` key anywhere in the file/i` with one matching the re-scoped sentence.
      **Do not simply delete it** — the wrong turn it forbids (searching the rendered text for a
      `severity:` key) is still a wrong turn.
- [x] Add: `skills/review-pr/SKILL.md` contains `^## Machine-Readable Findings$` and a
      ```` ```yaml ```` fence whose body matches `findings:` and `truncated_count:`.
- [x] Add: the ingester describes preferring the block **and** retains the rendered fallback — assert
      both, so removing either arm goes red.
- [x] Add a **legacy-fixture** assertion using the real report at
      `docs/tasks/task.66.review-pr/task.66.pr-review.1.review-pr.md`: it carries **no**
      `## Machine-Readable Findings` section and **does** match the rendered header shape — i.e. the
      fallback arm has a real file to fire on, not a synthetic one.
- [x] Keep the existing `## Conformance Findings` / `## Code Review Findings` and `→ suggested
      action` assertions — the rendered path is still the human-facing output and the fallback.

**Dependencies:** Phases 1 and 2 (the test asserts against both files).

## 7. Files Summary

### Modify

| File | Why |
| --- | --- |
| `skills/review-pr/SKILL.md` | Step 6 normalisation rule; Step 7 template gains the block |
| `shared/resources/qa-findings-ingester-prompt.md` | Prefer the block; re-scope the `severity:` warning; keep the fallback |
| `evals/shared/tests/pr-review-loop-parity.test.mjs` | Re-pin the contract; add block + fallback + legacy-fixture assertions |
| `skills/qa-fix/references/qa-findings-ingester-prompt.md` | Regenerated by `npm run bundle` — the ingester's only consumer; commit, never hand-edit |
| `skills/review-pr/tests/review-pr.test.js` | **Scope addition during implementation.** Its `"the report template is given literally"` test enumerates the template's headings; omitting the new one would have left that test asserting a template that no longer exists |

### Add

None.

### Delete

None.

## 8. Testing Strategy

All tests are contract tests over authored prose — this repo's established shape for pipeline
contracts, and the only kind available here, since neither `/review-pr` nor the ingester is code.
They live in `evals/shared/tests/pr-review-loop-parity.test.mjs`, which is already inside the
`npm test` glob (`'evals/shared/tests/*.test.mjs'`), so no `package.json` change is needed.

| # | Assertion | Guards against |
| --- | --- | --- |
| 1 | `review-pr` SKILL.md has `^## Machine-Readable Findings$` | The block silently dropped from the template |
| 2 | That section holds a ```` ```yaml ```` fence matching `findings:` and `truncated_count:` | An untagged/empty fence the ingester cannot anchor on |
| 3 | Every schema key from §4 appears in the template's fence | A field quietly omitted, so a consumer reads `undefined` |
| 4 | `review-pr` states the `CR-*` `ref` ← `file_line` normalisation | The two-schema trap in §3 coming back |
| 5 | The ingester describes reading the block **and** which source wins | An ingester that knows the block but not the precedence |
| 6 | The ingester retains the rendered-shape fallback description | Legacy reports becoming unparseable |
| 7 | The re-scoped `severity:` sentence is present and scoped to the rendered shape | The false whole-file claim returning |
| 8 | `task.66.pr-review.1.review-pr.md` has no block and matches the rendered header | The fallback arm having no real file to fire on |

**Mutation proof required.** Per this repo's standing rule, each new assertion must be shown to go red
when the behaviour it names is reverted — revert the edit, run the file, confirm the failure names the
right thing, restore. Record the result in the implementation report; an assertion that was never seen
to fail is not evidence.

**Not covered, deliberately:** no test executes an actual `/review-pr` run end to end. That is the
existing limitation of every contract test in this file and is not widened or narrowed here.

## 9. Success Criteria

- [x] A `/review-pr` report carries both the rendered findings and a `## Machine-Readable Findings`
      section holding a `yaml` fence with `findings:` and `truncated_count:`
- [x] The section is emitted even when there are no findings (`findings: []`), so its absence means
      "legacy report" and never "no findings"
- [x] The block carries `ref` for **both** lenses, with `CR-*` entries' `ref` taken from the
      subagent's `file_line`
- [x] The ingester prefers the structured block, states that precedence explicitly, and still parses
      legacy reports
- [x] The ingester's `severity:` warning is scoped to the rendered shape and is true of a report that
      carries a block
- [x] `docs/tasks/task.66.review-pr/task.66.pr-review.1.review-pr.md` (a real legacy report) still
      parses via the fallback, and a test asserts it
- [x] Each new assertion in `pr-review-loop-parity.test.mjs` has been mutation-proven
- [x] `npm run bundle` has been run and the regenerated `references/` copies are committed
- [x] `/review-pr`'s advisory contract is unchanged — no gate, no formal review, no code edits
- [x] Full `npm run ci` green

## 10. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| The `CR-*` location field is emitted as `file_line`, re-creating the polymorphism | Medium | High — defeats the task's purpose | §3 states the normalisation as the single most likely error; Testing Strategy #4 asserts the rule is written down |
| The re-scoped `severity:` sentence is deleted rather than reworded, losing the warning | Medium | Medium — the original wrong turn returns | Phase 3 forbids deletion by name; Testing Strategy #7 asserts a scoped sentence exists |
| An empty-findings report omits the section, so the ingester silently takes the fallback | Medium | Medium — masks a block-emission bug as a legacy report | Phase 1 requires `findings: []`; Success Criteria pins it |
| `npm run bundle` not run, so shipped skills carry the old ingester | Medium | High — the fix works in `shared/` and nowhere else | Standing repo rule (edit the source, then bundle); Phase 2 and Success Criteria both name it |
| Rendered and structured findings drift apart within one report | Low | Medium | Both are produced from the same in-memory parse in the same step; the rendered order is mirrored so a human can diff them |

## 11. Rollback Plan

**Trigger:** the ingester regresses on the `REQUEST CHANGES` path — i.e. a 5c `REQUEST CHANGES`
delivers no findings to `/qa-fix` and 5b step 0 HALTs reporting them unfixable.

**Procedure:** revert the three edited files in one commit and re-run `npm run bundle`. Nothing else
depends on the block: it is additive, the rendered sections are untouched, and the ingester's fallback
is the pre-change behaviour. There is no data migration and no state to unwind — reports written while
the block existed simply carry a section the reverted ingester ignores.

**Verification:** `npm run ci` green, and `pr-review-loop-parity.test.mjs` back to its pre-change
assertions.

**Estimated rollback time:** under 10 minutes.

## Progress Tracking

- [x] Phase 1 — Emit the block from `/review-pr`
- [x] Phase 2 — Teach the ingester to prefer the block
- [x] Phase 3 — Re-pin the contract
- [x] `npm run bundle` run and regenerated copies committed
- [x] Mutation proof recorded for each new assertion
- [x] `npm run ci` green

## References

- Origin: `docs/tasks/task.77.review-pr-in-pipeline/task.77.gate.3.review-pr-in-pipeline.yml` — TASK77-022
- The contract: `shared/resources/qa-findings-ingester-prompt.md`, "From the PR review report"
- The renderer: `skills/review-pr/SKILL.md` Step 6/7
- The two subagent schemas: `shared/resources/code-review-prompt.md:60-71`,
  `shared/resources/pr-conformance-prompt.md:91-109`
- The existing pin: `evals/shared/tests/pr-review-loop-parity.test.mjs:512`
- A real legacy report: `docs/tasks/task.66.review-pr/task.66.pr-review.1.review-pr.md`

## QA Testing Results

**QA Status**: PASS (cycle 2)
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-09
**Quality Score**: 95/100
**Gate Decision**: PASS

### QA Report

- **Cycle 2 (final)**: [task.85.qa.2.review-pr-machine-readable-findings.md](./task.85.qa.2.review-pr-machine-readable-findings.md) · [gate.2](./task.85.gate.2.review-pr-machine-readable-findings.yml) — **PASS 95/100**
- **Cycle 1**: [task.85.qa.1.review-pr-machine-readable-findings.md](./task.85.qa.1.review-pr-machine-readable-findings.md) · [gate.1](./task.85.gate.1.review-pr-machine-readable-findings.yml) — FAIL 70/100

### Test Coverage Summary

- **Tests Executed**: 2965 (0 failures) + full `npm run ci` including `eval:all` — exit 0
- **Phases Verified**: 3/3
- **QA Cycles**: 2
- **Issues**: cycle 1 — 1 HIGH, 1 MEDIUM, 1 LOW (**all fixed**); cycle 2 — 1 LOW (pre-existing, out of scope)
- **NFR Status**: Security: PASS (`reasoned`, 0 probes), Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings

Cycle 1 gated **FAIL (70/100)** on TASK85-001: the ingester's block-to-output mapping contradicted
itself — `suggested_action` was said both to "carry across by name" and to "become
`suggested_fix_path`", while the output schema defines no `suggested_action` key at all — and gave no
destination for `id`, `category` or `confidence`. That was the consumer half of the very contract this
task exists to make deterministic, so an ambiguous mapping there would have moved the defect one layer
along rather than removing it.

Cycle 2 gated **PASS (95/100)**. All three findings fixed; the mandatory refute pass over the fixes
found nothing, and the mapping table's exhaustiveness was verified mechanically in both directions
(7 block fields → 7 rows; 6 output fields → 6 destinations). One LOW remains — `truncated_count` is
carried on the block path but not on the legacy fallback — which is pre-existing and whose remedy
§4 Out of Scope explicitly forbids here.

## Change Log

| Date       | Version | Description                                        | Author      |
| ---------- | ------- | -------------------------------------------------- | ----------- |
| 2026-09-03 | 1.0     | Filed from task 77 QA cycle 3 (TASK77-022)          | develop-task |
| 2026-09-09 | 1.1     | Review 5/10 → NEEDS REVISION as found; 3 Critical + 5 Important fixed in place — added §3 Technical Background (the two subagent schemas are not field-identical), §5 Breaking Changes, §6 Implementation Plan (3 phases), §7 Files Summary, §8 Testing Strategy (8 assertions + mutation proof), §10 Risk Assessment, §11 Rollback Plan, Progress Tracking; named the test assertion the change falsifies; specified block placement, fence tag and the `ref` ← `file_line` normalisation | review-task |
| 2026-09-09 |         | Status → ready-for-development                      | review-task |
| 2026-09-09 |         | Phases 1-3 implemented; 13 mutations proven; `npm run ci:fast` green (2965 tests, 0 fail); status → ready-for-review | develop |
| 2026-09-09 |         | QA gate FAIL (70/100) — 3 findings, 1 HIGH in the ingester mapping | qa-task |
| 2026-09-09 |         | QA findings fixed — TASK85-001/002/003 closed, 4 new mutations proven, 1 iteration | qa-fix |
| 2026-09-09 |         | QA gate PASS (95/100) cycle 2 — refute pass clean, full `npm run ci` green, 1 LOW out of scope | qa-task |
