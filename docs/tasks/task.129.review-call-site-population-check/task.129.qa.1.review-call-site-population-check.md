# QA Report: Task 129 - A call-site list in a task document is the author's recall, not a measurement

**Task**: [Link to task document](./task.129.review-call-site-population-check.md)
**Gate File**: [task.129.gate.1.review-call-site-population-check.yml](./task.129.gate.1.review-call-site-population-check.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-29
**Testing Completed**: 2026-09-29
**Gate Status**: CONCERNS

---

## Executive Summary

Both phases are delivered: `call-sites.js` with its CLI, the guard test consuming it with its populations unchanged (24 / 12), and the population check at all five prose sites. Every suite is green locally and in CI. The diff review found two high-confidence medium bugs in the collector's root resolution and in the shapes it can see, both reproduced here.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — CR-1 and CR-2 fixed

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#525)

### Review Methodology

Direct tools plus one read-only diff reviewer (Step 3b, whole-branch diff, first review). Step 4b ran the snippet engine over the five changed prose files.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: `call-sites.js` | CONCERNS | Verified | Lift is exact (membership and order match the old collector); CR-1, CR-2 in the new CLI and shapes |
| Phase 2: The review check | PASS | Verified | Five sites present, identical wording, both Agent C prompts carry `population_diff` |

**Overall Phase Completion**: 2/2 delivered, 1 with concerns

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --------- | ------ | ------ | ------ |
| CLI returns the guard's sites | 24 / 12 | 24 / 12 (same function, same order) | PASS |
| Unnamed site flagged on the task.121 fixture | 2 sites | 2 sites at `c69f5115^` (hand run; CR-7: no committed test) | PASS |
| Guard floors and proofs unchanged | unchanged | 14/14; red with the shared `.sh` root removed | PASS |
| CLI ≤ 2 s | ≤ 2 s | 0.17 s | PASS |
| One collector, no restated shape | yes | guard defines no regex | PASS |
| Mutation proof: remove a root → fixture names it | red | red on each of 6 mutations | PASS |

---

## Breaking Changes Validation

None documented, none found. The guard's population is unchanged.

---

## Issues Found

### MEDIUM Severity Issues (2)

**TASK-129-CR-1: an explicit `--root` inside a repository is replaced by the repo top level**
- **Observation**: `resolveRoot()` runs on `--root` too. `call-sites.js --engine gh-stage --root node_modules/.cs-probe` reports `root=<repo>` and count 12, reason `ok`.
- **Impact**: the "measure an earlier tree" path silently reports the current tree when the export sits inside a work tree.
- **Recommendation**: resolve to git top level only for the cwd default; take `--root` as given; test an export inside a repo.

**TASK-129-CR-2: `node "$VAR"` invocations are invisible**
- **Observation**: `scripts/setup-consumer.sh:614` runs `node "$_cli"` with `_cli` set to `gh-stage.js`/`jira-stage.js` at :595/:597; the collector reports 0 sites in `setup-consumer.sh`.
- **Impact**: the newly added `scripts/` root contributes nothing, and a list of gh-stage sites looks complete without it.
- **Recommendation**: collect in-file `VAR=…<engine>.js` assignments and match `node "$VAR"` against them.

### LOW Severity Issues (advisory — see Code Review)

CR-3 to CR-7.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 5 (advisory)

---

## NFR Assessment

### Performance — PASS
CLI 0.17 s on the live tree; guard test 0.4 s.

### Reliability — CONCERNS
CR-1 and CR-4 each make a returned number untrustworthy in a situation the prose names (an export; a consumer install).

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`. The collector is a measurement: nothing is gated on its result. Candidates considered and the signal each lacks: `isBannered` (unexported; excludes generated copies from a count, prevents no action), `ENGINES[*].re` (decide what is counted, not what is allowed), `--root`/`resolveRoot` (reads any directory by design; no containment claim in the header or the success criteria). No network, no writes, scanned content is never executed.

### Maintainability — PASS
One collector; the guard restates no shape; the presence test holds all five prose sites and was mutation-proved on four.

---

## Code Review

Whole-branch diff, 16 files / 2,079 lines. `code_review_blocking=true` (pipeline override); CR-1 and CR-2 promoted to `top_issues`.

**Correctness bugs (6):**
- [medium/high] `shared/resources/call-sites.js:235` — CR-1, explicit `--root` inside a repo resolved to the repo top → take `--root` as given.
- [medium/high] `shared/resources/call-sites.js:78` — CR-2, `node "$VAR"` invisible → track in-file engine-path assignments.
- [medium/medium] `shared/resources/tests/call-sites.test.mjs:256` — CR-3, fixture under `os.tmpdir()` fails when `TMPDIR` is inside a work tree → removed by the CR-1 fix.
- [medium/medium] `shared/resources/call-sites.js:121` — CR-4, `empty` conflates "no roots" (consumer install) with "no sites" → distinct reason.
- [low/medium] `skills/review-task/SKILL.md:942` — CR-5, `--engine gh-stage.js` is a usage error → accept the `.js` suffix.
- [low/low] `shared/resources/call-sites.js:163` — CR-6, a directory named `*.md` throws → skip non-regular files.

**Cleanups (1):**
- `shared/resources/tests/call-sites.test.mjs:300` — CR-7, the live-tree test compares a function with itself; commit the `c69f5115^` fixture as a test.

Provenance: all findings are in code this branch adds; none pre-exists on `develop`.

mutation-proven: shared `.sh` root removed → `comment-slot-coverage.test.mjs` (2 fail) → covered
mutation-proven: each of 6 collector mutations (scripts root, skills scripts root, banner exclusion, continuation, `--kind`, shared `.sh` root) → the named `call-sites.test.mjs` test → covered
mutation-proven: 4 prose mutations (review-story verdict, review-task numbering, create-task twin, Agent C schema) → `review-call-site-population-check.test.js` → covered

Platform variance: `TMPDIR=/tmp node --test shared/resources/tests/call-sites.test.mjs` → 17/17 (exit 0). CR-3 names the case that fails (`TMPDIR` inside a work tree).

---

## Regression Testing

`comment-slot-coverage.test.mjs`, `transition-protocol-parity.test.mjs`, `mutation-call-site-coverage.test.js`, both new suites: 76/76. Full `npm run ci:fast`: 4,564 pass, 0 fail. PR CI: SUCCESS 5/5 @ `a4132da0`.

---

## Test Artifacts

### Test Commands Executed
```bash
npm run ci:fast
node --test shared/resources/tests/call-sites.test.mjs shared/resources/tests/comment-slot-coverage.test.mjs tests/review-call-site-population-check.test.js evals/shared/tests/transition-protocol-parity.test.mjs tests/mutation-call-site-coverage.test.js
TMPDIR=/tmp node --test shared/resources/tests/call-sites.test.mjs
npm run validate -- skills/review-task/   # also review-story, create-task — all pass
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <each changed prose file> --copy . --json
```

Step 4b: review-task 17 blocks (1 placeholder, 16 mutating), review-story 19 (4 placeholder, 15 mutating), create-task 5 mutating, both prepass prompts 0 bash blocks. The one new block is a `{engine}` template slot, which `--bind` cannot fill; it was run by hand with `tracker-comment` substituted, under bash and zsh, from the repository root, for all three bundled paths → `ok 24` each.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 80/100
**Deployment Recommendation**: CONDITIONAL

**Next Steps**: `/qa-fix` for CR-1 and CR-2; CR-3 is expected to close with CR-1.
