---
id: task.128
title: "[Task 128] A refusing shell script is a boundary the probe engine cannot reach, and finalise can only accept or halt: a filename sink and a shell entry for security-probe.mjs, a boundary rule that names scripts, and a bounded fix-and-recheck exit at Step 7"
type: task
description: "On task.121 five QA cycles reached PASS 100/100 with "No boundary delivered" in every gate's security notes, and the finalise DoD security agent then reproduced two fail-closed defects in the very script the task delivered — a gate filename with an embedded newline made qa-cycle.sh exit 0 with a lower cycle, and isKnownStage admitted qa-gate-0. The QA probe never ran because security-probe.mjs imports JS entry points only, so a bash script that says 'refuses, never guesses' is unverifiable to it and the boundary rule read it as not a boundary; and finalise, having found the defect, had two exits — accept, or halt a hands-free pipeline for a human — so the run fixed it inline as an undocumented deviation. Three mechanisms: a `filename` sink in the input corpus and a `shell` entry form in the probe engine (bash <script> <arg>, both shells, count engine-written); the probe-boundary rule names a refusing script as a boundary by its own header; and finalise Step 8 gains a bounded fix-and-recheck path for a low-severity, single-commit, mutation-provable finding inside the task's own file set, with everything else still halting. Observation #121."
tags: [qa-task, qa-story, finalise, security-probe, boundary, review-security]
category: refactoring
status: ready-for-review
priority: High
risk_level: medium
created: 2026-09-18
updated: 2026-09-20
assignee:
estimated_effort_hours: 8
github_issue: 431
---

# Technical Task: A refusing shell script is a boundary the probe engine cannot reach, and finalise can only accept or halt

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.128.review.1.shell-boundary-probe-and-finalise-recheck.md` implemented 2026-09-20
**GitHub Issue**: [#431](https://github.com/Gamaroff/agent-skills/issues/431)

---

## 1. Overview

Task.118 made the security probe's count engine-written: `security-probe.mjs` imports a JS entry, runs the corpus for a named sink in both directions, and writes the record that `probes_executed` is copied from. Task.121 then delivered a boundary in **bash** — `qa-cycle.sh`, whose header says it "refuses rather than guesses" — and the engine could not reach it: every one of five QA gates recorded `evidence: reasoned`, `probes_executed: 0` and "No boundary delivered" in the security notes (gate 5: "the helper reads filenames and prints a bounded integer"), and the `/finalise` security agent, working by hand in a scratchpad, reproduced two fail-closed defects in ten minutes. Finalise then had no sanctioned way to act on a one-line fix and the run improvised one.

This task closes both halves. The probe engine gains a `filename` sink (embedded newline, `$(…)`, backticks, `;|&`, leading `--`/`-n`, glob metacharacters, >9-digit runs, leading zeros) and a `shell` entry form that runs `bash <script> <dir>` against a fixture directory built from each case, under bash and zsh, with the count written by the engine. The boundary rule (`probe-boundary-rule.md`, shared by qa-task, qa-story and review-security) names a script whose header carries *refuses / never guesses / fails closed* as a boundary, so the decision cannot read "not JS" as "not a boundary". And `/finalise` Step 8 gains a **fix-and-recheck** exit with hard preconditions, so the next late, small, provable finding follows a rule instead of a judgement made at 07:00 with no human present.

**Scope**: `shared/resources/security-input-corpus.{md,mjs}`, `security-probe.mjs`, `probe-boundary-rule.md`, `finalise-dod-security-prompt.md`, `skills/finalise/SKILL.md` Step 8, the qa-task / qa-story Step 3b prose that names the engine, tests.

## 2. Motivation

### Current Problems

1. **The probe engine reaches JS only.** `--entry` is `path#exportName` and the engine `import()`s it; a shell script has no export. The prompt's own escape — `verdict: unverifiable, executed: 0` — is correct for the engine and wrong for the deliverable: the boundary existed, nothing executed, and the gate said PASS (task.121 gates 1–5, `evidence: reasoned`).
2. **The boundary rule keyed on the wrong signal.** Five gates recorded "no boundary delivered"; finalise's agent, reading the same diff, recorded `boundary: true` and probed. Two readers of one rule reached opposite decisions (the gates carry no `boundary:` key of their own — the decision lives only in the notes, which is itself part of the gap) because the rule's signals (an exported predicate, an allow-list, tests of the shape "X is refused") are JS-shaped, and a script that *says* it refuses matched none of them.
3. **The corpus has no filename sink.** The hostile inputs that defeated `qa-cycle.sh` — a newline inside a name, which sed splits into two lines — are not in `security-input-corpus.md`, so even a hand probe re-derives them from prose and reaches a different set each time (the failure mode task.118 removed for JS).
4. **Finalise has two exits.** Step 6's decision matrix and Step 8's gap report: ACCEPTED, or "address the gaps before re-running /finalise". A low-severity, one-line, mutation-provable finding in the task's own file set has no path except halting a hands-free run or an undocumented inline fix. Task.121 took the second and recorded it as a deviation; the next run has the same choice and no rule.

