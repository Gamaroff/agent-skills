# QA Report: Task 329 - A git-name sink for classifiers of repository names

**Task**: [task.329.git-name-probe-sink.md](./task.329.git-name-probe-sink.md)
**Gate File**: [task.329.gate.1.git-name-probe-sink.yml](./task.329.gate.1.git-name-probe-sink.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-26
**Testing Completed**: 2026-11-26
**Gate Status**: PASS

---

## Executive Summary

QA reviewed the whole branch diff (PR #956) for the new `git-name` sink, the routing prose and the
probe tests. All three phases are complete. Every `isDocsPath` mutation turns the HEAD probe test
red, with exactly the hostile cases it names reproducing. The diff review found no bugs. It found
three wording errors in the new corpus prose, which QA confirmed against the source; they are open
as LOW entries.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete
- [x] All implementation phases completed (checkboxes ticked; diff matches the plan)
- [x] Tests passing (fast gate; one load flake, see below)
- [x] Breaking changes: none
- [x] Code on feature branch with open PR (#956, OPEN)

### Testing Approach

- [x] Automated Testing (unit, mutation)
- [x] Regression Testing
- [x] Security Review
- [x] Code Review

### Review Methodology

- **Direct tools.** This is a small, low-risk task with three phases in one module. The diff review
  was one read-only Explore subagent, dispatched at about 14:05Z. It returned in 113.9 s
  (`duration_ms`).
- **Diff review: code review.** The change set includes `.mjs` code. The diff reviewed was
  `origin/develop...HEAD` without the generated `skills/*/references/*` copies, which
  `npm run bundle:check` holds in sync (0 problems).
- **Mutation proofs** ran in a scratch `git worktree` at HEAD (`d38fa3a27`), not in the tree the
  reviewer was reading. Each edited file was restored from its `cp` snapshot and checked with `cmp`.
- **Step 4b: no changed blocks.** `qa-execute-snippets.mjs --diff-base` on the four changed prose
  files reports `changed.total: 0` for each. The edits are prose, outside every fenced block.
- CI on d38fa3a27770: pending

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: the sink | PASS | Verified | `SINKS` has `git-name` after `path`; 14 hostile and 8 legitimate cases; `CORPUS` and `SINK_BLURB` entries; `.md` regenerated; "eight sinks" |
| Phase 2: the routing | PASS | Verified | Both enumerations list the sink; the `git-name` vs `path` rule is in both prompts and `probe-boundary-rule.md`; the `isDocsPath` row is in the disqualified table |
| Phase 3: proof and records | PASS | Verified | Three probe tests, the `path` pin, CHANGELOG `[Unreleased]` `### Added`, bundle |

**Overall Phase Completion**: 3/3 phases passed

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| Every § 8 row holds in a test | PASS | `security-probe.test.mjs` "task.329: … engages at HEAD" (HEAD row), "each isDocsPath refusal removed reproduces exactly its git-name cases" (mutation rows), "every git-name hostile case is reached by a mutation" (coverage); `security-input-corpus.test.mjs` `FLOORS["git-name"]`. The trailing-slash input is `docs/guides/`; the reason is recorded in the task doc |
| `corpusFor("path")` unchanged, held by a test | PASS | `security-input-corpus.test.mjs` "the path corpus is unchanged by the git-name sink (task.329)"; mutation M6 below turns it red |
| Every § 8 mutation recorded in the QA report with the test it turned red | PASS | § Mutation records below (record criterion; its location is this report) |
| `npm run test:remote` and `npm run bundle:check` pass | PASS (with a note) | `bundle:check`: 0 problems. `test:remote` run 2: 8898 pass, 1 fail. The failure is `push-policy.test.mjs:1498` ("push-held says what is the remote's…"), 139 s under load; alone it passes in 26 s. The diff does not touch push-policy. CI on the PR decides |
| Both prompts and `probe-boundary-rule.md` say when to choose `git-name` over `path` | PASS | `finalise-dod-security-prompt.md` § 2 (Sinks line and the following sentence), `security-review-prompt.md` § Choosing the sink (table row and the sentence after it), `probe-boundary-rule.md` § boundary: internal |
| CHANGELOG `[Unreleased]` names the sink and the routing rule | PASS | `changelog-cites.sh task.329` → `cites (task 329)`; the entry is under `### Added` |

### Mutation records

Each record removes a refusal line from the real `shared/resources/ci-tree-equivalence.js` in a
scratch worktree, then runs the committed test. Before each run, `cmp` against the snapshot showed
the mutation was applied. The test predicted to go red for M1–M5 was "task.329: isDocsPath through
the git-name sink engages at HEAD".

- mutation-proven: M1 control-character check removed → "task.329: … engages at HEAD" red; reproduced `control-char`, `tab`, `nul`; overblocked none → covered
- mutation-proven: M2 empty/`.`/`..` segment check removed → same test red; reproduced `dot-dot-segment`, `empty-segment`, `trailing-slash` → covered
- mutation-proven: M3 `.git` segment check removed → same test red; reproduced `dot-git-root`, `dot-git-bare`, `dot-git-nested`, `dot-git-case` → covered
- mutation-proven: M4 config-basename check removed → same test red; reproduced `config-root`, `config-nested` → covered
- mutation-proven: M5 segment and normalise checks removed → same test red; reproduced the M2 three plus `leading-slash`, `dot-slash` → covered
- mutation-proven: M6 `path.leading-dot` direction legitimate → hostile → "the path corpus is unchanged by the git-name sink (task.329)" red (and the floor and doc-parity tests) → covered
- mutation-proven: M7 the `git-name` floor removed → "every sink declares a floor, so a new sink cannot pass vacuously" red → covered
- mutation-proven (Step 3, implementation): a reworded control anchor → "each isDocsPath refusal removed reproduces exactly its git-name cases" red, naming the anchor → covered

M6 and M7 were applied together, so the five red tests are their union. The path-pin test is red
only because of M6, and "every sink declares a floor" only because of M7. Baseline after restoring:
24/24 and 3/3 green.

---

## Breaking Changes Validation

None. `path` is unchanged, and a test now pins it. Adding a member to `SINKS` widens the accepted
`--sink` values, and every `SINKS` consumer derives from the array.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (3)

- **T329-QA-1**: `security-input-corpus.mjs:743`. `git-name.control-char` says git quotes a control
  character "unless core.quotePath is off". In fact git escapes control characters whatever that
  setting is; only `-z` output carries them raw.
- **T329-QA-2**: `security-input-corpus.mjs:785`. `git-name.encoded-traversal-literal` says the input
  has "no `..` in it". It contains `..` twice; what `isDocsPath` refuses is a whole `..` segment.
- **T329-QA-3**: `security-input-corpus.mjs:821`. `git-name.dotfile` says "only a segment equal to
  `.git` is internal". `isDotGitSegment` (`ci-tree-equivalence.js:135`) also refuses case variants,
  trailing dots or spaces, ignorable code points and `git~1`.

The reviewer filed these as cleanups. QA confirmed each one against its source, so they are gate
entries. They do not change the verdict: per the deterministic rules, LOW entries do not move the
gate.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 3

---

## NFR Assessment

### Performance — PASS
The mutation test spawns five probe runs, about 9 s locally. No shipped hot path changed.

### Reliability — PASS
The anchors fail loudly when `isDocsPath` is rewritten (calibrated in Step 3). They accept both the
develop and the task-325 spelling, and all three tests pass against 325's version. The scratch root
is removed in `finally`.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`. The diff adds no accept/reject function to shipped code. The one predicate-shaped
  function it adds, `isDocsAnchor` in the test file, is a test assertion and lacks the input-gate
  signal. `boundary_signals: []` (`probe-boundary-signals.mjs`). The committed tests execute all 22
  `git-name` cases against `isDocsPath`, and that is test evidence.

### Maintainability — PASS
There is one corpus definition, and its generated `.md` peer sits under a parity test. The routing
rule is stated in each of the three places that choose a sink.

---

## Code Review

**Correctness bugs (0):** none.

**Cleanups (3):**
- `shared/resources/security-input-corpus.mjs:743` — the control-character rationale gets
  `core.quotePath` wrong → reword (promoted as T329-QA-1)
- `shared/resources/security-input-corpus.mjs:785` — "no `..` in it" is false as a substring →
  "no `..` segment" (promoted as T329-QA-2)
- `shared/resources/security-input-corpus.mjs:821` — "only a segment equal to `.git`" is narrower
  than `isDotGitSegment` → name its spellings (promoted as T329-QA-3)

All three anchors check `ok` (`finding-anchors.js --rev HEAD`).

---

## Regression Testing

| Area | Result |
| --- | --- |
| `security-input-corpus.test.mjs` (24) | PASS |
| `finalise-dod-prompt-contract.test.mjs` (restated-input guard) | PASS. It caught `docs/` in development; the input is now `docs/guides/` |
| `security-probe.test.mjs` `validateCases` over every sink | PASS |
| `npm run validate` on finalise, qa-story, qa-task, review-security | PASS (rc 0 each) |
| Full `ci:fast` on .249 | 8898 pass, 1 load flake (push-policy, passes alone) |

---

## Test Artifacts

### Test Commands Executed

```bash
npm run test:remote                    # run 1: prettier red (fixed); run 2: 8898/1
command node --test --test-name-pattern="push-held says what is the remote" shared/resources/tests/push-policy.test.mjs   # 1/1, 26 s
npm run bundle:check                   # 0 problems
npm run -s validate -- skills/{finalise,qa-story,qa-task,review-security}/
command node .agents/skills/qa-task/references/probe-boundary-signals.mjs --doc <task> --json   # []
command node .agents/skills/qa-task/references/criteria-drift.js --doc <task> --base-from-review develop --json   # clean
bash .agents/skills/qa-task/references/changelog-cites.sh task.329   # cites (task 329)
```

### Coverage Report
Not measured: the repository has no coverage instrument for `node --test` suites.

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. Fix the three LOW wording entries (T329-QA-1, T329-QA-2, T329-QA-3), then regenerate the `.md` table.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: All criteria hold, with mutation proof. No bugs were found. Three LOW wording errors are open.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.329.qa.1.git-name-probe-sink.md`
**Gate File**: co-located at `task.329.gate.1.git-name-probe-sink.yml`
**Next Steps**: fix the LOW entries in the fix loop; then 5c `/review-pr`; then `/finalise`.
