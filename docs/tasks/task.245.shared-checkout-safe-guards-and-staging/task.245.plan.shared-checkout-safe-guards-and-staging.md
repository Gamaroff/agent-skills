---
id: task.245.plan
title: "Implementation Plan: Shared-checkout-safe guards and staging"
type: plan
task-ref: task.245.shared-checkout-safe-guards-and-staging.md
---

# Implementation Plan: Shared-checkout-safe guards and staging

> Requirements and success criteria: [task.245.shared-checkout-safe-guards-and-staging.md](task.245.shared-checkout-safe-guards-and-staging.md)

## Overview

Give `registry-tick.js` a `--stage` flag that stages one row through the index (the manual
`hash-object` / `update-index` workaround from task.242, made an engine behaviour), move its three
committing callers onto it, and split the re-review dirty-tree HALT into "halts" and "warns" keyed on
the PR's change set.

## Phase-by-Phase Implementation Guide

### Phase 1: `registry-tick.js --stage`

**Files to modify:**

- `shared/resources/registry-tick.js`: `parseArgs` (`function parseArgs(argv)`, the `--dry-run`
  arm is `else if (a === "--dry-run") out.dryRun = true;`), and a new `stageRow()` called from the
  tick, `annotate()` and `bugStatus()` result paths.
- `shared/resources/tests/registry-tick.test.mjs`: new `--stage` cases.

**Exact changes:**

```js
// parseArgs
else if (a === "--stage") out.stage = true;
// after parsing
if (out.stage && out.dryRun) usage("--stage and --dry-run are exclusive");
```

```js
// Stage only the row this run wrote. The working file may hold other sessions' edits; the index
// gets the HEAD-or-index copy with this one row replaced, so those edits stay unstaged.
function stageRow(registryPath, rowId, rowLine) {
  const run = (args, input) =>
    execFileSync("git", args, { input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
  let ls;
  try { ls = run(["ls-files", "-s", "--", registryPath]).trim(); }
  catch { return { staged: false, stageReason: "not-a-repo" }; }
  if (!ls) return { staged: false, stageReason: "not-tracked" };
  const mode = ls.split(/\s+/)[0];
  const indexText = run(["show", `:${registryPath}`]);
  const lines = indexText.split("\n");
  const i = lines.findIndex((l) => rowIdOf(l) === rowId);   // reuse the engine's row parser
  if (i < 0) return { staged: false, stageReason: "row-not-in-index" };
  if (lines[i] === rowLine) return { staged: true, stageReason: "already-staged" };
  lines[i] = rowLine;
  const hash = run(["hash-object", "-w", "--stdin"], lines.join("\n")).trim();
  run(["update-index", "--cacheinfo", `${mode},${hash},${registryPath}`]);
  return { staged: true, stageReason: "staged" };
}
```

- `rowIdOf` is whatever the engine already uses to match a row to a document (the code around
  `locateSelector` / the row scan feeding `row.line`). Reuse it; do not write a second row regex.
- Run git from the registry's repository (`cwd` = the registry's directory, `registryPath` relative
  to the top level from `git rev-parse --show-prefix`), so a caller in a subdirectory works.
- Call `stageRow` on `ticked`, `annotated`, `mirrored` and on `already` (the resume case), only when
  `opts.stage`. Merge its two fields into the payload `emit()` prints. Never change the exit code.

**Test cases** (scratch repo per test, `git init`, a registry with rows 1 and 2 committed):

1. Working file: row 2 ticked by the engine, plus an uncommitted row 3 and `Next Available` bumped.
   After `--stage`: `git diff --cached` touches only row 2; `git diff` shows row 3 and the counter.
2. Index copy lacks row 3; run on row 3's document → `row-not-in-index`, exit 0, index unchanged.
3. Row 2 sits on line 9 of the working file and line 8 of the index (an extra line above it in the
   working tree only) → staged by id; the index line 8 changes.
4. Second run → `already` + `already-staged`, `git diff --cached` unchanged.
5. Registry untracked → `not-tracked`. Outside a repo → `not-a-repo`.
6. `--annotate --stage` → case 1's assertions with the notes cell.
7. `--stage --dry-run` → exit 2.

### Phase 2: Registry callers

**`skills/finalise/SKILL.md`:**

