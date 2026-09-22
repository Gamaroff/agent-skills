---
id: task.140
title: "[Task 140] Harden the shell-fn: sentinels and the fake-gh coverage: seven verified limits recorded on task.136 (library-installed EXIT trap, needs-fake-gh on every shell form, the gh detector's terminators and transitive source, source-status capture under errexit, the extensionless fixture outside the ShellCheck lanes, a dead clause, the pre-existing symlink limit)"
type: task
description: "Close the seven limits task.136's QA cycle 3, PR review and finalise recorded with concrete, verified fixes: shadow `exit` during the source so a library-installed EXIT trap cannot displace the 97 sentinel; apply the `needs-fake-gh` decline to the `shell:` form too; widen `GH_COMMAND_WORD` and follow one level of top-level `source`; capture the source's status as a simple command so `set -e` libraries whose top-level precondition fails are declined; put the extensionless fake `gh` under both ShellCheck lanes; drop the dead `!isShellFn &&`; and decide the pre-existing `resolveEntry` symlink limit (realpath before containment, or a stated limit with a row)."
tags: [security, probe, shell-fn, fake-gh, shellcheck, task-136-follow-up]
category: infrastructure
status: planned
priority: High
created: 2026-09-22
updated: 2026-09-22
assignee:
estimated_effort_hours: 8
risk_level: medium
github_issue: 464
---

# Technical Task: Harden the `shell-fn:` sentinels and the fake-`gh` coverage

