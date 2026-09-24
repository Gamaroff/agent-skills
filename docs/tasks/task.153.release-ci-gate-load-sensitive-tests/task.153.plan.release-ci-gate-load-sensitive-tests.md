---
id: task.153.plan
title: "Implementation Plan: Release gate reads CI's verdict; load-sensitive tests name themselves"
type: plan
task-ref: task.153.release-ci-gate-load-sensitive-tests.md
---

# Implementation Plan: release CI gate and load-sensitive tests

> Requirements and success criteria: [task.153.release-ci-gate-load-sensitive-tests.md](task.153.release-ci-gate-load-sensitive-tests.md)

## Overview

A pure verdict module that `release.sh` calls before its local `npm test`; one marker helper in
`spawn-budget.mjs` with a two-direction guard test; and a CR-6 restructure that retries only the
precondition miss. Phases 1–2 and 3–4 are independent and revert independently.

## Phase-by-Phase Implementation Guide

### Phase 1: `scripts/release-ci-verdict.mjs`

**The workflow table — the one definition.** Every other reader (the parity test, the refusal
message) imports it.

```js
export const WORKFLOWS = Object.freeze({
  // push to main is unconditional — a missing run is unverifiable, not green
  required: ["Test", "ShellCheck"],
  // push.paths-filtered — absent is fine, present-and-not-green is not
  whenPresent: ["Validate Skills", "Docs link check"],
});
```

**The reduction rule.** Runs arrive as `gh run list --json workflowName,status,conclusion,event,databaseId`
objects. Reduce per workflow, then across workflows; the worst verdict wins
(`red` > `pending` > `unverifiable` > `green`).

| Runs for one workflow on this SHA | Workflow verdict |
| --- | --- |
| any run with `conclusion` in `failure`, `timed_out`, `startup_failure`, `action_required` | `red` |
| else any run with `status` other than `completed` | `pending` |
| else at least one run with `conclusion: success` | `green` |
| else (no runs, or only `cancelled` / `skipped` / `neutral`) | `unverifiable` for `required`; ignored for `whenPresent` |

Two `Test` runs per SHA is normal — the release commit is pushed to `main`, then to `develop` by the
sync step (`release.sh:369-386`); `gh run list --commit 398107e6…` shows exactly that for v0.51.0. The
rule reads all of them: one red among them is red.

**Signatures.**

```js
/** @returns {{ reason: "green"|"red"|"pending"|"unverifiable", sha: string,
 *              workflows: Array<{ name, verdict, runs: Array<{ id, status, conclusion, event }> }>,
 *              detail: string }} */
export function ciVerdict(runs, workflows = WORKFLOWS, sha = "")

/** Spawns `gh`; any spawn error, non-zero exit or non-array JSON → reason "unverifiable". */
export function fetchRuns(sha, { spawn = spawnSync } = {})

export function main(argv) // --sha <40-hex> required; --json; exit 0 green / 1 otherwise / 2 usage
```

