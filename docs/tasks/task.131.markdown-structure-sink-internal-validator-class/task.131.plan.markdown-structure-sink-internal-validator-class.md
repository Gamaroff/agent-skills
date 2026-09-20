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
- `shared/resources/security-input-corpus.mjs` — `SINKS` array (line ~29): append `"markdown-structure"`. Add a `markdownStructure` case block using `sinkCases("markdown-structure", [...])`. Cases carry the existing `CASE_FIELDS`; for fixture-backed cases use `inputFile: "shared/resources/tests/fixtures/report-lint/corrupt-task117.md"` if the schema already supports file-backed inputs — check `CASE_FIELDS` (line ~41); if not, add `inputFile` as an optional field resolved relative to `--repo-root` by the engine (Phase 2 touches the loader anyway) and extend the schema test.
- `shared/resources/security-input-corpus.md` — a "markdown-structure" section: the sink is "a document a decision reads"; hostile = shapes the linter must refuse; legitimate = shapes it must accept; "refuse everything" is `overblocked`.

**Hostile inline shapes** (strings): `# A\n\n# B\n` (two H1); `## Summary\n## Summary\n` (duplicated section); a header block twice; `\`\`\`\n## Pipeline Progress\n\`\`\`` (heading inside a fence, no real section); `\r\n` endings; empty string.

### Phase 2: `--args-json`

**Files to modify:**
- `shared/resources/security-probe.mjs` — `OPERAND_FLAGS` (line ~903 region): add `"--args-json": "argsJson"`; parse with `JSON.parse`, require an array (else `usage`); pass to the child through the existing spawn payload; in the child's call site `fn(input)` → `fn(input, ...extraArgs)`. `toRecordEntry` gains `args` (line ~738 region). Keep `unverifiable` when the call throws a TypeError about arity.
- Test: `shared/resources/tests/security-probe.test.mjs` (or the existing engine suite) — a case running `--sink markdown-structure --entry shared/resources/report-lint.js#lintReport --args-json '[{"sections":<from loadTemplate("task")>}]'`; assert `executed` equals the corpus size, `reproduced.length === 0`, `overblocked.length === 0`; then a mutant copy of `report-lint.js` with the `header-block-duplicated` check removed → that fixture case is in `reproduced`.

### Phase 3: `internal`

**Files to modify:**
- `shared/resources/probe-boundary-rule.md` § 1b (or a new § 1c): "**`internal`** — the predicate's only input is an artefact this pipeline writes and no sink models its shape. Record `internal_reason`. Not available once a sink exists for the shape: `markdown-structure` disqualifies document validators."
- `shared/resources/finalise-dod-security-prompt.md` — output schema `boundary: true | false | internal`, `internal_reason: "<why no sink fits>"`; the zero-guard paragraph: "applies to `true` only".
- `skills/finalise/SKILL.md` Step 3d "Probe Results" template: a fourth branch `{else if boundary == internal:}` rendering `⚠️ **Internal artefact — not probeable by the engine**: {internal_reason}` and a FAIL when the reason is missing; update the "three absences" comment to four.
- `qa-task`/`qa-story` Step 3b: the boundary-rule sentence lists the three values.
- `docs/reference/anti-patterns.md`: "A rule that ends in 'a human decides' on a recurring shape is a rule with a missing branch" (task.124 DoD).

## Key Patterns and References

- `sinkCases` namespacing and the both-directions invariant (corpus schema test).
- `probe-boundary-rule.md` § 4: `declined` vs `executed: 0` — `internal` is a third, distinct state; do not fold it into either.
- The engine's sandbox (`sandboxEnv()`) — extra args are data, never paths outside `--repo-root`.

## Testing Approach

- Corpus schema test extended for the sink and (if added) `inputFile`.
- Engine test with the real `lintReport` and a mutant (cp/restore per `mutation-proving.md`).
- A rendering fixture test for finalise Step 3d if one exists (`skills/finalise/tests/`); otherwise a prompt-parity test that the three values appear in all four documents.
