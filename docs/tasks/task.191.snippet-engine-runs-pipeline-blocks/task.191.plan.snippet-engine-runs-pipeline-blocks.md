---
id: task.191.plan
title: "Implementation Plan: Snippet engine runs pipeline blocks"
type: plan
task-ref: task.191.snippet-engine-runs-pipeline-blocks.md
---

# Implementation Plan: Snippet engine runs pipeline blocks

> Requirements and success criteria: [task.191.snippet-engine-runs-pipeline-blocks.md](task.191.snippet-engine-runs-pipeline-blocks.md)

## Overview

Three engine changes in `shared/resources/qa-execute-snippets.mjs`, each behind its own flag or
condition, then the two QA callers and the rule document. The allow-list stays the boundary
throughout.

## Phase 1: `--slot`

- `main` (`case "--bind":` at `:1899`): add `case "--slot":` with the same `NAME=VALUE` validation;
  collect into `slots` (a `Map`). Reject a name that does not match `PLACEHOLDER_PATTERNS`' name
  grammar (`[A-Za-z][\w .:|/-]*`).
- A pure `applySlots(code, slots)` replaces `{NAME}` (not preceded by `$`) and `<NAME>` in argument
  position. Reuse the two regexes in `PLACEHOLDER_PATTERNS` (`:778`) with the name fixed, so slot
  detection and slot filling agree by construction.
- Call it once per block, **before** `classifyBlock` and before `runBlock`. Classify the substituted
  text.
- Placeholder reason: list unfilled slots (`template slot: {task-directory}, <id>`). At the
  `zero-blocks-executed` detail (`:1804`), branch on whether the placeholders are slots or unbound
  variables and name `--slot` or `--bind`.

## Phase 2: Helper calls

In `classifyBlock`, before the `unknown` filter (`:1306`), compute `extraKnown`:

```js
// For each segment whose first word is bash|sh|source|.:
//   path = next word; refuse if it contains $ ` * ? [ or (  (not literal)
//   abs  = realpath(resolve(helperRoot, path)); refuse if !isWithin(helperRoot, abs) — isWithin
//          is already imported from this file's helpers (see security-probe.mjs import list)
//   refuse unless statSync(abs).isFile() && abs.endsWith(".sh")
//   sub  = classifyBlock(readFileSync(abs, "utf8"), bindings, { helperRoot, depth: depth + 1 })
//   depth > 2 → refuse ("helper nesting too deep")
//   sub.klass !== "runnable" → return { klass: "mutating", reason: `helper ${path}: ${sub.klass}: ${sub.reason}` }
//   for source/. : add every /^\s*(?:function\s+)?([A-Za-z_][\w-]*)\s*\(\)\s*\{/m name to extraKnown
// The runner word itself (bash/source/.) is then known for that segment only.
```

Segmenting: reuse `commandWords` (it already yields per-command words). Read its contract before
using it for "first word of a segment". It may already split `source x || exit 1`. When
`helperRoot` is absent (library callers, today's behaviour), skip the branch entirely.

`runBlock` (`:1437`) receives the temp copy path; pass it to `classifyBlock` as `helperRoot`.
Classification currently happens before the copy exists: check the order in the main loop and move
classification after seeding if needed. **The copy must exist when a helper is resolved**, or every
helper resolves to nothing.

Note that the helper's text is classified as a block, so its `#!/usr/bin/env bash` and `set -e`
lines must classify as harmless. Run the real `qa-cycle.sh` and `newest-numbered.sh` through it
early. If either classifies `mutating` for a reason that is not a real write, record it. Do not
widen `SAFE_COMMANDS` to make it pass: that is a separate decision for the author.

### Phase 2 measurement (`5f09b4da`, 2026-10-07)

Command: for each `shared/resources/*.sh` (not `*.test.sh`), rewrite `name() {` to `{`, run
`commandWords`, and list the words that are neither in `SAFE_COMMANDS` nor defined in the file. 29
files. Read-only today once definitions are understood: `bitbucket-auth.sh` and `newest-numbered.sh`.
`qa-cycle.sh` is left only with `shopt` and an `<unparseable>` from its `case` pattern line (`:79`)
and array append (`:118`). Every other helper names a real writer (`mktemp`, `mv`, `rm`, `git push`,
`gh`, `curl`, …) and must stay refused. That is the control population, not a list to fix.
Unparsed words to teach, and nothing else: function definitions, `case` pattern lines,
`name+=(…)`, `shopt -s|-u`, `local`. Re-run the measurement after Phase 2. It is the population the
test reads, and the test records the figures; this paragraph is not a contract.

## Phase 3: `--diff-base`

```js
// in the repo (process.cwd()), not the copy:
const r = spawnSync("git", ["diff", "-U0", rev, "--", file], { encoding: "utf8" });
if (r.status !== 0) → exit 2 { reason: "bad-diff-base", detail: r.stderr }
// parse "@@ -a,b +c,d @@" → ranges [c, c+max(d,1)-1] (d=0 means a pure deletion: mark the line c)
```

Each block already carries its start/end line (the report lists line numbers). Mark `changed` on
overlap. Summary: `changed: { total, runnable, placeholder, mutating, executed }`. Finding:

```json
{ "kind": "changed-blocks-not-executed", "detail": "N changed block(s), none executed", "blocks": [{ "line": 42, "klass": "mutating", "reason": "…" }] }
```

## Phase 4: callers

- `qa-runnable-prose-detection.md`: a "Helper calls" subsection stating the three conditions and the
  depth bound, and that `SAFE_COMMANDS` is unchanged.
- qa-task Step 4b (`:851`) and qa-story (`:1228`):

  ```bash
  node references/qa-execute-snippets.mjs --file "$SKILL_FILE" --diff-base "origin/{base-branch}" \
    --copy-as .agents:.agents --json
  ```

  Add "pass `--slot NAME=VALUE` for each `{NAME}` the work item supplies" and "report `changed`
  first; `changed-blocks-not-executed` is a finding about the change, not the file". Find the parity
  test that pins the two blocks (`git grep -ln 'qa-execute-snippets' tests evals shared/resources/tests`)
  and keep both texts identical where it requires. Note: `--copy-as` refuses an existing `DEST`;
  check the main loop seeds before the flag is processed.

## Key Patterns and References

- Allow-list rationale: `shared/resources/qa-runnable-prose-detection.md`.
- `isWithin` / `snapshotTree` / `sandboxEnv`: exported from this file and reused by
  `security-probe.mjs`. Keep the exports stable.

## Testing Approach

Run the test file alone first (load-sensitive), then `npm test`. Record both mutation proofs' red
output in the implementation report.