### Benefits

1. A shell boundary is probed by the same engine, with the same corpus, and the same engine-written count as a JS one.
2. One boundary rule that two readers apply the same way, because a refusing script is named as a boundary by its own words.
3. A hostile-filename corpus that every later probe gets for free.
4. A finalise that can close a small, provable gap under stated preconditions — and still halts on everything else.

## 3. Technical Background

### Current Architecture

```
security-probe.mjs   --entry path#export → import() → call(input) per corpus case → record totals.executed
security-input-corpus   sinks: url-authority | sql-orm | shell-exec | path | template-render
probe-boundary-rule     signals: exported predicate | allow/deny-list | "X is refused" tests | never/must-not in criteria
qa-task 3b / finalise   boundary:false → skip; boundary:true + executed:0 → FAIL "probe mode executed no candidates"
finalise Step 6/8       ACCEPTED | gaps → halt
```

### Target Architecture

```
security-probe.mjs   --entry path#export            (JS, unchanged)
                     --entry shell:path              runs `bash <path> <fixture-dir>` per case, under bash AND
                                                     zsh (argv form: `zsh -c 'bash "$1" "$2"' zsh <path> <dir>`,
                                                     never a string); child env = the engine's sandboxEnv() +
                                                     LC_ALL=C, stdin </dev/null, per-case timeout;
                                                     a `filename` case materialises as a fixture directory:
                                                     BRACKETING controls (a low gate that sorts first and a
                                                     high gate that sorts last in C order) + the case's name;
                                                     verdict = {stdout, exit, stderr:"", absent:[paths]} vs
                                                     the case's `expected`. `--arg <string>` is reserved for a
                                                     sink whose input is a plain string; `filename` always
                                                     materialises.
security-input-corpus   + sink `filename`: newline-in-name, $(…), backticks, ;|&, leading -- / -n, glob metachars,
                        10-digit run, leading zeros, and legitimate: plain, dotted, hyphenated, unicode.
                        The sink declares its fixture controls ONCE; each case's `expected` is
                        {stdout, exit, stderr: "", absent: [paths]} — beside controls a correct script never
                        "refuses" a hostile name, it ignores it and prints the high control, so refuse|accept
                        cannot express the pass condition (review 1)
probe-boundary-rule     + signal: a script or function whose header/doc says refuses | never guesses | fails closed
                          (the phrase list is EXPORTED once from probe-boundary-signals.mjs — classifyBoundaryText —
                          and the prose cites it, so the fixture test calls a function, not a grep)
                        + rule: "not importable" is a reason to use the shell entry, never a reason to record false
                        + §5 "v1 probes importable entry points only" bullet and §5.1 by-hand rule REWRITTEN:
                          a one-positional-argument script is reachable via shell:; stdin/network/multi-arg
                          remain declined and are what §5.1 still covers
finalise Step 8         + fix-and-recheck: ALL of {severity low, single commit, inside the task's Files Summary,
                          a test that goes red on revert, no medium+ finding open} → commit, retake CI reading 1 on
                          the fix head, re-run ONLY the failed section's reproduction, record the independence loss;
                          any precondition false → the existing halt.
                          `severity` DOES NOT EXIST in finalise-dod-security-prompt.md's output today (review 1):
                          probes[] and FAIL checks[] entries gain `severity: low | medium | high`; an entry
                          without one is NOT low (fail closed → halt). The Decision Matrix row lands in BOTH
                          definitions — SKILL.md Step 6 and references/definition-of-done-checklist.md §
                          "Completion Status Decision Matrix" — each citing the one precondition JSON fixture
```

