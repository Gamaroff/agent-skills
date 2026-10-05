---
id: task.185.plan
title: "Implementation Plan: review-pr eval suite"
type: plan
task-ref: task.185.review-pr-eval-suite.md
---

# Implementation Plan: review-pr eval suite

> Requirements and success criteria: [task.185.review-pr-eval-suite.md](task.185.review-pr-eval-suite.md)

## Overview

Make the report number a script, then give the shared eval harness three opt-in capabilities a
GitHub-facing skill needs (a setup hook, a fake `gh`, repeat runs), then build four `/review-pr`
scenarios on top. Every harness change is keyed on a new `scenario.json` field, so existing
scenarios cannot change behaviour.

## Phase-by-Phase Implementation Guide

### Phase 1: `next-report-number.sh`

**Files:** `skills/review-pr/scripts/next-report-number.sh` (new, `chmod +x`),
`skills/review-pr/SKILL.md` Step 7, `skills/review-pr/tests/review-pr.test.js`.

Shape — match the header style of `scripts/parse-target.sh` (purpose, usage, output, refusal, rules):

```bash
#!/usr/bin/env bash
# next-report-number.sh — print the next {n} for a work item's .pr-review.{n}. report.
# Usage:  next-report-number.sh <work-item-dir>
# Output: one integer on stdout, exit 0. Refusal: exit 2, message on stderr.
# Rule:   highest existing {n} + 1, never count + 1 — a directory holding .1. and .3.
#         gets 4, because count + 1 would overwrite .3. (obs #272). Numeric, base 10.
set -u
dir=${1:-}
[ -n "$dir" ] && [ -d "$dir" ] || { echo "next-report-number: refused (usage): not a directory: $dir" >&2; exit 2; }
max=0
for f in "$dir"/*.pr-review.*.md; do
  [ -e "$f" ] || continue                       # bash: unmatched glob stays literal
  n=$(basename "$f" | sed -nE 's/.*\.pr-review\.([0-9]+)\..*/\1/p')
  [ -n "$n" ] || continue
  n=$((10#$n))
  [ "$n" -gt "$max" ] && max=$n
done
echo $((max + 1))
```

The script runs under `bash` explicitly (shebang plus the `bash …` call in Step 7), so the zsh
no-match abort does not apply to its own glob. The tests still run the **Step 7 call line** under
both shells, as `parse-target.sh`'s tests do (`review-pr.test.js` `SHELLS`, `shArgv`).

Step 7 replacement for `SKILL.md:633`:

```bash
N=$(bash .agents/skills/review-pr/scripts/next-report-number.sh "{work-item-dir}") || exit 1
```

Then one sentence of rule (highest + 1, a gap is why) and a pointer to the script — the rule lives
in the script's header, not twice. Keep the existing test at `review-pr.test.js:538` and add the
behaviour tests beside it. If `review-security`'s probe engine needs the script reachable (task.176
had to make `parse-target.sh` reachable), follow the same route.

Tree measure for the success criterion:

```bash
git ls-files | grep '\.pr-review\.' | xargs -n1 dirname | sort -u | while read -r d; do
  echo "$d $(bash skills/review-pr/scripts/next-report-number.sh "$d")"; done
```

### Phase 2: harness extensions

**`runner.mjs`** — after `makeSandbox` (`runner.mjs:235`) and before building `driverEnv`:

```js
let setupEnv = {};
if (scenario.setup) {
  const mod = await import(pathToFileURL(path.resolve(absScenarioDir, scenario.setup)).href);
  try {
    const out = (await mod.setup({ sandbox, scenarioDir: absScenarioDir, repoRoot: REPO_ROOT, scenario })) || {};
    setupEnv = out.env || {};
  } catch (e) { /* write error, rm sandbox unless KEEP_SANDBOX, exit 1 */ }
}
// driverEnv = { ...envFromFile, ...setupEnv, SCENARIO_DIR }, with
// PATH: setupEnv.PATH ? `${setupEnv.PATH}${path.delimiter}${process.env.PATH}` : undefined
```

Add `cliArgs: scenario.cliArgs || []` to `baseCtx`. Add a `noFileMatching` case to `runAssertions`.
Run `scenario.liveAssertions` after `assertions` when `driverName !== "replay"` (see Phase 3).

**Drivers and env.** `claude-cli.mjs` spreads `process.env` then `ctx.env`, so a `PATH` in
`ctx.env` replaces the parent's. That is why the runner composes the full prefixed `PATH` itself.
`replay.mjs` ignores env, which is fine: replay never runs `gh`.

