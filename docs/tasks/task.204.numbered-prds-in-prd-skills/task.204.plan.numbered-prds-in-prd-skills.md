---
id: task.204.plan
title: "Implementation Plan: Numbered PRDs in the PRD skills"
type: plan
task-ref: task.204.numbered-prds-in-prd-skills.md
---

# Implementation Plan: Numbered PRDs in the PRD skills

> Requirements and success criteria: [task.204.numbered-prds-in-prd-skills.md](task.204.numbered-prds-in-prd-skills.md)

## Overview

This is prose and template work over six skills, plus one behavioural snippet test. Every number
and every verdict comes from task.202's `doc-id.js`, and every repair comes from task.203's
`migrate-doc-numbering.mjs`. This task only wires them into the PRD skills, and it never
re-derives a rule they own.

**The CLI spellings below are the plan's** (`next prd`, `check <path>`, `--check`). Phase 0
replaces them with what task.202 and task.203 actually shipped before anything is written.

> **Review 1 (2026-10-15) supersedes three details below; the task document wins where they differ.**
> `doc-id next prd` does not bootstrap a missing registry and no CLI writes a row — the row is written
> through `appendPrdRow` (task § *Dependencies consumed*, Phase 1). The review report name is the full
> stem `prd.{P}.{feature}.review.{n}.{name}.md` (`file-naming.md:84`), not `prd.{P}.review.…`. The
> migration offer reads `blockers[]` and passes `--name` for a monolith. See
> `task.204.review.1.numbered-prds-in-prd-skills.md`.

## Phase-by-Phase Implementation Guide

### Phase 0: Gate

```bash
grep -E '^\| (202|203) ' docs/tasks/task-registry.md     # both must read accepted
test -f shared/resources/doc-id.js && test -f shared/resources/migrate-doc-numbering.mjs
command node shared/resources/doc-id.js --help
command node shared/resources/migrate-doc-numbering.mjs --help
```

Record the subcommands, flags and the full `reason` vocabulary in the implementation report.

### Phase 1: `create-prd`

**Files to modify:** `skills/create-prd/SKILL.md`

1. **Mode Parameter table** (§ *Mode Parameter*, the rows at `:45-46`):

   ```markdown
   | `brownfield` | yes | direct activation                | `brownfield-prd-template` | `${PRD_ROOT}/{domain}/prd.{P}.{feature}/prd.{P}.{feature}.md` |
   | `greenfield` | no  | delegated from `new-product-prd` | `prd-template`            | `${PRD_ROOT}/{product}/prd.{P}.{product}/prd.{P}.{product}.md` |
   ```

   Add one sentence below it: `{P}` is allocated in Step 1c and never typed by hand.

2. **New § Step 1c — Allocate the PRD number.** It sits after 1a/1b (brownfield) and after the
   Project Brief check (greenfield):

   ```bash
   source references/resolve-paths.sh || exit 1
   command node references/doc-id.js next prd --prd-root "$PRD_ROOT" --json
   ```

   Then a reason table: `ok` means use `.number`. Map every other value to HALT with the
   engine's message verbatim, using the vocabulary recorded in Phase 0. When continuation (1a)
   found an existing PRD and the user did not pick "create a new PRD", **skip this step**: read
   `prd_number` from the found file. If the found file has no `prd_number`, it is a legacy PRD.
   Stop and point the user at `/review-prd`, which offers the migration. Never allocate a fresh
   number for an existing document.

3. **Step 2 invocations** (`:303-318`): replace both `Output:` lines with the numbered path, plus
   `Frontmatter: name: prd.{P}.{feature}, prd_number: {P}`.

4. **§ PRD Frontmatter (OKF conformance)** (`:150-152`): add `prd_number` (integer, required) to
   the field list and tie `name` to `prd.{P}.{feature}`.

5. **Registry row.** In Step 2, immediately after the first write of the file, call the engine's
   row writer if task.202 ships one. Otherwise append the row in the shape
   `docs/standards/prd-registry.md` specifies. Do not restate the column list here; cite the
   standard.

