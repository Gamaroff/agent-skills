---
id: task.131.plan
title: "Implementation Plan: markdown-structure sink, --args-json, boundary: internal"
type: plan
task-ref: task.131.markdown-structure-sink-internal-validator-class.md
---

# Implementation Plan: markdown-structure sink and the internal-artefact decision

> Requirements and success criteria: [task.131.markdown-structure-sink-internal-validator-class.md](task.131.markdown-structure-sink-internal-validator-class.md)

## Overview

Add one sink, one engine flag and one decision value; prove the sink by running `lintReport` through it and reproducing a mutant.

## Phase-by-Phase Implementation Guide

### Phase 1: the sink

**Files to modify:**
- `shared/resources/security-input-corpus.mjs` — `SINKS` array (line ~29): append `"markdown-structure"`. Add a `MARKDOWN_STRUCTURE` block via `sinkCases("markdown-structure", [...])`, register it in `CORPUS`, add a `SINK_BLURB` entry. Cases use the existing `CASE_FIELDS` only — **inline strings, no `inputFile`** (review 1, I3: the corpus is pure data and bundled into skills; a fixture path would ship a test fixture reference to consumers and decline there).
- Build the cases from one minimal valid task report (a module-private constant: `# Implementation Report: X`, `**Task**:` header line, then every task-variant section of `implementation-report-template.md` in order) and one minimal valid story report. Hostile cases = the valid task report with **one** defect each, so each trips exactly one code (review 1, I2): `duplicated-header-block`, `second-h1` (`multiple-h1`), `trailing-duplicate-body`, `section-out-of-order`, `section-duplicated`, `heading-inside-fence` (a required heading only inside a fence → `section-missing`), `empty-document` (`variant-undetected`). Legitimate = valid task, valid story, task with CRLF endings, task with a fenced `## Change Log`. Verify each shape against `lintReport` while writing it — the engine test asserts the one-code property.
- `shared/resources/security-input-corpus.md` — regenerate "## The cases" from `renderCorpusTables()` (see the module's comment for the one-liner); the parity test fails otherwise. The blurb: the sink is "an implementation report a pipeline decision reads"; hostile = shapes the linter must refuse; legitimate = shapes it must accept; "refuse everything" is `overblocked`; the sink fits validators of this document shape only.

### Phase 2: `--args-json`

**Files to modify:**
- `shared/resources/security-probe.mjs` — the flag table (line ~2130 region): add `"--args-json"`; parse with `JSON.parse`, require an array (else usage, exit 2); JS entry form only — a `shell:`/`shell-fn:`/`cli:` entry with `--args-json` declines `bad-args` (mirror `--argv`'s `bad-argv`, validated in `runProbeSpec` too, since library callers cross that boundary). Pass it in the child's stdin spec (`extraArgs`), and in `RUNNER` call `fn(spec.input, ...(spec.extraArgs ?? []))`. `base` gains `args: null` so every return path carries the key; `toRecordEntry` records `args`.
- **Runner rejection rule (review 1, I1):** after the call, `rejected` also holds when `returned` is a non-null, non-array object with an own `ok` property strictly `false`. Without it `lintReport`'s `{ ok: false }` scores `accepted` and the verdict is `absent`. Update the header comment that lists the rejection shapes.
- Test (the existing `shared/resources/tests/security-probe.test.mjs` suite): (a) `--sink markdown-structure --entry shared/resources/report-lint.js#lintReport --args-json '[{"sections": <loadTemplate()>}]'` → `engages`, `executed` = corpus size, `reproduced`/`overblocked` empty; (b) the real fixtures via caller-supplied `cases` — `corrupt-task117.md` hostile, the five green fixtures legitimate → `engages`; (c) a mutant copy of `report-lint.js` in a temp dir inside the repo root (cp/restore per `mutation-proving.md`) with the `header-block-duplicated` push removed → `reproduced` contains `markdown-structure.duplicated-header-block`; (d) a tiny fixture export returning `{ ok: false }` / `{ ok: true }` pins the rule both ways; (e) `--args-json` with a `shell:` entry → `bad-args`; non-array JSON → exit 2.

### Phase 3: `internal`

**Files to modify:**
- `shared/resources/probe-boundary-rule.md` § 1b (or a new § 1c): "**`internal`** — the predicate's only input is an artefact this pipeline writes and no sink models its shape. Record `internal_reason`. Not available once a sink's legitimate cases are documents the predicate is meant to accept: `markdown-structure` disqualifies validators of the implementation report."
- `shared/resources/finalise-dod-security-prompt.md` — output schema `boundary: true | false | internal`, `internal_reason: "<why no sink fits>"`; the zero-guard paragraph: "applies to `true` only".
- `skills/finalise/SKILL.md` Step 3d "Probe Results" template: a fourth branch `{else if boundary == internal:}` rendering `⚠️ **Internal artefact — not probeable by the engine**: {internal_reason}` and a FAIL when the reason is missing; update the "three absences" comment to four.
- `qa-task`/`qa-story` Step 3b: the boundary-rule sentence lists the three values.
- `docs/reference/anti-patterns.md`: "A rule that ends in 'a human decides' on a recurring shape is a rule with a missing branch" (task.124 DoD).

## Key Patterns and References

- `sinkCases` namespacing and the both-directions invariant (corpus schema test).
- `probe-boundary-rule.md` § 4: `declined` vs `executed: 0` — `internal` is a third, distinct state; do not fold it into either.
- The engine's sandbox (`sandboxEnv()`) — extra args are data, never paths outside `--repo-root`.

## Testing Approach

- Corpus schema test extended for the sink; parity test green after regenerating the `.md`.
- Engine test with the real `lintReport` and a mutant (cp/restore per `mutation-proving.md`).
- A rendering fixture test for finalise Step 3d if one exists (`skills/finalise/tests/`); otherwise a prompt-parity test that the three values appear in all four documents.
- Consumer enumeration keyed on the compound literals `boundary: true | false`, `security_result.boundary`, `boundary: internal` — never bare `boundary:` (16 files, mostly unrelated; review 1, I4).
