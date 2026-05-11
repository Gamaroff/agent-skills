---
id: task.32.plan
title: "Implementation Plan: Reorganize evals/ from full-flow/ into per-skill structure"
type: plan
task-ref: task.32.evals-reorganize-per-skill.md
---

# Implementation Plan: Reorganize evals/ into per-skill structure

> Requirements and success criteria: [task.32.evals-reorganize-per-skill.md](task.32.evals-reorganize-per-skill.md)

## Overview

Mechanical relocation of `evals/full-flow/` into `evals/shared/` (infra) plus `evals/create-task/` and `evals/create-story/` (scenarios). All moves use `git mv` to preserve history. Internal imports and `package.json` scripts are updated in lockstep with the moves to keep `npm test` green at every phase boundary.

## Phase-by-Phase Implementation Guide

### Phase 1 — Create new directory skeleton

**Files to create (empty dirs):**
- `evals/shared/drivers/`
- `evals/shared/lib/`
- `evals/shared/tests/`
- `evals/create-task/scenarios/`
- `evals/create-story/scenarios/`

**Exact commands:**

```bash
mkdir -p evals/shared/{drivers,lib,tests}
mkdir -p evals/create-task/scenarios
mkdir -p evals/create-story/scenarios
```

Git ignores empty directories — Phase 2 commits will populate them. No `.gitkeep` needed.

### Phase 2 — Move shared infrastructure

**Files to move:**

```bash
git mv evals/full-flow/runner.mjs       evals/shared/runner.mjs
git mv evals/full-flow/assertions.mjs   evals/shared/assertions.mjs
git mv evals/full-flow/drivers          evals/shared/drivers
git mv evals/full-flow/lib              evals/shared/lib
git mv evals/full-flow/tests            evals/shared/tests
```

**Internal import updates:**

The runner imports drivers and assertions via relative paths. Audit:

```bash
grep -rn "from '\./" evals/shared/
grep -rn "from '\.\./" evals/shared/
```

Likely no changes needed — relative paths from `runner.mjs` to `./drivers/` and `./assertions.mjs` are unchanged. The `tests/` directory uses `../<file>` style which is also stable.

**Verify:**

```bash
npm run test:node
```

Expect: passes (test discovery moved, but tests themselves unchanged).

### Phase 3 — Move + rename scenarios

**Mapping table** (repeat for each):

| From | To |
|------|-----|
| `evals/full-flow/scenarios/01-happy-task` | `evals/create-task/scenarios/01-happy` |
| `evals/full-flow/scenarios/03-task-id-collision` | `evals/create-task/scenarios/02-id-collision` |
| `evals/full-flow/scenarios/05-tracker-payload-live` | `evals/create-task/scenarios/03-tracker-live` |
| `evals/full-flow/scenarios/02-happy-story` | `evals/create-story/scenarios/01-happy` |
| `evals/full-flow/scenarios/04-story-missing-core-config` | `evals/create-story/scenarios/02-missing-core-config` |

**Commands:**

```bash
git mv evals/full-flow/scenarios/01-happy-task              evals/create-task/scenarios/01-happy
git mv evals/full-flow/scenarios/03-task-id-collision       evals/create-task/scenarios/02-id-collision
git mv evals/full-flow/scenarios/05-tracker-payload-live    evals/create-task/scenarios/03-tracker-live
git mv evals/full-flow/scenarios/02-happy-story             evals/create-story/scenarios/01-happy
git mv evals/full-flow/scenarios/04-story-missing-core-config  evals/create-story/scenarios/02-missing-core-config
```

**Audit each `scenario.json` for hardcoded paths:**

```bash
grep -rn "full-flow\|01-happy-task\|03-task-id-collision\|05-tracker-payload-live\|02-happy-story\|04-story-missing-core-config" evals/
```

Most paths use `$SANDBOX` placeholder which is runtime-resolved — those are stable. Hardcoded scenario names should not appear (replay fixtures use relative paths inside the scenario folder). If found, update string-by-string.