- The Step 7.4 call (`node .agents/skills/finalise/references/registry-tick.js \`, around line 1433)
  gains `--stage`. Its reason table gains one line: log a `stageReason` other than `staged` /
  `already-staged` in the DoD file's Step 5, verbatim.
- 6a: delete the block

  ```bash
  if [ -f docs/tasks/task-registry.md ]; then
    git add docs/tasks/task-registry.md
    ...
  fi
  ```

  and replace its comment with one line: the registry row is staged by Step 7.4's `--stage`, so a
  parallel session's edits in the same file stay out of this commit (obs #127).
- Step 7.6b's tracked-and-pushed assertions: if they check the registry is clean after the commit,
  change that to "the ticked row is in HEAD" (`git show HEAD:docs/tasks/task-registry.md | grep` the
  row). The working file may legitimately stay dirty.

**`skills/develop-next/SKILL.md` Step 4 registry arm** (lines ~603–640):

```bash
node .agents/skills/develop-next/references/registry-tick.js --annotate --stage \
  --file <doc> --pr <n> [--issue "<[#N](url)>"] --json
```

- `already` resume: `git diff --cached --quiet HEAD -- docs/tasks/task-registry.md || git commit -m …`
  (no `git add`). The `--stage` on the re-run has already put the row in the index.
- `annotated`: `git commit -m "docs(registry): record <id> — PR #<n> merged"` (no `git add`), then push.

**`skills/develop-batch/SKILL.md` merge lane** (line ~643): the same flag and the same wording change
in prose.

**New test `shared/resources/tests/finalise-6a-registry-staging.test.mjs`:** slice the 6a block from
`skills/finalise/SKILL.md` as `evals/shared/tests/finalise-bug-mode.test.mjs` does, but past the
marker. Run it in a scratch repo after running `registry-tick.js --stage` on a task document, with
the working registry also holding a parallel row. Assert `git show HEAD:docs/tasks/task-registry.md`
has the ticked row and not the parallel row, and the working file still has the parallel row.

### Phase 3: Re-review HALT keyed on the review's input

**Exact change, applied identically to `shared/resources/qa-re-review-scope.md` (canonical),
`skills/qa-task/SKILL.md` and `skills/qa-story/SKILL.md`.** Replace the two `DIRTY=` lines with:

```bash
  # TRACKED changes HALT only when the review reads them: a path in the PR's change set, or in a
  # directory that holds one. Any other tracked edit belongs to something else in this checkout (a
  # parallel session's registry row, obs #126) and only warns, like an untracked file. A change set
  # that cannot be listed falls back to halting on every tracked edit.
  DIRTY=$(git status --porcelain --untracked-files=no -- . ":(exclude)$WORK_ITEM_DIR" ":(exclude).claude/state")
  if [ -n "$DIRTY" ]; then
    if CHANGED=$(git -c core.quotePath=false diff --name-only "$BASE...HEAD" 2>/dev/null); then
      CHANGED_DIRS=$(printf '%s\n' "$CHANGED" | sed -n 's#/[^/]*$##p' | sort -u)
      HALTS="" WARNS=""
      while IFS= read -r line; do
        p=${line#???}; p=${p##* -> }               # porcelain v1: "XY path" or "XY old -> new"
        d=${p%/*}; [ "$d" = "$p" ] && d=""
        if printf '%s\n' "$CHANGED" | grep -qxF -- "$p" \
           || { [ -n "$d" ] && printf '%s\n' "$CHANGED_DIRS" | grep -qxF -- "$d"; }; then
          HALTS="$HALTS$line"$'\n'
        else
          WARNS="$WARNS$line"$'\n'
        fi
      done <<EOF
$DIRTY
EOF
    else
      HALTS="$DIRTY"$'\n' WARNS=""
    fi
    [ -z "${HALTS%$'\n'}" ] || { echo "HALT: uncommitted changes outside the work item — commit the fix before re-review (the scope reads committed history):"; printf '%s' "$HALTS"; exit 1; }
    [ -z "${WARNS%$'\n'}" ] || { echo "warning: uncommitted changes outside the review scope are not in this review:"; printf '%s' "$WARNS" | sed 's/^/  /'; }
  fi
```

Notes for the implementer:

- Keep the HALT message text unchanged; L4/L11 and Phase 0 consumers match it.
- `$'\n'` is bash and zsh; the block already runs under both (the test's `[${sh}]` loop).
- A root-level file has no directory (`d=""`); it halts only if it is itself in the change set. A
  root-level changed file must not make every root file halt, so `CHANGED_DIRS` excludes the empty
  directory (the `sed -n …p` prints only paths that contain a `/`).
- Quoted paths: `core.quotePath=false` on the diff; porcelain quotes paths with special characters,
  so use `git status --porcelain -z` if the tests show a quoting mismatch. Decide by test, not by
  assumption.

**Tests in `qa-scope-from-head.test.mjs`** (inside the existing `for (const sh of …)` loop):

- `M1 — a tracked edit outside the change set and its directories warns and the review runs (obs #126)`:
  edit a committed file under a directory the feature branch never touched (commit `other/x.sh` on
  the base before branching, then append to it). Assert exit 0, the warning names `other/x.sh`, and
  `r.patch` is non-empty.
- `M2 — a tracked edit beside a changed file HALTs`: commit `skills/c.sh` on the base, append to it
  (the branch changed `skills/a.sh` and `skills/b.sh`). Assert exit 1 and the HALT names `skills/c.sh`.
- `M3 — an unlistable base HALTs on any tracked edit`: set `BASE=origin/nope`, dirty `other/x.sh`.
  Assert exit 1.
- Control: M1's file is not a registry and not under `docs/`.

### Phase 4: Bundle and sweep

```bash
npm run bundle
npm run bundle:check
grep -rn 'uncommitted changes outside the work item' --include=*.md . | grep -v node_modules
grep -rn 'git add docs/tasks/task-registry.md' --include=*.md . | grep -v node_modules
```

Each hit is either updated or listed in the implementation report as unaffected (a bundled copy, a
historical QA report).

## Key Patterns and References

- `newest-numbered.sh` and `qa-cycle.sh` show the house style for a sourced helper; this task needs
  none, because the staging lives in the engine.
- The JSON-`reason` contract: every outcome exits 0 and carries a `reason`; `--stage` adds a second
  field (`stageReason`) instead of overloading `reason`, so existing callers that switch on `reason`
  are unaffected.
- task.128 (`commit-changes --scope`) is the precedent for "stage what is mine, not the tree".

## Testing Approach

- `command node --test shared/resources/tests/registry-tick.test.mjs shared/resources/tests/qa-scope-from-head.test.mjs shared/resources/tests/finalise-6a-registry-staging.test.mjs`
- Add the new test file to `package.json`'s test globs if `shared/resources/tests/*.test.mjs` is not
  already covered (check; a new suite outside the globs runs nowhere).
- Mutation proofs as listed in the task document § 8, each recorded with its red output.
- `npm run ci` with `.agents/skills` moved aside.
