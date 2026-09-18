# QA Report: Task 121 - QA tracker comments are keyed per stage, so every QA cycle after the first is silently dropped

**Task**: [Link to task document](./task.121.cycle-scoped-qa-tracker-comments.md)
**Gate File**: [task.121.gate.2.cycle-scoped-qa-tracker-comments.yml](./task.121.gate.2.cycle-scoped-qa-tracker-comments.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-18
**Testing Completed**: 2026-09-18
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle-2 re-review of PR #430 at head `b00c17ca`. All three cycle-1 findings are fixed as specified and each fix is covered by a committed test that goes red when the behaviour is reverted (re-proved against the committed state). The full-diff **refute pass** then found that the fixes' own premise is wrong in two ways with one root cause: the cycle is computed as a shell variable in one fenced block and consumed in another (unset where used, so the tracker call passes `qa-gate-` and posts nothing), and the `:-1` fallback that cycle 1 made reachable guesses cycle `1` on a number-less gate — the suppression this task exists to remove, wearing a suffix. Two further findings: qa-story still documents the un-numbered gate filename, and the new contract section contradicts itself. No HIGH. `npm run ci:fast` green at `b00c17ca` (3426 / 3425 pass); CI green on the PR head.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#430, OPEN, base develop)

### Testing Approach

- [x] Automated Testing (`npm run ci:fast` at b00c17ca; `bundle:check`; ShellCheck; PR CI)
- [x] Regression Testing
- [x] Security Review (reasoned — unchanged surface)
- [x] Code Review (Step 3b — **refute pass**, whole-branch diff, read-only Explore reviewer)
- [x] Mutation-proof spot check (Step 3c — cycle-1 proofs re-run against the committed state)
- [x] Documented-command execution (Step 4b — engine over the three skills; direct execution of the derivation)

### Review Methodology

Direct tools + one read-only refute reviewer. Cycle 2 → `PRIOR_GATES=1` → `REFUTE_PASS=true` (whole branch diff, refute directive appended). Prior gate's security axis read `PASS reasoned` → `SAFETY_REPROBE=false`. `code_review_blocking=true`; the reviewer rated CR-1 `bug`/`high`/`high` — QA **verified the mechanism and recorded it at MEDIUM** (no writer produces a number-less gate; the only instruction to is BUG-3), merged with CR-3 into one bug report because they share a root cause and a fix. Step 4b: engine again classified every changed block `mutating`/`placeholder` (zero executed, recorded); the derivation was executed directly — see Test Artifacts. Platform variance: the new test's fixtures come from `os.tmpdir()` and feed only `ls`/`sed` (no validating consumer); run once under `TMPDIR=/tmp` anyway — 10/10.

```
Re-review scope: unscoped — cycle 2 refute pass (full origin/develop...HEAD diff, 21 files)
```

---

## Re-Review Context

| Prior finding | Status | Evidence |
| --- | --- | --- |
| TASK-121-BUG-1 (medium) — `sed -E` echoes the path on a number-less gate | **FIXED** (as specified) → superseded by BUG-2 | `sed -nE … p` at qa-task :1276, qa-story :1866, qa-fix :821; `tests/qa-cycle-derivation.test.js` 10/10; restoring the non-printing form at qa-story → 2 tests red → `covered` |
| CR-4 (low) — parity regex misses the quoted form | **FIXED** | `--stage\s+("?)…` at :121; floors `seen ≥ 100`, `seenQuoted ≥ 4` (259 / 6 measured); reverting the regex → quoted floor red (0 found) → `covered` |
| CR-3 (low) — guard accepts a literal cycle | **FIXED** | `/-\d+$/` rejection at :304; literal `qa-gate-1` in qa-task → guard red naming `skills/qa-task/SKILL.md:1352` → `covered` |

---

## New Findings This Cycle

- **[medium]** `skills/qa-task/SKILL.md:1352` (also qa-story :1941, qa-fix :906) — `$QA_CYCLE` / `$FIX_CYCLE` is derived in one fenced block and read in another; each block is its own Bash call, so the tracker call sees it unset, passes `qa-gate-` / `qa-fix-`, both CLIs exit 2 and `|| echo` swallows it → derive where used (shared helper), same-block guard. **→ TASK-121-BUG-2**
- **[medium]** `tests/qa-cycle-derivation.test.js:121` — with `sed -n p` in place, `${VAR:-1}` keys a number-less newest gate to cycle 1 on every cycle (reproduced), and the test pins that as correct → refuse with a warning instead of guessing; retarget the test. **→ TASK-121-BUG-2** (reviewer CR-1, recorded at medium — see Methodology)
- **[medium]** `skills/qa-story/SKILL.md:2884` (+ tree examples ~:2903/:2909/:2922) — still instructs the un-numbered gate filename that no writer produces and the derivation cannot parse. **→ TASK-121-BUG-3**
- **[low]** `shared/resources/tracker-comment-contract.md:99` — the table cell says the suffix is "required" while the paragraph below says a bare stage is "not a usage error"; both new, contradictory. **→ CR-4**
- **[low]** `tests/qa-cycle-derivation.test.js:146` — runs under `bash` only; the Bash tool here is `/bin/zsh` (verified `ps`), where the unmatched glob prints to stderr before `ls` (result agrees) → run under both shells when zsh is available. **→ CR-5**

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: engine | PASS | Verified | Unchanged since cycle 1; both engine-list mutants still red. |
| Phase 2: call sites + orchestrator blocks | CONCERNS | Verified with findings | Suffixes present at all seven sites; BUG-1 fix in; **BUG-2** (cross-block variable; guessing fallback) and **BUG-3** (stale naming section) open. |
| Phase 3: contract + guard | CONCERNS | Verified with findings | Guards (bare, literal, parity-quoted) all covered; **CR-4** contract wording contradicts itself. |

**Overall Phase Completion**: 3/3 delivered; 2 with findings.

---

## Success Criteria Verification

**Functional** — unchanged from cycle 1 except: "Every QA cycle's gate and fix comment reaches the tracker with a distinct marker" is **PASS at unit level and now also PASS live** (#421 carries `qa-gate-1`, `qa-fix-1`; this report posts `qa-gate-2`), but **CONCERNS for the shipped prose** — executed block-by-block it would not post (BUG-2). The live proof in this run comes from the orchestrator running each skill's blocks in one shell.

**Performance** — PASS (unchanged). **Code Quality** — PASS: `ci:fast` green, floors present, three mutation proofs `covered` this cycle. **Migration** — PARTIAL: #75 closure still with `/finalise`.

---

## Breaking Changes Validation

Unchanged from cycle 1 — marker rename, at most one duplicate on an in-flight issue, tested. **PASS**.

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (2)

**Issue: The cycle is guessed as `1` on a number-less gate and does not survive the fenced-block boundary**
- **Severity**: MEDIUM
- **Category**: Functional / Reliability
- **Bug Report**: [task.121.bug.2.cycle-must-be-derived-where-used-and-never-guessed.md](./task.121.bug.2.cycle-must-be-derived-where-used-and-never-guessed.md)
- **Observation**: see New Findings (two mechanisms, one root cause).
- **Impact**: the per-cycle comment is lost on a literal block-by-block execution; a number-less gate reintroduces the cycle-1 suppression.
- **Recommendation**: shared `qa-cycle.sh` helper called in every block that uses the cycle; refuse (stderr warning, no post) on a number-less/absent gate; retarget the test; same-block guard.
- **Priority**: P2

**Issue: qa-story naming section documents the un-numbered gate filename**
- **Severity**: MEDIUM
- **Category**: Documentation (runtime consequence via BUG-2)
- **Bug Report**: [task.121.bug.3.qa-story-naming-section-documents-unnumbered-gate.md](./task.121.bug.3.qa-story-naming-section-documents-unnumbered-gate.md)
- **Recommendation**: numbered form in the section and the three tree examples.
- **Priority**: P2

### LOW Severity Issues (2)

- **CR-4** contract table/prose contradiction — reword the cell ("required by convention, enforced by `comment-slot-coverage.test.mjs`, not by the engine").
- **CR-5** derivation test runs under bash only — dual-shell when zsh is available.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 2

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — CONCERNS
BUG-2: the comment is lost (block boundary) or mis-keyed (number-less gate).

### Security — PASS
- **Status**: PASS · **Evidence**: reasoned · **Probes executed**: 0 — unchanged surface; the cycle string is validated against a fixed list by both CLIs.

### Maintainability — CONCERNS
CR-4 contradiction; BUG-3 two conventions in one file; CR-5 single-shell test.

---

## Code Review

Step 3b — **refute pass**, read-only Explore reviewer over the whole source-only branch diff (21 files, 1491/182). `code_review_blocking=true`. Reviewer returned 3 bugs + 2 cleanups; QA verified all five and entered them as above (CR-1 merged with CR-3 into BUG-2 at medium; CR-2 → BUG-3; CR-4, CR-5 low). `boundary: false`, `probes_executed: 0`.

**Correctness bugs (3):**
- [high/high as returned; **medium** as recorded] `tests/qa-cycle-derivation.test.js:121` — `:-1` after `sed -n p` guesses cycle 1 on a number-less gate, every cycle; the test pins it → refuse, retarget the test (**BUG-2**).
- [medium/high] `skills/qa-story/SKILL.md:2884` — un-numbered gate convention still documented (**BUG-3**).
- [low/medium as returned; **medium** as recorded, merged] `skills/qa-story/SKILL.md:1941` — cycle variable read in a different fenced block from the one that derives it; unset → `qa-gate-` → exit 2 → swallowed (**BUG-2**).

**Cleanups (2):**
- `shared/resources/tracker-comment-contract.md:99` — table vs prose contradiction (**CR-4**).
- `tests/qa-cycle-derivation.test.js:146` — bash-only execution; Bash tool is zsh (**CR-5**).

**Mutation proofs (Step 3c, committed state, `cp`-restore, tree verified unchanged):**
- mutation-proven: non-printing `sed` restored at qa-story :1866 → `a gate named without a number falls back to 1 …` + `the derivation is the same shape …` → covered
- mutation-proven: parity regex without `("?)` → `only 0 quoted --stage literals scanned` → covered
- mutation-proven: literal `--stage qa-gate-1` at qa-task :1352 → `never passed bare (SITES)` naming the site → covered

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm run ci:fast` at b00c17ca | PASS — 3426 tests, 3425 pass, 0 fail, 1 skipped |
| `npm run bundle:check` | PASS — 128 skills, 0 problems |
| ShellCheck (56 source `.sh`) | PASS |
| PR #430 CI at b00c17ca | PASS — Branch Policy, ShellCheck, Docs link check, Validate Skills, Test |
| `tests/qa-cycle-derivation.test.js` under `TMPDIR=/tmp` | PASS — 10/10 |

---

## Test Artifacts

### Files Reviewed
Cycle-1 set plus `tests/qa-cycle-derivation.test.js`, `evals/shared/tests/transition-protocol-parity.test.mjs` (regex + floors), `shared/resources/tests/comment-slot-coverage.test.mjs` (literal guard), `docs/tasks/task.121.*/task.121.bug.1.*`.

### Test Commands Executed
```bash
npm run ci:fast                                          # exit 0 — 3426 / 3425 pass / 1 skipped
npm run bundle:check                                     # 0 problems
gh pr checks 430                                         # 5/5 pass at b00c17ca
command node --test tests/qa-cycle-derivation.test.js    # 10 pass;  TMPDIR=/tmp … → 10 pass
command node references/qa-execute-snippets.mjs --file skills/{qa-task,qa-story,qa-fix}/SKILL.md --json   # zero-blocks-executed (all changed blocks mutating/placeholder)
# BUG-2 reproduction (number-less newest gate → cycle 1):
d=$(mktemp -d); touch "$d/task.9.gate.legacy.yml"; TASK_DIR=$d
QA_CYCLE=$(ls -t "$TASK_DIR"/task.*.gate.*.yml 2>/dev/null | head -1 | sed -nE 's/.*\.gate\.([0-9]+)\..*/\1/p'); echo "${QA_CYCLE:-1}"   # 1
# Block boundary: qa-task derivation at :1275 (block :1200-:1300) vs tracker call :1352 (block :1333-:1360)
```

### Coverage Report
Not instrumented; pass/fail counts above.

---

## Recommendations

### Immediate Actions (Blocking)
1. BUG-2 — shared `qa-cycle.sh` helper (or inline re-derivation) in every block that uses the cycle; refuse on a number-less/absent gate; retarget the test; add a same-block guard.
2. BUG-3 — numbered filename form in qa-story's naming section and tree examples.
3. CR-4 — contract wording; CR-5 — dual-shell derivation test.

### Short-term Actions (Non-Blocking)
1. Cycle-1 CR-2 (`ls -t` vs numeric max) — the helper is the natural place to switch to the numeric maximum.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: cycle-1 fixes verified and covered; the refute pass found the fixes' premise wrong (cycle must be derived where used and never guessed) plus a stale convention and a contract contradiction. No HIGH; HIGH count 0 → 0 across cycles.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: BUG-2 fixed with a same-block guard and a refusing fallback; BUG-3 fixed; CR-4/CR-5 addressed or explicitly waived.

---

**QA Report**: co-located at `task.121.qa.2.cycle-scoped-qa-tracker-comments.md`
**Gate File**: co-located at `task.121.gate.2.cycle-scoped-qa-tracker-comments.yml`
**Next Steps**: `/qa-fix` on the four open entries, then cycle-3 re-review (narrowed to files changed since this gate).
