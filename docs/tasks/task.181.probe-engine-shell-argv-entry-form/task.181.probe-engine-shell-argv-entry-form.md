---
id: task.181
title: "[Task 181] security-probe: a shell-argv: entry form for a shell script that takes several arguments"
type: task
description: "Add a `shell-argv:<path>` entry form to shared/resources/security-probe.mjs, the shell sibling of `cli:`: the case's input crosses as one element of an `--argv` template, the script runs under bash and zsh, and an optional `--fixture-setup` script builds each case's scratch repository. A refusing shell script that takes several arguments or flags is then probed by the engine instead of being accepted as unverified."
tags: [security-probe, finalise, qa-task, qa-story, review-security, observation]
category: infrastructure
status: ready-for-review
priority: Medium
created: 2026-10-04
updated: 2026-10-13
assignee:
estimated_effort_hours: 8
github_issue: 564
---

# Technical Task: security-probe — a `shell-argv:` entry form

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.181.review.1.probe-engine-shell-argv-entry-form.md` implemented 2026-10-12

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

Line numbers measured on `develop` at `9af9b0f1` (after task.180's `fence:` form landed), 2026-10-12.

- `resolveEntry` (`shared/resources/security-probe.mjs:426`) recognises `fence:` (`FENCE_PREFIX`, `:565`), `cli:` (`CLI_PREFIX`, `:563`), `shell-fn:` (`SHELL_FN_PREFIX`, `:561`) and `shell:` (`SHELL_PREFIX`, `:559`), else `path#export`, after the realpath containment check.
- `--argv` is parsed by `parseArgvTemplate` (`:585`): a JSON array with exactly one `"{input}"` element and optional `"{fixture}"` elements, whole-element slots only. Any form other than `cli:` that is given `--argv` is declined `bad-argv` — `"--argv applies to the cli: entry form only"` (`:1075–1090` in `runProbeSpec`, and `:3222–3240` in `main()`).
- `shell:` cases run through `runShellCase` (`:1735`), which needs a sink in `MATERIALISED_SINKS` and a case `expected`. Each shell from `probeShells()` (`:820`) is the **caller**, never the interpreter: the spawn is `<shell> -c 'bash "$1" "$2"' <shell> <script> <fixture-dir>`, so the zsh arm verifies a zsh caller of a bash script, as the script's shebang fixes its interpreter (`:813–816`). `cli:` cases run through `runCliCase` (`:1981`): `process.execPath <path> ...argv`, exit 0 is `accepted`, non-zero `rejected`, a crash `errored`.
- Per-case environment: `caseEnv` (`:1671`); per-case children: `watchedSpawn` (`:1688`), which carries the escape sentinels. `--cases-file` (flag map `:3124`) replaces the corpus.
- `gh`: the shell forms decline a script that names `gh` with no `--fake-gh` (`needs-fake-gh`, `namesGh` `:696`, applied at `:1198`), put a trip-wire `gh` first on PATH (`:1305`) and accept `--fake-gh` (`:1152`); `cli:` refuses `--fake-gh`.
- Per-case `fixture` (`env`, `files`) is read only by `fence:` (task.180): validated by `fixtureProblem` (`:2194`) and written by `runFenceCase` (`:2486–2545`). `security-input-corpus.mjs:67` states the "only `fence:`" rule.
- `probe-boundary-rule.md:495` lists "a multi-positional shell script" among the declined sinks that §5.1 sends to a by-hand probe.
- `probe-boundary-signals.mjs:59` routes a bash boundary to `shell:` (and a fenced block to `fence:`) only.

### Target Architecture

```
--entry 'shell-argv:<path.sh>' --argv '<JSON array>' [--fixture-setup <path.sh>] [--cases-file <json>]
```

