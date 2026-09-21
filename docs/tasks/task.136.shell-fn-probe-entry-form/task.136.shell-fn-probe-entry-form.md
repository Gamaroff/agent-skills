---
id: task.136
title: "[Task 136] A sourced function library is a boundary the shell: entry form runs past: a shell-fn:<path>#<function> entry that sources the file and calls the function, and a fake-gh affordance so a boundary that consults a CLI can be probed offline"
type: task
description: "Give security-probe.mjs a second shell entry form — shell-fn:<path>#<function> — that sources a function library and calls the named function with the corpus case as argv under bash and zsh, plus a --fake-gh fixture so a boundary that shells out to gh (gh-labels.sh) can be executed offline; the finalise security gate then counts real executions for the boundary class it currently FAILs on the zero-guard, and the human override recorded on task.125 stops recurring."
tags: [security, probe, finalise, qa-task, shell, gh-labels]
category: infrastructure
status: planned
priority: High
created: 2026-09-21
updated: 2026-09-21
assignee:
estimated_effort_hours: 8
risk_level: medium
github_issue: 448
---

# Technical Task: A `shell-fn:` entry form for the security probe, and a fake-`gh` affordance

**Status:** Planned
**GitHub Issue**: [#448](https://github.com/Gamaroff/agent-skills/issues/448)

---

## 1. Overview

Task.128 gave `shared/resources/security-probe.mjs` its `shell:<path>` entry form: a boundary delivered as a **script** taking one positional argument is materialised into a fixture directory and run under `bash` and `zsh`, and the verdict is computed from exit status and stdout exactly as for a JS export. It covers a refusing script. It does not cover the other shape shell boundaries take in this repository — a **function library** that is `source`d and whose function is then called. On task.125 the finalise security agent fired the boundary rule on `shared/resources/gh-labels.sh` (`gh_labels_filter LABEL...`), ran the `shell:` form, and executed `bash gh-labels.sh <fixture-dir>` 28 times: the file was sourced and exited, the function was never called, every case produced the same `"" ≠ "12\n"` mismatch, and the verdict was `absent` with `escaped 0`. The zero-guard turned that into a low FAIL; Step 8a refused the fix because it lands in `security-probe.mjs`, outside the task's Files Summary; the operator overrode and accepted on `tests/gh-labels.test.js` plus twenty by-hand executions. Obs #138 records that as the second instance (the first was task.130's two boundaries, before task.128 landed).

**Scope**: `shared/resources/security-probe.mjs` (entry resolution, a function-call runner, a fake-`gh` PATH shim), `shared/resources/tests/security-probe.test.mjs`, `shared/resources/probe-boundary-rule.md` (the "not importable" rule gains a second branch), `shared/resources/finalise-dod-security-prompt.md` and the qa-task / qa-story Step 3b prose that name the entry forms, one green fixture (`gh-labels.sh`) and one red fixture, bundled copies, CHANGELOG.

**Key deliverables**: (1) `--entry shell-fn:<relative/path.sh>#<function>` — the same containment as `shell:`, `kind: "shell-fn"`, and a runner that for each corpus case executes `bash --noprofile --norc -c 'source "$1"; shift; "$FN" "$@"'` (and the zsh equivalent) in the fixture directory with the case's input as argv, reading the verdict from exit status and stdout; the record's `entry` carries the form, and `totals.executed` is the engine's count. (2) `--fake-gh <dir>` — a directory prepended to `PATH` for the run, holding an executable `gh` whose behaviour is a fixture (a `label list` reply, an `issue create` that records its argv to a file and prints a number), so a boundary that consults `gh` is executed against a known answer rather than the network; no `--fake-gh` and a boundary that calls `gh` still produces a real, attributable mismatch rather than a hang. (3) The rule, stated once in `probe-boundary-rule.md`: a sourced library is reached through `shell-fn:`, a script through `shell:`, and the header signal that tells the two apart is the presence of a `source it` line or a function definition with no top-level call. (4) Tests: `gh-labels.sh#gh_labels_filter` against the `filename`-shaped label corpus is the green fixture — hostile labels dropped, legitimate ones printed — and a fixture library whose function echoes its argument unfiltered is the red one; a mutation that runs the function without sourcing (the task.125 shape) returns to `absent`.

