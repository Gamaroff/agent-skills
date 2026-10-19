# QA Report: Task 189 - Read-only agents never write

**Task**: [Link to task document](./task.189.read-only-agents-never-write.md)
**Gate File**: [task.189.gate.1.read-only-agents-never-write.yml](./task.189.gate.1.read-only-agents-never-write.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-16
**Testing Completed**: 2026-10-16
**Gate Status**: CONCERNS

---

## Executive Summary

First review of PR #683 (head `16f8ed4f8fe7`). All four phases are implemented and every success criterion is held by a committed test (90/90 targeted tests, `npm run ci:fast` 5797/0 at develop time). The diff review found two medium correctness bugs at the edges of the change — finalise Step 8a still re-runs a command the agent no longer records, and the new runner drops the engine's sandbox-escape signal — and the runner's owned-flag refusal cannot be probed by the engine.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (17/17 plan checkboxes)
- [x] Tests passing
- [x] Breaking changes documented (CHANGELOG + task § 5)
- [x] Code on feature branch with open PR (#683, OPEN)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, integration)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review (engine fence-form probe)
- [x] Code Review (Step 3b, one Explore reviewer)

### Review Methodology

Direct tools plus one diff-review subagent (default strategy: 4 phases, multi-module, medium risk). First review — whole branch diff (`origin/develop...HEAD`, bundled `references/` copies excluded; 2730-line patch, 15 files). Reviewer dispatched and returned within one turn; duration from its completion notice: 112 s. Traceability matrix supplied by the pipeline's mapper — which this run dispatched under the new contract: it returned the matrix between markers and the Step 5 block wrote it (`matrix: written`).

Step 4b: `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — 26 bash blocks (1 runnable, 1 placeholder, 24 mutating), bash only (`zsh-unavailable`), no findings. `skills/finalise/SKILL.md` — 39 blocks (0 runnable, 2 placeholder, 37 mutating): `zero-blocks-executed` (medium, advisory) — the engine cannot run finalise's blocks without bindings. The two blocks this task adds are executed directly by `shared/resources/tests/read-only-agent-writes.test.mjs`, which binds and runs them.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: Mapper returns, the step writes | CONCERNS | Verified | Block probed by the engine: empty marked block leaves an empty `.summaries/` (QA-2, low) |
| Phase 2: Security agent plans, finalise runs | CONCERNS | Verified | CR-1 (Step 8a), CR-2 (escapes), QA-1 (owned-flag probe) |
| Phase 3: Docs agent runs no generator | PASS | Verified | Diff-based rule; `<DIFF_FILE>` passed |
| Phase 4: Guard test and changelog | PASS | Verified | CR-3 advisory |

**Overall Phase Completion**: 4/4 implemented; 2/4 with open findings

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --------- | -------- | ------ |
| SC1 mapper prompt has no write; both sites say return | `tests/explore-prompts-no-write.test.js` (property, both-sites, mutation) | PASS |
| SC2 block writes byte for byte; warns without markers | `read-only-agent-writes.test.mjs` (byte-for-byte incl. pipe + non-ASCII; 5 malformed replies) | PASS |
| SC3 security prompt: no `--record`, no cases write, returns `probe_plan[]` | guard test + `finalise-dod-prompt-contract.test.mjs` (plan/run test) | PASS |
| SC4 Step 3b.1 count from `totals.executed`; refusal uncounted | `read-only-agent-writes.test.mjs` (5 Step 3b.1 cases) | PASS — see CR-5 on the assertion's independence |
| SC5 docs prompt instructs no generator run | guard test (generator shape; forbidding-sentence control) | PASS |
| Performance: not applicable | — | PASS (N/A) |
| Code quality: `npm test`, `bundle:check`, `prettier --check .` | ci:fast 5797/0 (develop); bundle:check 0 problems; prettier clean (re-run here) | PASS |
| `quick_validate.py skills/finalise` | `npm run validate -- skills/finalise/` → ✓ (re-run here) | PASS |
| Migration: CHANGELOG states the removed fields | `CHANGELOG.md` [Unreleased] › Fixed | PASS |

---

## Breaking Changes Validation

### Breaking Change: the security agent's YAML no longer carries `probes_executed`
Documented: Yes (task § 5, CHANGELOG)
Migration Path Provided: Yes — a custom dispatcher runs Step 3b.1's block
Migration Tested: Yes — Step 3b.1's block is lifted and run by the fixture test
Consumer Code Updated: Yes (finalise), except Step 8a.4 (CR-1)

**Overall Breaking Changes Assessment:** CONCERNS (one consumer site missed)

---

## Issues Found

### MEDIUM Severity Issues (3)

**CR-1: Step 8a re-runs a command the agent no longer records** — Bug Report: [task.189.bug.1.step-8a-reruns-a-command-the-agent-no-longer-records.md](./task.189.bug.1.step-8a-reruns-a-command-the-agent-no-longer-records.md). Population check (`git grep -nE 'the agent recorded|probe_command|probe_cases|…'` over `skills/*/SKILL.md` and `shared/resources/*.md`): this is the only remaining site.

**CR-2: the runner drops the engine's escapes** — Bug Report: [task.189.bug.2.runner-drops-engine-escapes.md](./task.189.bug.2.runner-drops-engine-escapes.md). Verified: `grep -c escapes shared/resources/security-probe-plan.mjs` → 0.

**QA-1: the owned-flag refusal is not probeable** — Bug Report: [task.189.bug.3.owned-flag-refusal-not-probeable.md](./task.189.bug.3.owned-flag-refusal-not-probeable.md). The engine maps `null` → rejected and a string → accepted (`security-probe.mjs:390-396`); `ownedFlagIn` returns the offending flag on refusal, so it is inverted for the engine.

### LOW Severity Issues (1)

**QA-2: empty marked block leaves an empty `.summaries/`** — engine probe case `t189.matrix.empty-block` (`doc was created`). No matrix file is written and the warning prints; the block's `mkdir -p` runs before its non-empty check.

**Total Issues**: HIGH: 0, MEDIUM: 3, LOW: 1

---

## NFR Assessment

### Performance — PASS
No path runs more often; Step 3b.1 makes an already-existing engine run unconditional.

### Reliability — CONCERNS
Step 8a's fix-and-recheck names a command that no longer exists (CR-1).

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 8 (record `task.189.qa.1.security.run.json`, `totals.executed`)
- Boundary decision: `boundary: true`. Boundaries the diff adds: (1) the Step 5 matrix write block (refuses a malformed reply) — probed with the fence form, cases `task.189.qa.1.security.cases.json`: 5/6 hostile refused, 1 reproduced (QA-2, low), 2/2 legitimate accepted (incl. CRLF); (2) `ownedFlagIn` in the runner (refuses owned flags) — **not probeable** as written (QA-1); (3) the guard test's `writeInstructions` classifier — test code, held by its own control cases. CR-2 (escapes dropped) is security-relevant.

### Maintainability — PASS
One runner instead of a conditional fallback; guard population derived from the tree.

---

## Code Review

Step 3b — one Explore reviewer over the full branch diff; `code_review_blocking=true` (pipeline override). Anchors checked with `finding-anchors.js`: 5/5 `ok`.

**Correctness bugs (3):**
- [medium/high] `skills/finalise/SKILL.md:2825` — Step 8a.4 re-runs "the engine command the agent recorded", which no longer exists → point it at the runner on the saved plan. **Promoted: CR-1.**
- [medium/high] `shared/resources/security-probe-plan.mjs:244` — runner drops engine `escapes[]`; a sandbox escape reads clean → carry escapes and FAIL on them. **Promoted: CR-2.**
- [low/medium] `tests/explore-prompts-no-write.test.js:63` — bare `no` in FORBIDS lets "If there is no X file, write it to Y" pass → drop `no` or bind it to the verb. Advisory (not high confidence).

**Cleanups (2):**
- `shared/resources/security-probe-plan.mjs:131` — reads the snapshot, not `readRecord()`; a missing record reads as 0 → use `readRecord`, report unreadable separately.
- `shared/resources/tests/read-only-agent-writes.test.mjs:168` — asserts the runner's count against the file it read → also assert an independent sum.

Mutation proofs (development, against committed tests; recorded in the implementation report): M1 → guard (`covered`); M2 → guard (`covered`); M3 → guard (`covered`); M4 → guard (`covered`); M5 → `read-only-agent-writes` (`covered`); M6 → `read-only-agent-writes` (`covered`); M7 → `read-only-agent-writes` (`covered`). 7 of 7. No fix was made this cycle, so no new proof is owed.

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| finalise DoD contract (`finalise-dod-prompt-contract`, `finalise-fix-and-recheck`) | PASS |
| probes_executed population | PASS |
| ESM entry-point realpath guard | PASS |
| Full suite (develop time, `ci:fast`) | 5797/0 |

---

## Test Artifacts

### Test Commands Executed
```bash
command node --test tests/explore-prompts-no-write.test.js shared/resources/tests/read-only-agent-writes.test.mjs evals/shared/tests/finalise-dod-prompt-contract.test.mjs evals/shared/tests/probes-executed-population.test.mjs shared/resources/tests/entrypoint-guard-realpath.test.mjs shared/resources/tests/finalise-fix-and-recheck.test.mjs   # 90/90
npm run bundle:check            # 0 problems
./node_modules/.bin/prettier --check .   # clean
npm run validate -- skills/finalise/     # ✓
node shared/resources/security-probe.mjs --sink filename --entry "fence:shared/resources/develop-pipeline-step-5-6-qa-loop.md#Write the matrix from the mapper's reply" --slot '{doc-directory}' --cases-file docs/tasks/task.189.read-only-agents-never-write/task.189.qa.1.security.cases.json --name 'step-5 matrix write block' --repo-root "$PWD" --record docs/tasks/task.189.read-only-agents-never-write/task.189.qa.1.security.run.json --json   # present-but-inert, 8 executed
```

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1 — Step 8a.4 re-runs the runner on the saved plan.
2. CR-2 — carry and FAIL on engine escapes.
3. QA-1 — an accept-shaped, probeable owned-flag predicate with cases per flag.

### Short-term Actions (Non-Blocking)
1. QA-2 — create the doc directory only after the non-empty check.
2. CR-3, CR-4, CR-5 (advisory).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Three open medium findings (rule 2); no HIGH; security and reliability NFRs at CONCERNS.
**Quality Score**: 70/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1, CR-2, QA-1 fixed

---

**QA Report**: co-located at `task.189.qa.1.read-only-agents-never-write.md`
**Gate File**: co-located at `task.189.gate.1.read-only-agents-never-write.yml`
**Next Steps**: `/qa-fix` (cycle 1)