### Important Clarifications

- **The shell entry is not a second engine.** One CLI, one record shape, one `totals.executed`; `shell:` is an entry *form*, and the case loop, the two directions and the record writer are unchanged. Running under both shells is what task.119's runnable-prose rule already requires of every fenced block.
- **`filename` cases materialise, they are not passed as strings.** A hostile filename is hostile *as a directory entry*; the engine creates a temp directory per case, writes the case's control files, and passes the directory. The case declares what a correct script prints (`expected`), so the corpus says what a pass looks like.
- **The fix-and-recheck path is bounded by preconditions, not by judgement.** Each is checkable: `severity: low` from the agent YAML; one commit; every touched path in the task's §7; a mutation proof recorded; no other section FAIL. It re-runs the *reproduction*, not the four agents — the other three sections were evaluated against a tree the fix did not change, and that is stated in the DoD summary.
- **Zero executed is still a FAIL.** The shell entry removes the "cannot import" reason for zero; it does not soften the guard.
- **The reproduction is by stdout, and that needs bracketing controls (review 1, verified).** The pre-fix `qa-cycle.sh` prints the *same* stdout as the fixed one whenever the hostile name is processed after the highest gate — glob order is `strcoll` order and locale-dependent. The engine therefore runs the child with `LC_ALL=C` and materialises a low control that sorts first and a high control that sorts last, so the hostile name is always between them; the arithmetic error the pre-fix script leaks on stderr is the order-independent second signal, which is why `expected.stderr` is `""`.
- **The zsh run verifies the caller shape, not the script.** `qa-cycle.sh` carries a bash shebang and is always invoked as `bash <script>`; the zsh run is the `QA_CYCLE=$(bash … "$DIR")` call site as a zsh Bash tool executes it — argv form, never a string built from the path.

## 4. Scope

### In Scope

✅ `filename` sink in `security-input-corpus.{md,mjs}` (hostile + legitimate; schema test extended).
✅ `shell:` entry form in `security-probe.mjs`: fixture materialisation, bash + zsh, exit/stdout verdict, same record.
✅ `probe-boundary-rule.md`: the header signal; "not importable → shell entry" rule.
✅ `finalise-dod-security-prompt.md` and qa-task / qa-story Step 3b: name the shell entry where the JS one is named.
✅ `skills/finalise/SKILL.md` Step 8: the fix-and-recheck path, its preconditions, its DoD-summary wording.
✅ Tests: engine test with `qa-cycle.sh` (fixed) as the green fixture and the pre-fix version (`git show a412f59a^:shared/resources/qa-cycle.sh`) as the red one; corpus schema; finalise precondition table pinned.
✅ `npm run bundle`.

### Out of Scope

❌ Probing scripts that take stdin or more than one positional argument — `--arg` covers one; a second form is a later task.
❌ Windows shells.
❌ Changing the decision matrix for medium or high findings — those halt exactly as today.

## 5. Breaking Changes

None. `--entry path#export` is unchanged; a corpus without `filename` cases fails only the new schema test.

## 6. Implementation Plan

> Detailed implementation guide: [task.128.plan.shell-boundary-probe-and-finalise-recheck.md](task.128.plan.shell-boundary-probe-and-finalise-recheck.md)