- `resolveEntry` accepts `shell-argv:<path>` (a regular file inside the repo root, same containment as `shell:`) and returns `{ ok: true, kind: "shell-argv", entryPath }`. `SHELL_ARGV_PREFIX` is checked before `SHELL_PREFIX`; the two differ at byte 5, as `shell-fn:` does.
- `--argv` is required for `shell-argv:` and validated by the same `parseArgvTemplate`; the `bad-argv` refusal at `:973` / `:2490` admits `shell-argv:` beside `cli:`.
- **Run.** Per case and per shell from `probeShells()`, the shell is the **caller** and bash the interpreter, exactly as `shell:`: `<shell> -c 'bash "$@"' <shell> <path> ...argv`, with `{input}` replaced by the case's input as ONE argv element and each `{fixture}` by the case's fixture directory; cwd is the fixture directory; env is `caseEnv`; stdin is empty; the child goes through `watchedSpawn`. Never `<shell> <path>`: that would interpret a bash script under zsh, and a zsh parse failure would score as `rejected` — "could not look" read as "refused".
- **Case fixture.** A case's optional `fixture` (`env`, `files`) is honoured exactly as `fence:` honours it — validated by `fixtureProblem`, `files` written into the case directory, `env` merged into `caseEnv` — and is written **before** the setup script runs, so the setup may rely on it. `security-input-corpus.mjs:67` and the `fixture` header text name `shell-argv:` beside `fence:`.
- **Fixture setup.** `--fixture-setup <path>` names a committed shell script (contained in the repo root, a readable regular file, like the entry). Before each (case, shell) run it executes as `bash <setup> <fixture-dir>` in the same sandbox; a non-zero exit, a timeout or a launch failure makes that run `errored` ("could not look"), never `rejected`. The setup builds the case directory and nothing else: its writes are watched in their own list, never charged to the entry, and a write anywhere else errors that run, named (QA cycle 2, TASK-181-002). Every run is watched beside the case directory through the work-dir snapshot `fence:` uses, shared as `caseWatchedSpawn` (TASK-181-003). This is how a case gets its scratch git repository. `--fixture-setup` with any other form is an argument error (exit 2, `bad-fixture-setup`), as `--slot` is outside `fence:`.
- **`gh`.** `shell-argv:` is a shell form for `gh`: a script, a setup script, or a case fixture's `env` values or `files` contents that name `gh` with no `--fake-gh` are declined `needs-fake-gh`; every PATH directory holding the host `gh` is shadowed (`ghFreePath`), as for `fence:`; the trip-wire `gh` is first on PATH; `--fake-gh` is accepted (QA cycle 1, TASK-181-001).
- **Verdict.** As `cli:`: exit 0 is `accepted`, non-zero `rejected`, a launch failure or timeout `errored`; a case with `expected` is compared exactly as `runShellCase` compares it.
- **Record.** Entry kind `shell-argv`; the record carries the `argv` template and, when given, the setup path (`fixture_setup`). A control's key is its `--name`, else its argv skeleton, as for `cli:` (`controlKey`, `:2716`).

### Form-dispatch sites in the engine

Every site that branches on the entry form, found with
`grep -n 'isShellForm\|isCliForm\|isFenceForm\|_PREFIX)' shared/resources/security-probe.mjs` (develop `9af9b0f1`, 31 hits; the `resolveEntry` hits at `:440–499` are the prefix branch itself). Each needs a decision for `shell-argv:`:

