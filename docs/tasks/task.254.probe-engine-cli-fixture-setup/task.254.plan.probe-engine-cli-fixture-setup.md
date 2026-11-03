---
id: task.254.plan
title: "Implementation Plan: security-probe: a cli: entry can run a fixture setup"
type: plan
task-ref: task.254.probe-engine-cli-fixture-setup.md
---

# Implementation Plan: security-probe: a cli: entry can run a fixture setup

> Requirements and success criteria: [task.254.probe-engine-cli-fixture-setup.md](task.254.probe-engine-cli-fixture-setup.md)

## Overview

Move the shell-argv setup block into one helper, call it from the `cli:` arm too, and accept `--fixture-setup` for `cli:`. Reword the path-input decline. Update the prose that states the limit. Line numbers below are from `shared/resources/security-probe.mjs` on `develop` at the time of writing and will move; each is paired with the identifier.

## Phase-by-Phase Implementation Guide

### Phase 1: Reproduce both causes

**Files to modify:**
- `shared/resources/tests/security-probe.test.mjs` — add reproduction tests first; they are red until Phases 2 and 3.

**Exact changes:**
- Cause B. A tiny committed `cli:` fixture script (beside the other test entries) that exits 0 only when `git rev-parse --is-inside-work-tree` succeeds in its cwd. Run the engine on it with one legitimate case and no setup: expect `probes_executed: 0` or a `rejected` legitimate case. This is the failure the task removes.
- Cause A. Run `runCliCase` through the library with `sink: "filename"` and input `docs/prd`, then with a sink not in `MATERIALISED_SINKS` (`security-input-corpus.mjs:98` lists only `filename`). Expect the first to decline `cannot materialise` and the second to reach the spawn. If the second also declines, record that in the task's Change Log and stop: the wording change in Phase 3 is then the whole of cause A.
- Clean control. Replay `task.252.dod.1.security.cases.json` by hand in a scratch repository created by a setup script, and find what `post-check-failed` was. Likely the `--check` post-check wants a registered or committed tree. State the finding in the QA report.

### Phase 2: One setup helper, used by both arms

**Files to modify:**
- `shared/resources/security-probe.mjs`
- `shared/resources/tests/security-probe.test.mjs`

**Exact changes:**
- Extract `runCaseSetup({ setupPath, fixtureDir, env, timeoutMs, watch })` from the block in `runShellArgvCase` (`if (setupPath !== null) { … }`). It returns `{ ok: true }` or `{ ok: false, detail }`, where `detail` is the string the block passes to `errored(shell, …)` today. The shell-argv arm keeps its `errored(shell, detail)` and `continue`.
- In `runCliCase`, after `writeFixtureFiles(fixtureDir, files)` and before building `args`, call the helper when a `setupPath` is passed in. A failure records `outcome: "errored"` with the helper's detail and returns.
- Thread `setupPath` into `runCliCase`'s options where `runShellArgvCase` already receives it.
- `isShellArgvForm` at the `fixtureSetup` check becomes `isShellArgvForm || isCliForm`. Update the message to `applies to the cli: and shell-argv: entry forms only`.
- In the command-line check (`!isShellArgvEntry && opts.fixtureSetup !== undefined`) allow the cli entry too, and update its message.
- Carry `fixtureSetup` into the `cli:` result record the way the shell-argv path does (`fixture_setup`).
- The existing test `"--fixture-setup on a cli: entry"` becomes an acceptance test. Add refusal tests for `shell:`, `shell-fn:` and `fence:` with the new message.
- Add a structural test: neither arm contains its own `bash`, `setupPath` spawn; both call the helper.

**Before/after (the check):**

```js
// before
if (!isShellArgvForm) {
  return decline("bad-fixture-setup", "--fixture-setup applies to the shell-argv: entry form only");
}
// after
if (!isShellArgvForm && !isCliForm) {
  return decline("bad-fixture-setup", "--fixture-setup applies to the cli: and shell-argv: entry forms only");
}
```

### Phase 3: Say why a path-bearing input is declined

**Files to modify:**
- `shared/resources/security-probe.mjs` — the two `cannot materialise` declines, one in the shell arm and one in `runCliCase`.

**Exact changes:**
- Keep the existing `${e.message}` and append: `sink "<name>" writes the input as a file name; an input that is a path needs a sink that is not materialised`.
- Test the exact text for both arms. Change the wording only; leave the control flow alone.

### Phase 4: Documentation, bundles and proof

**Files to modify:**
- `shared/resources/finalise-dod-security-prompt.md` — the paragraph at "A refusal whose input is repository state": replace "is not reachable on `cli:` yet … closing it takes a recorded override" with how to do it (`cli:` plus `--fixture-setup`). Keep the zero-guard sentence for a guard no form reaches.
- `shared/resources/probe-boundary-rule.md` — the `bad-fixture-setup` row and the form table.
- `shared/resources/security-probe.mjs` header comment — the "stays shell-argv:'s" sentence.
- `CHANGELOG.md` — one entry citing task 254.

**Exact changes:**
- `npm run bundle`, then `npm run bundle:check`.
- Write `shared/resources/tests/fixtures/` setup script only if the existing tests keep theirs elsewhere; otherwise reuse the shell-argv test setup.
- Proof run: the T252 plan with `--entry cli:shared/resources/migrate-doc-numbering.mjs`, a committed setup that runs `git init` and sets a local identity, and a non-materialised sink for the path input. Record the command and the executed count in the QA report.

## Key Patterns and References

- `caseWatchedSpawn` and the write watch (`security-probe.mjs`, near `watchedSpawn`) are what keep a setup inside the case directory. Reuse them; do not add a second spawn.
- `fixtureCaseEnv` builds the `cli:` environment and refuses `HOME`, `TMPDIR`, `LC_ALL`, `PATH`, `NODE_OPTIONS` and loader variables. A setup runs with the same env, so it needs no secrets and has no global git identity.
- The mutation list in the task's § 8 is part of the work, not an extra.

## Testing Approach

- `command node --test shared/resources/tests/security-probe.test.mjs` after each phase.
- Phase 2 order: run the shell-argv setup tests green, extract, run them green, then add the `cli:` call. A red between steps points at the refactor.
- After Phase 4: `npm run bundle:check`, `npm test`, and `CI=true` for the CI-only guards.