**Expected outcome**: the finalise security gate on a task whose boundary is a sourced shell function reads `engages` or `present-but-inert` from executions the engine counted, and the override path recorded on task.125's DoD § Step 5 is not exercised again for this boundary class.

---

## 2. Motivation

### Current Problems

- **The instrument covers scripts, not libraries.** `shell:` runs the file. A library run as a file defines its functions and exits 0 with no output — which the engine correctly reports as `absent`, because from the outside nothing was rejected. The verdict is right about what it measured and wrong about the control.
- **The gate fails closed on the wrong half.** By the zero-guard, `executed: 0` (task.130) or `escaped: 0` with a uniform mismatch (task.125) is a FAIL, and the rule is right: a harness count is a self-report. But a FAIL the fix cannot address inside the task (Step 8a: `inside-files-summary` refused) is a human override every time, and an override is a gate nobody reads twice.
- **A boundary that consults a CLI cannot be probed at all today.** `gh_labels_filter` calls `gh label list` once. Under the probe that call either hits the network (a probe that depends on credentials is not a probe) or fails and the function degrades to its no-labels path, so the filtering branch is never the one executed.
- **The workaround is by-hand evidence.** Task.125's acceptance rests on `tests/gh-labels.test.js` and twenty manual executions recorded in QA cycle 2 — real evidence, but not the engine's count, and the DoD says so.

### Benefits

- Every shell boundary shape in this repository — script and sourced function — has an entry form, so the security prompt's "not importable → shell entry" rule has no third case that ends in an override.
- A boundary that calls `gh` is executed against a fixture answer, so its filtering branch is the branch that runs.
- `totals.executed` is the engine's count for the whole shell surface; the zero-guard keeps its meaning and stops being a synonym for "shell".
- The `gh-labels.sh` control that nine GitHub skills source (`create-issue`, `ensure-*-github-issue` ×4, `sync-github-*` ×4) has a probe record rather than a manual one.

---

## 3. Technical Background

### Current Architecture

`resolveEntry(entry, repoRoot)` in `security-probe.mjs` (§ *Entry resolution*) accepts two spellings: `relative/path.mjs#exportName` → `{ kind: "js", entryPath, exportName }`, and `shell:relative/path.sh` → `{ kind: "shell", entryPath }` (`SHELL_PREFIX`). Both take the same containment (inside `--repo-root`, not under `node_modules`, no NUL). `runProbeSpec` dispatches on `kind`: the JS arm imports and calls the export; the shell arm materialises `MATERIALISED_SINKS` into a fixture directory and runs `<shell> <script> <fixture-path>` for each case under each shell in `probeShells()` (`bash` always; `zsh` when the host has it), then `compareExpected(expected, run, fixtureDir)` names every mismatch and `computeVerdict` derives one of the four verdicts from the counts — never from a caller-supplied field. `unverifiable` exits 1.

`shared/resources/gh-labels.sh` is the boundary that exposed the gap: a comment header (`# Source it (source references/gh-labels.sh || exit 1), then: gh_labels_filter LABEL...`), one function `gh_labels_filter()`, and no top-level call. It reads the repository's labels once with `gh label list --json name -L "$GH_LABELS_LIST_LIMIT"` and prints each candidate that is one line, non-empty, and present in that list.

`probe-boundary-rule.md` states the boundary rule and, since task.128, the header signal for "not importable → `shell:` entry". `finalise-dod-security-prompt.md` and qa-task / qa-story Step 3b name the JS and `shell:` forms.

### Target Architecture