| Site | Today | `shell-argv:` |
| --- | --- | --- |
| `runProbeSpec` decline keeps the template (`:1034`) | `cli:` | joins — keep the argv template on a declined probe |
| form flags (`:1050–1052`) | `isShellForm` / `isCliForm` / `isFenceForm` | new `isShellArgvForm`; `takesArgv = cli \|\| shell-argv` |
| `--argv` required / refused (`:1075–1090`) | `cli:` only | required; refusal text names both forms |
| `args` refused (`:1098`) | shell, cli, fence | joins the refusal |
| `CLI_EXTENSIONS` check (`:1110`) | `cli:` | does not apply |
| readable-regular-file check (`:1121`) | shell, cli, fence | joins |
| `--fake-gh` accepted (`:1152`) | shell, fence | joins |
| `needs-fake-gh` (`:1198`) | shell forms | joins — over the entry and the setup script |
| trip-wire `gh` harness (`:1305`), `probeShells()` (`:1319`), `ghTripped` (`:1441`) | shell, fence | joins |
| case-loop dispatch (`:1322–1375`) | per form | `runShellArgvCase` |
| `controlKey` (`:2722–2729`) | fence, cli | joins `cli:`'s argv-skeleton key |
| `main()` `--argv` (`:3222–3240`) | `cli:` only | required; refusal text names both forms |
| `main()` `--args-json` refused (`:3264–3267`) | `startsWith(SHELL_PREFIX)` etc. | **add `SHELL_ARGV_PREFIX`** — `"shell-argv:"` does not start with `"shell:"`, so without it `--args-json` is silently accepted |
| `--entry` usage text (`:3209`) and the header comment | lists the forms | names `shell-argv:path` |

### Important Clarifications

- **Why a new prefix, not `--argv` on `shell:`?** `shell:` keeps its contract unchanged (one positional, a materialised sink, `expected` required), so no existing record or test changes meaning. `cli:` set the precedent: one prefix per way the input reaches the target. Observation #189 proposed the same name.
- **Why a setup script, not per-case files?** These scripts need a real repository: commits, a ref that is an ancestor of `HEAD`, a bare origin. Files alone cannot express that. task.180 landed first, so a case's `fixture.files` are written before the setup script runs, and the setup script may rely on them.
- **Prefix order.** `"shell-argv:"` differs from `"shell:"` at byte 5 and from `"shell-fn:"` at byte 6, so the three prefixes are disjoint and no check order is load-bearing.
- **Sandboxed `HOME`.** The setup script runs with the sandbox `HOME`, so no global git identity exists: it commits with `git -c user.name=probe -c user.email=probe@example.invalid`.
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

**Depends on:** task.170 (merged — `reenter-qa-after-finalise.sh` is on `develop`) and task.180 (merged — the `fence:` form and the per-case `fixture` this form reuses).

### Phase 1: Tests first (red) — Risk: Low

- [x] `resolveEntry` returns `kind: "shell-argv"` with `shell:`'s containment, and refuses a path outside the root
- [x] `--argv` is required for `shell-argv:` (exit 2, `bad-argv`, no record) and still refused for `shell:` / `shell-fn:` / `path#export`
- [x] A two-positional fixture script: `{input}` arrives as one element (a value with spaces, `$(…)`, a leading `-`); exit status is the verdict under bash and zsh
- [x] `--fixture-setup`: the setup runs per (case, shell) before the script; a failing setup is `errored`, never `rejected`; a setup outside the root is declined; `--fixture-setup` on another form is exit 2
- [x] The zsh arm runs the script under bash: a fixture script using a bash-only construct is not `rejected` under zsh
- [x] A case `fixture.files` entry exists when the setup script runs; a `fixture` that `fixtureProblem` refuses declines the case
- [x] `gh`: a `shell-argv:` script (or setup) naming `gh` with no `--fake-gh` is declined `needs-fake-gh`; `--args-json` with `shell-argv:` is exit 2 `bad-args`
- [x] A crash or a timeout is `errored`; the escape sentinels still fire for a write outside the fixture

### Phase 2: The entry form — Risk: Medium

- [x] `SHELL_ARGV_PREFIX` and the `resolveEntry` branch
- [x] `bad-argv` admits `shell-argv:` at both validation sites (`:1075–1090`, `:3222–3240`); the three tests that pin the old refusal text (`security-probe.test.mjs:2420`, `:2421`, `:2465`, `/cli: entry form only/`) are updated to the new text
- [x] Every row of § 3's form-dispatch table decided as stated
- [x] `runShellArgvCase`, case `fixture`, and the `--fixture-setup` flag; record fields
- [x] Bundle regenerated; `bundle:check` clean

