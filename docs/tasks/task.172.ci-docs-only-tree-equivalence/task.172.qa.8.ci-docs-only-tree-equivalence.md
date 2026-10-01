# QA Report: Task 172 - One docs-only CI rule at every pipeline CI wait

**Task**: [Link to task document](./task.172.ci-docs-only-tree-equivalence.md)
**Gate File**: [task.172.gate.8.ci-docs-only-tree-equivalence.yml](./task.172.gate.8.ci-docs-only-tree-equivalence.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-01
**Testing Completed**: 2026-10-01
**Gate Status**: PASS

---

## Executive Summary

This gate reads the fix commit (`1cde0528`) made after `/finalise` run 1 stopped on five gaps. The four security findings are fixed and each fix is mutation-proven here. No HIGH and no MEDIUM finding. One reproduced LOW, a residual of the fix itself: a check detached into its own session no longer receives an interrupt sent to the engine's process group.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| DoD finding (finalise run 1) | Status | Evidence |
| --- | --- | --- |
| `checkCommand` timeout kills only `sh -c` (MEDIUM) | FIXED | the check leads its own process group and the group is killed; `SEC-1` runs a check that starts a child and asserts the child is dead; removing the group kill turns it red (re-run here) |
| Glob matcher exponential on repeated wildcards (MEDIUM) | FIXED | a token walk, not a RegExp: `*a` x 40 answers in 1 ms; `SEC-2` holds three shapes under a second and 20,000 differential cases against a reference RegExp; the reviewer ran 400,000 against the old matcher with 0 differences. The old RegExp put back turned `SEC-2` red in the fix cycle (about 5 minutes of the old matching) and was not repeated here |
| `checkCommand` runs over a dirty working tree (LOW) | FIXED | uncommitted non-documentation paths make the finding `unverifiable`; documentation is allowed so `/finalise` reading 1 can run; `SEC-3`; disabling the check turns it red (re-run here) |
| `isDocsPath` accepts `docs/../src/a.js` (LOW) | FIXED | a path with a `.`, `..` or empty segment is never docs; `SEC-4`; removing the rule turns it red (re-run here) |

---

## Testing Scope

### Prerequisites Verified

- [x] Task document, phases 4/4, PR 543 open at the cycle 7 head plus the fix commit
- [x] 97 engine tests pass; `npm run ci:fast` on the fix commit: 4,910 of 4,911 pass, 0 fail (one skip). It had one earlier red, the load-sensitive marker test, which the fix cycle repaired before committing
- [x] `npm run bundle:check`: 129 skills, 0 problems

### Review Methodology

Re-review scope: default, files changed since gate 7's head (`2991a820`, an ancestor of HEAD); no refute pass (cycle 8); no safety re-probe (gate 7: security PASS, `reasoned`, no HIGH open). The scoped patch was the fix commit's 571-line delta on the engine, `glob-match.js`, the test file, `configuration.md`, `CHANGELOG.md` and `traps.md`. One independent read-only Explore reviewer (about 3 minutes, 20 tool calls): it ran a 400k differential against the old matcher, worst-case matcher timings, real `git status -z` output, and a real group kill, and returned two LOW findings. QA reproduced CR8-1 with a real `spawnSync` (detached: a foreground `sleep` survived a group SIGINT; same-group: it died) and confirmed the reviewer's CR-2 by mutation (ignoring the rename source path, and treating an unreadable `git status` as clean, each left all four tests green). Step 4b: not applicable, no `SKILL.md` or shared prompt changed.

Re-review scope: files changed since gate 7 (head 2991a820; 14 files) — default

---

## New Findings This Cycle

- **[low]** `detached: true` puts the check in its own session, so an interrupt sent to the engine's group no longer reaches it (CR8-1), reproduced. A JS signal handler cannot run during `spawnSync`, so the fix is an async spawn or documentation; the engine's own timeout fires first in normal use.
- **[low, cleanup]** `SEC-3` never exercises the rename/copy source-path parse or the unreadable-`git status` branch (reviewer CR-2), confirmed by mutation; in `recommendations.future`.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: glob-match | PASS | rewritten as a token walk; same answers as the RegExp |
| Phase 2: the engine | PASS | process group, dirty-code refusal, dot segments |
| Phase 3: call sites | PASS | unchanged; the 6c poll re-asks `unverifiable` |
| Phase 4: config and docs | PASS | `configuration.md` and `CHANGELOG.md` describe the three behaviours |

---

## Issues Found

### LOW Severity Issues (1)

- **CR8-1**: the interrupt-path residual of the detached check. LOW, so no separate bug file.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1

---

## NFR Assessment

### Performance — PASS
The matcher is tokens times path length; worst case under the size caps is 20 to 30 ms.
### Reliability — PASS
Uncommitted code and an unreadable `git status` both fail closed; the 6c poll re-asks `unverifiable`.
### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- The DoD gate's four findings are closed and each is mutation-proven. No corpus sink models these predicates; the DoD gate probed `isDocsPath` with agent-authored cases (37 executed).

### Maintainability — PASS
A small walk replaced a RegExp plus its guards; the dirty-tree rule's trade (documentation allowed) is stated in `configuration.md`.

---

## Code Review

**Correctness bugs (1):** CR8-1 (reviewer CR-1, low, reproduced) in the gate. **Cleanups (1):** the missing rename and unreadable-status tests (reviewer CR-2).

Provenance: CR8-1 is in code the fix commit added; before the commit the check stayed in the engine's group and died with it.
Boundary rule: `isDocsPath`, `globMatch` and `dirtyNonDocsPaths` are validators of changed-file names and patterns; the DoD security gate probed `isDocsPath` and `matchesAnyGlob` with the engine's `--cases-file` form (37 executed, record `task.172.dod.security.run.json`). `boundary: true`; this cycle ran no new corpus probe, `probes_executed: 0`, and says so rather than reusing that count.
mutation-proven: remove the group kill → SEC-1 → covered
mutation-proven: disable the dirty-code refusal → SEC-3 → covered
mutation-proven: remove the dot-segment rule → SEC-4 → covered
mutation-proven: ignore the rename/copy source path in the `git status -z` parse → no test red → no-red-untested
mutation-proven: treat an unreadable `git status` as clean → no test red → no-red-untested
The last two are the reviewer's CR-2, confirmed. The matcher's proof (the old RegExp back → `SEC-2` red) was run in the fix cycle against the same code and is not repeated here. All mutants were applied from a `cp` snapshot that was restored and compared byte for byte afterwards.

---

## Regression Testing

- 97 engine tests pass; fast gate 4,910 of 4,911.
- Bundle freshness: 129 skills, 0 problems.
- Hosted CI on the fix commit is read once, at `/finalise`.

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. CR8-1: document the interrupt-path residual, or move the check to an async spawn with handlers.
2. Add the rename and unreadable-status cases to `SEC-3`.
3. The items carried from gate 7 and the PR review (`recommendations.future`).

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: no HIGH or MEDIUM open; one reproduced LOW residual; the four DoD security findings are fixed and mutation-proven.
**Quality Score**: 95/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.172.qa.8.ci-docs-only-tree-equivalence.md`
**Gate File**: co-located at `task.172.gate.8.ci-docs-only-tree-equivalence.yml`
**Next Steps**: route 2b (cosmetic residue) carries CR8-1 and hands to the PR conformance review (5c)
