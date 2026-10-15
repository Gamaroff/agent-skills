# QA Report: Task 205 - PRD-scoped epic numbering (cycle 6)

**Task**: [task.205.prd-scoped-epic-numbering.md](./task.205.prd-scoped-epic-numbering.md)
**Gate File**: [task.205.gate.6.prd-scoped-epic-numbering.yml](./task.205.gate.6.prd-scoped-epic-numbering.yml)
**QA Engineer**: QA Engineer (qa-task, develop-task pipeline cycle 6 — granted re-entry)
**Review Date**: 2026-10-15
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 5's fixes hold, and both are mutation-proven. Bugs 12–13 are closed. No HIGH this cycle.
One MEDIUM: a stray fence in `create-epics-from-shards` hides Steps 6–7 inside a code block. That
fence is pre-existing on `develop`. It matters here because the probe engine cannot reach the
Step 7 guard this task added, so the guard's probe record is empty. With the fence removed in a
scratch worktree, the guard engages 8/8. The suite is green.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (bug 14)

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| CR-1 / [BUG-12](./task.205.bug.12.shards-presence-check-accepts-a-misnamed-batch-epic.md) misnamed batch epic | ✅ FIXED | presence needs exactly one `epic.P.E.{slug}/epic.P.E.{slug}.md`. Mutation (back to the `ls` glob) turns the committed test red. Closed. |
| CR-4 / [BUG-13](./task.205.bug.13.shards-id-check-discards-its-reason.md) reason discarded | ✅ FIXED | the check output prints on failure. Mutation (back to `>/dev/null`) turns the committed test red. Closed. |
| CR-2 advisory: create-epic card-preflight path | ✅ FIXED | repository-root helper path. No test holds it (mutation: no red); it was advisory. |

---

## Review Methodology