### Phase 3: Routing and proof — Risk: Low

- [x] Every document in § 7's routing population names `shell-argv:`
- [x] `probe-boundary-rule.md` §5.1 updated
- [x] Committed setup script + cases file for `reenter-qa-after-finalise.sh`; an integration test runs them through the engine and asserts `totals.executed > 0` and no case stopping at the usage line; the run's record is cited in the DoD
- [x] CHANGELOG entry

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
8. `shared/resources/probe-boundary-signals.mjs` — the Step 1b signal text (`:59`); not matched by the grep above, which keys on `cli:`
9. `shared/resources/security-input-corpus.mjs` — the `fixture` rule (`:67`, "read only by the `fence:` entry form") names `shell-argv:`

### Files to Create (Proof)

10. `shared/resources/tests/fixtures/shell-argv/reenter-qa-setup.sh` — builds the scratch repository (code commit, gate whose `head:` is that commit, GAPS DoD, step-7 halt snapshot)
11. `shared/resources/tests/fixtures/shell-argv/reenter-qa-cases.json` — hostile `<doc-dir>` and report-path cases with their expected exits

### Files Regenerated

12. Every bundled `references/` copy of the files above, by `npm run bundle`, never hand-edited

### Files to Modify (Tests)

13. `shared/resources/tests/security-probe.test.mjs` — the new block, and the three assertions at `:2420`, `:2421`, `:2465` that pin `/cli: entry form only/` (found with `git grep -n 'entry form only' -- '*.test.*'`)
14. `shared/resources/tests/probe-boundary-signals.test.mjs` — a `shell-argv:` routing-population test beside the `cli:` and `fence:` ones (it holds the Migration criterion)
15. `skills/review-security/tests/review-security.test.js:416` — pinned the removed decline text "a shell script with more than one positional"; found by the Step 3 fast gate, not the review (the review's literal search covered only the `bad-argv` text)

### Files to Modify (Documentation)

16. `CHANGELOG.md`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- Scope: `resolveEntry`, `parseArgvTemplate` admission, `runShellArgvCase`, `--fixture-setup`.
- Command: `command node --test shared/resources/tests/security-probe.test.mjs`.

### Integration Tests

- The recorded run, held by a test in `security-probe.test.mjs` that runs it and asserts the totals: `node shared/resources/security-probe.mjs --entry 'shell-argv:shared/resources/reenter-qa-after-finalise.sh' --argv '["{input}","{fixture}/report.md"]' --fixture-setup shared/resources/tests/fixtures/shell-argv/reenter-qa-setup.sh --cases-file shared/resources/tests/fixtures/shell-argv/reenter-qa-cases.json --record <scratch>/run.json --json` — `totals.executed > 0`, and every case reaches the script's own argument checks rather than its usage line.

### Mutation proof

- Splitting `{input}` on whitespace, dropping the setup's `errored` mapping, and scoring a crash as `rejected` each turn a named test red.

### Performance Tests

Not applicable — a probe run's cost is cases × shells × (setup + script).

### Consumer Tests

- The existing `shell:`, `shell-fn:` and `cli:` suites stay green unchanged.

---

## 9. Success Criteria

### Functional

- [x] `resolveEntry('shell-argv:<path>')` returns `kind: "shell-argv"`; a path outside the repo root is declined
- [x] `--argv` is required for `shell-argv:` and still `bad-argv` for `shell:`, `shell-fn:` and `path#export`
- [x] `{input}` reaches the script as one argv element, under every shell `probeShells()` returns, with bash as the script's interpreter
- [x] A failing `--fixture-setup` is `errored` for that run, never `rejected` (Phase 2, `runShellArgvCase`)
- [x] A case `fixture` is honoured as `fence:` honours it, and is in place before the setup script runs
- [x] `shell-argv:` takes the shell forms' `gh` handling (`needs-fake-gh`, trip-wire, `--fake-gh`), and `--args-json` with it is exit 2
- [x] The run against `reenter-qa-after-finalise.sh`, executed by a test in `security-probe.test.mjs`, has `totals.executed > 0`, and no case stops at the usage line

### Performance

- [x] No existing `shell:`, `shell-fn:`, `cli:` or `fence:` test changes, except the assertions that pin removed text: the three on the `bad-argv` refusal (§ 7 item 13) and one on the declined list (§ 7 item 15)

### Code Quality

- [x] `npm test` green; ShellCheck `--severity=warning` clean on the new `.sh` fixtures; Prettier clean
- [x] `npm run bundle:check` green
- [x] Each mutation in § 8 turns a named test red

### Migration

- [x] Every document in § 7's routing population names `shell-argv:`
- [x] CHANGELOG `[Unreleased]` names the form

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **The setup script runs code in the sandbox before the probe.** Mitigation: the same containment as the entry (repo root, regular file), the same `caseEnv` and `watchedSpawn` sentinels, and a failing setup is `errored`, never a verdict.
2. **A form-dispatch site left unextended.** The engine branches on the form at ~14 sites (§ 3 table); one missed admits a flag silently (`--args-json`) or skips the `gh` guard. Mitigation: the table is the checklist, and each guard row has a Phase 1 test.
3. **The zsh arm.** Interpreting the script under zsh would score zsh parse failures as refusals. Mitigation: bash interprets, the shell only calls, as `shell:` does; a Phase 1 test with a bash-only construct holds it.

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

## Implementation Summary

**Completed:** 2026-10-12 (develop-task run 1 — `task.181.implementation.1.probe-engine-shell-argv-entry-form-initial-run.md`)

**Approach.** `shell-argv:` joins `resolveEntry` through the `shell:` containment branch (`kind: "shell-argv"`), takes `cli:`'s `--argv` contract (`takesArgv = cli || shell-argv` at both validation sites) and the shell forms' `gh` handling, per the § 3 form-dispatch table — every row decided, including the `--args-json` refusal that `startsWith(SHELL_PREFIX)` would have missed. `runShellArgvCase` writes the case `fixture` first (`writeFixtureFiles` / `fixtureCaseEnv`, extracted from `runFenceCase` so the two arms share one writer), runs `--fixture-setup` as `bash <setup> <case-dir>` (non-zero, timeout or never-ran → `errored`), then spawns `shellArgvSpawnArgs(shell, …)` — `<shell> -c 'bash "$@"' <shell> <script> ...argv`, so bash interprets under every caller shell. Verdict and `expected` comparison mirror `runCliCase`. The record carries `fixture_setup`; `controlKey` keys `shell-argv:` like `cli:`.

**Testing results.** 13 new `shell-argv entry` tests in `security-probe.test.mjs` (resolveEntry, flag combinations, library-caller declines, one-element delivery, the caller/interpreter split held without zsh on the host, setup ordering and failure, containment, `gh`, timeout and escape, record keys, and the proof run); a `shell-argv:` routing-population test in `probe-boundary-signals.test.mjs`; four assertions that pinned removed text updated (§ 7 items 13, 15). Proof run against `reenter-qa-after-finalise.sh`: `engages`, 8 executed (bash; zsh absent on this host), 0 reproduced, 0 escapes, every case exit 0 or 1 — none at the usage line (exit 2). Mutations — split `{input}`, setup → `rejected`, timeout → `rejected`, shell interprets, `--args-json` hole, setup `gh` unread — each turned a named test red. `npm run ci:fast`: 5415 pass, 0 fail. ShellCheck `--severity=warning` clean on the setup fixture; `bundle:check` clean.

**Deferred work.** None. zsh is absent on the development host, so the zsh caller arm ran only through the structural test; CI's lanes decide whether it runs there.

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-13
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.181.qa.3.probe-engine-shell-argv-entry-form.md](./task.181.qa.3.probe-engine-shell-argv-entry-form.md)
- **Gate File**: [task.181.gate.3.probe-engine-shell-argv-entry-form.yml](./task.181.gate.3.probe-engine-shell-argv-entry-form.yml)

