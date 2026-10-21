---
id: task.222.plan
title: "Implementation Plan: finalise gaps-path fixes"
type: plan
task-ref: task.222.finalise-gaps-path-fixes.md
---

# Implementation Plan: finalise gaps-path fixes

> Requirements and success criteria: [task.222.finalise-gaps-path-fixes.md](task.222.finalise-gaps-path-fixes.md)

## Overview

This task makes two independent fixes on `/finalise`'s gaps path. Each is test-first.

1. A small shell helper becomes the one definition of a story/task gap count.
2. A guard on the existing `finalise` arm of `advance-pipeline-lock.sh` reads the DoD's `**Final Status:**` line before it advances.

## Phase-by-Phase Implementation Guide

### Phase 1: Reproduce (red)

**File**: `shared/resources/tests/finalise-gaps-path.test.mjs` (new; the `shared/resources/tests/*.test.mjs` glob in `package.json` already runs it).

Fixtures are inline strings written to a `mkdtempSync` directory. Each is a task document with a `## Definition of Done - Gaps Identified` section in the Step 8.4 shape:

```markdown
## Definition of Done - Gaps Identified

### QA Gate Status

**Gate Status**: ✅ PASS

### Missing Criteria:

1. **Acceptance Criteria:**
   - [ ] AC8 …

2. **Documentation:**
   - [ ] CHANGELOG …

### Next Steps:

- [ ] Re-measure AC8 …
- [ ] Add the CHANGELOG entry

**Estimated Effort:** Small

## Change Log
```

To prove the old count is wrong, run Step 8.5's current pipeline over each fixture:

```js
const body = execFileSync("awk", ["/^## Definition of Done - Gaps Identified/{f=1;next} /^## /{f=0} f", file]);
const old = String(body).split("\n").filter((l) => /^[[:space:]]*- \[ \]/.test(l.replace(/\t/g, " "))).length;
```

Simpler still: shell out to `bash -c` with the exact grep from SKILL.md. Assert `old` is 4, 5, 3 and 8. Keep this assertion as a documented "known failure" sub-test. It shows the fixtures reproduce the incident; Phase 2's assertions are what must pass.

Lock fixture:

- `.claude/state/develop-pipeline.lock` holds `{"skill":"develop-task","current_step":7}`.
- A DoD file ends with `**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED`.
- Run `bash shared/resources/advance-pipeline-lock.sh --skill finalise --dod <dod>` with `cwd` set to the temp repo. Use the same `run()` / `LOCK` pattern as `step-8-completion-checklist.test.mjs`'s premise test.
- Today `--dod` is unknown, so check what the helper does with an extra argument after `--skill <name>`. If it errors (`usage`), the red signal is the non-zero exit. If it ignores the argument, the red signal is `current_step` 8. Record which in the implementation report.

### Phase 2: `dod-gap-count.sh`

**File**: `shared/resources/dod-gap-count.sh` (new, `#!/usr/bin/env bash`, executable).

Model it on `fill-verification-complete.sh`'s `count` mode: header comment stating the one definition, stderr-only HALTs, nothing written.

```bash
#!/usr/bin/env bash
# dod-gap-count.sh — the ONE story/task gap count (/finalise Step 8.5).
#
#   bash .agents/skills/finalise/references/dod-gap-count.sh <DOC_FILE>
#
# A gap is one list item under `### Missing Criteria` inside
# `## Definition of Done - Gaps Identified`. `### Next Steps` items are the
# actions that close the gaps, not gaps: counting both double-counted every
# report (obs #24 — task.181 3→5, task.199 1→3, task.213 2→4). Items are any
# `- ` line, checkbox or not: Step 8.4's own example writes 6 of its 7 gaps
# as `- ⚠️`. Bug mode has its own definition (fill-verification-complete.sh count).
DOC_FILE="${1:-}"
case "$DOC_FILE" in '' | *'{'*) echo "HALT: DOC_FILE must be bound (got '$DOC_FILE')" >&2; exit 1 ;; esac
[ -f "$DOC_FILE" ] || { echo "HALT: $DOC_FILE is not a file" >&2; exit 1; }
grep -q '^## Definition of Done - Gaps Identified' "$DOC_FILE" \
  || { echo "HALT: $DOC_FILE has no '## Definition of Done - Gaps Identified' section" >&2; exit 1; }
