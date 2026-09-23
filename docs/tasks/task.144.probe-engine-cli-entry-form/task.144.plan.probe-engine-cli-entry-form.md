---
id: task.144.plan
title: "Implementation Plan: security-probe — a cli: entry form"
type: plan
task-ref: task.144.probe-engine-cli-entry-form.md
---

# Implementation Plan: security-probe — a `cli:` entry form

> Requirements and success criteria: [task.144.probe-engine-cli-entry-form.md](task.144.probe-engine-cli-entry-form.md)

## Overview

Add a fourth entry form beside `shell:` and `shell-fn:`, following their pattern: a prefix constant,
a branch in `resolveEntry`, a per-case runner, and the unchanged case loop / `computeVerdict` / record
writer. The one genuinely new piece is the argv template.

## Phase-by-Phase Implementation Guide

### Phase 1: resolution and `--argv` (`shared/resources/security-probe.mjs`)

**Anchors** (by symbol): `SHELL_PREFIX`, `SHELL_FN_PREFIX`, `resolveEntry`, `main`'s flag parsing,
the `--fake-gh` "shell entry forms only" refusal (the pattern to copy for "`--argv` applies to `cli:`
only").

```js
export const CLI_PREFIX = "cli:";
export const ARGV_SLOTS = Object.freeze(["{input}", "{fixture}"]);

// validateArgvTemplate(raw) → { ok: true, template } | { ok: false, reason }
//   JSON.parse; Array.isArray; every element a string; count of "{input}" === 1;
//   any element matching /\{[a-z]+\}/ must be a known slot (whole-element match only —
//   a slot is never interpolated inside a larger string, so `--x={input}` is refused).
```

- `resolveEntry`: `entry.startsWith(CLI_PREFIX)` → strip, resolve, containment-check exactly like the
  `shell:` arm, require `.mjs`/`.js`, return `{ kind: "cli", path }`.

### Phase 2: `runCliCase`

```js
function runCliCase({ path, template, input, sink, timeoutMs }) {
  const fixture = mkdtempSync(join(tmpdir(), "probe-cli-"));
  if (MATERIALISED_SINKS[sink]) materialiseCase(fixture, sink, input); // factored out of runShellCase
  const argv = template.map((a) => (a === "{input}" ? input : a === "{fixture}" ? fixture : a));
  const r = spawnSync(process.execPath, [path, ...argv], {
    cwd: fixture, env: sandboxEnv(), stdio: ["ignore", "pipe", "pipe"], timeout: timeoutMs,
  });
  if (r.error || r.signal) return { outcome: "errored", detail: String(r.error ?? r.signal) };
  return { outcome: r.status === 0 ? "accepted" : "rejected", run: r, fixture };
}
```

- **Materialisation is inline in `runShellCase` today** (the `MATERIALISED_SINKS[c.sink ?? sink]` lookup
  and the write that follows, with its `cannot materialise` error arm). Extract it into
  `materialiseCase` first, keep `runShellCase` green, then call it from `runCliCase` — never a copy.
- When the case carries `expected`, call `compareExpected(expected, run, fixture)` as the shell arm does.
- One executed probe per case (no shell multiplicity — Node is the runtime).
- Record entries: `kind: "cli"`, `argv: template` (the template, not the substituted input).

### Phase 3: consumer test

- Build a fixture registry with the `corpus()` shape from `evals/qa-next/unit/uat-status.test.mjs`
  (copy the minimal builder; do not import test internals across suites).
- Run the engine as a CLI from the repo root:
  `command node shared/resources/security-probe.mjs --sink path --entry cli:skills/qa-next/scripts/uat-status.mjs --argv '["--root","<fixture root>","--run-path","D.1","--env","{input}"]' --cases-file <cases.json> --record <tmp>/r.json --json`
  — `--cases-file` supplies env labels (hostile: `../x`, `a/b`, `10`, `x-02`; benign: `lan`) because
  the `path` corpus is shaped for file paths, not labels
  — note `--root` must be the prepared registry fixture, not `{fixture}`, because the registry must
  exist; `{fixture}` is for sinks that materialise.
- Assert `totals.executed > 0` and record the verdict.

### Phase 4: documents

- `probe-boundary-rule.md` §5: a `cli:` paragraph (argv array, one `{input}`, exit-status contract,
  sandbox); §5.1: remove "a multi-argument CLI" from the declined examples.
- `finalise-dod-security-prompt.md` (~153/167) and `security-review-prompt.md` (~98, ~148, ~242): a
  `cli:` invocation beside the `shell:` / `shell-fn:` ones, and the routing rule names it.
- `skills/qa-task/SKILL.md` (~479) and `skills/qa-story/SKILL.md` (~987), Step 3b: name `cli:` beside
  `shell:` / `shell-fn:`.
- `npm run bundle`, then `npm run bundle:check`.

## Key Patterns and References

- `sandboxEnv()`, `spawnBudget`, `compareExpected`, `computeVerdict`, `recordRun` — reuse, do not fork.
- §2's allow-list refusal: this form never touches `qa-execute-snippets.mjs`.
- Every argv element passed as an array element — never a shell string (the shell arms' rule).

## Testing Approach

- `shared/resources/tests/security-probe.test.mjs`; fixture CLIs under
  `shared/resources/tests/fixtures/cli/` (refuser, accept-all, crasher, argv-echo).
- Mutation proofs: allow two `{input}`; interpolate a slot inside a larger string; score non-zero as
  accepted; drop `sandboxEnv()`; each must red its named test.