```
--entry relative/path.mjs#exportName      kind: js        (unchanged)
--entry shell:relative/path.sh            kind: shell     (unchanged — a script, one positional argument)
--entry shell-fn:relative/path.sh#fn      kind: shell-fn  (NEW — source the file, call fn with the case as argv)
--fake-gh <dir>                           (NEW, optional — prepended to PATH for every shell run)
```

The `shell-fn` runner reuses the shell arm's fixture materialisation, shell list, timeout and `compareExpected` unchanged; the only new code is the command line it spawns and the `PATH` it spawns it with:

```js
// per case, per shell
spawnSync(shell, [...noRcFlags(shell), "-c", 'source "$1" || exit 97; shift; fn="$1"; shift; "$fn" "$@"',
                  "probe", entryPath, fnName, ...caseArgv],
          { cwd: fixtureDir, env: { ...process.env, PATH: fakeGhDir ? `${fakeGhDir}:${PATH}` : PATH, LC_ALL: "C" }, timeout });
```

Exit 97 is reserved for "the source itself failed" so a library with a syntax error is a named mismatch (`exit 97 ≠ 0`) rather than a silent `absent`. The fake `gh` is a fixture directory the caller supplies; the engine ships one under `tests/fixtures/fake-gh/` for its own tests and the security prompt names it for boundaries that call `gh`. It never resolves a real `gh`.

### Important Clarifications

- **Why a second entry form and not a flag on `shell:`.** `shell:` runs a file; `shell-fn:` runs a function inside a file. The `#` separator already means "the named thing inside this path" on the JS form, so `shell-fn:<path>#<fn>` reads the same way to the person writing the prompt — and `resolveEntry`'s error for a `shell:` spec with a `#` (`entry must be "shell:path" with no export name`) stays as it is, pointing at the new form.
- **Sits beside, not replaces.** `runProbeSpec` gains a third arm; the JS and `shell:` arms are untouched, and every existing fixture row in `security-probe.test.mjs` runs unchanged. The materialisation helper is shared, not copied.
- **The fake `gh` is an affordance, not a mock framework.** It is a directory on `PATH`. The engine records `fakeGh: <dir>` on the run so the record says what answered.
- **How the security agent tells the two shell forms apart** is a header signal, and it lives in `probe-boundary-rule.md` in the same paragraph as task.128's signal — not restated in the two prompts, which cite it.

---

## 4. Scope

### In Scope

✅ `shared/resources/security-probe.mjs` — `SHELL_FN_PREFIX`, `resolveEntry` third branch, `runProbeSpec` third arm, `--fake-gh` option and `PATH` prepend, exit-97 source failure
✅ `shared/resources/tests/security-probe.test.mjs` — resolution rows; green fixture (`gh-labels.sh#gh_labels_filter` with the fake `gh`); red fixture (a library whose function echoes unfiltered); the task.125 mutation (function never called → `absent`); source-failure row; containment rows mirrored from `shell:`
✅ `tests/fixtures/fake-gh/gh` — executable fixture answering `label list` and `issue create`
✅ `shared/resources/probe-boundary-rule.md` — the second shell branch and its header signal
✅ `shared/resources/finalise-dod-security-prompt.md`, `skills/qa-task/SKILL.md` and `skills/qa-story/SKILL.md` Step 3b — name `shell-fn:` and `--fake-gh` where `shell:` is named
✅ `npm run bundle`; CHANGELOG [Unreleased]

### Out of Scope

❌ Functions that read stdin, or that need more than argv — `shell:` already excludes stdin (task.128 § Out of Scope); a stdin form is a later task if one is ever needed
❌ Faking any CLI other than `gh` — the affordance is a directory on `PATH`, so a `jq` or `curl` fixture is a file in that directory, not engine work; naming them in the prompt is out of scope until a boundary needs one
❌ Changing the zero-guard, the four verdicts, or finalise Step 8a's `inside-files-summary` refusal — the gate is right; the instrument is what this task extends (obs #138 § Principle)
❌ task.131's markdown-structure sink and `internal` decision — a different boundary class

