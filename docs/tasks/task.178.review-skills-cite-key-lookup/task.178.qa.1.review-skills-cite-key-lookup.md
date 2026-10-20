# QA Report: Task 178 - review-task and review-story cite the §0a key lookup

**Task**: [task.178.review-skills-cite-key-lookup.md](./task.178.review-skills-cite-key-lookup.md)
**Gate File**: [task.178.gate.1.review-skills-cite-key-lookup.yml](./task.178.gate.1.review-skills-cite-key-lookup.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-12
**Testing Completed**: 2026-10-12
**Gate Status**: CONCERNS

---

## Executive Summary

All three phases landed as planned: the three restated greps now cite §0a, both skills ship the
step-0 document, and the new guard + fixture test is green and mutation-proven. One medium finding
blocks a clean pass: review-task's Jira-key branch is three fenced blocks that only work when run as
one shell, and the document never says so (CR-1).

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (CR-1 fixed)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed (14/14 checkboxes)
- [x] Tests passing
- [x] Breaking changes documented (CHANGELOG — prefix-only resolutions now report "no local document")
- [x] Code on feature branch with open PR (#636)

### Testing Approach

- [x] Automated Testing (guard + fixture test, full fast gate)
- [x] Regression Testing
- [x] Security Review
- [x] Code Review (Step 3b, independent subagent)

### Review Methodology

Direct tools (small task, 3 phases, low risk), plus one read-only Explore subagent for the Step 3b
diff review. First review — whole branch diff (`origin/develop...HEAD`), the two generated
`references/develop-pipeline-step-0-resolve-and-prepare.md` copies excluded from the patch (byte
copies of an unchanged source; `bundle:check` green). Reviewer duration: 68512 ms (from the
completion notice's `duration_ms`).

Step 4b: applies — both `SKILL.md` files changed fenced bash. `qa-execute-snippets.mjs` with
`--bind INPUT=RAPP-70 --bind JIRA_KEY=RAPP-70 --bind LOCAL_PATH=<task doc>`: review-task 21 blocks
(3 runnable, 0 placeholder, 18 mutating — deny-listed `gh`/`curl`/writes), 0 findings;
review-story 20 blocks (1 runnable, 3 placeholder, 16 mutating), 0 findings. Shells: bash only —
`zsh-unavailable` on this host; CI installs zsh.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Cite §0a at the three sites | CONCERNS | Verified | Citations correct; CR-1 on the split Jira-key block |
| Phase 2: Guard test | CONCERNS | Verified | 10 tests green; CR-2 on the key's flag spelling |
| Phase 3: CHANGELOG | PASS | Verified | `[Unreleased]` › Changed entry with the prefix-match note |

**Overall Phase Completion**: 3/3 phases delivered; 2 with findings.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| No canonical source restates the recursive key grep outside the §0a note | `tests/key-lookup-single-statement.test.js` "no canonical source restates…"; mutation: old grep and a single-quoted `-lr` variant each red | PASS (CR-2: other spellings unguarded) |
| review-task's Jira-key branch resolves a quoted key to its one task document, not a `.request.` sibling or prefix neighbour (bash + zsh) | same file, four "review-task Jira-key branch" tests; bash here, zsh in CI | PASS (holds only when the blocks run as one shell — CR-1) |
| Performance: none | one lookup replaces one | PASS |
| Guard green with red-on-revert mutation; `bundle:check` and full suite green | `npm run ci:fast` 5374 tests green (after staging the bundled copies); `bundle:check` 0 problems | PASS |
| `npm run validate` for both skills | `✓ review-task`, `✓ review-story` | PASS |
| Migration: none | — | PASS |

---

## Breaking Changes Validation

### Breaking Change: prefix-only resolution now reports "no local document"
Documented: Yes (CHANGELOG, task §5)
Migration Path Provided: Yes — none needed; correct by construction
Migration Tested: Yes — fixture `RAPP-7` reports no local document
Consumer Code Updated: N/A

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: CR-1 — Jira-key branch only works as one shell, and does not say so**
- **Severity**: MEDIUM
- **Category**: Functional / reliability
- **Observation**: `skills/review-task/SKILL.md:96-121` splits the branch into a bind block, the
  cited §0a block and a task-only check. The check reads `LOCAL_PATH` and `JIRA_KEY`; §0a reads
  `KEY_FIELD` / `KEY_VALUE`. Run as separate shells, §0a fails on its `:?` guard and the check
  prints "No local document found for Jira key ." for a key that resolves.
- **Impact**: an agent following the prose block by block gets a misleading not-found.
- **Recommendation**: say the three run as one shell; make the check loud on unbound inputs; test
  the check block alone.
- **Priority**: P1

### LOW Severity Issues (2)

- **CR-2** — the guard matches `r` and `l` only adjacent in one cluster; `grep -ril`, `grep -rEl`,
  `grep -r -l`, `grep --recursive -l` pass undetected.
- **BND-1** (deferred to task.180) — `boundary: true`; see Code Review.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Performance — PASS
One lookup replaces one; the guard scans the tracked population in ~50 ms.

### Reliability — CONCERNS
CR-1.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- No new input surface: `JIRA_KEY` passes the unchanged `^[A-Z]+-[0-9]+$` check before §0a reads it.

### Maintainability — PASS
Three restatements become citations; a guard and an executed fixture hold them.

---

## Code Review

Reviewer: independent Explore subagent, `code-review-prompt.md` verbatim. `code_review_blocking=true`
(pipeline override).

**Correctness bugs (2):**
- [medium/high] `skills/review-task/SKILL.md:111` — the split Jira-key branch reads values only
  another block binds → state one shell, fail loudly, test the block alone. **Promoted: CR-1.**
- [low/high] `tests/key-lookup-single-statement.test.js:40` — key misses non-adjacent `r`/`l`
  flags → parse the flag tokens. **Promoted: CR-2.**

**Cleanups (1):**
- `tests/key-lookup-single-statement.test.js:212` — mkdtemp fixtures never deleted → `fs.rmSync`
  in `t.after`.

Anchors: all three checked by `finding-anchors.js` against HEAD — `ok`.

**Boundary:** `boundary: true` — the task-only check (`case "${LOCAL_PATH##*/}" in task.[0-9]*`)
refuses a non-task document, an allow-list over a repository-state path. No `security-probe.mjs`
entry form reaches a fenced block (the `fence:` form is task.180, planned), so
`probes_executed: 0`. Recorded as BND-1, `status: deferred` to task.180; `/finalise` will need a
zero-guard override citing it. The fixture test executes the block on hostile-shaped cases (story
document, prefix neighbour, `.request.` sibling), but by-hand runs do not count toward probes.

**Mutation proofs:**

```
mutation-proven: re-inserted the old grep -rl "jira_key: …" into review-task → "no canonical source restates…" → covered
mutation-proven: re-inserted a single-quoted grep -lr variant → "no canonical source restates…" → covered
mutation-proven: task-only case widened to task.[0-9]*|story.[0-9]* → "a key on a story is refused as not a task" → covered
mutation-proven: the -z LOCAL_PATH check disabled → "an unknown key reports no local document" → covered
```

Four of four reverted, each red on the predicted test. (Two earlier attempts mutated text the
fixture builder asserts structurally, so every fixture test went red at once — discarded as
`wrong-test-red`, replaced by the behaviour-only mutations above.)

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full fast gate (`npm run ci:fast`, 5374 tests) | PASS |
| `tests/bundled-links.test.js` (citations resolve) | PASS once the copies are tracked |
| `tests/unbound-default-reads.test.js`, `tests/test-runner-reach.test.js` | PASS |
| `bundle:check` | PASS — 0 problems |

---

## Test Artifacts

### Files Reviewed
- `skills/review-task/SKILL.md`, `skills/review-story/SKILL.md`
- `tests/key-lookup-single-statement.test.js`
- `CHANGELOG.md`
- `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` (§0a, unchanged)

### Test Commands Executed
```bash
node --test tests/key-lookup-single-statement.test.js
npm run ci:fast
npm run bundle:check
npm run validate -- skills/review-task/
npm run validate -- skills/review-story/
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/review-task/SKILL.md --json
```

### Coverage Report
Not instrumented (prose + test-file change).

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1 — one-shell statement, loud unbound inputs, a block-alone test.

### Short-term Actions (Non-Blocking)
1. CR-2 — widen the guard key.
2. CR-3 — delete fixtures.
3. BND-1 — probe via task.180's `fence:` form.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one medium correctness finding on the Jira-key branch's shell boundary.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 fixed

---

**QA Report**: co-located at `task.178.qa.1.review-skills-cite-key-lookup.md`
**Gate File**: co-located at `task.178.gate.1.review-skills-cite-key-lookup.yml`
**Next Steps**: `/qa-fix` cycle 1