SUB=$(awk '/^## Definition of Done - Gaps Identified/{s=1;next} s&&/^## /{s=0}
           s&&/^### Missing Criteria/{m=1;print "@";next} s&&m&&/^##/{m=0} s&&m' "$DOC_FILE")
case "$SUB" in '@'*) ;; *) echo "HALT: no '### Missing Criteria' under the gaps section of $DOC_FILE" >&2; exit 1 ;; esac
N=$(printf '%s\n' "$SUB" | grep -c '^[[:space:]]*- ' || true)
[ "${N:-0}" -gt 0 ] || { echo "HALT: '### Missing Criteria' in $DOC_FILE lists no gap — Step 8.4 writes one list item per gap" >&2; exit 1; }
printf '%s\n' "$N"
```

Notes:

- `s&&m&&/^##/` stops at the next `###` **or** `##`, so `### Next Steps:` ends the range.
- The gap section has more than one heading (`### Missing Criteria`, `### Next Steps`), so a heading that matches more than once is not an issue. If an agent writes two `### Missing Criteria` headings, both ranges count. That is acceptable: both are gaps.
- `grep -c … || true` follows the existing Step 8.5 idiom (`grep -c` exits 1 on zero).
- Run `shellcheck` on it.

**`skills/finalise/SKILL.md`, Step 8.5**: replace the story/task `else` arm:

```bash
   else
     # The helper is the one story/task definition of the gap list: list items under
     # `### Missing Criteria`, never the Next Steps checkboxes (obs #24).
     case "$DOC_FILE" in *'{'* | '') echo "HALT: DOC_FILE must be bound in this block"; exit 1 ;; esac
     GAP_COUNT=$(bash .agents/skills/finalise/references/dod-gap-count.sh "$DOC_FILE") || exit 1
   fi
```

Rewrite the comment above the `if` ("Unmet criteria across every section of the gap report…") so it no longer claims "every section". Keep the obs #212 point (indented items count).

**Step 8.4**: after "List all specific gaps by category", add:

> Each gap is one list item (`- [ ] …` or `- ⚠️ …`) under `### Missing Criteria:`. `### Next Steps:` lists the actions that close them and is not counted. Step 8.5's lead counts the first list only (`dod-gap-count.sh`).

**Citation form**: write it as `.agents/skills/finalise/references/dod-gap-count.sh`, the same form as `fill-verification-complete.sh` at the bug arm. Check that `npm run bundle` discovers it from that spelling (it does for `fill-verification-complete.sh`). If `bundle:check` reports it missing, add a `shared/resources/dod-gap-count.sh` mention the way the existing helpers are reached.

### Phase 3: the `--dod` guard

**File**: `shared/resources/advance-pipeline-lock.sh`.

1. In the `--skill)` case, after `SKILL_NAME="$2"`, read an optional `--dod <path>` from `$3`/`$4`. Bind `DOD_ARG=""` before the case. Match the file's existing argument style (it already parses `--restore <dir>` and `--accept-legacy`); read that parser first and extend it rather than adding a second one.
2. Keep the arm literal: `finalise)                   NEXT=8 ;;`. The mapping floor in `step-8-completion-checklist.test.mjs` parses `^\s*([a-z|-]+)\)\s+NEXT=(\d+)` between `--skill)` and the first 4-space `esac`.
3. After the `case … esac` that sets `NEXT`, and **after** the no-lock check (the no-lock `--skill` path must stay exit 0 and print the `--restore` hint unchanged, per `run_no_lock_split`), add:

```bash
if [ "${SKILL_NAME:-}" = "finalise" ]; then
  HOLD=""
  if [ -z "$DOD_ARG" ]; then HOLD="no --dod given"
  elif [ ! -f "$DOD_ARG" ]; then HOLD="$DOD_ARG is not a file"
  elif ! grep -q '^\*\*Final Status:\*\* ✅ ACCEPTED' "$DOD_ARG"; then HOLD="$DOD_ARG does not read **Final Status:** ✅ ACCEPTED"
  fi
  if [ -n "$HOLD" ]; then
    echo "advance-pipeline-lock: finalise not accepted ($HOLD) — lock held at step $(jq -r '.current_step' "$LOCK_FILE")" >&2
    exit 0
  fi
fi
```

   Use the file's own lock-path variable and its JSON-object validation. The guard must run after the "lock is not a JSON object" check, so a corrupt lock still exits 1. Read the file's flow before placing the guard. The no-lock exit and the corrupt-lock exit both come before the write.
