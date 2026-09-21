---
id: task.138.plan
title: "Implementation Plan: finalise bug-mode residuals and the end-to-end run"
type: plan
task-ref: task.138.finalise-bug-mode-residuals.md
---

# Implementation Plan: finalise bug-mode residuals and the end-to-end run

> Requirements and success criteria: [task.138.finalise-bug-mode-residuals.md](task.138.finalise-bug-mode-residuals.md)

## Overview

Five small edits inside `skills/finalise/SKILL.md`'s bug-mode branch, each with an executed row in `evals/shared/tests/finalise-bug-mode.test.mjs` before the edit, then one by-hand run of the whole feature in a scratch clone. The test file already slices blocks and runs them under both shells (`sliceBlock`, `sixBFixture`, `sixBAssertBlock`); every new row reuses those helpers.

## Phase-by-Phase Implementation Guide

### Phase 1: `newest_numbered` hoisted

**Create** `shared/resources/newest-numbered.sh`:

```bash
#!/usr/bin/env bash
# newest-numbered.sh — the ONE definition of "the newest artefact of a numbered series".
#
# Source it from a fenced block by the path the skill states, relative to the skill's
# base directory — exactly as `source references/resolve-platform.sh || exit 1` is
# sourced today; there is no second contract and no $SKILL_DIR:
#   source references/newest-numbered.sh || exit 1
#   DOD_PATH=$(newest_numbered "<dir>" dod -name "${STEM}.dod.*.md")
#
# By NUMBER, never `ls | sort | tail -1`: gate.9 sorts after gate.19 lexically and that
# picked the older gate once (TASK-125-BUG-14). A quoted `find -name`, never a bare glob:
# an unmatched glob aborts the command under zsh (obs #144). Prints nothing when none.
newest_numbered() {   # newest_numbered <dir> <kind: dod|gate|qa|review|implementation> <-name pattern>…
  local dir="${1}" kind="${2}"; shift 2
  find "${dir}" -maxdepth 1 \( "$@" \) 2>/dev/null \
    | sed -E "s/^(.*\.${kind}\.)([0-9]+)(\..*)$/\2 \1\2\3/" | sort -n | tail -1 | cut -d' ' -f2-
}
```

Copy the body from 6b (~line 1553) rather than retyping it; the only change is the header. In SKILL.md, replace the definition in 6b and both inlined copies (7.6a, 7.6b) with `source references/newest-numbered.sh || exit 1`. Add the script to finalise's bundle by citing it as `shared/resources/newest-numbered.sh` in SKILL.md prose once (the bundler discovers it from the citation); `npm run bundle`.

**Test rows**: source the bundled copy from a scratch dir containing `x.dod.9.a.md` and `x.dod.19.b.md` → `.19`; `grep -c 'newest_numbered() {' skills/finalise/SKILL.md` → `0`.

**`create-skill/SKILL.md`**: beside the `source … || exit 1` rule, one sentence: *a `references/` script a fenced block sources is addressed by the path the skill states, relative to the skill's base directory, as `resolve-platform.sh` is; do not introduce a `$SKILL_DIR`.*

### Phase 2: 6b — `[ -r ]` and the reworded verdict

Insert before the verdict grep (after `IMPLEMENTATION_REPORT` is bound and checked non-empty):

```bash
[ -r "${IMPLEMENTATION_REPORT}" ] || { echo "HALT: bug mode — ${IMPLEMENTATION_REPORT} exists but is not readable"; exit 1; }
```

Extend the remainder refusal:

```bash
case "$VERDICT_AFTER" in /*|\|*|PASS*|FAIL*|or\ *|OR\ *) VERIFY_VERDICT='' ;; esac   # a template remnant — `PASS / FAIL`, `PASS or FAIL` — is not a verdict
```

**Rows** (via `sixBFixture`): verdict line `**Verdict**: PASS or FAIL` → HALT containing "not an exact PASS or FAIL"; `**Verdict**: PASS — the {placeholder} case held` → PASS; report `chmod 000` → HALT containing "not readable" (skip the row when running as root). Mutations: remove the `[ -r ]` line → the unreadable row's message is "no **Verdict**" (red); remove `PASS*|FAIL*|or\ *` → the reworded row reads PASS (red).

### Phase 3: 7.1 fills; 7.6b asserts the written state