**`claude-cli.mjs`** — `const args = ["-p", ctx.prompt, "--add-dir", ctx.sandbox, ...(ctx.cliArgs || [])];`
and `timeout: Number(process.env.EVAL_TIMEOUT_MS) || 5 * 60 * 1000`.

**`lib/fake-gh.mjs`** — exports `installFakeGh(sandbox, fixtures)`. It writes
`<sandbox>/.eval/bin/gh` (a `#!/bin/sh` launcher: `exec node "<abs path>/fake-gh.mjs" "$@"`, with
`command -v node` resolved at install time so an nvm shell function cannot intercept it) and
`<sandbox>/.eval/gh-fixtures.json`, and returns `{ PATH: "<sandbox>/.eval/bin" }`. When run as a
program it:

- reads the fixtures from `$EVAL_GH_FIXTURES` (set by the launcher) and appends
  `{ argv, refused?, unhandled? }` to `<sandbox>/.eval/gh-calls.jsonl`;
- matches on the subcommand pair (`pr view`, `pr diff`, `pr list`, `repo view`, `issue view`,
  `api` GET), and honours `--json` field selection and `-q`/`--jq` well enough for the skill's calls.
  Implement `-q` by shelling to `jq` when it is present and refusing (unhandled) when not, rather than
  re-implementing jq;
- refuses writes: `pr comment|review|edit|merge|close|create`, `issue comment|edit|close`, and `api`
  with `-X`/`--method` ≠ `GET`.

Fixture format (`gh-fixtures.json`):

```json
{
  "pr view": { "feature/task.901.widget-age-gate": { "number": 901, "...": "..." }, "901": "@same" },
  "pr diff": { "901": "@file:pr-901.diff" },
  "pr list": [ { "number": 901, "headRefName": "feature/task.901.widget-age-gate", "state": "OPEN" } ],
  "repo view": { "owner": { "login": "eval" }, "name": "widgets" }
}
```

**`lib/git-sandbox.mjs`** — `createSandbox({ dir, … })`: when `dir` is set, `mkdir -p` it and use it
in place of `mkdtemp`. The `cleanup` returned for a caller-owned `dir` must not delete it (the runner
owns the sandbox).

