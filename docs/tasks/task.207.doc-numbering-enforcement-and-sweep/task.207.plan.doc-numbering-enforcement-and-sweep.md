---
id: task.207.plan
title: "Implementation Plan: Doc numbering enforcement and sweep"
type: plan
task-ref: task.207.doc-numbering-enforcement-and-sweep.md
---

# Implementation Plan: Doc numbering enforcement and sweep

> Requirements and success criteria: [task.207.doc-numbering-enforcement-and-sweep.md](task.207.doc-numbering-enforcement-and-sweep.md)

## Overview

This plan adds two guards, both modelled on existing tests: a corpus guard on
`task-registry-drift.test.mjs` and a chokepoint guard on `mutation-call-site-coverage.test.js`. It
then sweeps the prose. Every `path:line` anchor is as of `develop` at `a0f1f97d`, before
task.202–task.206 land. **Re-grep each one first**: task.206 rewrites most of the sites named here.

## Phase-by-Phase Implementation Guide

### Phase 0: Dependency gate

```bash
for t in 204 205 206; do
  f=$(ls docs/tasks/task.$t.*/task.$t.*.md | grep -vE '\.(plan|qa|dod|review|implementation|pr-review|handoff)\.' | head -1)
  grep -q '^status: accepted' "$f" || { echo "HALT: task.$t not accepted ($f)"; exit 1; }
done
git grep -n "export" shared/resources/doc-id.js
```

Record the actual export names: the corpus-check function, the id regexes, and `parse`. Use those
names below. If the engine has no corpus entry point, HALT. That gap belongs to task.202, and this
task must not invent a second walker.

### Phase 1: Corpus test

**File:** `evals/shared/tests/doc-numbering-corpus.test.mjs` (ESM, `node:test`, the same header
style as `task-registry-drift.test.mjs`: a docblock that states why the guard exists and what its
floor protects against).

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, renameSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
// doc-id.js is CommonJS; Node's named-export detection reads its `module.exports = { … }`
// literal, so the named import works (verified in review.1).
const { checkCorpus } = await import(
  pathToFileURL(path.join(REPO_ROOT, "shared/resources/doc-id.js")).href);

// Floor: the migrated corpus held 22 documents — 1 PRD, 4 epics, 17 stories — on 2026-10-16
// (`checkCorpus("docs/prd").documents`). It only grows. The engine returns a total, not
// per-kind counts: `{ reason, findings, documents, unreadable }`.
const MIN_DOCUMENTS = 22;