6. **New § Step 3.5 — Numbering check (blocking)**, placed after Step 3 and before Step 4:

   ```bash
   source references/resolve-paths.sh || exit 1
   command node references/doc-id.js check "$PRD_FILE" --json
   ```

   `ok` means continue. Anything else means HALT with `reason` and the engine's fix line. Write a
   sentence saying why this blocks, unlike card-preflight: the skill chose the name, so a failure
   is the skill's own defect, not an authoring gap.

7. **§ Documentation-Only Scope**: in *Forbidden* (`:56`) and *Allowed writes* (`:65`), drop
   `docs/prd.md` and add `${PRD_ROOT}/prd-registry.md`.

8. **§ IMPORTANT — Epic Numbering** (`:515-516`), replacement text:

   > Epic files created from this PRD are named `epic.{P}.{E}.{name}`. `P` is this PRD's number and
   > `E` counts within this PRD, so "Epic 1" in this document **is** `epic.{P}.1`. There is no
   > separate global epic number.

9. **Completion / Step 4 tail**: add one instruction. Commit the PRD file and
   `${PRD_ROOT}/prd-registry.md` together, in one commit, on `develop` or the planning branch. The
   skill does not commit.

10. **§ Example Activations** (`:720`): the greenfield example returns the numbered path.

### Phase 2: Templates, `new-product-prd`, `shard-prd`

**Files to modify:**

- `skills/prd-template/resources/prd-tmpl.yaml:7` and `skills/prd-template/SKILL.md:261`
- `skills/brownfield-prd-template/resources/brownfield-prd-tmpl.yaml:7` and `skills/brownfield-prd-template/SKILL.md:171`

```yaml
  output:
    format: markdown
    filename: "{{prd_root}}/{{domain}}/prd.{{prd_number}}.{{feature}}/prd.{{prd_number}}.{{feature}}.md"
```

This follows `skills/create-story/resources/story-template.yaml:7`, which already puts
placeholders in `output.filename`. Also:

- Epic-numbering notes (`prd-tmpl.yaml:141`, `brownfield-prd-tmpl.yaml:237`): the same replacement
  text as Phase 1 step 8.
- Template-level instruction, as a top-of-file comment and a sentence in each SKILL.md:
  `prd_number` is allocated by `/create-prd`. When it is unfilled, stop and run `/create-prd`. Do
  not invent one.

`skills/new-product-prd/SKILL.md:67` and `:98`: the numbered greenfield path.

`skills/shard-prd/SKILL.md`:

- Method 1 (`:85-88`):

  ```bash
  source references/resolve-paths.sh || exit 1
  # PRD_FILE is the numbered PRD, e.g. docs/prd/shop/prd.3.shop/prd.3.shop.md
  md-tree explode "$PRD_FILE" "$(dirname "$PRD_FILE")"
  ```

- Method 2 step 1 (`:120-123`): a PRD special case. The target folder is the PRD's own
  directory, and the numbered file stays in place as the entry point.
- Add a legacy guard ahead of both methods. When the requested source is a root-level
  `docs/prd.md`, stop. Report that it predates numbered PRDs and point the user at `/review-prd`.
- Examples (`:21`, `:276-280`) use the numbered path.

### Phase 3: `review-prd` and the reader sites

**Files to modify:** `skills/review-prd/SKILL.md`, plus the ten reader sites (task doc § 7).

1. **Input Resolution** (`:90-125`). Add input rows for `prd.{P}` and a bare integer `P`. The
   rules:
   - Glob `${PRD_ROOT}/**/prd.{P}.*/prd.{P}.*.md`. The literal `.` after `{P}` keeps `1` from
     matching `12`.
   - Filter every glob result through `doc-id.js parse`, keeping `kind === "prd"` with no artifact
     infix. This stops `prd.1.review.2.x.md` from resolving as the PRD.
   - Keep the slug glob as a fallback, and apply the same filter to it.
2. **Step 1** (`:186-199`):
   - Replace item 6 ("Load epic registry") with: load `${PRD_ROOT}/prd-registry.md` and the PRD's
     `<!-- epics-index-start/end -->` block.
   - Make the child-epic globs (`:191`, `:194`) relative to the resolved PRD directory.