**`repeat.mjs`** — spawn `process.execPath runner.mjs <dir>` N times sequentially (live runs share
`~/.claude` state; don't parallelise), print one `run i/N: pass|fail` line each and a final
`passed P/N (min K)`, exit `P >= K ? 0 : 1`.

### Phase 3: scenarios

**`evals/review-pr/setup.mjs`** — the one setup for all four scenarios; variations come from
`scenario.fixture`:

1. `git init --bare <sandbox>/.eval/origin.git`; `createSandbox({ dir: <sandbox> })` on `develop`.
2. Write the base tree: `src/age.js` (`isAdult` absent or stubbed), `docs/tasks/task.901.widget-age-gate/task.901.widget-age-gate.md` with three numbered success criteria ("18 and over is an adult" among them) and `status: accepted`, plus the trail: `task.901.implementation.1…md`, `task.901.review.1…md`, `task.901.qa.1…md`, `task.901.gate.1…yml` (`gate: PASS`), `task.901.dod.1…md`, `sprint-review-summary.md`. Commit, `git remote add origin`, push `develop`.
3. Branch `feature/task.901.widget-age-gate` (or `scenario.fixture.branch`), apply the scenario's change set (`fixture.files`), commit, push.
4. Write the diff `git diff origin/develop...origin/<branch>` to the fixture file `gh pr diff` serves, so the fake and the git path agree byte for byte.
5. `scenario.fixture.existingReports` — e.g. `{ "1": "…", "3": "SENTINEL-3" }` — written into the task dir and committed.
6. Copy `skills/review-pr` (minus `tests/`) to `.agents/skills/review-pr` and `.claude/skills/review-pr`.
7. `installFakeGh(sandbox, fixtures)`; return `{ env: { PATH: <bin>, GH_TOKEN: "", GITHUB_TOKEN: "" } }`.

`scenario.json` (live-relevant fields):

```json
{
  "skill": "review-pr",
  "setup": "../../setup.mjs",
  "prompt": "/review-pr 901",
  "cliArgs": ["--allowedTools", "Bash", "Read", "Grep", "Glob", "Write", "Edit", "Agent", "Skill"],
  "fixture": { "...": "..." },
  "assertions": [ "..." ]
}
```

Confirm the exact `--allowedTools` spelling the installed `claude` accepts (`claude --help`) before
the first live run; the list above is the intent, not a verified invocation.

Assertions per scenario (report path `$SANDBOX/docs/tasks/task.901.widget-age-gate/task.901.pr-review.{n}.widget-age-gate.md`):

| Scenario | Assertions |
|---|---|
| 01-happy | `fileExists` report `.1.`; `fileMatches` `\*\*Verdict:\*\*.*APPROVE`; `fileMatches` `## Machine-Readable Findings`; `fileDoesNotMatch` `.eval/gh-calls.jsonl` `"refused":true` |
| 02-renumber-gap | `fileExists` `.4.`; `fileMatches` `.3.` `SENTINEL-3`; `fileAbsent` `.2.` |
| 03-unanchored | `noFileMatching` `$SANDBOX/docs` `\.pr-review\.`; `fileDoesNotMatch` gh-calls `"refused":true` |
| 04-planted-bug | `fileExists` `.1.`; `fileDoesNotMatch` `\*\*Verdict:\*\*.*APPROVE`; `fileMatches` `CR-\d+.*src/age\.js` |

Every scenario also asserts `fileDoesNotMatch` gh-calls `"unhandled":true`. `fileDoesNotMatch`
fails on a missing file (`assertions.mjs:47-48`), and replay never runs `gh`, so setup writes an empty
`.eval/gh-calls.jsonl`: replay and live then read the same file.

**`liveAssertions`** (runner, Phase 2): an array run after `assertions` only when the driver is not
`replay`. Every review-pr scenario puts `fileMatches` gh-calls `"pr","view"` there. It proves the
fake `gh` was the one called; a run that reached the real `gh` leaves the log empty and fails here.

**Replay golden output:** for each scenario, a `replay/` tree holding only the report the live run is
expected to write (scenario 03: nothing). Generate it from a passing live run, then trim to a minimal
valid report so it does not pin model wording.

**Scenario 03:** branch `chore/tidy`, no `task.*` stem, no document carrying `pr_number`, PR body
naming no issue. The fake `gh pr list` and `issue view` return empty results, not errors.

**Scenario 04:** `src/age.js` gets `export const isAdult = (age) => age > 18;` and a test that checks
17 and 30 only. The criterion in the task doc says "18 and over".

### Phase 4: wiring

```json
"eval:review-pr": "for s in evals/review-pr/scenarios/*/; do node evals/shared/runner.mjs \"$s\" || exit 1; done",
"eval:review-pr:cli": "for s in evals/review-pr/scenarios/*/; do DRIVER=claude-cli node evals/shared/repeat.mjs \"$s\" --runs ${EVAL_RUNS:-5} || exit 1; done"
```

Per-scenario `minPass` lives in `scenario.json` (`"live": { "minPass": 4 }`), so the script line
does not hard-code it; `repeat.mjs` reads it when `--min-pass` is absent. Append
`evals/review-pr/scenarios/*/` to `eval:all`. If `fixture/` trees are committed, add
`!evals/**/fixture/`, `!evals/**/fixture/**/`, `!evals/**/fixture/**` **after** the replay block in
`.gitignore` (negations only override earlier rules).

## Key Patterns and References

- Bash + zsh test idiom: `skills/review-pr/tests/review-pr.test.js:26-33`.
- Script header style: `skills/review-pr/scripts/parse-target.sh:1-30`.
- Runner extension precedent: `stages`/`killOn` in `runner.mjs` — opt-in by field, default path unchanged.
- `command node`, never bare `node`, in any shell snippet (memory: nvm shell function).
- Replay fixtures must be git-tracked (memory: `.gitignore` negation block at the end).
- Before trusting a local green, move the gitignored `.agents/skills` symlink aside (memory) — the
  sandbox install must not lean on it.

## Testing Approach

- `node --test evals/shared/tests/*.test.mjs` for the harness pieces.
- `node --test skills/review-pr/tests/*.test.js` for the script.
- `npm run eval:all` before and after Phase 2 — every pre-existing scenario must give the same result.
- `KEEP_SANDBOX=1 DRIVER=claude-cli node evals/shared/runner.mjs evals/review-pr/scenarios/01-happy`
  for the first live run; inspect `.eval/gh-calls.jsonl` and the report by hand before tuning
  assertions.
- Mutation proofs as listed in the task's Testing Strategy.