**Update `scenario.json:name` field** (each file's `"name"` is informational, but stale value misleads readers — runner uses dir basename):

| File (post-move) | Old `name` | New `name` |
|------------------|-----------|-----------|
| `evals/create-task/scenarios/01-happy/scenario.json` | `01-happy-task` | `01-happy` |
| `evals/create-task/scenarios/02-id-collision/scenario.json` | `03-task-id-collision` | `02-id-collision` |
| `evals/create-task/scenarios/03-tracker-live/scenario.json` | `05-tracker-payload-live` | `03-tracker-live` |
| `evals/create-story/scenarios/01-happy/scenario.json` | `02-happy-story` | `01-happy` |
| `evals/create-story/scenarios/02-missing-core-config/scenario.json` | `04-story-missing-core-config` | `02-missing-core-config` |

**Fix stale prose path** in `evals/create-task/scenarios/03-tracker-live/README.md` line ~46: `evals/full-flow/lib/tracker-cleanup.mjs` → `evals/shared/lib/tracker-cleanup.mjs`.

**Remove old README before rmdir** (Phase 5 will write new READMEs from rescued content):

```bash
git rm evals/full-flow/README.md
```

**Cleanup:**

```bash
rmdir evals/full-flow/scenarios
rmdir evals/full-flow
```

### Phase 4 — Update package.json scripts

**Before:**

```json
"eval:full-flow": "node evals/full-flow/runner.mjs evals/full-flow/scenarios/01-happy-task",
"eval:full-flow:all": "for s in evals/full-flow/scenarios/*/; do node evals/full-flow/runner.mjs \"$s\" || exit 1; done",
"eval:full-flow:cli": "DRIVER=claude-cli node evals/full-flow/runner.mjs evals/full-flow/scenarios/01-happy-task",
"eval:full-flow:sdk": "DRIVER=claude-sdk node evals/full-flow/runner.mjs evals/full-flow/scenarios/01-happy-task",
```

**After:**

```json
"eval:create-task": "for s in evals/create-task/scenarios/*/; do node evals/shared/runner.mjs \"$s\" || exit 1; done",
"eval:create-story": "for s in evals/create-story/scenarios/*/; do node evals/shared/runner.mjs \"$s\" || exit 1; done",
"eval:all": "npm run eval:create-task && npm run eval:create-story",
"eval:create-task:cli": "DRIVER=claude-cli node evals/shared/runner.mjs evals/create-task/scenarios/01-happy",
"eval:create-task:sdk": "DRIVER=claude-sdk node evals/shared/runner.mjs evals/create-task/scenarios/01-happy",
"eval:create-story:cli": "DRIVER=claude-cli node evals/shared/runner.mjs evals/create-story/scenarios/01-happy",
"eval:create-story:sdk": "DRIVER=claude-sdk node evals/shared/runner.mjs evals/create-story/scenarios/01-happy",
```

**Update `npm test` chain** (currently references `evals/full-flow/tests/*.test.mjs`):

```json
"test": "bash shared/resources/resolve-platform.test.sh && node --test 'skills/create-task/tests/*.test.js' 'skills/create-story/tests/*.test.js' 'tests/*.test.js' 'evals/shared/tests/*.test.mjs'",
"test:node": "node --test 'skills/create-task/tests/*.test.js' 'skills/create-story/tests/*.test.js' 'tests/*.test.js' 'evals/shared/tests/*.test.mjs'",
```

**Update `.github/workflows/test.yml`:**

Search for `evals/full-flow` and replace with the appropriate new path. The deterministic CI job that runs `eval:full-flow:all` becomes `eval:all`. The `live-tracker` job (workflow_dispatch) that runs scenario 05 now runs `evals/create-task/scenarios/03-tracker-live`.

**Verify after each script change:**

```bash
npm test
```

### Phase 5 — Documentation

**Split `evals/full-flow/README.md` into 3 files:**

1. `evals/shared/README.md` — runner contract, driver-adding guide, sabotage-verify workflow (anything that's about infrastructure, not specific scenarios)
2. `evals/create-task/README.md` — what scenarios cover, how to run them, how to add a new create-task scenario
3. `evals/create-story/README.md` — same for create-story

**Cross-references inside the new READMEs:**

- Each skill README links back to `docs/evals.md` for the runbook
- Each skill README links to `evals/shared/README.md` for runner/driver contract
- `evals/shared/README.md` links to both skill READMEs as examples

**Update `docs/evals.md`:**

Every recipe currently uses `npm run eval:full-flow*`. Replace:

| Old recipe text | New recipe text |
|-----------------|-----------------|
| `npm run eval:full-flow` | `npm run eval:create-task` (or `eval:create-story`, depending on context) |
| `npm run eval:full-flow:all` | `npm run eval:all` |
| `npm run eval:full-flow:cli` | `npm run eval:create-task:cli` |
| `npm run eval:full-flow:sdk` | `npm run eval:create-task:sdk` |
| Path `evals/full-flow/scenarios/01-happy-task` | `evals/create-task/scenarios/01-happy` |

Reference table at the bottom of `docs/evals.md`:

```markdown
- `evals/shared/README.md` — runner contract, driver-adding guide
- `evals/create-task/README.md` — create-task eval coverage
- `evals/create-story/README.md` — create-story eval coverage
- `evals/create-task/scenarios/03-tracker-live/README.md` — live tracker safety notes
```

**Update `AGENTS.md`:**

Search for `evals/full-flow` references; replace with appropriate new path (`evals/shared/README.md` for the README pointer).

**Rename L4 layer label** — `full-flow` is used as the L4 *layer name* in the eval taxonomy in three places. Rename to **"End-to-end"** (or chosen replacement) for consistency with new directory structure:

| File | Line | Current | New |
|------|------|---------|-----|
| `AGENTS.md` | ~178 | `(unit → fixture → protocol → full-flow)` | `(unit → fixture → protocol → end-to-end)` |
| `docs/evals.md` | ~185 | `**L4 Full-flow**` (heading + table row) | `**L4 End-to-end**` |
| `docs/README.md` | ~19 | `(unit → protocol → full-flow)` | `(unit → protocol → end-to-end)` |

Verify with: `grep -rn "full-flow" AGENTS.md docs/` — should return only commit-message/CHANGELOG matches after this step.

## Key Patterns and References

- `git mv` preserves rename history; `mv` followed by `git add` does NOT — use `git mv` everywhere.
- Run `npm test` after each phase boundary to catch regressions early.
- Replay fixtures use relative paths inside each scenario directory — moves are safe by construction.
- `package.json` script changes can land in one commit at the end of Phase 4 (atomic).

## Testing Approach

**Per-phase verification:**
- Phase 1: `ls` to confirm directories exist
- Phase 2: `npm run test:node` — confirm tests still discoverable
- Phase 3: `npm run eval:all` cannot run yet (scripts not updated) — defer to Phase 4
- Phase 4: `npm test` + `npm run eval:all` — both must be green before commit
- Phase 5: `documentation-standards-validator` on each new README; manual link check

**Sabotage check (optional):**
- Temporarily hardcode `evals/full-flow/...` somewhere in a scenario.json
- Confirm runner fails loudly
- Revert before commit