**Status:** Planned
**GitHub Issue**: [#464](https://github.com/Gamaroff/agent-skills/issues/464)

---

## 1. Overview

Task.136 (PR #462, merged 2026-09-21) gave `security-probe.mjs` the `shell-fn:<path>#<function>` entry form and the `--fake-gh <dir>` affordance, and its three QA cycles fixed every defect that reached the gate queue. Seven further limits were **verified true and deliberately not fixed there** — each rated medium confidence by the reviewer or outside the task's Files Summary — and recorded with a concrete fix: gate 3 (`task.136.gate.3.*.yml` § `recommendations.future`), the PR review (`task.136.pr-review.1.*.md` CR-1, CR-3) and the finalise DoD (`task.136.dod.1.*.md` SC5). This task closes them as one unit: they are all "the sentinel or the fixture does not reach a library shape", they share one engine file and one test file, and none is shippable alone.

**Scope**: `shared/resources/security-probe.mjs` (`SHELL_FN_BODY`, the `--fake-gh` gate, `GH_COMMAND_WORD`, `resolveEntry`), `shared/resources/tests/security-probe.test.mjs` (one row per limit, each mutation-proved), `scripts/lint-shell.sh` + `.github/workflows/shellcheck.yml` (same commit — the file-list expression is copied between them by design), `shared/resources/probe-boundary-rule.md` §5, bundled copies, CHANGELOG.

**Key deliverables**: (1) `SHELL_FN_BODY` shadows `exit` for the duration of the `source` (`exit() { builtin exit 97; }` … `unset -f exit`) and takes the source's status as a simple command (`source "$1"; src=$?; trap - EXIT; [ "$src" -eq 0 ] || exit 97`) — verified under bash and zsh by the reviewers — so a library-installed `trap … EXIT`, a `|| exit 1` guard, and a `set -e` library whose top-level command fails are all the named `entry-not-probeable` decline. (2) The `needs-fake-gh` decline applies to every shell form (`isShellForm && fakeGhDir === null`), with the `shell:` counterpart row. (3) `GH_COMMAND_WORD` terminators widened to `[\s;|&)>]|$`, and one level of top-level `source`/`.` in the library followed so a wrapper that sources `gh-labels.sh` is declined too. (4) Both ShellCheck lanes select the extensionless fixture `gh` (a tracked file whose first line is a bash shebang, or an explicit path — the two lanes must stay identical, and the `< 200` guard must still hold). (5) The dead `!isShellFn &&` clause removed. (6) The `resolveEntry` symlink limit **decided**: either `realpathSync` on an existing path before the containment check (with `shellfn.symlink-escape` and task.128's `shellentry.symlink-escape` flipping from reproduced to refused), or the limit restated in the rule with a row that pins it as accepted — not left as a `future` line a fourth gate will carry.

**Expected outcome**: the finalise security gate's shell-fn arm gives a named decline — never a scored `absent` — for every library shape the reviewers found; the fake-`gh` requirement holds for both shell forms; the fixture is linted per PR; and the one limit that has been carried since task.128 gate 5 is closed or owned.

---

## 2. Motivation

### Current Problems

1. **Two library shapes still produce the task.125 shape.** A library that installs its own `trap … EXIT` before a `|| exit 1` guard displaces the source guard: verified bash+zsh, rc 1, every case mismatches, verdict `absent` with a full count (c3-CR-1). And because `source "$1"` sits on the left of `||`, both shells ignore errexit for the library's top-level commands: `set -e; false; f(){…}` is sourced to completion and *scored*, where a consumer's own `source` would have aborted (PR-review CR-1).
2. **The `needs-fake-gh` decline covers half the surface.** It is gated on `kind === "shell-fn"`, so a `shell:` script that names `gh` and was given no `--fake-gh` runs the host `gh` — host `PATH`, host keychain — and is scored (c3-CR-2). The flag's own header says it covers both shell forms.
3. **The detector reads only the entry file and needs trailing whitespace.** `gh;`, `gh>/dev/null`, `(gh)`, `"$GH" api` and a library that `source`s `gh-labels.sh` all run bare (c3-CR-3, reproduced against the regex).
4. **The fixture is outside every lint lane.** `tests/fixtures/fake-gh/gh` has no `.sh` extension; both lanes select `git ls-files '*.sh'`, so "shellcheck on the fixture green" rested on a by-hand run recorded at finalise (DoD SC5 deviation).
5. **A dead clause suggests an overlap that does not exist** — `const isShell = !isShellFn && entry.startsWith(SHELL_PREFIX)` (PR-review CR-3).
6. **One limit has been carried through nine gates.** `resolveEntry`'s containment is lexical (`resolve` + `relative`, no realpath); `shellentry.symlink-escape` / `shellfn.symlink-escape` reproduce on every probe run since task.128 gate 1 and are annotated "pre-existing, future" each time. A `future` line that survives two tasks is a decision nobody has made.

### Benefits

- The `shell-fn:` verdict vocabulary means what it says for every shape the reviewers could construct; the next finalise on a sourced library boundary does not need a human to read `absent` as "the harness lost".
- One rule for `--fake-gh` on both shell forms, and a detector that follows the one indirection this repository actually uses (`source references/gh-labels.sh`).
- The lint lanes cover the one executable fixture the engine puts on `PATH`.
- The symlink limit is either closed (realpath) or owned (a row that says it is accepted and why) — never carried again.

---

## 3. Technical Background

### Current Architecture

`SHELL_FN_BODY` (security-probe.mjs, after task.136 cycle 2):

```
trap 'exit 97' EXIT; source "$1" || exit 97; trap - EXIT; shift; fn="$1"; shift;
typeset -f "$fn" >/dev/null 2>&1 || exit 98;
ee=; case $- in *e*) ee=1;; esac; set +e;
( [ -n "$ee" ] && set -e; "$fn" "$@" ); rc=$?;
case $rc in 97|98) exit 99;; esac; exit $rc
```

The `--fake-gh` validation runs before anything spawns and sets `fakeGhDir`; the `needs-fake-gh` decline reads `resolved.kind === "shell-fn" && fakeGhDir === null` and tests `GH_COMMAND_WORD = /(^|[\s;|&(`$])gh(\s|$)/m` against the entry file's text only. `resolveEntry` computes `entryPath = resolve(root, rawPath)` and refuses when `relative(root, entryPath)` escapes — no `realpathSync`, stated as a limit in `probe-boundary-rule.md` §5 since task.128.

`scripts/lint-shell.sh` and `.github/workflows/shellcheck.yml` both build the file list as `git ls-files '*.sh' | grep -v '^skills/[^/]*/references/'`, with a `>= 200` over-match guard and an empty-list guard; the comment in each says "when one changes, change the other in the same commit".

### Target Architecture

```
SHELL_FN_BODY
  exit() { builtin exit 97; }; trap 'exit 97' EXIT; source "$1"; src=$?; trap - EXIT; unset -f exit
  [ "$src" -eq 0 ] || exit 97
  … (unchanged from typeset -f onward)

