# Bug Report: Task 54 — `defer-mutation.js` is not bundled beside the three shell files that now require it

**Task**: [task.54.github-board-interception.md](./task.54.github-board-interception.md)
**Bug ID**: TASK-54-BUG-1
**Severity**: HIGH
**Priority**: P0
**Status**: ✅ Ready for QA
**Found By**: QA (qa-task cycle 1)
**Date Found**: 2026-08-19

## Description

Task 54 made three shell files depend on `defer-mutation.js` **as a runtime sibling**:

| File | Uses it for |
| ---- | ----------- |
| `shared/resources/resolve-platform.sh` | `tracker_write`'s gate — resolves the mode and writes the record |
| `shared/resources/set-github-project-priority.sh` | its own gate — `--resolve-access` then the record |
| `shared/resources/set-github-project-estimate.sh` | same |

None of the three **names the path literally**, so `bundle_skill.py` never learned it was a
dependency and did not copy it. The bundler's shell transitive-dep rule (`SH_SIBLING_RE`) only
follows `source`/`exec`/`.` of a sibling **`.sh`**; it has no rule for a shell script that invokes a
sibling **`.js`** via `node "$dir/foo.js"`. Discovery therefore falls to `SHARED_REF_RE`, which
matches the literal string `shared/resources/<file>` anywhere in a scanned file.

`jira-sprint-lib.sh` has the identical runtime pattern and **is** bundled correctly — because line 32
writes the path out in full in a comment:

```bash
# deferred-mutation writer — shared/resources/defer-mutation.js, which the
# bundler ships next to this file, so `$(dirname "${BASH_SOURCE[0]}")` finds it
```

`defer-mutation.js`'s own header does the same thing for its roster doc, and says why:

> That path is written out in full DELIBERATELY. It is how bundle_skill.py learns to copy the schema
> doc into each skill's references/ alongside this file — the doc is loaded at runtime via
> `__dirname`, not `require`, so nothing else would tell the bundler it is a dependency.

The precedent existed, was documented, and was not followed.

## Impact

**17 of 35** bundled skills carry the new `resolve-platform.sh` with no `defer-mutation.js` beside
it; **11** bundled copies of the two board helpers likewise.

Affected skills: `create-epic`, `create-pr`, `ensure-{epic,story,task}-{github,jira}-issue`,
`qa-fix`, `review-{bug,code,epic,story,task}`, `sync-github-{epic,story,task}`.

### 1. A regression in `full` mode — the serious half

The board helpers exit **before** their `gh api graphql` call when the writer is missing:

```bash
else
  echo "⚠️  … defer-mutation.js not found beside this script — skipping the write rather than performing it unrecorded"
  exit 0
fi
```

That branch does not check the access mode, so it fires under **`full`** too. In 11 installed
skills, `set-github-project-{priority,estimate}.sh` now silently stop writing the board field in the
default, unrestricted configuration.

Reproduced side by side with a stubbed `gh`, no access restriction set:

```
--- in-tree copy (defer-mutation.js present), FULL mode ---
⚠️  set-github-project-priority: GraphQL fetch failed for #232 — skipped      ← reached the write

--- bundled copy (defer-mutation.js absent), FULL mode ---
⚠️  set-github-project-priority: defer-mutation.js not found beside this script — skipping the write
```

This directly violates the task's own success criterion **"`full` mode byte-identical; existing suite
green unchanged"**, and it breaks board-Priority mirroring — functionality that predates this task
and has nothing to do with access control.

### 2. A silent audit gap under a restricted mode

`tracker_write` in the 17 affected copies falls to its `else` branch: the write is still correctly
**refused** (the safety property holds), but nothing is recorded. The handover checklist is then
silently short one entry — which is precisely the invisible-drift failure this whole task sequence
exists to remove.

## Steps to Reproduce

```bash
# 1. Confirm the gap
for f in skills/*/references/resolve-platform.sh; do
  d=$(dirname "$f"); [ ! -f "$d/defer-mutation.js" ] && echo "MISSING: $d"
done          # → 17 skills

# 2. Reproduce the full-mode regression
STUB=$(mktemp -d)
printf '#!/usr/bin/env bash\ncase "$1 $2" in "issue view") echo "priority:high"; exit 0;; "repo view") echo "acme"; exit 0;; esac\necho GRAPHQL-CALLED >&2; exit 0\n' > "$STUB/gh"
chmod +x "$STUB/gh"
PATH="$STUB:$PATH" bash skills/sync-github-task/references/set-github-project-priority.sh 232 high
# → "defer-mutation.js not found … skipping the write", with no access restriction set
```

## Expected Behavior

- `npm run bundle` copies `defer-mutation.js` into every skill that receives `resolve-platform.sh`
  or either board helper.
