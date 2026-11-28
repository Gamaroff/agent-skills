---
id: task.321.plan
title: "Implementation Plan: finalise's diff fallback is one commit, and its gap body leaks a marker"
type: plan
task-ref: task.321.finalise-diff-and-gap-body.md
---

# Implementation Plan: finalise's diff fallback is one commit, and its gap body leaks a marker

> Requirements and success criteria: [task.321.finalise-diff-and-gap-body.md](task.321.finalise-diff-and-gap-body.md)

## Overview

One new script, one changed `awk` program, and their call sites. Write each test first and see it red.
Edit `shared/resources/` only: `npm run bundle` makes the copies.

## Phase-by-Phase Implementation Guide

### Phase 1: The diff reader

**`shared/resources/finalise-diff.sh`** (bash and zsh; executed, not sourced):

```bash
# finalise-diff.sh --out <file> [--pr <n>]
# stdout, one line:  source=merge-base base=<sha> files=<n> excluded=<n>
#                    source=forge pr=<n> files=<n>
#                    unresolved: <reason>
# exit: 0 resolved · 1 unresolved (<file> is empty) · 2 usage
```

The core, as it was run in the trial, where the PR's head was `HEAD`. Replace `HEAD` with the PR's head
commit, and the `-e` test with `git cat-file -e "$HEAD_SHA:shared/resources/$rel"`, so that a checkout on
another branch reads the same change. The trial did not run that form.

```bash
MB=$(git merge-base "origin/$PR_READ_BASE" HEAD) || unresolved "no merge base with origin/$PR_READ_BASE"
git diff --name-only -z "$MB" HEAD > "$OUT.names" || unresolved "git diff failed"
EXCL=()
while IFS= read -r -d '' f; do
  case "$f" in
    skills/*/references/*)
      rel=${f#skills/*/references/}
      [ -e "shared/resources/$rel" ] && EXCL+=(":(top,exclude,literal)$f") ;;
  esac
done < "$OUT.names"
git diff "$MB" HEAD -- ':(top)' "${EXCL[@]}" > "$OUT" || unresolved "git diff failed"
[ -s "$OUT" ] || unresolved "no change between $MB and HEAD"
```

Points to keep:

- `${EXCL[@]}` with `set -u` and an empty array fails on bash 4.3 and older. Use
  `${EXCL[@]+"${EXCL[@]}"}`.
- An empty merge-base diff goes on to the forge arm, and is `unresolved` only when that gives nothing too.
- Run the lookup and the diff from the repository's top: `cd "$(git rev-parse --show-toplevel)"`
  after `--out` is made absolute.
- A removed copy (its source removed in the same change) has no source in the tree. It stays in the
  patch. That is right, and it is a test row.
- `literal` pathspec magic, not `GIT_LITERAL_PATHSPECS`: the variable would also turn off `:(top)`.
- Bitbucket returns 12 characters of the head: resolve it with `git rev-parse --verify --quiet "$PR_READ_HEAD^{commit}"`.
- The merge-base arm asks `git`, and not the forge. The forge arm asks `gh pr diff`, and takes its names
  from the patch's `diff --git` lines.
- If the patch holds only excluded copies, `-s` is false while the list is not empty. Say
  `unresolved: every changed file is a bundled copy`, and keep the list.
- `unresolved` truncates `--out` before it exits, so a stale patch of an earlier run is never read.

### Phase 2: `/finalise` uses it

**Step 3a**, in place of the three `DIFF_FILE` lines:

```bash
DIFF_FILE=".claude/state/pr-diff-$(date +%s).diff"
DIFF_LINE=$(bash .agents/skills/finalise/references/finalise-diff.sh --out "$DIFF_FILE" ${PR_NUMBER:+--pr "$PR_NUMBER"})
DIFF_RC=$?
[ "$DIFF_RC" -ne 2 ] || { echo "HALT: finalise-diff.sh was called wrongly: $DIFF_LINE"; exit 1; }
printf '**PR diff:** %s\n' "$DIFF_LINE"
```

The unquoted `${PR_NUMBER:+…}` does not split in zsh. Use an array, as `PRE_ARGS` in Step 0b does. Record the
line in the running summary's Step 2 block, under the `**PR:**` line.

**Step 3e**: `rm -f "$DIFF_FILE" "$DIFF_FILE.names"`. Name both files in full: no glob.

**`finalise-dod-ac-prompt.md`**, rule 6: the members come from `<DIFF_FILE>.names` (NUL-delimited: read
it with `tr '\0' '\n'`). Add: *an empty or missing list means the change could not be read. A criterion
over a set is then `FAIL`, with the note "the change could not be read".* Rule 1 reads the paths from
the same list.

**The other two prompts**: one sentence each. An empty `<DIFF_FILE>` is "could not read", not "nothing
changed". Both contracts allow only `PASS | FAIL | NOT_APPLICABLE`, so a check that needs the diff is
`FAIL` with the note "the change could not be read" (review 1, I1).

**Fix-evidence check 5** ("bundled copies match the source") reads the copies from `<DIFF_FILE>.names`:
the patch no longer holds them (review 1, I2).

### Phase 3: The gap body

**`dod-gap-count.sh`**, after the `/^## /` rule:

```awk
!infence && s && /^ {0,3}<!-- (change-log|jira-sync-changelog|github-sync-changelog)-start -->[ \t]*$/ { s = 0; m = 0 }
```

Some `awk` variants have no interval expressions: write `^ ? ? ?` in place of `{0,3}`.

Parity test: read `CL_START` and `LEGACY_MARKER_PAIRS` from `change-log.js`, build one document per
start marker, and run the script on it. A fourth pair added there turns the test red.

### Phase 4: Records and bundle

`CHANGELOG.md` under `### Fixed`, then `npm run bundle` and `npm run bundle:check`.

## Key Patterns and References

- `pr-read.sh` header: the output contract, and why a status is read and a body is not.
- `review-pr` Step 4: the same order of sources.
- `finalise-rerun-scope-blocks.test.mjs`: how a Step 3a block is extracted and run.
- Cite a sibling by bare filename inside `shared/resources/`.

## Testing Approach

Every test makes a temporary repository with a bare `origin`, sets `GIT_CONFIG_GLOBAL=/dev/null`, and
puts a stub `gh` first on `PATH`. The Bitbucket rows set `PR_READ_BB_API` to a local stub, as
`pr-read.test.sh` does. Mutations: drop the source lookup; drop the `-s` test; drop the marker rule. Name
the test each one turns red.
