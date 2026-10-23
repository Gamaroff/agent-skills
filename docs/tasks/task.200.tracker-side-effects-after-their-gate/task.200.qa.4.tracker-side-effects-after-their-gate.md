# QA Report: Task 200 - Tracker side effects after their gate (cycle 4)

**Task**: [Link to task document](./task.200.tracker-side-effects-after-their-gate.md)
**Gate File**: [task.200.gate.4.tracker-side-effects-after-their-gate.yml](./task.200.gate.4.tracker-side-effects-after-their-gate.yml)
**Previous Report**: [task.200.qa.3.tracker-side-effects-after-their-gate.md](./task.200.qa.3.tracker-side-effects-after-their-gate.md)
**DoD that reopened QA**: [task.200.dod.1.tracker-side-effects-after-their-gate.md](./task.200.dod.1.tracker-side-effects-after-their-gate.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-20
**Testing Completed**: 2026-10-20
**Gate Status**: CONCERNS

---

## Executive Summary

This cycle is a QA re-entry after `/finalise` DoD 1. The DoD probe found that `branchNamesWorkItem` accepted `release/1.4.0`, `hotfix/1.4.1` and `feature/1.4.x` for story 1.4.2, and `hotfix/vendor-sdk-bump` for a bug. The operator chose to narrow both rules. Commit 655ce648 does that: a story's integration fallback needs the configured `branching.epicIntegration.branchPattern` prefix followed by one `{P}.{E}` segment, and a bug's hotfix rule needs `hotfix/v` followed by a digit. All four reproductions are now refused, 54 probes ran with 0 reproduced and 0 escaped, and the fast gate passes 6079/0. The review raised no high-confidence defect. Maintainability stays CONCERNS on advisory items, and nothing is open.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (5c review and finalise DoD)

---

## Re-Review Context

| Previous finding | Severity | Status | Evidence |
| --- | --- | --- | --- |
| DoD 1 gap: story accepts `release/1.4.0`, `hotfix/1.4.1`, `feature/1.4.x` | low (DoD probe) | ✅ FIXED | DoD 1's three cases re-run against the current code score `rejected`; TABLE rows added; development mutant "accept any prefix" turns 7 rows red |
| DoD 1 gap: bug accepts `hotfix/vendor-sdk-bump` | low (DoD probe) | ✅ FIXED | Case re-run scores `rejected`; QA mutant `startsWith("hotfix/v")` turns 2 rows red |

Gate 3 had no `top_issues[]`. Its advisory items are carried in `recommendations.future`. No bug report was open, and none was filed this cycle.

---

## New Findings This Cycle

None that gate. Advisory review findings, with anchors checked (`finding-anchors.js`: all `ok`):

- **[medium/medium]** `shared/resources/doc-link-branch.js:130`: the fallback only recognises patterns that put `{p}.{n}` in one segment after a literal prefix. `epic/{p}-{n}-{slug}` and `epic/{p}.{n}/{slug}` never match. **Provenance:** the same on gate 3's head (`epic/1-4-ui` and `epic/1.4/ui` are false at aca41591 and at 655ce648), so this change did not introduce it and it is out of the task's scope. Routed to `recommendations.future`.
- **[low/low]** `shared/resources/doc-link-branch.js:236`: `branchPattern: ""` gives `null`, which turns the fallback off, where `/create-branch` treats an unset pattern as the default. A config that is present but unreadable reads as the default. Advisory.
- **Q2 (QA mutant, absorbed):** dropping `b.startsWith(integrationPrefix)` while keeping `b.slice(integrationPrefix.length)` reddens nothing. Every foreign-prefix row happens to leave a `/` in the sliced remainder. A row like `hfix/1.4.ui` would hold it. The realistic regression, accepting any prefix, is held (7 rows red).

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#711)

### Review Methodology

Direct tools: a re-review of one commit. One Explore code reviewer (dispatched 21:20:32Z; returned after 130 s, per the completion notice's duration).

Re-review scope: files changed since gate 3 (head aca4159160c7; 7 reviewable files, plus 62 bundled copies, which bundle:check holds byte-equal to source) — default. `SAFETY_REPROBE=false`: gate 3's security block was PASS/measured, and it had no high boundary finding.

Step 4b: not applicable. The change set adds or modifies no fenced bash block in a `SKILL.md` or a `shared/resources/*.md`.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phases 1–5 (as gate 3) | PASS | Verified | Unchanged except the resolver |
| DoD 1 re-entry: narrow both rules | PASS | Verified | `doc-link-branch.js` `integrationPrefixOf`, `configuredIntegrationPrefix`, `/^hotfix\/v\d/`; `jira-sync.js` passes the prefix |

**Overall Phase Completion**: 5/5

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| Unrelated branch → default; own / parent / hotfix branch → that branch | PASS | `shared/resources/tests/doc-link-branch.test.mjs` TABLE (hotfix now means a version hotfix) |
| `task.20` does not match `feature/task.200.x` | PASS | same TABLE |
| configuration.md § Document link branch states the rule | PASS | `docs/reference/configuration.md:803` restates the narrowed rule |
| CHANGELOG `[Unreleased]` | PASS | `CHANGELOG.md:23` |
| Each new test mutation-proved | PASS (this cycle's) | development 7/7, QA 3 of 4 covered, 1 absorbed (Q2) |

---

## Breaking Changes Validation

Behaviour narrows only. A story card created on a release or hotfix branch whose version starts with `{P}.{E}` now links to the default branch instead of to that branch. That is the intended effect. No consumer action is needed.

---

## Issues Found

HIGH: 0, MEDIUM: 0 gating (1 advisory, pre-existing), LOW: 2 advisory (CR-2, Q2)

---

## NFR Assessment

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 54 (record `task.200.qa.4.security.run.json`, 0 escaped)
- Boundary: true, `branchNamesWorkItem` (an accept/reject predicate whose `false` sends a link to the default). Five controls: three copies driven with DoD 1's 42 cases, and two with 12 new edge cases (`task.200.qa.4.security.cases.story.json`, `….bug.json`). The same 42 cases reproduced 4 on fc7e0527, which calibrates the instrument.

### Performance — PASS

One config read per resolution.

### Reliability — PASS

Absent or unreadable config gives the default. `yaml-subset.js` is beside every bundled copy (`bundle:check` exit 0).

### Maintainability — CONCERNS

Gate 3's items are unchanged, plus CR-1 (pre-existing), CR-2 and Q2. All advisory.

---

## Code Review

**Correctness bugs (2):**

- [medium/medium] `shared/resources/doc-link-branch.js:130` — only `{p}.{n}`-in-one-segment patterns are recognised (pre-existing on gate 3's head) → match the whole pattern, or document and add a row
- [low/low] `shared/resources/doc-link-branch.js:236` — an empty `branchPattern` turns the fallback off; unreadable config reads as the default → treat empty as unset

**Cleanups (2):**

- `shared/resources/doc-link-branch.js:154` — the conditional spread is redundant with the destructuring default → pass `integrationPrefix` directly
- `shared/resources/doc-link-branch.js:104` — the `"epic/"` default duplicates `integrationPrefixOf(DEFAULT_BRANCH_PATTERN)` → derive it once

None promoted: no `category: bug` finding is `confidence: high` (`code_review_blocking=true` from the pipeline).

mutation-proven: `/^hotfix\/v\d/` → `startsWith("hotfix/v")` → `branchNamesWorkItem("hotfix/vendor-sdk-bump", bug.3.x.md) → false` (and the task.67 bug row) → covered
mutation-proven: `jira-sync.js` drops `integrationPrefix` → `resolveDocBranch — a story's integration branch is read from the configured branchPattern` → covered
mutation-proven: `configuredIntegrationPrefix` ignores `branchPattern` → `configuredIntegrationPrefix reads branching.epicIntegration.branchPattern, else the default` → covered
mutation-proven: `b.startsWith(integrationPrefix)` → `true` → none → absorbed (no 5-character foreign prefix row; Q2)

---

## Regression Testing

Fast gate on 655ce648 with `.agents/skills` moved aside: 6079 tests, 0 failures. The first run had 4 failures, all `Cannot find module './yaml-subset.js'` in the isolated-install test, fixed in the same commit before it landed.

---

## Test Artifacts

### Test Commands Executed

```bash
npm run ci:fast                       # .agents/skills moved aside — 6079 tests, 0 fail
node --test shared/resources/tests/doc-link-branch.test.mjs     # 54/54
npm run validate -- skills/sync-jira-task/   # and three ensure-*/sync-github-* skills — exit 0
npm run bundle:check                  # exit 0
node references/security-probe.mjs --sink path --entry '<copy>#branchNamesWorkItem' --args-json '["<doc>"]' --cases-file <cases> --record task.200.qa.4.security.run.json
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: The DoD 1 gaps are closed, probed and mutation-checked. Nothing is open. Maintainability CONCERNS rests on advisory items only.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: 5c PR conformance review and finalise DoD

**Next Steps**: 5c `/review-pr`, then `/finalise`.