---

## 5. Breaking Changes

None — API stable. Both existing entry spellings resolve as before; `shell-fn:` is additive, `--fake-gh` is optional, and a run without it is byte-identical to today's. The probe record gains two optional fields (`kind: "shell-fn"`, `fakeGh`); `qa-gate-security-evidence.md` consumers read `verdict`, `reason` and `totals` and ignore unknown keys (verify with `grep -n 'kind\|fakeGh' shared/resources/qa-gate-security-evidence.md` before Phase 4).

---

## 6. Implementation Plan

> Detailed implementation guide: [task.136.plan.shell-fn-probe-entry-form.md](task.136.plan.shell-fn-probe-entry-form.md)

### Phase 1: The fixtures and the red rows

**Risk**: Low
**Files**: `shared/resources/tests/security-probe.test.mjs`, `tests/fixtures/fake-gh/gh`, `tests/fixtures/shell-fn/echo-unfiltered.sh`

- [ ] Fake `gh`: `label list` prints the fixture label set (`priority:high`, `priority:medium`, `priority:low`, `task`, `bug`) as JSON when `--json name` is passed; `issue create` appends its argv to `$FAKE_GH_LOG` and prints `https://…/issues/1`; anything else exits 2 naming the subcommand
- [ ] Red fixture library: one function that prints every argument, no filtering
- [ ] Rows: `resolveEntry("shell-fn:shared/resources/gh-labels.sh#gh_labels_filter")` → `{ kind: "shell-fn", entryPath, fnName }`; `shell-fn:` without `#` → `bad-entry` naming the form; containment rows (`/etc/passwd`, `node_modules`, NUL) mirrored from the `shell:` block
- [ ] Green row: `runProbeSpec({ sink: "filename", entry: "shell-fn:shared/resources/gh-labels.sh#gh_labels_filter", fakeGh })` → `engages` (red today: `bad-entry`)
- [ ] Red-fixture row: the echo library → `absent`
- [ ] Source-failure row: a library with a syntax error → every case `exit 97 ≠ 0`, verdict `unverifiable`, reason names the source

### Phase 2: Entry resolution and the runner

**Risk**: Medium
**Files**: `shared/resources/security-probe.mjs`

- [ ] `SHELL_FN_PREFIX = "shell-fn:"`; `resolveEntry` splits on the last `#`, applies the existing containment, returns `kind: "shell-fn"`
- [ ] Third arm in `runProbeSpec`: shared materialisation; per case per shell the `source … ; "$fn" "$@"` command line above; `PATH` prepend when `fakeGh` is set; `LC_ALL=C`; the existing timeout; exit 97 reserved
- [ ] `--fake-gh <dir>` on `main`: must exist, must contain an executable `gh`, refused otherwise with `reason: bad-fake-gh`; recorded on the run as `fakeGh`
- [ ] Mutation proofs: run the function without sourcing (the task.125 shape) → green row falls to `absent`; drop the `PATH` prepend → green row falls to `absent` because `gh label list` fails and the function takes its no-labels path — record both

### Phase 3: The rule and the two prompts

**Risk**: Low
**Files**: `probe-boundary-rule.md`, `finalise-dod-security-prompt.md`, `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`

- [ ] `probe-boundary-rule.md`: beside task.128's header signal, the second signal — a `source it` comment or a function definition with no top-level call → `shell-fn:`; a boundary whose body names `gh` → add `--fake-gh tests/fixtures/fake-gh`
- [ ] The two prompts and both Step 3b sections name `shell-fn:` and `--fake-gh` in the sentence that names `shell:`; nothing restates the signal
- [ ] `evals/shared/tests/transition-protocol-parity.test.mjs` and any prompt-contract test that pins the entry-form sentence: re-run and update the pinned sentence in the same commit

### Phase 4: Bundle, evidence, CHANGELOG

**Risk**: Low
**Files**: `skills/*/references/`, `CHANGELOG.md`

