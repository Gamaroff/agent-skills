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

- Open `skills/finalise/assets/bug-dod-template.md`; list every `{…}` in `## Verification Complete`. Prefer making the block verdict-neutral (one line per artefact, no "committed and pushed at 6a" claim) and have `accepted` add its two lines, so `gaps` writes none. After the fill, `grep -n '{[A-Za-z_]*}'` over the block only; non-empty → `echo "HALT: …" >&2; exit 1`. **First establish the order** (review finding): `SKILL.md:1601` calls the `accepted` fill while `**CI reading 1:** {CI_ROLLUP} @ \`{CI_HEAD_1}\`` is still unfilled, and no later script fills it, so an unconditional halt would stop every accepted bug run. Read 7.1 to see who writes that line and when; then either fill the CI line before the call, or restrict the halt to placeholders the verdict itself owns (the `gaps` path, which writes none of them) and name the exempt `{CI_ROLLUP}`/`{CI_HEAD_1}` in a comment. Record the choice in the Decisions Log. Run `CI=true command node --test evals/shared/tests/finalise-bug-mode.test.mjs` first and after.

### Phase 2: 6a staging

After `ADD_PATHS` is set (`SKILL.md:1910`–`1913`), append the security artefacts. Two traps the review found, both in the first draft of this plan:

- **A bare glob aborts zsh.** `for p in "$DIR/$STEM.dod.$N.security."*` with no match is `zsh: no matches found` and kills the block (the block's own comment records exactly this, cycle-8 CR-5). Enumerate with `find "{document-directory}" -maxdepth 1 -name "$STEM.dod.$DOD_NUM.security.*"` instead; `find` prints nothing on no match in both shells. Read its output with a `while IFS= read -r` loop.
- **`DOD_N` is not bound in this block** (it binds `STEM`, `DOC_KIND`, `DOD_PATH`). Derive the number from the resolved path: `DOD_NUM=$(basename "$DOD_PATH" | sed -E "s/^.*\.dod\.([0-9]+)\..*$/\1/")`, and HALT if it is empty or non-numeric. Do not add a new substituted input.

`find -name` matches the `.run.json.d` directory too; `git add` of a directory stages it recursively. Add the matches for both bug and non-bug kinds. The test runs the block under bash and zsh (`SHELLS` in `finalise-6a-registry-staging.test.mjs`) with and without artefacts present.

### Phase 3: DOD_N

Change `-name "${STEM}.dod.*.md"` at `SKILL.md:173` to `-name "${STEM}.dod.*"`. Check `newest_numbered` use at `:1831` stays `*.md` (it wants the DoD document, not an artefact).

### Phase 4

Tests in `finalise-gaps-path.test.mjs` and a new slice test for 6a; the obs #96 scratch layout as a fixture. Mutation-prove with the Edit tool; `git diff --stat` after each restore. `command npm run bundle`, `command npm run bundle -- --check`, `CI=true command npm test`.

## Key Patterns and References

- `shared/resources/newest-numbered.sh:50` (`next_numbered`).
- Control design: `create-task` § 8 (obs #176).

## Testing Approach

Node tests over scratch directories; shell slices extracted as `finalise-6a-registry-staging.test.mjs` does.
