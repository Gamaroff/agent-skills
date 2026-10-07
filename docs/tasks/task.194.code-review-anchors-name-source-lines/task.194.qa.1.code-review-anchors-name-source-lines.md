# QA Report: Task 194 - Code-review findings anchor to source lines

**Task**: [task.194.code-review-anchors-name-source-lines.md](./task.194.code-review-anchors-name-source-lines.md)
**Gate File**: [task.194.gate.1.code-review-anchors-name-source-lines.yml](./task.194.gate.1.code-review-anchors-name-source-lines.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-07
**Testing Completed**: 2026-10-07
**Gate Status**: CONCERNS

---

## Executive Summary

All four phases are in place and every success criterion holds on evidence: the prompt contract, the
six-verdict checker, the four wired dispatchers and the population guard. Replaying the PR #594
reviewer's real output through `/review-pr`'s Step 6 block marks all six patch-line anchors
`out-of-range` and posts only the corrected control inline. Two medium defects remain in the engine:
an unresolvable `--rev` reports every finding as `no-such-file` (CR-1), and the working-tree reader
follows a symlink out of the root (SEC-1, measured).

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (CR-1 and SEC-1 fixed)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (4/4 ticked)
- [x] Tests passing
- [x] Breaking changes documented (none — additive fields)
- [x] Code on feature branch with open PR (#596)

### Testing Approach

- [x] Automated Testing (unit, contract, jq-run)
- [x] Integration Testing (PR #594 replay through review-pr Step 6 and `--inline`)
- [x] Security Review (probe engine, `path` sink)
- [x] Code Review (independent diff reviewer)
- [x] Regression Testing

### Review Methodology

Default strategy: direct tools, plus one read-only Explore subagent for the diff code review
(dispatched 10:16:20 UTC, returned after 111 s — `duration_ms` 111229). The review diff excluded
generated `references/` copies and the task directory: 16 files, 1423 patch lines. First review; no
prior gate.

Step 4b: run over the 6 changed runnable-prose files — no execution failures. `review-pr/SKILL.md`
reports `zero-blocks-executed` (1 placeholder, 17 mutating): its new Step 6 block needs
`{findings-json}` and `HEAD_REV`. That block was executed by hand with real bindings as the
integration test below, so the placeholder is covered.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Prompt contract | PASS | Verified | `file_line` defined as the PR-head line, patch line excluded by name; `line_text` in schema and rules; conformance prompt states the same for a `path:line` `ref` |
| Phase 2: Checker engine | CONCERNS | 19/19 | CR-1 (bad `--rev`) and SEC-1 (symlink) below |
| Phase 3: Wire the four dispatchers | PASS | Verified | Each dispatcher runs the checker in a fenced block; `--inline` filters on `anchor_check`; `--fix` skip; `top_issues[]` wording |
| Phase 4: Population guard and release notes | PASS | 9/9 | Population derived from the tree, floor 4; CHANGELOG entry |

**Overall Phase Completion**: 4/4 delivered, 1 with concerns

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| SC-1 `file_line` is the PR-head line, patch line excluded | PASS | `shared/resources/code-review-prompt.md` Rules bullet; the reviewer's own three anchors in this cycle all checked `ok` |
| SC-2 `line_text` in schema and rules | PASS | Same file, schema example and Rules |
| SC-3 six verdicts, PR #594 shape, long-file control | PASS | `finding-anchors.test.mjs` (out-of-range at 77 of 11; text-mismatch at 77 of 120) |
| SC-4 CLI 0/1/2, `--rev` reads the revision | PASS with CR-1 | Tests cover 0, 1, 2 and `--rev`; CR-1 shows an unresolvable rev exits 1, not 2 |
| SC-5 dispatchers run the checker, marker present | PASS | `finding-anchors-callers.test.mjs` |
| SC-6a no malformed anchor posts inline | PASS | review-pr and review-code jq-run tests; PR #594 replay posted only the control |
| SC-6b `--fix` skip, `top_issues[]` wording | PASS | `finding-anchors-callers.test.mjs` |
| SC-7 one read per path | PASS | counting-`readFile` unit test |
| SC-8 `npm test` | PASS | fast gate 5474/5477 at Step 3; the 2 LOAD-SENSITIVE files green alone; focused suites 61/61 at `fa1b9676` |
| SC-9 `bundle:check` | PASS | 129 skills, 0 problems |
| SC-10 `quick_validate.py` / `npm run validate` | PASS | all four skills |
| SC-11 mutation proofs | PASS | 4 proofs recorded in the task (see Code Review) |
| SC-12 CHANGELOG | PASS | `[Unreleased]` › Fixed names the four skills and `line_text` |

---

## Breaking Changes Validation

None declared. `line_text` and `anchor_check` are additive; the `top_issues[]` shape and the
machine-readable block's existing keys are unchanged (`pr-review-loop-parity.test.mjs` 50/50).

---

## Issues Found

### MEDIUM Severity Issues (2)

**Issue: An unresolvable `--rev` reads as "the reviewer is wrong" (CR-1)**
- **Severity**: MEDIUM
- **Category**: Reliability
- **Bug Report**: [task.194.bug.1.bad-rev-reads-as-no-such-file.md](./task.194.bug.1.bad-rev-reads-as-no-such-file.md)
- **Observation**: `--rev no-such-rev` gives `malformed-anchors`, exit 1, and `no-such-file` for all three findings.
- **Impact**: An unfetched head marks every anchor unverified, nulls `file` in `top_issues[]` and skips every `--fix`, with nothing saying the checker could not look.
- **Recommendation**: Verify the rev once; exit 2 with a named reason when it does not resolve.

**Issue: The working-tree reader follows a symlink out of `--root` (SEC-1)**
- **Severity**: MEDIUM
- **Category**: Security
- **Bug Report**: [task.194.bug.2.reader-follows-symlink-out-of-root.md](./task.194.bug.2.reader-follows-symlink-out-of-root.md)
- **Observation**: `security-probe.mjs --sink path` against `makeReader`: `symlink-escape` accepted; 7 other hostile cases rejected; 3 legitimate accepted.
- **Impact**: A finding naming `link/passwd:1` with a wrong `line_text` prints a line of an outside file in `actual`.
- **Recommendation**: Compare real paths of the file and the root.

### LOW Severity Issues (0)

Advisory code-review findings CR-2 and CR-3 are recorded below; they are not gate issues.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 0

---

## NFR Assessment

### Performance — PASS
SC-7 held by test: three findings on two paths make two reads.

### Reliability — CONCERNS
CR-1.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 11
- Boundary: `makeReader`'s containment check (refuses a path that climbs out of `--root`). Probed
  through a scratch ESM wrapper over a fixture root with `security-probe.mjs --sink path`; run record
  `task.194.qa.1.security.run.json` (its `.d/` also holds a first attempt whose CJS wrapper the engine
  could not import — 0 executed, superseded). One hostile case accepted: SEC-1.

### Maintainability — PASS
One engine, four callers, a derived population guard; the four skills validate.

---

## Code Review

Independent reviewer, whole-branch diff (first review). Every reviewer anchor checked `ok` with
`finding-anchors.js --rev HEAD` — the prompt change held on a live reviewer.

**Correctness bugs (3):**
- [medium/high] `shared/resources/finding-anchors.js:140` — every `git show` failure returns null, so an unresolvable `--rev` reports all findings `no-such-file` → verify the rev once, exit 2. **Promoted to gate `top_issues` as CR-1 (code_review_blocking).**
- [medium/medium] `skills/review-pr/SKILL.md:878` — the `--inline` jq drops any finding with no `anchor_check`, and the block reads `$FINDINGS_JSON` unbound (same at `skills/review-code/SKILL.md:148`) → bind it to the Step 6 placeholder and refuse un-annotated input. Advisory (confidence medium).
- [low/medium] `skills/review-pr/SKILL.md:593` — the API-diff head fetch `pull/<n>/head` is GitHub-only → add a Bitbucket route or report unchecked. Advisory.

**Cleanups (0).**

**Boundary rule:** `boundary: true` — `makeReader` refuses paths outside `--root`. `probes_executed: 11`
(from the run record's `totals.executed`). One finding: SEC-1, promoted to `top_issues`.

**Provenance (5b):** CR-1 and SEC-1 are in code this branch adds (`finding-anchors.js` is new) — not
pre-existing.

mutation-proven: `finding-anchors.js` call removed from qa-story (copy) → `finding-anchors-callers` qa-story case → covered
mutation-proven: `line_text` comparison replaced with `true` → `long-file control` → covered
mutation-proven: `anchor_check` select removed from review-pr `--inline` jq → `inline-comment jq snippet` → covered
mutation-proven: anchor regex reverted to `^(.+?):` → `no-line: … compound conformance ref` → covered

(Development-time proofs from Step 3, re-read here; no fix landed this cycle.)

---

## Regression Testing

| Area | Result |
| --- | --- |
| `pr-review-loop-parity.test.mjs` (`ref` ← `file_line` normalisation) | PASS |
| `review-pr.test.js` | PASS (248/248, Step 3) |
| `review-code.test.js` jq-run | PASS |
| Fast gate | PASS except 2 LOAD-SENSITIVE budgets, green alone |

---

## Test Artifacts

### Integration — PR #594 replay

The PR #594 reviewer's real output (patch lines `slugify.js:77`, `:74`, `slugify.test.js:101`,
`:102`, `pad.js:59`, `:57`), a corrected control (`slugify.js:8`) and the two compound conformance
refs were run through `/review-pr` Step 6's block, placeholders bound
(`HEAD_REV=origin/feature/task.900.review-pr-smoke-slugify`), then through Step 8's `--inline` jq
extracted from `SKILL.md`:

```
checker rc=1  malformed-anchors
CR-1 out-of-range 77/11   CR-2 out-of-range 74/11   CR-3 out-of-range 101/16
CR-4 out-of-range 102/16  CR-5 out-of-range 59/10   CR-6 out-of-range 57/10
CR-7 unchecked-text 8     PC-1 no-line              PC-3 no-line
inline set: [ slugify.js:8 — the control only ]
```

### Test Commands Executed

```bash
command node --test shared/resources/tests/finding-anchors.test.mjs evals/shared/tests/finding-anchors-callers.test.mjs evals/shared/tests/pr-review-loop-parity.test.mjs   # 59/59
command node --test --test-name-pattern='inline-comment jq' skills/review-pr/tests/review-pr.test.js skills/review-code/tests/review-code.test.js   # 2/2
npm run validate -- skills/{review-pr,review-code,qa-task,qa-story}/   # all ✓
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <each changed SKILL.md / prompt> --json
command node shared/resources/security-probe.mjs --sink path --entry 'reader.mjs#read' --repo-root <scratch> --record <scratch>/qa1.security.run.json --json
command node .agents/skills/qa-task/references/finding-anchors.js --findings-file <findings> --rev no-such-rev --json   # CR-1 reproduction
```

### Coverage Report

Not measured (the repository has no coverage tooling for these suites).

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1 — verify `--rev` once; exit 2 when it does not resolve.
2. SEC-1 — refuse a real path outside the real root.

### Short-term Actions (Non-Blocking)
1. CR-2 — bind `$FINDINGS_JSON` in the `--inline` blocks and refuse un-annotated findings.
2. CR-3 — a Bitbucket route for the PR head on the API-diff path.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Two medium engine defects, both with a direct fix; nothing blocks the design.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 and SEC-1 fixed.

---

**QA Report**: co-located at `task.194.qa.1.code-review-anchors-name-source-lines.md`
**Gate File**: co-located at `task.194.gate.1.code-review-anchors-name-source-lines.yml`
**Next Steps**: `/qa-fix` for CR-1 and SEC-1, then QA cycle 2.