3. **Step 2** (`:224-226`): replace the two naming bullets with the subsection below.

   ```markdown
   - **Numbering (blocking).** Run
     `command node references/doc-id.js check "<prd dir>" --json` (or once per document if `check`
     takes files only). Each non-`ok` result is a **Critical** issue carrying the engine's
     `reason`: registry missing · PRD unnumbered · dir/stem/frontmatter disagree · epic/story
     unnumbered or carrying a different `P`.
   - When any fire, run `command node references/migrate-doc-numbering.mjs --check --prd-root "$PRD_ROOT" --json`
     and hold its planned renames for QUESTION POINT 1.
   ```

4. **QUESTION POINT 1** (`:341`): add a question, *"Apply the numbering migration now?"*, with
   options *Apply* (Recommended) and *Skip*. The question shows the planned renames. On *Apply*,
   run the apply mode and then re-run the Step 2 check. Its results replace the findings.
5. **Step 5 and Step 6 tables** (`:395-397`, `:411-413`): `epic.{P}.{E}.name` and
   `story.{P}.{E}.{S}.name`.
6. **Report name** (`:140`, `:597-599`, `:779`): change to
   `${PRD_DIR}/prd.{P}.review.{n}.{feature}.md`. N is the highest existing `prd.{P}.review.*`
   plus 1. Use `references/newest-numbered.sh` `next_numbered` if it fits the infix shape;
   otherwise use the `find -maxdepth 1 -name` form from task.137, never `ls <glob>`.
7. **§ Critical Files Reference** (`:819`): the epic-registry row becomes the PRD registry.
8. **Reader sites.** Replace each `docs/prd.md` with one sentence:

   > the PRD under `${PRD_ROOT}/**/prd.{P}.*/prd.{P}.*.md` (ask which when several exist)

   Keep each site's wording otherwise unchanged. The YAML templates under
   `create-architecture-doc` carry the path inside an `instruction:` string, so edit only that
   string.

### Phase 4: Test, bundle, catalog

**New file:** `evals/shared/tests/prd-skill-numbering.test.mjs`. It is already reached by
`package.json`'s `'evals/shared/tests/*.test.mjs'` glob, so no `package.json` edit is needed.

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { makeConsumerRoot } from "../lib/consumer-root.mjs";

// Slice the live fenced block that follows a heading. The test tracks the shipped text.
function liveSnippet(file, heading) { /* read, find heading, return first ```bash block */ }

// Row 1: an empty tree allocates 1 and bootstraps the registry.
// Row 4: stripping prd_number makes the Step 3.5 snippet exit non-zero.
// Row 7: resolving "1" next to prd.12.* and two review reports picks the PRD, and N is 3.
```

Mutation proofs to run and record in the implementation report:

- Remove the HALT in Step 3.5 → row 4 is red.
- Restore the `prd.*{name}*` glob without the parse filter → row 7 is red.
- Make the allocation snippet compute `ls | wc -l` → row 2 is red.

Then run:

```bash
npm run bundle && npm run bundle:check
npm run generate-catalog
npm run validate -- skills/create-prd/ && npm run validate -- skills/review-prd/   # and every touched skill
mv .agents/skills /tmp/agents-skills-aside 2>/dev/null; npm test; mv /tmp/agents-skills-aside .agents/skills 2>/dev/null
```

## Key Patterns and References

- **Snippet-execution test**: `evals/shared/tests/optional-file-lookups.test.mjs` (slice the live
  line, scratch `makeConsumerRoot`, assert values).
- **Placeholder output filename**: `skills/create-story/resources/story-template.yaml:7`.
- **Blocking-vs-advisory contrast**: `shared/resources/authoring-card-preflight.md`. This task's
  check is deliberately the blocking kind, and the prose must say why.
- **Commit handed to the user**: `skills/create-task/SKILL.md` § 1 *Registry update*. That is the
  same shape, for a skill that may not commit.
- **Cite or depend**: naming `references/doc-id.js` in a `SKILL.md` makes it a bundled dependency.
  That is intended for `create-prd` and `review-prd`. Do not name it in `new-product-prd`, which
  delegates.

## Testing Approach

The test rows and controls are listed in task doc § 8. Every snippet runs under bash in a
`makeConsumerRoot` scratch tree, so `.agents/skills/...` paths resolve the way they do in a
consumer, not through the developer's gitignored symlink.
