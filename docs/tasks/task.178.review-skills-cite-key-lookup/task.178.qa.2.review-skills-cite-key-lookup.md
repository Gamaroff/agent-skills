# QA Report: Task 178 - review-task and review-story cite the §0a key lookup (cycle 2)

**Task**: [task.178.review-skills-cite-key-lookup.md](./task.178.review-skills-cite-key-lookup.md)
**Gate File**: [task.178.gate.2.review-skills-cite-key-lookup.yml](./task.178.gate.2.review-skills-cite-key-lookup.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-12
**Gate Status**: CONCERNS

---

## Re-Review Context

| Gate 1 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 (medium) — Jira-key branch only works as one shell | FIXED | skill states the one-script contract; the check HALTs on unbound `JIRA_KEY` / `LOCAL_PATH`; two block-alone tests; mutation (guard removed) → red |
| CR-2 (low) — guard misses non-adjacent `r`/`l` | FIXED for the four named spellings — but see this cycle's CR-1: the mechanism still misses others | `isKeyLookup`; mutation (adjacency-only matcher) → red |
| CR-3 (cleanup) — fixtures not deleted | FIXED | `t.after` removal; a run leaves no new `review-task-key-*` dir |
| BND-1 — boundary with no probe form | DEFERRED to task.180 | unchanged |

---

## Executive Summary

Cycle 1's fixes hold. The refute pass broke the guard's key instead: keyed on grep flag spelling, it
still misses real restatements (CR-1, medium) and flags non-lookups (CR-3, low). The second
consecutive finding on one mechanism.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (CR-1 fixed)

---

## Review Methodology

Direct tools plus one read-only Explore reviewer. Cycle 2 → **refute pass** over the whole branch
diff (`origin/develop...HEAD`, generated copies excluded), directive appended verbatim. Reviewer
duration: 221506 ms (completion notice `duration_ms`). The reviewer ran the suite (12/12, bash) and
probed `isKeyLookup` with 17 edge-case lines.

Step 4b: review-task, 21 blocks — 3 runnable, 0 placeholder, 18 mutating; 0 findings; bash only
(`zsh-unavailable`).

---

## New Findings This Cycle

- **[medium]** `tests/key-lookup-single-statement.test.js:49` — `isKeyLookup` stops at the first
  token it cannot parse and keys on flag spelling: `grep --include="*.md" -rl …`, `grep -m1 -rl …`,
  flags after the pattern, `egrep -rl …`, `--files-with-match`, and a verbatim copy of §0a's own
  `grep -rlE "^${KEY_FIELD}:…"` all pass → key on what the line does, not on flag spelling. (CR-1)
- **[low]** `tests/key-lookup-single-statement.test.js:65` — the key field is tested against the
  whole line and the flags against any grep on it: a `| xargs grep "^jira_key:"` pipeline, prose
  naming an unrelated grep, and a value-less key inventory are flagged → require field, value and
  `docs/` in one invocation. (CR-3)
- **Advisory, not gated** (medium/medium): `skills/review-task/SKILL.md:97` reads a bare `$INPUT`
  no block binds. **Provenance: pre-existing** — `git show origin/develop:skills/review-task/SKILL.md`
  line 97 is the identical `if echo "$INPUT" | grep -qE '^[A-Z]+-[0-9]+$'; then`. Out of this task's
  scope (it names three greps, not input binding) → `recommendations.future`.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| No canonical source restates the key lookup | guard test — but CR-1 shows real restatements it misses | CONCERNS |
| Jira-key branch resolves a quoted key correctly (bash + zsh) | four fixture tests + two block-alone tests; bash here, zsh in CI | PASS |
| Guard red-on-revert; `bundle:check` and suite green | mutations covered; fast gate green except the pre-existing load-sensitive timing test (identical on `origin/develop`) | PASS |
| `npm run validate` both skills | ✓ (cycle 1; skill text change in cycle 1 re-validated by the fast gate's skill tests) | PASS |

---

## NFR Assessment

- **Security** — PASS · Evidence: reasoned · Probes executed: 0 (BND-1 deferred to task.180)
- **Performance** — PASS
- **Reliability** — PASS (gate 1 CR-1 fixed)
- **Maintainability** — CONCERNS (CR-1: a guard that misses restatements gives false assurance)

---

## Code Review

**Correctness bugs (3):**
- [medium/high] `tests/key-lookup-single-statement.test.js:49` — flag-token key misses restatements. **Promoted: CR-1.**
- [medium/medium] `skills/review-task/SKILL.md:97` — unbound `$INPUT` (pre-existing; advisory).
- [low/high] `tests/key-lookup-single-statement.test.js:65` — non-lookups flagged. **Promoted: CR-3.**

**Cleanups (0).**

**Boundary:** unchanged — `boundary: true`, `probes_executed: 0`, BND-1 deferred to task.180.

**Mutation proofs (cycle 1's fixes):**

```
mutation-proven: removed the JIRA_KEY :? guard in the check block → "run alone with no JIRA_KEY, it HALTs…" → covered
mutation-proven: matcher reverted to adjacent rl|lr → "the key matches the restatements it exists to catch" → covered
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: second consecutive finding on the guard's matching mechanism; HIGH 0.
**Quality Score**: 90/100
**Next Steps**: `/qa-fix` cycle 2 — Step 2.6 repeat subject: replace the mechanism rather than patch it again.