### Phase 1: Filename sink and shell entry (#121, probe half)

**Risk Level**: Medium

**Files**: `shared/resources/security-input-corpus.mjs`, `security-input-corpus.md`, `security-probe.mjs`,
`shared/resources/tests/security-input-corpus.test.mjs`, `security-probe.test.mjs`

**Changes**:
- [x] `filename` sink with ≥8 hostile and ≥4 legitimate cases, each carrying `why` and `expected`.
- [x] `shell:` entry: containment check on the script path before `spawnSync`; per-case temp fixture with bracketing controls; `bash` and `zsh` runs in argv form under `sandboxEnv()` + `LC_ALL=C`, `</dev/null`, per-case timeout; verdict: for a hostile case `rejected` when `{stdout, exit, stderr, absent}` all match `expected` (the name was handled correctly), `accepted` otherwise (reproduced); for a legitimate case the inverse; record unchanged, plus the fixture listing per case.
- [x] Test: fixed `qa-cycle.sh` → all hostile rejected, all legitimate accepted, `executed` = cases × shells; the pre-fix script (`tests/fixtures/qa-cycle.prefix.sh`, from `git show a412f59a^:shared/resources/qa-cycle.sh`) → the newline case `accepted` (reproduced) **by stdout** (prints the low control, not the high one) — a fixture without bracketing controls must fail this test, which is the mutation proof for the control design.
- [x] `$(touch PWNED)` / backtick cases: `expected.absent` names the marker path; a marker created anywhere under the fixture is `accepted` (reproduced) regardless of stdout.

**Dependencies**: none.

### Phase 2: Boundary rule and prompts (#121, rule half)

**Risk Level**: Low

**Files**: `shared/resources/probe-boundary-rule.md` (§ new signal, § routing rule, **§5 bullet and §5.1 rewritten**),
`shared/resources/probe-boundary-signals.mjs` (new — the exported phrase list + `classifyBoundaryText`),
`finalise-dod-security-prompt.md` (Step 1b signal + `--entry shell:` + `severity` on `probes[]`/FAIL `checks[]`),
`skills/qa-task/SKILL.md` 3b, `skills/qa-story/SKILL.md` equivalent, `skills/review-security/SKILL.md` if it restates the signals

**Changes**:
- [x] Header signal added; "not importable" routed to the shell entry; §5 "v1 probes importable entry points only" bullet and §5.1 rewritten so the document does not contradict itself.
- [x] `probe-boundary-signals.mjs` exports the phrase list once; the rule's prose cites it.
- [x] Every site that names `--entry '<path>#<export>'` also names `--entry shell:<path>`.
- [x] Test: the task.121 gate-5 security `notes` ("No boundary delivered — … the helper reads filenames and prints a bounded integer") and the `qa-cycle.sh` header as fixtures `classifyBoundaryText` classifies as a boundary; a header with none of the phrases as the negative fixture. The test calls the function — never greps the prose.

**Dependencies**: Phase 1.

### Phase 3: finalise fix-and-recheck (#121, exit half)

**Risk Level**: Medium

