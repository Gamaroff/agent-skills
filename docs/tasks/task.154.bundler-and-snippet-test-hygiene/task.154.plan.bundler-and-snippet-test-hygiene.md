---
id: task.154.plan
title: "Implementation Plan: Bundler and snippet-test hygiene — attributed warning, symlink-free test run"
type: plan
task-ref: task.154.bundler-and-snippet-test-hygiene.md
---

# Implementation Plan: Bundler and snippet-test hygiene

> Requirements and success criteria: [task.154.bundler-and-snippet-test-hygiene.md](task.154.bundler-and-snippet-test-hygiene.md)

## Overview

The task has two independent halves. **Obs #151** (Phases 1–3) removes one prose literal, carries a
citation's origin through `discover_needed` so the `not found` warning names `file:line`, and adds
a test that reads that warning in CI. **Obs #149** (Phases 4–6) hoists the consumer-root builder
into one helper, adds a clone-based runner that is the local equivalent of CI's checkout, and
writes the rule down. The halves share no file and can go in two PRs.

All line numbers below were measured on `e04de749` (2026-09-24). Each is paired with an identifier
so it can be found again after the file changes.

## Phase-by-Phase Implementation Guide

### Phase 1: Remove the placeholder literal

**File**: `shared/resources/observation-log-contract.md`, § *A note on the sibling references*,
line 290.

Before (lines 288–291):

```markdown
breaks the moment the bundler copies this file into a skill's `references/` directory — which it
does, without bringing unrelated siblings along, because it keys on the literal
`shared/resources/<name>` form and never sees a `./`-prefixed link. Writing them in that linkable
```

After: describe the form without writing it out. Do **not** use `shared/resources/{name}`, because
`SHARED_REF_RE` accepts braces too (measured: `collect_shared_refs` returns `['{name}']`).

```markdown
breaks the moment the bundler copies this file into a skill's `references/` directory — which it
does, without bringing unrelated siblings along, because it keys on the literal shared-resources
path form (the directory name, a slash, a file name) and never sees a `./`-prefixed link. Writing
them in that linkable
```

Then run `npm run bundle`. `skills/observe-work/references/observation-log-contract.md` is
regenerated, and its line 290, which pass 3 had turned into `references/<name>`, now reads
correctly. Check `npm run -s bundle 2>&1 | grep -c 'not found'` → `0`.

### Phase 2: Attribute the warning

**File**: `skills/create-skill/scripts/bundle_skill.py`