- Under `full`, the bundled board helpers behave exactly as the in-tree copies do.
- Under a restricted mode, `tracker_write` records in an installed skill as it does in-tree.

## Actual Behavior

`defer-mutation.js` is absent from 17 skills; the board helpers no-op under `full` in 11 of them;
`tracker_write` cannot record in any of the 17.

## Recommendation

1. Name the path literally in a comment in each of the three files, following
   `jira-sprint-lib.sh:32`:

   ```bash
   # …the deferred-mutation writer — shared/resources/defer-mutation.js — which the bundler ships
   # next to this file, so the sibling lookup below resolves in-tree and in an installed skill alike.
   ```

2. Re-run `npm run bundle` and commit.

3. **Add a test that fails without the fix.** A comment is exactly the kind of thing a later cleanup
   deletes, and nothing currently notices. Assert the co-location invariant directly — for every
   bundled `resolve-platform.sh` / `set-github-project-*.sh`, `defer-mutation.js` exists beside it.
   `jira-interception.test.mjs` §12 is the right home: it already pins bundled-copy facts and states
   the exact rationale ("a bundled pair left at an older count would refuse every deferral IN AN
   INSTALLED SKILL while the whole suite passed in-repo").

4. Consider whether the board helpers' missing-writer branch should fail *open* under `full` — the
   record only matters when a restriction is in force. Resolving the mode first and only demanding
   the writer when the mode is not `full` would make the failure mode proportionate. (Judgement call
   for the fix; the co-location fix alone closes the reported defect.)

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-08-19

Confirmed the mechanism rather than assuming it. `bundle_skill.py`'s `SH_SIBLING_RE` follows only
`source`/`exec`/`.` of a sibling **`.sh`**; there is no rule for `node "$(dirname …)/x.js"`.
Discovery therefore falls entirely to `SHARED_REF_RE`, which matches the literal string
`shared/resources/<file>` in any scanned file.

`jira-sprint-lib.sh` has the identical runtime pattern and **is** bundled correctly, because line 32
names the path in a comment. That is the whole difference between the two.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-08-19

**Fix**: named `shared/resources/defer-mutation.js` literally in a comment in each of the three
files, and said in each comment *why the string is load-bearing* — so the next reader does not tidy
it away as prose. Re-ran `npm run bundle`.

**The fix contains no executable change**: `git diff --stat` on the two board helpers is
`30 insertions(+)`, all comment lines. That is the right shape for a packaging defect — the runtime
logic was never wrong, only its dependency declaration.

**Files modified**:

- `shared/resources/resolve-platform.sh` — comment naming the path + rationale
- `shared/resources/set-github-project-priority.sh` — same
- `shared/resources/set-github-project-estimate.sh` — same
- `shared/resources/tests/jira-interception.test.mjs` — new co-location assertions (§12)
- 125 bundled `references/` files re-generated

**Testing**:

- `defer-mutation.js` now present beside **35 of 35** bundled `resolve-platform.sh` (was 18 of 35)
  and beside every bundled board helper.
- Full-mode regression gone, verified against two different bundled copies with a stubbed `gh`:
  both now reach the graphql call, matching the in-tree copy.
- Manual-mode behaviour verified in a bundled copy: refuses **and** records
  (`github.board.field-set`), and `tracker_write` records from `skills/qa-fix/references/`.

**Mutation-proved twice** — the test must fail for each half of the invariant independently:

| Mutation | Result |
| -------- | ------ |
| Delete the literal path from `resolve-platform.sh` | ✅ red (1 failed) |
| Remove one bundled `defer-mutation.js` | ✅ red (1 failed) |

Two assertions rather than one on purpose: the co-location check alone would pass on a stale tree
that happened to still have the file, and the comment check alone would pass on a tree that was
never re-bundled. Each covers the other's blind spot.

**Deliberately NOT changed**: the missing-writer branch still refuses the write rather than falling
open under `full`. The QA report raised making it proportionate as a *future*, non-blocking item, and
it is the wrong trade here — it would weaken a fail-closed access gate to compensate for a packaging
bug that is now impossible. The co-location test is the correct place to hold this invariant.

**Verification steps for QA**:

1. `for f in skills/*/references/resolve-platform.sh; do [ -f "$(dirname $f)/defer-mutation.js" ] || echo MISSING; done` → no output
2. Run a bundled board helper under `full` with a stubbed `gh` → reaches the graphql call
3. Delete the comment from any of the three sources → `jira-interception.test.mjs` goes red

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-08-19 | New | QA | Found in qa-task cycle 1 |
| 2026-08-19 | In Progress | qa-fix | Bundler mechanism confirmed |
| 2026-08-19 | Ready for QA | qa-fix | Comment + re-bundle + two co-location assertions; mutation-proved |