- [ ] `npm run bundle`; `npm run bundle:check` 0
- [ ] Re-run the probe on `gh-labels.sh` from the repository root with the documented command and paste the record's `verdict`, `reason`, `totals` into this task's implementation report as the evidence task.125's DoD lacked
- [ ] CHANGELOG [Unreleased]: the form, the affordance, the fixture path

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/security-probe.mjs` — `shell-fn:` resolution, runner arm, `--fake-gh`

### Files to Create (Fixtures)

2. ✅ `tests/fixtures/fake-gh/gh` — executable fake `gh` (mode 755; `tests/*.test.js` glob does not read it)
3. ✅ `tests/fixtures/shell-fn/echo-unfiltered.sh` — red fixture library
4. ✅ `tests/fixtures/shell-fn/syntax-error.sh` — source-failure fixture

### Files to Modify (Tests)

5. ✅ `shared/resources/tests/security-probe.test.mjs` — resolution, green, red, mutation, source-failure, containment rows

### Files to Modify (Documentation)

6. ✅ `shared/resources/probe-boundary-rule.md` — second shell branch + header signal
7. ✅ `shared/resources/finalise-dod-security-prompt.md` — names the form and the affordance
8. ✅ `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` — Step 3b sentence
9. ✅ `CHANGELOG.md`
10. ✅ `skills/*/references/` — regenerated by `npm run bundle`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: `security-probe.test.mjs` — the resolution table, the three `runProbeSpec` fixtures (green, red, source-failure), both mutation proofs, and the containment rows mirrored from `shell:` so the new form cannot reach a path the old one refuses.
- **Command**: `command node --test shared/resources/tests/security-probe.test.mjs`; `npm run ci:fast`.
- **Target**: every new branch in `resolveEntry` and the runner arm has a row; the fake `gh`'s unknown-subcommand exit is asserted.

### Integration Tests

- The documented finalise command against the live `gh-labels.sh` (`--sink filename --entry shell-fn:shared/resources/gh-labels.sh#gh_labels_filter --fake-gh tests/fixtures/fake-gh`) from the repository root: verdict `engages`, `totals.executed` = cases × shells, `escaped 0`. Recorded in the implementation report, not asserted in CI (it is the same run as the green row with a different cwd).

### Contract Tests

- `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` and the qa-task / qa-story Step 3b prompt tests: whichever pins the entry-form sentence is updated with it.
- `npm run bundle:check` 0 after Phase 4.

### Performance Tests

Not applicable — the corpus is small and the runner is bounded by the existing timeout.

### Consumer Tests

- The nine skills that source `gh-labels.sh` are unchanged; `tests/gh-labels.test.js` stays green — it is the by-hand evidence the probe record now sits beside, not replaces.

---

## 9. Success Criteria

### Functional

- [ ] `shell-fn:shared/resources/gh-labels.sh#gh_labels_filter` with `--fake-gh` returns `engages`; without `--fake-gh` returns a verdict whose `cases[].mismatches` name the failed `gh` call rather than hanging
- [ ] The echo library returns `absent`; the syntax-error library returns `unverifiable` with exit 97 in every case
- [ ] Every existing `security-probe.test.mjs` row is unchanged and green

### Performance

- [ ] A `shell-fn:` run over the `filename` corpus under both shells completes inside the existing default timeout

### Code Quality

- [ ] Both mutation proofs recorded in the implementation report; `ci:fast`, `bundle:check`, Prettier, shellcheck on the fixture `gh` green

### Migration