1. **A line-aware collector**, placed next to `comment_only_refs` (`:134`). Keep
   `collect_shared_refs` in `quick_validate.py:42` unchanged, because `package_skill.py` and
   `quick_validate.py` call it with the list-of-names contract.

   ```python
   def shared_refs_with_lines(text):
       """[(line_no, name)] for every shared/resources/<name> citation — the same
       match and punctuation strip as quick_validate.collect_shared_refs, plus the
       line, so a missing source can be reported against its origin."""
       out = []
       for i, line in enumerate(text.split('\n'), 1):
           for m in re.finditer(r'(?<![\w-]/)shared/resources/([^\s`\'")\]*]+)', line):
               name = m.group(1).rstrip('.,;:')
               if name:
                   out.append((i, name))
       return out
   ```

   Parity with `collect_shared_refs` is a test assertion, not something to hope for. §1 of the new
   test compares the two on a fixture text.

2. **Carry the origin in `pending`** (`discover_needed`, `:509`). Change the entries from `name` to
   `(name, origin)`, where `origin = (rel_path, line_no)` or `None`:
   - skill files (`:520`): `pending.extend((n, (rel(f), ln)) for ln, n in shared_refs_with_lines(text))`
   - shared sources (`:559`): the same, with `rel(src)`
   - JS/shell sibling edges (`JS_SIBLING_RE`, `JS_ESM_SIBLING_RE`, `SH_SIBLING_RE`): origin
     `(rel(src), None)`, since the file is known and the line is optional
   - `pending_quiet` is unchanged. It never warns.

   `rel()` is `path.relative_to(repo_root)` with the same `ValueError` fallback that
   `warn_comment_only_refs` (`:156`) uses. The pop loop unpacks `name, origin = pending.pop()`.
   **`seen` stays keyed on `name` alone**, so resolution behaviour is identical.

3. **The warning** (`:552`), deduplicated in the same way as `_WARNED_COMMENT_ORIGINS` (`:153`):

   ```python
   _WARNED_MISSING = set()
   ...
   if not src.is_file():
       if not quiet:
           where = f"{origin[0]}:{origin[1]}" if origin and origin[1] else (origin[0] if origin else "an unrecorded origin")
           key = (name, where)
           if key not in _WARNED_MISSING:
               _WARNED_MISSING.add(key)
               print(f"⚠️  shared/resources/{name} not found — cited at {where}")
       continue
   ```

   Because `seen` is per skill, a shared source bundled by N skills would otherwise print N times
   under `--all`. The dedupe set prevents that, for the same reason given in the comment above
   `_WARNED_COMMENT_ORIGINS`.

### Phase 3: CI reader — `tests/bundle-missing-source.test.js`

Model it on `tests/bundle-comment-origin.test.js`: `REPO_ROOT`, `BUNDLER`, and a fixture root built
with `fs.mkdtempSync` holding `shared/resources/` and `skills/<fixture>/`. Run
`execFileSync("python3", [BUNDLER, skillDir])`.

- **§1 fires and attributes.** Fixture `shared/resources/a.md` has `shared/resources/missing.md` on
  line 3. Fixture `skills/fx/SKILL.md` cites `shared/resources/a.md`. Assert that stdout contains
  `shared/resources/missing.md not found — cited at shared/resources/a.md:3` exactly once, counting
  matches rather than using `includes`. Then run the bundler on a second fixture skill that also
  bundles `a.md`, in one `--all`-style invocation over the fixture root, and assert the count is
  still one.
- **§1 negative.** The same fixture with line 3 rephrased in words produces zero `not found` lines.
  Without this half, a test that always passed would prove nothing.
- **§1 parity.** For a fixture text with several citations, `shared_refs_with_lines` names equal
  `collect_shared_refs`. Import both through `python3 -c`.
- **§2 live tree.** `execFileSync("python3", [BUNDLER, "--check"], { cwd: REPO_ROOT })`. Assert zero
  lines matching `/not found/`. Assert the summary line `bundle freshness: (\d+) skill\(s\) checked`
  captures ≥ 100, which is the non-vacuity floor (129 on 2026-09-24).

Mutation table: see task § 8. Revert each change, record the red output, and restore.

### Phase 4: Consumer-root helper

**New file**: `evals/shared/lib/consumer-root.mjs`

```js
import { mkdtempSync, mkdirSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * A consumer-shaped root: a temp dir whose `.agents/skills` points at this
 * repository's `skills/`, which is what setup-consumer.sh gives a real consumer.
 * Run any snippet that reaches `.agents/skills/<name>/…` from HERE, never from
 * the repo root: the repo root resolves that path only through the developer's
 * gitignored symlink (.gitignore `.agents/skills`), which CI does not have
 * (obs #149).
 */
export function makeConsumerRoot(repoRoot, prefix = "consumer-") {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  mkdirSync(path.join(root, ".agents"));
  symlinkSync(path.join(repoRoot, "skills"), path.join(root, ".agents", "skills"));
  process.on("exit", () => rmSync(root, { recursive: true, force: true }));
  return root;
}
```

A consumer root under `tmpdir()` is fine. The `EPHEMERAL_PATTERNS` restriction applies to the
observation-log **workspace** and to the runner's **clone**, not to a snippet's cwd. Both hand-rolled
copies already live under `tmpdir()` and pass on CI.

**Migrate** `evals/shared/tests/finalise-bug-mode.test.mjs:54–62` and
`evals/shared/tests/optional-file-lookups.test.mjs:42–50` to
`const CONSUMER_ROOT = makeConsumerRoot(REPO_ROOT, "finalise-consumer-")` (and `"ofl-consumer-"`).
Keep each file's explanatory comment above the call. Drop imports that become unused
(`symlinkSync`, and `mkdirSync` if nothing else uses it).

**New test**: `evals/shared/tests/consumer-root.test.mjs`

- The helper root has `.agents/skills/finalise/references/newest-numbered.sh` as a readable file.
- Spawning `bash --noprofile --norc -c 'source .agents/skills/finalise/references/newest-numbered.sh && type newest_numbered'`
  with `cwd: makeConsumerRoot(REPO)` exits 0.
- **Premise**: the same command with `cwd` set to a bare `mkdtempSync` directory exits non-zero.
  This proves the hazard does not depend on the developer's checkout.

### Phase 5: Clean-checkout runner

**New file**: `scripts/test-clean-checkout.sh` (bash, `set -euo pipefail`, shellcheck-clean):

```bash
#!/usr/bin/env bash
# Run the suite on what CI runs it on: a clone of HEAD — full history and tags,
# tracked files only, no gitignored paths (no `.agents/skills` symlink). An
# in-place `npm test` passes on anything the developer's checkout supplies and
# CI's does not (obs #149).
set -euo pipefail
REPO=$(git rev-parse --show-toplevel)
DIR=${CLEAN_CHECKOUT_DIR:-"$REPO/.clean-checkout"}
case "$DIR" in
  /tmp|/tmp/*|/private/tmp|/private/tmp/*|/var/tmp|/var/tmp/*)
    echo "test-clean-checkout: refusing $DIR — a temporary directory is classified ephemeral and observation-log.test.mjs refuses it" >&2
    exit 2 ;;
esac
[ -n "$(git -C "$REPO" status --porcelain)" ] && \
  echo "⚠️  test-clean-checkout: uncommitted changes are NOT tested — this runs HEAD ($(git -C "$REPO" rev-parse --short HEAD))" >&2
rm -rf "$DIR"
trap 'rm -rf "$DIR"' EXIT
git clone --quiet --local --shared "$REPO" "$DIR"
git -C "$DIR" checkout --quiet --detach "$(git -C "$REPO" rev-parse HEAD)"
ln -s "$REPO/node_modules" "$DIR/node_modules"
cd "$DIR"
eval "${CLEAN_CHECKOUT_CMD:-npm test}"
```

Notes:

- The explicit detached checkout of the source's `HEAD` covers a source that is itself in detached
  state or on a branch other than the clone default.
- `eval` of `CLEAN_CHECKOUT_CMD` is for the fixture test only. Document it as a test hook.
- Invoke `node` indirectly through `npm test`. The script calls no bare `node` (see the trap about
  `node` being a shell function).
- `.gitignore`: add `.clean-checkout/` and `.clean-checkout-test-tmp/` (the fixture base below) next to the `.agents/skills` block (`.gitignore:22`).
- `package.json` scripts: `"test:clean-checkout": "bash scripts/test-clean-checkout.sh"`.
- `scripts/release.sh:185–190`: change `info "Running npm test ..."` / `npm test` to
  `npm run test:clean-checkout`, and update the dry-run echo to match.

**New test**: `tests/test-clean-checkout.test.js`

- Build a fixture git repo in a **non-temporary** base: a repo-local, gitignored
  `.clean-checkout-test-tmp/`, the same reasoning as `observation-log.test.mjs:66`. Give it
  `.gitignore` with `.agents/skills`, a committed `check.sh` running
  `test -f .agents/skills/x/marker`, a committed `skills/x/marker`, an untracked symlink
  `.agents/skills -> ../skills`, and a `node_modules/` directory.
- In place: `bash check.sh` exits 0, because the symlink is present.
- Through the runner, with `CLEAN_CHECKOUT_CMD='bash check.sh'` and `CLEAN_CHECKOUT_DIR` set under
  the fixture base: the result is non-zero, because the clone has no symlink.
- The runner refuses `CLEAN_CHECKOUT_DIR=/tmp/x` with exit 2.
- Mutation: replace the clone with `cp -R "$REPO" "$DIR"` → the runner case turns green, so the
  test is red.

### Phase 6: Rule, trap, docs

- **create-skill** § *A helper a fenced block executes is addressed from the repository root*
  (`skills/create-skill/SKILL.md:206`). Append a paragraph: **Testing such a block.** A test that
  executes it runs it from `makeConsumerRoot()` (`evals/shared/lib/consumer-root.mjs`), never from
  the repository root or the inherited cwd. The repository root resolves `.agents/skills/…` only
  through the gitignored symlink. Give the failure (finalise-bug-mode 71/71 locally, 19 red in CI,
  obs #149) and the check (`npm run test:clean-checkout`). **Do not write the shared-resources
  literal with a placeholder in this paragraph.** Pass 3 rewrites it in a skill file (see the task
  Notes).
- **traps.md** § *`.agents/skills` is a symlink to `../skills`* (`docs/contributing/traps.md:30`).
  Add: "…and therefore a test run in place passes on it where CI fails. `npm run test:clean-checkout`
  is the local run without it."
- **CHANGELOG** `[Unreleased]`: Fixed, for the bundler warning (task 154). Changed, for the release
  gate and the new runner (task 154).

## Key Patterns and References

- `tests/bundle-comment-origin.test.js`: the fixture-plus-live-tree shape for Phase 3.
- `warn_comment_only_refs` / `_WARNED_COMMENT_ORIGINS` (`bundle_skill.py:153–175`): the attributed,
  deduplicated warning shape for Phase 2.
- `shared/resources/tests/observation-log.test.mjs:55–76`: the repo-local scratch base, plus an
  in-process assertion that the base is not ephemeral. Reuse that reasoning for the runner and its
  fixture.
- `evals/shared/lib/git-sandbox.mjs`: the existing home for shared fixture builders.
- Traps: always `command node` in shell. Patch files with split/join, never `String.replace` with
  a `$` in the replacement. Edit `shared/resources/`, never `references/`.

## Testing Approach

```bash
command node --test tests/bundle-missing-source.test.js
command node --test evals/shared/tests/consumer-root.test.mjs
command node --test tests/test-clean-checkout.test.js
command node --test evals/shared/tests/finalise-bug-mode.test.mjs evals/shared/tests/optional-file-lookups.test.mjs
npm run bundle && git status --short          # only the Phase 1 regenerated copy changes
npm run bundle:check                          # 0 problems, and no `not found` line
npm run lint:shell
npm run test:clean-checkout                   # on the committed branch; same pass count as in place
npm run ci:fast
```

Record the red output of each mutation in the task § 8 table in the implementation report.
