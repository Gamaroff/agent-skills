---
id: task.250.plan
title: "Implementation Plan: Security-probe tests write no scratch files into the repository"
type: plan
task-ref: task.250.security-probe-scratch-out-of-tree.md
---

# Implementation Plan: Security-probe tests write no scratch files into the repository

> Requirements and success criteria: [task.250.security-probe-scratch-out-of-tree.md](task.250.security-probe-scratch-out-of-tree.md)

## Overview

Every scratch target moves into a realpathed temp root that holds copies of the fixtures it needs, and the engine is told about that root with `repoRoot`. A guard stops anyone putting a write under `REPO_ROOT` back.

All line numbers are from 2026-11-02 and will drift. Each is paired with the prefix or test name, which will not.

## Phase 1: The guard

Two halves, one runtime and one static. The runtime half is the behaviour. The static half catches a write that bypasses the helper.

**Runtime half.** The single root builder (Phase 2) asserts that the root it returns is outside `realpathSync(REPO_ROOT)`:

```js
assert.ok(
  !(root + sep).startsWith(realpathSync(REPO_ROOT) + sep),
  `scratch root ${root} is inside the repository — set TMPDIR outside it`,
);
```

This also covers the case where `TMPDIR` points inside the repository, which the containment tests already check by hand (`… must be outside … — set TMPDIR elsewhere`).

**Static half.** A test in `security-probe.test.mjs` reads its own source and lists every call to `mkdtempSync`, `mkdirSync`, `writeFileSync`, `cpSync` (destination, the 2nd argument), `symlinkSync` (link path, the 2nd argument), `renameSync` and `rmSync` whose path argument is built from `REPO_ROOT` (`join(REPO_ROOT` as the first token of that argument). It fails naming `line → call` for each one. Requirements:

- **Non-vacuity floor.** The same scan must find at least N write calls in total (any path), with N set from the post-change count. A broken parser then reads as broken, not clean.
- **Calibration.** Run it on today's file before any conversion. It must name all 12 `mkdtempSync` sites, plus the two `symlinkSync` sites at lines 1972 and 2053 if their `dir` came from an in-tree `mkdtempSync`. Those two are only visible through a variable, so the runtime half is what catches them. Record which half catches which.
- **cpSync's source is a read.** `cpSync(join(REPO_ROOT, FN_LIB), …)` copies *from* the repository and must not be flagged. Key on the argument position, not on the token. This is the obs #135 shared-token hazard.

The static half reads source text, which this repository distrusts as sole evidence ("assert behaviour, not source text"). It is acceptable here only beside the runtime half and the watched run in Testing Strategy, which are the behavioural evidence.

## Phase 2: The helper

Generalise `fenceRoot` (`function fenceRoot(files)`, near line 4410) rather than adding a third builder. `saRoot` already wraps it.

```js
/**
 * A realpathed temp root holding `files` ({relpath: text}) and copies of
 * `copy` (repository-relative paths, files or directories); returns the root.
 * Never inside REPO_ROOT (task.250).
 */
function fenceRoot(files = {}, { copy = [], prefix = "probe-fence-" } = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
  // runtime guard from Phase 1 here
  for (const rel of copy) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    cpSync(join(REPO_ROOT, rel), join(root, rel), { recursive: true });
  }
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
  return root;
}
```

Notes:

- `writeFileSync` drops the mode. Several sites write executables (`{ mode: 0o755 }`). Either accept `{ text, mode }` values in `files`, or `chmodSync` after. Do not lose an executable bit, because `shell:` targets need it for the BUG-7 test's premise.
- Keep the existing `fenceRoot(files)` call signature working: every fence and `saRoot` test calls it with one argument.

### The simple sites

| Site | Before | After |
|---|---|---|
| `.t128-launch-` (737) | `dir` in `shared/resources/tests`, `entry: shell:${relative(REPO_ROOT, script)}` | `root = fenceRoot({ "exits-127.sh": { text, mode: 0o755 } })`, `entry: "shell:exits-127.sh"`, `repoRoot: root` |
| `.t128-errall-` (854) | same shape | same shape; the `$HOME/PWNED-h` escape assertion is unchanged |
| `.obs73-` (884) | two scripts and a record file in `dir` | both scripts in `root`; the record file can live in `root` too (it is not probed) |
| `.t131-mutant-` (4348) | copies `report-lint.js`, `change-log.js`, `implementation-report-template.md` into `dir` | `fenceRoot({}, { copy: ["shared/resources/report-lint.js", …] })`, edit the root's copy of `report-lint.js`, `entry: "shared/resources/report-lint.js#lintReport"`, `repoRoot: root`. Check that `LINT_ARGS()` (`loadTemplate()`) still reads from the real repository; that is a read, and fine |
| `.t136-source-` (1374), `.t136-collide-` (1582), `.t136-toplevel-exit-` (1699), `.t136-errexit-` (1729) | library in `tests/fixtures/shell-fn/.t136-*`, `fakeGh: FAKE_GH` | `root = fenceRoot({ "lib.sh": … }, { copy: [FAKE_GH] })`, `entry: "shell-fn:lib.sh#f"`, `fakeGh: FAKE_GH` (now relative to `root`), `repoRoot: root` |

