---
id: task.262.plan
title: "Implementation Plan: Untrusted-content path bound hardening"
type: plan
task-ref: task.262.untrusted-content-path-bound-hardening.md
---

# Implementation Plan: Untrusted-content path bound hardening

> Requirements and success criteria: [task.262.untrusted-content-path-bound-hardening.md](task.262.untrusted-content-path-bound-hardening.md)

## Overview

Fix the four advisory gaps from task 261 in test-first order: tests that prove each gap, then the change that closes it, then a mutation revert to show the test holds it.

## Phase-by-Phase Implementation Guide

### Phase 1: CRLF-safe fence tracking

**Files to modify:**
- `tests/untrusted-content-rule.test.js` — `markerLines`, the fence match line.

**Exact changes:**
- Before: `const f = l.match(/^\s*(`{3,}|~{3,})(.*)$/);`
- After: `const f = l.replace(/\r$/, "").match(/^\s*(`{3,}|~{3,})([^\n]*)$/);`
- Why it fails today (measured): the old regex does not match `"```\r"` or `"```bash\r"` at all (`.` excludes `\r`; `$` has no `m` flag), so a CRLF document never opens a fence. The effect is on the forbidding filter, which applies only outside a fence.
- Control (CRLF): a text with `\r\n` endings holding a bash fence whose body line contains a read marker **and** a forbidding sentence (for example `# do not read the issue body`). Inside a fence that line counts as a read, so assert `markerLines(text)` returns it. On the old regex the fence never opens, the line is judged as prose, the forbidding filter drops it, and the control is red. A control with the marker merely after a closed fence would pass on the old regex too and prove nothing.
- Control (LF): the same text with `\n` endings must return the same hit; it is green before and after.
- Mutation: restore the old line, expect the CRLF control red and the LF control green.

### Phase 2: Name the guard in each hostile case

**Files to modify:**
- `tests/untrusted-content-rule.test.js` — the "outside docs/, or climbing out of it" test.

**Exact changes:**
- Replace the `for (const bad of [...])` list with rows `[path, /outside docs\//]` or `[path, /climbs out with \.\./]`.
- `../../etc/passwd`, `/etc/passwd`, `skills/x/SKILL.md`, `docsx/y.md` expect the outside guard. `docs/../.ssh/id_rsa`, `docs/..`, `docs/a/../../x`, `docs/a/..` expect the climb guard.
- Mutation A: delete the `docs/*` case in one site's block, run, expect the outside rows red. Mutation B: delete the `*/../*` case, expect the climb rows red. Revert both.

### Phase 3: One extraction helper

**Files to modify:**
- `tests/untrusted-content-rule.test.js`.

**Exact changes:**
- `function boundBlockFor(site) { return boundBlock(fs.readFileSync(path.join(REPO_ROOT, site), "utf8")); }`
- `runBound` and the "same block at every site" test both call it. Grep for `boundBlock(` afterwards: only `boundBlockFor` calls it.

### Phase 4: Configured root and symlinks

**Files to modify:**
- The three bound blocks (edit the shared source and the two SKILL.md files, then `npm run bundle`).
- `tests/untrusted-content-rule.test.js`, `CHANGELOG.md`.

**Property check first** (obs #161):
```
T=$(mktemp -d); mkdir -p "$T/docs/real" "$T/out"; ln -s "$T/out" "$T/docs/link"
( cd "$T/docs/link" && pwd -P )   # expect $T/out
```
If this does not print the target, stop and re-plan.

**Block sketch** (keeps the slot and the two existing guards, adds a resolved-path guard):
```
LOCAL_PATH="<derived-path>"
if [ -n "$LOCAL_PATH" ]; then
  case "$LOCAL_PATH" in docs/*) ;; *) echo "HALT: derived path $LOCAL_PATH is outside docs/"; exit 1 ;; esac
  case "/$LOCAL_PATH/" in */../*) echo "HALT: derived path $LOCAL_PATH climbs out with .."; exit 1 ;; esac
  REAL_ROOT=$(cd docs 2>/dev/null && pwd -P) || { echo "HALT: docs/ not found in $(pwd)"; exit 1; }
  REAL_DIR=$(cd "$(dirname "$LOCAL_PATH")" 2>/dev/null && pwd -P) || REAL_DIR=""
  if [ -n "$REAL_DIR" ]; then
    case "$REAL_DIR/" in "$REAL_ROOT"/*) ;; *) echo "HALT: derived path $LOCAL_PATH resolves outside docs/"; exit 1 ;; esac
  fi
fi
```
Two empty values are handled before the `case`, because the `case` cannot: `"$REAL_DIR/"` is never the empty string (it is `/`), so a `""` arm never fires and an empty `REAL_DIR` would fall to the HALT arm; and an empty `REAL_ROOT` turns the pattern into `/*`, which admits every absolute path (both measured). An empty `REAL_ROOT` is a HALT. A missing parent directory leaves `REAL_DIR` empty, is not a HALT here, and is left to the existing "file exists" check after the block.
Keep the final `fi` as the block's last line: `boundBlock` lifts the block by it.

**Configured root:** where a story is resolved (review-story, Step 0 with a story document), use `${PRD_ROOT:-docs/prd}` in place of `docs` for the first guard. Task paths stay under `docs/tasks`. Decide in the phase whether one root list (`docs` plus `$PRD_ROOT`) is simpler than two blocks, and record the choice in the QA report. Keep the three blocks identical.

**Tests to add:** symlink-out is a HALT (create the link in a temp tree and run the block with that tree as cwd); `PRD_ROOT` path kept; default path kept; the new HALT message is asserted by name (Phase 2's table gains a third message).

**Probe:** re-run the plan in `task.261.dod.1.security.cases.*.json` through `security-probe-plan.mjs`, adding a symlink fixture to the cases (`fixture.files`).

## Key Patterns and References

- Block lifting and slot fill: `boundBlock`, `BOUND_SLOT` in the test file.
- Bundling: `npm run bundle`, then `npm run bundle:check`; edit `shared/resources/` sources only.
- Mutation proof pattern: `task.261.qa.1.untrusted-content-rule.md`.

## Testing Approach

`CI=true node --test tests/untrusted-content-rule.test.js` after each phase; `CI=true npm run ci` before push. Record the test runtime and command in the QA report.
