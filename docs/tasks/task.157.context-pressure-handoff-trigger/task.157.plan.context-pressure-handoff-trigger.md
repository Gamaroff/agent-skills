---
id: task.157.plan
title: "Implementation Plan: Context-pressure trigger — recommend a continuation handoff before the context fills"
type: plan
task-ref: task.157.context-pressure-handoff-trigger.md
---

# Implementation Plan: Context-pressure trigger

> Requirements and success criteria: [task.157.context-pressure-handoff-trigger.md](task.157.context-pressure-handoff-trigger.md)

## Overview

One ESM engine owns the per-session state file and all threshold logic. A shell wrapper feeds it
from the status line without disturbing the user's own status line, and a shell installer registers
both in user-level settings. Everything fails silent and exits 0, so a defect costs a missed
reminder and never a blocked prompt.

## Phase-by-Phase Implementation Guide

### Phase 1: `shared/resources/context-pressure.mjs`

```js
export const DEFAULTS = { soft: 60, firm: 75, maxAgeMin: 15, repeat: 5, pruneDays: 7 };

export function readEnv(env)              // → DEFAULTS merged with valid CONTEXT_PRESSURE_* ints; invalid → default
export function stateDir(env, home)       // CONTEXT_PRESSURE_STATE_DIR || XDG_STATE_HOME/… || ~/.local/state/agent-skills/context-pressure
export function validSessionId(id)        // /^[A-Za-z0-9_-]{1,128}$/.test(id)

// Pure. state = { pct, at, window?, band?, prompts?, emittedAtPrompt? } | null
export function decide(state, nowMs, cfg) {
  // → { text: string|null, next: state }
  // no state / no pct / stale (nowMs - Date.parse(at) > maxAgeMin*60e3) → { text: null, next: state }
  // prompts = (state.prompts ?? 0) + 1
  // band = pct >= firm ? "firm" : pct >= soft ? "soft" : "none"
  // rank(band) > rank(state.band ?? "none")          → emit band text
  // band === "firm" && prompts - emittedAtPrompt >= repeat → emit firm text
  // band dropped (e.g. after /compact)               → store the lower band, no text (so a later rise re-emits)
}

export function render(band, pct, ageMin) // the ONE template for both notes; ≤ ~60 words
```

CLI `record` / `check`. Read all of stdin, `JSON.parse` in try/catch, and return silently on any
failure. `record` merges `{ pct: used_percentage, at: new Date().toISOString(), window:
context_window_size }` into the existing file (keeping `band`, `prompts`, `emittedAtPrompt`) and
writes `tmp + renameSync`. Pruning: if `<dir>/.pruned` has an mtime older than one hour, delete
`*.json` whose mtime is older than `pruneDays`, then touch `.pruned`.

`check` output, only when `text` is non-null:

```json
{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"…"}}
```

End with `process.exitCode = 0; return` everywhere, never `process.exit()` (the piped-stdout
truncation trap; see `handoff-verify.mjs` header).

**Record/check race**: the status line and the hook can run at the same moment. Each rename is
atomic, so the worst case is one lost `prompts` increment or one lost `pct` update. That is
acceptable, so do not add locking. State this in the header comment so a reviewer does not "fix" it
with a lock that could hang the hook.

### Phase 2: `shared/resources/context-pressure-statusline.sh`

```sh
#!/bin/sh
# Usage: context-pressure-statusline.sh -- <original status line command…>
here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
input=$(cat; printf x); input=${input%x}          # keep trailing newlines byte-exact
( printf '%s' "$input" | command node "$here/context-pressure.mjs" record >/dev/null 2>&1 & ) 2>/dev/null
[ "$1" = "--" ] && shift
[ $# -eq 0 ] && exit 0
printf '%s' "$input" | exec "$@"
```

Note: `printf … | exec "$@"` runs the original in a subshell of the pipeline, so its exit status is
the pipeline's. Confirm with the exit-3 stub test. If the shell used does not propagate it, write
the input to a temp file and `exec "$@" < "$tmp"` after arranging cleanup. Decide by the test, not
by reasoning, and record the choice in the implementation report. The original command string from
settings is a **single shell string** (e.g. `bash /Users/…/statusline.sh`), so the installer writes
`… -- sh -c '<original>'`, quoted by the installer, and the wrapper runs `"$@"` verbatim.

