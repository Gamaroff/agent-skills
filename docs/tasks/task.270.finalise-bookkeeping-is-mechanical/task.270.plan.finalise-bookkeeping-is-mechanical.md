---
id: task.270.plan
title: "Implementation Plan: finalise bookkeeping is mechanical"
type: plan
task-ref: task.270.finalise-bookkeeping-is-mechanical.md
---

# Implementation Plan: finalise bookkeeping is mechanical

> Requirements and success criteria: [task.270.finalise-bookkeeping-is-mechanical.md](task.270.finalise-bookkeeping-is-mechanical.md)

## Overview

Edit `shared/resources/fill-verification-complete.sh`, `skills/finalise/assets/bug-dod-template.md` and `skills/finalise/SKILL.md` with the Edit tool; never a bundled copy.

## Phase-by-Phase Implementation Guide

### Phase 1: The fill script

- Open `skills/finalise/assets/bug-dod-template.md`; list every `{…}` in `## Verification Complete`. Prefer making the block verdict-neutral (one line per artefact, no "committed and pushed at 6a" claim) and have `accepted` add its two lines, so `gaps` writes none. After the fill, `grep -n '{[A-Za-z_]*}'` over the block only; non-empty → `echo "HALT: …" >&2; exit 1`. Run `CI=true command node --test evals/shared/tests/finalise-bug-mode.test.mjs` first and after.

### Phase 2: 6a staging

After `ADD_PATHS` is set (`SKILL.md:1834`–`1837`), append: `for p in "{document-directory}/$STEM.dod.$DOD_N.security."*; do [ -e "$p" ] && ADD_PATHS+=("$p"); done`. Use an `nullglob`-safe form (the loop with `-e` is). The `.d/` directory is staged by `git add` recursively.

### Phase 3: DOD_N

Change `-name "${STEM}.dod.*.md"` at `SKILL.md:173` to `-name "${STEM}.dod.*"`. Check `newest_numbered` use at `:1831` stays `*.md` (it wants the DoD document, not an artefact).

### Phase 4

Tests in `finalise-gaps-path.test.mjs` and a new slice test for 6a; the obs #96 scratch layout as a fixture. Mutation-prove with the Edit tool; `git diff --stat` after each restore. `command npm run bundle`, `command npm run bundle -- --check`, `CI=true command npm test`.

## Key Patterns and References

- `shared/resources/newest-numbered.sh:50` (`next_numbered`).
- Control design: `create-task` § 8 (obs #176).

## Testing Approach

Node tests over scratch directories; shell slices extracted as `finalise-6a-registry-staging.test.mjs` does.
