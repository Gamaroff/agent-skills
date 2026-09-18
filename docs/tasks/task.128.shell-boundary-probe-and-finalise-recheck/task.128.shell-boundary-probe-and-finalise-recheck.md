---
id: task.128
title: "[Task 128] A refusing shell script is a boundary the probe engine cannot reach, and finalise can only accept or halt: a filename sink and a shell entry for security-probe.mjs, a boundary rule that names scripts, and a bounded fix-and-recheck exit at Step 7"
type: task
description: "On task.121 five QA cycles reached PASS 100/100 with "No boundary delivered" in every gate's security notes, and the finalise DoD security agent then reproduced two fail-closed defects in the very script the task delivered — a gate filename with an embedded newline made qa-cycle.sh exit 0 with a lower cycle, and isKnownStage admitted qa-gate-0. The QA probe never ran because security-probe.mjs imports JS entry points only, so a bash script that says 'refuses, never guesses' is unverifiable to it and the boundary rule read it as not a boundary; and finalise, having found the defect, had two exits — accept, or halt a hands-free pipeline for a human — so the run fixed it inline as an undocumented deviation. Three mechanisms: a `filename` sink in the input corpus and a `shell` entry form in the probe engine (bash <script> <arg>, both shells, count engine-written); the probe-boundary rule names a refusing script as a boundary by its own header; and finalise Step 8 gains a bounded fix-and-recheck path for a low-severity, single-commit, mutation-provable finding inside the task's own file set, with everything else still halting. Observation #121."
tags: [qa-task, qa-story, finalise, security-probe, boundary, review-security]
category: refactoring
status: planned
priority: High
risk_level: medium
created: 2026-09-18
updated: 2026-09-18
assignee:
estimated_effort_hours: 8
github_issue: 431
---

# Technical Task: A refusing shell script is a boundary the probe engine cannot reach, and finalise can only accept or halt

**Status:** Planned
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
                     --entry shell:path [--arg dir]  runs `bash <path> <fixture-dir>` per case, under bash AND zsh;
                                                     a `filename` case materialises as a fixture directory
                                                     (control file + hostile name); verdict from exit code + stdout
                                                     against the case's `expected` (refuse | accept=<value>)
security-input-corpus   + sink `filename`: newline-in-name, $(…), backticks, ;|&, leading -- / -n, glob metachars,
                        10-digit run, leading zeros, and legitimate: plain, dotted, hyphenated, unicode
probe-boundary-rule     + signal: a script or function whose header/doc says refuses | never guesses | fails closed
                        + rule: "not importable" is a reason to use the shell entry, never a reason to record false
finalise Step 8         + fix-and-recheck: ALL of {severity low, single commit, inside the task's Files Summary,
                          a test that goes red on revert, no medium+ finding open} → commit, retake CI reading 1 on
                          the fix head, re-run ONLY the failed section's reproduction, record the independence loss;
                          any precondition false → the existing halt