**Files**: `skills/finalise/SKILL.md` Step 6 (decision table row) and Step 8, `skills/finalise/references/definition-of-done-checklist.md`
§ "Completion Status Decision Matrix" (the second definition of the same table), `shared/resources/finalise-dod-security-prompt.md`
(`severity` field — it does not carry one today), `shared/resources/finalise-fix-and-recheck-preconditions.json` (the pinned table),
`shared/resources/tests/finalise-fix-and-recheck.test.mjs` (under the glob `npm test` already runs — `skills/finalise/tests/` does
not exist and is not in `package.json`'s hand-listed globs)

**Changes**:
- [x] The path, its five preconditions, the re-check scope, the DoD-summary "Deviations recorded" block (task.121's dod.1 as the wording source).
- [x] The decision table gains the row in **both** definitions (SKILL.md Step 6; DoD checklist reference); the gaps path is unchanged for every other case.
- [x] `finalise-dod-security-prompt.md` output schema: `severity: low | medium | high` on every `probes[]` entry and every FAIL `checks[]` entry; the precondition reads it, and an entry with no `severity` is **not low**.
- [x] Test: a table-driven precondition check (five inputs → proceed / halt) reading the JSON fixture, pinned so a sixth cannot be added silently, plus the fail-closed case (missing `severity` → halt).

**Dependencies**: none.

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/security-input-corpus.mjs`, `security-input-corpus.md`
2. ✅ `shared/resources/security-probe.mjs`
3. ✅ `shared/resources/probe-boundary-rule.md`, `finalise-dod-security-prompt.md` (schema: `severity`), `skills/finalise/references/definition-of-done-checklist.md`
4. ✅ `skills/finalise/SKILL.md`, `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `skills/review-security/SKILL.md`

### Files to Create

- `shared/resources/probe-boundary-signals.mjs` — the boundary phrase list, exported once
- `shared/resources/finalise-fix-and-recheck-preconditions.json` — the pinned precondition table
- `shared/resources/tests/finalise-fix-and-recheck.test.mjs` — under the existing `npm test` glob
- `tests/fixtures/qa-cycle.prefix.sh` — the pre-fix script, from `git show a412f59a^:shared/resources/qa-cycle.sh`
- `shared/resources/finalise-fix-and-recheck.mjs` — the precondition evaluator (library + CLI; exit 0 proceed / 1 halt / 2 usage) that reads the JSON, so Step 8a checks a table rather than a judgement
- `shared/resources/tests/probe-boundary-signals.test.mjs` — classifier fixtures (qa-cycle.sh header, task.121 gate-5 note, negatives) and the JS-form/shell-form contract test
- `shared/resources/tests/fixtures/security-probe/eval-names.sh`, `eval-names-nocd.sh`, `runs-names.sh`, `writes-home-tmp-self.sh` — deliberately wrong scripts (eval with/without `cd "$1"`; executing each name under `set -e`; writing to `$HOME`/`$TMPDIR`/beside itself) for the `absent`, launch-failure and escape checks

### Files to Modify (Tests)

5. ✅ `shared/resources/tests/security-input-corpus.test.mjs`, `security-probe.test.mjs` (+ BUG-2/BUG-3 regression tests), `probe-boundary-signals.test.mjs` (new), `finalise-fix-and-recheck.test.mjs` (+ BUG-1 symlinked-invocation and BUG-4 recorded-run tests)

### Files to Modify (Documentation)

6. ✅ `CHANGELOG.md`; `docs/reference/anti-patterns.md` — "Never record `unverifiable` as a verdict when it is a reason"
7. ✅ `skills/{finalise,qa-task,qa-story,review-security}/references/` — regenerated (`probe-boundary-signals.mjs` lands beside the engine via its re-export; `finalise-fix-and-recheck.{mjs,json}` in finalise)

### Files to Delete

None.

## 8. Testing Strategy

### Unit Tests
- [x] Corpus schema: `filename` has both directions; every case has `why` and `expected`.
- [x] Engine: shell entry against the fixed and pre-fix `qa-cycle.sh`; count = cases × shells; a script outside `--repo-root` refused before execution; the newline reproduction is by stdout (bracketing controls) and a fixture without them fails.
- [x] Boundary signals: `classifyBoundaryText` on the gate-5 note, the `qa-cycle.sh` header (positive) and a plain header (negative).
- [x] Finalise precondition table: each precondition false → halt; all true → proceed; missing `severity` → halt.

**Command**: `npm test`

### Integration Tests
- [x] `qa-task` Step 3b on a fixture diff that adds a refusing script: gate records `boundary: true`, `probes_executed > 0`.

### Contract Tests
- [x] Every site naming the JS entry names the shell entry (grep with a non-vacuity floor).

### Performance Tests
- [x] Shell entry ≤ 2 s for the `filename` sink in both shells.

### Consumer Tests
- [ ] The next task that ships a shell helper gets a measured security axis, not `reasoned`.

## 9. Success Criteria

### Functional
- [x] `security-probe.mjs --entry shell:shared/resources/qa-cycle.sh --sink filename` executes every case under bash and zsh and reproduces the newline case on the pre-fix script.
- [x] `classifyBoundaryText` classifies a refusing script as a boundary by its own header (`qa-cycle.sh` → `refuses rather than`); the task.121 gate-5 security note is pinned as the negative fixture — it carries no signal, which is why the JS-shaped rule recorded `boundary: false` against the script the note describes.
- [x] `/finalise` proceeds through fix-and-recheck only when all five preconditions hold — including a `severity: low` the security agent now emits — and halts otherwise, including on a finding with no severity.

### Performance
- [x] No change to the JS entry path.

### Code Quality
- [x] One engine, one record shape; the shell form adds no second count.
- [x] Each mechanism has a mutation proof recorded.

### Migration
- [x] Observation #121 closes naming the PR.

## 10. Risk Assessment

### High Risk
None.

### Medium Risk
1. **A fixture directory with a hostile name on a filesystem that forbids it.** Mitigation: a case the OS refuses to create is recorded `declined`, never counted as executed or as passed.
2. **The fix-and-recheck path is read as licence.** Mitigation: preconditions are a pinned table; the DoD summary must carry the "Deviations recorded" block; a medium finding takes the old halt.

### Low Risk
1. zsh absent on CI — the engine runs bash only and records `shells: [bash]` in the record.

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)
- **Triggers**: the shell entry hangs on a script that reads stdin; finalise accepts on a precondition it should have failed.
- **Steps**: `git revert`; `npm run bundle`; commit.
- **Validation**: engine and finalise tests green on the reverted tree.

### Partial Rollback (1–2 hours)
- Phases are independent; Phase 3 can be reverted alone.

### Forward Fix
- A stdin-reading script: `</dev/null` on the child, a timeout per case.

### Rollback Triggers
- **Critical**: a zero-executed boundary recorded as PASS; finalise proceeding on a medium finding or on a finding with no `severity`.
- **Non-critical**: corpus wording, prompt text.

## Bug Reports

### In QA Verification

_None._

### Closed Bugs

- BUG-1..4 - ✅ Closed (verified at cycle 2)
- BUG-5..8 - ✅ Closed (verified at cycle 3)
- [BUG-9](./task.128.bug.9.launch-failure-matcher-catches-runtime-errors-inside-the-target.md), [BUG-10](./task.128.bug.10.three-prose-sites-still-say-non-js-is-unverifiable.md), [BUG-11](./task.128.bug.11.malformed-expected-scores-absent-or-throws.md), [BUG-12](./task.128.bug.12.side-effects-outside-the-fixture-dir-invisible.md) - ✅ Closed (verified at cycle 4)
- [BUG-13](./task.128.bug.13.absent-dot-dot-always-exists-scores-a-vacuous-defect.md) - ✅ Closed (verified at cycle 5)

## QA Testing Results

**QA Status**: CONCERNS (no open entry)
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-20
**Quality Score**: 95/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.128.qa.5.shell-boundary-probe-and-finalise-recheck.md](./task.128.qa.5.shell-boundary-probe-and-finalise-recheck.md)
- **Gate File**: [task.128.gate.5.shell-boundary-probe-and-finalise-recheck.yml](./task.128.gate.5.shell-boundary-probe-and-finalise-recheck.yml)