4. Header: update the usage line (`--skill <skill-name> [--dod <path>]`) and the mapping line (`finalise → 8 (Step 7 done) — only with --dod on a DoD reading **Final Status:** ✅ ACCEPTED; otherwise held, exit 0 (task 222, obs #79)`).

**File**: `skills/finalise/SKILL.md`, `## Pipeline Lock Cooperation`:

```bash
if [ -f .claude/state/develop-pipeline.lock ]; then
  DOD_PATH="{dod-path — the running summary Step 0 created}"
  case "$DOD_PATH" in *'{'* | '') echo "HALT: DOD_PATH must be bound in this block"; exit 1 ;; esac
  bash .agents/skills/finalise/references/advance-pipeline-lock.sh --skill finalise --dod "$DOD_PATH" || true
fi
```

Then add a short paragraph below the block:

- The block runs on both paths.
- The helper advances to Step 8 only when the DoD reads `**Final Status:** ✅ ACCEPTED`, and holds at 7 on gaps. A gaps halt therefore resumes at `/finalise`.
- Its stderr is kept (no `2>/dev/null`), so the hold reason reaches the transcript.

### Phase 4: tests, sweep, bundle

**`step-8-completion-checklist.test.mjs`**, the premise test `"finalise's lock cooperation moves the record to step 8 before Step 7's tail runs"`:

- write `dod.md` containing `**Final Status:** ✅ ACCEPTED` and pass `--skill finalise --dod "<dir>/dod.md"`;
- add a second `run(…)` without `--dod` on a fresh lock at 7 and assert it stays at 7.

Rename the test to say "on an accepted DoD".

**Doc sweep**: add the qualifier at each site.

| File | Anchor text | New wording (shape) |
| --- | --- | --- |
| `shared/resources/develop-pipeline-resume-contract.md` | "because `/finalise` moves the lock to 8 as its last action" | "because `/finalise`, when it accepts, moves the lock to 8 as its last action" |
| `shared/resources/develop-pipeline-step-8-commit.md` | "`/finalise` moves the lock to 8 as its last action" | same qualifier |
| `shared/resources/develop-pipeline-remaining-work-banner.md` | "`/finalise` is one: it moves the lock to 8" | "…: on an accepted DoD it moves the lock to 8" |
| `shared/resources/develop-pipeline-on-stop.sh` | comments near `COMPLETION_LINE`; the `COMPLETION_LINE` string | qualifier in the comments and in the string |
| `skills/develop-{task,story,bug}/SKILL.md` | "(`/finalise` moves the lock to 8 before Step 7's tail completes)" | "(`/finalise` moves the lock to 8 on acceptance, before Step 7's tail completes)" |

Before editing, check whether any test pins these strings: `git grep -n "moves the lock to 8\|moves it to 8" -- '*.test.*'`. The `COMPLETION_LINE` is likely asserted in `develop-pipeline-on-stop.test.sh`; update it in the same commit.

**Bundle**: run `npm run bundle`, then `npm run bundle:check`, and commit the regenerated `references/` copies.

## Key Patterns and References

- `shared/resources/fill-verification-complete.sh`: the shape for a one-definition count helper (header, stderr HALTs, `count` prints only a number).
- `shared/resources/advance-pipeline-lock.test.sh`: runs every case under bash and zsh. Add the guard cases there as well as in the `.mjs`, or put them only in the `.mjs` and say why.
- `step-8-completion-checklist.test.mjs`: the `run()` helper and `LOCK` constant for lock tests in a temp repo.
- Memory: always `command node`; use `./node_modules/.bin/<tool>`, never `npx`. Edit `shared/resources/` only.

## Testing Approach

- `node --test shared/resources/tests/finalise-gaps-path.test.mjs shared/resources/tests/step-8-completion-checklist.test.mjs`
- `bash shared/resources/advance-pipeline-lock.test.sh`
- `bash shared/resources/develop-pipeline-on-stop.test.sh` (if the `COMPLETION_LINE` changes)
- `npm test`, then `npm run ci` before the PR.
- Mutation proofs (task § 8): revert each fix in turn and record the red test name and count in the implementation report.
