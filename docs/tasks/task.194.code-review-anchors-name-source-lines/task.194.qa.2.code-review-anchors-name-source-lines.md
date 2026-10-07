# QA Report: Task 194 - Code-review findings anchor to source lines (cycle 2)

**Task**: [task.194.code-review-anchors-name-source-lines.md](./task.194.code-review-anchors-name-source-lines.md)
**Gate File**: [task.194.gate.2.code-review-anchors-name-source-lines.yml](./task.194.gate.2.code-review-anchors-name-source-lines.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-07
**Testing Completed**: 2026-10-07
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| CR-1 — unresolvable `--rev` read as `no-such-file` | FIXED | `--rev origin/no-such-branch` → `bad-rev`, exit 2; unit test asserts exit 2 and no annotation |
| SEC-1 — working-tree reader followed a symlink out of `--root` | FIXED | path-sink probe `engages`, 11 executed, 0 reproduced (run record `task.194.qa.2.security.run.json`) |
| CR-2 (advisory) — `--inline` blocks bind `$FINDINGS_JSON` loosely | NOT FIXED (advisory, deferred) | — |
| CR-3 (advisory) — GitHub-only head fetch on the API route | NOT FIXED (advisory, deferred) | — |

---

## New Findings This Cycle

- **[medium]** `shared/resources/finding-anchors.js:168` — on the `--rev` route `git show <rev>:<rel>` resolves from the repository top level, not `--root` (CR2-1) → read `<rev>:./<rel>` with cwd at the root.
- **[medium]** `shared/resources/finding-anchors.js:159` — an unresolvable `--root` reads `no-such-file` on every finding, exit 1 (CR2-2) → exit 2 `bad-root`.
- **[medium]** `skills/review-pr/SKILL.md:609` — Step 6 prose still describes the pre-fix bad-rev behaviour (CR2-3) → rewrite.
- **[low]** `shared/resources/finding-anchors.js:168` — a directory anchor reads `unchecked-text` on the `--rev` route (CR2-4) → `git cat-file blob`.

---

## Executive Summary

Both cycle 1 fixes hold, measured: `bad-rev` exits 2, and the symlink escape is refused. The
refute pass found the same "could not look" class at a third place (`--root`), a route disagreement
between `--rev` and the working tree, and a sentence the cycle-1 fix left false. All four reproduce
in one command each.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (CR2-1, CR2-2, CR2-3 fixed)

---

## Testing Scope

### Review Methodology

Cycle 2: whole-branch diff, reviewed to refute (`REFUTE_PASS=true`), plus the safety re-probe
directive. Clause 1 read `false` (the prior gate was CONCERNS); `SAFETY_REPROBE=true` was set on
judgement because cycle 1 raised a measured security finding. One read-only Explore reviewer,
dispatched 10:26:02 UTC, returned after 99 s (`duration_ms` 98801). The prompt was dispatched with
its diff-path placeholder unsubstituted and corrected by message before the reviewer's first read
(its `reviewed:` line names the right patch, 1550 lines).

Re-review scope: unscoped (cycle 2 refute pass + safety re-probe), `origin/develop...HEAD` at
`e9b8535f`, generated `references/` and the task directory excluded — 14 files, 1550 lines.

Step 4b: the cycle 1 fix changed only a comment line in each dispatcher block; the engine's
classifications from cycle 1 are unchanged (no block gained or lost runnability).

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: Prompt contract | PASS | unchanged since cycle 1 |
| Phase 2: Checker engine | CONCERNS | CR2-1, CR2-2, CR2-4 |
| Phase 3: Wire the four dispatchers | CONCERNS | CR2-3 (review-pr prose) |
| Phase 4: Population guard and release notes | PASS | — |

---

## Success Criteria Verification

As cycle 1, with SC-4 now: exit 2 holds for a bad `--rev` (test), not yet for a bad `--root`
(CR2-2). Every other criterion holds on the same evidence.

---

## Issues Found

### MEDIUM Severity Issues (3)

**Issue: The `--rev` route ignores `--root` (CR2-1)**
- **Bug Report**: [task.194.bug.3.rev-route-ignores-root.md](./task.194.bug.3.rev-route-ignores-root.md)
- **Observation**: `--root shared/resources --rev HEAD`: `shared/resources/finding-anchors.js:1` → `unchecked-text`, `finding-anchors.js:1` → `no-such-file`.

**Issue: An unresolvable `--root` reads as reviewer-wrong (CR2-2)**
- **Bug Report**: [task.194.bug.4.bad-root-reads-as-no-such-file.md](./task.194.bug.4.bad-root-reads-as-no-such-file.md)
- **Observation**: `--root /nonexistent/x` → `malformed-anchors`, exit 1, all `no-such-file`.

**Issue: Stale review-pr prose after the bad-rev fix (CR2-3)**
- **Bug Report**: [task.194.bug.5.review-pr-stale-bad-rev-prose.md](./task.194.bug.5.review-pr-stale-bad-rev-prose.md)
- **Observation**: `skills/review-pr/SKILL.md` Step 6 still says the findings "still render, marked" when the head is unavailable.

### LOW Severity Issues (1)

CR2-4 — a directory anchor reads `unchecked-text` on the `--rev` route; `no-such-file` on the working tree.

**Total Issues**: HIGH: 0, MEDIUM: 3, LOW: 1

---

## NFR Assessment

### Performance — PASS
One `git rev-parse` per run added.

### Reliability — CONCERNS
CR2-2; CR2-1 and CR2-4 (the two read routes disagree).

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 11
- Path-sink probe against `makeReader` through the scratch ESM wrapper: `engages`, 0 hostile accepted.
  CR2-1 is a correctness defect, not an escape: `git show` cannot read outside the repository.

### Maintainability — CONCERNS
CR2-3.

---

## Code Review

Every reviewer anchor checked `ok` with `finding-anchors.js --rev HEAD`.

**Correctness bugs (4):**
- [medium/high] `shared/resources/finding-anchors.js:168` — `--rev` route resolves from the top level, not `--root` → `<rev>:./<rel>`. **Promoted: CR2-1.**
- [medium/high] `shared/resources/finding-anchors.js:159` — unresolvable `--root` reads `no-such-file` on every finding → exit 2 `bad-root`. **Promoted: CR2-2.**
- [medium/high] `skills/review-pr/SKILL.md:609` — stale bad-rev prose → rewrite. **Promoted: CR2-3.**
- [low/high] `shared/resources/finding-anchors.js:168` — directory anchor on `--rev` → `git cat-file blob`. **Promoted: CR2-4.**

**Cleanups (0).**

**Boundary rule:** `boundary: true` (unchanged) — `probes_executed: 11` from the run record's `totals.executed`.

**Provenance (5b):** all four are in code this branch adds.

mutation-proven: real-path containment removed → `the working-tree reader refuses a symlink…` → covered
mutation-proven: `resolveRev` bypassed → `--rev reads the committed file through git show…` → covered

(Cycle 1 fix proofs, re-read here.)

---

## Regression Testing

| Area | Result |
| --- | --- |
| PR #594 replay at `e9b8535f` | unchanged: 6 × `out-of-range`, control `unchecked-text`, 2 × `no-line` |
| `--rev origin/no-such-branch` | `bad-rev`, exit 2 |
| Shared, eval, qa-task, qa-story, review-code suites | PASS — 3235/3235 at `e9b8535f` |

---

## Test Commands Executed

```bash
command node shared/resources/security-probe.mjs --sink path --entry 'reader.mjs#read' --repo-root <scratch>/probe --record <scratch>/qa2.security.run.json --json   # engages, 11
command node .agents/skills/review-pr/references/finding-anchors.js --findings-file <pr594> --rev origin/feature/task.900.review-pr-smoke-slugify --json
command node shared/resources/finding-anchors.js --findings-file <f> --root shared/resources --rev HEAD --json   # CR2-1
command node shared/resources/finding-anchors.js --findings-file <f> --root /nonexistent/x --json               # CR2-2
command node shared/resources/finding-anchors.js --findings-file <f> --rev HEAD --json                           # CR2-4 (shared:1)
command node --test 'shared/resources/tests/*.test.mjs' 'evals/shared/tests/*.test.mjs' 'skills/{qa-task,qa-story,review-code}/tests/*.test.js'
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: three medium defects, each with a one-line fix and a test; HIGH 0 for two cycles.
**Quality Score**: 70/100

**Deployment Recommendation**: CONDITIONAL
**Next Steps**: `/qa-fix` CR2-1..CR2-4, then cycle 3.
