# QA Report: Task 128 - A refusing shell script is a boundary the probe engine cannot reach, and finalise can only accept or halt

**Task**: [Link to task document](./task.128.shell-boundary-probe-and-finalise-recheck.md)
**Gate File**: [task.128.gate.1.shell-boundary-probe-and-finalise-recheck.yml](./task.128.gate.1.shell-boundary-probe-and-finalise-recheck.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-20
**Testing Completed**: 2026-09-20
**Gate Status**: FAIL

---

## Executive Summary

All three phases are delivered, the fast gate is green (3613/0) and the mutation proofs hold against the commit. Execution found what reading would not: the new fix-and-recheck evaluator **silently no-ops and exits 0** when invoked through the symlinked `.agents/skills/…` path its own prose documents — Step 8a reads that as "proceed" — and the shell entry form scores a **missing script as `absent` with 28 probes executed** rather than declining it. Two MEDIUMs (a NUL entry throws; the mutation-proved precondition is a hand-set boolean) and three LOW cleanups complete the list.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (3/3 `[x]`)
- [x] Tests passing (`npm run ci:fast` 3613/0 at develop; suites re-run at QA)
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#446, base `develop`, head `61bbf247`)

### Testing Approach

- [x] Manual Testing (engine runs, CLI runs through both invocation paths)
- [x] Automated Testing (`node --test` suites; platform-variance run under `TMPDIR=/tmp`)
- [x] Performance Testing (shell entry wall time)
- [x] Regression Testing (eval parity suites, bundle:check, shellcheck)
- [x] Security Review (probe engine, recorded: 39 executed)
- [x] Code Review (read-only Explore reviewer, Step 3b, full branch diff — bundled `references/` copies excluded)

### Review Methodology

Standard mode; direct tools plus one read-only Explore reviewer for Step 3b (25 files, 2944 diff lines; returned 3 bugs + 3 cleanups; ran 5m38s). Traceability mapper skipped (§9 is a checklist, not a table). Step 4b: `skills/finalise/SKILL.md` is the one changed file with a fenced bash block added; engine run with `--copy <task-dir> --bind DOC_FILE=… --bind IMPLEMENTATION_REPORT=…` → 30 blocks: **2 runnable executed under bash and zsh, no disagreement**; 27 `mutating` refused by design (write-redirection / `gh` / `git` — including this diff's new block at l.1992, `cat > .claude/state/finalise-fix-finding.json`); 1 `placeholder` (l.1117, template slot — not bindable). No `zero-blocks-executed` finding after binding. Step 4b on the four changed prompt files: no bash fences added — not applicable.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: filename sink + shell entry | CONCERNS | Verified (31 probe tests, 22 corpus tests) | Fixed `qa-cycle.sh` engages 28/28; pre-fix reproduces by stdout under both shells. **BUG-2**: a missing script is scored `absent`, not declined. **BUG-3**: NUL entry throws. |
| Phase 2: boundary rule + signals | PASS | Verified (9 signal tests; contract test 4 sites ≥ floor 3) | Header classifies; gate-5 note pinned negative; §5/§5.1/§5.2 read consistently. CR-6 double-match is cosmetic. |
| Phase 3: finalise fix-and-recheck | CONCERNS | Verified (18 tests) | Table pinned both ways; each precondition falsified. **BUG-1**: CLI no-ops through a symlink (fail-open). **BUG-4**: mutation-proved is a boolean. |

**Overall Phase Completion**: 3/3 delivered; 2 with defects.

---

## Success Criteria Verification

**Functional Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| `--entry shell:…qa-cycle.sh --sink filename` executes every case under bash and zsh and reproduces the newline case on the pre-fix script | yes | 28/28 executed; pre-fix `present-but-inert`, `filename.newline-in-name@{bash,zsh}` reproduced, detail `stdout "3\n" ≠ "12\n"` | PASS (real path) / FAIL (symlink path — engine no-ops, pre-existing) | see provenance note |
| `classifyBoundaryText` classifies `qa-cycle.sh` by its header; gate-5 note pinned negative | yes | `refuses rather than` matched; note → no signal | PASS | |
| `/finalise` proceeds only when all five hold, halts otherwise incl. no severity | yes | evaluator: all-true → 0; each false → 1 naming the id; no severity → 1 | PASS via real path; **FAIL via `.agents/skills` path** (BUG-1) | |

**Performance Criteria:**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Shell entry ≤ 2 s for `filename` in both shells | ≤ 2 s | 1.35 s | PASS |
| No change to the JS entry path | unchanged | url-authority fixture: engages, 12 executed, `shells: null` | PASS |

**Code Quality Criteria:**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| One engine, one record shape | yes | `toRecordEntry` unchanged; `--emit-block` renders the shell control (CR-5: default name leaks the `shell:` prefix when `--name` is omitted) | PASS (cleanup noted) |
| Each mechanism mutation-proved | yes | 12 at develop; 4 re-run at QA against the commit — all red (see Code Review) | PASS |
| Migration: obs #121 closes naming the PR | actioned | `parked` | PENDING — for `/finalise` (Step 7) |

---

## Breaking Changes Validation

None declared. `--entry path#export` unchanged (verified). A corpus case without `expected` is declined by the shell form rather than scored (verified: 14 declined, executed 0). **Overall: PASS**.

---

## Issues Found

### HIGH Severity Issues (2)

**Issue: fix-and-recheck evaluator silently no-ops through a symlinked path — exit 0 reads as "proceed"**
- **Severity**: HIGH · **Category**: Functional / Security (fail-open)
- **Bug Report**: [task.128.bug.1.…md](./task.128.bug.1.fix-and-recheck-evaluator-no-ops-through-symlinked-path.md)
- **Observation**: `node .agents/skills/finalise/references/finalise-fix-and-recheck.mjs --finding f.json` → no output, rc 0; same file via `skills/finalise/references/…` → `halt — 5 precondition(s) fail`, rc 1.
- **Impact**: Step 8a's licence to commit is exit 0; on the documented path it is granted having checked nothing.
- **Recommendation**: realpath compare (as `qa-execute-snippets.mjs:1858`); symlinked-invocation test. · **Priority**: P1

**Issue: a missing `shell:` script is scored `absent` with executed = cases × shells**
- **Severity**: HIGH · **Category**: Functional (ambiguous signal)
- **Bug Report**: [task.128.bug.2.…md](./task.128.bug.2.shell-entry-missing-script-scored-absent-not-declined.md)
- **Observation**: `--entry shell:shared/resources/does-not-exist.sh` → `absent`, `executed: 28`, every case `exit 127 ≠ 0`.
- **Impact**: "could not look" and "control absent" are one output, and the record carries a count of probes that opened nothing — the exact class this task exists to remove, in the mechanism it added.
- **Recommendation**: decline a non-readable regular file before the loop; treat 126/127 as `errored`. · **Priority**: P1

### MEDIUM Severity Issues (2)

**Issue: a NUL byte in a `shell:` entry throws out of `runProbeSpec`** — [bug.3](./task.128.bug.3.nul-in-shell-entry-throws-from-runprobespec.md). `resolveEntry` accepts it; `spawnSync` throws `ERR_INVALID_ARG_VALUE`; the JS form declines the same input. Contract says "returns a verdict, never throws". Fix: reject `\0` in `resolveEntry`. P2.

**Issue: `mutation-proved` is a hand-set boolean** — [bug.4](./task.128.bug.4.mutation-proved-precondition-is-a-self-reported-boolean.md). The statement requires "the run that showed it is recorded"; the check reads `redOnRevert === true`. Fix: require a `run` artefact and verify it. P2.

### LOW Severity Issues (3) — advisory, from the diff review

- **CR-4** `shared/resources/tests/probe-boundary-signals.test.mjs:149` — the JS-form matcher is fitted to the four current sites' export names; a fifth site with another export name falls outside the population. → match `--entry '<path>#<export>'` generically, keep the ≥3 floor.
- **CR-5** `shared/resources/security-probe.mjs:1125` — `--emit-block`'s default control name renders `filename:shell:shared/resources/qa-cycle.sh` for the shell form. → strip the prefix / use the basename for `kind: shell`.
- **CR-6** `shared/resources/probe-boundary-signals.mjs:61` — `/\brefuses\b/` subsumes the plural of the first regex, so "refuses rather than" pushes two `matched` entries. → de-duplicate per signal or drop the bare form.

**Total Issues**: HIGH: 2, MEDIUM: 2, LOW: 3

---

## NFR Assessment

### Performance — PASS
1.35 s for the shell entry over 14 cases × 2 shells (target ≤ 2 s); JS path unchanged.

### Reliability — CONCERNS
Two fail-wrong paths (BUG-1 fail-open on the documented invocation path; BUG-2 misreport with a full count) and one throw (BUG-3). Rollback plan validated: three independent phases, `git revert` + `npm run bundle`.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 39 — from `task.128.qa.1.security.run.json` `totals.executed` (engine-written)
- **Boundary**: true — `resolveEntry` containment for the new `shell:` form (exported predicate), the fix-and-recheck evaluator (a predicate whose `false` prevents an action), `classifyBoundaryText` (classifier).
- **Probe 1** — `path` corpus (11 cases) against `resolveEntry` through a `shell:`-prefixed cases file and a one-line predicate wrapper (`ok → result, refusal → false`; wrapper and cases under `.claude/state/`, gitignored, inside the repo root): `present-but-inert` — 8 hostile: 6 rejected (`../`, deep `../`, absolute, encoded traversal, prefix-not-boundary, empty), **2 accepted**: `symlink-escape` (an in-tree symlink pointing out — documented limit in `probe-boundary-rule.md` §5, identical on `origin/develop`; **pre-existing → future**, with the note that the shell form then *executes* the target) and `null-byte` (**BUG-3**, the throw is new to the shell form). 3 legitimate accepted.
- **Probe 2** — `filename` corpus (14 cases × 2 shells) against `shared/resources/qa-cycle.sh` via `shell:`: `engages`, 28/28, no escapes.
- **Provenance note (pre-existing, both measurements recorded)**: `security-probe.mjs` guards its CLI entry with `pathToFileURL(process.argv[1]).href === import.meta.url` (l.1043 on base, unchanged by this diff); invoked as `node .agents/skills/qa-task/references/security-probe.mjs …` it prints nothing and exits 0 (measured: rc 0, empty stdout, no record written); via `skills/qa-task/references/…` it runs. Same on base → not in `top_issues`; routed to `recommendations.future` as a general bug of the bug.4 class. Every QA/finalise prompt invokes the engine through a `references/` path, so a consumer whose `.agents/skills` is a symlink gets a silent no-op — the finalise prompt's zero-guard then reads the missing record as `unverifiable`, which is fail-closed there; BUG-1's evaluator is the fail-open sibling and is new.
- Sandbox escapes: 0 on both probes. `sandboxEnv()` + `LC_ALL=C`, argv form, stdin closed — verified in the diff and by the `eval-names.sh` fixture (a marker created *inside* the fixture is caught by `absent`, not reported as an escape).

### Maintainability — PASS
One definition each (corpus, signals, precondition table) with parity tests that import rather than restate; Step 4b executed 2 blocks under both shells cleanly.

---

## Code Review

Step 3b — read-only Explore reviewer over the full branch diff (bundled copies excluded); `code_review_blocking=true` (pipeline override, no per-doc opt-out) → `category: bug` + `confidence: high` findings promoted.

**Correctness bugs (3):**
- [high/high] `shared/resources/security-probe.mjs:746` — missing/unrunnable `shell:` script scored as `absent`, executed = cases × shells → decline before the loop; treat 126/127 as errored. **Promoted → TASK-128-BUG-2.**
- [medium/medium] `shared/resources/finalise-dod-security-prompt.md:235` — the self-assigned per-finding `severity` and the engine's `SEVERITY_BY_VERDICT` (present-but-inert = high) can disagree on the same reference case; the evaluator reads the self-reported one → state the rubric once. Advisory (medium confidence) → `recommendations.future`.
- [medium/medium] `shared/resources/finalise-fix-and-recheck.mjs:78` — `mutation-proved` reads a boolean, not a recorded run → require a `run` artefact. **Adopted by QA as TASK-128-BUG-4** after verifying the check body.

**Cleanups (3):** CR-4, CR-5, CR-6 — listed under LOW above.

**QA's own execution findings (not from the reviewer):** TASK-128-BUG-1 (evaluator symlink no-op, HIGH) and TASK-128-BUG-3 (NUL throw, MEDIUM) — both reproduced by running the CLIs/engine, above.

**Mutation proofs re-run at QA against the committed state** (cp snapshot / restore; `git status` unchanged before and after):
- mutation-proven: drop `LC_ALL: "C"` from the shell child env → `shell entry: the pre-fix qa-cycle.sh reproduces the newline case BY STDOUT` → covered
- mutation-proven: remove the `refuses…` phrases from `self-declared-refusal` → `qa-cycle.sh's header classifies as a boundary` + `gate-5 note carries no signal` → covered
- mutation-proven: `severity === undefined` reads as low → `fail closed: a finding with no severity is not low` → covered
- mutation-proven: low control renamed to sort after hostile names → `controls bracket every hostile name under LC_ALL=C` + the by-stdout reproduction test → covered
- Platform variance: `TMPDIR=/tmp node --test <5 suites>` → 105 pass / 0 fail (rc 0).

---

## Regression Testing

| Area | Result |
| --- | --- |
| `evals/shared/tests/{finalise-dod-prompt-contract,qa-gate-preconditions-parity,probes-executed-population}` + `tests/bundle-mjs`, `bundle-comment-origin`, `qa-cycle` | 86 pass / 0 fail |
| `npm run bundle:check` | 128 skills, 0 problems |
| `shellcheck --severity=warning` on the two new `.sh` | clean |
| JS entry form (url-authority fixture) | engages, 12 executed — unchanged |

---

## Test Artifacts

### Files Reviewed
`shared/resources/{security-probe,security-input-corpus,probe-boundary-signals,finalise-fix-and-recheck}.mjs`, `finalise-fix-and-recheck-preconditions.json`, `probe-boundary-rule.md`, `finalise-dod-security-prompt.md`, `security-review-prompt.md`, `security-input-corpus.md`, `skills/finalise/SKILL.md` (Step 6, Step 8a), `skills/finalise/references/definition-of-done-checklist.md`, `skills/{qa-task,qa-story}/SKILL.md` 3b, the four test suites, `tests/fixtures/qa-cycle.prefix.sh`, `shared/resources/tests/fixtures/security-probe/eval-names.sh`, `evals/shared/tests/probes-executed-population.test.mjs`, `skills/review-security/tests/review-security.test.js`.

### Test Commands Executed
```bash
node --test shared/resources/tests/{security-probe,security-input-corpus,probe-boundary-signals,finalise-fix-and-recheck}.test.mjs   # 80/0
TMPDIR=/tmp node --test <same 4> tests/qa-cycle.test.js                                                                                # 105/0
node skills/qa-task/references/security-probe.mjs --sink path --entry '.claude/state/t128-probe-wrapper.mjs#containsShellEntry' --cases-file .claude/state/t128-probe-cases.json --repo-root "$(git rev-parse --show-toplevel)" --record docs/tasks/task.128.shell-boundary-probe-and-finalise-recheck/task.128.qa.1.security.run.json --name resolveEntry-shell-form --call-site shared/resources/security-probe.mjs:201 --json
node skills/qa-task/references/security-probe.mjs --sink filename --entry 'shell:shared/resources/qa-cycle.sh' --repo-root "$(git rev-parse --show-toplevel)" --record <same record> --name qa-cycle-shell-form --call-site shared/resources/qa-cycle.sh:42 --json
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/finalise/SKILL.md --copy <task-dir> --bind DOC_FILE=… --bind IMPLEMENTATION_REPORT=… --json
node .agents/skills/finalise/references/finalise-fix-and-recheck.mjs --finding .claude/state/t128-f.json   # BUG-1: no output, rc 0
node shared/resources/security-probe.mjs --sink filename --entry shell:shared/resources/does-not-exist.sh --json   # BUG-2
```

### Coverage Report
Not measured (repository has no coverage tooling for `node --test`); suites: 3614 tests at the fast gate.

---

## Recommendations

### Immediate Actions (Blocking)
1. BUG-1 — realpath-compare the evaluator's CLI guard; add a symlinked-invocation test. (P1)
2. BUG-2 — decline a missing/unreadable `shell:` script and 126/127 launches before scoring. (P1)
3. BUG-3 — reject NUL in `resolveEntry` for both forms. (P2)
4. BUG-4 — `mutation-proved` reads a recorded run. (P2)

### Short-term Actions (Non-Blocking)
1. File the engine's own symlink no-op as a general bug (bug.4 class; pre-existing) and fix it with the same realpath compare.
2. CR-2 severity rubric reconciliation; CR-4/5/6 cleanups.
3. `/finalise`: set obs #121 `actioned` naming PR #446.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: Two HIGH defects in new code, both of the ambiguous-signal class the task set out to remove (a no-op exiting 0 as "proceed"; a missing script counted as 28 executed probes), plus two MEDIUMs. The mechanisms otherwise do what the task says and are mutation-proved.
**Quality Score**: 40/100

**Deployment Recommendation**: BLOCKED
**Conditions**: BUG-1..4 fixed and re-reviewed (cycle 2 is a full-diff refute pass).

---

**QA Report**: co-located at `task.128.qa.1.shell-boundary-probe-and-finalise-recheck.md`
**Gate File**: co-located at `task.128.gate.1.shell-boundary-probe-and-finalise-recheck.yml`
**Next Steps**: `/qa-fix` on the gate's `top_issues[]`, then re-review.