The entry guard compares real paths (the pattern `39e595f9` just applied to `security-probe.mjs` for
obs #126), so the CLI also runs through the `.agents/skills` symlink layout. Write stdout with the
drain-safe exit the repository already uses (see the `stdout-drain-on-exit` test) — never
`process.exit()` straight after an async `stdout.write`.

### Phase 2: `scripts/release.sh`

**Anchor**: immediately after `ok "Up to date with origin/main"` (`:153`), before
`heading "Pre-release checks"`.

```bash
# ── 1b. CI verdict for the commit being released ─────────────────────────────
# A local npm test is a claim about this machine. The release is certified by the
# verdict CI recorded for this SHA — obs #150: the local suite was green through
# five consecutive red Test runs on develop (2026-09-21).
heading "CI verdict"
CI_JSON=$(command node scripts/release-ci-verdict.mjs --sha "$LOCAL" --json) || true
CI_REASON=$(printf '%s' "$CI_JSON" | command node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(JSON.parse(s).reason)}catch{process.stdout.write("unverifiable")}})')
if [[ "$CI_REASON" == "green" ]]; then
  ok "CI green for ${LOCAL:0:8}"
elif [[ "$SKIP_CI_CHECK" == true ]]; then
  warn "CI is ${CI_REASON} for ${LOCAL:0:8} — proceeding UNVERIFIED against CI (--skip-ci-check)"
elif [[ "$DRY_RUN" == true ]]; then
  warn "CI is ${CI_REASON} for ${LOCAL:0:8} — a real run would refuse here"
  WOULD_REFUSE="CI ${CI_REASON}"
else
  err "CI is ${CI_REASON} for ${LOCAL:0:8} — refusing to release"
  # print per-workflow detail from CI_JSON, then:
  echo "Wait for CI to finish green, or pass --skip-ci-check if you have confirmed it another way."
  exit 1
fi
```

- `$LOCAL` is the SHA the `:137-152` block just proved equal to `origin/main` — reuse it, do not
  re-read `HEAD`.
- Parse the flag in the `case` at `:53-75`: `--skip-ci-check) SKIP_CI_CHECK="true"; shift ;;` (quoted
  like the neighbouring arms, per the SC2209 comment at `:55-57`).
- `--retry` does not run this block (it re-tags an existing release; its own guard is `:252-261`).
- Summary block (`:389-400`): when `WOULD_REFUSE` is set, print `Would have REFUSED: ${WOULD_REFUSE}`.
- Header (`:4-32`): add the usage line and the step; change `# Requires:` to name `gh (authenticated)`.

**The `npm test` wrapper** (replaces `:185-191`):

```bash
if ! npm test; then
  err "npm test failed."
  echo "  If the failing assertion says LOAD-SENSITIVE, re-run that file alone"
  echo "  (command node --test <file>). If it passes alone, re-run the release —"
  echo "  do not investigate it. Anything without the marker is a real red."
  echo "  List: docs/contributing/traps.md § Load-sensitive tests"
  exit 1
fi
```

**Test harness** (`tests/release-ci-gate.test.js`):

- `mkdtemp` → `git init --bare origin.git`; clone to `work/`; commit a `CHANGELOG.md` with a non-empty
  `[Unreleased]` and a copy of `scripts/release.sh` + `scripts/release-ci-verdict.mjs`; create
  `develop` and `main`, push both.
- `bin/` on the front of `PATH` holding `gh` (a shell script that `cat`s a fixture JSON chosen by an
  env var, or exits non-zero) and `npm` (touches `$NPM_MARKER`, exits `$NPM_EXIT`). The "no `gh`
  installed" case is covered at unit level by `fetchRuns`'s injected `spawn` returning `ENOENT`;
  stripping `gh` from a real `PATH` would also strip `git` and `node` on hosts that share a bin dir.
- Run `bash scripts/release.sh …` with `cwd: work`, via `spawnSync` with `spawnBudget("RELEASE_GATE")`.
- Assert on exit status and output text; never on elapsed time.

### Phase 3: the marker

**`shared/resources/spawn-budget.mjs`** — append:

```js
/**
 * The load-sensitive class (obs #157, #166). A test whose pass depends on machine
 * load must say so where the failure is READ, not only where the source is read:
 * a red that means "re-run me" and a red that means "you broke something" are
 * otherwise indistinguishable. Every caller is listed in docs/contributing/traps.md
 * § Load-sensitive tests, and tests/load-sensitive-marker.test.js holds the two equal.
 */
export const LOAD_SENSITIVE = "LOAD-SENSITIVE";
export function loadSensitive(detail) {
  return `${LOAD_SENSITIVE} — timing depends on machine load; re-run this file alone before believing it: ${detail}`;
}
```

Do not write the `docs/…` path as a `shared/resources/…` literal anywhere in this file — inside
`shared/resources/` that literal is a bundling instruction (AGENTS.md § Shared Resources).

**The four assertions** — wrap only the message; the threshold stays:

```js
// qa-execute-snippets.test.mjs:795 — before
assert.ok(elapsed < 10_000, `the 30s sleep must be truncated, took ${elapsed}ms`);
// after
assert.ok(elapsed < 10_000, loadSensitive(`the 30s sleep must be truncated, took ${elapsed}ms`));
```

Same shape at `access-config-parity.test.mjs:613`, `qa-diminishing-returns.test.mjs:305` (both import
from `../spawn-budget.mjs`; `access-config-parity` already does) and `handoff-verify.test.js:1429`,
which loads the module the way it already loads the corpus (`:43-60`): a path assembled from parts
(`["shared","resources","spawn-budget.mjs"]`) and a dynamic `import()` in `test.before`, so the
bundler does not read it as a `shared/resources/` reference.

Run `npm run bundle` — it refreshes `skills/{finalise,qa-story,qa-task,review-security}/references/spawn-budget.mjs`
and `skills/{qa-story,qa-task}/references/tests/qa-execute-snippets.test.mjs`.

**`docs/contributing/traps.md`** — replace § *Two tests to distrust differently* (`:109-114`) with:

```markdown
### Load-sensitive tests

A failure whose message starts `LOAD-SENSITIVE` is a timing assertion that depends on machine load.
Re-run that file alone before believing it; a green alone means re-run the gate, not investigate.
A failure **without** the marker is real — do not re-run it away. Every file that carries the marker:

- `shared/resources/tests/access-config-parity.test.mjs`
- `shared/resources/tests/qa-diminishing-returns.test.mjs`
- `shared/resources/tests/qa-execute-snippets.test.mjs`
- `skills/session-handoff/tests/handoff-verify.test.js`

`tests/load-sensitive-marker.test.js` fails when this list and the code disagree.

The **stdout-drain premise test is not load-sensitive any more** (fixed 2026-09-04; …) — keep the
existing sentence.
```

**`tests/load-sensitive-marker.test.js`**:

- Direction A: `git grep -nE <PATTERN> -- '*.test.js' '*.test.mjs' ':!skills/*/references/*'` with
  `PATTERN = "Date\\.now\\(\\) - [A-Za-z0-9_]+ *<|elapsed *<"` (the exact enumeration in the task
  doc). For each hit, read forward from the enclosing `assert` call to its closing paren and require
  `loadSensitive(`. Floor: ≥ 4 hits.
- Direction B: `git grep -l "loadSensitive("` over the same pathspec, minus `shared/resources/spawn-budget.mjs`
  and this test; parse the backticked paths under `### Load-sensitive tests` up to the next `###`
  (fences skipped — traps.md § *Do not use a next-heading lookahead*). Assert set equality, naming
  each side's extras. Floor: ≥ 4 files.

### Phase 4: CR-6

**Extract** in `handoff-verify.test.js`, above the CR-6 test:

```js
// Retry ONLY a precondition miss: the verifier timed out before the grandchild
// existed, so the run proves nothing about the group kill. Any other outcome
// without a pid file is a real failure — retrying it would hide a verifier that
// stopped starting the command at all.
function retryUntilForked(scheduleSeconds, attempt) {
  const misses = [];
  for (const t of scheduleSeconds) {
    const r = attempt(t); // { obj, forked, pidFile }
    if (r.forked) return r;
    const timedOut = /timeout \(/.test(r.obj?.lines?.[0]?.detail ?? "");
    if (!timedOut)
      assert.fail(`no grandchild and no timeout — not a load miss: ${JSON.stringify(r.obj)}`);
    misses.push(t);
  }
  assert.fail(loadSensitive(`the grandchild never started within ${misses.join("s, ")}s timeouts`));
}
```

- Schedule: `[3, 6, 12].slice(0, 1 + budget.retries)` with `budget = spawnBudget("HANDOFF")`.
- `attempt(t)`: a **fresh** `tempDir()` per attempt (a stale pid file from a miss must not satisfy the
  next attempt), the same `slow.js` / `package.json` / `handoff.md` fixture, `runCli([... "--timeout",
  String(t)])`, `forked: fs.existsSync(pidFile)`.
- Keep the two existing assertions on the *returned* attempt: `verdict === "unverifiable"` and
  `detail` matching `timeout (${t}s)` — the regex must use the attempt's `t`, not the literal `3`.
- The group-kill block (`:1390-1409`) is unchanged.

**Unit cases** (fake `attempt`, no spawning): first-hit; miss-then-hit; non-timeout miss fails at once
and does **not** call `attempt` again; all-miss throws with `LOAD-SENSITIVE`.

### Phase 5: docs

- `releases.md` § Release checklist, after the `npm run ci` note (`:19-25`): the CI boxes are now
  enforced by `release.sh` step 1b for `Test` and `ShellCheck`, and checked-when-present for
  `Validate Skills` and `Docs link check`; and a short *Load-sensitive reds* paragraph pointing to
  `traps.md` § Load-sensitive tests with the re-run-alone rule.
- `releases.md` § Cutting a release (`:157-164`): insert the CI-verdict step between steps 1 and 2,
  renumber, and add `bash scripts/release.sh --patch --skip-ci-check` to the usage block with one
  line on when it is legitimate.
- `releases.md:66` — keep; it is still true that `release.sh` does not run `format:check`, `eval:all`
  or `shellcheck` locally. Add that it now reads CI's verdict for them.

## Key Patterns and References

- `spawnBudget()` / `neverRan()` — `shared/resources/spawn-budget.mjs:86`, `:116`: retry only a child
  that never answered; reuse the retry count, do not add a knob.
- CR-7's bounded poll — `handoff-verify.test.js:1520-1524`: the sibling that already establishes its
  precondition before acting.
- `PATH` stub for `gh` — `shared/resources/tests/gh-stage.test.mjs:1437`.
- `--json reason` contract — `shared/resources/tracker-comment.js` (exit codes and `reason` field).
- Real-path entry guard — commit `39e595f9` (obs #126).
- Patch with split/join and assert the split count, never `String.replace` with a user string.
- `command node`, never bare `node`, in any shell this task edits or documents.

## Testing Approach

- New files: `tests/release-ci-verdict.test.js`, `tests/release-ci-gate.test.js`,
  `tests/load-sensitive-marker.test.js` — all in the `'tests/*.test.js'` glob.
- Edited: `skills/session-handoff/tests/handoff-verify.test.js` (in the
  `'skills/session-handoff/tests/*.test.js'` glob).
- Before trusting a local green, move the gitignored `.agents/skills` symlink aside (it has masked CI
  reds before) and run `npm run ci`.
- Mutation proofs M1–M10 from the task's Code Quality criteria, each reverted after its red is seen,
  each recorded with the test name that went red.