### Test Coverage Summary
- **Tests Executed**: 5420 (ci:fast) + 19 probes
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
TASK-181-001..003 fixed and verified across QA cycles 1–3; the per-case isolation is one definition shared by fence: and shell-argv:. Three LOW advisory findings routed to the gate's recommendations.future.

## Definition of Done - Gaps Identified

**Status:** IN PROGRESS

### QA Gate Status

**QA Report**: `task.181.qa.3.probe-engine-shell-argv-entry-form.md`
**Gate File**: `task.181.gate.3.probe-engine-shell-argv-entry-form.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100
**PR review (Step 5c)**: APPROVE (`task.181.pr-review.1.probe-engine-shell-argv-entry-form.md`)

### Missing Criteria:

1. **Acceptance Criteria (quantifier rule — each member of a set needs its own test):**
   - [ ] AC2: a test that `--argv` with a `shell-fn:` entry is refused `bad-argv` (CLI exit 2 and library decline)
   - [ ] AC6: a test that a `shell-argv:` run whose script calls `gh` in a spelling the text check misses is declined `needs-fake-gh` by the run-time trip-wire
   - [ ] AC6: a test that `--fake-gh` is accepted for `shell-argv:` and its `gh` answers the run

Security (19 probes, 0 reproduced), docs and CI reading 1 (SUCCESS, 5 checks @ `2fc64403`) pass; compliance is not applicable.

### Next Steps:

- [ ] Add the three tests to `shared/resources/tests/security-probe.test.mjs`, each mutation-proven
- [ ] The fix is test code: re-enter QA at 5a, then re-run `/finalise`

**Estimated Effort:** Small (three tests, no engine change expected)

**Gap Report Generated:** 2026-10-13

**Detailed Verification Log:** See `task.181.dod.1.probe-engine-shell-argv-entry-form.md` for complete verification evidence.

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-04 | 1.0     | Initial draft — cut from observation #189 and task.170's DoD gap 2 | create-task |
| 2026-10-12 | 1.1     | Review 8/10 after fixes — zsh arm corrected to caller-only (bash interprets); form-dispatch site table added; `gh`, case `fixture` and `--fixture-setup` scoping decided; pinned-text tests listed; proof run held by a test; anchors re-measured after task.180 | review-task |
| 2026-10-12 |         | Status → ready-for-development | review-task |
| 2026-10-12 |         | Implemented — 1 engine + 6 routing docs + 2 proof fixtures + 3 test files, 15 new tests (13 shell-argv, 1 routing, 1 limits update) | develop |
| 2026-10-12 |         | Status → ready-for-review | develop |
| 2026-10-12 |         | QA gate CONCERNS (90/100) — 1 finding | qa-task |
| 2026-10-12 |         | QA findings fixed — cycle 1, 1 finding + 2 cleanups (fixture gh checks for shell-argv:) | qa-fix |
| 2026-10-13 |         | QA gate CONCERNS (90/100) — 2 findings | qa-task |
| 2026-10-13 |         | QA findings fixed — cycle 2, 2 findings + 1 cleanup (shared per-case isolation for fence: and shell-argv:) | qa-fix |
| 2026-10-13 |         | QA gate PASS (100/100) — 0 findings | qa-task |
| 2026-10-13 |  | DoD incomplete — 3 gaps identified | finalise |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Tests first (red)

- [x] `resolveEntry`, `--argv`, argv delivery, setup and crash cases

### Phase 2: The entry form

- [x] `shell-argv:`, `--fixture-setup`, `runShellArgvCase`
- [x] Bundle regenerated; `bundle:check` clean

### Phase 3: Routing and proof

- [x] Routing population updated
- [x] Recorded run against `reenter-qa-after-finalise.sh`
- [x] CHANGELOG entry

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