```

### Important Clarifications

- **The shell entry is not a second engine.** One CLI, one record shape, one `totals.executed`; `shell:` is an entry *form*, and the case loop, the two directions and the record writer are unchanged. Running under both shells is what task.119's runnable-prose rule already requires of every fenced block.
- **`filename` cases materialise, they are not passed as strings.** A hostile filename is hostile *as a directory entry*; the engine creates a temp directory per case, writes the case's control files, and passes the directory. The case declares what a correct script prints (`expected`), so the corpus says what a pass looks like.
- **The fix-and-recheck path is bounded by preconditions, not by judgement.** Each is checkable: `severity: low` from the agent YAML; one commit; every touched path in the task's §7; a mutation proof recorded; no other section FAIL. It re-runs the *reproduction*, not the four agents — the other three sections were evaluated against a tree the fix did not change, and that is stated in the DoD summary.
- **Zero executed is still a FAIL.** The shell entry removes the "cannot import" reason for zero; it does not soften the guard.

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
- [ ] `filename` sink with ≥8 hostile and ≥4 legitimate cases, each carrying `why` and `expected`.
- [ ] `shell:` entry: containment check on the script path; per-case temp fixture; `bash` and `zsh` runs; verdict `accepted` when stdout/exit match `expected`, `rejected` on refusal; record unchanged.
- [ ] Test: fixed `qa-cycle.sh` → all hostile rejected, all legitimate accepted, `executed` = cases × shells; the pre-fix script → the newline case `accepted` (reproduced).

**Dependencies**: none.

### Phase 2: Boundary rule and prompts (#121, rule half)

**Risk Level**: Low

**Files**: `shared/resources/probe-boundary-rule.md`, `finalise-dod-security-prompt.md`, `skills/qa-task/SKILL.md` 3b,
`skills/qa-story/SKILL.md` equivalent, `skills/review-security/SKILL.md` if it restates the signals

**Changes**:
- [ ] Header signal added; "not importable" routed to the shell entry.
- [ ] Every site that names `--entry '<path>#<export>'` also names `--entry shell:<path>`.
- [ ] Test: the task.121 gate-5 security `notes` ("No boundary delivered — … the helper reads filenames and prints a bounded integer") as a fixture the new rule classifies as a boundary.

**Dependencies**: Phase 1.

### Phase 3: finalise fix-and-recheck (#121, exit half)

**Risk Level**: Medium

**Files**: `skills/finalise/SKILL.md` Step 6 (decision table row) and Step 8, `shared/resources/finalise-*` if the
prompts carry severity, `skills/finalise/tests/` (new precondition test)

**Changes**:
- [ ] The path, its five preconditions, the re-check scope, the DoD-summary "Deviations recorded" block (task.121's dod.1 as the wording source).
- [ ] The decision table gains the row; the gaps path is unchanged for every other case.
- [ ] Test: a table-driven precondition check (five inputs → proceed / halt) pinned so a sixth cannot be added silently.

**Dependencies**: none.

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/security-input-corpus.mjs`, `security-input-corpus.md`
2. ✅ `shared/resources/security-probe.mjs`
3. ✅ `shared/resources/probe-boundary-rule.md`, `finalise-dod-security-prompt.md`
4. ✅ `skills/finalise/SKILL.md`, `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `skills/review-security/SKILL.md`

### Files to Create

None (tests extend existing suites; one new finalise test file if none exists).

### Files to Modify (Tests)

5. ✅ `shared/resources/tests/security-input-corpus.test.mjs`, `security-probe.test.mjs`; finalise precondition test

### Files to Modify (Documentation)

6. ✅ `CHANGELOG.md`; `docs/reference/anti-patterns.md` — "unverifiable is a reason, not a verdict"
7. ✅ `skills/*/references/` — regenerated

### Files to Delete

None.

## 8. Testing Strategy

### Unit Tests
- [ ] Corpus schema: `filename` has both directions; every case has `why` and `expected`.
- [ ] Engine: shell entry against the fixed and pre-fix `qa-cycle.sh`; count = cases × shells; a script outside `--repo-root` refused before execution.
- [ ] Finalise precondition table: each precondition false → halt; all true → proceed.

**Command**: `npm test`

### Integration Tests
- [ ] `qa-task` Step 3b on a fixture diff that adds a refusing script: gate records `boundary: true`, `probes_executed > 0`.

### Contract Tests
- [ ] Every site naming the JS entry names the shell entry (grep with a non-vacuity floor).

### Performance Tests
- [ ] Shell entry ≤ 2 s for the `filename` sink in both shells.

### Consumer Tests
- [ ] The next task that ships a shell helper gets a measured security axis, not `reasoned`.

## 9. Success Criteria

### Functional
- [ ] `security-probe.mjs --entry shell:shared/resources/qa-cycle.sh --sink filename` executes every case under bash and zsh and reproduces the newline case on the pre-fix script.
- [ ] The boundary rule classifies a refusing script as a boundary; the task.121 gate-5 security note is the red fixture.
- [ ] `/finalise` proceeds through fix-and-recheck only when all five preconditions hold, and halts otherwise.

### Performance
- [ ] No change to the JS entry path.

### Code Quality
- [ ] One engine, one record shape; the shell form adds no second count.
- [ ] Each mechanism has a mutation proof recorded.

### Migration
- [ ] Observation #121 closes naming the PR.

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
- **Critical**: a zero-executed boundary recorded as PASS; finalise proceeding on a medium finding.
- **Non-critical**: corpus wording, prompt text.

## Change Log

<!-- change-log-start -->
| Date | Version | Description | Author |
| ---- | ------- | ----------- | ------ |
| 2026-09-18 | 1.0 | Initial draft — observation review 2026-09-18 (obs #121) | create-task |
<!-- change-log-end -->

## Progress Tracking

- [ ] Phase 1: filename sink + shell entry
- [ ] Phase 2: boundary rule + prompts
- [ ] Phase 3: finalise fix-and-recheck
- [ ] QA: `task.128.qa.[N].shell-boundary-probe-and-finalise-recheck.md`
- [ ] Gate: `task.128.gate.[N].shell-boundary-probe-and-finalise-recheck.yml`

## References

- Observation #121
- task.118 (merged) — engine-written `probes_executed`; task.121 (merged, PR #430) — the shell boundary, its gate-5 "No boundary delivered" note, the finalise fix `a412f59a`, and `task.121.dod.1` "Deviations recorded" wording
- `shared/resources/security-probe.mjs`, `security-input-corpus.mjs`, `probe-boundary-rule.md`

## Notes

Bugs found during QA land at `task.128.bug.[N].[name].md` in this directory.