- [ ] The header signal for `shell-fn:` is stated once, in `probe-boundary-rule.md`; both prompts and both Step 3b sections cite it; CHANGELOG entry
- [ ] Obs #138 set `actioned` with the PR as resolution; task.125's DoD § Step 5 override is cited from the implementation report as the case this closes

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **A real `gh` on `PATH` answers instead of the fake**
   - **Risk**: the prepend is lost (a shell rc file resets `PATH`) and the probe hits the network with the operator's credentials.
   - **Probability**: Low · **Impact**: Medium — a probe that mutates a real repository.
   - **Mitigation**: `--noprofile --norc` (bash) and `-f` (zsh) are already how the `shell:` arm spawns; the fake `gh` also refuses to run unless `FAKE_GH=1` is in its environment, which the engine sets, so a stray invocation from any other context exits 2. Both are asserted.
   - **Rollback**: revert Phase 2; the form is additive.

2. **The green fixture depends on `gh-labels.sh`'s label set**
   - **Risk**: a change to the repository's real labels does not affect the fixture, but a change to `gh_labels_filter`'s output format (one per line) would break the green row silently as `absent`.
   - **Probability**: Low · **Impact**: Low — the row goes red and names the mismatch.
   - **Mitigation**: the row's `expected.stdout` is derived from the fixture label set in the test, not hand-typed.

### Low Risk Areas

1. **Fixture executable bit lost on checkout** — `git update-index --chmod=+x` in the commit; a test asserts `X_OK` and names the fix.
2. **zsh absent on CI** — `probeShells()` already handles it; the record says which shells ran.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: a `shell-fn:` run reaches a real `gh`, or an existing `shell:`/JS row goes red.
- **Steps**: revert the Phase 2 commit; `npm run bundle`; push. The fixtures and docs are inert without the runner arm.
- **Validation**: `security-probe.test.mjs` — the pre-task rows green, the new rows red with `bad-entry`.

### Partial Rollback (1-2 hours)

- **When to use**: the prompts name a form the engine does not yet ship (a partial merge) — revert Phase 3 alone and re-run the prompt-contract tests.

### Forward Fix (< 4 hours)

- **When to use**: a fixture answer is wrong, a mismatch message is unclear, or a header signal is misread by the agent — fix in place with the fixture rows re-run.

### Rollback Triggers

- **Critical**: network reached; any existing verdict changes.
- **Non-critical**: wording in the rule or the prompts.

---

## Change Log

<!-- change-log-start -->

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-09-21 | 1.0 | Initial draft — obs #138 (task.130 and task.125 instances); task.128 shipped `shell:`, this adds `shell-fn:` and `--fake-gh` | create-task |

<!-- change-log-end -->

## Progress Tracking

- [ ] Phase 1: fixtures and red rows
- [ ] Phase 2: entry resolution and runner
- [ ] Phase 3: rule and prompts
- [ ] Phase 4: bundle, evidence, CHANGELOG
- [ ] QA: `task.136.qa.[N].shell-fn-probe-entry-form.md`
- [ ] Gate: `task.136.gate.[N].shell-fn-probe-entry-form.yml`

## References

- Observation #138 (both instances); #121 (qa-task never executes a shell boundary — task.128); #126 (the main-module guard)
- `docs/tasks/task.128.shell-boundary-probe-and-finalise-recheck/` — the `shell:` form this extends; its § Out of Scope names the stdin exclusion this task keeps
- `docs/tasks/task.125.develop-bug-finalise-mode-and-issue-create/task.125.dod.1.*.md` § Step 5 — the override this task makes unnecessary
- `shared/resources/security-probe.mjs` § "THE SHELL ENTRY FORM (task.128)" — the comment block the new form's block sits under
- `shared/resources/gh-labels.sh` — the green fixture; `tests/gh-labels.test.js` — its by-hand evidence

## Notes

- QA artifacts land beside this file: `task.136.qa.[N].*.md`, `task.136.bug.[N].*.md`, `task.136.gate.[N].*.yml`.
- Independent of tasks 137 and 138. Shares `security-probe.mjs` with task.131 (markdown-structure sink, planned): both add an arm to `runProbeSpec` — land one, rebase the other.
- Until this lands, the finalise security probe FAILs (low) on any sourced-shell-function boundary and Step 8a refuses the fix; that is a human override, to be asked for, never auto-accepted.