### Phase 3: `shared/resources/context-pressure-install.sh`

Model on `develop-pipeline-install-hooks.sh`: the same `--settings` / `--dry-run` flag handling, and
JSON edits done by an inline `command node -e` so there is no `jq` dependency. Identity rules:

- The hook identity is any `UserPromptSubmit` hook command containing `context-pressure.mjs check`.
  Remove every spelling, then add one: `command node "<abs>/context-pressure.mjs" check`, with
  `timeout: 5`.
- The status line identity is a `statusLine.command` containing `context-pressure-statusline.sh`.
  If it is already wrapped, leave it alone. Otherwise set it to `"<abs>/context-pressure-statusline.sh" -- sh -c '<original, single-quote-escaped>'`.
  If there is no `statusLine`, create `{ type: "command", command: "<abs>/context-pressure-statusline.sh" }`
  (it records and prints nothing).
- `--uninstall`: drop the hook entries by identity and remove any matcher group left empty. If the
  status line is wrapped, recover the original from the `sh -c '<…>'` tail. If the wrapper was
  installed with no original, delete `statusLine`.
- `<abs>` is the directory the installer itself runs from (`$(dirname "$0")`, resolved), so a user
  who installs from `~/.agents/skills/session-handoff/references/` gets that path. State that
  running it from a repo checkout ties the hook to that checkout.
- Write: serialise with 2-space JSON, `cp settings settings.bak`, write tmp, `mv`. Malformed input:
  print an error, exit 1, touch nothing.

### Phase 4: docs, bundle, changelog

`skills/session-handoff/SKILL.md`, a new section after `## Continue`:

- What it does, in three sentences, and why the trigger is measured rather than self-assessed.
- Install: `bash <skill>/references/context-pressure-install.sh --dry-run`, then without
  `--dry-run`. Uninstall likewise.
- Env knobs table (`CONTEXT_PRESSURE_SOFT`, `_FIRM`, `_MAX_AGE_MIN`, `_REPEAT`, `_STATE_DIR`).
- Silence semantics: no note means below threshold, stale, or broken, and they are
  indistinguishable by design. Diagnose with `CONTEXT_PRESSURE_SOFT=1` and one prompt.
- Cite each file as `shared/resources/context-pressure….` so the bundler picks them up.

Run `npm run bundle`, then `npm run bundle -- --check`. Add a CHANGELOG `[Unreleased]` → `Added`
entry.

## Key Patterns and References

- `shared/resources/develop-pipeline-install-hooks.sh`: identity dedupe, flags, settings preservation.
- `shared/resources/observe-work-session-start.sh`: `additionalContext` emission, silence on failure,
  the "a wrong number is worse than none" rationale to quote.
- `skills/session-handoff/scripts/handoff-verify.mjs`: header-comment style and `exitCode` emission.
- `~/.claude/statusline.sh` on this machine: a real existing status line to test the wrapper against
  manually. Do not modify it.

## Testing Approach

All suites go in `shared/resources/tests/` (`*.test.mjs`, `node:test`), already in `package.json`'s
glob.

- `context-pressure.test.mjs`: a table over `decide()` covering every band transition, staleness,
  repeat, band drop then re-rise, and env parsing; `validSessionId` rejections; `record` with a
  traversal id against a temp `CONTEXT_PRESSURE_STATE_DIR`, asserting that the directory tree is
  unchanged.
- `context-pressure-statusline.test.mjs`: `spawnSync("sh", [wrapper, "--", "sh", "-c", "cat; exit 3"], { input })`
  asserts stdout equals the input and status equals 3. With the engine moved aside, the same result.
  Then the state file content.
- `context-pressure-install.test.mjs`: a temp settings file carrying an existing `statusLine` and an
  unrelated `PreToolUse` hook. Install, install again, uninstall, compared with `deepStrictEqual` on
  the parsed JSON. A malformed file gives exit 1 and identical bytes.
- Contract: feed `check` a series of inputs (empty, non-JSON, missing session, valid) and assert exit 0
  and that stdout is empty or one parseable object.
- Mutation-prove by hand: drop the hysteresis compare, drop the freshness compare, and make the
  installer skip identity removal. Each must turn a named test red. Record them in the implementation
  report.
- Performance: `hyperfine` if present, otherwise a 20-iteration `time` loop, recorded and not asserted.
