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
// Sketch — the fixture and env come from the helpers factored out of runShellCase,
// NOT from tmpdir()/bare sandboxEnv(): a fixture outside the sandbox root is a write
// the escape sentinel cannot see, and a bare env leaves HOME/TMPDIR pointing at the
// reader's real ones (review.1, I2).
function runCliCase(c, { sink, entryPath, template, workDir, sandboxHome, sandboxTmp, timeoutMs, ... }) {
  const fixtureDir = mkdtempSync(join(workDir, "fixture-"));
  if (MATERIALISED_SINKS[c.sink ?? sink]) materialiseCase(fixtureDir, ...); // factored out of runShellCase
  const argv = template.map((a) => (a === "{input}" ? c.input : a === "{fixture}" ? fixtureDir : a));
  const r = spawnSync(process.execPath, [entryPath, ...argv], {
    input: "", cwd: fixtureDir, env: caseEnv({ fixtureDir, sandboxHome, sandboxTmp }),
    encoding: "utf8", timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024,
  });
  // neverRan(r) → errored. With c.expected: expectedProblem → compareExpected → direction map
  // (the shell arm's rule). Without: exit 0 accepted, non-zero rejected.
}
```

- **Materialisation is inline in `runShellCase` today** (the `MATERIALISED_SINKS[c.sink ?? sink]` lookup
  and the write that follows, with its `cannot materialise` error arm). Extract it into
  `materialiseCase` first, keep `runShellCase` green, then call it from `runCliCase` — never a copy.
- When the case carries `expected`, call `compareExpected(expected, run, fixture)` as the shell arm does.
- One executed probe per case (no shell multiplicity — Node is the runtime).
- Record entries: a new `argv` key — the template, not the substituted input — `null` for every
  other form. There is no `kind` field on a record entry; the `entry` prefix names the form.
- `controlKey` (the entry-file name and the fold's dedupe key) gains the **argv skeleton** for `cli:`
  entries only (`cliControlKey`: flags and bare positionals kept in order, flag values dropped,
  slots kept), so two different controls against one script are two entries and a re-run of one
  with a different path operand replaces it; other forms' keys are byte-identical. (Superseded
  designs: the whole template — re-runs added controls, QA cycle 2 QA-1; the flag before `{input}`
  alone — distinct controls sharing a flag merged, QA cycle 3 CR-1.)
- `--argv` validation lives in one function used by `main` (exit 2 `bad-argv`, before any record
  write) and `runProbeSpec` (decline `bad-argv`).

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