### Test Coverage Summary
- **Tests Executed**: 3579 (isolated-worktree fast gate at 76b7151f) + 39 engine-recorded security probes
- **Phases Verified**: 3/3
- **Critical Issues**: 0 HIGH, 0 MEDIUM, 2 LOW (advisory, future)
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
BUG-13, CR-2, CR-3, CR-4 verified FIXED by execution; no open entry. Advisory (future): CR-1 case-folded fixture names slip the string collision check (APFS) — eligible for finalise fix-and-recheck; CR-2 the CR-3 test fixture should `exec sleep`.

## Change Log
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-09-18 | 1.0 | Initial draft — observation review 2026-09-18 (obs #121) | create-task |
| 2026-09-20 | 1.1 | Review passed (8/10) — 1 critical + 7 important fixes applied: `severity` added to the security agent schema (did not exist); bracketing controls + `LC_ALL=C` so the pre-fix reproduction is by stdout (verified order-dependent); `expected` as {stdout, exit, stderr, absent}; argv-form zsh call; §5/§5.1 of the boundary rule rewritten; signals exported once (`probe-boundary-signals.mjs`); Decision Matrix row in both definitions; precondition test under the globbed `shared/resources/tests/` | review-task |
| 2026-09-20 |  | Status → ready-for-development | review-task |
| 2026-09-20 |  | Implemented — 18 files (5 created), 32 new tests across 3 suites; 12 mutants killed | develop |
| 2026-09-20 |  | QA gate FAIL (40/100) — 2 HIGH, 2 MEDIUM, 3 LOW; 39 security probes measured | qa-task |
| 2026-09-20 |  | QA findings fixed — BUG-1 (realpath CLI guard), BUG-2 (decline unreadable script / 126-127), BUG-3 (NUL → bad-entry), BUG-4 (recorded mutation run); 5 mutants red; cycle 1 (1 iteration) | qa-fix |
| 2026-09-20 |  | QA gate FAIL (50/100), cycle 2 refute pass — BUG-1..4 verified fixed; 1 HIGH, 3 MEDIUM, 2 LOW new | qa-task |
| 2026-09-20 |  | QA findings fixed — BUG-5 (cwd: fixtureDir), BUG-6 (--git-base post-commit licence), BUG-7 (launch failure keyed on bash stderr), BUG-8 (comparable-keys guard), CR-4..8; cycle 2 (2 iterations so far) | qa-fix |
| 2026-09-20 |  | QA gate CONCERNS (60/100), cycle 3 — BUG-5..8 verified fixed; 0 HIGH, 4 MEDIUM new | qa-task |
| 2026-09-20 |  | QA findings fixed — BUG-9 (script-as-subject launch matcher), BUG-10 (three prose sites → shell:, population grep), BUG-11 (expected validated), BUG-12 (sandboxed HOME/TMPDIR, script-dir snapshot, PWD); cycle 3 (3 iterations so far) | qa-fix |
| 2026-09-20 |  | QA gate CONCERNS (90/100), cycle 4 — BUG-9..12 verified fixed; 0 HIGH, 1 MEDIUM, 2 LOW | qa-task |
| 2026-09-20 |  | QA findings fixed — BUG-13 (absent . / .. / collisions rejected), CR-2 (case-insensitive launch message), CR-3 (escapes/shells through the collapse), CR-4; cycle 4 (4 iterations so far) | qa-fix |
| 2026-09-20 |  | QA gate CONCERNS (95/100), cycle 5 — BUG-13, CR-2..4 verified fixed; 0 HIGH, 0 MEDIUM, 2 LOW advisory; no open entry → 5c | qa-task |
<!-- change-log-end -->

## Progress Tracking

- [x] Phase 1: filename sink + shell entry
- [x] Phase 2: boundary rule + prompts
- [x] Phase 3: finalise fix-and-recheck
- [ ] QA: `task.128.qa.[N].shell-boundary-probe-and-finalise-recheck.md`
- [ ] Gate: `task.128.gate.[N].shell-boundary-probe-and-finalise-recheck.yml`

## References

- Observation #121
- task.118 (merged) — engine-written `probes_executed`; task.121 (merged, PR #430) — the shell boundary, its gate-5 "No boundary delivered" note, the finalise fix `a412f59a`, and `task.121.dod.1` "Deviations recorded" wording
- `shared/resources/security-probe.mjs`, `security-input-corpus.mjs`, `probe-boundary-rule.md`

## Notes

Bugs found during QA land at `task.128.bug.[N].[name].md` in this directory.
