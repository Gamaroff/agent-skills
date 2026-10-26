---
id: task.234.plan
title: "Implementation Plan: Probe sandbox teardown and process-group reap"
type: plan
task-ref: task.234.probe-teardown-and-reap-hardening.md
---

# Implementation Plan: Probe sandbox teardown and process-group reap

> Requirements and success criteria: [task.234.probe-teardown-and-reap-hardening.md](task.234.probe-teardown-and-reap-hardening.md)

## Overview

Four small changes in `shared/resources/security-probe.mjs` and its test file, each test-first and
mutation-proved. Phases 1–3 are independent; Phase 4 documents them.

## Phase-by-Phase Implementation Guide

### Phase 1: Teardown past PATH_MAX (A, B)

**Measured premise (2026-10-26, Node v26.8.2, GNU coreutils 9.12).** A tree of 30 nested
200-byte directories with a mode-000 leaf: the first `rmSync` throws `EACCES`; today's `open()` walk
throws `ENAMETOOLONG` at `lstat`; the second `rmSync` throws `EACCES`. `chmod -R u+rwx` on the same
tree, then `rm -rf`, removed it. The script was a throwaway; the red test below reproduces it.

**Red test A** (`security-probe.test.mjs`, beside the QA2-1 test at `:7456`). Build the depth inside
the case with relative paths, so the builder never hits PATH_MAX:

```bash
d=$(printf 'a%.0s' $(seq 1 200)); for i in $(seq 1 30); do mkdir "$d" && cd "$d"; done; mkdir locked && chmod 000 locked
```

Run it as a `fence:` case (reuse `fenceRoot` / `fenceCase` from the QA2-1 test). Assert
`runProbeSpec` returns one row per shell, and the run's `TMPDIR` is empty afterwards (see Phase 2
for the `TMPDIR` pattern). Skip under root with `t.skip`.

**Change** (`removeSandbox`, `:969`):

```js
function removeSandbox(root) {
  try {
    rmSync(root, { recursive: true, force: true });
    return;
  } catch (e) {
    if (e.code !== "EACCES" && e.code !== "EPERM") throw e;
  }
  // `chmod -R` descends by relative path, so depth past PATH_MAX does not stop
  // it, and it follows no symlink by default on GNU and BSD (task.234).
  spawnSync("chmod", ["-R", "u+rwx", "--", root], { stdio: "ignore" });
  rmSync(root, { recursive: true, force: true });
}
```

Check `--` with BSD `chmod` before relying on it; if unsure, drop it (`root` comes from `mkdtempSync`
and never starts with `-`). Do not ignore a non-zero `chmod` status in silence: if the final `rmSync`
throws, the error should say `chmod -R` exited non-zero.

**Guard test B.** Inside the case: `mkdir locked; ln -s "$OUTSIDE" locked/link; chmod 000 locked`.
`$OUTSIDE` is a directory the test creates outside the sandbox with mode 0o500. After the run,
assert `statSync(OUTSIDE).mode & 0o777` is still `0o500`. Mutation: add `-L` to the `chmod` argv;
the test must go red (measured: `-L` turns 500 into 700).

Gate 3 CR-2 asked for either a dev/ino re-check or a stated limit. With `chmod -R` there is no
in-process check-then-act left, so write the limit in Phase 4 instead.

### Phase 2: QA2-1 test hardening (C)

At `security-probe.test.mjs:7456`:

```js
test("runProbeSpec: … (QA2-1)", (t) => {
  if (process.getuid?.() === 0) return t.skip("root reads through mode 000");
  const tmp = mkdtempSync(join(tmpdir(), "qa2-1-"));
  const saved = process.env.TMPDIR;
  process.env.TMPDIR = tmp;
  try {
    // … the existing runProbeSpec call and assertions …
    assert.deepEqual(readdirSync(tmp), [], "the probe sandbox was not removed");
  } finally {
    if (saved === undefined) delete process.env.TMPDIR;
    else process.env.TMPDIR = saved;
    rmSync(tmp, { recursive: true, force: true });
  }
});
```

`os.tmpdir()` reads `TMPDIR` on each call, so `mkdtempSync(join(tmpdir(), "security-probe-"))` at
`security-probe.mjs:1795` lands in `tmp`. Confirm that by asserting `tmp` is non-empty during the
run, once, while writing the test.

Apply the same `t.skip` change at `:7507`. Mutation: make `removeSandbox` return at once; the new
assertion must go red.

### Phase 3: Process-group reap (D)

**Population.** `spawnSync(` appears 6 times in `security-probe.mjs`
(`grep -n "spawnSync(" shared/resources/security-probe.mjs`). Two run cases:

- `:1908`, the module runner inside `runProbeSpec`;
- `:2287`, inside `watchedSpawn` (`:2278`), which `runShellCase` (`:2329`), `runCliCase` (`:2661`),
  `runShellArgvCase` (`:2994`) and `runFenceCase` (`:3517`) go through. Confirm each of the four calls
  `watchedSpawn` before relying on this.

The other four (`:479` git, `:1169` python3, `:1185` zsh, `:3334` `-n` syntax check) run no case.

**Change**, at both case sites:

```js
const child = spawnSync(command, argv, { …, detached: true });
reapGroup(child.pid);
const after = snapshotTree(sandboxRoot, workDirName); // existing line, now after the reap
```

```js
/** Kill what is left of a case's process group, before its side effects are read. */
function reapGroup(pid) {
  if (!pid) return;
  try {
    process.kill(-pid, "SIGKILL");
  } catch (e) {
    if (e.code !== "ESRCH") throw e;
  }
}
```

Measured 2026-10-26: `spawnSync("bash", ["-c", "ps -o pgid= -p $$"], { detached: true })` printed
the child's own pid as its pgid; without `detached` it printed the parent's.

For the module runner at `:1908`, the reap must also run before `compareExpected` reads `absent` /
`removed`. Read the lines after the call and move the reap above the first read.

**Red test D**, one per site. The case runs:

```bash
(sleep 0.3; touch "$MARKER") & exit 0
```

`$MARKER` is a path outside the sandbox that the test owns. After `runProbeSpec` returns, wait 600 ms
(`Atomics.wait` on a `SharedArrayBuffer`, or an async test with `setTimeout`), then assert
`existsSync(MARKER)` is false. Red on develop. Mutation: remove `reapGroup`; red again.

### Phase 4: Docs and validation

- `shared/resources/probe-boundary-rule.md`: state that each case's process group is killed before
  its path assertions are read, and the limit (a grandchild that calls `setsid` leaves the group).
  State any race left inside `chmod -R` the same way. Use the doc's existing "Stated limit" form
  (`:424`).
- CHANGELOG `[Unreleased]` → Changed (D changes a case outcome) and Fixed (A).
- `npm run bundle`, `npm run bundle:check`, `scripts/lint-shell.sh`.
- `npm run ci` with `.agents/skills` moved aside and restored by a trap.

## Key Patterns and References

- The `fenceRoot` / `fenceCase` helpers and the QA2-1 test (`:7456`) show how to run a fence case
  under every probe shell.
- task.232's QA2-1 change (`dda2cbd2`) is the code being replaced in Phase 1.
- Patch with split/join and assert the split count.

## Testing Approach

- Each phase: red test, change, green, mutation red, restore.
- Run `security-probe.test.mjs` alone first, with
  `timeout 600 "$(type -P node)" --test shared/resources/tests/security-probe.test.mjs`.
- Any existing case whose outcome changes in Phase 3 is a HALT for a decision, not a fixture edit.
