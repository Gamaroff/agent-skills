# Bug Report: Task 118 - The review-security probe command omits `--repo-root`, so the installed copy records `unverifiable` for every control

**Task**: [Link](./task.118.probes-executed-from-engine.md)
**Bug ID**: TASK-118-BUG-1
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Closed
**Found By**: QA Engineer (diff code review CR-1, reproduced)
**Date Found**: 2026-09-17

## Description

This task added `--repo-root <path>` to `security-probe.mjs` precisely because a bundled copy under
`skills/*/references/` has `defaultRepoRoot()` = the skill directory, and passed it at the
finalise and qa-story/qa-task Step 3b sites. The **review-security** site — the skill the task is
named for — did not get it: the probe command in `shared/resources/security-review-prompt.md` §4
(the per-control `**Command**` block, which the bundler rewrites to
`node references/security-probe.mjs …`) and `skills/review-security/SKILL.md` step 5 carry
`--record`, `--name` and `--call-site` but no `--repo-root`.

From an installed skill, a repo-relative entry such as `apps/api/src/redis.ts#buildRedisOptions`
therefore resolves to `.agents/skills/review-security/apps/api/src/redis.ts`, cannot be imported,
and the engine records `verdict: unverifiable`, `executed: 0` — for every control. The record then
honestly renders `probes_executed: 0` / `evidence: reasoned`, which is the truthful block for a run
that executed nothing, but the run executed nothing only because the command was wrong.

## Steps to Reproduce

```bash
# From a copy of the engine that is not two dirs below the repo root (what an installed skill is):
node skills/review-security/references/security-probe.mjs --sink url-authority \
  --entry 'skills/review-security/tests/fixtures/redis-tls/engaged.mjs#buildRedisOptions' --json \
  | jq '{verdict, reason, executed}'
# → { "verdict": "unverifiable", "reason": "entry-not-probeable", "executed": 0 }
# With the flag the same command reports engages / 12.
```

## Expected Behavior

The documented review-security command probes the consumer's tree from an installed copy, exactly
as the finalise and QA sites now do.

## Actual Behavior

Every control in an installed review-security run is `unverifiable` with zero probes; the review
cannot produce `measured` at all.

## Impact

`review-security` — the primary site of this task — is inoperable from a bundled install until the
operator discovers the flag. In-tree runs are unaffected (root resolves correctly), which is why the
suite is green.

## Recommendation

Add `--repo-root "$(git rev-parse --show-toplevel)"` to the §4 command block and to SKILL.md step 5;
add a prose assertion (or extend the population test's matcher) so a security-probe invocation in
shipped prose without `--repo-root` is a finding.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-17
**Developer**: qa-fix (develop-task pipeline)

**Root Cause Analysis**: the `--repo-root` flag was added in Phase 1 and threaded through the
finalise and QA Step 3b sites in Phase 2, but the review-security prompt's §4 `**Command**` block
and SKILL step 5 were edited earlier in the same session (before the flag existed) and never
revisited. Nothing mechanical asserted the flag's presence across shipped invocations.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-17

**Fix Description**:
- `shared/resources/security-review-prompt.md` §4 — `--repo-root "$(git rev-parse --show-toplevel)"` added to the per-control command block, and the "It is printed, not written" paragraph now says why every probe passes it.
- `skills/review-security/SKILL.md` step 5 — names `--repo-root` alongside `--record`, with the reason.
- `evals/shared/tests/probes-executed-population.test.mjs` — new guard: every shipped `security-probe.mjs` invocation that names an `--entry` (backslash-continued commands reassembled) must carry `--repo-root`; floor ≥ 4 invocations. Mutation-proven: deleting the flag line from §4 turns it red.

**Files Modified**:
- `shared/resources/security-review-prompt.md` (+ bundled copy in `skills/review-security/references/`)
- `skills/review-security/SKILL.md`
- `evals/shared/tests/probes-executed-population.test.mjs`

**Verification Steps for QA**:
1. `grep -n repo-root shared/resources/security-review-prompt.md skills/review-security/SKILL.md` → both present.
2. `node --test evals/shared/tests/probes-executed-population.test.mjs` → the `--repo-root` guard passes; remove the flag from §4 and it fails.

## Status History

| Date       | Status       | Changed By | Notes                                         |
| ---------- | ------------ | ---------- | --------------------------------------------- |
| 2026-09-17 | New          | QA         | Found by diff code review CR-1, reproduced     |
| 2026-09-17 | In Progress  | qa-fix     | Investigation — root cause: sites edited before the flag existed |
| 2026-09-17 | Ready for QA | qa-fix     | Flag added at both sites; population guard added and mutation-proven |
| 2026-09-17 | Closed       | QA         | Cycle 2: verified at both sites and the bundled copy; guard mutation-proven by QA |
