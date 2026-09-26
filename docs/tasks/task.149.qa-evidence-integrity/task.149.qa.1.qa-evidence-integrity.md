# QA Report: Task 149 - QA evidence integrity: qa-task/qa-story claims that no check reads back

**Task**: [task.149.qa-evidence-integrity.md](./task.149.qa-evidence-integrity.md)
**Gate File**: [task.149.gate.1.qa-evidence-integrity.yml](./task.149.gate.1.qa-evidence-integrity.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-26
**Testing Completed**: 2026-09-26
**Gate Status**: FAIL

---

## Executive Summary

All five phases are implemented as planned and every engine test is green (4178/4179, 1 skipped).
But the one new **boundary** the task adds — `--copy-as` DEST containment — was executed through the
probe engine and does not hold: a symlink that `--copy` seeded into the working copy lets a DEST that
passes the string check write outside the sandbox. The task names that exact outcome as a critical
rollback trigger. Separately, the new read-back step computes its result and never acts on it.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (20/20 plan items ticked)
- [x] Tests passing
- [x] Breaking changes documented (none to public contracts)
- [x] Code on feature branch with open PR (#493, OPEN)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, population, corpus)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review (probe engine, 27 cases executed)
- [x] Code Review

### Review Methodology

Direct tools plus the Step 3b diff reviewer (one read-only Explore subagent, dispatched 04:38 →
returned 04:41). First review — no prior gate; whole branch diff against `origin/develop`, with the
51 regenerated `skills/*/references/` copies excluded from the reviewer's patch (byte copies of the
reviewed sources, held by `npm run bundle -- --check`). Standard mode; traceability mapper not used
(Success Criteria are checkbox lists, not a table).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: `--copy-as` (obs #143) | CONCERNS | Verified | QA-18..21 green; containment escapes through a seeded symlink (TASK-149-BUG-1) |
| Phase 2: export-and-probe (obs #156) | PASS | Verified | Absent vs non-function export told apart; §4 row and both step-3 sites updated |
| Phase 3: standards-named commands (obs #163) | PASS | Verified | qa-task Step 4, qa-story Phase 4, create-task Section 9, both template copies |
| Phase 4: read-back (obs #164) | CONCERNS | Verified | Engines engage; the Step 12b / 3e blocks never act on the result (TASK-149-BUG-2) |
| Phase 5: population test, bundle, docs | PASS | Verified | 13 tests, ~0.55 s; bundle adds doc-links.js to both QA skills; CHANGELOG cites (task 149) |

**Overall Phase Completion**: 5/5 implemented; 3/5 without issues.

---

## Success Criteria Verification

**Functional:**

| Criterion | Target | Actual | Status | Notes |
| --------- | ------ | ------ | ------ | ----- |
| `--copy-as docs:docs` passes a block `--copy docs` fails; escaping/absolute DEST exit 2, no leak | Yes | Lexical escapes refused; symlink escape writes outside | FAIL | TASK-149-BUG-1 |
| Unexported predicate → `not exported` + `export it`; non-function keeps its message | Yes | Yes | PASS | security-probe.test.mjs, 89/89 |
| `doc-links --json` labels `untracked` / `missing`, markers unchanged | Yes | Yes | PASS | ignored files also read `untracked` (CR-2, low) |
| `change-log --check-updated` exit 1 on a later row, 0 otherwise, fenced ignored | Yes | Yes | PASS | Probe: engages 14/14 |
| Eleven prose sites carry their rule, section-scoped | Yes | Yes | PASS | 32/32 patterns mutation-proved at develop |

**Performance:** population test < 1 s — PASS (0.55 s); engine tests add no network and clean their temp dirs — PASS.

**Code Quality:** mutation proofs recorded in the implementation report — PASS; `npm run ci:fast`
(format + test), `bundle --check`, `check:generated` clean at develop — PASS; `npm run validate` for
qa-task, qa-story, create-task, review-task — PASS (re-run this cycle).

**Migration:** CHANGELOG cites (task 149) — PASS; §5 count 130 → 132, difference explained (two docs
the old reader skipped) — PASS as annotated; observations actioned on merge — pending (post-merge).

---

## Breaking Changes Validation

### Breaking Change: none to public contracts
Documented: Yes — §5 lists each additive change
Migration Path Provided: N/A
Migration Tested: N/A
Consumer Code Updated: N/A — `finalise-fix-and-recheck.mjs` `RED_MARKER` still matches the `✖` line (its tests are in the green run)

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: `--copy-as` DEST containment is lexical — a seeded symlink writes outside the sandbox**
- **Severity**: HIGH
- **Category**: Security
- **Bug Report**: [task.149.bug.1.copy-as-symlink-escape.md](./task.149.bug.1.copy-as-symlink-escape.md)
- **Observation**: `--copy <seed-with-symlink-out>` then `--copy-as SRC:out/sub` exits 0 and creates `sub` at the symlink's target
- **Impact**: the write-outside-sandbox outcome the task's rollback plan calls critical
- **Recommendation**: realpath the deepest existing ancestor of `target`; refuse outside `realpath(tmp)`
- **Priority**: P1

### MEDIUM Severity Issues (1)

**Issue: Step 12b / item 3e never act on the read-back result**
- **Severity**: MEDIUM
- **Category**: Quality / Reliability
- **Bug Report**: [task.149.bug.2.step-12b-no-mechanical-halt.md](./task.149.bug.2.step-12b-no-mechanical-halt.md)
- **Observation**: `LINKS_RC` / `LOG_RC` are assigned and never read; `untracked` and `missing` share exit 1
- **Impact**: the halt on a missing link depends on the agent reading JSON — the self-report obs #164 targets
- **Recommendation**: derive the halt in the block from `broken[].state` and `LOG_RC`
- **Priority**: P2

### LOW Severity Issues (2)

- **CR-2** `shared/resources/doc-links.js` — a gitignored target on disk is reported `untracked`, which the prose calls not a defect while CI stays red.
- **CR-4** `skills/qa-story/SKILL.md` / `skills/qa-task/SKILL.md` — the new blocks read `$STORY_FILE` / `$TASK_DIR` without a `:?` guard naming the missing input.

**Total Issues**: HIGH: 1, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Performance — PASS
Population test ~0.55 s; the engine additions are a loop over `copyAs` pairs and one `existsSync`
per broken link.

### Reliability — CONCERNS
The read-back step's halt is prose-level only (TASK-149-BUG-2).

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 27 (run record `totals.executed`)
- Boundaries identified in the diff and probed with `security-probe.mjs` (`cli:` form, cases files):
  - `qa-execute-snippets.mjs --copy-as` DEST containment — **present-but-inert**, 12/13: every
    lexical escape (`../`, `../../`, absolute, `docs/../../`, `./../`, `..`, empty) refused, every
    legitimate DEST (`docs`, nested, `.`, `a/../b`, `..hidden`) accepted; `copy-as.symlink-through`
    **accepted** and the write outside the sandbox confirmed on disk.
  - `change-log.js --check-updated` — **engages**, 14/14 (stale plain/quoted/ISO/with-time/H3-numbered/
    CRLF/markers/non-last-row refused; equal, fenced-later, other-table-later, no-log, no-updated,
    newer-updated accepted).
- Predicate-shaped functions the diff adds that are **not** boundaries: the security-probe child's
  absent-export branch (selects a decline message; the verdict `entry-not-probeable` is unchanged)
  and doc-links' `state` (labels a link already judged broken; the accept/reject decision predates
  this change).

### Maintainability — PASS
Shared section reader; §5 now reads through the engine.

---

## Code Review

Advisory findings from Step 3b; `code_review_blocking` resolved **true** (pipeline override). No
reviewer finding was `bug` + `high` confidence, so none was auto-promoted. TASK-149-BUG-1 enters the
gate on the **probe's** reproduction (CR-3 is the same defect, rated low by the reviewer); CR-1 was
verified by QA and enters as TASK-149-BUG-2.

**Correctness bugs (5):**
- [medium/medium] `skills/qa-task/SKILL.md:1253` — Step 12b / 3e set `LINKS_RC` / `LOG_RC` and never read them; one exit code for two states → **TASK-149-BUG-2**
- [low/low] `shared/resources/doc-links.js` — a gitignored target reads `untracked` → gate CR-2 (low)
- [low/low] `shared/resources/qa-execute-snippets.mjs` — lexical containment follows seeded symlinks → **TASK-149-BUG-1** (HIGH on the probe's reproduction)
- [low/medium] `skills/qa-story/SKILL.md:1820` — `$STORY_FILE` / `$TASK_DIR` read without a guard → gate CR-4 (low)
- [low/low] `skills/qa-story/SKILL.md:1799` — other Change Log writers have no read-back (CR-5) → `recommendations.future` (outside this task's QA-skill scope)

**Cleanups (0).**

**Boundary rule**: `boundary: true` — two boundaries, both probed (above). `probes_executed: 27`.

**Mutation proofs (Step 3c)**: first cycle — no fix made this cycle to spot-check. The develop step's
proofs are recorded in the implementation report (engine reverts red; 32/32 prose patterns red).

**Platform variance**: the containment check compares against `join(mkdtempSync(tmpdir()), "work")`
without `realpath` on either side; on macOS `tmpdir()` sits under a `/var` → `/private/var` symlink.
The lexical comparison is self-consistent (both sides unresolved), and QA-20 passed on this host.
Under `TMPDIR=/tmp` the whole snippet suite was not re-run this cycle; the fix for TASK-149-BUG-1
introduces `realpath`, which is where the variance becomes live — re-run then.

---

## Step 4b — Execute the Documented Commands

- `skills/create-task/SKILL.md`, `qa-runnable-prose-detection.md`, `probe-boundary-rule.md`: exit 0.
- `skills/qa-task/SKILL.md` (18 blocks: 3 placeholder, 15 mutating) and `skills/qa-story/SKILL.md`
  (16: 4 placeholder, 12 mutating): `zero-blocks-executed`. **Pre-existing** — the same files on
  `origin/develop` give the identical finding (17 and 15 blocks). The new Step 12b / 3e blocks are
  classified `mutating` (`git add`, `node`) and refused by design → `recommendations.future`.
- Step 12b itself is exercised for real by this QA cycle, after Step 12 (below).

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| `finalise-fix-and-recheck` reads the `✖` marker red | PASS (in the green run) |
| §5 corpus guard after the reader switch | PASS — 132 checked, 0 offenders |
| `outcome-reachability-check.test.js` after the section-reader move | PASS — 12/12 |
| `skill-protocol.test.js` template-copy parity | PASS |

---

## Test Artifacts

### Files Reviewed
`shared/resources/{qa-execute-snippets.mjs,security-probe.mjs,doc-links.js,change-log.js}`, their
tests, `tests/{qa-evidence-integrity,work-item-artifact-naming,outcome-reachability-check}.test.js`,
`tests/lib/markdown-section.js`, qa-task / qa-story / create-task SKILL.md, both `task-template.md`.

### Test Commands Executed
```bash
npm test                                                   # 4179 tests, 4178 pass, 0 fail, 1 skipped
npm run validate -- skills/qa-task/                        # ✓ (standards-named — Step 4 rule)
npm run validate -- skills/qa-story/                       # ✓
npm run validate -- skills/create-task/                    # ✓
npm run validate -- skills/review-task/                    # ✓
node shared/resources/qa-execute-snippets.mjs --file <each changed prose file> --copy-as docs:docs --json
node shared/resources/security-probe.mjs --entry cli:shared/resources/qa-execute-snippets.mjs \
  --argv '["--file","<SKILL.md>","--no-zsh","--copy","<seed>","--copy-as","{input}"]' \
  --cases-file <copy-as.cases.json> --name "qa-execute-snippets --copy-as DEST containment" \
  --record task.149.qa.1.security.run.json --json         # present-but-inert 12/13
node shared/resources/security-probe.mjs --entry cli:shared/resources/change-log.js \
  --argv '["--check-updated","--file","{input}"]' --cases-file <coherence.cases.json> \
  --name "change-log --check-updated coherence" --record task.149.qa.1.security.run.json --json   # engages 14/14
```

### Coverage Report
Not measured (the repo's `node --test` suite has no coverage lane).

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-149-BUG-1 — realpath-based DEST containment, with a seeded-symlink test (P1).
2. TASK-149-BUG-2 — a mechanical halt in the Step 12b / 3e blocks, held by the population test (P2).

### Short-term Actions (Non-Blocking)
1. CR-2 — an `ignored` state for gitignored targets.
2. CR-4 — `:?` guards on the blocks' inputs.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: a reproduced write outside the sandbox from the boundary this task adds (rule 1:
any high → FAIL), plus one medium.
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.149.qa.1.qa-evidence-integrity.md`
**Gate File**: co-located at `task.149.gate.1.qa-evidence-integrity.yml`
**Next Steps**: `/qa-fix` cycle 1 → re-review (cycle 2, full-diff refute pass)
