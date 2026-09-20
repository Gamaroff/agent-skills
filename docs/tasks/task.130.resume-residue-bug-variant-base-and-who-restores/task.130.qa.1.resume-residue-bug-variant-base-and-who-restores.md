# QA Report: Task 130 - Resume residue from task.124 — bug-variant base, dispatch population, self-reported delete, who-restores enumeration

**Task**: [task.130.resume-residue-bug-variant-base-and-who-restores.md](./task.130.resume-residue-bug-variant-base-and-who-restores.md)
**Gate File**: [task.130.gate.1.resume-residue-bug-variant-base-and-who-restores.yml](./task.130.gate.1.resume-residue-bug-variant-base-and-who-restores.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-20
**Testing Completed**: 2026-09-20
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 1 review of PR #441 (`5b71d9cd`, base `develop`). All five phases are implemented as the task and plan describe, every new branch is mutation-proven (QA re-ran one proof per phase — all `covered`), and the full fast gate, the develop-task eval layer, `bundle:check` and shellcheck are green. The adversarial diff review returned seven findings; QA reproduced the two medium ones by execution — a trailing `--which` flag makes `--restore` perform the consuming write it was asked not to, and the new one-statement delete loop exits 0 with the snapshot still on disk when its input is unset or malformed. Both are in code this diff introduced, both are one-line fixes with a test each, and both route to `qa-fix`.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — bugs 1 and 2 fixed and re-verified

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (`status: ready-for-review`, 22/22 Implementation Plan boxes ticked)
- [x] All implementation phases completed
- [x] Tests passing (developer's `ci:fast` run recorded in the implementation report; re-run by QA below)
- [x] Breaking changes documented (two, § 5, each with a migration path)
- [x] Code on feature branch with open PR (#441, OPEN, MERGEABLE)

### Testing Approach

- [x] Automated Testing (unit — node suites, shell suites; integration — replay fixtures)
- [x] Regression Testing (full `npm test` glob; eval:develop-task 17/17)
- [x] Security Review (reasoned; no JS boundary delivered)
- [x] Code Review (Step 3b — read-only Explore reviewer over the scoped diff)
- [x] Executed prose (Step 4b — 10 changed prose files under bash and zsh)
- [x] Mutation-proof spot checks (Step 3c — one per phase)
- [ ] Manual Testing (n/a — no UI)
- [ ] Performance Testing (n/a — one `sed` and one `--which` read per resume)

### Review Methodology

Direct tools plus a single read-only Explore reviewer for Step 3b (standard mode; 5 phases across `shared/`, `skills/`, `evals/` — the Adaptive Review Strategy's default row: direct tools first, agents where a lens is missing). Traceability mapper skipped by the orchestrator (Success Criteria are checkbox lists, not a table). First review — no re-review scope line.

Step 4b: applicable — `shared/resources/*.md` and three `SKILL.md` carry fenced bash and were modified.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Probe base — bug variant, HALT, label by cause | PASS | Verified | Contract block reads table row → `**Branch model:**` line → HALT; stderr split reads gh's stderr text (gh exits 1 for both no-PR and failure — the plan's status-only split would have mislabelled every PR-less branch). `probe-base-binding.test.mjs` 11/11 under bash+zsh with stubbed `gh`; fixture 17 14/14. QA mutation: `develop` default restored → C, D, F red. |
| Phase 2: develop-bug dispatch mark + population pattern | PASS | Verified | Step-3 root-cause dispatch carries `set-waiting-on.sh "step-3 root-cause localisation"` / `--clear`; `DISPATCH` regex widened; non-vacuity anchored to the root-cause line (the file's triage dispatch already matched `subagent_type=`, so a file-level count was vacuous); floor 12→17 measured. QA mutation: mark removed → `develop-bug-step-3-investigate-fix.md:18 dispatches without marking`. |
| Phase 3: stale-snapshot delete in the orchestrator | CONCERNS | Partial | Detector prompt is read-only (object-shaped delta, decision row, invocation context); contract § Consume Output carries the one loop (process substitution — the plan's piped `while` swallowed the HALT under bash, found by executing it); three SKILL.md cite it; fixture 16 re-recorded. `stale-snapshot-delete.test.mjs` 7/7. **Bug 2**: the loop exits 0 on an unset `DETECTOR_JSON` or a delta without `concern` (reproduced). QA mutation: re-read dropped → C red. |
| Phase 4: one statement of who restores | PASS | Verified | Marker under the contract's Phase 0a section; five sites reduced to citations (develop-bug's token-free sentence removed); `who-restores-single-statement.test.mjs` 4/4 keyed on the marker. Grant-offer prose untouched (`:304`, `:317`, contract `:390` keep the token by design). QA mutation: marker removed → (i) red. |
| Phase 5: gate-6 futures | CONCERNS | Partial | `choose_candidate()` factored; `--restore --which` and `--accept-legacy`; grant guard reads the `--which` candidate (test: newer claim's budget 9 refuses `k` the snapshot's 5 allowed); step-8 sole-legacy delete counts claims with `find` (the plan's `for f in <path> <glob>` aborts under zsh `nomatch` — caught by the new F1 case); four lint sites split 0/1/2/other. Suites: advance-pipeline-lock 75/75, grant-qa-cycles 42/42, halt-snippet-glob-safe 14/14, report-lint-call-sites 3/3. **Bug 1**: trailing `--which` performs a consuming restore (reproduced). QA mutation: legacy accepted unconditionally → `legacy snapshot refused` red (bash+zsh). |

**Overall Phase Completion**: 5/5 phases implemented; 2 phases carry a medium finding each.

---

## Success Criteria Verification

**Functional Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Bug-variant base binds `origin/main`; no shape → HALT, nothing discarded; proven by execution | executed test | `probe-base-binding.test.mjs` B (main), C (HALT), E (no checkout) | PASS | |
| `gh` failure vs "no PR" produce different stderr lines | 2 labels | D: `gh pr view failed: gh: HTTP 401…` vs `no PR on this branch` (both gh's own no-PR line and empty exit-0) | PASS | |
| develop-bug Step 3 dispatch marked and matched by the tested regex | marked | line 18 marked; parity test non-vacuity on that line | PASS | |
| MERGED snapshot deleted by the orchestrator from one stated loop, asserted absent | one loop, verified | contract § Consume Output; SKILL.md cite; test D (no copies) | CONCERNS | Bug 2 — the loop's failure modes are silent |
| Who-restores: one marker; five sites no restore-verb rule text; grant-offer untouched | 1 / 0 / untouched | (i)=1, (ii)=0 offenders, (iii)=5 citations; Re-entry paragraphs keep the token | PASS | |
| Grant guard reads the candidate `--restore` will choose | same selection | `grant-qa-cycles.test.sh` "guard reads --which candidate"; mutation to `$SNAPSHOT` → red | PASS | |
| Directory-less snapshot refused without `--accept-legacy`; Step 8 deletes when sole | refused / deleted | advance-pipeline-lock.test legacy scenarios; glob-safe F1–F3 | PASS | Bug 1 is a flag-order defect on the same surface |

**Performance Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Resume cost unchanged beyond one `sed` and one `--which` read | ≤ +1 sed, +1 read | as designed | PASS | |

**Code Quality Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Every new branch mutation-proven | all | developer proofs recorded per phase; QA re-proved 5/5 (`covered`) | PASS | |
| `npm run ci:fast` green | 0 failures | 3542/3542 node + all shell suites (QA run) | PASS | |
| `eval:develop-task` green | 17/17 | 17/17 (QA run) | PASS | |
| `bundle:check` 0 problems | 0 | 0 (128 skills) | PASS | |
| shellcheck clean | clean | clean (67 source scripts) | PASS | |

**Migration:**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| CHANGELOG `[Unreleased]` names the HALT and the legacy-snapshot refusal | both named | both named, marked **Breaking** | PASS |
| PR #436 review CR-1..CR-5 and gate-6 futures referenced as closed in the implementation report | referenced | Step 3 entry names each by phase | PASS |

---

## Breaking Changes Validation

### Breaking Change 1: the probe HALTs when it cannot bind a base
Documented: Yes · Migration Path Provided: Yes (add the `| Feature branch base |` row and re-invoke; the HALT text says so) · Migration Tested: Yes (`probe-base-binding` C asserts the HALT names both shapes; fixture 17 records it end to end) · Consumer Code Updated: N/A (no in-flight run; none of the five existing reports is resumable)

### Breaking Change 2: `--restore` refuses a snapshot with no `task_or_story_directory`
Documented: Yes · Migration Path Provided: Yes (`--accept-legacy` once, or delete; Step 8 removes a sole one) · Migration Tested: Yes (advance-pipeline-lock.test refusal + acceptance; grant-qa-cycles.test refusal relayed; glob-safe F1 deletion) · Consumer Code Updated: Yes (three grant-test fixtures moved to the directory-carrying shape; `grant-qa-cycles.sh` comment updated)

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (2)

**Issue: `--restore <doc-dir> --which` silently performs a consuming restore**
- **Severity**: MEDIUM
- **Category**: Functional
- **Bug Report**: [task.130.bug.1.restore-trailing-which-flag-consumes.md](./task.130.bug.1.restore-trailing-which-flag-consumes.md)
- **Observation**: The `--restore)` arm's flag loop breaks at the first positional and then checks only `[ $# -ge 1 ]`; a trailing `--which` or `--accept-legacy` is ignored. Reproduced: lock created, snapshot consumed, exit 0.
- **Impact**: The read-only query the grant's guard depends on becomes the write it precedes when spelled with the flag last. Bundled callers pass the flag first, so the pipeline path is unaffected today.
- **Recommendation**: `[ $# -eq 1 ] || usage` after the flag loop; a trailing-flag scenario in `advance-pipeline-lock.test.sh`.
- **Priority**: P2

**Issue: the stale-snapshot delete loop exits 0 on an unset or malformed `$DETECTOR_JSON`**
- **Severity**: MEDIUM
- **Category**: Reliability
- **Bug Report**: [task.130.bug.2.stale-snapshot-delete-loop-silent-on-broken-input.md](./task.130.bug.2.stale-snapshot-delete-loop-silent-on-broken-input.md)
- **Observation**: jq's exit status is lost behind the process substitution; empty input emits nothing (exit 0) and a delta without `concern` aborts jq (`startswith() requires string inputs`) — both leave the snapshot in place and exit 0. Reproduced.
- **Impact**: "No stale snapshot" and "the reader is broken" report one value in the very section written to remove a self-reported delete. The orchestrator binds the variable directly above the block, so the followed path works; a re-run in a fresh shell does not.
- **Recommendation**: guard the input, extend the schema check to the array, materialise the list with jq's exit checked and `(.concern // "")`, then loop; two new test cases.
- **Priority**: P2

### LOW Severity Issues (3) — documented here only

- **CR-3** `shared/resources/develop-pipeline-step-8-commit.md` legacy arm: `SNAP_DIR` is empty both when the key is absent and when the jq read failed, so an unparsable snapshot for another document would be deleted when it is the sole candidate. Enter the arm only on a parsed object lacking the key.
- **CR-4** `advance-pipeline-lock.sh` `--which` with a lock present prints the "lock present — nothing to restore" sentence on stdout with exit 0; a consumer taking stdout as a path receives prose. `grant-qa-cycles.sh` is safe because it tests `[ -f "$LOCK" ]` first. Send the notice to stderr.
- **CR-5** `report-lint-call-sites.test.mjs` scans sites (1), (2) and (4); site (3), the PreCompact hook, is excluded by the task's scope but the test does not say so. Name it as exempt-with-reason.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 3

---

## NFR Assessment

### Performance — PASS
One additional `sed` pass over the report on resume and one `--which` read (a jq scan of at most two files) before the grant. No loop, no network.

### Reliability — CONCERNS
Bug 2 is an ambiguous-signal defect in the resume path; bug 1 is a read-that-writes on a flag-order variant. Rollback plan (task § 11) is a revert of one PR; both breaking changes are opt-in-by-flag or halt-with-instructions rather than silent behaviour changes.

### Security — PASS
- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- The change set delivers one accept/reject function, `choose_candidate()` in shell — the probe engine imports JS entry points and cannot exercise it (`boundary: shell — engine not applicable`). Its refusal arms are executed under bash and zsh by `advance-pipeline-lock.test.sh` (other-document refused, legacy refused, canonicalised match, `--which` no-write). No secrets, no network calls added, no new writes outside `.claude/state`. Platform variance: no environment-derived value reaches a validating consumer in this diff (`os.tmpdir()` is used only as a sandbox root; nothing validates it).

### Maintainability — PASS
The task's own purpose — one statement, cited elsewhere, guarded by a test — is met for both the who-restores rule and the delete loop; the population test derives from the directory; three plan snippets were corrected by executing them and the corrections are recorded in the task's Notes and the implementation report. Two cleanups (CR-6 env-seeded `ACCEPT_LEGACY`, CR-7 duplicate usage lines) are advisory.

---

## Code Review

Step 3b — read-only Explore reviewer over `origin/develop...HEAD` with bundled copies and the task 131/132 docs excluded (2851 lines, 38 files). `code_review_blocking=true` (pipeline override); no per-doc opt-out.

**Correctness bugs (5):**
- [medium/high] `shared/resources/advance-pipeline-lock.sh:327` — the `--restore` flag parser stops at the first positional and checks only `[ $# -ge 1 ]`, so a trailing `--which`/`--accept-legacy` is dropped and a consuming restore runs → require exactly one remaining positional. **Promoted: TASK-130-QA-1.** Reproduced by QA.
- [medium/medium→high] `shared/resources/develop-pipeline-resume-contract.md:53` — the delete loop has no non-vacuity floor; unset `$DETECTOR_JSON` or a delta missing `concern` exits 0 with the snapshot on disk → guard, schema-check the array, materialise with jq's exit checked. **Promoted: TASK-130-QA-2** (confidence raised to high by QA reproduction — see Issues Found).
- [low/medium] `shared/resources/develop-pipeline-step-8-commit.md:112` — the legacy arm is reached by a failed jq read as well as an absent key → enter only on a parsed object lacking the key. Advisory (future).
- [low/medium] `shared/resources/advance-pipeline-lock.sh:335` — `--which` with a lock present prints prose on stdout, exit 0 → stderr. Advisory (future).
- [low/medium] `shared/resources/tests/report-lint-call-sites.test.mjs` — site (3) not enumerated or named exempt → record the exemption. Advisory (future).

**Cleanups (2):**
- `shared/resources/advance-pipeline-lock.sh:169` — `ACCEPT_LEGACY="${ACCEPT_LEGACY:-0}"` lets an exported env var accept legacy snapshots without the flag → initialise `0` unconditionally.
- `shared/resources/advance-pipeline-lock.sh:106` — usage lists `--restore` twice → collapse.

**Provenance (5b):** both promoted findings are in code introduced by this diff (the `--restore` flag parser and the Consume Output loop do not exist on `origin/develop`); not pre-existing.

**Boundary rule (3):** `boundary: shell` — no JS entry point; `probes_executed: 0`; security evidence `reasoned`.

**Mutation proofs (3c, QA-run, `cp` snapshot/restore, baseline green between, tree verified equal to the committed state afterwards):**

```
mutation-proven: contract — `BASE_BRANCH=develop` default restored in place of the HALT → probe-base-binding C [bash], C [zsh] (+D, F) → covered
mutation-proven: develop-bug step 3 — set-waiting-on label removed → qa-loop-lock-fields-parity "develop-bug-step-3-investigate-fix.md:18 dispatches without marking" → covered
mutation-proven: contract — delete loop's `[ ! -f "$p" ] || HALT` re-read dropped → stale-snapshot-delete C [bash], C [zsh] → covered
mutation-proven: contract — `<!-- who-restores: statement -->` removed → who-restores-single-statement (i) → covered
mutation-proven: advance-pipeline-lock.sh — legacy refusal disabled (`if false`) → advance-pipeline-lock.test "[bash]/[zsh] --restore: legacy snapshot refused" → covered
```

**Verification against committed state (5c):** no fix was applied by QA; `git status --porcelain` after the spot checks equals its state at the start of this step (one entry — the implementation report, edited by the orchestrator at Step 4).

**Step 4b (executed prose):** 10 changed files under bash and zsh — contract (2 runnable, 9 placeholder, 19 mutating; 0 findings), detector prompt (2/3/0; one `execution-failure` at :69 — an unchanged `cat` of the lock in an empty temp dir, identical on `develop`), step-8 (0/0/5; `no-executable-blocks`, correct), step-0 (0/3/11; `zero-blocks-executed` — identical on `develop`; gate-6 future 3, task § Out of Scope), pause/hooks/develop-bug step 3 (no runnable blocks), three SKILL.md (1/1/7 each; one `execution-failure` at :48/:51/:53 — the unchanged `cat .agents/skills/<skill>/SKILL.md` block; passes when seeded with `--copy`, 0 findings). No block this diff added or changed failed. `zsh` available on this host.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full `npm test` glob (all per-skill suites, shared tests, eval protocol tests) | PASS — 3542/3542 (1 skipped, pre-existing) |
| Shell suites (resolve-platform 401, advance-pipeline-lock 75, set-qa-phase 19, set-waiting-on 19, grant-qa-cycles 42, on-precompact 18, install-hooks 11, on-stop 32, verify-push-state 9, tracker-access 35, bitbucket-auth 14) | PASS |
| `eval:develop-task` protocol + 17 step-isolation fixtures | PASS — 17/17 (13 protocol tests pass) |
| `bundle:check` (128 skills) | PASS — 0 problems |
| `lint:shell` (67 source scripts) | PASS |
| Prettier (`format:check`) | PASS |

---

## Test Artifacts

### Files Reviewed
`shared/resources/develop-pipeline-resume-contract.md`, `pipeline-resume-detector-prompt.md`, `develop-pipeline-step-0-resolve-and-prepare.md`, `develop-pipeline-step-8-commit.md`, `develop-pipeline-pause.md`, `develop-pipeline-hooks.md`, `advance-pipeline-lock.sh` (+ `.test.sh`), `grant-qa-cycles.sh` (+ `.test.sh`), `shared/resources/tests/{probe-base-binding,stale-snapshot-delete,who-restores-single-statement,report-lint-call-sites,halt-snippet-glob-safe}.test.mjs` and fixtures, `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs`, fixtures 16 and 17, `skills/develop-{task,story,bug}/SKILL.md`, `skills/develop-bug/references/develop-bug-step-3-investigate-fix.md`, `CHANGELOG.md`.

### Test Commands Executed
```bash
npm run ci:fast                       # exit 0 — 3542/3542 + shell suites
npm run eval:develop-task             # exit 0 — 17/17 fixtures
npm run bundle -- --check             # 0 problems
npm run lint:shell                    # clean
node shared/resources/qa-execute-snippets.mjs --file <each changed prose file> --json   # Step 4b, bash+zsh
node --test shared/resources/tests/{probe-base-binding,stale-snapshot-delete,who-restores-single-statement}.test.mjs   # under each mutation
bash shared/resources/advance-pipeline-lock.test.sh                                  # under the legacy mutation
node --test evals/shared/tests/qa-loop-lock-fields-parity.test.mjs                   # under the mark mutation
# CR-1 / CR-2 reproductions — see the bug reports
```

### Coverage Report
Not instrumented (this repository measures coverage by mutation-proof, not line counters).

---

## Recommendations

### Immediate Actions (Blocking)
1. Bug 1 — refuse a trailing flag after the `--restore` positional; test the spelling. P2.
2. Bug 2 — make the delete loop fail closed on unbound/malformed input; two test cases. P2.

### Short-term Actions (Non-Blocking)
1. CR-3, CR-4, CR-5 as recorded in the gate's `recommendations.future`.
2. CR-6, CR-7 cleanups (one-liners in `advance-pipeline-lock.sh`).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Two medium correctness defects in code this diff introduced, both reproduced by QA (deterministic rule 2); no HIGH; reliability NFR CONCERNS on the same two defects. Everything else the task promised is present and proven.
**Quality Score**: 85/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: bugs 1 and 2 fixed and re-verified in qa-fix cycle 1.

---

**QA Report**: co-located at `task.130.qa.1.resume-residue-bug-variant-base-and-who-restores.md`
**Gate File**: co-located at `task.130.gate.1.resume-residue-bug-variant-base-and-who-restores.yml`
**Next Steps**: `/qa-fix` on the two gate entries; re-review (cycle 2 is a full refute pass).
