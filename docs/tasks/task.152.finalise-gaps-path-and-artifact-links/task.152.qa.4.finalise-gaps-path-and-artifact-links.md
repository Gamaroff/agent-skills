# QA Report: Task 152 - finalise: bug-mode gaps path and co-located artifacts in 8a and link guard

**Task**: [Link to task document](./task.152.finalise-gaps-path-and-artifact-links.md)
**Gate File**: [task.152.gate.4.finalise-gaps-path-and-artifact-links.yml](./task.152.gate.4.finalise-gaps-path-and-artifact-links.yml)
**Previous Gate**: [task.152.gate.3.finalise-gaps-path-and-artifact-links.yml](./task.152.gate.3.finalise-gaps-path-and-artifact-links.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-26
**Gate Status**: PASS

---

## Executive Summary

All four cycle-3 findings are fixed and CI is green on `03809419`. The review raised one medium
finding: the docs/bugs artifacts are not walked. Task § 4 scopes that out, and it is routed to
`future` a second time with a named follow-up. What remains open is three LOW entries: one comment
that overstates what the walk covers, and two duplication cleanups. This is the third gate in a row
with no HIGH finding, and the first with no medium finding in the change itself.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Prior finding (gate 3) | Severity | Status | Evidence |
| --- | --- | --- | --- |
| CR-1 helper refusals on stdout | medium | FIXED | All HALTs now go to stderr. Reverting one turns the 8.3 test red (H1). |
| CR-4 `count` 0 is ambiguous; 8.3 does not refuse 0 | low | FIXED | No Step 5 section is refused, and 8.3 refuses 0 (H2, H3). |
| CR-6 8.5's second gap count | low | FIXED | 8.5 now reads the helper's `count`, held by the one-definition test (H4). |
| CR-7 walk comment | low | PARTIAL | Reworded to "superset", but that claim is false for docs/bugs (new CR-1). |

---

## Testing Scope

### Review Methodology

Direct tools, plus one independent code-review subagent over the scoped diff: the 4 source files
cycle 3's fix changed, 1,015 lines.

```
Re-review scope: since 2026-09-26T22:20:00Z (default) — files changed by 03809419
```

Step 4b ran on `finalise` with `DOC_FILE` bound. One block executed under bash and zsh with no
findings; the other 33 are mutating and 1 is a placeholder. CI (`test`, `link-check`, `validate`,
`shellcheck`) passes on `03809419`, the tree the 5b fast gate ran on (4,270 pass, 0 fail).

---

## New Findings This Cycle

- **[low]** `shared/resources/tests/doc-links.test.mjs:436` — the walk comment says "superset",
  but the walk skips docs/bugs. → Scope the claim and name the gap. (CR-1)
- **[low]** `skills/finalise/SKILL.md:2334` — the 8.5 bug branch copies the helper's Step 5
  extractor. → Add a `body` verb to the helper. (CR-2)
- **[low]** `evals/shared/tests/finalise-bug-mode.test.mjs:1599` — `runHelper` is defined twice.
  → Hoist it. (CR-3)

Routed to `future` (provenance, 5b): **the docs/bugs artifacts are not walked.** The reviewer rated
this medium/high. The walk has never covered `docs/bugs`, neither on `develop` nor on this branch,
and task § 4 names it as a follow-up. This is the second cycle to raise it, so it needs its own
task.

---

## Implementation Verification

All seven phases are PASS. Phase 5 (comment) and Phase 2 (a duplicated extractor) carry LOW entries.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 3

---

## NFR Assessment

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 49 (`task.152.qa.4.security.run.json` `totals.executed`)
- `isCoLocatedArtifact` has not changed since cycle 3. It was re-probed on `03809419`: 0
  reproduced, 0 over-blocked.

### Performance — PASS · Reliability — PASS · Maintainability — PASS

---

## Code Review

**Correctness bugs (1):** CR-1 [medium/high]. The walk gap is routed to `future` because it is out
of scope by § 4. The false comment it exposed is promoted as **low**.

**Cleanups (2):** CR-2 and CR-3, both promoted as **low**.

**Boundary rule:** `boundary: true`, `isCoLocatedArtifact`, `probes_executed: 49`.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: There are no HIGH or MEDIUM findings in the change. Three LOW entries remain open.
**Quality Score**: 100/100
**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.152.qa.4.finalise-gaps-path-and-artifact-links.md`
**Gate File**: co-located at `task.152.gate.4.finalise-gaps-path-and-artifact-links.yml`
**Next Steps**: loop routing (cosmetic-residue exit candidate) → 5c `/review-pr`
