# QA Report: Task 152 - finalise: bug-mode gaps path and co-located artifacts in 8a and link guard

**Task**: [Link to task document](./task.152.finalise-gaps-path-and-artifact-links.md)
**Gate File**: [task.152.gate.1.finalise-gaps-path-and-artifact-links.yml](./task.152.gate.1.finalise-gaps-path-and-artifact-links.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-26
**Testing Completed**: 2026-09-26
**Gate Status**: FAIL

---

## Executive Summary

All seven phases are delivered and each fix is mutation-proved. The new artifact admission
predicate engages under 37 executed probes. But CI is red on PR #495. The implementation report
quotes the task.139 link shape inline, and both `link-check` and the new artifact corpus guard fail
on that line. Three medium findings also stand: a writer check that stages a file not yet written, a
vacuous bug-mode 8.5 post-condition, and two regexes for one artifact set that already disagree.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (20/20 plan checkboxes)
- [x] Tests passing locally at Step 3; **not** on the PR head (see QA-2)
- [x] Breaking changes documented (§ 5, CHANGELOG `Changed`)
- [x] Code on feature branch with open PR (#495, OPEN)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, integration, executed shell blocks in bash and zsh)
- [x] Performance Testing (artifact walk wall time)
- [x] Regression Testing (full `npm run ci:fast`)
- [x] Security Review (probe engine, executed)
- [x] Code Review (independent subagent, Step 3b)

### Review Methodology

Hybrid: direct tools, plus one independent code-review subagent (Step 3b, whole-branch diff, bundled
`references/` copies and `docs/tasks/` artifacts excluded). First review — no prior gate.
`code_review_blocking=true` (pipeline override): bug + high-confidence findings enter `top_issues[]`.

Step 4b ran the documented-command engine over the four changed `SKILL.md` files. The first pass
executed 0 blocks: every block was `mutating` or `placeholder`. The second pass bound the
placeholders (`DOC_FILE`, `TASK_DIR`, `--copy-as docs:docs`) and executed 3 blocks under bash and
zsh, with no findings and no shell disagreement. None of the three is new. The new blocks (7.1 and
8.1 helper calls, 8.3, 8.5, and the three writer blocks) are classified `mutating`, so the engine
refuses them by design. Their execution evidence is the committed executed tests (7.1, the helper and
8.5, in bash and zsh from a consumer-shaped root) and the recorded hand run of the writer block. The
8.3 block is executed by nothing (see CR-5).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: fill helper | PASS | Verified | 7.1 tests pass through the helper; helper tests in bash + zsh |
| Phase 2: Step 8 rows + markers | CONCERNS | Verified | 22 rows, parity both ways; CR-2 (8.5 bug-branch post-condition), CR-5 (8.3 guard) |
| Phase 3: status-history.js | PASS | Verified | `unchanged` unreachable (writer appends) — asserted and noted, per plan |
| Phase 4: evaluator `artifactPaths` | CONCERNS | Verified | 37 probes engage; QA-1 (sprint-review-summary omitted) |
| Phase 5: 8a + corpus guard | CONCERNS | Verified | Guard caught QA-2 on this PR's own report; CR-7 (timing assertion) |
| Phase 6: writer sites | CONCERNS | Verified | CR-1 (qa-story stages a gate not yet written) |
| Phase 7: docs + validation | FAIL | CI red | QA-2 |

**Overall Phase Completion**: 7/7 implemented; 1 FAIL, 4 CONCERNS.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Skip table 22 rows, parity both ways | 22 | 22 | PASS |
| Helper fills `gaps`, idempotent, refuses ACCEPTED; 7.1 fills ACCEPTED through it | yes | yes (S1 spot-check `covered`) | PASS |
| 8.5 bug mode builds a non-empty body from Step 5; GAP_COUNT = gap lines | yes | yes — but the non-empty check is vacuous in bug mode | CONCERNS (CR-2) |
| `status-history.js --json` updated/unchanged, usage exit 2, Title Case | yes | yes; `unchanged` unreachable (noted) | PASS |
| Evaluator admits a co-located artifact, refuses the listed cases | yes | yes; 37 probes, 0 reproduced | PASS |
| Artifact corpus ≥ 1,000 files / 1,000 links, fails on new dead link/fence/heal | yes | yes — and caught QA-2 | PASS |
| Three writer sections stage then run `doc-links.js --file` | yes | yes; qa-story's stage fails on first run | CONCERNS (CR-1) |
| Artifact test < 10 s locally | < 10 s | ~2.0–2.6 s | PASS |
| No network in new tests | none | none | PASS |
| Every fix mutation-proved | yes | M1–M21 recorded; QA S1, S2 re-run | PASS |
| `ci:fast`, `format:check`, `bundle:check`, `lint:shell` clean | clean | local clean at Step 3; **PR CI red** | FAIL (QA-2) |
| CHANGELOG entry with both breaking changes | yes | yes | PASS |

---

## Breaking Changes Validation

### Breaking Change: status-history.js usage errors exit 2

Documented: Yes · Migration Path Provided: Yes (none needed in-tree; CHANGELOG for out-of-tree) ·
Migration Tested: Yes (`git grep` shows both call sites read neither code nor stdout) ·
Consumer Code Updated: N/A

### Breaking Change: CLI writes lifecycle statuses in Title Case

Documented: Yes · Migration Path Provided: Yes (none; existing rows untouched) · Migration Tested:
Yes (five-token test) · Consumer Code Updated: N/A — but see CR-4: `sync-jira-bug` still writes
lowercase through the module API (out of scope by § 4).

**Overall Breaking Changes Assessment:** PASS

---

## New Findings This Cycle

First review — every finding below is new.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: QA-2 — the implementation report carries a live dead link; CI is red**

- **Severity**: HIGH
- **Category**: Quality (CI)
- **Observation**: `task.152.implementation.1.*.md` line 102 quotes the task.139 shape inline. The
  second bracket-paren span is outside the code span and renders as a relative link to `b.md`. PR
  #495's `link-check` fails (`[✖] b.md → Status: 400`), and the `test` job fails on the new
  artifact corpus test. Step 3's local `ci:fast` passed because the report was still untracked.
- **Impact**: the PR cannot merge.
- **Recommendation**: fence the quotation, as the task's own Notes instruct. Then run
  `doc-links.js --file` on the report.
- **Priority**: P0

### MEDIUM Severity Issues (3)

**Issue: CR-1 — qa-story's writer check stages a gate that does not exist yet**

- **Severity**: MEDIUM · **Category**: Functional
- **Observation**: Output 1's block runs `git add` on the report and the gate. qa-story writes the
  gate afterwards (Output 2 / qa-gate). `git add` on a missing path is fatal and stages nothing.
  The link check then runs against an index without the report.
- **Recommendation**: stage the report alone in Output 1, or add the gate only if it exists.

**Issue: CR-2 — the bug-mode 8.5 post-condition cannot see a missing gap list**

- **Severity**: MEDIUM · **Category**: Functional
- **Observation**: the template always fills `## Step 5` (Decision, QA record, CI rollup), so
  `[ -n "$GAP_REPORT_BODY" ]` always passes in bug mode. A run whose 8.1 never wrote gap lines posts
  a comment with `GAP_COUNT=0`.
- **Recommendation**: in the bug branch, require `GAP_COUNT > 0`. Add a zero-gap fixture.

**Issue: QA-1 — two enumerations of the artifact set, already disagreeing**

- **Severity**: MEDIUM · **Category**: Maintainability
- **Observation**: the evaluator's `WORK_ITEM_ARTIFACT_RE` omits `sprint-review-summary`, but the
  corpus guard's `ARTIFACT_RE` includes it. There are 117 such tracked files, and CI link-checks
  them. One is already pinned dead in `KNOWN_ARTIFACT_LINKS`. `isCoLocatedArtifact` refuses them,
  so 8a cannot admit a red on one. `isWorkItemDocument` accepts one as a work-item document; that
  half is pre-existing on `develop`, and both halves were measured.
- **Recommendation**: add `sprint-review-summary` to the evaluator regex. Hold the two in agreement
  with a test.

### LOW Severity Issues (2)

- **CR-5** — the 8.3 bug-mode block guards only `DOC_FILE`. An unsubstituted `--status "{…}"`
  would be written as a literal row, and `{N}` names two different values in the notes.
- **CR-7** — the artifact corpus test asserts a 10 s wall clock. That is a timing gate on a
  runner-load variable, and this repo already carries two load-flaky suites.

**Total Issues**: HIGH: 1, MEDIUM: 3, LOW: 2

---

## NFR Assessment

### Performance — PASS

The artifact corpus walk takes about 2.0–2.6 s over 1,000+ files. No test opens a network
connection.

### Reliability — CONCERNS

CR-1 and CR-2 are both checks that pass or fail on the wrong state. QA-2 is a red CI.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 37 (copied from the run record's `totals.executed`)
- `isCoLocatedArtifact` is a boundary: a predicate whose `false` keeps a path out of
  fix-and-recheck scope. It was probed through a one-argument wrapper that fixes the document path.
  The cases were the 11 `path`-sink corpus inputs grafted onto the document's directory, 17 named
  refusals (other directory, subdirectory with a stem-shaped name, other stem, longer id, `.bug.`,
  `.yml`, `..`, NUL, absolute, backslash, `.MD`, `./`, trailing slash, empty, directory only, a
  non-artifact, the document itself) and 9 legitimate artifacts. Verdict `engages`: 0 reproduced,
  0 over-blocked. Record: `task.152.qa.1.security.run.json`.
- `fill-verification-complete.sh` refuses by its own header, but it takes two positionals, so the
  engine's `shell:` form cannot drive it and declines it. Its refusals are executed by the committed
  helper tests in bash and zsh. The `status-history.js` flag parser was considered; it guards usage,
  not a trust boundary.

### Maintainability — CONCERNS

QA-1.

---

## Code Review

Independent subagent over the whole-branch diff (13 files, 1,408-line patch).

**Correctness bugs (5):**

- [medium/high] `skills/qa-story/SKILL.md:1568` — the writer check stages a gate not yet written → stage the report alone. **Promoted: CR-1.**
- [medium/high] `skills/finalise/SKILL.md:2337` — the bug-mode post-condition is vacuous → require `GAP_COUNT > 0`. **Promoted: CR-2.**
- [medium/medium] `skills/finalise/SKILL.md:2331` — only 8.5's engine call was re-addressed from the repository root; 7.3, the `done` and board-warning LEADs, the tracker calls and fix-and-recheck still use bare `references/` → convert them together, with a population check. Advisory (future).
- [medium/medium] `shared/resources/status-history.js:216` — `sync-jira-bug` writes the same table in lowercase through the module API → normalise there. Advisory: the module API is out of scope by § 4 (future).
- [low/medium] `skills/finalise/SKILL.md:2214` — the 8.3 block's status placeholder is unguarded, and `{N}` is ambiguous → bind and guard. **Promoted as low: CR-5.**

**Cleanups (2):**

- `shared/resources/status-history.js:275` — an unreadable `--file` is reported as `usage` → use a distinct reason, or reword 8.3's guidance (future).
- `shared/resources/tests/doc-links.test.mjs:651` — the 10 s timing assertion can flake → drop it. **Promoted as low: CR-7.**

**Boundary rule:** `boundary: true` for `isCoLocatedArtifact` (`probes_executed: 37`). `fill-verification-complete.sh` is refused by the engine (two positionals) and covered by executed tests.

**Provenance:** QA-1's `isWorkItemDocument` half is present on the base (`origin/develop` has no `sprint-review-summary` in the evaluator). The `isCoLocatedArtifact` half is new. Both are recorded.

**Mutation spot checks (QA, independent of Step 3's M1–M21):**

mutation-proven: drop the helper's other-verdict refusal → fill helper GAPS test + refuses-ACCEPTED test (bash, zsh) → covered
mutation-proven: accept a flag-shaped operand in status-history.js → "a missing --file, a flag with no operand…" → covered

---

## Regression Testing

The full `npm run ci:fast` ran on the PR head: 4,263 tests, 4,261 pass, 1 fail (the artifact corpus
test, QA-2). `validate` passes for finalise, qa-task, qa-story and review-pr. PR CI shows
`shellcheck`, `validate` and branch-policy PASS, with `link-check` and `test` FAIL on the same line.

---

## Test Artifacts

### Files Reviewed

`shared/resources/{fill-verification-complete.sh,status-history.js,finalise-fix-and-recheck.mjs,finalise-fix-and-recheck-preconditions.json}`,
`skills/{finalise,qa-task,qa-story,review-pr}/SKILL.md`, the four test files, `CHANGELOG.md`.

### Test Commands Executed

```bash
npm run ci:fast                                      # 4,263 tests, 1 fail (QA-2)
npm run -s validate -- skills/<skill>/               # finalise, qa-task, qa-story, review-pr: pass
node .agents/skills/qa-task/references/security-probe.mjs --sink path \
  --entry '.claude/state/t152-probe-wrapper.mjs#admitsArtifact' \
  --cases-file .claude/state/t152-probe-cases.json --record task.152.qa.1.security.run.json --json
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/<skill>/SKILL.md \
  [--bind DOC_FILE=… | --bind TASK_DIR=…] --copy-as docs:docs --json
gh pr checks 495
```

### Coverage Report

Not measured: `node --test` runs without a coverage flag here. Coverage is argued per criterion
above, through the executed and mutation-proved tests.

---

## Recommendations

### Immediate Actions (Blocking)

1. QA-2 — fence the quotation in the implementation report so CI goes green (P0).
2. CR-1, CR-2, QA-1 (P1).

### Short-term Actions (Non-Blocking)

1. CR-5, CR-7 (low; fold into the same fix cycle).
2. CR-3, CR-4, CR-6 — follow-ups (gate `recommendations.future`).

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: CI is red on the PR head (HIGH). Three medium findings stand.
**Quality Score**: 50/100

**Deployment Recommendation**: BLOCKED
**Conditions**: QA-2 fixed and CI green; CR-1, CR-2 and QA-1 fixed.

---

**QA Report**: co-located at `task.152.qa.1.finalise-gaps-path-and-artifact-links.md`
**Gate File**: co-located at `task.152.gate.1.finalise-gaps-path-and-artifact-links.yml`
**Next Steps**: `/qa-fix` cycle 1