test("the docs/prd corpus is numbered, consistent and registered", () => {
  const r = checkCorpus(path.join(REPO_ROOT, "docs/prd"));
  // root-missing / empty / unreadable are instrument failures, never a clean pass.
  assert.ok(["ok", "findings"].includes(r.reason), `corpus not read: ${r.reason}`);
  assert.ok(r.documents >= MIN_DOCUMENTS, `vacuous read: ${r.documents} documents`);
  assert.deepEqual(r.findings, [], r.findings.map((f) => `${f.path}: ${f.reason} — ${f.detail}`).join("\n"));
});
```

Mutation cases. Each runs on a copy made with `cpSync(docs/prd, tmp, {recursive:true})`:

1. Rename one `story.1.N.S.slug/` directory, and its file, back to `story.N.S.slug`. Expect a finding.
2. Remove the `prd_number:` line from the PRD frontmatter. Expect a finding.
3. Copy one epic **document alone** into a sibling directory `epic.P.E.other/epic.P.E.other.md`
   (same `(P, E)`, different slug). Copying the whole directory duplicates its stories too.

Expected reasons, measured against the engine in review.1: (1) `bad-shape`, (2)
`frontmatter-mismatch`, (3) `duplicate-id`. Assert each produces **≥1 finding with that `reason`**.

### Phase 2: Chokepoint test

**File:** `tests/doc-id-chokepoint.test.js` (CommonJS, like `mutation-call-site-coverage.test.js`).

**Population.**

- Code: `git ls-files -- '*.js' '*.mjs' '*.cjs' '*.py' '*.sh' ':!skills/*/references/*'`, minus
  `shared/resources/doc-id.js`, which is the definition.
- Markdown: bash fences in `skills/*/SKILL.md` and `shared/resources/*.md`.

Use `git ls-files` rather than a directory walk, so an untracked scratch file never trips CI. Reuse
the fence extraction in `mutation-call-site-coverage.test.js`; read it first and lift the helper
rather than writing a second fence parser. If it is not exported, extract it into a tiny shared test
helper both files import.

**Shapes.** These are compound keys; each needs every listed part:

| Shape | Scope | Pattern (sketch) | Rationale |
|---|---|---|---|
| `id-regex-literal` | code | regex literal containing `(story\|epic\|prd)\\\.` followed by `\(\\d` / `\\d` / `\[0-9` / `\[1-9` / `\[\\d` | the id grammar; plain `story.` in a string does not hit |
| `id-regex-built` | code | `new RegExp(` on the same line as `` `^?(story\|epic\|prd)\\\\. `` | `create-story/scripts/lib.js:85` |
| `title-regex` | code | regex literal containing `\[?(Epic\|Story)\\s` followed by a digit class | `[Epic N]` / `Story N.N` summary parsers |
| `field-split` | md fence | `(awk -F\.\|cut -d\.)` on a line whose subject var matches `/(STORY\|EPIC\|PRD)[A-Z_]*/` | `review-pipeline-step-0a-branch-setup.md:111` (review-epic, a live defect) |
| `first-number` | md fence | `grep -oE '\[0-9\]\+' \| head -1` on a `(STORY\|EPIC\|PRD)` var | (no live site after task.206) |

**Comments are not regexes.** Strip comment text before matching the code shapes: a raw-line match
reports `finalise-fix-and-recheck.mjs:79` (JSDoc quoting the old regex) and two comments in
`finalise-fix-and-recheck.test.mjs`. Add one to `MUST_MISS`.

**Allowlist.** Use the shape of `mutation-call-site-coverage.test.js`'s list, for example
`{ "skills/develop-next/scripts/select-next.mjs": "roadmap prose grammar — `Epic 1.2` in a row's text, not a document id" }`.
`bug-doc.js` no longer hits (task.206 routed it through `doc-id.parse`).
The stale-entry test asserts that every allowlisted path exists, still matches ≥1 shape, and has a
reason of ≥20 characters.

**Non-vacuity.**

- The code population is ≥400 files. It was 455 on 2026-10-13.
- The Markdown population includes ≥1 fence.
- **Positive control:** run the shapes over `doc-id.js` itself, which was excluded from the
  population, and assert ≥1 hit. Without this, a shape typo matches nothing and the whole test
  passes vacuously.

**Fixture control table** (obs #135 / #176). This is an in-file array run through the same matcher:

```js
const MUST_HIT = [
  ["code", "const R = /story\\.(\\d+)\\.(\\d+)/;"],
  ["code", "new RegExp(`^epic\\\\.${n}\\\\.`)"],
  ["code", "s.match(/^\\s*\\[Epic\\s+(\\d+)\\]/)"],
  ["md",   "EPIC_NUM=$(echo \"$STORY_BASENAME\" | awk -F. '{print $2}')"],
];
const MUST_MISS = [
  ["md",   "TASK_ID=$(echo \"$TASK_BASENAME\" | awk -F. '{print $2}')"],   // different rule
  ["code", "const fixture = 'story.1.1.example';"],                         // fixture name, not a parser
  ["code", "const R = /task\\.(\\d+)/;"],                                   // task grammar, not in scope
  ["code", "// the old `story\\.\\d+\\.\\d+` stem admitted it"],              // a comment, not a parser
];
```

Every row varies the kind word, the variable name or the context.

### Phase 3: Prose sweep

1. Run the population command in task §7. Save the file list to the scratchpad.
2. Work file by file. For `skills/*/SKILL.md` and `shared/resources/*.md`, edit the **source** and
   never the `references/` copy, or `npm run bundle` reverts the fix. Replacements:
   - `story.{epic}.{story}` / `story.{E}.{S}` → `story.{P}.{E}.{S}`
   - `epic.{N}` / `epic.{number}` → `epic.{P}.{E}`
   - `epic/{n}.{slug}` → `epic/{P}.{E}.{slug}`
   - "the epic registry" (global counter) → "the PRD registry" / "the PRD's epics-index"
3. Literal example ids: rewrite `story.2.3.` → `story.1.2.3.` and `epic.178.` → `epic.1.178.`, so the
   examples parse under the new grammar. Keep the examples' numbers recognisable.
4. `AGENTS.md`: rewrite § File Naming's TL;DR, and replace § Epic Registry with § PRD Registry
   (canonical rules: `docs/standards/prd-registry.md`, from task.202).
5. A hit that is a historical quote, or a task/bug pattern caught by a loose grep, is listed as
   unaffected in the PR description with its reason.

### Phase 4: Regenerate

```bash
npm run bundle && npm run bundle:check
npm run generate-catalog
mv .agents/skills /tmp/agents-skills-aside 2>/dev/null; npm test && npm run eval:all; mv /tmp/agents-skills-aside .agents/skills 2>/dev/null
```

Commit the hand edits and the generated output separately.

## Key Patterns and References

- `evals/shared/tests/task-registry-drift.test.mjs`: imports the parser, `MIN_ROWS` floor, docblock
  explaining the failure it exists for.
- `tests/mutation-call-site-coverage.test.js`: canonical-sources scope, invocations-only fence rule,
  reasoned allowlist, §2 stale-entry test.
- `tests/key-lookup-single-statement.test.js`: another single-statement test, worth reading for its
  key/control discipline.
- AGENTS.md § Shared Resources: edit `shared/resources/` sources, never bundled `references/`.

## Testing Approach

- `command node --test tests/doc-id-chokepoint.test.js evals/shared/tests/doc-numbering-corpus.test.mjs`
- Mutation-prove every guard (Phase 1 cases, Phase 2 `MUST_HIT`). A guard that never went red has not
  been shown to work.
- Before believing a local green, move the gitignored `.agents/skills` symlink aside.
