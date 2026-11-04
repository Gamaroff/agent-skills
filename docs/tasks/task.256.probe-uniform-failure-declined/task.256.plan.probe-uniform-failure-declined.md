---
id: task.256.plan
title: "Implementation Plan: security-probe: a uniform failure is declined, not scored"
type: plan
task-ref: task.256.probe-uniform-failure-declined.md
---

# Implementation Plan: security-probe: a uniform failure is declined, not scored

> Requirements and success criteria: [task.256.probe-uniform-failure-declined.md](task.256.probe-uniform-failure-declined.md)

## Overview

Each spawning arm records its case's exit and raw stderr under a private key. One pure function decides whether the run measured the harness. On a hit, `runProbeSpec` reclassifies every case as `errored` and lets the existing `allErrored` fold build the decline. The code below ran as a prototype on 2026-11-04: 289 of 290 tests passed in `security-probe.test.mjs`, the same as baseline, and the one failure on both sides was an ENOENT in an overlay that omits `docs/`.

## Phase-by-Phase Implementation Guide

### Phase 1: Tests first

**Files to modify:**
- `shared/resources/tests/security-probe.test.mjs` — new tests, beside the BUG-2, BUG-7 and BUG-9 tests
- `shared/resources/tests/fixtures/security-probe/` — one fixture per shape

**Fixtures** (each a two-line script unless stated):

| Fixture | Body | Expected |
|---|---|---|
| usage | `echo "usage: x --doc <p>" >&2; exit 2` | declined |
| usage echoing `$1` | `echo "unknown argument '$1'" >&2; exit 2` | declined, needs the normaliser |
| other message | `echo "cannot find config" >&2; exit 1` | declined, the control case |
| exit 127 with stderr | `echo "jq: command not found" >&2; exit 127` | `absent` |
| silent | `exit 3` | `absent` |
| accept-all | `exit 0` | `absent` |
| lists its fixture | `ls -a "$1" >&2; exit 2` | `absent` |

Use `runProbeSpec` with `sink: "filename"` and `entry: "shell:…"` for those. For `cli:`, pass `cases` with `expected: { stdout: "ok\n", exit: 0 }` and `argv: ["{input}"]`: a usage CLI with both directions is declined; the same CLI with hostile cases only, and a CLI echoing `process.argv[2]`, stay `absent`; with no `expected` it stays `rejects-every-input`.

Also add `shell-fn:`, `shell-argv:` and `fence:` declined cases. Those three were not run in the prototype, so a failure here is news about the design, not a test bug: check which per-case token the form prints before changing the normaliser.

### Phase 2: The check and the fold

**Files to modify:**
- `shared/resources/security-probe.mjs`

**In each arm's `caseResults.push`** (`runShellCase`, `runCliCase`, `runShellArgvCase`, `runFenceCase`), where `child` is in scope:

```js
_failure: { status: child.status, stderr: child.stderr ?? "" },
```

The early-return pushes that spawn nothing get no key, and the check returns null if any case that ran lacks one.

**Above `computeVerdict`:**

```js
export function uniformFailure(caseResults, sandboxRoot) {
  const ran = caseResults.filter((c) => c.outcome !== "errored");
  const hostile = ran.filter((c) => c.direction === "hostile");
  const legit = ran.filter((c) => c.direction === "legitimate");
  if (hostile.length === 0 || legit.length === 0) return null;
  if (!hostile.every((c) => c.outcome === "accepted")) return null;
  if (!legit.every((c) => c.outcome === "rejected")) return null;
  if (!ran.every((c) => c._failure)) return null;
  const norm = (c) =>
    c._failure.stderr
      .split(sandboxRoot)
      .join("<sandbox>")
      .replace(/fixture-[A-Za-z0-9]{6}/g, "fixture-X")
      .replace(/fence-[0-9]+\.sh/g, "fence-N.sh")
      .trim();
  const firstByShell = new Map();
  for (const c of ran) {
    const shell = c.shell ?? "";
    if (!firstByShell.has(shell)) firstByShell.set(shell, c);
    const first = firstByShell.get(shell);
    const { status } = c._failure;
    if (!Number.isInteger(status) || status === 0) return null;
    if (status === 126 || status === 127) return null;
    if (status !== first._failure.status) return null;
    const line = norm(c);
    if (line === "" || line !== norm(first)) return null;
  }
  const first = ran[0];
  return `every case exited ${first._failure.status} with the same stderr, hostile and legitimate alike, so no input reached the control: ${norm(first).split("\n")[0].slice(0, 160)}`;
}
```

**In `runProbeSpec`, immediately before `const allErrored`:**

```js
const uniform = uniformFailure(caseResults, sandboxRoot);
for (const c of caseResults) delete c._failure;
if (uniform !== null) {
  for (const c of caseResults) {
    c.outcome = "errored";
    c.detail = uniform;
  }
}
```

`sandboxRoot` is declared at `:1971`, outside the `try` whose `finally` removes the directory at `:2158`, so the string is still in scope here.

**Do not replace the case's input in the normaliser.** The prototype did at first, and `BUG-9` went red: an echoed input is evidence the input arrived. This is also why a usage error that echoes its input stays scored, which is a stated limit.

**Do not move the 126/127 exclusion into `isLaunchFailure`.** That function answers a different question, whether bash could open the script.

### Phase 3: Downstream, docs, bundles and proof

- `security-probe-plan.mjs` folds the record, so a plan entry with this shape should yield `probes: []` and `probes_executed: 0`. The plan engine has no test file of its own (`git grep -l security-probe-plan` over the tests finds only prose and contract checks), so spawn `security-probe-plan.mjs` from `security-probe.test.mjs`. Do not assume it from the engine's own result.
- `probe-boundary-rule.md`, the `entry-not-probeable` row: add "or every case failed identically in both directions, so no input reached the control", then list the four limits (echoed input, hostile-only corpus, exit 126/127, silent failure).
- Engine header: the block at `:138` onward describes each decline; add this one.
- `npm run bundle`, then `npm run bundle:check`.

## Key Patterns and References

- The `allErrored` fold (`:2194`) is the only decline return this shape may use.
- The comment at `:2190` states the reason: a property of the entry is reported once.
- `computeVerdict`'s doc comment (above `:1462`) already calls a reject-everything function indistinguishable from a stub. This extends that to a run that fails before reaching the code.

## Testing Approach

- **Red first**: confirm the resolve-pr-number regression fails on the unmodified engine before writing Phase 2.
- **Reproduction command**: `command node shared/resources/security-probe.mjs --sink filename --entry 'shell:shared/resources/resolve-pr-number.sh' --json`. Do not wrap `command node` in `timeout`: it exits 127 (obs #146).
- **Run on a real checkout.** The `task.227 regression` test reads from `docs/`, so an overlay without it shows that one failure on both sides.
- **Mutations**: the five in the task's § 8, each restored from a `cp` snapshot per `mutation-proving.md`.
