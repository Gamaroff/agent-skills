# QA Report: Task 125 - develop-bug's only DoD path is documented as a fallback, and its issue create fails whole on a label case mismatch while swallowing the line that says so — and its verify loop calls /qa-fix with no gate to derive a cycle from

**Task**: [Link to task document](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Gate File**: [task.125.gate.1.develop-bug-finalise-mode-and-issue-create.yml](./task.125.gate.1.develop-bug-finalise-mode-and-issue-create.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-21
**Testing Completed**: 2026-09-21
**Gate Status**: FAIL

---

## Executive Summary

All three phases are delivered and the suite is green (3654 pass / 0 fail; four new test files; nine mutations proved in the development record). The review found the task's own central claim unmet on the path that motivated it: `tracker-issue.js` now pipes gh's stderr in `gh()`, but every `--body-file` create — which is how `ensure-bug-github-issue` creates — goes through `withStdin()`, which still ignores stderr (reproduced end-to-end). Six MEDIUM defects follow the same theme of a rule stated and not held everywhere: the label read at gh's default 30-label page, the normalisation applied at one of three sites, a registry-tick promise the engine contradicts for header-block task bugs, an undefined `DOC_KIND` for a general bug without the flag (executed), a newline value that passes `grep -F` (probed), and an unvalidated `fix_cycle`.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (3/3 ticked)
- [x] Tests passing (`npm run ci:fast` 3654/3654, prettier clean)
- [x] Breaking changes documented (None — with the "without `--bug` unchanged" promise, tested below)
- [x] Code on feature branch with open PR (#447, OPEN, head `b252c19c`)

### Testing Approach

- [x] Automated Testing (unit — the four suites this task adds/extends, plus the full fast gate)
- [x] Regression Testing (full `npm run ci:fast`; `npm run bundle:check`)
- [x] Security Review (boundary probe by hand, minimal env, bash + zsh — 32 executions)
- [x] Code Review (Step 3b: read-only Explore reviewer over the 13-file / 1646-line non-bundled diff; 8 findings, each verified against the code before it entered this report)
- [x] Manual Testing (Step 4b: the documented bash blocks executed under bash and zsh)
- [ ] Performance Testing (not applicable — one extra `gh label list` per create, verified by reading)

### Review Methodology

Standard mode (risk low, 3 phases, multi-module). Direct tools for phases, criteria, NFRs and Step 4b; one read-only Explore subagent for the diff code review (first review → whole-branch diff, excluding the 20 bundled `references/tracker-issue.js` copies and the task's own documents). Traceability matrix supplied by the orchestrator (`.summaries/qa-traceability-matrix.md`, 8 SCs). `code_review_blocking=true` (pipeline override; no per-doc opt-out) — every `category: bug` + `confidence: high` finding entered the gate.

Step 4b: runnable prose **applies** — the diff changes `skills/finalise/SKILL.md`, `skills/ensure-bug-github-issue/SKILL.md`, `skills/qa-fix/SKILL.md` and two `develop-bug` step documents. `qa-execute-snippets.mjs` over each (bash + zsh available):

| File | Blocks | Runnable | Placeholder | Mutating (refused) | Result |
|---|---|---|---|---|---|
| finalise/SKILL.md | 33 | 2 (with `--bind DOC_FILE`, `IMPLEMENTATION_REPORT`) | 2 (line 49 — template slot, the new kind block; line 1233 — template slot) | 29 | 2 ran, both shells agree, exit 0 |
| ensure-bug-github-issue/SKILL.md | 6 | 0 | 0 | 6 (`node`, `gh`, `awk` fail-closed) | `no-executable-blocks` — information, not a finding |
| qa-fix/SKILL.md | 8 | 2 (with `--bind TRACKER, STORY_FILE, PR_*`, `--copy`) | 0 | 6 | line 282 exit 0 both shells; line 937 exit 1 both shells — **pre-existing**, not this diff (block ends on `[ … = null ] && …`), identical in both shells, routed to `recommendations.future` |
| develop-bug-step-5-6-verify-loop.md | 6 | 0 | 0 | 6 | `no-executable-blocks` |
| develop-bug-step-7-close-bug.md | 1 | 0 | 0 | 1 | `no-executable-blocks` |

The new blocks the engine refused (`node …` calls in B5 and both FIX_CYCLE blocks) are exercised by the task's own tests, which execute them under bash with fake `gh`/`node` (`tests/ensure-bug-label-tolerance.test.js`, `tests/qa-cycle.test.js [fix_cycle]`). The template-slot kind block (line 49) was materialised by hand and executed under **both shells** with six inputs — which is where BUG-5 was found.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: `finalise --bug` | CONCERNS | Verified | Skip table + 16 markers + bidirectional test in place; template and fix-evidence prompt present; Step 7 fallback gone. BUG-5 (empty `DOC_KIND` on a general bug without the flag), BUG-4 (`registry-tick` promise vs engine on header-block task bugs), CR-6 (marker names fields `bug-doc.js` does not return). |
| Phase 2: tolerant issue create + legible failure | FAIL | Verified | Label loop present and tested; stderr piped on `gh()` — **but not on `withStdin()`, the `--body-file` path the create uses (BUG-1)**. BUG-2 (default limit 30), BUG-3 (one of three sites), BUG-6 (newline passes `grep -F`). |
| Phase 3: `fix_cycle` for the bug verify loop | CONCERNS | Verified | Both blocks take the arg, helper fallback kept, verify loop passes `fix_cycle={N}`, four execution tests green. BUG-7 (no positive-integer guard inside the blocks). |

**Overall Phase Completion**: 3/3 delivered; 1 FAIL, 2 CONCERNS

---

## Success Criteria Verification

**Functional Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| SC1 `/finalise --bug` produces the DoD file, CI readings, PR comment; writes no Change Log row | mode + table | table has `change-log-row` **skip — forbidden**, `ci-reading-2`/`pr-comment` run; test grounds the exclusion in `document-change-log.md` | CONCERNS | No runtime execution of finalise on a bug file (the §8 scratch-clone integration test is unchecked); BUG-5 on the no-flag path |
| SC2 Step 7 has no fallback paragraph | none | `Skill(finalise, args="--bug …")`; fallback paragraph and checklist line gone; test asserts absence | PASS | |
| SC3 A label absent from the repo never fails an issue create; the warning names it | always | 5 executed cases green | CONCERNS | BUG-2 (page limit), BUG-6 (newline), BUG-3 (edit path unfixed) |
| SC4 Any `tracker-issue.js` failure message carries gh's own first line | every kind, every path | `plain` path only | **FAIL** | BUG-1 — `withStdin` (`--body-file`) still ignores stderr; reproduced end-to-end |
| SC5 develop-bug's verify loop posts `qa-fix-{N}` per cycle with no gate | yes | tracker block executed: empty dir + `fix_cycle=2` → `qa-fix-2`; verify loop passes `fix_cycle={N}` | CONCERNS | BUG-7 — an invalid arg aborts rather than refuses |

**Performance Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| SC6 One extra `gh label list` per bug create | 1 | 1 (single call before the loop) | PASS | Count verified by reading; the fake-gh test does not assert it |

**Code Quality Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| SC7 Skip list stated once; remove a skip → the mode test goes red | yes | one table; bidirectional test; mutations recorded in the implementation report (row removed → 3 red; marker removed → 1 red) | PASS | |
| Lint / formatting | clean | prettier clean; `bundle:check` 0 problems | PASS | |

**Migration:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| SC8 Observations #65, #69, #122 close naming the PR; bug.13/14 DoDs untouched | after merge | bug.13/14 DoD files not in the diff | PENDING | Closes on merge; not a QA gate item |

---

## Breaking Changes Validation

### Breaking Change: None declared — "`/finalise <bug-file>` without `--bug` continues to do what it does today (and should print a hint naming the mode)"
Documented: Yes
Migration Path Provided: N/A
Migration Tested: **Yes — executed** (kind block, 6 inputs × bash + zsh)
Consumer Code Updated: N/A
Notes: Story bugs and task bugs keep their kind and print the hint; a **general** bug resolves `DOC_KIND=""` (BUG-5), so the promise does not hold for that shape.

**Overall Breaking Changes Assessment:** CONCERNS

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: `withStdin` still ignores stderr — the `--body-file` create path is unchanged**
- **Severity**: HIGH
- **Category**: Functional
- **Bug Report**: [task.125.bug.1.tracker-issue-body-file-path-still-drops-stderr.md](./task.125.bug.1.tracker-issue-body-file-path-still-drops-stderr.md)
- **Observation**: `GH_EXEC_STDIO` is applied in `gh()` only; `perform()` uses `withStdin()` (`stdio: ["pipe","pipe","ignore"]`) whenever `--body-file` is passed. End-to-end with a fake gh on PATH: `--body-file` → `create a GitHub issue failed: Command failed: gh issue create …` (no line); without → the line is present. The §9 tests omit `--body-file`.
- **Impact**: SC4 unmet on the call site obs #65 describes.
- **Recommendation**: pipe stderr in `withStdin`; add `--body-file` cases in-process and end-to-end.
- **Priority**: P1

### MEDIUM Severity Issues (6)

- **BUG-2** [task.125.bug.2](./task.125.bug.2.gh-label-list-default-limit-30-strips-real-labels.md) — `gh label list` at default `--limit 30` (confirmed via `gh label list --help`) strips real labels past the first page. P2.
- **BUG-3** [task.125.bug.3](./task.125.bug.3.label-normalisation-fixed-at-one-of-three-sites.md) — normalisation applied at one of the nine `--label`/`--add-label` sites; `sync-github-bug` edit still passes `severity:${SEVERITY}` verbatim; no population guard. P2.
- **BUG-4** [task.125.bug.4](./task.125.bug.4.registry-tick-task-bug-stem-is-not-not-a-task.md) — `registry-tick.js` matches `task.67.bug.3.*` as task 67 when the bug has no `type:` (header-block shape); answers `not-accepted`, not the promised `not-a-task`. P2.
- **BUG-5** [task.125.bug.5](./task.125.bug.5.general-bug-without-bug-flag-resolves-empty-doc-kind.md) — executed: general bug without `--bug` → `DOC_KIND=""`, hint reads "continuing in  mode". P2.
- **BUG-6** [task.125.bug.6](./task.125.bug.6.label-filter-multiline-value-passes-grep-f.md) — probed: `priority:high<LF>foo` passes `grep -qxF` (multi-line pattern) and reaches `--label`. P2.
- **BUG-7** [task.125.bug.7](./task.125.bug.7.fix-cycle-arg-taken-on-trust-no-positive-integer-check.md) — `$FIX_CYCLE_ARG` unchecked in both blocks; `{N}`/`0` aborts the PR-comment block instead of refusing. P2.

### LOW Severity Issues (3)

- **CR-6** (in gate, low) — the `read-document` marker names `pr_number`/`status`/`severity`/`priority` at top level; `bug-doc.js` returns `fields.{status,severity,priority}` and no `pr_number` (Step 3a's grep is the real source). Correct the marker.
- **CR-7** (advisory) — `[ -z "$REPO_LABELS" ]` is reached by "the read failed" and "the repo has zero labels" and reports one value; key the pass-through on the exit code.
- **Plain-path double print** (advisory, found while reproducing BUG-1) — on the `gh()` path `execFileSync`'s `e.message` already ends with the stderr text, so the new message prints the line twice (`…: could not add label: x (Command failed: … \n could not add label: x)`); trim `e.message` to its first line.

**Total Issues**: HIGH: 1, MEDIUM: 6, LOW: 3

---

## NFR Assessment

### Performance — PASS
One `gh label list` per create (SC6); stderr piping costs nothing on success; no loop-heavy change.

### Reliability — CONCERNS
BUG-1 leaves the motivating failure path unchanged; BUG-2/BUG-6 reintroduce the whole-create failure on larger repositories or malformed values; BUG-7 converts a skipped comment into an aborted block. The refusal semantics of `qa-cycle.sh` are preserved (tested).

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 32
- Boundary decision: **true** — two new predicates. Neither is reachable by the engine's one-argument `shell:` form (the label filter reads an env value plus `gh` output; the kind block reads argv plus a flag), so both were probed **by hand** per probe-boundary-rule §5.1: `env -i PATH=<shims>:/usr/bin:/bin HOME=<throwaway>`, fake `gh` and `node` on PATH, under bash **and** zsh, `HOME` diffed afterwards (only the shim's `argv.log`).
  - Label filter — 10 shapes × 2 shells = 20: `High`/`Major` (legit → lowercased, passed), `high<LF>foo` (**accepted — BUG-6**), `*`/`?` (refused, warned), `-e`/`-n` (refused — `grep -qxF "$l"` never sees a bare dash), `high `/` major` (refused), `$(touch …)`/backticks (inert — never evaluated; no file written), `priority:high` prefix-doubling (refused), empty (no label, no warning), `../../etc/passwd` (refused), `high'; echo INJ; '` (refused, not executed).
  - Kind block — 6 inputs × 2 shells = 12: general bug no flag → `DOC_KIND=""` (**BUG-5**); general bug + `--bug`, task, story bug (hint + `story`), task bug + `--bug`, story — all as intended.
- No injection surface: the bash blocks never interpolate the values into a command string; `tracker-issue.js` passes labels as argv.

### Maintainability — CONCERNS
The skip table with a bidirectional test is the right shape and is mutation-proved. BUG-3 leaves the label rule at one site with no population guard; BUG-4 and CR-6 are marker promises the engines do not keep; CR-8 (constant declared after its reader) is a readability nit.

---

## Code Review

Step 3b, read-only Explore reviewer, whole-branch diff (13 files / 1646 lines, bundled copies and task documents excluded), 335 s. `code_review_blocking=true` → high-confidence bugs promoted to the gate. Each finding below was **verified by QA** before entering the report (CR-1 reproduced end-to-end; CR-2 confirmed against `gh label list --help`; CR-3 confirmed by grep; CR-4 confirmed by reading `registry-tick.js:236–262`; CR-6 confirmed against `bug-doc.js:536–561`).

**Correctness bugs (7):**
- [high/high] `shared/resources/tracker-issue.js:849` — `withStdin` still ignores stderr on every `--body-file` create/edit → pipe it and cover `--body-file` in §9. **Promoted: TASK-125-BUG-1.**
- [medium/high] `skills/ensure-bug-github-issue/SKILL.md:150` — `gh label list` at default limit 30 → `-L 1000` + test. **Promoted: TASK-125-BUG-2.**
- [medium/high] `skills/sync-github-bug/SKILL.md:130` — enumeration risk: the rule fixed at one of nine label sites → shared helper + population guard. **Promoted: TASK-125-BUG-3.**
- [medium/high] `shared/resources/registry-tick.js:237` — task-bug stem read as the task; marker promise contradicted → `.bug.<N>.` stem is `not-a-task`. **Promoted: TASK-125-BUG-4.**
- [medium/medium] `skills/qa-fix/SKILL.md:862` — `$FIX_CYCLE_ARG` taken on trust → guard in both blocks. Reviewer confidence medium; **QA verified and owns it as TASK-125-BUG-7.**
- [low/high] `skills/finalise/SKILL.md:213` — `read-document` marker names fields `bug-doc.js` does not return → correct the marker. **Promoted: CR-6 (low).**
- [low/medium] `skills/ensure-bug-github-issue/SKILL.md:156` — `-z "$REPO_LABELS"` reached by two states → key on exit code. Advisory (CR-7).

**Cleanups (1):**
- `shared/resources/tracker-issue.js:318` — `GH_EXEC_STDIO` declared after the function that reads it; move beside `GIT_EXEC_OPTS`. Advisory (CR-8).

**QA-originated findings (execution, Step 4b / boundary probe):** TASK-125-BUG-5 (kind block executed), TASK-125-BUG-6 (label filter probed).

**Mutation-proof spot check (Step 3c):** the nine mutations recorded in the implementation report were **re-run for the two fixes this gate rests on**, not inherited:
- mutation-proven: revert `GH_EXEC_STDIO` to `["ignore","pipe","ignore"]` → `§9 END-TO-END … puts its line in the warning` → **covered** (and it is exactly the assertion BUG-1 shows is scoped to the wrong path).
- mutation-proven: drop the `tr '[:upper:]' '[:lower:]'` in B5 → 4 of 5 label-tolerance tests → **covered**.
- mutation-proven: remove the `change-log-row` table row → 3 finalise-bug-mode tests → **covered**.
- Not re-run this cycle (recorded `dev-only` until 5b re-proves them beside the fixes): helper-first order, arg dropped, existence check dropped, marker flipped, template Change Log added, stderr line dropped.

**Provenance (5b):** every promoted finding is introduced by this diff (the label loop, the stderr pipe, the kind block, the marker text and the arg handling did not exist on `origin/develop`); BUG-4's engine behaviour is pre-existing but the *promise* it contradicts is new, so it is attributed to the diff. The qa-fix line-937 `exit 1` is pre-existing and routed to `future`.

**Working tree after this step:** `git status --porcelain` shows only the QA artefacts written by Steps 9–12 — no fix was applied (5c).

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full fast gate (`npm run ci:fast`, 3654 tests, prettier) | PASS |
| `npm run bundle:check` (128 skills) | PASS |
| `tests/qa-cycle.test.js` existing guards (every-block derivation, no inline derivation, helper bundled) | PASS — the `fix_cycle` change keeps the helper call in each block |
| `evals/shared/tests/finalise-dod-prompt-contract.test.mjs`, `finalise-publish-boundary.test.mjs`, `bundled-parity.test.mjs` | PASS |
| `shared/resources/tests/tracker-issue.test.mjs` §1–§8 (access gate, deferral, argv shape) | PASS — the stdio change does not reach the deferred path |

---

## Test Artifacts

### Files Reviewed
`shared/resources/tracker-issue.js`, `shared/resources/tests/tracker-issue.test.mjs`, `skills/ensure-bug-github-issue/SKILL.md`, `tests/ensure-bug-label-tolerance.test.js`, `skills/finalise/SKILL.md`, `skills/finalise/assets/bug-dod-template.md`, `shared/resources/finalise-dod-fix-evidence-prompt.md`, `evals/shared/tests/finalise-bug-mode.test.mjs`, `skills/qa-fix/SKILL.md`, `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`, `skills/develop-bug/references/develop-bug-step-7-close-bug.md`, `skills/develop-bug/SKILL.md`, `tests/qa-cycle.test.js`, `docs/runbooks/bug-fix.md`, `docs/runbooks/hotfix.md`; for verification: `shared/resources/registry-tick.js`, `shared/resources/bug-doc.js`, `skills/sync-github-bug/SKILL.md`.

### Test Commands Executed
```bash
npm run ci:fast                                   # 3654 pass / 0 fail / 1 skipped; prettier clean
npm run bundle:check                              # 128 skills, 0 problems
node --test evals/shared/tests/finalise-bug-mode.test.mjs shared/resources/tests/tracker-issue.test.mjs tests/ensure-bug-label-tolerance.test.js tests/qa-cycle.test.js   # 92 pass
node references/qa-execute-snippets.mjs --file skills/{finalise,ensure-bug-github-issue,qa-fix}/SKILL.md --json   # + --bind / --copy re-runs
bash / zsh kind-block.sh <6 inputs>               # BUG-5
env -i … bash|zsh label-block.sh <10 shapes>      # BUG-6; 20 executions
PATH=<fake gh> node tracker-issue.js --kind create … --body-file body.md   # BUG-1 end-to-end
gh label list --help | grep -- --limit            # BUG-2
```

### Coverage Report
Not measured (the repository does not collect coverage; the suite is `node --test`).

---

## Recommendations

### Immediate Actions (Blocking)
1. BUG-1 — pipe stderr in `withStdin`; add `--body-file` §9 cases (in-process + end-to-end). P1.
2. BUG-2, BUG-6, BUG-3 — `gh label list -L 1000`; single-line guard before the existence check; shared helper across the nine label sites with a population guard test. P2.
3. BUG-4, BUG-5, BUG-7 — `registry-tick.js` `.bug.<N>.` stem → `not-a-task` (test); `DOC_KIND` default on no prefix match (execute the block in the test); positive-integer guard in both qa-fix blocks (tests for `{N}` and `0`). P2.
4. CR-6 — correct the `read-document` marker. P3.

### Short-term Actions (Non-Blocking)
1. CR-7 — key the label pass-through on the read's exit code.
2. CR-8 + the plain-path double print — declare `GH_EXEC_STDIO` beside `GIT_EXEC_OPTS`; trim `e.message` to its first line.
3. Pre-existing qa-fix line-937 block ends on `[ … ] && …` (exit 1 when set) — harmless outside `set -e`; tidy when next touched.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One HIGH (rule 1): the fix for SC4 does not reach the path that motivated it. Six MEDIUM would have made this CONCERNS on their own. The work is substantial and well-tested where it was tested; the defects are all of one shape — a rule applied to the case in front of the author and not to the population — which is the shape the task itself was filed against.
**Quality Score**: 20/100

**Deployment Recommendation**: BLOCKED
**Conditions**: BUG-1 fixed with a `--body-file` test; BUG-2..7 fixed with their named tests; mutations re-proved on the fix commit.

---

**QA Report**: co-located at `task.125.qa.1.develop-bug-finalise-mode-and-issue-create.md`
**Gate File**: co-located at `task.125.gate.1.develop-bug-finalise-mode-and-issue-create.yml`
**Next Steps**: `/qa-fix` cycle 1 on the seven bug reports + CR-6; re-review at cycle 2 as a full refute pass.
