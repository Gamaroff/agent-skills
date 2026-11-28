# QA Report: Task 333 - Close task 332's follow-ups and guard the zsh flag trap

**Task**: [task.333.close-task-332-follow-ups-and-zsh-flag-guard.md](./task.333.close-task-332-follow-ups-and-zsh-flag-guard.md)
**Gate File**: [task.333.gate.1.close-task-332-follow-ups-and-zsh-flag-guard.yml](./task.333.gate.1.close-task-332-follow-ups-and-zsh-flag-guard.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-28
**Testing Completed**: 2026-11-28
**Gate Status**: CONCERNS

---

## Executive Summary

QA cycle 1 on PR #966 (head `bc7b6013867d`). All four phases are delivered, every functional criterion holds, and QA reproduced all six planned mutations red. The independent diff review found that the new zsh guard scans fewer files than it claims: it drops every `references/` path, including 81 hand-authored ones. QA reproduced that by execution, and it is the one MEDIUM finding.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (fix T333-QA-1, then re-gate)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (4/4 ticked)
- [x] Tests passing
- [x] Breaking changes documented (Step 3a rename, with resume path)
- [x] Code on feature branch with open PR (#966)

### Testing Approach

- [x] Automated Testing (unit and block tests, under bash and zsh)
- [x] Regression Testing
- [x] Security Review
- [x] Code Review

### Review Methodology

Direct tools: 4 phases, low risk, first review. One read-only Explore reviewer ran the code route over the whole branch diff (1113 lines, 15 files). It was dispatched at 07:25Z, its completion notice gave `duration_ms` 126525, and the wait was marked on the pipeline lock.

Diff review: code review.

CI on bc7b6013867d: pending.

Step 4b: run over the three changed runnable-prose files. `skills/finalise/SKILL.md` has 3 changed blocks and `skills/review-story/SKILL.md` has 2, and the engine classifies all five `mutating`: they write `.claude/state`, run the bundled engines, or call Jira. None executed, so the engine reported `changed-blocks-not-executed` and `zero-blocks-executed` (2 and 4 unchanged placeholder blocks). Those findings are medium confidence, so they are advisory. The changed Step 3a and 3c blocks are executed under bash and zsh by `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs`, and the review-story array form by the guard's zsh premise case. `shared/resources/finalise-dod-ac-prompt.md` has no bash blocks. zsh 5.9.2 is present.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: zsh guard and review-story fix | CONCERNS | Verified | Guard red on the unfixed tree, green after; population narrower than claimed (T333-QA-1) |
| Phase 2: disclose every unverified hand copy | PASS | Verified | `AC_YAML_VERIFIED` printed on `merged`; rule covers both routes |
| Phase 3: wording, stem key, one parse | PASS | Verified | Prompt reworded; Step 3a files stem-keyed; `opts.answer` |
| Phase 4: CHANGELOG, bundle, suite | PASS | Verified | `bundle:check` 0 problems; `test:remote` green |

**Overall Phase Completion**: 4/4 delivered, 1 with a finding.

---

## Success Criteria Verification

| # | Criterion | Evidence | Status |
| - | --------- | -------- | ------ |
| 1 | Guard fails on the unfixed tree, naming exactly `:2398` and `:2483` | QA's own run, below | PASS |
| 2 | Guard passes after the fix; zsh premise 1 vs 2 | `zsh-flag-expansion-guard.test.mjs` cases A and C, green in `test:remote` (C not skipped) | PASS |
| 3 | `AC_YAML_VERIFIED=false` after a hand copy, `=true` after an extract, record matches | blocks test: the T332-CR2-1 case and the task 333 extracted case; M3 and M4 red | PASS |
| 4 | No re-run-at-head path keyed by `DOD_N` alone | blocks test stem-keyed assertions (record and out-dir); M5 red on both halves; `git grep -nE 'finalise-rerun-at-head-\$\{DOD_N\}' -- skills/finalise/SKILL.md` exits 1, no match | PASS |
| 5 | One `merge` CLI run calls `parseYamlSubset` once | engine parse-count test; M6 red (`PARSE_COUNT=2`) | PASS |
| 6 | Performance: not applicable | none claimed | N/A |
| 7 | All 6 mutations recorded, each with the test it turned red | QA's own run, below | PASS |
| 8 | PR CI green on head; `test:remote` result recorded | `test:remote` below; PR CI **pending** on `bc7b6013867d` | PARTIAL (CI is gated at `/finalise`) |
| 9 | AC prompt `story_file` rule matches `sameDocument` | `shared/resources/finalise-dod-ac-prompt.md:153` names the exact path, a missing field, and a path that does not resolve to the same file | PASS |
| 10 | CHANGELOG names the renamed files and resume path | `CHANGELOG.md` `[Unreleased]` → Changed, task 333 entry; `changelog-cites.sh task.333` → `cites (task 333)` | PASS |
| 11 | `traps.md` has the entry; the guard cites it | `docs/contributing/traps.md:229`; guard header line 8 | PASS |

Criteria drift: `clean` against the review commit. Boundary signals: `[]`.

### SC 1 record: the guard on the unfixed tree

QA ran it in a scratch worktree at `origin/develop` with only the new guard copied in:

```text
$ git worktree add --detach <scratch>/t origin/develop
$ cp shared/resources/tests/zsh-flag-expansion-guard.test.mjs <scratch>/t/shared/resources/tests/
$ (cd <scratch>/t && node --test shared/resources/tests/zsh-flag-expansion-guard.test.mjs)   # exit 1
ℹ pass 4
ℹ fail 1
    skills/review-story/SKILL.md:2398
    skills/review-story/SKILL.md:2483
```

The developer's earlier run at Step 3 gave the same two lines.

### SC 7 record: mutations, QA's own run

Each mutation was applied with the file tool and confirmed on disk, run, and reverted before the next one. After the last revert, `git status` showed only the implementation report, and the three suites were green: 108/108.

| # | What QA reverted | Test that went red | Outcome |
| - | ---------------- | ------------------ | ------- |
| M1 | `skills/review-story/SKILL.md:2488` back to `${PIN_BRANCH:+--doc-branch "$PIN_BRANCH"}` | guard test A, naming `skills/review-story/SKILL.md:2488` (pass 4 / fail 1) | covered |
| M2 | guard scan made empty (`extractBlocks(md).filter(() => false)`) | guard test B: "read 0 blocks, expected >= 700" | covered |
| M3 | Step 3c `AC_YAML_VERIFIED` echo removed | blocks test, `[bash]` and `[zsh]`: the T332-CR2-1 hand-copy case and the task 333 extracted case (fail 4) | covered |
| M4 | bundled `skills/finalise/references/finalise-rerun-scope.js` records `verified: true` with no `--sha256` | blocks test, `[bash]` and `[zsh]` T332-CR2-1 case: "a hand copy is recorded verified: false" (fail 2) | covered |
| M5a | Step 3a record path back to `finalise-rerun-at-head-${DOD_N}.json` | blocks test, 16 cases including the stem-keyed record assertion (fail 16) | covered |
| M5b | Step 3a out-dir back to `finalise-rerun-at-head-${DOD_N}` | blocks test `[bash]` and `[zsh]` T319-CR-5 case: "the re-run-at-head out-dir is stem-keyed" (fail 2) | covered |
| M6 | `merge()` re-parses, ignoring `opts.answer` | engine "merge (CLI): one run parses the AC answer exactly once": `PARSE_COUNT=2` | covered |

M4 is red only in the bundled copy: Step 3c runs `skills/finalise/references/finalise-rerun-scope.js`, so mutating the unbundled source reaches no test. That is expected, and the bundle check keeps the two in step.

### SC 8 record: test suite

```text
$ npm run test:remote          # ci:fast on ci@192.168.1.249, CI-parity container
# tests 8988
# pass 8985
# fail 0
# skipped 3
tmp-leak: ratchet ok
remote rc=0
```

The first run of the same command failed `format:check` on three test files. They were formatted with Prettier and the second run is the one above. `npm run bundle:check`: 129 skills, 0 problems. PR CI on `bc7b6013867d` was `pending` when this report was written. QA does not wait on CI; `/finalise` gates it on the final commit.

---

## Breaking Changes Validation

### Breaking Change: Step 3a re-run-at-head files renamed

Documented: Yes (CHANGELOG `[Unreleased]` → Changed, task 333)
Migration Path Provided: Yes: re-run the Step 3a re-run-at-head block, which is idempotent; the old file is inert
Migration Tested: Yes: the blocks test runs the block and asserts the new names
Consumer Code Updated: Yes: the only reader (the scope block) reads the new name; no reader of the old name remains

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: the zsh guard does not read hand-authored `references/` files (T333-QA-1)**
- **Severity**: MEDIUM
- **Category**: Quality
- **Observation**: `population()` filters out every path containing `/references/`, on the assumption that each is a bundle copy. 81 tracked `skills/*/references/*.md` files carry no AUTO-GENERATED header, so they are canonical sources. None holds a live hit today.
- **Reproduction**: QA added `probe ${PIN_BRANCH:+--doc-branch "$PIN_BRANCH"}` to the first bash fence of `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md` (confirmed on disk with `grep -nF`), ran the guard, and it was green, 5/5. The file was then restored. Control: the same line in a SKILL.md fence turns test A red (M1).
- **Impact**: the guard and `traps.md` say it covers canonical sources. A new trap instance in one of those 81 files would pass CI.
- **Recommendation**: choose the population by content. Include a `references/*.md` file unless it carries the AUTO-GENERATED header, and test both directions.
- **Priority**: P2

### LOW Severity Issues (1)

**T333-QA-2**: the key misses whitespace after `:+`. QA ran `set -- ${X:+ --flag "$X"}` and got 1 argument under zsh and 2 under bash, which is the same defect. Allow `\s*` in the key, add the shape to test D's caught list, and keep `"${X:+ (eq ${X})}"` legal.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
One merge CLI run parses the AC YAML once (the parse-count test).

### Reliability — PASS
The Step 3c echo is an `if`, so `result-unparseable` keeps exit status 0. The rename has a stated resume path.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: internal`. The `merge()` change only passes an already-parsed value into `merge`. It adds and changes no refusal, and its inputs are pipeline-written artefacts no corpus sink models (the same decision as task 331 gate 4 and task 332 gate 1). The Step 3a STEM guard reads only the placeholders the agent substitutes. The engine's `fence:` form fills one slot, and the block has three placeholders plus a bundled-engine call, so no legitimate case could run. Its refusals are executed under bash and zsh by the blocks test.

### Maintainability — CONCERNS
The guard's claimed scope is wider than what it scans (T333-QA-1), and its key misses one spelling (T333-QA-2).

---

## Code Review

Reviewer: one read-only Explore subagent, code route, whole branch diff. Blocking resolved `true` (run-level `code_review_blocking=true` under the develop pipeline). It reported no `high`-confidence bug. Every anchor was checked against the source: each `file_line` points at the quoted text.

**Correctness bugs (2):**
- [medium/medium] `shared/resources/tests/zsh-flag-expansion-guard.test.mjs:54` — the population drops every `/references/` path, including 81 hand-authored ones → select by AUTO-GENERATED header. **Reproduced by QA; promoted as T333-QA-1** (origin: code-review, reproduced by QA).
- [low/medium] `skills/review-story/SKILL.md:2399` — the Jira blocks read `$PIN_BRANCH` and `$STORY_FILE_PATH`, which they do not bind. **Pre-existing**: `origin/develop` reads `PIN_BRANCH` the same way at `:2398` and `:2483`, and the defect is outside this task's scope (the zsh word-split). Routed to `recommendations.future`.

**Cleanups (1):**
- `shared/resources/tests/zsh-flag-expansion-guard.test.mjs:41` — the key misses `${X:+ --flag "$X"}`. **Reproduced by QA** (zsh 1, bash 2); recorded as T333-QA-2 (low).

The reviewer confirmed that the bundled copies match their sources apart from the generated header, and that no stale `finalise-rerun-at-head-${DOD_N}` reader remains.

Probe boundary: `boundary: internal`, recorded under Security above. `probes_executed: 0`, `escaped: 0`.

Mutation proofs: see the SC 7 record. All seven runs (M5 has two halves) are `covered`.

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| Existing `merge` refusals (task 331, 332) | PASS: engine suite 81/81 |
| Step 3a and 3c blocks under bash and zsh | PASS: blocks suite 22/22 |
| Jira `--no-transition` sync blocks | PASS: `jira-sync-no-transition.test.mjs` |
| Full fast gate | PASS: `test:remote` 8985 pass, 0 fail |

---

## Test Artifacts

### Files Reviewed
`shared/resources/tests/zsh-flag-expansion-guard.test.mjs`, `skills/review-story/SKILL.md`, `skills/finalise/SKILL.md` (Steps 3a and 3c), `shared/resources/finalise-rerun-scope.js`, `shared/resources/finalise-dod-ac-prompt.md`, both finalise test files, `docs/contributing/traps.md`, `CHANGELOG.md`.

### Test Commands Executed
```bash
node --test shared/resources/tests/zsh-flag-expansion-guard.test.mjs evals/shared/tests/finalise-rerun-scope-blocks.test.mjs shared/resources/tests/finalise-rerun-scope.test.mjs   # 108/108
npm run test:remote                       # rc 0, 8985 pass, 0 fail
npm run bundle:check                      # 0 problems
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <changed> --diff-base <merge-base> --copy-as skills:.agents/skills --json
node .agents/skills/qa-task/references/probe-boundary-signals.mjs --doc <task> --json    # []
node .agents/skills/qa-task/references/criteria-drift.js --doc <task> --base-from-review develop --json   # clean
bash .agents/skills/qa-task/references/changelog-cites.sh task.333   # cites (task 333)
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 966   # pending
```

No standards-named validation command applies beyond these: no changed skill's frontmatter changed.

### Coverage Report
Not measured: this repository has no coverage tool. The mutation table stands in for it.

---

## Recommendations

### Immediate Actions (Blocking)
1. T333-QA-1: include hand-authored `references/*.md` in the guard population (P2).

### Short-term Actions (Non-Blocking)
1. T333-QA-2: allow whitespace after `:+` in the key.
2. review-story's Jira blocks: bind `PIN_BRANCH` and `STORY_FILE_PATH` in the block that reads them (pre-existing; a follow-up task).
3. `security-probe.mjs` `fence:` form: support more than one slot, so guards like finalise Step 3a can be probed.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: every criterion is delivered and mutation-proven. One reproduced MEDIUM gap: the guard scans less than it claims.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T333-QA-1 fixed and re-gated.

---

**QA Report**: co-located at `task.333.qa.1.close-task-332-follow-ups-and-zsh-flag-guard.md`
**Gate File**: co-located at `task.333.gate.1.close-task-332-follow-ups-and-zsh-flag-guard.yml`
**Next Steps**: `/qa-fix` for T333-QA-1 and T333-QA-2, then QA cycle 2.