**Skip table** — add, after `running-summary`:

```
| `verification-complete` | Step 7.1 — the `## Verification Complete` block | run — append | run — **fill** the template's block in place; never append a second heading |
```

**7.1** — after the existing "Append the `## Verification Complete` section" bullet:

```markdown
**Bug mode (`verification-complete`):** fill — `assets/bug-dod-template.md` already ends with the
block; replace its placeholders in place. Appending writes a second heading and a second Final
Status line (task.125 5c CR-2):

```bash
[ "$DOC_KIND" = "bug" ] || exit 0    # story/task appends, above
TMP=$(mktemp) && sed -E \
  -e 's/^\*\*Final Status:\*\* \{.*\}$/**Final Status:** ✅ ACCEPTED/' \
  -e "s/^\*\*Completion Time:\*\* \{current-date-time\}$/**Completion Time:** $(date -u +%Y-%m-%dT%H:%M:%SZ)/" \
  "$DOD_PATH" > "$TMP" && mv "$TMP" "$DOD_PATH"
[ "$(grep -c '^\*\*Final Status:\*\*' "$DOD_PATH")" = 1 ] || { echo "HALT: bug mode — $DOD_PATH must carry exactly one **Final Status:** line"; exit 1; }
```
```

Check the template's exact placeholder spelling (`{✅ ACCEPTED | ❌ GAPS IDENTIFIED - NOT ACCEPTED}` at its line 98) and any other `{…}` lines in that block before writing the `sed`; the fill must be idempotent (a second run changes nothing).

**7.6b** — in the `bug` branch:

```bash
FINAL_ASSERT_PATH="$DOD_PATH"; FINAL_ASSERT_PATTERN='^\*\*Final Status:\*\* ✅ ACCEPTED'
FINAL_ASSERT_DESC="the pushed DoD file does not carry **Final Status:** ✅ ACCEPTED — Step 7.1 did not fill it"
```

Update the `**Bug mode (\`pushed-assertions\`):**` sentence that names the old pattern.

**Rows**: the 7.1 fill run on a fresh template copy → one heading, one Final Status, reads ACCEPTED; run twice → identical file; the once-only test (`exactly one **Final Status:** line`) extended to the filled file; `sixBAssertBlock`-style 7.6b execution with (a) a filled DoD → passes, (b) the untouched template → HALT. Mutation: revert the pattern → (b) passes (red).

### Phase 4: the end-to-end run

```bash
SCRATCH=<scratchpad>/task-138-e2e && git clone "$(git rev-parse --show-toplevel)" "$SCRATCH" && cd "$SCRATCH"
git checkout feature/task.138.finalise-bug-mode-residuals
# make tracker mutations deferred/read-only in the clone's skills-config.yaml (access.tracker: read-only)
```

Then invoke `/finalise --bug docs/bugs/bug.14.precompact-hook-bare-tracker-comment/bug.14.precompact-hook-bare-tracker-comment.md` from the clone and follow it step by step. Record per step: the block executed, its output, any HALT and whether it is correct or a defect. Expect at least: the 6b verdict extraction over bug.14's implementation report (its verdict line predates cycle 9 — if it HALTs, record it, fix a scratch copy of the report, re-run); the 7.1 fill; 7.6a's commit (in the clone); 7.6b's new assertion; 7.7/7.8 as deferred-mutation records. Paste the DoD file, the skip lines, and the deferred records into the implementation report under a `## End-to-end run (task.125 § 8, PC-1)` heading.

## Key Patterns and References

- One skip-table row per bug-mode difference, one marker per key, both directions tested — `evals/shared/tests/finalise-bug-mode.test.mjs` `parseSkipTable` / `parseMarkers`.
- Every block binds its own inputs (task.125 cycle 3) — the 7.1 fill block reads `$DOC_KIND` and `$DOD_PATH` bound in the same block or re-derived; do not rely on a previous block's shell.
- `command node`, never bare `node`; `${1}`, never `$1`, in the new script.

## Testing Approach

- `command node --test evals/shared/tests/finalise-bug-mode.test.mjs` after each phase; `npm run ci:fast` before each commit.
- One mutation per item, recorded with the failing assertion's message.
- The end-to-end run is recorded, not asserted; rerun it after any later bug-mode change and append to the record.
