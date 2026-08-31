# QA Report: Task 67 — Re-review after fixes (cycle 2)

**Task**: [task.67.execute-the-skill-qa-gate.md](./task.67.execute-the-skill-qa-gate.md)
**Gate File**: [task.67.gate.2.execute-the-skill-qa-gate.yml](./task.67.gate.2.execute-the-skill-qa-gate.yml)
**Previous**: [gate.1 — FAIL](./task.67.gate.1.execute-the-skill-qa-gate.yml) · [qa.1](./task.67.qa.1.execute-the-skill-qa-gate.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-31
**PR**: [#289](https://github.com/Gamaroff/agent-skills/pull/289) — commit `a74c59a`
**Gate Status**: **PASS** (was FAIL)

---

## Executive Summary

Every finding that made cycle 1 a FAIL is closed, and closed in a way that survives independent
re-verification rather than assertion. All fourteen previously fail-open inputs now classify
`mutating`; the containment canary that escaped the temp working copy no longer does; and the fixes
introduced no over-strictness — six representative legitimate patterns still execute.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED
**Quality Score**: 90/100

---

## Re-Review Context

Scoped to the single commit since gate 1: `a74c59a`.

| gate.1 issue | Severity | Status | QA verification |
|---|---|---|---|
| CR-1 write redirections uninspected | HIGH | ✅ **Closed** | `echo pwned > /tmp/x`, `ls >> …`, `&>` → all `mutating` |
| CR-2 comment stripper fires inside quotes | HIGH | ✅ **Closed** | `echo "note # here"; rm -rf …` → `mutating` |
| CR-3 here-string read as heredoc opener | HIGH | ✅ **Closed** | `grep -q x <<<"DATA"` + `rm -rf` → `mutating` |
| CR-4 unparseable token fails open | HIGH | ✅ **Closed** | `\mv a b` and `$CMD -rf …` → `mutating`; `\ls` still runnable |
| CR-5 command runners | HIGH | ✅ **Closed** | `env` / `command` / `time` → `mutating` |
| CR-6 awk program unscanned | HIGH | ✅ **Closed** | `awk 'BEGIN{system(…)}'` → `mutating` |
| CR-7 find write actions | HIGH | ✅ **Closed** | `-delete`, `-exec`, plus `sort -o`, `tee` → `mutating` |
| CR-8 process substitution | HIGH | ✅ **Closed** | `cat <(touch …)` → `mutating` |
| CR-9 `sed --in-place` | MEDIUM | ✅ **Closed** | long form and `=SUFFIX` → `mutating` |
| CR-10 attributed-fence desync | MEDIUM | ✅ **Closed** | attributed + plain block extracts **2** (was 0) |
| CR-11 temp-dir leak | MEDIUM | ✅ **Closed** | engine temp-dir count unchanged across happy and failing paths |
| CR-12 environment leak | MEDIUM | ✅ **Closed** | a secret set in the parent is invisible to the snippet |
| M4 skip reason names a template as a command | MEDIUM | ⏭ **Deferred** | Accepted — reason accuracy only; classification unaffected |
| L1, L4, L5 | LOW | ⏭ **Deferred** | Accepted with rationale; L5 (zsh in CI) carried to future recommendations |
| L2, L3, L6, L7, L8 | LOW | ✅ **Closed** | SIGTERM, `--timeout`, two weak tests, memoisation, CLI coverage |

**0 issues outstanding that block.**

---

## Verification Performed

QA re-ran the evidence rather than reading the claims.

### 1. All fourteen fail-open inputs

```
holes still open: 0/14   legitimate blocks refused: 0/6
```

Both halves matter. The first says the boundary holds; the second says it was not bought by refusing
everything — `ls foo 2>/dev/null`, `command -v zsh >/dev/null 2>&1`, `find . -maxdepth 1 -name "*.md"`,
`git log --oneline -1`, a heredoc quoting `git push`, and `$((N + 1))` all still run.

### 2. Containment canary — the cycle-1 proof, re-run

| | cycle 1 | cycle 2 |
|---|---|---|
| `echo pwned > /tmp/qa67-canary-PROOF` classified | `runnable` | **`mutating`** |
| Canary written outside the temp copy | **true** | **false** |

### 3. Independent mutation spot check

Four load-bearing fixes reverted against the shipped code:

| Reverted | Failing tests | Held? |
|---|---|---|
| `WRITE_REDIRECT` check | 2 | ✅ |
| `<unparseable>` fail-closed emission | 2 | ✅ |
| Sandbox sentinel report | 2 | ✅ |
| Attributed-fence info-string parse | 2 | ✅ |

`mutation-proven: yes` for all four.

### 4. Step 4b — the feature, run against itself again

| File | Blocks | runnable / placeholder / mutating | Findings |
|---|---|---|---|
| `skills/qa-task/SKILL.md` | 14 | 0 / 5 / 9 | `zero-blocks-executed` [medium] |
| `skills/qa-story/SKILL.md` | 13 | 0 / 6 / 7 | `zero-blocks-executed` [medium] |
| `shared/resources/qa-runnable-prose-detection.md` | 2 | **1** / 0 / 1 | none |

The rule document's own zsh-guard block runs again — it did not in the first draft of the fixes, because
`WRITE_REDIRECT` matched `2>&1`. With bindings supplied, `qa-task/SKILL.md` executes 3 blocks under both
shells with **no findings**.

The `zero-blocks-executed` findings remain `medium` and correctly do not gate.

### 5. Full suite

**2060 tests, 2059 pass, 0 fail, 1 skipped.** The module's own suite grew 41 → 61.

---

## What the fix cycle got right, beyond closing the findings

Three things are worth recording, because they are the difference between a patched symptom and a
closed hole.

**1. It added a second line rather than only more of the first.** The original nine mutation proofs all
held, and none touched the paths where the holes were — a mutation proof can only falsify a check that
exists. Adding a fourteenth classification rule would have had the same blind spot. Instead each block
now runs in `work/` inside a private temp root, and the runner compares that root before and after,
reporting any write outside the copy **without consulting the classifier**. That catches the next miss,
which is the only thing that can be said about a defect not yet found.

**2. It reported two defects it introduced.** The sentinel first derived its own boundary as `cwd/..`,
which for a bare temp directory meant walking all of `/tmp` twice per block — it hung the suite past
118s before being killed. And the first redirect pattern matched `2>&1`, making the repository's own
documented zsh guard unrunnable. Both were found by the adversarial pass over the fixes and are written
up rather than quietly repaired.

**3. It corrected a QA finding that was wrong.** Finding L3 claimed an invalid `--timeout` silently
disables hang protection. Measured, `spawnSync` **throws `ERR_OUT_OF_RANGE`** on NaN and on a negative
value — both already failed loudly. The real hole is `--timeout 0`, which is accepted and means *no
timeout*. This surfaced because the mutation proof came back **UNHELD**, and the test was retargeted at
the case where removing the check changes behaviour.

QA accepts the correction. **The finding as written was wrong and the correction is right**; a fix that
had matched the finding's words would have added a check that changed nothing while leaving the actual
hole open.

A second UNHELD proof was handled the same way: disabling `COMMAND_RUNNERS` broke nothing, because
those commands were already absent from the allow-list. Rather than deleting the set, a precedence test
now asserts no runner may also be allow-listed — so the set defends against a plausible future edit
(someone re-adding `env`) instead of being dead code.

---

## Success Criteria — re-verified

### Safety

| Criterion | cycle 1 | cycle 2 |
|---|---|---|
| No block on the mutation deny-list ever executes | ❌ FAIL | ✅ **PASS** |
| Classification fails **closed** on anything unrecognised | ❌ FAIL | ✅ **PASS** |
| Execution happens in a temp working copy, never the live tree | ❌ FAIL | ✅ **PASS** — plus a sentinel that checks it independently |
| A host without zsh runs bash only, no false finding | ✅ PASS | ✅ PASS |

### Functional, Regression, Repository integration

All PASS, unchanged from cycle 1 except "Mutating and placeholder blocks skipped with a recorded
reason", which moves ❌ → ✅.

---

## NFR Assessment

**Security — PASS.** The boundary holds against all fourteen inputs, containment is re-proved, and a
classifier-independent sentinel backs it. Snippets no longer inherit the parent environment.

**Performance — PASS.** Suite ~7.5s. Worth noting the mid-cycle regression (the `/tmp`-walking sentinel)
was caught and fixed inside the same cycle rather than shipped.

**Reliability — PASS.** Temp root removed on both paths and verified by counting. The attributed-fence
desync — the defect that let the gate report a clean run on an unread document — is closed.

**Maintainability — PASS.** Comments name the failure each rule prevents. The rule document states the
accepted coverage cost of refusing `awk` rather than leaving it as an unexplained omission.

---

## Issues Found This Cycle

**None.** No new findings; no regressions.

---

## Final Assessment

**Gate Status**: **PASS**
**Quality Score**: 90/100
**Deployment Recommendation**: APPROVED

**Rationale**: Every blocking finding is closed and independently re-verified. The fix cycle went
beyond the findings to add a defence that does not depend on the classifier being right, reported the
two defects it introduced, and corrected a QA finding that was factually wrong. Six deferred LOW/MEDIUM
items are documented with rationale and none affects safety.

Ten points withheld for the deferred items — chiefly that eight tests, including the task-66 regression
fixture, still skip silently on a host without zsh (L5). That is a real coverage hole on `ubuntu-latest`
and should be closed by making zsh a declared CI prerequisite; it does not block this task.

**Next Steps**: `/finalise`.