Re-review scope: files changed since gate 5 (head 941446e8b887; 13 files) — default. `SAFETY_REPROBE=false` (clause 1 false; clauses 2–3 do not hold).
Strategy: direct tools plus one Explore diff reviewer. Dispatched 12:44:19Z, returned after
158683 ms (from the completion notice's `duration_ms`). The 3 reviewable files: `skills/create-epic/SKILL.md`,
`skills/create-epics-from-shards/SKILL.md`, `tests/epic-numbering-retirement.test.js`.

Step 4b: `qa-execute-snippets.mjs` on both changed SKILL.md files reports `no-executable-blocks`
(create-epic: 7 blocks, all mutating; create-epics-from-shards: **1** block, all mutating). The
second count is wrong: the file has 4 bash blocks, and the stray fence (BUG-14) hides the other 3.
Shells: bash only (`zsh-unavailable` on this host).

Platform variance: `TMPDIR=/var/tmp command node --test tests/epic-numbering-retirement.test.js` passed 17, failed 0.

---

## New Findings This Cycle

- **[medium]** `skills/create-epics-from-shards/SKILL.md:334` — a stray four-backtick fence closes the Step 5 index template early. The real closer at line 349 then opens a code block that runs to line 471 and takes in Steps 6–7. As a result, the fence probe declines the Step 7 guard (`entry-not-probeable`: heading not found), and the boundary record holds `executed: 0`, which `/finalise`'s zero-guard fails. Step 4b sees 1 of 4 blocks, and GitHub renders Steps 6–7 as code ([BUG-14](./task.205.bug.14.shards-stray-fence-hides-step-7-guard.md)). The fence is pre-existing on `origin/develop` (lines 330/345, `0260bd17b`); the guard it hides is new in this task. → delete the line, then re-run the probe.
- Advisory (CR-1, bug/low/medium confidence): under zsh `nomatch`, the presence loop's glob aborts with no `❌ missing` message when no `epic.P.E.*` directory exists. It still fails closed. Not executed, because zsh is absent here.
- Cleanup (CR-2): when FOUND is 2 or more (a duplicate P.E), the message still says "is missing".

All anchors checked by `finding-anchors.js`: `ok` (2 of 2).

---

## Implementation Verification

7/7 phases verified at gate 5. This cycle touched Phase 3 (skill blocks) only.

---

## Success Criteria Verification

No change since gate 5. The criteria this cycle's fixes touch are the Step 7 batch check: every epic of
the batch is present and id-checked. The committed test
`create-epics-from-shards blocks: E0 from next epic; Step 7 checks the batch` covers it, with
misnamed, failing-check, missing and partial-substitution cases.

---

## Breaking Changes Validation

Unchanged since gate 5: PASS.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: A stray fence hides the Step 7 guard**
- **Severity**: MEDIUM
- **Category**: Quality (evidence)
- **Bug Report**: [task.205.bug.14.shards-stray-fence-hides-step-7-guard.md](./task.205.bug.14.shards-stray-fence-hides-step-7-guard.md)
- **Observation**: the fence probe returns `entry-not-probeable`, so the record holds `totals.executed` 0
- **Impact**: `/finalise`'s security zero-guard fails, and closing it would take a recorded override
- **Recommendation**: delete `SKILL.md:334`, then re-run the probe against the committed doc
- **Priority**: P2

### LOW Severity Issues (2)

CR-1 (zsh nomatch message) and CR-2 (duplicate message wording). Both are advisory.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — PASS
The batch presence check now matches the id-checked shape, and the id check prints its reason.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0 (record: [task.205.qa.6.security.run.json](./task.205.qa.6.security.run.json), verdict `unverifiable`, `entry-not-probeable`)
- `boundary: true`. The Step 7 batch guard refuses on repository state. A scratch worktree with
  `SKILL.md:334` deleted ran the same engine command and returned `engages`, 8/8: 2 legitimate
  cases accepted; 6 hostile cases rejected (misnamed file, missing, duplicate P.E, `epic.2.20`
  prefix collision, second-of-batch missing, `E0=0`). That run does not count toward
  `probes_executed`, because it ran against a tree that is not committed. Remedy: BUG-14.

### Maintainability — CONCERNS
The unbalanced fence hides Steps 6–7 from renderers and tools.

---

## Code Review

**Correctness bugs (1):**
- [low/medium] `skills/create-epics-from-shards/SKILL.md:411` — zsh `nomatch` aborts the presence loop when no `epic.P.E.*` directory exists, so the `❌ missing` message never prints. It fails closed. → enumerate with `find`.

**Cleanups (1):**
- `skills/create-epics-from-shards/SKILL.md:416` — when FOUND is 2 or more, the message still says "is missing". → branch the message on FOUND.

No finding was promoted to `top_issues`: none is `bug` + `confidence: high`. QA6-1 is QA's own finding.

boundary: true — `fence:skills/create-epics-from-shards/SKILL.md#Step 7: Quality Validation`; probes_executed: 0 (`entry-not-probeable`, BUG-14).

mutation-proven: presence loop reverted to the `ls` glob → `create-epics-from-shards blocks: E0 from next epic; Step 7 checks the batch` → covered
mutation-proven: id check reverted to `>/dev/null` → `create-epics-from-shards blocks: E0 from next epic; Step 7 checks the batch` → covered
mutation-proven: create-epic preflight reverted to bare `references/` → none → no-red-untested (advisory fix)

---

## Regression Testing

Full fast gate (`npm run ci:fast`, format check plus `npm test`): npm run ci:fast green — 5690 tests, 5676 pass, 0 fail (format check clean).

---

## Test Artifacts

### Files Reviewed
- `skills/create-epics-from-shards/SKILL.md`
- `skills/create-epic/SKILL.md`
- `tests/epic-numbering-retirement.test.js`

### Test Commands Executed
```bash
npm run ci:fast
command node --test tests/epic-numbering-retirement.test.js
TMPDIR=/var/tmp command node --test tests/epic-numbering-retirement.test.js
npm run -s validate -- skills/create-epic/
npm run -s validate -- skills/create-epics-from-shards/
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/create-epics-from-shards/SKILL.md --copy-as docs:docs --json
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/create-epic/SKILL.md --copy-as docs:docs --json
command node .agents/skills/qa-task/references/security-probe.mjs --sink filename --entry 'fence:skills/create-epics-from-shards/SKILL.md#Step 7: Quality Validation' --slot "$(printf '{PRD dir}"\nE0="{E0}"; COUNT="{count}')" --cases-file .claude/state/t205-qa6-cases2.json --name shards-step7-batch-check --record docs/tasks/task.205.prd-scoped-epic-numbering/task.205.qa.6.security.run.json --json
```

Both validators passed.

---

## Recommendations

### Immediate Actions (Blocking)
1. BUG-14: delete the stray fence and record a fence probe of Step 7 (P2).

### Short-term Actions (Non-Blocking)
1. CR-1: make the presence loop glob-free (zsh).
2. CR-2: branch the missing/duplicate message.
3. Add a test that every SKILL.md fence closes where it opens.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: no HIGH and one MEDIUM. The guard works, and the committed test plus a scratch probe show it, but the record that finalise reads is empty.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: bug 14

---

**QA Report**: co-located at `task.205.qa.6.prd-scoped-epic-numbering.md`
**Gate File**: co-located at `task.205.gate.6.prd-scoped-epic-numbering.yml`
**Next Steps**: `/qa-fix` (delete one line, then re-probe). The QA budget (6 of 6) is spent after that fix.
