---
id: task.223.plan
title: "Implementation Plan: Gap body: refuse an empty section; correct task.222's Deferred Work line"
type: plan
task-ref: task.223.gap-body-empty-section-and-deferred-line.md
---

# Implementation Plan: Gap body: refuse an empty section; correct task.222's Deferred Work line

> Requirements and success criteria: [task.223.gap-body-empty-section-and-deferred-line.md](task.223.gap-body-empty-section-and-deferred-line.md)

## Overview

This adds one shell `case` to `dod-gap-count.sh`'s `--body` branch, which refuses a body with no
non-whitespace character, plus the tests, the bundle and two records. The guard below was run on a
scratch copy of the helper on 2026-10-21 against the four shapes in Phase 1. Every shape gave the
expected result.

## Phase-by-Phase Implementation Guide

### Phase 1: Test first

**File:** `shared/resources/tests/finalise-gaps-path.test.mjs`. Add one test inside the per-shell
loop, next to the existing `--body` test (`:445`). Reuse its helpers (`tmp`, `write`, `run`,
`count`, `GAP_COUNT`, `ROOT`).

Fixtures (joined with `\n`):

| Name | Lines | Expected `--body` |
| --- | --- | --- |
| `no-lines` | `# Task`, ``, `## Definition of Done - Gaps Identified`, `## Change Log` | exit 1, stdout `""`, stderr matches `/^HALT: .*empty/` |
| `blank-only` | as above with two `""` lines between the two headings | same as `no-lines` |
| `heading-only` (control) | `…Gaps Identified`, ``, `### Missing Criteria`, ``, `## Change Log` | exit 0, stdout matches `/### Missing Criteria/`, does not match `/^S$/m` |

For `heading-only`, also assert that `count(file)` exits 1 with `/lists no gap/`. Each mode keeps
its own definition of "nothing to report".

Run it and confirm `no-lines` and `blank-only` are **red** on today's code (stdout `S\n`, exit 0)
before Phase 2.

### Phase 2: Fix

**File:** `shared/resources/dod-gap-count.sh`. Replace the `--body` branch at `:109-112`:

```bash
# before
if [ "$MODE" = "--body" ]; then
  printf '%s\n' "${OUT#S$'\n'}"
  exit 0
fi
```

```bash
# after
if [ "$MODE" = "--body" ]; then
  BODY=${OUT#S}
  BODY=${BODY#$'\n'}
  case "$BODY" in
    *[![:space:]]*) ;;
    *)
      echo "HALT: '## Definition of Done - Gaps Identified' in $DOC_FILE is empty — Step 8.4 writes the gap report there" >&2
      exit 1
      ;;
  esac
  printf '%s\n' "$BODY"
  exit 0
fi
```

Two steps, not one `${OUT#S$'\n'}`: when `$(…)` has stripped every trailing newline, no newline
follows `S`, so the combined pattern matches nothing. A populated section's output is byte-identical
to today's (checked on the scratch copy: `$'\n### Missing Criteria\n\n- a'` both ways).

Then update the header comment at `:52-53`
(`# Printed: "S" when the section exists, … — or, in --body mode, "S" and then the section's lines.`).
Add one sentence: `--body` refuses a section with no non-blank line, as the count refuses one with no
gap. Also update the test file's mutation note (`:21-23`) with this task's proof.

Then:

```bash
npm run bundle                      # regenerates skills/finalise/references/dod-gap-count.sh
npm run bundle:check
shellcheck shared/resources/dod-gap-count.sh
command node --test shared/resources/tests/finalise-gaps-path.test.mjs evals/shared/tests/finalise-bug-mode.test.mjs
```

**Mutation proof.** Restore the old one-line `printf` in the source, run `npm run bundle`, and
confirm `no-lines` and `blank-only` go red while `heading-only` stays green. Restore the guard, then
run the bundle again. Patch with split/join and assert the match count. Never use
`String.replace`.

### Phase 3: Records

**File:** `docs/tasks/task.222.finalise-gaps-path-fixes/task.222.finalise-gaps-path-fixes.md:493`.

```markdown
<!-- before -->
**Deferred Work:** none. Step 8.3's Change Log gap count stays out of scope (§ 4).
<!-- after -->
**Deferred Work:** QA-222-13, recorded under `## Deferred Work` below (fixed by task.223). Step 8.3's Change Log gap count stays out of scope (§ 4).
```

Add a Change Log row through `change-log.js` (`upsertChangeLog` + `bumpUpdated`, with an empty
version because this is a machine writer). Use the description
`Deferred Work line corrected — points at ## Deferred Work (task.223, PC-1)`.

**File:** `CHANGELOG.md` `[Unreleased]` → `### Fixed`. Add one bullet:
**finalise gap body refuses an empty section (task 223).** It says that `dod-gap-count.sh --body`
printed its internal `S` marker for an empty gaps section, and now HALTs as the count does.

## Key Patterns and References

- The HALT shape (`echo "HALT: …" >&2; exit 1`) and the `case` refusal style are the helper's own
  (`:25-38`, `:113-124`).
- The per-shell test loop and the `run`/`count` helpers are already in `finalise-gaps-path.test.mjs`.

## Testing Approach

The three fixtures above, under both shells, plus the unchanged Step 8.5 tests in
`evals/shared/tests/finalise-bug-mode.test.mjs`. The control fixture keeps the guard from being
written as "no `- ` item", which would refuse a section count mode already reports with its own
message.