needs-fake-gh gate      isShellForm && fakeGhDir === null      (was: kind === "shell-fn")
GH_COMMAND_WORD         /(^|[\s;|&(`$])gh([\s;|&)>]|$)/m   + one level: every top-level
                        `source <p>` / `. <p>` whose <p> resolves inside the repo root is read and tested too
resolveEntry            realpathSync(entryPath) when it exists, THEN relative(root, …)   — or a pinned, stated limit
lint lanes              FILES += tracked files under tests/fixtures whose first line is `#!/usr/bin/env bash` (or the explicit path), identically in both
```

### Important Clarifications

- **Why shadow `exit` rather than only the trap.** The EXIT trap fires *after* the shell decides to exit with the library's code; a library that installed its own EXIT trap replaced ours. A function named `exit` intercepts the *call*, before any trap, and `builtin exit` inside it is the one the harness wants. `unset -f exit` after the source restores the builtin for the function call. Verified by the cycle-3 reviewer under bash 5.3, bash 3.2 and zsh 5.9.
- **Why take the source's status as a simple command.** In a `||` list both shells suspend errexit for everything on the left, including the library's top-level commands; `source "$1"; src=$?` restores errexit's effect (the EXIT trap catches the resulting exit) and the explicit `[ "$src" -eq 0 ] || exit 97` keeps the non-zero-last-command case. Verified by the PR-review code lens: 97 for errexit-mid-file, non-zero-last-command and top-level-exit; 0 for a clean library.
- **The symlink limit is a decision.** `realpathSync` on a path that exists closes it for every real file; a path that does not yet exist cannot be realpath'd and is then refused by the readable-regular-file check before any spawn (as the finalise agent noted) — so the residual is only "a symlink that appears between the two checks", which is a TOCTOU nobody is defending. If the implementer chooses *not* to realpath, the alternative is a row that asserts the limit and a rule paragraph that says it is accepted — the point is that the `future` line ends.
- **Sits beside, not replaces.** Every change is inside the arm task.136 added; the `shell:` and JS arms' existing rows must stay green unchanged (66 rows today).

---

## 4. Scope

### In Scope

✅ `shared/resources/security-probe.mjs` — `SHELL_FN_BODY` (shadowed `exit`, source-status capture), the `needs-fake-gh` gate for both shell forms, `GH_COMMAND_WORD` + one-level `source` follow, dead clause, `resolveEntry` realpath (or stated limit)
✅ `shared/resources/tests/security-probe.test.mjs` — one row per limit (library with its own EXIT trap; `set -e` + failing top-level command; `shell:` script naming `gh` without the fixture; `gh;` / `gh>` / `"$GH"` / transitive `source` detected; symlink case refused or pinned); the two existing `symlink-escape` cases in the QA wrapper corpus flip accordingly
✅ `scripts/lint-shell.sh` + `.github/workflows/shellcheck.yml` — identical file-list change; guards intact
✅ `shared/resources/probe-boundary-rule.md` §5 — the sentinel paragraph and the fake-gh paragraph updated; the symlink limit closed or restated
✅ `npm run bundle`; CHANGELOG [Unreleased]

### Out of Scope

❌ A general `--fake-<cli>` mechanism — task.136 § Out of Scope stands; `gh` is the only CLI a boundary here consults
❌ stdin-reading or multi-argument functions (task.128 § Out of Scope)
❌ Changing the verdict vocabulary or the zero-guard
❌ The five hand-appending Change Log writers (task.139 § Notes) — unrelated

---

## 5. Breaking Changes

None — API stable. Two behaviours tighten: a `shell:` script naming `gh` without `--fake-gh` becomes a `needs-fake-gh` decline (it was scored through the host `gh`), and a library that today reads `absent` under a library-installed trap or errexit reads `entry-not-probeable`. Both are the direction the contract states; no consumer prompt names the old behaviour.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.140.plan.shell-fn-sentinel-hardening.md](task.140.plan.shell-fn-sentinel-hardening.md)

### Phase 1: The red rows

**Risk**: Low
**Files**: `shared/resources/tests/security-probe.test.mjs`

- [ ] Row: a library that installs `trap "true" EXIT` then `[ -n "$NOPE" ] || exit 1` → `entry-not-probeable`, executed 0 (red today: scored `absent`)
- [ ] Row: `set -e` + `false` at top level then a function → `entry-not-probeable` (red today: sourced to completion, scored)
- [ ] Row: a `shell:` script whose body names `gh`, no `--fake-gh` → `needs-fake-gh` (red today: scored)
- [ ] Rows: libraries reaching `gh` as `gh;`, `gh>/dev/null`, `"$GH" api`, and via `source ../../shared/resources/gh-labels.sh` → each `needs-fake-gh` without the fixture (red today)
- [ ] Row: the symlink case — a real symlink under a temp dir inside the repo root pointing outside it → `outside-repo-root` (red today) — or, if the limit is kept, a row that asserts the current acceptance and cites the rule paragraph
- [ ] All 66 existing rows unchanged

### Phase 2: The body and the gates

**Risk**: Medium
**Files**: `shared/resources/security-probe.mjs`

- [ ] `SHELL_FN_BODY`: shadow `exit` around the source; `src=$?` capture; `unset -f exit`; the rest unchanged
- [ ] `needs-fake-gh`: `isShellForm && fakeGhDir === null`
- [ ] `GH_COMMAND_WORD` terminators; `sourcedLibraries(text, entryPath, root)` → one level of `source`/`.` paths resolved against the library's directory then the root, read when they exist inside the root, tested with the same regex
- [ ] Remove `!isShellFn &&`
- [ ] `resolveEntry`: `realpathSync` when the path exists, before `relative(root, …)` (or: the stated-limit alternative, with the rule updated)
- [ ] Mutation proofs: each Phase 1 row goes red when its change is reverted; record all in the implementation report

### Phase 3: The lint lanes

**Risk**: Low
**Files**: `scripts/lint-shell.sh`, `.github/workflows/shellcheck.yml`

- [ ] Same file-list change in both: after the `*.sh` selection, append tracked files under `tests/fixtures/` whose first line is a bash shebang (or the explicit `tests/fixtures/fake-gh/gh`); the `>= 200` and empty-list guards unchanged; the count line still prints
- [ ] `npm run lint:shell` → the fixture is in the count; introduce a deliberate SC2086 into a scratch copy of the fixture and confirm the lane goes red (then discard the copy)

### Phase 4: Rule, bundle, CHANGELOG

**Risk**: Low
**Files**: `shared/resources/probe-boundary-rule.md`, `skills/*/references/`, `CHANGELOG.md`

- [ ] §5: the sentinel paragraph names the shadowed `exit` and the status capture; the fake-gh paragraph says both shell forms; the symlink sentence either removed (closed) or rewritten as an owned limit with its row named
- [ ] `npm run bundle`; `bundle:check` 0; `probe-boundary-signals.test.mjs` green
- [ ] CHANGELOG [Unreleased]; the seven items closed by reference to their source artefacts

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/security-probe.mjs` — body, gates, detector, dead clause, containment

### Files to Modify (Tests)

2. ✅ `shared/resources/tests/security-probe.test.mjs` — the rows above

### Files to Modify (Lint lanes — same commit)

3. ✅ `scripts/lint-shell.sh`
4. ✅ `.github/workflows/shellcheck.yml`

### Files to Modify (Documentation)

5. ✅ `shared/resources/probe-boundary-rule.md` — §5
6. ✅ `CHANGELOG.md`
7. ✅ `skills/*/references/` — regenerated

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: `security-probe.test.mjs` — the seven new rows plus the two flipped symlink expectations; every pre-existing row unchanged.
- **Command**: `command node --test shared/resources/tests/security-probe.test.mjs`; `npm run ci:fast`.
- **Target**: each new row red before its change and green after; each change mutation-proved by its own row.

### Integration Tests

- The task.136 evidence command re-run from the repo root (`--sink filename --entry shell-fn:shared/resources/gh-labels.sh#gh_labels_filter --cases-file … --fake-gh …`) still `engages` 20/20 — the hardening must not touch the green path. Recorded in the implementation report.
- `npm run lint:shell` lists the fixture; a deliberate warning in a scratch copy reds the lane.

### Contract Tests

- `probe-boundary-signals.test.mjs` (site parity) green; `bundle:check` 0.

### Performance Tests

Not applicable — one extra `readFileSync` per sourced path at gate time.

### Consumer Tests

- `tests/gh-labels.test.js` unchanged and green.

---

## 9. Success Criteria

### Functional

- [ ] A library with its own EXIT trap, and a `set -e` library whose top-level command fails, both decline `entry-not-probeable` with executed 0 under bash and zsh
- [ ] A `shell:` script naming `gh` without `--fake-gh` declines `needs-fake-gh`; `gh;`, `gh>`, `"$GH"` and a one-level `source` of `gh-labels.sh` are detected
- [ ] The symlink case is refused `outside-repo-root` — or the limit is pinned by a row and stated as accepted in the rule
- [ ] The task.136 green path (`engages` 20/20) unchanged; all 66 pre-existing rows green

### Performance

- [ ] `security-probe.test.mjs` wall-clock within noise of today's ~30 s

### Code Quality

- [ ] One mutation proof per change recorded; `ci:fast`, `bundle:check`, Prettier green; `npm run lint:shell` counts the fixture and stays under the 200 guard

### Migration

- [ ] Both lint lanes changed in one commit and byte-equivalent in their file-list expression; rule §5 updated once, prompts unchanged (they cite it); CHANGELOG

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **Shadowing `exit` changes what a library sees during its own source**
   - **Risk**: a library that calls `exit` at top level *deliberately* (an early-return guard) now declines instead of scoring — which is the intended outcome — but a library that *defines* its own `exit` wrapper would be overwritten by `unset -f exit`.
   - **Probability**: Low · **Impact**: Low — no library in this repository defines `exit`; a row asserts the behaviour so the next reader knows it was chosen.
   - **Mitigation**: the row; the rule paragraph names it.
   - **Rollback**: revert the body change; the trap-only form returns with its known gap.

2. **`realpathSync` on the entry path changes containment for existing symlinked layouts**
   - **Risk**: a consumer that installs skills through a symlinked directory (`.agents/skills` → elsewhere) could see entries resolve *outside* the repo root and be refused where they were accepted before.
   - **Probability**: Low · **Impact**: Medium — a working install starts declining.
   - **Mitigation**: realpath the root *and* the entry symmetrically before comparing; add a row with a symlinked-root fixture. If that proves brittle, take the stated-limit alternative — the task allows either.

### Low Risk Areas

1. **Lint-lane file-list drift** — the two files must change identically; the comment in each already says so, and the count line makes a mismatch visible.
2. **Detector false positives** — a comment naming `gh` declines `needs-fake-gh`; the caller passes the fixture. Named decline, not a wrong verdict.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: the task.136 green path stops engaging, or any pre-existing row goes red.
- **Steps**: revert Phase 2; keep Phase 1's rows (red, `todo`-marked) and Phase 3's lane change; `npm run bundle`; push.
- **Validation**: 66 rows green; the fixture still linted.

### Partial Rollback (1-2 hours)

- **When to use**: the realpath change refuses a legitimate symlinked install — revert only `resolveEntry` and take the stated-limit alternative.

### Forward Fix (< 4 hours)

- **When to use**: a detector terminator over- or under-matches — adjust the class and its row.

### Rollback Triggers

- **Critical**: the green path regresses; any pre-existing verdict changes.
- **Non-critical**: wording in §5.

---
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-09-22 | 1.0 | Initial draft — the seven limits recorded on task.136 (gate 3 `future`, PR review CR-1/CR-3, DoD SC5) with the reviewers' verified fixes | create-task |
| 2026-09-22 |  | Priority Medium → High (owner decision); issue label and board priority updated | edit-task |
<!-- change-log-end -->

## Progress Tracking

- [ ] Phase 1: the red rows
- [ ] Phase 2: the body and the gates
- [ ] Phase 3: the lint lanes
- [ ] Phase 4: rule, bundle, CHANGELOG
- [ ] QA: `task.140.qa.[N].shell-fn-sentinel-hardening.md`
- [ ] Gate: `task.140.gate.[N].shell-fn-sentinel-hardening.yml`

## References

- `docs/tasks/task.136.shell-fn-probe-entry-form/task.136.gate.3.shell-fn-probe-entry-form.yml` § `recommendations.future` — c3-CR-1, c3-CR-2, c3-CR-3, the symlink limit
- `docs/tasks/task.136.shell-fn-probe-entry-form/task.136.pr-review.1.shell-fn-probe-entry-form.md` — CR-1 (source-status capture, verified body), CR-3 (dead clause)
- `docs/tasks/task.136.shell-fn-probe-entry-form/task.136.dod.1.shell-fn-probe-entry-form.md` — SC5 deviation (the lint-lane gap)
- `docs/tasks/task.128.shell-boundary-probe-and-finalise-recheck/task.128.gate.5.*.yml` — where the symlink limit was first carried
- `shared/resources/security-probe.mjs` § "THE SHELL-FN ENTRY FORM (task.136)"
- `scripts/lint-shell.sh`, `.github/workflows/shellcheck.yml` — the twin lanes

## Notes

- QA artifacts land beside this file: `task.140.qa.[N].*.md`, `task.140.bug.[N].*.md`, `task.140.gate.[N].*.yml`.
- Independent of task.139. Shares `security-probe.mjs` with task.131 (markdown-structure sink, planned) — land one, rebase the other.
- The verified bodies are in the source artefacts; the plan reproduces them verbatim so the implementer executes rather than re-derives.