## Phase 3: `t140Libs` and its callers

`t140Libs(tag, libs)` (near line 1808) becomes:

```js
/** Write each named library into a fresh temp root (with FN_LIB and FAKE_GH copied in). */
function t140Libs(tag, libs) {
  const root = fenceRoot(
    Object.fromEntries(
      Object.entries(libs).map(([n, t]) => [join(FN_FIXTURES, n), t]),
    ),
    { copy: [FN_LIB, FAKE_GH], prefix: `t140-${tag}-` },
  );
  return { root, dir: join(root, FN_FIXTURES) };
}
```

Keeping the libraries at `FN_FIXTURES/<name>` inside the root preserves every relative path a caller computes. Each caller then changes `relative(REPO_ROOT, …)` → `relative(root, …)`, adds `repoRoot: root` to `runProbeSpec`, passes `root` to `resolveEntry` and `namesGh`, and removes `root` in its `finally`. List the callers with `grep -n "t140Libs(" shared/resources/tests/security-probe.test.mjs` (16 hits including the definition) and tick each in the QA report.

Specific callers:

- **`if-source.sh`** (in the `gh-runtime` libs, near line 2163) embeds `JSON.stringify(join(REPO_ROOT, FN_LIB))` because "at run time cwd is the fixture dir". It needs the root's copy, but the root is not known when the `libs` object is built. Either build `libs` after `t140Libs` returns (write that one file afterwards), or make `t140Libs` accept a function `(root) => libs`.
- **The `namesGh` rows** (near lines 2090-2100) call `namesGh(join(dir, lib), REPO_ROOT)`. They become `root`. The "root via symlink" row symlinks `link → REPO_ROOT` and probes `realpathSync(join(dir, "semi.sh"))`. It must become `link → root`, or the file under probe is outside the linked root and the row tests something else.

## Phase 4: The three containment tests

For each one, write the before → after for every assertion into the QA report.

**resolveEntry: a symlink inside the root that points outside it (`.t140-symlink-`, near 1949).**

- `R = fenceRoot({}, { copy: [FN_LIB] })`, `dir = join(R, FN_FIXTURES, "x")` (mkdir), `outside` stays `mkdtempSync(join(tmpdir(), "t140-outside-"))`.
- Premise: `outside` is not under `R`. This is always true for two separate `mkdtemp` calls, but keep the assertion so a future edit cannot silently break it.
- Escape rows: `symlinkSync(outside, join(dir, "link"))`, `rel = relative(R, …)`, `resolveEntry(e, R)` → `outside-repo-root`.
- The "root reached through a symlink" row may stay on `REPO_ROOT`, because it creates nothing in the tree. Converting it to `R` is fine.
- In-tree link row: `symlinkSync(join(R, FN_LIB), join(dir, "lib-link.sh"))`, `resolveEntry(…, R)`, `entryPath === join(R, FN_LIB)`.

**`--fake-gh` containment on real paths (`.t140-fakegh-`, near 2034).**

- `R = fenceRoot({}, { copy: [FN_LIB, FAKE_GH] })`. The `outside/gh` copy stays.
- `fakeGh: relative(R, join(dir, "fake"))`, `repoRoot: R` → `bad-fake-gh`, nothing spawned.
- In-tree row: `symlinkSync(join(R, FAKE_GH), join(dir, "in-tree"))` → `engages`.

**A missing path is contained by its deepest existing ancestor (`.t140-missing-`, near 2339).**

- `R = fenceRoot()`, `dir` inside it, `link → outside`, `resolveEntry(…, R)` → `outside-repo-root`.
- The `via → REPO_ROOT` row creates nothing in the tree and may stay.

**Premise control (each of the three):** temporarily pass the wrong root (`REPO_ROOT` where the scratch directory is under `R`, or the reverse). Confirm the test fails, then revert. Record it.

## Testing Approach

- `command node --test shared/resources/tests/security-probe.test.mjs`, alone, 3× for the runtime median (before and after).
- The watched run, in a quiet checkout:

  ```bash
  inotifywait -m -r -e create,moved_to --format '%w%f' shared/resources/tests tests/fixtures \
    > "$SCRATCH/watch.txt" 2>/dev/null &
  W=$!
  command node --test shared/resources/tests/security-probe.test.mjs
  kill "$W"
  wc -l < "$SCRATCH/watch.txt"   # expect 0
  ```

  If `inotifywait` is absent, a 50 ms polling loop over `git status --porcelain --untracked-files=all` is the fallback. Say which one ran. Calibrate it first: run it once on the pre-change file, where it must report the `.t1*`/`.obs73-` directories.
- `npm test`, `npm run test:clean-checkout`, `npm run format:check`.

## Key Patterns and References

- `fenceRoot` / `saRoot`: the root builder to extend, not duplicate.
- The task.158 `..fake-gh` test (`probe-dotdot-gh-`): copying `FN_LIB` and `FAKE_GH` into a root and passing `repoRoot`.
- The `tmp-leak` ratchet in `npm test` flags any temp root left behind. Every `finally` removes the root.
