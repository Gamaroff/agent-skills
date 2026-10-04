---
id: task.181
title: "[Task 181] security-probe: a shell-argv: entry form for a shell script that takes several arguments"
type: task
description: "Add a `shell-argv:<path>` entry form to shared/resources/security-probe.mjs, the shell sibling of `cli:`: the case's input crosses as one element of an `--argv` template, the script runs under bash and zsh, and an optional `--fixture-setup` script builds each case's scratch repository. A refusing shell script that takes several arguments or flags is then probed by the engine instead of being accepted as unverified."
tags: [security-probe, finalise, qa-task, qa-story, review-security, observation]
category: infrastructure
status: planned
priority: Medium
created: 2026-10-04
updated: 2026-10-04
assignee:
estimated_effort_hours: 8
github_issue: 564
---

# Technical Task: security-probe — a `shell-argv:` entry form

**Status:** Planned

**GitHub Issue**: [#564](https://github.com/Gamaroff/agent-skills/issues/564)

---

## 1. Overview

Several of this repository's boundaries are shell scripts that take more than one argument or take flags: `verify-push-state.sh --base … --scope …`, `grant-qa-cycles.sh <doc-dir> <k> [<report>]`, `reenter-qa-after-finalise.sh <doc-dir> <implementation-report>`. The probe engine reaches none of them. `shell:` runs `bash <script> <fixture-dir>` with exactly one positional, `shell-fn:` needs a sourced library and `cli:` needs a Node CLI. So every such change trips the security agent's zero-guard (`boundary: true`, `probes_executed: 0`) at QA and at `/finalise`. This task adds a fifth form, `shell-argv:<path>`, which runs the script with an `--argv` template exactly as `cli:` runs a Node CLI, plus an optional per-case `--fixture-setup` script for the scratch repository these scripts need.

**Key deliverables:** the `shell-argv:` entry form, `--argv` accepted for it, and `--fixture-setup` in `security-probe.mjs` (and its bundled copies); the routing sentence in every document that lists the entry forms; tests; one recorded engine run against `reenter-qa-after-finalise.sh` with `totals.executed > 0`.

---

## 2. Motivation

### Current Problems

- **The zero-guard fires on a boundary the work tested, and only a human can clear it.** task.147 (`verify-push-state.sh --scope`): all 28 `shell:` cases stopped at `unknown argument`, and the orchestrator had to execute the probes itself (observation #189). task.170 (`reenter-qa-after-finalise.sh`, 2026-10-03): `--sink filename` ran 28 cases that all stopped at the usage check; `/finalise` halted on DoD gaps and the operator recorded the probe as "unverified by the engine" (2026-10-04). task.130 (`advance-pipeline-lock.sh --restore`) was accepted the same way (`task.130.dod.1`, Step 5).
- **The read-only DoD agent cannot build what these scripts need.** Each candidate needs a scratch git repository (task.147: plus a bare origin; task.170: a halt snapshot, a gate and a DoD file). An Explore subagent cannot create one, so it returns `probes_executed: 0` on work whose QA cycles already ran dozens of by-hand probes (observation #189).
- **By-hand probes are the self-report the engine exists to remove** (`probe-boundary-rule.md` §5.1). task.170's eight hostile-`head:` cases live in the script's own suite, not in a run record.

### Benefits of the Fix

- A multi-argument or flagged shell boundary routes to an engine form, so the zero-guard stops firing on a boundary the engine can reach.
- The record names `shell-argv:<path>` plus the setup script, both committed, so the run re-runs in any checkout.
- The capability is the one `cli:` already proved (task.144): one `{input}` element, never interpolated; exit status as the verdict; `errored` for a crash.

---

## 3. Technical Background

### Current Architecture

- `resolveEntry` (`shared/resources/security-probe.mjs:371`) recognises `cli:` (`CLI_PREFIX`, `:485`), `shell-fn:` (`SHELL_FN_PREFIX`, `:483`) and `shell:` (`SHELL_PREFIX`, `:481`), else `path#export`, after the realpath containment check.
- `--argv` is parsed by `parseArgvTemplate` (`:505`): a JSON array with exactly one `"{input}"` element and optional `"{fixture}"` elements, whole-element slots only. Any form other than `cli:` that is given `--argv` is declined `bad-argv` — `"--argv applies to the cli: entry form only"` (`:973`, and `:2490` in `main()`).
- `shell:` cases run through `runShellCase` (`:1538`), which needs a sink in `MATERIALISED_SINKS` and a case `expected`. `cli:` cases run through `runCliCase` (`:1784`): `process.execPath <path> ...argv`, exit 0 is `accepted`, non-zero `rejected`, a crash `errored`.
- Per-case environment: `caseEnv` (`:1474`); per-case children: `watchedSpawn` (`:1491`), which carries the escape sentinels. Shells: `probeShells()` (`:738`). `--cases-file` (`:2384`) replaces the corpus.
- `probe-boundary-rule.md:419` lists "a multi-positional shell script" among the declined sinks that §5.1 sends to a by-hand probe.
- `probe-boundary-signals.mjs:58` routes a bash boundary to `shell:` only.

### Target Architecture

```
--entry 'shell-argv:<path.sh>' --argv '<JSON array>' [--fixture-setup <path.sh>] [--cases-file <json>]
```

- `resolveEntry` accepts `shell-argv:<path>` (a regular file inside the repo root, same containment as `shell:`) and returns `{ ok: true, kind: "shell-argv", entryPath }`. `SHELL_ARGV_PREFIX` is checked before `SHELL_PREFIX`; the two differ at byte 5, as `shell-fn:` does.
- `--argv` is required for `shell-argv:` and validated by the same `parseArgvTemplate`; the `bad-argv` refusal at `:973` / `:2490` admits `shell-argv:` beside `cli:`.
- **Run.** Per case and per shell from `probeShells()`: `<shell> <path> ...argv`, with `{input}` replaced by the case's input as ONE argv element and each `{fixture}` by the case's fixture directory; cwd is the fixture directory; env is `caseEnv`; stdin is empty; the child goes through `watchedSpawn`.
- **Fixture setup.** `--fixture-setup <path>` names a committed shell script (contained in the repo root, like the entry). Before each (case, shell) run it executes as `bash <setup> <fixture-dir>` in the same sandbox; a non-zero exit makes that run `errored` ("could not look"), never `rejected`. This is how a case gets its scratch git repository.
- **Verdict.** As `cli:`: exit 0 is `accepted`, non-zero `rejected`, a launch failure or timeout `errored`; a case with `expected` is compared exactly as `runShellCase` compares it.
- **Record.** Entry kind `shell-argv`; the record carries the `argv` template and, when given, the setup path. A control's key is its `--name`, else its argv skeleton, as for `cli:`.

### Important Clarifications

- **Why a new prefix, not `--argv` on `shell:`?** `shell:` keeps its contract unchanged (one positional, a materialised sink, `expected` required), so no existing record or test changes meaning. `cli:` set the precedent: one prefix per way the input reaches the target. Observation #189 proposed the same name.
- **Why a setup script, not per-case files?** These scripts need a real repository: commits, a ref that is an ancestor of `HEAD`, a bare origin. Files alone cannot express that. If task.180 lands first, its per-case `fixture.files` are written before the setup script runs, and the setup script may rely on them.
- **Out of the probe's reach, still:** stdin-reading scripts and networked controls stay §5.1's.

---

## 4. Scope

### In Scope

- ✅ `shell-argv:` in `resolveEntry`, `--argv` admitted for it, `runShellArgvCase`, `--fixture-setup`
- ✅ Routing: every document that lists the entry forms names `shell-argv:` (population measured in § 7)
- ✅ `probe-boundary-rule.md` §5.1: a multi-positional or flagged shell script leaves the declined list
- ✅ Tests in `shared/resources/tests/security-probe.test.mjs`, red first
- ✅ One recorded run against `shared/resources/reenter-qa-after-finalise.sh` with a committed setup script and cases file
- ✅ CHANGELOG entry

### Out of Scope

- ❌ Re-probing past tasks (task.123, task.130, task.147, task.170) — their records stand
- ❌ A stdin form or a network form
- ❌ Changing `shell:`, `shell-fn:` or `cli:` behaviour
- ❌ The `fence:` form — task.180

---

## 5. Breaking Changes

None. `shell-argv:` is a new prefix; every existing invocation keeps its meaning. The one changed message, the `bad-argv` refusal for `--argv` on a non-`cli:` form, now names both forms that accept it; the refusal itself is unchanged for every other form.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.181.plan.probe-engine-shell-argv-entry-form.md](task.181.plan.probe-engine-shell-argv-entry-form.md)

**Depends on:** task.170 merged, for Phase 3's proof run only (see § 10). Phases 1–2 do not depend on it.

### Phase 1: Tests first (red) — Risk: Low

- [ ] `resolveEntry` returns `kind: "shell-argv"` with `shell:`'s containment, and refuses a path outside the root
- [ ] `--argv` is required for `shell-argv:` (exit 2, `bad-argv`, no record) and still refused for `shell:` / `shell-fn:` / `path#export`
- [ ] A two-positional fixture script: `{input}` arrives as one element (a value with spaces, `$(…)`, a leading `-`); exit status is the verdict under bash and zsh
- [ ] `--fixture-setup`: the setup runs per (case, shell) before the script; a failing setup is `errored`, never `rejected`; a setup outside the root is declined
- [ ] A crash or a timeout is `errored`; the escape sentinels still fire for a write outside the fixture

### Phase 2: The entry form — Risk: Medium

- [ ] `SHELL_ARGV_PREFIX` and the `resolveEntry` branch
- [ ] `bad-argv` admits `shell-argv:` at both validation sites (`:973`, `:2490`)
- [ ] `runShellArgvCase` and the `--fixture-setup` flag; record fields
- [ ] Bundle regenerated; `bundle:check` clean

### Phase 3: Routing and proof — Risk: Low

- [ ] Every document in § 7's routing population names `shell-argv:`
- [ ] `probe-boundary-rule.md` §5.1 updated
- [ ] Committed setup script + cases file for `reenter-qa-after-finalise.sh`; recorded run with `totals.executed > 0`
- [ ] CHANGELOG entry

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. `shared/resources/security-probe.mjs` — `shell-argv:`, `--argv` admission, `--fixture-setup`, `runShellArgvCase`

### Files to Modify (Routing — the documents that list the entry forms)

Measured with `git grep -ln 'cli:<path\|cli:path\|`cli:`' -- 'shared/resources/*.md' 'skills/*/SKILL.md'` on 2026-10-04 (6 files):

2. `shared/resources/probe-boundary-rule.md` — the forms list and §5.1's declined list
3. `shared/resources/finalise-dod-security-prompt.md` — the Step 1b signal and the Step 4 invocation
4. `shared/resources/security-review-prompt.md`
5. `skills/qa-task/SKILL.md`
6. `skills/qa-story/SKILL.md`
7. `skills/review-security/SKILL.md`
8. `shared/resources/probe-boundary-signals.mjs` — the Step 1b signal text (`:58`); not matched by the grep above, which keys on `cli:`

### Files to Create (Proof)

9. `shared/resources/tests/fixtures/shell-argv/reenter-qa-setup.sh` — builds the scratch repository (code commit, gate whose `head:` is that commit, GAPS DoD, step-7 halt snapshot)
10. `shared/resources/tests/fixtures/shell-argv/reenter-qa-cases.json` — hostile `<doc-dir>` and report-path cases with their expected exits

### Files Regenerated

11. Every bundled `references/` copy of the files above, by `npm run bundle`, never hand-edited

### Files to Modify (Tests)

12. `shared/resources/tests/security-probe.test.mjs`
13. `shared/resources/tests/probe-boundary-signals.test.mjs`, only if its assertions pin the signal text

### Files to Modify (Documentation)

14. `CHANGELOG.md`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- Scope: `resolveEntry`, `parseArgvTemplate` admission, `runShellArgvCase`, `--fixture-setup`.
- Command: `command node --test shared/resources/tests/security-probe.test.mjs`.

### Integration Tests

- The recorded run: `node shared/resources/security-probe.mjs --entry 'shell-argv:shared/resources/reenter-qa-after-finalise.sh' --argv '["{input}","{fixture}/report.md"]' --fixture-setup shared/resources/tests/fixtures/shell-argv/reenter-qa-setup.sh --cases-file shared/resources/tests/fixtures/shell-argv/reenter-qa-cases.json --record <scratch>/run.json --json` — `totals.executed > 0`, and every case reaches the script's own argument checks rather than its usage line.

### Mutation proof

- Splitting `{input}` on whitespace, dropping the setup's `errored` mapping, and scoring a crash as `rejected` each turn a named test red.

### Performance Tests

Not applicable — a probe run's cost is cases × shells × (setup + script).

### Consumer Tests

- The existing `shell:`, `shell-fn:` and `cli:` suites stay green unchanged.

---

## 9. Success Criteria

### Functional

- [ ] `resolveEntry('shell-argv:<path>')` returns `kind: "shell-argv"`; a path outside the repo root is declined
- [ ] `--argv` is required for `shell-argv:` and still `bad-argv` for `shell:`, `shell-fn:` and `path#export`
- [ ] `{input}` reaches the script as one argv element, under every shell `probeShells()` returns
- [ ] A failing `--fixture-setup` is `errored` for that run, never `rejected` (Phase 2, `runShellArgvCase`)
- [ ] The recorded run against `reenter-qa-after-finalise.sh` has `totals.executed > 0`, and no case stops at the usage line

### Performance

- [ ] No change to the run time of existing forms' suites (same tests, same counts)

### Code Quality

- [ ] `npm test` green; ShellCheck `--severity=warning` clean on the new `.sh` fixtures; Prettier clean
- [ ] `npm run bundle:check` green
- [ ] Each mutation in § 8 turns a named test red

### Migration

- [ ] Every document in § 7's routing population names `shell-argv:`
- [ ] CHANGELOG `[Unreleased]` names the form

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **The setup script runs code in the sandbox before the probe.** Mitigation: the same containment as the entry (repo root, regular file), the same `caseEnv` and `watchedSpawn` sentinels, and a failing setup is `errored`, never a verdict.
2. **The proof target is not on `develop` yet.** `reenter-qa-after-finalise.sh` ships with task.170 (PR #563). Mitigation: Phase 3's proof runs after task.170 merges; if this task starts first, prove against `grant-qa-cycles.sh` (on `develop`, `<doc-dir> <k> [<report>]`) and add the task.170 run when it lands.
3. **Shared file with task.180.** Both add an entry form to `security-probe.mjs` and the same routing population. Mitigation: land one, rebase the other; never in one worktree.

### Low Risk Areas

1. **zsh absent on a host.** Same as `shell:`: the record says which shells ran.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- Triggers: an existing form's suite goes red, or a `bad-argv` refusal changes for a form that never accepted `--argv`.
- Steps: revert the merge commit; run `npm run bundle` and `npm test`.

### Partial Rollback (1–2 hours)

- Revert Phase 3's routing edits only if a document's wording is wrong; the engine form stays.

### Forward Fix (< 4 hours)

- A wrong verdict mapping in `runShellArgvCase` is a one-function fix with its test.

### Rollback Triggers

- Critical: an existing form's verdict changes.
- Non-critical: wording in a routing document.

---

## Change Log

<!-- change-log-start -->

| Date       | Version | Description                                                        | Author      |
| ---------- | ------- | ------------------------------------------------------------------ | ----------- |
| 2026-10-04 | 1.0     | Initial draft — cut from observation #189 and task.170's DoD gap 2 | create-task |

<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Tests first (red)

- [ ] `resolveEntry`, `--argv`, argv delivery, setup and crash cases

### Phase 2: The entry form

- [ ] `shell-argv:`, `--fixture-setup`, `runShellArgvCase`
- [ ] Bundle regenerated; `bundle:check` clean

### Phase 3: Routing and proof

- [ ] Routing population updated
- [ ] Recorded run against `reenter-qa-after-finalise.sh`
- [ ] CHANGELOG entry

---

## References

- Observation #189 — security-probe has no entry form for a multi-flag shell script
- [task.144](../task.144.probe-engine-cli-entry-form/task.144.probe-engine-cli-entry-form.md), the `cli:` form this mirrors
- [task.180](../task.180.probe-engine-fence-entry-form/task.180.probe-engine-fence-entry-form.md), the `fence:` form (same file, same routing population)
- task.170's `/finalise` DoD gap 2 (`task.170.dod.1`, on PR #563) — the operator decision this task follows up

---

## Notes

- Post-merge action (not a success criterion): set observation #189 to `actioned` once the PR merges.
- QA report: `task.181.qa.{N}.probe-engine-shell-argv-entry-form.md`; bug reports: `task.181.bug.{N}.{name}.md`; quality gate: `task.181.gate.{N}.probe-engine-shell-argv-entry-form.yml`, all co-located in this directory.
