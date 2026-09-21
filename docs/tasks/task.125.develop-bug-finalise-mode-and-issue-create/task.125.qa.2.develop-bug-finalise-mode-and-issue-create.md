# QA Report: Task 125 - develop-bug's only DoD path is documented as a fallback, and its issue create fails whole on a label case mismatch while swallowing the line that says so — and its verify loop calls /qa-fix with no gate to derive a cycle from

**Task**: [Link to task document](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Gate File**: [task.125.gate.2.develop-bug-finalise-mode-and-issue-create.yml](./task.125.gate.2.develop-bug-finalise-mode-and-issue-create.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-21
**Testing Completed**: 2026-09-21
**Gate Status**: FAIL

---

## Executive Summary

Cycle 2 is the full-branch **refute pass**. Every cycle-1 fix was re-executed against the committed head (`2e73f628`) and holds; the suite is 3685/3685; the label boundary held 20/20 including the cycle-1 newline case. The refute then found the one place bug mode had not reached: finalise's Step 7.7 derives the DoD path and the gate verdict with **directory-wide globs**, and for a story or task bug — which lives in its parent's directory — the parent's `task.67.dod.1` sorts after `task.67.bug.3.dod.1` and the parent's gate is the only gate, so the canonical PR comment publishes another work item's evidence as the bug's (HIGH). Three MEDIUM share the shape "a rule applied where the author looked and not next door": Step 2 reads the parent's QA artefacts; the sync edits' `--remove-label` reads a variable no block defines; the fixed `epic` label bypasses the new helper and its guard.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

**Re-review scope: unscoped — cycle 2 refute pass (full `origin/develop...HEAD` diff, 24 files / 2543 lines, bundled copies and task documents excluded).** `SAFETY_REPROBE=false` (gate 1 security axis read `OK measured`).

| Previous issue | Status | How verified this cycle |
| --- | --- | --- |
| TASK-125-BUG-1 `withStdin` ignored stderr | **FIXED** | End-to-end with a fake `gh` on PATH, `--body-file`: the warning now reads `… failed: could not add label: x not found (Command failed: gh issue create … --body-file - …)`, line printed once. §9b ×3 green. |
| TASK-125-BUG-2 `gh label list` default limit | **FIXED** | `tests/gh-labels.test.js` limit case (fake gh returns nothing without `-L`) green in bash + zsh. |
| TASK-125-BUG-3 rule at one of nine sites | **FIXED** | Helper sourced at 7 sites; population guard green at floor 7; bundled-copy check green. (Narrowed further by BUG-11 below.) |
| TASK-125-BUG-4 task-bug stem read as the task | **FIXED** | `registry-tick.js --file docs/tasks/task.67.x/task.67.bug.3.n.md` (header-block fixture) → `not-a-task`. |
| TASK-125-BUG-5 empty `DOC_KIND` | **FIXED** | Kind block executed: general bug without the flag → `DOC_KIND=task`, hint names the kind; executed test 7 inputs × 2 shells green. |
| TASK-125-BUG-6 newline passed `grep -F` | **FIXED** | Boundary probe case 2 in both shells → refused with `not a single line — skipped`; wired case green. |
| TASK-125-BUG-7 `fix_cycle` unvalidated | **FIXED** | 12 `[fix_cycle]` cases green (six invalid shapes × two dirs, plus `007`). Note CR-5 below: `00` still passes. |
| CR-6 marker fields | FIXED | Marker names `fields.*` and Step 3a as `PR_NUMBER`'s source. |
| CR-7 empty-vs-failed read | FIXED | Helper keys on the read's exit code; zero-label-repo case green. |
| CR-8 constant placement / double print | FIXED | Constants beside `GIT_EXEC_OPTS`; `ghFailureArgv`; end-to-end asserts the line appears once. |

## New Findings This Cycle

- **[high]** `skills/finalise/SKILL.md:1460` — 7.7's `DOD_PATH`/`FINAL_GATE` globs are directory-wide; a co-located bug publishes its parent's DoD and gate → key both on `${STEM}` in bug mode (**TASK-125-BUG-8**)
- **[medium]** `skills/finalise/SKILL.md:230` — Step 2 globs read the parent's QA report/gate as the bug's → scope to `${STEM}` (**TASK-125-BUG-9**)
- **[medium]** `skills/sync-github-bug/SKILL.md:139` (+ story/task/epic) — `--remove-label "$OLD_PRIORITY_LABEL_IF_DIFFERENT"` is defined nowhere; a verbatim-case derivation removes the label just added → define against the filtered label (**TASK-125-BUG-10**)
- **[medium]** `skills/ensure-epic-github-issue/SKILL.md:127` — fixed `--label "epic"` bypasses the helper; the guard regex requires a document field → route + widen (**TASK-125-BUG-11**)
- **[low]** `skills/qa-fix/SKILL.md:865` — `00` passes the guard; lead CLI accepts `qa-fix-00`, tracker engine rejects it (CR-5)
- cleanups: `gh-labels.sh` header says "nine sites" (seven); `labelBlock()` comment names a line that no longer exists; `finalise-bug-mode.test.mjs` `indexOf("Exclusions")` slice can never fail its own assertion (CR-6..8)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete; status `ready-for-review` after qa-fix cycle 1
- [x] All implementation phases completed (3/3)
- [x] Tests passing (`npm run ci:fast` 3685/3685, prettier clean; `bundle:check` 0 problems)
- [x] Breaking changes documented (the "without `--bug` unchanged" promise now executed and holding for all three bug shapes)
- [x] Code on feature branch with open PR (#447, OPEN, head `2e73f628`)

### Testing Approach

- [x] Automated Testing — the six suites this task adds/extends (98 + 22 + 12 targeted) and the full fast gate
- [x] Regression Testing — full `npm run ci:fast`; `bundle:check`; shellcheck on the new helper
- [x] Security Review — boundary probe by hand, minimal env, bash + zsh, 20 executions
- [x] Code Review — Step 3b refute pass, whole-branch diff, read-only Explore reviewer (416 s, 8 findings, each verified before entering this report)
- [x] Manual Testing — Step 4b over every prose file the cycle-1 fix touched; the kind block and B5 block executed by hand

### Review Methodology

Re-review, cycle 2: **direct tools + one refute-pass reviewer over the whole diff** (the cycle-2 exception to narrowing). Traceability matrix reused from cycle 1 (the SCs did not change). `code_review_blocking=true`.

Step 4b — the seven SKILL.md files that gained the helper, plus finalise and qa-fix:

| File | Runnable / placeholder / mutating | Result |
|---|---|---|
| ensure-bug / ensure-story / ensure-task-github-issue | 0 / 0 / 6, 8, 5 | `no-executable-blocks` (information) — the helper-calling blocks invoke `node`, refused by design; executed instead by `tests/ensure-bug-label-tolerance.test.js` and by hand (below) |
| sync-github-bug | 1 / 0 / 7 | green with `--copy docs` |
| sync-github-task / story / epic | 1–2 / 0 / 6–7 | discovery blocks (lines 52 / 70, 91 / 67 — **not in this diff**) exit 1 `find: docs/…: No such file`, identical in both shells and **identical on `origin/develop`** — harness seeding, routed to `future` |
| finalise | 2 / 2 / 29 (bound) | green; the kind block (template slot) executed by hand and by its test |
| qa-fix | 2 / 0 / 6 (bound + copy) | line 937 pre-existing exit 1 (as cycle 1) |

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: `finalise --bug` | FAIL | Verified | Cycle-1 fixes hold (BUG-5, CR-6). **BUG-8** (7.7 globs) and **BUG-9** (Step 2 globs) — the mode's skip table is right, but two `run` rows inherit story/task derivations that assume the document owns its directory. |
| Phase 2: tolerant issue create + legible failure | CONCERNS | Verified | BUG-1/2/3/6 hold, 20/20 probe. **BUG-10** (`--remove-label` undefined at the four edit sites), **BUG-11** (fixed `epic` label outside the guard). |
| Phase 3: `fix_cycle` | CONCERNS | Verified | BUG-7 holds; CR-5 (`00`) is a LOW edge. |

**Overall Phase Completion**: 3/3 delivered; 1 FAIL, 2 CONCERNS

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| SC1 `/finalise --bug` produces the DoD file, CI readings, PR comment; no Change Log row | mode + table | skip table + executed kind block; the PR comment's evidence derivation is wrong for co-located bugs | **FAIL** | BUG-8, BUG-9 |
| SC2 Step 7 has no fallback paragraph | none | asserted | PASS | |
| SC3 A label absent from the repo never fails an issue create | always | helper at 7 sites, 20/20 probe | CONCERNS | BUG-11 (`epic` site), BUG-10 (edit removes the label it adds) |
| SC4 Any `tracker-issue.js` failure carries gh's first line | every path | `gh()` and `withStdin` both piped; e2e both paths | PASS | BUG-1 fixed |
| SC5 verify loop posts `qa-fix-{N}` per cycle with no gate | yes | executed; guard for invalid args | PASS (CR-5 low) | |
| SC6 One extra `gh label list` per create | 1 | 1, with `-L 1000` | PASS | |
| SC7 Skip list stated once; mutation-proved | yes | bidirectional test; 16-key mapping; kind block executed | PASS | |
| SC8 observations close on merge | — | pending | PENDING | |

---

## Breaking Changes Validation

### Breaking Change: None declared — "`/finalise <bug-file>` without `--bug` continues to do what it does today (and prints a hint)"
Documented: Yes · Migration Tested: **Yes — executed** (7 inputs × bash + zsh, committed test) · Notes: holds for all three bug shapes after BUG-5.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: finalise 7.7 publishes the parent's DoD path and gate verdict for a co-located bug**
- **Severity**: HIGH · **Category**: Functional · **Bug Report**: [task.125.bug.8](./task.125.bug.8.finalise-pr-comment-globs-parent-dod-and-gate-for-a-co-located-bug.md)
- **Observation**: `ls {document-directory}/*.dod.*.md | sort | tail -1` and the gate glob are directory-wide; verified by sort order on the `docs/tasks/task.67.*` layout. The `pr-comment` marker promises otherwise and changes nothing.
- **Impact**: the one reader-facing summary reports another work item's evidence for story bugs and task bugs.
- **Recommendation**: key on `${STEM}` (as 6b does); `FINAL_GATE` = verify-loop verdict; executed fixture test. **P1**

### MEDIUM Severity Issues (3)

- **BUG-9** [task.125.bug.9](./task.125.bug.9.finalise-step-2-reads-the-parents-qa-artefacts-as-the-bugs.md) — Step 2 globs read the parent's QA record. P2.
- **BUG-10** [task.125.bug.10](./task.125.bug.10.remove-label-old-priority-undefined-and-compared-against-verbatim-value.md) — `OLD_PRIORITY_LABEL_IF_DIFFERENT` undefined at four sites; verbatim comparison strips the label. P2.
- **BUG-11** [task.125.bug.11](./task.125.bug.11.fixed-label-epic-bypasses-the-helper-and-the-population-guard.md) — fixed `epic` label outside the helper and the guard. P2.

### LOW Severity Issues (4)

- **CR-5** (in gate) — `00`/`000` pass the `fix_cycle` guard; normalise with `10#` and reject 0.
- **CR-6** — `gh-labels.sh` header count "nine" vs seven.
- **CR-7** — `labelBlock()` comment names the removed `REPO_LABELS=` line.
- **CR-8** — `finalise-bug-mode.test.mjs` slices from `indexOf("Exclusions")` without checking `-1`; the `length > 0` assertion is vacuous.

**Total Issues**: HIGH: 1, MEDIUM: 3, LOW: 4

---

## NFR Assessment

### Performance — PASS
One label read per create/edit; BUG-10's fix adds one `gh issue view` per edit.

### Reliability — CONCERNS
BUG-8/9 misattribute evidence for two of three bug modes; BUG-10 strips a label on re-sync; BUG-11 fails an epic create whole.

### Security — PASS
- **Status**: PASS · **Evidence**: measured · **Probes executed**: 20
- Boundary: true (`gh_labels_filter` behind B5). By hand under `env -i`, throwaway `HOME`, fake `gh`/`node`, bash + zsh, 10 shapes × 2 = 20: `High`/`Major` → lowercased and passed; `high<LF>foo` → **refused** (BUG-6 closed); `*`/`?`, `-e`/`-n`, trailing/leading space, `$(touch …)`/backticks, prefix-doubling, `../`, quote-injection → refused or inert; empty → no label; `HOME` afterwards holds only the shim's `argv.log`. 14 further hostile executions are committed in `tests/gh-labels.test.js`.

### Maintainability — CONCERNS
The helper is one definition, mutation-proved five ways, with a population guard — but the guard's regex is one predicate too narrow (BUG-11), and three small staleness items (CR-6..8).

---

## Code Review

Step 3b **refute pass** over the whole branch diff (24 files / 2543 lines), 416 s. Findings verified by QA before entering the report: CR-1 by the sort order of the real `docs/tasks/task.67.*` layout; CR-2 by reading Step 2 lines 226–227; CR-3 by grep (`OLD_PRIORITY_LABEL_IF_DIFFERENT` assigned nowhere — the reviewer's "derived from the verbatim value" is what an agent *would* do, not what the prose does; recorded as verified MEDIUM on the undefined variable); CR-4 by reading `ensure-epic` line 127 and the guard regex; CR-5 by the guard pattern; CR-6..8 by reading.

**Correctness bugs (5):**
- [high/high] `skills/finalise/SKILL.md:1460` — 7.7 globs are directory-wide → key on `${STEM}`. **Promoted: TASK-125-BUG-8.**
- [medium/medium→verified] `skills/finalise/SKILL.md:230` — Step 2 reads the parent's artefacts → scope by stem. **Promoted: TASK-125-BUG-9.**
- [medium/medium→verified] `skills/sync-github-bug/SKILL.md:139` — `--remove-label` undefined / verbatim compare → define against the filtered label. **Promoted: TASK-125-BUG-10.**
- [medium/medium→verified] `tests/gh-labels.test.js` guard + `ensure-epic:127` — fixed label bypasses the helper → route + widen. **Promoted: TASK-125-BUG-11.**
- [low/medium→verified] `skills/qa-fix/SKILL.md:865` — `00` passes → `10#` normalise. **Promoted: CR-5 (low).**

**Cleanups (3):** `gh-labels.sh:16` count; `ensure-bug-label-tolerance.test.js:40` comment; `finalise-bug-mode.test.mjs:177` vacuous slice. Advisory.

**Mutation-proof spot check (Step 3c)** — the eleven cycle-1 mutations were re-run for the three fixes this gate's verdict most depends on:
- mutation-proven: `GH_EXEC_STDIO_STDIN` stderr → `ignore` → §9b ×3 → **covered**
- mutation-proven: helper `-L` removed → 8 gh-labels cases → **covered**
- mutation-proven: kind-block default arm removed → 2 executed cases → **covered**
- The other eight are recorded in the cycle-1 fix commit and were not re-run this cycle (`not-run`).

**Provenance (5b):** BUG-8, BUG-9 and BUG-11 are introduced by this diff (the mode and the helper are new). BUG-10's undefined variable is pre-existing (identical on `origin/develop`), but the misfire it produces is created by this diff's lowercasing — attributed to the diff on that basis, with both measurements recorded in the bug report.

**Working tree after this step:** only the QA artefacts written by Steps 9–12 — no fix applied (5c).

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full fast gate (3685 tests, prettier) | PASS |
| `bundle:check` (128 skills) / shellcheck on `gh-labels.sh` | PASS |
| `tests/qa-cycle.test.js` existing guards | PASS |
| `tracker-issue.test.mjs` §1–§8 (access gate, deferral) | PASS — the second stdio constant does not reach the deferred path |
| `registry-tick.test.mjs` existing 34 | PASS |

---

## Test Artifacts

### Test Commands Executed
```bash
npm run ci:fast                                   # 3685 pass / 0 fail / 1 skipped
npm run bundle:check                              # 0 problems
node --test shared/resources/tests/registry-tick.test.mjs shared/resources/tests/tracker-issue.test.mjs evals/shared/tests/finalise-bug-mode.test.mjs   # 98 pass
node --test tests/gh-labels.test.js tests/ensure-bug-label-tolerance.test.js   # 22 pass
node --test --test-name-pattern=fix_cycle tests/qa-cycle.test.js   # 12 pass
PATH=<fake gh> node tracker-issue.js --kind create … --body-file body.md   # BUG-1 e2e re-verify
node registry-tick.js --file docs/tasks/task.67.x/task.67.bug.3.n.md --json   # BUG-4 re-verify → not-a-task
bash|zsh kind-block.sh docs/bugs/bug.14.x/bug.14.n.md   # BUG-5 re-verify → task
env -i … bash|zsh label-block.sh <10 shapes>      # 20 probes, 0 unexpected
node references/qa-execute-snippets.mjs --file skills/{7 sites,finalise,qa-fix}/SKILL.md …   # Step 4b
git worktree add --detach /tmp/probe-develop origin/develop; <same snippet run>   # provenance of the sync-* discovery failures
```

---

## Recommendations

### Immediate Actions (Blocking)
1. BUG-8 — 7.7 `DOD_PATH` on `${STEM}`, `FINAL_GATE` from the verify loop; executed fixture test with a parent's artefacts beside a bug's. P1.
2. BUG-9 — Step 2 globs by stem in bug mode; same fixture. P2.
3. BUG-10 — define the `--remove-label` derivation against the filtered label at the four sync sites; executed test. P2.
4. BUG-11 — route `ensure-epic` through the helper; widen the guard to every `--label` in a block calling `tracker-issue.js`; floor 8. P2.

### Short-term Actions (Non-Blocking)
1. CR-5 `00`; CR-6..8 staleness.
2. Pre-existing: sync-github-* discovery blocks vs the snippet harness's `--copy` seeding.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: Rule 1 — one HIGH (BUG-8). The cycle-1 fixes all hold under re-execution; the refute reached the place the mode's skip table did not: two `run` rows inherit derivations that assume a document owns its directory, which a co-located bug does not.
**Quality Score**: 50/100

**Deployment Recommendation**: BLOCKED
**Conditions**: BUG-8 with an executed fixture test; BUG-9..11 with their named tests.

---

**QA Report**: co-located at `task.125.qa.2.develop-bug-finalise-mode-and-issue-create.md`
**Gate File**: co-located at `task.125.gate.2.develop-bug-finalise-mode-and-issue-create.yml`
**Next Steps**: `/qa-fix` cycle 2 over BUG-8..11 + CR-5..8; cycle-3 re-review narrowed to files changed since gate 2.
